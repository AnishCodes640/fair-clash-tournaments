
-- =============================================
-- 1. Remove dangerous direct INSERT policies
-- =============================================

-- Remove user direct INSERT on wallet_transactions
DROP POLICY IF EXISTS "Users can create own transactions" ON public.wallet_transactions;

-- Remove user direct INSERT on game_sessions
DROP POLICY IF EXISTS "Users can create own game sessions" ON public.game_sessions;

-- =============================================
-- 2. Create SECURITY DEFINER RPCs for wallet ops
-- =============================================

-- Place bet: validates balance, deducts, records transaction + game session
CREATE OR REPLACE FUNCTION public.place_bet(
  p_amount numeric,
  p_game_id text,
  p_game_title text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_new_balance numeric;
  v_tx_id uuid;
  v_session_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid bet amount');
  END IF;

  -- Lock the profile row to prevent race conditions
  SELECT wallet_balance INTO v_balance
  FROM profiles WHERE user_id = v_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  IF p_amount > v_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  v_new_balance := v_balance - p_amount;

  UPDATE profiles SET wallet_balance = v_new_balance WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
  VALUES (v_user_id, 'bet', p_amount, 'Bet on ' || p_game_title, 'completed')
  RETURNING id INTO v_tx_id;

  INSERT INTO game_sessions (user_id, game_id, game_title, bet_amount, result)
  VALUES (v_user_id, p_game_id, p_game_title, p_amount, 'in_progress')
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_new_balance,
    'transactionId', v_tx_id,
    'sessionId', v_session_id
  );
END;
$$;

-- Add winnings: credits balance, records transaction, updates game session
CREATE OR REPLACE FUNCTION public.add_winnings(
  p_amount numeric,
  p_game_title text,
  p_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_new_balance numeric;
  v_tx_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance INTO v_balance
  FROM profiles WHERE user_id = v_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_new_balance := v_balance + p_amount;

  UPDATE profiles SET wallet_balance = v_new_balance WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
  VALUES (v_user_id, 'winning', p_amount, 'Won on ' || p_game_title, 'completed')
  RETURNING id INTO v_tx_id;

  -- Update game session if provided
  IF p_session_id IS NOT NULL THEN
    UPDATE game_sessions SET win_amount = p_amount, result = 'won'
    WHERE id = p_session_id AND user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_new_balance,
    'transactionId', v_tx_id
  );
END;
$$;

-- Refund bet
CREATE OR REPLACE FUNCTION public.refund_bet(
  p_amount numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_new_balance numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance INTO v_balance
  FROM profiles WHERE user_id = v_user_id FOR UPDATE;

  v_new_balance := v_balance + p_amount;

  UPDATE profiles SET wallet_balance = v_new_balance WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
  VALUES (v_user_id, 'refund', p_amount, p_reason, 'completed');

  RETURN jsonb_build_object('success', true, 'newBalance', v_new_balance);
END;
$$;

-- Record withdrawal transaction (called from client during withdrawal flow)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_upi_id text DEFAULT NULL,
  p_mobile_number text DEFAULT NULL,
  p_qr_code_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_fee numeric;
  v_net numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_amount < 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal is ₹100');
  END IF;
  IF p_upi_id IS NULL AND p_mobile_number IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UPI ID or mobile number required');
  END IF;

  SELECT wallet_balance INTO v_balance
  FROM profiles WHERE user_id = v_user_id FOR UPDATE;

  IF p_amount > v_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  v_fee := p_amount * 0.4;
  v_net := p_amount - v_fee;

  -- Deduct balance
  UPDATE profiles SET wallet_balance = v_balance - p_amount WHERE user_id = v_user_id;

  -- Create withdrawal request
  INSERT INTO withdrawal_requests (user_id, amount, platform_fee, net_amount, upi_id, mobile_number, qr_code_url)
  VALUES (v_user_id, p_amount, v_fee, v_net, p_upi_id, p_mobile_number, p_qr_code_url);

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount, fee, description, status)
  VALUES (v_user_id, 'withdrawal', p_amount, v_fee, 'Withdrawal request (net ₹' || v_net::text || ')', 'pending');

  RETURN jsonb_build_object(
    'success', true,
    'newBalance', v_balance - p_amount,
    'net', v_net,
    'fee', v_fee
  );
END;
$$;

-- =============================================
-- 3. Fix profiles exposure - create public view
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view active profiles" ON public.profiles;

-- Add a restricted policy that only exposes non-sensitive fields via a view
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT user_id, username, display_name, avatar_url, bio, status, created_at
FROM profiles
WHERE status = 'active';

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- =============================================
-- 4. Fix Ludo cross-player UPDATE policy
-- =============================================

DROP POLICY IF EXISTS "Players can update any player in their room" ON public.ludo_players;

-- Only allow updating your own player record
CREATE POLICY "Players can update own status in room"
ON public.ludo_players
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- 5. Add DELETE policy for payment-screenshots
-- =============================================

CREATE POLICY "Users can delete own screenshots"
ON storage.objects
FOR DELETE
USING (bucket_id = 'payment-screenshots' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete any screenshots"
ON storage.objects
FOR DELETE
USING (bucket_id = 'payment-screenshots' AND has_role(auth.uid(), 'admin'::app_role));
