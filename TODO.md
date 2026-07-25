# Owner TODO — deployment & configuration

Actions only the project owner can perform (dashboard logins, secrets).
Everything code-side for these is already on `main`.

## 1. Security (do first)

- [ ] **Revoke the leaked OpenRouter key** at <https://openrouter.ai/keys>
      (it shipped inside the public JS bundle and was drained in June).
- [ ] **Delete `VITE_OPENROUTER_API_KEY` from Vercel** → Project → Settings →
      Environment Variables. Production builds ignore it now, but it has no
      business being there. Never put a provider key in any `VITE_*` var.

## 2. Supabase (AI proxy + credit purchases)

```bash
supabase link --project-ref <your-project-ref>
supabase db push        # applies migrations 003 (AI proxy + credit lockdown) and 004 (purchases)

supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...   # a NEW key, not the revoked one
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

supabase functions deploy ai-chat
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe calls it, not a user
```

Details: `doc/AI_CLOUD_PROXY.md` and `doc/CREDIT_PURCHASES.md`.

## 3. Stripe dashboard

- [ ] Create a webhook endpoint pointing at
      `https://<project-ref>.functions.supabase.co/stripe-webhook`
      listening to **`checkout.session.completed`**; copy its signing secret
      into `STRIPE_WEBHOOK_SECRET` above.
- [ ] Test-mode run first: `stripe listen --forward-to <url>` + card
      `4242 4242 4242 4242`, confirm credits land (see doc).

## 4. Vercel

- [ ] Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
      (required for sign-in/cloud/AI). Optional: `VITE_AI_PLANNING_MODEL`,
      `VITE_AI_EXECUTION_MODEL`, `VITE_EXAMPLES_BASE_URL`.
- [ ] **Deployment Protection: production must be publicly accessible** —
      the current host returns 403 to non-browser clients, which likely also
      blocks search crawlers and breaks SEO.
- [ ] Domain: `stochastic-music.com` on the project (+ `www` redirect).
- [ ] Confirm auto-deploy from `main` and redeploy latest.

## 5. SEO

- [ ] Google Search Console: verify the domain, submit
      `https://stochastic-music.com/sitemap.xml`.
- [ ] Use URL Inspection to confirm Googlebot is NOT blocked by the host's
      bot protection (see item 4).

## 6. Post-deploy smoke test

- [ ] Hard refresh → Examples shows "🎼 Full Pieces" on top.
- [ ] Sign in (Supabase unpaused) → AI panel shows credits, Iannis answers.
- [ ] Buy a credit pack in Stripe test mode → balance increases.
- [ ] Load an Arrakis piece → gate probabilities show percentages (no NaN).
