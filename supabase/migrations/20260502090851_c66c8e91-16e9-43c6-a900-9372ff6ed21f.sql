
-- ============================================================
-- 1. SPORTS PREDICTION
-- ============================================================
CREATE TABLE public.sports_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  start_time timestamptz NOT NULL,
  entry_fee numeric NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  max_players integer NOT NULL DEFAULT 100 CHECK (max_players > 0),
  current_players integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  winning_option_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prediction_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.sports_matches(id) ON DELETE CASCADE,
  label text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 2.0 CHECK (multiplier >= 1.0 AND multiplier <= 50.0),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prediction_options_match ON public.prediction_options(match_id);

CREATE TABLE public.user_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL REFERENCES public.sports_matches(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.prediction_options(id) ON DELETE CASCADE,
  bet_amount numeric NOT NULL CHECK (bet_amount > 0),
  result text NOT NULL DEFAULT 'pending',
  win_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);
CREATE INDEX idx_user_predictions_user ON public.user_predictions(user_id);
CREATE INDEX idx_user_predictions_match ON public.user_predictions(match_id);

ALTER TABLE public.sports_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matches" ON public.sports_matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.sports_matches FOR ALL USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can view options" ON public.prediction_options FOR SELECT USING (true);
CREATE POLICY "Admins manage options" ON public.prediction_options FOR ALL USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own predictions" ON public.user_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all predictions" ON public.user_predictions FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.place_sports_prediction(p_match_id uuid, p_option_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_match record;
  v_option record;
  v_balance numeric;
  v_fee numeric;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO v_match FROM sports_matches WHERE id = p_match_id FOR UPDATE;
  IF v_match.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Match not found'); END IF;
  IF v_match.status <> 'upcoming' THEN RETURN jsonb_build_object('success',false,'error','Match not open'); END IF;
  IF v_match.start_time <= now() THEN RETURN jsonb_build_object('success',false,'error','Match already started'); END IF;
  IF v_match.current_players >= v_match.max_players THEN RETURN jsonb_build_object('success',false,'error','Match full'); END IF;
  SELECT * INTO v_option FROM prediction_options WHERE id = p_option_id AND match_id = p_match_id;
  IF v_option.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Invalid option'); END IF;
  IF EXISTS (SELECT 1 FROM user_predictions WHERE user_id = v_uid AND match_id = p_match_id) THEN
    RETURN jsonb_build_object('success',false,'error','Already predicted');
  END IF;
  v_fee := v_match.entry_fee;
  SELECT wallet_balance INTO v_balance FROM profiles WHERE user_id = v_uid FOR UPDATE;
  IF v_balance < v_fee THEN RETURN jsonb_build_object('success',false,'error','Insufficient balance'); END IF;
  UPDATE profiles SET wallet_balance = wallet_balance - v_fee WHERE user_id = v_uid;
  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
    VALUES (v_uid, 'bet', v_fee, 'Sports prediction: ' || v_match.title, 'completed');
  INSERT INTO user_predictions (user_id, match_id, option_id, bet_amount)
    VALUES (v_uid, p_match_id, p_option_id, v_fee);
  UPDATE sports_matches SET current_players = current_players + 1 WHERE id = p_match_id;
  RETURN jsonb_build_object('success',true,'newBalance', v_balance - v_fee);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_sports_match(p_match_id uuid, p_winning_option_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_option record;
  v_pred record;
  v_payout numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RETURN jsonb_build_object('success',false,'error','Forbidden'); END IF;
  SELECT * INTO v_option FROM prediction_options WHERE id = p_winning_option_id AND match_id = p_match_id;
  IF v_option.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Invalid winning option'); END IF;
  UPDATE sports_matches SET status='resolved', winning_option_id=p_winning_option_id, updated_at=now() WHERE id = p_match_id;
  FOR v_pred IN SELECT * FROM user_predictions WHERE match_id = p_match_id AND result = 'pending' LOOP
    IF v_pred.option_id = p_winning_option_id THEN
      v_payout := v_pred.bet_amount * v_option.multiplier;
      UPDATE user_predictions SET result='won', win_amount=v_payout WHERE id = v_pred.id;
      UPDATE profiles SET wallet_balance = wallet_balance + v_payout WHERE user_id = v_pred.user_id;
      INSERT INTO wallet_transactions (user_id, type, amount, description, status)
        VALUES (v_pred.user_id, 'winning', v_payout, 'Sports prediction win', 'completed');
    ELSE
      UPDATE user_predictions SET result='lost', win_amount=0 WHERE id = v_pred.id;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success',true);
END;
$$;

-- ============================================================
-- 2. QUIZ
-- ============================================================
CREATE TABLE public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_fee numeric NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  reward numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_sessions_user ON public.quiz_sessions(user_id);

CREATE TABLE public.quiz_session_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  correct_answer text NOT NULL,
  user_answer text,
  is_correct boolean,
  answered_at timestamptz
);
CREATE INDEX idx_quiz_answers_session ON public.quiz_session_answers(session_id);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_session_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own quiz sessions" ON public.quiz_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all quiz sessions" ON public.quiz_sessions FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own quiz answers" ON public.quiz_session_answers FOR SELECT
USING (EXISTS (SELECT 1 FROM quiz_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins view all quiz answers" ON public.quiz_session_answers FOR SELECT USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('quiz_config', '{"entry_fee": 10, "reward_per_correct": 1.25, "penalty_per_wrong": 0.5, "questions_per_session": 10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.start_quiz_session(p_questions jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cfg jsonb;
  v_fee numeric;
  v_balance numeric;
  v_session_id uuid;
  v_q jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF jsonb_typeof(p_questions) <> 'array' OR jsonb_array_length(p_questions) <> 10 THEN
    RETURN jsonb_build_object('success',false,'error','Need exactly 10 questions');
  END IF;
  SELECT value INTO v_cfg FROM app_settings WHERE key = 'quiz_config';
  v_fee := COALESCE((v_cfg->>'entry_fee')::numeric, 10);
  SELECT wallet_balance INTO v_balance FROM profiles WHERE user_id = v_uid FOR UPDATE;
  IF v_balance < v_fee THEN RETURN jsonb_build_object('success',false,'error','Insufficient balance'); END IF;
  UPDATE profiles SET wallet_balance = wallet_balance - v_fee WHERE user_id = v_uid;
  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
    VALUES (v_uid, 'bet', v_fee, 'Quiz entry', 'completed');
  INSERT INTO quiz_sessions (user_id, entry_fee) VALUES (v_uid, v_fee) RETURNING id INTO v_session_id;
  FOR v_q IN SELECT * FROM jsonb_array_elements(p_questions) LOOP
    INSERT INTO quiz_session_answers (session_id, question_id, correct_answer)
      VALUES (v_session_id, v_q->>'id', v_q->>'correct');
  END LOOP;
  RETURN jsonb_build_object('success',true,'sessionId',v_session_id,'newBalance',v_balance - v_fee);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_answer(p_session_id uuid, p_question_id text, p_answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session record;
  v_ans record;
  v_correct boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO v_session FROM quiz_sessions WHERE id = p_session_id AND user_id = v_uid FOR UPDATE;
  IF v_session.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Session not found'); END IF;
  IF v_session.status <> 'active' THEN RETURN jsonb_build_object('success',false,'error','Session closed'); END IF;
  SELECT * INTO v_ans FROM quiz_session_answers WHERE session_id = p_session_id AND question_id = p_question_id;
  IF v_ans.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Question not in session'); END IF;
  IF v_ans.user_answer IS NOT NULL THEN RETURN jsonb_build_object('success',false,'error','Already answered'); END IF;
  v_correct := lower(trim(p_answer)) = lower(trim(v_ans.correct_answer));
  UPDATE quiz_session_answers SET user_answer = p_answer, is_correct = v_correct, answered_at = now()
    WHERE id = v_ans.id;
  IF v_correct THEN
    UPDATE quiz_sessions SET correct_count = correct_count + 1 WHERE id = p_session_id;
  ELSE
    UPDATE quiz_sessions SET wrong_count = wrong_count + 1 WHERE id = p_session_id;
  END IF;
  RETURN jsonb_build_object('success',true,'correct',v_correct);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_quiz_session(p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session record;
  v_cfg jsonb;
  v_reward numeric;
  v_penalty numeric;
  v_net numeric;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO v_session FROM quiz_sessions WHERE id = p_session_id AND user_id = v_uid FOR UPDATE;
  IF v_session.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Session not found'); END IF;
  IF v_session.status = 'finished' THEN RETURN jsonb_build_object('success',false,'error','Already finished'); END IF;
  SELECT value INTO v_cfg FROM app_settings WHERE key = 'quiz_config';
  v_reward := COALESCE((v_cfg->>'reward_per_correct')::numeric, 1.25);
  v_penalty := COALESCE((v_cfg->>'penalty_per_wrong')::numeric, 0.5);
  v_net := GREATEST(0, v_session.correct_count * v_reward - v_session.wrong_count * v_penalty);
  UPDATE quiz_sessions SET status = 'finished', reward = v_net WHERE id = p_session_id;
  IF v_net > 0 THEN
    UPDATE profiles SET wallet_balance = wallet_balance + v_net WHERE user_id = v_uid;
    INSERT INTO wallet_transactions (user_id, type, amount, description, status)
      VALUES (v_uid, 'winning', v_net, 'Quiz reward', 'completed');
  END IF;
  RETURN jsonb_build_object('success',true,'reward',v_net,'correct',v_session.correct_count,'wrong',v_session.wrong_count);
END;
$$;

-- ============================================================
-- 3. VERIFIED BADGES
-- ============================================================
CREATE TABLE public.verification_tiers (
  id text PRIMARY KEY,
  tier text NOT NULL,
  duration text NOT NULL,
  price numeric NOT NULL,
  duration_days integer NOT NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

INSERT INTO public.verification_tiers (id, tier, duration, price, duration_days, display_name) VALUES
  ('basic_monthly','basic','monthly',49,30,'Basic Verified · 1 mo'),
  ('basic_yearly','basic','yearly',499,365,'Basic Verified · 1 yr'),
  ('medium_monthly','medium','monthly',99,30,'Medium Verified · 1 mo'),
  ('medium_yearly','medium','yearly',999,365,'Medium Verified · 1 yr'),
  ('premium_monthly','premium','monthly',199,30,'Premium Verified · 1 mo'),
  ('premium_yearly','premium','yearly',1999,365,'Premium Verified · 1 yr')
ON CONFLICT DO NOTHING;

CREATE TABLE public.user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL,
  tier_id text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'purchase',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_verifications_expires ON public.user_verifications(expires_at);

ALTER TABLE public.verification_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tiers" ON public.verification_tiers FOR SELECT USING (true);
CREATE POLICY "Admins manage tiers" ON public.verification_tiers FOR ALL USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own verification" ON public.user_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active verifications" ON public.user_verifications FOR SELECT USING (expires_at > now());
CREATE POLICY "Admins manage verifications" ON public.user_verifications FOR ALL USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.purchase_verification(p_tier_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier record;
  v_balance numeric;
  v_existing record;
  v_starts timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO v_tier FROM verification_tiers WHERE id = p_tier_id AND is_active;
  IF v_tier.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Invalid tier'); END IF;
  SELECT wallet_balance INTO v_balance FROM profiles WHERE user_id = v_uid FOR UPDATE;
  IF v_balance < v_tier.price THEN RETURN jsonb_build_object('success',false,'error','Insufficient balance'); END IF;
  UPDATE profiles SET wallet_balance = wallet_balance - v_tier.price WHERE user_id = v_uid;
  INSERT INTO wallet_transactions (user_id, type, amount, description, status)
    VALUES (v_uid, 'purchase', v_tier.price, 'Verification: ' || v_tier.display_name, 'completed');
  SELECT * INTO v_existing FROM user_verifications WHERE user_id = v_uid;
  IF v_existing.id IS NOT NULL AND v_existing.expires_at > now() THEN
    v_starts := v_existing.expires_at;
    UPDATE user_verifications SET tier = v_tier.tier, tier_id = v_tier.id,
      expires_at = v_starts + (v_tier.duration_days || ' days')::interval, source='purchase'
      WHERE id = v_existing.id;
  ELSIF v_existing.id IS NOT NULL THEN
    UPDATE user_verifications SET tier = v_tier.tier, tier_id = v_tier.id,
      starts_at = v_starts, expires_at = v_starts + (v_tier.duration_days || ' days')::interval, source='purchase'
      WHERE id = v_existing.id;
  ELSE
    INSERT INTO user_verifications (user_id, tier, tier_id, starts_at, expires_at, source)
      VALUES (v_uid, v_tier.tier, v_tier.id, v_starts, v_starts + (v_tier.duration_days || ' days')::interval, 'purchase');
  END IF;
  RETURN jsonb_build_object('success',true,'newBalance',v_balance - v_tier.price);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_verification(p_user_id uuid, p_tier_id text, p_deduct boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tier record;
  v_balance numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RETURN jsonb_build_object('success',false,'error','Forbidden'); END IF;
  SELECT * INTO v_tier FROM verification_tiers WHERE id = p_tier_id;
  IF v_tier.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Invalid tier'); END IF;
  IF p_deduct THEN
    SELECT wallet_balance INTO v_balance FROM profiles WHERE user_id = p_user_id FOR UPDATE;
    IF v_balance < v_tier.price THEN RETURN jsonb_build_object('success',false,'error','User has insufficient balance'); END IF;
    UPDATE profiles SET wallet_balance = wallet_balance - v_tier.price WHERE user_id = p_user_id;
    INSERT INTO wallet_transactions (user_id, type, amount, description, status)
      VALUES (p_user_id, 'purchase', v_tier.price, 'Admin-assigned verification', 'completed');
  END IF;
  INSERT INTO user_verifications (user_id, tier, tier_id, expires_at, source)
    VALUES (p_user_id, v_tier.tier, v_tier.id, now() + (v_tier.duration_days || ' days')::interval, 'admin_grant')
  ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier, tier_id = EXCLUDED.tier_id,
        expires_at = EXCLUDED.expires_at, source = 'admin_grant', starts_at = now();
  RETURN jsonb_build_object('success',true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_verification(p_user_id uuid)
RETURNS TABLE (tier text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tier, expires_at FROM user_verifications
  WHERE user_id = p_user_id AND expires_at > now();
$$;

-- ============================================================
-- 4. MAILBOX
-- ============================================================
CREATE TABLE public.mailbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  target_user_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mailbox_target ON public.mailbox_messages(target_user_id);
CREATE INDEX idx_mailbox_scheduled ON public.mailbox_messages(scheduled_at);

CREATE TABLE public.mailbox_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.mailbox_messages(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

ALTER TABLE public.mailbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailbox_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view applicable messages" ON public.mailbox_messages FOR SELECT USING (
  scheduled_at <= now() AND (expires_at IS NULL OR expires_at > now())
  AND (audience = 'all' OR target_user_id = auth.uid())
);
CREATE POLICY "Admins view all messages" ON public.mailbox_messages FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage messages" ON public.mailbox_messages FOR ALL USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own reads" ON public.mailbox_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reads" ON public.mailbox_reads FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.mailbox_mark_read(p_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  INSERT INTO mailbox_reads (user_id, message_id) VALUES (v_uid, p_message_id)
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success',true);
END;
$$;

-- ============================================================
-- 5. AVIATOR CASH-FLOW CONTROL
-- ============================================================
CREATE TABLE public.aviator_daily_pool (
  pool_date date PRIMARY KEY DEFAULT CURRENT_DATE,
  total_in numeric NOT NULL DEFAULT 0,
  total_out numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aviator_daily_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view pool" ON public.aviator_daily_pool FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage pool" ON public.aviator_daily_pool FOR ALL USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('aviator_cashflow', '{"pool_cap": 50000, "min_bet": 1, "max_bet": 30, "max_slots_per_user": 2, "max_payout_multiplier": 8}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.aviator_record_bet(p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO aviator_daily_pool (pool_date, total_in, updated_at)
    VALUES (CURRENT_DATE, p_amount, now())
  ON CONFLICT (pool_date) DO UPDATE SET total_in = aviator_daily_pool.total_in + p_amount, updated_at = now();
  RETURN jsonb_build_object('success',true);
END;
$$;

CREATE OR REPLACE FUNCTION public.aviator_record_payout(p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg jsonb;
  v_cap numeric;
  v_pool record;
BEGIN
  SELECT value INTO v_cfg FROM app_settings WHERE key = 'aviator_cashflow';
  v_cap := COALESCE((v_cfg->>'pool_cap')::numeric, 50000);
  SELECT * INTO v_pool FROM aviator_daily_pool WHERE pool_date = CURRENT_DATE FOR UPDATE;
  IF v_pool.pool_date IS NULL THEN
    INSERT INTO aviator_daily_pool (pool_date, total_out) VALUES (CURRENT_DATE, 0)
    RETURNING * INTO v_pool;
  END IF;
  IF v_pool.total_out + p_amount > v_cap THEN
    RETURN jsonb_build_object('success',false,'error','Daily payout cap reached','allowed',GREATEST(0, v_cap - v_pool.total_out));
  END IF;
  UPDATE aviator_daily_pool SET total_out = total_out + p_amount, updated_at = now() WHERE pool_date = CURRENT_DATE;
  RETURN jsonb_build_object('success',true);
END;
$$;

-- ============================================================
-- 6. ADMIN BANNERS
-- ============================================================
CREATE TABLE public.admin_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  image_url text,
  cta_text text,
  cta_link text,
  bg_color text DEFAULT '#1a1a2e',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view active banners" ON public.admin_banners FOR SELECT USING (
  is_active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
);
CREATE POLICY "Admins view all banners" ON public.admin_banners FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage banners" ON public.admin_banners FOR ALL USING (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 7. REALTIME — guard against duplicate publication membership
-- ============================================================
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER TABLE public.tournament_participants REPLICA IDENTITY FULL;
ALTER TABLE public.admin_banners REPLICA IDENTITY FULL;
ALTER TABLE public.mailbox_messages REPLICA IDENTITY FULL;
ALTER TABLE public.sports_matches REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tournaments') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tournament_participants') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='admin_banners') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_banners';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='mailbox_messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.mailbox_messages';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sports_matches') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.sports_matches';
  END IF;
END $$;

CREATE TRIGGER trg_sports_matches_updated BEFORE UPDATE ON public.sports_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
