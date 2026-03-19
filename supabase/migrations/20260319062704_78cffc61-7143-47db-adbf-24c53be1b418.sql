
-- Ludo game rooms
CREATE TABLE public.ludo_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT '2p' CHECK (mode IN ('2p', '4p')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_turn integer NOT NULL DEFAULT 0,
  dice_value integer DEFAULT NULL,
  winner_id uuid DEFAULT NULL,
  entry_fee numeric NOT NULL DEFAULT 0,
  prize_pool numeric NOT NULL DEFAULT 0,
  board_state jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ludo players in rooms
CREATE TABLE public.ludo_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.ludo_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  player_index integer NOT NULL,
  username text NOT NULL DEFAULT '',
  avatar_url text DEFAULT NULL,
  is_connected boolean NOT NULL DEFAULT true,
  pieces jsonb NOT NULL DEFAULT '[-1,-1,-1,-1]',
  finished boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ludo_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ludo_players ENABLE ROW LEVEL SECURITY;

-- Everyone can view rooms for matchmaking
CREATE POLICY "Anyone can view ludo rooms" ON public.ludo_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create rooms" ON public.ludo_rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Players can update rooms" ON public.ludo_rooms FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Anyone can view ludo players" ON public.ludo_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can join rooms" ON public.ludo_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update own status" ON public.ludo_players FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Allow room state updates (for turn progression)
CREATE POLICY "Players can update any player in their room" ON public.ludo_players FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ludo_players lp WHERE lp.room_id = ludo_players.room_id AND lp.user_id = auth.uid())
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ludo_players;
