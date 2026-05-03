
-- Player progression
CREATE TABLE IF NOT EXISTS public.player_progression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  level text NOT NULL DEFAULT 'bronze',
  xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  lifetime_wins integer NOT NULL DEFAULT 0,
  lifetime_games integer NOT NULL DEFAULT 0,
  lifetime_earnings numeric NOT NULL DEFAULT 0,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view progression" ON public.player_progression FOR SELECT USING (true);
CREATE POLICY "Admins manage progression" ON public.player_progression FOR ALL USING (has_role(auth.uid(),'admin'));

-- Record game result + milestone bonuses
CREATE OR REPLACE FUNCTION public.record_game_result(p_session_id uuid, p_won boolean, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prog record;
  v_bonus numeric := 0;
  v_new_level text;
  v_achievements jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;

  -- Update game session
  IF p_session_id IS NOT NULL THEN
    UPDATE game_sessions SET result = CASE WHEN p_won THEN 'won' ELSE 'loss' END,
      win_amount = CASE WHEN p_won THEN p_amount ELSE 0 END
    WHERE id = p_session_id AND user_id = v_uid AND result = 'in_progress';
  END IF;

  -- Credit winnings atomically
  IF p_won AND p_amount > 0 THEN
    UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE user_id = v_uid;
    INSERT INTO wallet_transactions (user_id, type, amount, description, status)
      VALUES (v_uid, 'winning', p_amount, 'Game win', 'completed');
  END IF;

  -- Upsert progression
  INSERT INTO player_progression (user_id) VALUES (v_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_prog FROM player_progression WHERE user_id = v_uid FOR UPDATE;

  IF p_won THEN
    v_prog.current_streak := v_prog.current_streak + 1;
    v_prog.lifetime_wins := v_prog.lifetime_wins + 1;
    v_prog.lifetime_earnings := v_prog.lifetime_earnings + p_amount;
    IF v_prog.current_streak > v_prog.best_streak THEN
      v_prog.best_streak := v_prog.current_streak;
    END IF;
    -- Streak bonuses
    IF v_prog.current_streak = 3 THEN v_bonus := 5;
    ELSIF v_prog.current_streak = 5 THEN v_bonus := 15;
    ELSIF v_prog.current_streak = 10 THEN v_bonus := 50;
    END IF;
    IF v_bonus > 0 THEN
      UPDATE profiles SET wallet_balance = wallet_balance + v_bonus WHERE user_id = v_uid;
      INSERT INTO wallet_transactions (user_id, type, amount, description, status)
        VALUES (v_uid, 'winning', v_bonus, 'Streak bonus x' || v_prog.current_streak, 'completed');
    END IF;
  ELSE
    v_prog.current_streak := 0;
  END IF;

  v_prog.lifetime_games := v_prog.lifetime_games + 1;
  v_prog.xp := v_prog.xp + CASE WHEN p_won THEN 25 ELSE 5 END;

  -- Level thresholds by lifetime wins
  v_new_level := CASE
    WHEN v_prog.lifetime_wins >= 100 THEN 'diamond'
    WHEN v_prog.lifetime_wins >= 50 THEN 'gold'
    WHEN v_prog.lifetime_wins >= 15 THEN 'silver'
    ELSE 'bronze' END;

  v_achievements := v_prog.achievements;
  IF v_new_level <> v_prog.level THEN
    v_achievements := v_achievements || jsonb_build_array(jsonb_build_object('type','level_up','level',v_new_level,'at',now()));
  END IF;

  UPDATE player_progression SET
    level = v_new_level, xp = v_prog.xp,
    current_streak = v_prog.current_streak, best_streak = v_prog.best_streak,
    lifetime_wins = v_prog.lifetime_wins, lifetime_games = v_prog.lifetime_games,
    lifetime_earnings = v_prog.lifetime_earnings, achievements = v_achievements,
    updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('success',true,'level',v_new_level,'streak',v_prog.current_streak,'bonus',v_bonus);
END; $$;

-- Seed defaults if missing
INSERT INTO app_settings (key, value) VALUES
  ('theme_pricing','{"basic":0,"advanced":99,"ultra":299,"premium":499,"discount_percent":0}'::jsonb),
  ('quiz_config','{"entry_fee":10,"reward_per_correct":1.25,"penalty_per_wrong":1,"questions_per_session":10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed verification tiers if empty
INSERT INTO verification_tiers (id, tier, duration, price, duration_days, display_name, is_active) VALUES
  ('blue_monthly','blue','monthly',49,30,'Blue Verified (Monthly)',true),
  ('blue_yearly','blue','yearly',399,365,'Blue Verified (Yearly)',true),
  ('gold_monthly','gold','monthly',149,30,'Gold Verified (Monthly)',true),
  ('gold_yearly','gold','yearly',1299,365,'Gold Verified (Yearly)',true),
  ('diamond_yearly','diamond','yearly',2999,365,'Diamond Verified (Yearly)',true)
ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.player_progression;
