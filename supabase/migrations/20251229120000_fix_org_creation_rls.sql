-- Add created_by column to organizations for RLS and auditing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'created_by') THEN
    ALTER TABLE public.organizations ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Update RLS policies to allow creators to see their organizations immediately (fix for returning id after insert)
DROP POLICY IF EXISTS "Users can view own organizations" ON public.organizations;
CREATE POLICY "Users can view own organizations" ON public.organizations
    FOR SELECT
    USING (
        (created_by = auth.uid()) OR 
        (id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()))
    );

-- Ensure insert policy is active
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Ensure update policy allows creators to update (optional but good)
DROP POLICY IF EXISTS "Creators can update organizations" ON public.organizations;
CREATE POLICY "Creators can update organizations" ON public.organizations
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
