// Credit purchase checkout — client side
//
// Starts a Stripe Checkout session via the stripe-checkout edge function and
// handles the ?checkout=success|cancelled return redirect. Credits are
// granted server-side by the stripe-webhook function a few seconds after
// payment, so the balance is refetched on return.

import { supabase } from '@auth/supabase';
import { useAuthStore } from '@auth/store';

export type CreditPack = 'small' | 'medium' | 'large';

export const CREDIT_PACKS: Record<CreditPack, { credits: number; priceLabel: string }> = {
  small: { credits: 100, priceLabel: '€5' },
  medium: { credits: 500, priceLabel: '€20' },
  large: { credits: 1500, priceLabel: '€50' },
};

/** Start a checkout; resolves to an error message or null after redirecting. */
export async function startCreditCheckout(pack: CreditPack): Promise<string | null> {
  if (!supabase) return 'Backend is not configured';

  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: { pack, origin: window.location.origin },
  });

  if (error) {
    return `Could not start checkout: ${error.message}`;
  }
  if (!data?.url) {
    return (data?.error as string) || 'Could not start checkout';
  }

  window.location.assign(data.url as string);
  return null;
}

let checkoutResult: 'success' | 'cancelled' | null = null;

/**
 * Handle a return from Stripe Checkout. Call once at startup: consumes the
 * ?checkout= query param, refetches the balance a few times (the webhook
 * grant lands seconds after the redirect), and cleans the URL.
 */
export function handleCheckoutReturn(): void {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('checkout');
  if (result !== 'success' && result !== 'cancelled') return;

  checkoutResult = result;

  params.delete('checkout');
  const query = params.toString();
  window.history.replaceState(
    null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash
  );

  if (result === 'success') {
    // The webhook grants credits asynchronously — refetch with backoff
    for (const delay of [1000, 4000, 10000]) {
      setTimeout(() => {
        useAuthStore.getState().fetchCredits();
      }, delay);
    }
  }
}

/** The consumed checkout result for this page load (for a one-time notice). */
export function getCheckoutResult(): 'success' | 'cancelled' | null {
  return checkoutResult;
}
