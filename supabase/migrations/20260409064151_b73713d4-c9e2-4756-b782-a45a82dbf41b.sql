
CREATE OR REPLACE FUNCTION public.record_loss(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE game_sessions
  SET result = 'loss', win_amount = 0
  WHERE id = p_session_id AND user_id = v_user_id AND result = 'in_progress';

  RETURN jsonb_build_object('success', true);
END;
$$;
