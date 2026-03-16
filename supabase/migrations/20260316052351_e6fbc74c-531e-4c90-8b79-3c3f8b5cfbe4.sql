
-- Recreate missing triggers for auto profile creation and admin role assignment
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin();

-- Enable realtime for wallet_transactions so balance updates are instant
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
