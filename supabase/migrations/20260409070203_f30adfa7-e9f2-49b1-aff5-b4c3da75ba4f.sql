
-- Add active_theme column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_theme text NOT NULL DEFAULT 'basic';

-- Create user_themes table for purchased themes
CREATE TABLE public.user_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  theme_id text NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, theme_id)
);

ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own themes" ON public.user_themes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own themes" ON public.user_themes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RPC to purchase a theme (deducts wallet balance atomically)
CREATE OR REPLACE FUNCTION public.purchase_theme(p_theme_id text, p_price numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already purchased
  IF EXISTS (SELECT 1 FROM user_themes WHERE user_id = v_uid AND theme_id = p_theme_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Theme already purchased');
  END IF;

  -- Lock and check balance
  SELECT wallet_balance INTO v_balance FROM profiles WHERE user_id = v_uid FOR UPDATE;
  IF v_balance < p_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct balance
  UPDATE profiles SET wallet_balance = wallet_balance - p_price, active_theme = p_theme_id WHERE user_id = v_uid;

  -- Record purchase
  INSERT INTO user_themes (user_id, theme_id) VALUES (v_uid, p_theme_id);

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
  VALUES (v_uid, 'purchase', p_price, 'Theme purchase: ' || p_theme_id, 'completed');

  RETURN jsonb_build_object('success', true);
END;
$$;
