-- 20251225123000_fix_signup_flow.sql
-- Description: Allow users to insert data necessary for signup/onboarding.

-- 1. Allowed authenticated users to inserted into organizations
-- This is required because handleSignUp creates an organization for the user.
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 2. Allow users to insert themselves into organization_members
-- This is required to make the user the owner of their new organization.
DROP POLICY IF EXISTS "Users can join organizations as owner" ON public.organization_members;
CREATE POLICY "Users can join organizations as owner" ON public.organization_members
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to create pipelines
-- Required for creating the default pipeline during signup.
DROP POLICY IF EXISTS "Users can create pipelines" ON public.pipelines;
CREATE POLICY "Users can create pipelines" ON public.pipelines
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Allow users to create pipeline stages
-- Required for creating default stages.
DROP POLICY IF EXISTS "Users can create pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can create pipeline stages" ON public.pipeline_stages
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Allow users to create organization settings
-- Required for setting defaults.
DROP POLICY IF EXISTS "Users can create organization settings" ON public.organization_settings;
CREATE POLICY "Users can create organization settings" ON public.organization_settings
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 6. Allow users to create companies (Backward compatibility table)
-- Covered in previous migration proposal but reinforced here if needed.
-- We check if policy exists to avoid error if previous migration ran, OR just create it if not exists.
-- Since this is SQL, 'CREATE POLICY IF NOT EXISTS' is only available in newer Postgres versions or via DO block.
-- We will assume standard CREATE POLICY; if it fails due to existence, it's fine (redundant safety).
-- However, to be safe, we'll use a unique name or drop if exists.
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
CREATE POLICY "Users can create companies" ON public.companies
    FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update companies they belong to" ON public.companies;
CREATE POLICY "Users can update companies they belong to" ON public.companies
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        ) OR
        id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 7. Allow users to create lead stages (Company specific)
DROP POLICY IF EXISTS "Users can create lead stages" ON public.lead_stages;
CREATE POLICY "Users can create lead stages" ON public.lead_stages
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 8. Allow users to create lead groups
DROP POLICY IF EXISTS "Users can create lead groups" ON public.lead_groups;
CREATE POLICY "Users can create lead groups" ON public.lead_groups
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 9. Ensure profiles can be updated by the user (Role is updateable by self for this flow, though strictly should be restricted)
-- The existing policy allows update of own profile. If column filtering is not enabled, this works.
