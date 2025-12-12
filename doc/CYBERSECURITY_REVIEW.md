# Cybersecurity Review — Stochastic

Date: 2025-12-12
Author: Automated security scan (assistant)

## Scope
A focused security review of the Stochastic codebase (frontend + client-side integrations) with emphasis on:
- Secrets and environment variable usage
- Authentication and session handling (Supabase)
- Client-side API calls and third-party integrations (AI providers)
- Storage and local persistence
- Dependency and build configuration

## High-level summary
- The project correctly places configurable secrets behind Vite environment variables (VITE_ prefix). However, several API keys (AI provider keys and Supabase anon key) are consumed entirely in-browser. The Supabase "anon" key is expected to be public but allows unauthenticated access patterns in Supabase policies if misconfigured.
- The AI integrations call third-party APIs directly from the browser using the configured API key. This exposes the API key to end-users and increases risk of key leakage and abuse.
- Session state is persisted in localStorage (Supabase client), which is common for browser apps; sign-out clears the local Supabase token entry. Some sensitive state is stored in browser storage and could be accessible to other scripts if XSS exists.
- No obvious use of dangerouslySetInnerHTML or string-based eval was found. No direct unsafe DOM manipulations were detected in the code paths checked.
- Dependencies are minimal and up-to-date as of package.json; no obviously risky or deprecated packages are used.

## Findings (detailed)

1) Environment variables and API keys
- Files: `.env.example`, `src/ai/store.ts`, `src/auth/supabase.ts`
- Observations:
  - The project uses `VITE_OPENROUTER_API_KEY`, `VITE_AI_PLANNING_MODEL`, `VITE_AI_EXECUTION_MODEL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` exposed via `import.meta.env`.
  - `VITE_SUPABASE_ANON_KEY` is the Supabase client anon key used to initialize `createClient()` on the frontend. By Supabase design the anon key is considered public but must be paired with strict row-level security (RLS) policies on the backend.
  - The AI API key (OpenRouter/others) is consumed at the client and used as a Bearer or x-api-key header in `src/ai/agent.ts`.

  Risk:
  - Any API key embedded in a frontend bundle or provided to the browser can be discovered and abused. AI provider keys are typically secret and should not be used directly in a public client.

  Recommendation:
  - Move AI API calls to a server-side proxy or backend function that stores the API key securely (server environment, secret manager) and enforces request quotas, authentication, and rate limits.
  - Ensure Supabase uses RLS and policies limiting access to user-owned rows. Do not rely on the anon key for server-like privileges.

2) Direct third-party API calls from client
- Files: `src/ai/agent.ts` (calls OpenAI, Anthropic, Google Gemini, OpenRouter, Ollama, LM Studio)
- Observations:
  - The AI agent constructs requests in the browser and sets the `Authorization` header to `Bearer ${apiKey}` or `x-api-key` depending on provider.
  - Some provider calls include `baseUrl` or `HTTP-Referer` headers; none implement server-side signing.

  Risk:
  - API keys can be extracted from network requests, devtools, or memory-scraping attacks. Billing or data exfiltration risk if keys are abused.

  Recommendation:
  - Implement a backend proxy for AI calls. If serverless is used, add authentication, rate-limiting, request logging, and token rotation.
  - For local/emulator LLM hosts (Ollama/LM Studio), require users to run them locally and avoid exposing admin keys in shared installs.

3) Authentication & session management
- Files: `src/auth/supabase.ts`, `src/auth/store.ts`, `src/ui/AuthModal.tsx`
- Observations:
  - Supabase client is created on the frontend and configured to use `localStorage` for session persistence and PKCE flow for auth.
  - `signOut()` explicitly clears a Supabase localStorage key: `sb-${projectRef}-auth-token`.
  - The client code checks `isSupabaseConfigured()` before making auth calls.

  Risk:
  - Persisting tokens in localStorage is susceptible to XSS-based token theft. PKCE mitigates some attacks during OAuth flows but not token exfiltration post-auth.

  Recommendation:
  - Harden CSP (Content Security Policy) and reduce inline scripts. Prefer `SameSite` cookies with httpOnly flag if moving to server-side sessions.
  - Ensure all user-supplied content is sanitized where it could be injected into the DOM.
  - Apply strict RLS policies in Supabase to prevent privilege escalation with anon keys.

4) Storage and client-side caches
- Files: `src/io/cloud-storage.ts`, `src/auth/store.ts`, various modules using `localStorage` / `sessionStorage`
- Observations:
  - Projects may be cached locally; localStorage and sessionStorage are used for UI state (mobile warning, etc.).
  - Cloud project saving requires an authenticated Supabase user.

  Risk:
  - Local caches may contain PII or sensitive project data; if an attacker can execute JS or access local files, data may be exfiltrated.

  Recommendation:
  - Avoid storing secrets in localStorage. For cached project data, consider encrypting sensitive fields before storing locally (optional) and expiring caches.

5) Dependency and build configuration
- Files: `package.json`
- Observations:
  - Dependencies are few: React, Supabase, Zustand, Immer. Dev deps include Tauri, Vite, TypeScript, Vitest.
  - No outdated or clearly vulnerable packages identified in the quick scan.

  Risk:
  - Dev tooling and build outputs can introduce supply-chain risks if CI or build systems are compromised.

  Recommendation:
  - Keep dependencies up to date and add `npm audit` or Snyk/Dependabot for automated vulnerability scanning.
  - Pin production dependency versions where feasible and configure CI to block builds on critical vulnerabilities.

6) XSS and DOM security
- Observations:
  - Searched for common risky APIs: `dangerouslySetInnerHTML`, `eval`, `innerHTML` — none found.
  - Still recommend manual review of any dynamic HTML rendering (e.g., message content from AI) before injecting into the DOM.

  Recommendation:
  - Sanitize AI-generated content before inserting into the DOM. Use a robust HTML sanitizer for any HTML rendering.

## Actionable remediation checklist
- [ ] Move AI provider calls to a server-side proxy; remove all direct client-side usage of provider API keys.
- [ ] Verify Supabase Row-Level Security (RLS) policies restrict access to user-owned data. Test with anon key to ensure no privilege escalation.
- [ ] Add CSP header configuration in production to mitigate XSS risks.
- [ ] Avoid long-term storage of tokens in localStorage; migrate to httpOnly cookies if using a server-side session.
- [ ] Add automated dependency scanning (npm audit/GitHub Dependabot).
- [ ] Add rate-limiting and quota enforcement for any server-proxied AI endpoints.
- [ ] Sanitize or escape any AI-generated HTML before rendering.

## Appendix: Notable files reviewed
- `src/auth/supabase.ts`
- `src/auth/store.ts`
- `src/ai/agent.ts`
- `src/ai/store.ts`
- `src/io/cloud-storage.ts`
- `src/ui/AuthModal.tsx`
- `.env.example`
- `package.json`

---

If you want, I can:
- Implement a minimal serverless proxy endpoint (Node/Express or serverless function) that forwards AI requests and stores the key on the server.
- Add a sample RLS policy for Supabase and a checklist to validate it.
- Add a GitHub Actions workflow to run `npm audit` and block on high-severity issues.

Which remediation(s) should I implement next?