-- Update properties table to allow null company_id for users without companies
ALTER TABLE public.properties ALTER COLUMN company_id DROP NOT NULL;

-- Drop existing restrictive policies on properties table
DROP POLICY IF EXISTS "Users can view company properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create company properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update company properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;

-- Create new policies that work with or without company_id
CREATE POLICY "Users can view properties" 
ON public.properties 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL))
    OR company_id IS NULL
    OR created_by = auth.uid()
  )
);

CREATE POLICY "Users can create properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update properties" 
ON public.properties 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL))
    OR company_id IS NULL
    OR created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete own properties" 
ON public.properties 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    created_by = auth.uid()
    OR (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role))
  )
);