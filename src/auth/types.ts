// Auth Types - User authentication and credit management types

import type { User, Session } from '@supabase/supabase-js';

// ============================================================================
// USER & SESSION TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserLicense {
  id: string;
  userId: string;
  tier: LicenseTier;
  status: LicenseStatus;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export type LicenseTier = 'free' | 'pro' | 'vip';
export type LicenseStatus = 'active' | 'expired' | 'cancelled';

// Project limits per tier (null = unlimited)
export const TIER_PROJECT_LIMITS: Record<LicenseTier, number | null> = {
  free: 10,
  pro: null,
  vip: null,
};

// ============================================================================
// CREDIT SYSTEM TYPES
// ============================================================================

export interface CreditBalance {
  id: string;
  userId: string;
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  type: CreditTransactionType;
  description: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type CreditTransactionType = 
  | 'purchase' 
  | 'usage' 
  | 'refund' 
  | 'bonus' 
  | 'subscription_grant'
  | 'signup_bonus';

// ============================================================================
// FEATURE USAGE TYPES
// ============================================================================

export interface FeatureUsage {
  id: string;
  userId: string;
  feature: FeatureType;
  creditsUsed: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type FeatureType = 
  | 'ai_generation_basic'
  | 'ai_generation_advanced'
  | 'ai_music_sync'
  | 'video_export_4k'
  | 'video_export_8k';

// Credit costs per feature
export const FEATURE_CREDIT_COSTS: Record<FeatureType, number> = {
  'ai_generation_basic': 5,
  'ai_generation_advanced': 15,
  'ai_music_sync': 10,
  'video_export_4k': 2,
  'video_export_8k': 5,
};

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

export interface TierDefinition {
  name: string;
  price: number;
  creditsPerMonth: number;
  features: string[];
}

export const TIER_DEFINITIONS: Record<LicenseTier, TierDefinition> = {
  free: {
    name: 'Free',
    price: 0,
    creditsPerMonth: 50,
    features: [
      'Basic AI generation',
      '720p export',
      'Watermark on exports',
    ],
  },
  pro: {
    name: 'Pro',
    price: 12,
    creditsPerMonth: 500,
    features: [
      'Full AI generation',
      '4K export',
      'No watermark',
      'Priority support',
    ],
  },
  vip: {
    name: 'VIP',
    price: 29,
    creditsPerMonth: -1, // Unlimited
    features: [
      'Unlimited projects',
      'Unlimited AI generation',
      '8K export',
      'API access',
      'Priority support',
    ],
  },
};

// ============================================================================
// AUTH STATE
// ============================================================================

export interface AuthState {
  // Session state
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Profile
  profile: UserProfile | null;
  
  // License & credits
  license: UserLicense | null;
  credits: CreditBalance | null;
  
  // Error state
  error: string | null;
}

export interface AuthActions {
  // Session
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithOAuth: (provider: 'google' | 'github' | 'discord') => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  
  // Profile
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>;
  
  // Credits
  fetchCredits: () => Promise<void>;
  useCredits: (feature: FeatureType, amount?: number) => Promise<{ success: boolean; error?: string }>;
  hasEnoughCredits: (feature: FeatureType) => boolean;
  
  // License
  fetchLicense: () => Promise<void>;
  
  // Utilities
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

// ============================================================================
// SIGNUP BONUS
// ============================================================================

export const SIGNUP_BONUS_CREDITS = 25;
