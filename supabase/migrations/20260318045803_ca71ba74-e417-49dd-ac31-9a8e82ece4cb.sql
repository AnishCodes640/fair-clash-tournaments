-- Allow all authenticated users to view all active profiles (for leaderboard)
CREATE POLICY "Authenticated users can view active profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (status = 'active');

-- Allow all authenticated users to view all game sessions for stats
CREATE POLICY "Authenticated users can view all game sessions for stats"
ON public.game_sessions
FOR SELECT
TO authenticated
USING (true);
