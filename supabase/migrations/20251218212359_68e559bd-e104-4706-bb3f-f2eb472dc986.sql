
-- Fix function search path for trigger functions
CREATE OR REPLACE FUNCTION public.update_listing_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_listing_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'OL-' || to_char(now(), 'YYMMDD') || '-' || 
      LPAD(FLOOR(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
