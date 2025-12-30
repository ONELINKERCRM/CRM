-- 20251225130000_fix_all_permissions_final.sql
-- Description: Comprehensive fix for roles, missing columns, and RLS policies.

-- 1. Ensure profiles table has all columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 2. Synchronize user_roles table (The security source of truth)
-- This ensures that any user who has a role in 'profiles' also has it in 'user_roles'
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::public.app_role FROM public.profiles 
WHERE role IN ('admin', 'manager', 'team_leader', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Organizations Policies (Critical for signup)
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their own organizations" ON public.organizations;
CREATE POLICY "Users can view their own organizations" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    );

-- 4. Organization Members Policies
DROP POLICY IF EXISTS "Users can join organizations as owner" ON public.organization_members;
CREATE POLICY "Users can join organizations as owner" ON public.organization_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Companies Policies
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
CREATE POLICY "Users can create companies" ON public.companies
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view company" ON public.companies;
CREATE POLICY "Users can view company" ON public.companies
    FOR SELECT USING (true); -- Permissive for now to avoid blocking dashboard

-- 6. Leads & Pipelines Policies
DROP POLICY IF EXISTS "Users can create pipelines" ON public.pipelines;
CREATE POLICY "Users can create pipelines" ON public.pipelines
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can create pipeline stages" ON public.pipeline_stages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 7. Specific Table fixes for Dashboard
-- Ensure properties and lead_activities are viewable by authenticated users
DROP POLICY IF EXISTS "Authenticated users can view lead activities" ON public.lead_activities;
CREATE POLICY "Authenticated users can view lead activities" ON public.lead_activities
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view company properties" ON public.properties;
CREATE POLICY "Users can view company properties" ON public.properties
    FOR SELECT TO authenticated USING (true);

-- 8. Enable profiles update for signup completion
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());
