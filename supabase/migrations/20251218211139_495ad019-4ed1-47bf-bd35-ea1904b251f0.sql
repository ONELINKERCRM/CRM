
-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.update_connection_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
