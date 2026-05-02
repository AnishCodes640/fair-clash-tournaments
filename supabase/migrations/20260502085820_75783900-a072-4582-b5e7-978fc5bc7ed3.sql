-- 1. Remove overly broad profile exposure policy
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- 2. Safe public leaderboard view (no email, no security_flags, no privacy_accepted)
CREATE OR REPLACE VIEW public.public_leaderboard
WITH (security_invoker = true) AS
SELECT
  user_id,
  username,
  display_name,
  avatar_url,
  wallet_balance,
  active_theme,
  status
FROM public.profiles
WHERE status = 'active';

GRANT SELECT ON public.public_leaderboard TO authenticated, anon;

-- We need a way for authenticated users to read this view despite RLS on profiles.
-- security_invoker=true means RLS is checked on profiles. To allow leaderboard reads
-- without exposing sensitive columns, add a permissive SELECT policy that only matters
-- when accessed through the view. Easiest: make the view SECURITY DEFINER-like via a
-- SECURITY DEFINER function instead.

DROP VIEW IF EXISTS public.public_leaderboard;

CREATE OR REPLACE FUNCTION public.get_public_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  wallet_balance numeric,
  active_theme text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, username, display_name, avatar_url, wallet_balance, active_theme
  FROM public.profiles
  WHERE status = 'active'
$$;

GRANT EXECUTE ON FUNCTION public.get_public_leaderboard() TO authenticated, anon;

-- 3. Replace ludo_rooms INSERT policy with stricter validation
DROP POLICY IF EXISTS "Authenticated can create rooms" ON public.ludo_rooms;

CREATE POLICY "Authenticated can create rooms"
ON public.ludo_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  entry_fee >= 0
  AND entry_fee <= 1000
  AND status = 'waiting'
  AND winner_id IS NULL
  AND (
    (mode = '2p' AND prize_pool = entry_fee * 2)
    OR (mode = '4p' AND prize_pool = entry_fee * 4)
  )
);

-- Rate limit: max 5 ludo rooms per user per hour, enforced via trigger.
-- Track creator on the room.
ALTER TABLE public.ludo_rooms
  ADD COLUMN IF NOT EXISTS creator_user_id uuid;

CREATE OR REPLACE FUNCTION public.ludo_rooms_set_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  NEW.creator_user_id := auth.uid();

  SELECT COUNT(*) INTO v_count
  FROM public.ludo_rooms
  WHERE creator_user_id = auth.uid()
    AND created_at > now() - interval '1 hour';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit: max 5 rooms per hour';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ludo_rooms_before_insert ON public.ludo_rooms;
CREATE TRIGGER ludo_rooms_before_insert
BEFORE INSERT ON public.ludo_rooms
FOR EACH ROW EXECUTE FUNCTION public.ludo_rooms_set_creator();

-- 4. Lock down ludo_rooms UPDATE: prevent tampering with financial / outcome columns
CREATE OR REPLACE FUNCTION public.ludo_rooms_validate_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Caller must be a participant of the room
  IF NOT EXISTS (
    SELECT 1 FROM public.ludo_players
    WHERE room_id = NEW.id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Immutable financial fields
  IF NEW.entry_fee IS DISTINCT FROM OLD.entry_fee THEN
    RAISE EXCEPTION 'entry_fee is immutable';
  END IF;
  IF NEW.prize_pool IS DISTINCT FROM OLD.prize_pool THEN
    RAISE EXCEPTION 'prize_pool is immutable';
  END IF;
  IF NEW.creator_user_id IS DISTINCT FROM OLD.creator_user_id THEN
    RAISE EXCEPTION 'creator_user_id is immutable';
  END IF;

  -- winner_id may only be set once, must be an actual participant of this room,
  -- and only when the game is being marked finished
  IF NEW.winner_id IS DISTINCT FROM OLD.winner_id THEN
    IF OLD.winner_id IS NOT NULL THEN
      RAISE EXCEPTION 'winner already set';
    END IF;
    IF NEW.winner_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.ludo_players
        WHERE room_id = NEW.id AND user_id = NEW.winner_id
      ) THEN
        RAISE EXCEPTION 'winner must be a participant of this room';
      END IF;
      IF NEW.status <> 'finished' THEN
        RAISE EXCEPTION 'winner can only be set on finished rooms';
      END IF;
    END IF;
  END IF;

  -- Status transitions: only allow forward progression
  IF OLD.status = 'finished' AND NEW.status <> 'finished' THEN
    RAISE EXCEPTION 'cannot resurrect finished room';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ludo_rooms_before_update ON public.ludo_rooms;
CREATE TRIGGER ludo_rooms_before_update
BEFORE UPDATE ON public.ludo_rooms
FOR EACH ROW EXECUTE FUNCTION public.ludo_rooms_validate_update();