
-- Add expiry columns to notices
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS expiry_at timestamptz DEFAULT NULL;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS auto_expiry_hours integer DEFAULT 24;

-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  upi_id text DEFAULT NULL,
  mobile_number text DEFAULT NULL,
  qr_code_url text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz DEFAULT NULL
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage withdrawal requests" ON public.withdrawal_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Create game_sessions table
CREATE TABLE public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_id text NOT NULL,
  game_title text NOT NULL,
  bet_amount numeric DEFAULT 0,
  win_amount numeric DEFAULT 0,
  result text DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own game sessions" ON public.game_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own game sessions" ON public.game_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all game sessions" ON public.game_sessions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for UPI QR codes
INSERT INTO storage.buckets (id, name, public) VALUES ('upi-qr-codes', 'upi-qr-codes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own QR" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'upi-qr-codes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own QR" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'upi-qr-codes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can view all QR" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'upi-qr-codes' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete QR" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'upi-qr-codes' AND has_role(auth.uid(), 'admin'));

-- Enable realtime for new tables only
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

-- Recreate auth triggers
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin();
