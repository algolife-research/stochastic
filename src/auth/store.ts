// Auth Store - Zustand store for user authentication and credits

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, getSupabaseConfig } from './supabase';
import type {
  AuthStore,
  AuthState,
  UserProfile,
  UserLicense,
  CreditBalance,
  FeatureType,
  LicenseTier,
} from './types';
import { FEATURE_CREDIT_COSTS, SIGNUP_BONUS_CREDITS } from './types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  profile: null,
  license: null,
  credits: null,
  error: null,
};

// Track if initialize has been called to prevent race conditions
let initializePromise: Promise<void> | null = null;

// ============================================================================
// STORE CREATION
// ============================================================================

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================

    initialize: async () => {
      // Prevent multiple simultaneous calls
      if (initializePromise) {
        return initializePromise;
      }
      
      if (get().isInitialized) {
        return;
      }
      
      initializePromise = (async () => {
        if (!isSupabaseConfigured()) {
          set({ isLoading: false, isInitialized: true });
          return;
        }

        // Set up auth state listener for future changes
        supabase!.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
          console.log('[Auth] Auth state changed:', event, 'hasSession:', !!session);
          
          set({
            user: session?.user ?? null,
            session,
          });

          // INITIAL_SESSION fires on page load when restoring from localStorage
          if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
            Promise.all([
              get().fetchProfile(),
              get().fetchCredits(),
              get().fetchLicense(),
            ]).catch(e => console.error('Failed to fetch user data:', e));
          } else if (event === 'SIGNED_OUT') {
            set({ profile: null, license: null, credits: null });
          }
        });

        // Get initial session
        try {
          const { data, error } = await supabase!.auth.getSession();
          
          if (error) {
            console.error('[Auth] getSession error:', error);
          }
          
          if (data.session) {
            set({
              user: data.session.user,
              session: data.session,
              isLoading: false,
              isInitialized: true,
            });
            
            // Profile/credits/license will be fetched by onAuthStateChange INITIAL_SESSION handler
          } else {
            set({ isLoading: false, isInitialized: true });
          }
        } catch (error) {
          console.error('[Auth] getSession error:', error);
          set({ isLoading: false, isInitialized: true });
        }
      })();
      
      return initializePromise;
    },

    signUp: async (email: string, password: string) => {
      if (!isSupabaseConfigured()) {
        return { error: 'Supabase not configured' };
      }

      set({ isLoading: true, error: null });

      try {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            data: {
              email_verified: false,
            },
          },
        });

        if (error) {
          set({ isLoading: false, error: error.message });
          // Check for email already exists error
          const errorLower = error.message.toLowerCase();
          if (errorLower.includes('already registered') || 
              errorLower.includes('already exists') ||
              errorLower.includes('user already exists')) {
            return { error: 'This email is already registered. Please sign in instead.' };
          }
          return { error: error.message };
        }

        // Supabase returns a user even if they already exist (for security)
        // Check if this is actually a new user by looking at identities
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          set({ isLoading: false });
          return { error: 'This email is already registered. Please sign in instead.' };
        }

        // Check if email confirmation is required
        const needsEmailConfirmation = !!(data.user && !data.session);

        if (data.user) {
          set({
            user: data.user,
            session: data.session,
            isLoading: false,
          });
        }

        return { 
          needsEmailConfirmation,
          email: data.user?.email,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Signup failed';
        set({ isLoading: false, error: message });
        return { error: message };
      }
    },

    signIn: async (email: string, password: string) => {
      if (!isSupabaseConfigured()) {
        return { error: 'Supabase not configured' };
      }

      set({ isLoading: true, error: null });

      try {
        const { data, error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          set({ isLoading: false, error: error.message });
          // Check for common "user not found" error messages
          const errorLower = error.message.toLowerCase();
          if (errorLower.includes('invalid login credentials') || 
              errorLower.includes('user not found') ||
              errorLower.includes('no user found')) {
            return { error: 'Invalid email or password. If you don\'t have an account, please sign up first.' };
          }
          return { error: error.message };
        }

        set({
          user: data.user,
          session: data.session,
          isLoading: false,
        });

        return {};
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sign in failed';
        set({ isLoading: false, error: message });
        return { error: message };
      }
    },

    signOut: async () => {
      if (!isSupabaseConfigured()) return;

      console.log('[Auth] Signing out...');
      
      // Clear local state immediately (don't wait for network)
      set({
        user: null,
        session: null,
        profile: null,
        license: null,
        credits: null,
        isLoading: false,
      });
      
      // Clear localStorage directly
      try {
        const { projectRef } = getSupabaseConfig();
        const storageKey = `sb-${projectRef}-auth-token`;
        localStorage.removeItem(storageKey);
        console.log('[Auth] Cleared localStorage session');
      } catch (e) {
        console.warn('[Auth] Failed to clear localStorage:', e);
      }

      // Call Supabase signOut in background (don't block on it)
      supabase!.auth.signOut().then(() => {
        console.log('[Auth] Supabase signOut completed');
      }).catch((error) => {
        console.warn('[Auth] Supabase signOut error (ignored):', error);
      });
    },

    resendVerificationEmail: async (email: string) => {
      if (!isSupabaseConfigured()) {
        return { error: 'Supabase not configured' };
      }

      try {
        const { error } = await supabase!.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${window.location.origin}`,
          },
        });

        if (error) {
          return { error: error.message };
        }

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resend verification email';
        return { error: message };
      }
    },

    // ========================================================================
    // PROFILE MANAGEMENT
    // ========================================================================

    fetchProfile: async () => {
      const { user } = get();
      if (!user || !isSupabaseConfigured()) return;

      try {
        const { data, error } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // If profile doesn't exist (PGRST116), create one
          if (error.code === 'PGRST116') {
            const { data: newProfile, error: createError } = await supabase!
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
              })
              .select()
              .single();

            if (createError) {
              console.error('Failed to create profile:', createError);
              return;
            }

            if (newProfile) {
              const profile: UserProfile = {
                id: newProfile.id,
                email: newProfile.email,
                displayName: newProfile.display_name,
                avatarUrl: newProfile.avatar_url,
                createdAt: newProfile.created_at,
                updatedAt: newProfile.updated_at,
              };
              set({ profile });
            }
            return;
          }
          
          console.error('Fetch profile error:', error);
          return;
        }

        const profile: UserProfile = {
          id: data.id,
          email: data.email,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        set({ profile });
      } catch (error) {
        console.error('Fetch profile failed:', error);
      }
    },

    updateProfile: async (updates: Partial<UserProfile>) => {
      const { user } = get();
      if (!user || !isSupabaseConfigured()) {
        return { error: 'Not authenticated' };
      }

      try {
        const { error } = await supabase!
          .from('profiles')
          .update({
            display_name: updates.displayName,
            avatar_url: updates.avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          return { error: error.message };
        }

        await get().fetchProfile();
        return {};
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Update failed' };
      }
    },

    // ========================================================================
    // CREDIT MANAGEMENT
    // ========================================================================

    fetchCredits: async () => {
      const { user } = get();
      if (!user || !isSupabaseConfigured()) return;

      try {
        const { data, error } = await supabase!
          .from('credit_balances')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // If no credits record exists, create one
          if (error.code === 'PGRST116') {
            const { data: newData, error: createError } = await supabase!
              .from('credit_balances')
              .insert({
                user_id: user.id,
                balance: SIGNUP_BONUS_CREDITS,
                lifetime_purchased: 0,
                lifetime_used: 0,
              })
              .select()
              .single();

            if (!createError && newData) {
              // Also record the signup bonus transaction
              await supabase!.from('credit_transactions').insert({
                user_id: user.id,
                amount: SIGNUP_BONUS_CREDITS,
                balance_after: SIGNUP_BONUS_CREDITS,
                type: 'signup_bonus',
                description: 'Welcome bonus credits',
              });

              const credits: CreditBalance = {
                id: newData.id,
                userId: newData.user_id,
                balance: newData.balance,
                lifetimePurchased: newData.lifetime_purchased,
                lifetimeUsed: newData.lifetime_used,
                updatedAt: newData.updated_at,
              };
              set({ credits });
            }
          }
          return;
        }

        const credits: CreditBalance = {
          id: data.id,
          userId: data.user_id,
          balance: data.balance,
          lifetimePurchased: data.lifetime_purchased,
          lifetimeUsed: data.lifetime_used,
          updatedAt: data.updated_at,
        };

        set({ credits });
      } catch (error) {
        console.error('Fetch credits failed:', error);
      }
    },

    useCredits: async (feature: FeatureType, amount?: number) => {
      const { user, credits } = get();
      if (!user || !isSupabaseConfigured()) {
        return { success: false, error: 'Not authenticated' };
      }

      const creditCost = amount ?? FEATURE_CREDIT_COSTS[feature];
      
      if (!credits || credits.balance < creditCost) {
        return { success: false, error: 'Insufficient credits' };
      }

      try {
        // Deduct credits atomically using a Supabase function
        // or direct update (less safe but simpler)
        const newBalance = credits.balance - creditCost;
        const newLifetimeUsed = credits.lifetimeUsed + creditCost;

        const { error } = await supabase!
          .from('credit_balances')
          .update({
            balance: newBalance,
            lifetime_used: newLifetimeUsed,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .gte('balance', creditCost); // Ensure enough credits

        if (error) {
          return { success: false, error: error.message };
        }

        // Record the transaction
        await supabase!.from('credit_transactions').insert({
          user_id: user.id,
          amount: -creditCost,
          balance_after: newBalance,
          type: 'usage',
          description: `Used for ${feature}`,
          metadata: { feature },
        });

        // Record feature usage
        await supabase!.from('feature_usage').insert({
          user_id: user.id,
          feature,
          credits_used: creditCost,
        });

        // Update local state
        set({
          credits: {
            ...credits,
            balance: newBalance,
            lifetimeUsed: newLifetimeUsed,
            updatedAt: new Date().toISOString(),
          },
        });

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to use credits',
        };
      }
    },

    hasEnoughCredits: (feature: FeatureType) => {
      const { credits } = get();
      if (!credits) return false;
      return credits.balance >= FEATURE_CREDIT_COSTS[feature];
    },

    // ========================================================================
    // LICENSE MANAGEMENT
    // ========================================================================

    fetchLicense: async () => {
      const { user } = get();
      if (!user || !isSupabaseConfigured()) return;

      try {
        const { data, error } = await supabase!
          .from('licenses')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // If no license exists, create a free one
          if (error.code === 'PGRST116') {
            const { data: newData, error: createError } = await supabase!
              .from('licenses')
              .insert({
                user_id: user.id,
                tier: 'free',
                status: 'active',
              })
              .select()
              .single();

            if (!createError && newData) {
              const license: UserLicense = {
                id: newData.id,
                userId: newData.user_id,
                tier: newData.tier as LicenseTier,
                status: newData.status,
                stripeSubscriptionId: newData.stripe_subscription_id,
                currentPeriodStart: newData.current_period_start,
                currentPeriodEnd: newData.current_period_end,
              };
              set({ license });
            }
          }
          return;
        }

        const license: UserLicense = {
          id: data.id,
          userId: data.user_id,
          tier: data.tier as LicenseTier,
          status: data.status,
          stripeSubscriptionId: data.stripe_subscription_id,
          currentPeriodStart: data.current_period_start,
          currentPeriodEnd: data.current_period_end,
        };

        set({ license });
      } catch (error) {
        console.error('Fetch license failed:', error);
      }
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================

    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
  }))
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectUser = (state: AuthStore) => state.user;
export const selectSession = (state: AuthStore) => state.session;
export const selectIsAuthenticated = (state: AuthStore) => !!state.user;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectProfile = (state: AuthStore) => state.profile;
export const selectCredits = (state: AuthStore) => state.credits;
export const selectCreditBalance = (state: AuthStore) => state.credits?.balance ?? 0;
export const selectLicense = (state: AuthStore) => state.license;
export const selectTier = (state: AuthStore) => state.license?.tier ?? 'free';
export const selectError = (state: AuthStore) => state.error;

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for auth state and actions
 */
export function useAuth() {
  const user = useAuthStore(selectUser);
  const session = useAuthStore(selectSession);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isLoading = useAuthStore(selectIsLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const profile = useAuthStore(selectProfile);
  const credits = useAuthStore(selectCredits);
  const license = useAuthStore(selectLicense);
  const error = useAuthStore(selectError);

  const initialize = useAuthStore((state) => state.initialize);
  const signUp = useAuthStore((state) => state.signUp);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const useCredits = useAuthStore((state) => state.useCredits);
  const hasEnoughCredits = useAuthStore((state) => state.hasEnoughCredits);
  const clearError = useAuthStore((state) => state.clearError);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const resendVerificationEmail = useAuthStore((state) => state.resendVerificationEmail);

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    isInitialized,
    profile,
    credits,
    license,
    error,
    initialize,
    signUp,
    signIn,
    signOut,
    useCredits,
    hasEnoughCredits,
    clearError,
    updateProfile,
    resendVerificationEmail,
  };
}

/**
 * Hook for credit balance only
 */
export function useCreditBalance() {
  const balance = useAuthStore(selectCreditBalance);
  const hasEnoughCredits = useAuthStore((state) => state.hasEnoughCredits);
  const useCredits = useAuthStore((state) => state.useCredits);
  const fetchCredits = useAuthStore((state) => state.fetchCredits);

  return {
    balance,
    hasEnoughCredits,
    useCredits,
    fetchCredits,
  };
}
