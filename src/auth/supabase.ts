// Supabase Client Configuration

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

// These should be set via environment variables
// For Vite, use VITE_ prefix
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ============================================================================
// CONFIGURATION STATUS
// ============================================================================

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseConfig() {
  return {
    url: SUPABASE_URL,
    hasUrl: Boolean(SUPABASE_URL),
    hasKey: Boolean(SUPABASE_ANON_KEY),
    isConfigured: isSupabaseConfigured(),
  };
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

// Only create client if configured - prevents crash when env vars are missing
let _supabase: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce', // Use PKCE flow for better security
    },
  });
} else {
  console.warn(
    '⚠️ Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.\n' +
    'AI features will work without login until Supabase is configured.'
  );
}

// Export client (may be null if not configured)
export const supabase = _supabase;
