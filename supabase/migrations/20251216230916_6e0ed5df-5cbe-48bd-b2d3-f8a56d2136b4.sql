-- Drop existing restrictive policies on lead_activities table
DROP POLICY IF EXISTS "Users can view activities in their company" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can create activities in their company" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can update activities in their company" ON public.lead_activities;
DROP POLICY IF EXISTS "Admins can delete activities in their company" ON public.lead_activities;

-- Create new policies that work with or without company_id
CREATE POLICY "Users can view activities" 
ON public.lead_activities 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL))
    OR company_id IS NULL
  )
);

CREATE POLICY "Users can create activities" 
ON public.lead_activities 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update activities" 
ON public.lead_activities 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL))
    OR company_id IS NULL
    OR agent_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own activities" 
ON public.lead_activities 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    agent_id = auth.uid()
    OR (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role))
  )
);