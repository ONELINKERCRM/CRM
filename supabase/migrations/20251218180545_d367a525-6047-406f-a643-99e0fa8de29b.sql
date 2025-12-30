-- Fix search_path for generate_api_key function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := 'olcrm_' || encode(gen_random_bytes(24), 'base64');
  v_key := replace(replace(replace(v_key, '+', 'x'), '/', 'y'), '=', '');
  RETURN v_key;
END;
$$;