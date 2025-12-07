# User Authentication & Management System Specifications

## Overview

This document outlines the specifications for implementing user authentication and management for AIGA, enabling future monetized features like AI generation capabilities that require credit/token management and license validation.

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AIGA Client   │────▶│   Auth Service   │────▶│    Database     │
│  (Tauri/Web)    │     │   (Backend API)  │     │  (PostgreSQL)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         └─────────────▶│  AI/Feature API  │
                        │   (Gated by      │
                        │   credits/license)│
                        └──────────────────┘
```

### 1.2 Core Components

| Component | Purpose | Suggested Technology |
|-----------|---------|---------------------|
| Auth Provider | OAuth, session management | **Supabase Auth** or **Auth0** |
| Database | User data, credits, licenses | **Supabase PostgreSQL** or **PlanetScale** |
| API Layer | Business logic, credit deduction | **Supabase Edge Functions** or **Cloudflare Workers** |
| Payment Processing | Subscriptions, credit purchases | **Stripe** |

---

## 2. Authentication System

### 2.1 Authentication Methods

| Method | Priority | Notes |
|--------|----------|-------|
| Email/Password | P0 | Standard signup/login |
| Magic Link | P1 | Passwordless email login |
| OAuth - GitHub | P1 | Developer-friendly |
| OAuth - Google | P2 | Broad user base |
| OAuth - Discord | P3 | Creative community |

### 2.2 Session Management

- **Token Type**: JWT with refresh tokens
- **Access Token Expiry**: 1 hour
- **Refresh Token Expiry**: 30 days
- **Storage (Desktop)**: Tauri secure storage / OS keychain
- **Storage (Web)**: HttpOnly cookies

### 2.3 Auth Flow (Desktop App)

```
1. User clicks "Sign In" in AIGA
2. System browser opens auth page (OAuth or email form)
3. After auth, redirect to custom protocol: aiga://auth/callback?token=xxx
4. Tauri handles deep link, stores tokens securely
5. App validates token with backend, fetches user profile
```

---

## 3. Database Schema

### 3.1 Core Tables

```sql
-- Users table (extends auth.users from Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- License/subscription management
CREATE TABLE public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit/token balance
CREATE TABLE public.credit_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_purchased INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Credit transactions (audit log)
CREATE TABLE public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive = add, negative = deduct
    balance_after INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus', 'subscription_grant'
    description TEXT,
    reference_id TEXT, -- stripe payment ID, feature usage ID, etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature usage tracking
CREATE TABLE public.feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- 'ai_generation', 'video_export_4k', etc.
    credits_used INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}', -- parameters, duration, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys for programmatic access
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    name TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_licenses_user_id ON public.licenses(user_id);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at);
CREATE INDEX idx_feature_usage_user_id ON public.feature_usage(user_id);
CREATE INDEX idx_feature_usage_feature ON public.feature_usage(feature);
```

### 3.2 Row Level Security (RLS) Policies

```sql
-- Users can only read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Credit balances - users can only view their own
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.credit_balances
    FOR SELECT USING (auth.uid() = user_id);

-- Credit transactions - users can only view their own
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Licenses - users can only view their own
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own license" ON public.licenses
    FOR SELECT USING (auth.uid() = user_id);

-- Feature usage - users can only view their own
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.feature_usage
    FOR SELECT USING (auth.uid() = user_id);

-- API keys - users can manage their own
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys" ON public.api_keys
    FOR ALL USING (auth.uid() = user_id);
```

---

## 4. License Tiers & Credit System

### 4.1 Tier Definitions

| Tier | Price | Credits/Month | Features |
|------|-------|---------------|----------|
| **Free** | $0 | 50 | Basic AI gen, 720p export, watermark |
| **Pro** | $12/mo | 500 | Full AI gen, 4K export, no watermark, priority |
| **Enterprise** | Custom | Unlimited | API access, team management, SLA |

### 4.2 Credit Costs per Feature

| Feature | Credits | Notes |
|---------|---------|-------|
| AI Scene Generation (basic) | 5 | Simple prompts |
| AI Scene Generation (advanced) | 15 | Complex multi-element |
| AI Music Sync Analysis | 10 | Per track |
| 4K Video Export | 2 | Per minute |
| 8K Video Export | 5 | Per minute |

### 4.3 Credit Purchase Options (One-time)

| Package | Credits | Price | Bonus |
|---------|---------|-------|-------|
| Starter | 100 | $5 | - |
| Creator | 500 | $20 | +50 bonus |
| Studio | 2000 | $70 | +300 bonus |

---

## 5. API Endpoints

### 5.1 Authentication

```
POST   /auth/signup          - Email/password registration
POST   /auth/login           - Email/password login
POST   /auth/logout          - Invalidate session
POST   /auth/refresh         - Refresh access token
POST   /auth/magic-link      - Send magic link email
GET    /auth/callback        - OAuth callback handler
POST   /auth/verify          - Verify email
POST   /auth/reset-password  - Request password reset
```

### 5.2 User Management

```
GET    /user/profile         - Get current user profile
PATCH  /user/profile         - Update profile
DELETE /user/account         - Delete account (GDPR)
GET    /user/license         - Get license info
GET    /user/credits         - Get credit balance
GET    /user/credits/history - Get transaction history
GET    /user/usage           - Get feature usage stats
```

### 5.3 Credits & Billing

```
POST   /credits/purchase     - Initiate credit purchase (Stripe)
POST   /credits/use          - Deduct credits (internal)
POST   /billing/subscribe    - Start subscription
POST   /billing/cancel       - Cancel subscription
GET    /billing/invoices     - Get invoice history
POST   /billing/webhook      - Stripe webhook handler
```

### 5.4 API Keys

```
GET    /api-keys             - List user's API keys
POST   /api-keys             - Create new API key
DELETE /api-keys/:id         - Revoke API key
```

---

## 6. Client Integration

### 6.1 Tauri Commands

```rust
// src-tauri/src/auth.rs

#[tauri::command]
async fn sign_in(email: String, password: String) -> Result<AuthResponse, Error>;

#[tauri::command]
async fn sign_out() -> Result<(), Error>;

#[tauri::command]
async fn get_user() -> Result<Option<User>, Error>;

#[tauri::command]
async fn get_credits() -> Result<CreditBalance, Error>;

#[tauri::command]
async fn check_feature_access(feature: String) -> Result<FeatureAccess, Error>;
```

### 6.2 Frontend Store Extension

```typescript
// src/core/auth-store.ts

interface AuthState {
  user: User | null;
  license: License | null;
  credits: CreditBalance | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}

interface License {
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  expiresAt: Date | null;
}

interface CreditBalance {
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
}
```

### 6.3 Feature Gating

```typescript
// src/core/feature-gate.ts

const FEATURE_REQUIREMENTS: Record<string, FeatureRequirement> = {
  'ai_generation': { minTier: 'free', creditCost: 5 },
  'ai_generation_advanced': { minTier: 'pro', creditCost: 15 },
  'export_4k': { minTier: 'pro', creditCost: 2 },
  'export_8k': { minTier: 'enterprise', creditCost: 5 },
};

async function canUseFeature(feature: string): Promise<{
  allowed: boolean;
  reason?: 'not_authenticated' | 'insufficient_tier' | 'insufficient_credits';
}>;

async function consumeFeature(feature: string): Promise<{
  success: boolean;
  remainingCredits: number;
}>;
```

---

## 7. Recommended Service Stack

### 7.1 Primary Recommendation: **Supabase**

**Why Supabase?**
- ✅ Built-in Auth with multiple providers
- ✅ PostgreSQL with RLS
- ✅ Edge Functions for API logic
- ✅ Real-time subscriptions
- ✅ Generous free tier (50k MAU)
- ✅ Self-hostable if needed

**Estimated Cost:**
- Free tier: 50k MAU, 500MB DB
- Pro: $25/mo for more capacity

### 7.2 Alternative: **Auth0 + PlanetScale + Cloudflare Workers**

**When to consider:**
- Need enterprise SSO (SAML, OIDC)
- Expect massive scale
- Need geographic distribution

### 7.3 Payment: **Stripe**

**Features to use:**
- Stripe Checkout for purchases
- Stripe Billing for subscriptions
- Customer Portal for self-service
- Webhooks for event handling

---

## 8. Security Considerations

### 8.1 Requirements

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | Argon2id (handled by auth provider) |
| Token storage | OS keychain (Tauri), HttpOnly cookies (web) |
| Rate limiting | 100 req/min per IP, 1000/min per user |
| HTTPS | Enforced for all API calls |
| CORS | Whitelist app domains only |
| API key security | Show once on creation, store hashed |

### 8.2 Audit Logging

All sensitive operations logged:
- Login attempts (success/failure)
- Password changes
- Credit transactions
- License changes
- API key creation/revocation

---

## 9. Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Supabase project setup
- [ ] Basic email/password auth
- [ ] User profile table
- [ ] Tauri auth commands
- [ ] Login/logout UI

### Phase 2: Monetization
- [ ] Stripe integration
- [ ] License tiers table
- [ ] Credit system tables
- [ ] Purchase flow
- [ ] Subscription management

### Phase 3: Feature Gating
- [ ] Feature requirement definitions
- [ ] Credit deduction logic
- [ ] Usage tracking
- [ ] UI feature gates

### Phase 4: Polish
- [ ] OAuth providers (GitHub, Google)
- [ ] API key management
- [ ] Admin dashboard
- [ ] Analytics & reporting

---

## 10. Open Questions

1. **Offline usage**: How to handle features when user is offline? Cache license status with expiry?
2. **Team/org accounts**: Support multiple users under one license?
3. **Refund policy**: Auto-refund credits on failed AI generations?
4. **Free tier limits**: Reset monthly or rolling 30 days?
5. **Grace period**: How long after subscription expires before downgrade?

---

*Document Version: 1.0*  
*Last Updated: 2025-12-07*
