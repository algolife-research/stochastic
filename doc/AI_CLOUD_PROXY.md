# Cloud AI Proxy

Server-side AI for signed-in users: the OpenRouter key lives on the backend
as a Supabase secret, every request is authenticated, and usage is metered
against the user's credit balance. The browser never sees the provider key.

```
Browser (signed in)                Supabase                      OpenRouter
  AI panel ── JWT ──▶  edge function ai-chat                        │
                         │ verify user (auth.getUser)               │
                         │ check balance (RLS read)                 │
                         │ ── OPENROUTER_API_KEY secret ──▶ chat completion
                         │ consume_ai_credits(cost) ─ atomic RPC    │
                         ◀── content + usage + new balance ─────────┘
```

## Pieces

| Piece | File |
|---|---|
| Edge function | `supabase/functions/ai-chat/index.ts` |
| Migration (RPCs + credit lockdown) | `supabase/migrations/003_ai_proxy.sql` |
| Client provider `stochastic-cloud` | `src/ai/agent.ts` (`callCloudProxy`), `src/ai/types.ts` |
| Auto-configuration for signed-in users | `src/ai/store.ts` (auth subscription) |

Migration 003 also **removes client write access to the credit tables** —
previously any authenticated user could update their own balance through the
public API. Balances are now touched only by `SECURITY DEFINER` RPCs:
`ensure_credit_balance()` (safe init with the 25-credit signup bonus, also
granted by the signup trigger) and `consume_ai_credits(cost, feature, meta)`
(atomic decrement + ledger + usage rows).

## Deploy

```bash
supabase link --project-ref <your-project-ref>

# 1. Apply the migration
supabase db push

# 2. Store the provider key as a server secret (NOT a VITE_ var!)
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...

# 3. Deploy the function
supabase functions deploy ai-chat
```

Optional secret `ALLOWED_MODELS` (comma-separated) overrides the model
allowlist; defaults cover the app's planning/execution models and current
free models.

## Behavior

- **Signed-in users are configured automatically** — no key entry. Planning
  and execution models come from `VITE_AI_PLANNING_MODEL` /
  `VITE_AI_EXECUTION_MODEL` (subject to the server allowlist).
- **Cost**: free models (`:free`) cost 0 credits; paid models cost
  1 credit per started 1,000 tokens (minimum 1). Adjust in
  `supabase/functions/ai-chat/index.ts` (`costFor`).
- **Out of credits** → HTTP 402 → "You are out of AI credits."
- **Function not deployed** → the error tells the user they can use a
  personal API key instead (AI panel → Advanced → "Use my own API key
  instead").
- A user-provided key (stored in their browser) always takes precedence
  over the cloud proxy.

## Not included yet

- Credit purchasing (Stripe checkout + webhook granting credits) — the
  `credit_transactions` ledger and `licenses` table are ready for it.
- Per-user rate limiting beyond the credit balance itself.
- Streaming responses (the client's current OpenRouter path is
  non-streaming too).
