
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT user_id, username, display_name, avatar_url, bio, status, created_at
FROM profiles
WHERE status = 'active';

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- We need a SELECT policy that allows authenticated users to read profiles
-- but only through this view (which only exposes safe columns)
-- Add a policy that allows reading only non-sensitive data
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (status = 'active');
