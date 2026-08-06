-- ============================================================================
-- CREDIT PURCHASES (Stripe)
-- ============================================================================
-- 1. Enforces at most one 'purchase' ledger row per reference_id (the Stripe
--    checkout session id) with a partial unique index — the hard backstop
--    that keeps webhook retries from double-granting, even when they race.
-- 2. Adds the SECURITY DEFINER RPC grant_purchased_credits(), called by the
--    stripe-webhook edge function with the service role key after a paid
--    checkout.session.completed event. Only service_role may execute it —
--    browsers can never grant themselves credits (client write access to the
--    credit tables was already revoked in 003).

-- ============================================================================
-- 1. ONE PURCHASE PER REFERENCE
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_purchase_reference
    ON public.credit_transactions(reference_id)
    WHERE type = 'purchase';

-- ============================================================================
-- 2. RPC: grant purchased credits (idempotent by reference)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_purchased_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reference TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user id is required';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'invalid amount';
    END IF;
    IF p_reference IS NULL OR p_reference = '' THEN
        RAISE EXCEPTION 'reference is required';
    END IF;

    -- Idempotency: Stripe retries webhook deliveries — if this reference was
    -- already granted, report the current balance and change nothing.
    IF EXISTS (
        SELECT 1 FROM public.credit_transactions
        WHERE type = 'purchase' AND reference_id = p_reference
    ) THEN
        SELECT balance INTO v_new_balance
        FROM public.credit_balances
        WHERE user_id = p_user_id;
        RETURN COALESCE(v_new_balance, 0);
    END IF;

    BEGIN
        -- Atomic increment; creates the balance row if the user has none yet
        INSERT INTO public.credit_balances (user_id, balance, lifetime_purchased, lifetime_used)
        VALUES (p_user_id, p_amount, p_amount, 0)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = credit_balances.balance + EXCLUDED.balance,
            lifetime_purchased = credit_balances.lifetime_purchased + EXCLUDED.lifetime_purchased
        RETURNING balance INTO v_new_balance;

        INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, description, reference_id)
        VALUES (p_user_id, p_amount, v_new_balance, 'purchase', 'Credit pack purchase', p_reference);
    EXCEPTION WHEN unique_violation THEN
        -- A concurrent retry recorded the same reference first; its grant
        -- stands and this block's balance increment was rolled back.
        SELECT balance INTO v_new_balance
        FROM public.credit_balances
        WHERE user_id = p_user_id;
        RETURN COALESCE(v_new_balance, 0);
    END;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Only the backend (service role key, used by the stripe-webhook function)
-- may grant credits. Unlike 003's RPCs this is deliberately NOT granted to
-- authenticated — a signed-in browser must not be able to call it.
REVOKE ALL ON FUNCTION public.grant_purchased_credits(UUID, INTEGER, TEXT) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.grant_purchased_credits(UUID, INTEGER, TEXT) TO service_role;
