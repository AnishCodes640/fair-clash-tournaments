
-- FOLLOWS
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users insert own follows" ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follows" ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "Admins manage follows" ON public.user_follows FOR ALL USING (has_role(auth.uid(),'admin'));

-- LIKES
CREATE TABLE public.profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id uuid NOT NULL,
  liked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liker_id, liked_id),
  CHECK (liker_id <> liked_id)
);
CREATE INDEX idx_profile_likes_liked ON public.profile_likes(liked_id);
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.profile_likes FOR SELECT USING (true);
CREATE POLICY "Users insert own likes" ON public.profile_likes FOR INSERT WITH CHECK (auth.uid() = liker_id);
CREATE POLICY "Users delete own likes" ON public.profile_likes FOR DELETE USING (auth.uid() = liker_id);
CREATE POLICY "Admins manage likes" ON public.profile_likes FOR ALL USING (has_role(auth.uid(),'admin'));

-- DIRECT MESSAGES
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  is_read boolean NOT NULL DEFAULT false,
  deleted_for_sender boolean NOT NULL DEFAULT false,
  deleted_for_recipient boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX idx_dm_pair ON public.direct_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON public.direct_messages(recipient_id, created_at DESC);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages" ON public.direct_messages FOR SELECT
  USING (
    (auth.uid() = sender_id AND NOT deleted_for_sender)
    OR (auth.uid() = recipient_id AND NOT deleted_for_recipient)
    OR has_role(auth.uid(),'admin')
  );
CREATE POLICY "Sender inserts message" ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Participants update own visibility" ON public.direct_messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete messages" ON public.direct_messages FOR DELETE
  USING (has_role(auth.uid(),'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_likes;

-- RPC: toggle follow
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF v_uid = p_target THEN RETURN jsonb_build_object('success',false,'error','Cannot follow self'); END IF;
  SELECT id INTO v_existing FROM user_follows WHERE follower_id = v_uid AND following_id = p_target;
  IF v_existing IS NOT NULL THEN
    DELETE FROM user_follows WHERE id = v_existing;
    RETURN jsonb_build_object('success',true,'following',false);
  ELSE
    INSERT INTO user_follows (follower_id, following_id) VALUES (v_uid, p_target);
    RETURN jsonb_build_object('success',true,'following',true);
  END IF;
END; $$;

-- RPC: toggle like
CREATE OR REPLACE FUNCTION public.toggle_profile_like(p_target uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF v_uid = p_target THEN RETURN jsonb_build_object('success',false,'error','Cannot like self'); END IF;
  SELECT id INTO v_existing FROM profile_likes WHERE liker_id = v_uid AND liked_id = p_target;
  IF v_existing IS NOT NULL THEN
    DELETE FROM profile_likes WHERE id = v_existing;
    RETURN jsonb_build_object('success',true,'liked',false);
  ELSE
    INSERT INTO profile_likes (liker_id, liked_id) VALUES (v_uid, p_target);
    RETURN jsonb_build_object('success',true,'liked',true);
  END IF;
END; $$;

-- RPC: send DM
CREATE OR REPLACE FUNCTION public.send_direct_message(p_recipient uuid, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_count int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF v_uid = p_recipient THEN RETURN jsonb_build_object('success',false,'error','Cannot message yourself'); END IF;
  IF length(trim(p_body)) = 0 THEN RETURN jsonb_build_object('success',false,'error','Empty message'); END IF;
  -- Rate limit: max 30 messages/min per user
  SELECT count(*) INTO v_count FROM direct_messages
    WHERE sender_id = v_uid AND created_at > now() - interval '1 minute';
  IF v_count >= 30 THEN RETURN jsonb_build_object('success',false,'error','Slow down — too many messages'); END IF;
  INSERT INTO direct_messages (sender_id, recipient_id, body)
    VALUES (v_uid, p_recipient, trim(p_body)) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'id',v_id);
END; $$;

-- RPC: mark conversation read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_other uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  UPDATE direct_messages SET is_read = true
    WHERE recipient_id = v_uid AND sender_id = p_other AND is_read = false;
  RETURN jsonb_build_object('success',true);
END; $$;

-- RPC: soft-delete a message for the calling user
CREATE OR REPLACE FUNCTION public.delete_direct_message(p_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_msg record;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO v_msg FROM direct_messages WHERE id = p_message_id;
  IF v_msg.id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not found'); END IF;
  IF v_uid = v_msg.sender_id THEN
    UPDATE direct_messages SET deleted_for_sender = true WHERE id = p_message_id;
  ELSIF v_uid = v_msg.recipient_id THEN
    UPDATE direct_messages SET deleted_for_recipient = true WHERE id = p_message_id;
  ELSE
    RETURN jsonb_build_object('success',false,'error','Forbidden');
  END IF;
  RETURN jsonb_build_object('success',true);
END; $$;

-- RPC: public profile snapshot (no email)
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE(
  user_id uuid, username text, display_name text, avatar_url text,
  bio text, active_theme text, created_at timestamptz,
  follower_count bigint, following_count bigint, like_count bigint,
  is_admin boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.user_id, p.username, p.display_name, p.avatar_url, p.bio,
    p.active_theme, p.created_at,
    (SELECT count(*) FROM user_follows WHERE following_id = p.user_id),
    (SELECT count(*) FROM user_follows WHERE follower_id = p.user_id),
    (SELECT count(*) FROM profile_likes WHERE liked_id = p.user_id),
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = p.user_id AND role = 'admin')
  FROM profiles p
  WHERE p.user_id = p_user_id AND p.status = 'active';
$$;

-- RPC: search users by username/display name (public, capped)
CREATE OR REPLACE FUNCTION public.search_users(p_query text)
RETURNS TABLE(
  user_id uuid, username text, display_name text, avatar_url text, active_theme text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, username, display_name, avatar_url, active_theme
  FROM profiles
  WHERE status = 'active'
    AND length(coalesce(p_query,'')) >= 2
    AND (username ILIKE '%' || p_query || '%' OR display_name ILIKE '%' || p_query || '%')
  ORDER BY username
  LIMIT 25;
$$;
