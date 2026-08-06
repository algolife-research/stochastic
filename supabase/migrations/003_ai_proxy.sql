-- ============================================================================
-- AI PROXY & CREDIT INTEGRITY
-- ============================================================================
-- 1. Locks down credit tables: balances and ledgers become server-managed.
--    (Previously any authenticated user could INSERT/UPDATE their own
--    credit_balances row through the public API and grant themselves credits.)
-- 2. Creates credit balances server-side on signup (25 bonus credits).
-- 3. Adds SECURITY DEFINER RPCs used by the client and the ai-chat edge
--    function: ensure_credit_balance() and consume_ai_credits().

-- ============================================================================
-- 1. REMOVE CLIENT WRITE ACCESS TO CREDIT TABLES (reads stay)
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own credits" ON public.credit_balances;
DROP POLICY IF EXISTS "Users can update own credits" ON public.credit_balances;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.feature_usage;

-- ============================================================================
-- 2. SERVER-SIDE BALANCE CREATION
-- ============================================================================

-- Signup trigger now also seeds the credit balance with the welcome bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );

    INSERT INTO public.credit_balances (user_id, balance, lifetime_purchased, lifetime_used)
    VALUES (NEW.id, 25, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, description)
    VALUES (NEW.id, 25, 25, 'signup_bonus', 'Welcome bonus credits');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill balances for existing users that have none
INSERT INTO public.credit_balances (user_id, balance, lifetime_purchased, lifetime_used)
SELECT p.id, 25, 0, 0
FROM public.profiles p
LEFT JOIN public.credit_balances cb ON cb.user_id = p.id
WHERE cb.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 3. RPC: ensure a balance row exists for the calling user (safe self-init)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_credit_balance()
RETURNS public.credit_balances AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_row public.credit_balances;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
    END IF;

    SELECT * INTO v_row FROM public.credit_balances WHERE user_id = v_user_id;
    IF FOUND THEN
        RETURN v_row;
    END IF;

    INSERT INTO public.credit_balances (user_id, balance, lifetime_purchased, lifetime_used)
    VALUES (v_user_id, 25, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, description)
    VALUES (v_user_id, 25, 25, 'signup_bonus', 'Welcome bonus credits');

    SELECT * INTO v_row FROM public.credit_balances WHERE user_id = v_user_id;
    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.ensure_credit_balance() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_credit_balance() TO authenticated;

-- ============================================================================
-- 4. RPC: atomically consume credits (called by the ai-chat edge function
--    with the user's JWT; SECURITY DEFINER bypasses the read-only policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.consume_ai_credits(
    p_cost INTEGER,
    p_feature TEXT DEFAULT 'ai_generation_basic',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_new_balance INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
    END IF;
    IF p_cost < 0 THEN
        RAISE EXCEPTION 'invalid cost';
    END IF;

    IF p_cost = 0 THEN
        SELECT balance INTO v_new_balance FROM public.credit_balances WHERE user_id = v_user_id;
        INSERT INTO public.feature_usage (user_id, feature, credits_used, metadata)
        VALUES (v_user_id, p_feature, 0, p_metadata);
        RETURN COALESCE(v_new_balance, 0);
    END IF;

    -- Atomic decrement, guarded by the balance check in the WHERE clause
    UPDATE public.credit_balances
    SET balance = balance - p_cost,
        lifetime_used = lifetime_used + p_cost
    WHERE user_id = v_user_id AND balance >= p_cost
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
        RAISE EXCEPTION 'insufficient credits' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, description, metadata)
    VALUES (v_user_id, -p_cost, v_new_balance, 'usage', p_feature, p_metadata);

    INSERT INTO public.feature_usage (user_id, feature, credits_used, metadata)
    VALUES (v_user_id, p_feature, p_cost, p_metadata);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.consume_ai_credits(INTEGER, TEXT, JSONB) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_ai_credits(INTEGER, TEXT, JSONB) TO authenticated;
