-- Drop existing policies
DROP POLICY IF EXISTS "Users can view leads from their company" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads for their company" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads from their company" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads from their company" ON public.leads;

-- Create new policies that handle NULL company_id
-- Allow authenticated users to see leads that match their company OR leads with no company
CREATE POLICY "Users can view leads"
ON public.leads
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can create leads"
ON public.leads
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update leads"
ON public.leads
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can delete leads"
ON public.leads
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    company_id IS NULL OR
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);