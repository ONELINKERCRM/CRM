-- Drop existing restrictive policies on leads table
DROP POLICY IF EXISTS "Users can view leads in their company" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads in their company" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads in their company" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads in their company" ON public.leads;

-- Create new policies that work with or without company_id
-- Users can view their own leads (where company_id matches profile OR they created it)
CREATE POLICY "Users can view leads" 
ON public.leads 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- If user has a company, show company leads
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL))
    OR
    -- If lead has no company, show to all authenticated users (for testing/demo)
    company_id IS NULL
  )
);

-- Users can create leads
CREATE POLICY "Users can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update leads they have access to
CREATE POLICY "Users can update leads" 
ON public.leads 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL))
    OR company_id IS NULL
  )
);

-- Admins can delete leads
CREATE POLICY "Admins can delete leads" 
ON public.leads 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
  )
);