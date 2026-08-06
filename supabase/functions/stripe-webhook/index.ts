// Stripe Webhook — Supabase Edge Function
//
// Receives events from Stripe and grants purchased credits. Stripe calls this
// endpoint server-to-server with NO Supabase JWT, so it must be deployed with
// --no-verify-jwt; authenticity comes from verifying the Stripe-Signature
// header against STRIPE_WEBHOOK_SECRET instead. On a paid
// checkout.session.completed event it calls the service-role-only RPC
// grant_purchased_credits, keyed on the checkout session id — Stripe retries
// deliveries, and the RPC's idempotency makes every retry a safe no-op.
//
// Deploy:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Request: POST from Stripe (raw JSON body + Stripe-Signature header)
// Response:
//   200 { received: true } — event processed or deliberately ignored
//   400 bad/missing signature · 405 method not allowed
//   500 not configured, or the grant failed (Stripe retries; retries are safe)

import Stripe from 'npm:stripe@22';
import { createClient } from 'npm:@supabase/supabase-js@2';

// No CORS handling here: Stripe calls server-to-server, browsers never do.

// SubtleCrypto-based signature verification — the synchronous Node crypto
// behind stripe.webhooks.constructEvent is unavailable in edge runtimes.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method not allowed' });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    return json(500, {
      error: 'webhook is not configured (missing STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET secret)',
    });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2026-06-24.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  // --- Verify the Stripe signature over the raw body ---------------------
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    return json(400, { error: 'missing Stripe-Signature header' });
  }
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`signature verification failed: ${message}`);
    return json(400, { error: 'invalid signature' });
  }

  // --- Grant credits on paid checkouts -----------------------------------
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Delayed payment methods complete later; nothing to grant yet.
    if (session.payment_status !== 'paid') {
      return json(200, { received: true });
    }

    const userId = session.metadata?.user_id;
    const credits = Number.parseInt(session.metadata?.credits ?? '', 10);
    if (!userId || !Number.isFinite(credits) || credits <= 0) {
      // Not a session created by stripe-checkout — retrying cannot fix it.
      console.error(`session ${session.id} has no usable user_id/credits metadata`);
      return json(200, { received: true });
    }

    // Service-role client: grant_purchased_credits is executable only by
    // service_role (see migration 004), and there is no caller JWT here.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: newBalance, error: grantError } = await supabase.rpc('grant_purchased_credits', {
      p_user_id: userId,
      p_amount: credits,
      p_reference: session.id, // idempotency key — retries never double-grant
    });

    if (grantError) {
      console.error(`grant failed for session ${session.id}: ${grantError.message}`);
      // Non-2xx makes Stripe retry the delivery; the RPC is idempotent.
      return json(500, { error: 'credit grant failed' });
    }

    console.log(
      `granted ${credits} credits to user ${userId} (session ${session.id}, balance ${newBalance})`
    );
  }

  // Handled and unhandled event types alike are acknowledged with 200.
  return json(200, { received: true });
});
