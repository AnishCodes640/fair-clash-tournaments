
-- Blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own blocks" ON public.user_blocks FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own blocks" ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "users delete own blocks" ON public.user_blocks FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);
CREATE POLICY "admins manage blocks" ON public.user_blocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Reports
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  category text NOT NULL,
  reason text NOT NULL,
  context_url text,
  status text NOT NULL DEFAULT 'open',
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_id),
  CHECK (length(reason) BETWEEN 4 AND 1000)
);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON public.user_reports(reported_id);
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own reports" ON public.user_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage reports" ON public.user_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
-- Insert handled via RPC only

-- Anti-cheat flags
CREATE TABLE IF NOT EXISTS public.auto_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auto_flags_status ON public.auto_flags(status, created_at DESC);
ALTER TABLE public.auto_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage flags" ON public.auto_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- RPCs
CREATE OR REPLACE FUNCTION public.toggle_block(p_target uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF v_uid = p_target THEN RETURN jsonb_build_object('success',false,'error','Cannot block yourself'); END IF;
  SELECT id INTO v_existing FROM user_blocks WHERE blocker_id = v_uid AND blocked_id = p_target;
  IF v_existing IS NOT NULL THEN
    DELETE FROM user_blocks WHERE id = v_existing;
    RETURN jsonb_build_object('success',true,'blocked',false);
  END IF;
  INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (v_uid, p_target);
  -- Auto-remove follows both directions on block
  DELETE FROM user_follows WHERE (follower_id = v_uid AND following_id = p_target)
                              OR (follower_id = p_target AND following_id = v_uid);
  RETURN jsonb_build_object('success',true,'blocked',true);
END; $$;

CREATE OR REPLACE FUNCTION public.submit_report(
  p_target uuid, p_category text, p_reason text, p_context_url text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_recent int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF v_uid = p_target THEN RETURN jsonb_build_object('success',false,'error','Cannot report yourself'); END IF;
  IF length(coalesce(p_reason,'')) < 4 THEN RETURN jsonb_build_object('success',false,'error','Reason too short'); END IF;
  -- Rate limit: 5 reports / hour
  SELECT count(*) INTO v_recent FROM user_reports
    WHERE reporter_id = v_uid AND created_at > now() - interval '1 hour';
  IF v_recent >= 5 THEN RETURN jsonb_build_object('success',false,'error','Too many reports — try later'); END IF;
  INSERT INTO user_reports (reporter_id, reported_id, category, reason, context_url)
    VALUES (v_uid, p_target, p_category, trim(p_reason), p_context_url) RETURNING id INTO v_id;
  -- Notify admins via mailbox audience='admin' is not modeled; insert with audience='all' but target_user_id=null for admin attention.
  -- Skipping cross-table broadcast to avoid coupling.
  RETURN jsonb_build_object('success',true,'id',v_id);
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_report(p_id uuid, p_status text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RETURN jsonb_build_object('success',false,'error','Forbidden'); END IF;
  IF p_status NOT IN ('resolved','dismissed','escalated') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid status');
  END IF;
  UPDATE user_reports SET status = p_status, admin_note = COALESCE(p_note, admin_note),
    resolved_at = now(), resolved_by = auth.uid() WHERE id = p_id;
  RETURN jsonb_build_object('success',true);
END; $$;

CREATE OR REPLACE FUNCTION public.list_my_blocks()
RETURNS TABLE(blocked_id uuid, username text, display_name text, avatar_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.blocked_id, p.username, p.display_name, p.avatar_url, b.created_at
  FROM user_blocks b LEFT JOIN profiles p ON p.user_id = b.blocked_id
  WHERE b.blocker_id = auth.uid() ORDER BY b.created_at DESC;
$$;

-- Friend feed: recent activity from people I follow
CREATE OR REPLACE FUNCTION public.get_friend_feed(p_limit int DEFAULT 30)
RETURNS TABLE(
  user_id uuid, username text, display_name text, avatar_url text, active_theme text,
  kind text, summary text, occurred_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH followed AS (
    SELECT following_id AS uid FROM user_follows WHERE follower_id = auth.uid()
  ),
  activity AS (
    SELECT s.user_id AS uid, 'game'::text AS kind,
      (CASE WHEN s.result IN ('win','won') THEN 'Won ₹' || coalesce(s.win_amount,0)::text || ' on ' || s.game_title
            WHEN s.result IN ('loss','lost') THEN 'Lost on ' || s.game_title
            ELSE 'Played ' || s.game_title END) AS summary,
      s.created_at AS occurred_at
    FROM game_sessions s
    WHERE s.user_id IN (SELECT uid FROM followed)
      AND s.created_at > now() - interval '7 days'
    UNION ALL
    SELECT pl.user_id AS uid, 'level'::text,
      'Reached ' || initcap(pl.level) || ' tier', pl.updated_at
    FROM player_progression pl
    WHERE pl.user_id IN (SELECT uid FROM followed) AND pl.updated_at > now() - interval '7 days'
  )
  SELECT a.uid, p.username, p.display_name, p.avatar_url, p.active_theme,
         a.kind, a.summary, a.occurred_at
  FROM activity a JOIN profiles p ON p.user_id = a.uid
  ORDER BY a.occurred_at DESC
  LIMIT p_limit;
$$;
