-- 20251225124000_fix_signup_final.sql
-- Description: Add missing columns and all signup policies.

-- 1. Fix Profiles table schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT;

-- 2. Organizations Policies
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Organization Members Policies
DROP POLICY IF EXISTS "Users can join organizations as owner" ON public.organization_members;
CREATE POLICY "Users can join organizations as owner" ON public.organization_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Pipelines & Stages Policies
DROP POLICY IF EXISTS "Users can create pipelines" ON public.pipelines;
CREATE POLICY "Users can create pipelines" ON public.pipelines
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can create pipeline stages" ON public.pipeline_stages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Organization Settings Policies
DROP POLICY IF EXISTS "Users can create organization settings" ON public.organization_settings;
CREATE POLICY "Users can create organization settings" ON public.organization_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Companies Policies
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
CREATE POLICY "Users can create companies" ON public.companies
    FOR INSERT WITH CHECK (auth.uid() = created_by);

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

-- 7. Lead Stages & Groups Policies
DROP POLICY IF EXISTS "Users can create lead stages" ON public.lead_stages;
CREATE POLICY "Users can create lead stages" ON public.lead_stages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create lead groups" ON public.lead_groups;
CREATE POLICY "Users can create lead groups" ON public.lead_groups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
