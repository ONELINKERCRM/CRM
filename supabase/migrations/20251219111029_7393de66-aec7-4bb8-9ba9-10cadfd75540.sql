-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Admin/Manager can create listings" ON public.listings;

-- Create a more permissive INSERT policy that allows any agent in the company to create listings
CREATE POLICY "Agents can create listings for their company" 
ON public.listings 
FOR INSERT 
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT agents.company_id 
    FROM agents 
    WHERE agents.user_id = auth.uid()
  )
);

-- Also add a fallback for users who are company creators but may not have an agent record yet
-- Update is_listing_admin to also check if user is company creator
CREATE OR REPLACE FUNCTION public.is_listing_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  is_company_creator boolean;
BEGIN
  -- Check if user is an admin/manager agent
  SELECT role INTO user_role
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF user_role IN ('admin', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a company creator
  SELECT EXISTS(
    SELECT 1 FROM public.companies 
    WHERE created_by = auth.uid()
  ) INTO is_company_creator;
  
  RETURN is_company_creator;
END;
$$;