
-- Tighten room creation: only set entry_fee to 0 or positive
DROP POLICY "Authenticated can create rooms" ON public.ludo_rooms;
CREATE POLICY "Authenticated can create rooms" ON public.ludo_rooms FOR INSERT TO authenticated WITH CHECK (entry_fee >= 0);

-- Tighten room updates: only players in the room can update
DROP POLICY "Players can update rooms" ON public.ludo_rooms;
CREATE POLICY "Players in room can update" ON public.ludo_rooms FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ludo_players lp WHERE lp.room_id = ludo_rooms.id AND lp.user_id = auth.uid())
);
