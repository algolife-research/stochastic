// Stripe Checkout — Supabase Edge Function
//
// Starts a credit-pack purchase: verifies the signed-in caller, creates a
// Stripe Checkout Session for the requested pack, and returns the hosted
// payment page URL. The Stripe secret key lives on the backend as a Supabase
// secret; the browser never sees it. Credits are granted asynchronously by
// the stripe-webhook function once Stripe confirms payment.
//
// Deploy:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   supabase functions deploy stripe-checkout
//
// Request (POST, Authorization: Bearer <supabase user JWT>):
//   { pack: 'small' | 'medium' | 'large', origin?: string }
// Response:
//   200 { url }      — redirect the browser there to pay
//   401 not signed in · 400 bad request · 405 method not allowed
//   500 not configured · 502 Stripe error

import Stripe from 'npm:stripe@22';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Credit packs. Prices are inline (price_data), so no products need to exist
// in the Stripe dashboard. Keep in sync with doc/CREDIT_PURCHASES.md.
const CREDIT_PACKS = {
  small: { credits: 100, amountCents: 500 },
  medium: { credits: 500, amountCents: 2000 },
  large: { credits: 1500, amountCents: 5000 },
} as const;

type PackId = keyof typeof CREDIT_PACKS;

// Where the buyer lands after Stripe when no valid https origin was supplied.
const DEFAULT_ORIGIN = 'https://stochastic-music.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/** First candidate that parses as an https URL, normalized to its origin. */
function resolveOrigin(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === 'https:') return url.origin;
    } catch {
      // not a URL — try the next candidate
    }
  }
  return DEFAULT_ORIGIN;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method not allowed' });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return json(500, { error: 'payments are not configured (missing STRIPE_SECRET_KEY secret)' });
  }

  // --- Authenticate the caller -------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return json(401, { error: 'not signed in' });
  }
  const user = userData.user;

  // --- Validate the request ----------------------------------------------
  let body: { pack?: string; origin?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid JSON body' });
  }

  const packId = body.pack;
  if (!packId || !(packId in CREDIT_PACKS)) {
    return json(400, {
      error: `unknown pack (expected one of: ${Object.keys(CREDIT_PACKS).join(', ')})`,
    });
  }
  const pack = CREDIT_PACKS[packId as PackId];

  // Send the buyer back where they came from; fall back to production.
  const origin = resolveOrigin(req.headers.get('Origin'), body.origin);

  // --- Create the Checkout Session ---------------------------------------
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2026-06-24.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: `${pack.credits} Stochastic credits` },
            unit_amount: pack.amountCents,
          },
          quantity: 1,
        },
      ],
      // Read back by the stripe-webhook function to grant the credits.
      metadata: { user_id: user.id, credits: String(pack.credits), pack: packId },
      // Prefills checkout and sends the receipt to the account email.
      customer_email: user.email,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`checkout session creation failed: ${message}`);
    return json(502, { error: 'could not start checkout', detail: message.slice(0, 300) });
  }

  if (!session.url) {
    return json(502, { error: 'could not start checkout (no redirect URL)' });
  }

  return json(200, { url: session.url });
});
