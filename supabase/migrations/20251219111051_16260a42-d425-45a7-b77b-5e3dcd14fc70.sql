-- Create agents for existing company creators who don't have agent records
INSERT INTO public.agents (user_id, company_id, name, email, role, status, permissions)
SELECT 
  c.created_by,
  c.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  'admin'::agent_role,
  'active'::agent_status,
  '{"listings": true, "leads": true, "marketing": true, "settings": true}'::jsonb
FROM public.companies c
JOIN auth.users u ON u.id = c.created_by
WHERE NOT EXISTS (
  SELECT 1 FROM public.agents a 
  WHERE a.user_id = c.created_by AND a.company_id = c.id
);

-- Create a function to auto-create agent when company is created
CREATE OR REPLACE FUNCTION public.create_agent_for_company_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  -- Get user info
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', email) 
  INTO user_email, user_name
  FROM auth.users 
  WHERE id = NEW.created_by;
  
  -- Create agent record for company creator
  INSERT INTO public.agents (user_id, company_id, name, email, role, status, permissions)
  VALUES (
    NEW.created_by,
    NEW.id,
    user_name,
    user_email,
    'admin'::agent_role,
    'active'::agent_status,
    '{"listings": true, "leads": true, "marketing": true, "settings": true}'::jsonb
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create agent on company creation
DROP TRIGGER IF EXISTS trigger_create_agent_for_company ON public.companies;
CREATE TRIGGER trigger_create_agent_for_company
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.create_agent_for_company_creator();