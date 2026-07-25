# Credit Purchases (Stripe Checkout)

Users buy credit packs on Stripe-hosted checkout: the browser asks the
`stripe-checkout` edge function for a payment URL, pays on Stripe's page, and
Stripe confirms the payment server-to-server to the `stripe-webhook` function,
which grants the credits. Card details and the Stripe secret key never touch
the app.

```
Browser (signed in)            Supabase                              Stripe
  Buy pack ── JWT ──▶ edge function stripe-checkout                     │
                        │ verify user (auth.getUser)                    │
                        │ ── STRIPE_SECRET_KEY ──▶ create Checkout Session
                        ◀────────────── { url } ────────────────────────┘
  redirect to url ─────────────────────────────────▶ hosted payment page
                                                        │ payment succeeds
                      edge function stripe-webhook ◀── checkout.session.completed
                        │ verify Stripe-Signature (STRIPE_WEBHOOK_SECRET)
                        │ grant_purchased_credits(user_id, credits, session_id)
                        │   service-role-only RPC · idempotent by session id
                        └──▶ credit_balances + 'purchase' ledger row
```

## Pieces

| Piece | File |
|---|---|
| Checkout session creation | `supabase/functions/stripe-checkout/index.ts` |
| Webhook (verifies + grants) | `supabase/functions/stripe-webhook/index.ts` |
| Migration (RPC + purchase-reference index) | `supabase/migrations/004_credit_purchases.sql` |

## Packs

Hardcoded in `stripe-checkout/index.ts` (`CREDIT_PACKS`); prices are inline
`price_data`, so nothing needs to be created in the Stripe product catalog.

| Pack | Credits | Price |
|---|---|---|
| `small` | 100 | €5.00 |
| `medium` | 500 | €20.00 |
| `large` | 1500 | €50.00 |

## Deploy

```bash
supabase link --project-ref <your-project-ref>

# 1. Apply the migration (grant_purchased_credits RPC + unique reference index)
supabase db push

# 2. Store the Stripe secrets (dashboard → Developers → API keys / Webhooks)
supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Deploy both functions — the webhook WITHOUT JWT verification: Stripe
#    calls it with no Supabase JWT; the Stripe-Signature check authenticates
#    those requests instead.
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

Then create the webhook endpoint in the Stripe dashboard
(Developers → Webhooks → Add endpoint):

- URL: `https://<project-ref>.functions.supabase.co/stripe-webhook`
  (the `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` form
  works identically)
- Events: `checkout.session.completed`
- Copy the endpoint's signing secret (`whsec_...`) into the
  `STRIPE_WEBHOOK_SECRET` secret above.

## Testing (Stripe test mode)

```bash
# Point the functions at test keys
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# Forward test events to the deployed webhook. `stripe listen` prints its own
# whsec_... — set THAT as STRIPE_WEBHOOK_SECRET while it runs.
stripe listen --forward-to https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

Buy a pack in the app and pay with card `4242 4242 4242 4242` (any future
expiry, any CVC). `stripe listen` shows the delivery, the function logs the
grant, and the balance reflects it on the next fetch. `stripe trigger
checkout.session.completed` also exercises the endpoint, but its synthetic
session carries no `user_id` metadata, so it is acknowledged without granting.

## Client contract

`POST https://<project-ref>.supabase.co/functions/v1/stripe-checkout` with the
user's JWT (`Authorization: Bearer <access_token>`) and body
`{ "pack": "small" | "medium" | "large" }` (optional `"origin"`; the request's
`Origin` header is preferred). Success: `200 { "url": ... }` — redirect the
browser there. Errors: `400` unknown pack / bad JSON, `401` not signed in,
`500` Stripe secret not configured, `502` Stripe API failure. After payment
the user lands on `<origin>/?checkout=success` (or `?checkout=cancelled`);
credits arrive via the webhook within seconds — re-fetch the balance rather
than assuming it.

## Notes

- **Idempotent grants** — `grant_purchased_credits` refuses to grant twice
  for the same reference (the checkout session id); a partial unique index on
  `purchase` ledger rows backstops the check, so Stripe's webhook retries and
  replays are harmless no-ops.
- **Only the server can grant** — the RPC is `SECURITY DEFINER` and
  executable by `service_role` alone; client write access to the credit
  tables was already revoked in migration 003.
- **`payment_status` guard** — only sessions reported `paid` grant credits.
  If delayed payment methods (e.g. SEPA debit) are ever enabled in Checkout,
  also subscribe the endpoint to `checkout.session.async_payment_succeeded`
  and handle it like `completed`.
- **Redirect origins are validated** — only well-formed `https` origins are
  used for the success/cancel URLs; anything else falls back to
  `https://stochastic-music.com` (note: an `http://localhost` dev origin
  therefore redirects to production after a test purchase).
