
-- game_sessions
DROP POLICY IF EXISTS "Authenticated users can view all game sessions for stats" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can view their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Admins can view all game sessions" ON public.game_sessions;
CREATE POLICY "Users can view their own game sessions"
  ON public.game_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all game sessions"
  ON public.game_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- profiles trigger
CREATE OR REPLACE FUNCTION public.profiles_block_sensitive_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'wallet_balance can only be modified via wallet RPCs';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'email is immutable from client';
  END IF;
  IF NEW.security_flags IS DISTINCT FROM OLD.security_flags THEN
    RAISE EXCEPTION 'security_flags cannot be modified by user';
  END IF;
  IF NEW.privacy_accepted IS DISTINCT FROM OLD.privacy_accepted AND OLD.privacy_accepted = true THEN
    RAISE EXCEPTION 'privacy_accepted cannot be revoked';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'status can only be changed by admins';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_block_sensitive_updates_trg ON public.profiles;
CREATE TRIGGER profiles_block_sensitive_updates_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (current_setting('role', true) <> 'postgres')
  EXECUTE FUNCTION public.profiles_block_sensitive_updates();

-- user_roles restrictive policies
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Block non-admin role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "Block non-admin role updates" ON public.user_roles;
DROP POLICY IF EXISTS "Block non-admin role deletes" ON public.user_roles;
CREATE POLICY "Block non-admin role inserts" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Block non-admin role updates" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Block non-admin role deletes" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- app_settings restrict to authenticated
DROP POLICY IF EXISTS "Everyone can view settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.app_settings;
CREATE POLICY "Authenticated users can view settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
