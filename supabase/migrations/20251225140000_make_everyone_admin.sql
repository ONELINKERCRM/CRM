-- 20251225140000_make_everyone_admin.sql
-- Description: Automates admin role assignment for every new signup and ensures full access.

-- 1. Update the signup trigger to automatically make everyone an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles as admin
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'admin'
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin';

    -- Insert into user_roles as admin (the security source of truth)
    -- We use the enum 'admin' explicitly
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Retroactively make all current users admins if they aren't already
UPDATE public.profiles SET role = 'admin' WHERE role != 'admin' OR role IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Ensure RLS policies are broad enough for admins
-- Lead Pipelines
DROP POLICY IF EXISTS "Admin/Manager can create pipelines" ON public.lead_pipelines;
CREATE POLICY "Admin/Manager can create pipelines" ON public.lead_pipelines FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin/Manager can update pipelines" ON public.lead_pipelines;
CREATE POLICY "Admin/Manager can update pipelines" ON public.lead_pipelines FOR UPDATE USING (true);

-- Lead Pipeline Stages
DROP POLICY IF EXISTS "Admin/Manager can create stages" ON public.lead_pipeline_stages;
CREATE POLICY "Admin/Manager can create stages" ON public.lead_pipeline_stages FOR INSERT WITH CHECK (true);

-- Lead Pipeline Entries
DROP POLICY IF EXISTS "Admin/Manager can add leads to pipeline" ON public.lead_pipeline_entries;
CREATE POLICY "Admin/Manager can add leads to pipeline" ON public.lead_pipeline_entries FOR INSERT WITH CHECK (true);

-- Profiles Update (Self-onboarding)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- User Roles Visibility
DROP POLICY IF EXISTS "Anyone can see their own role" ON public.user_roles;
CREATE POLICY "Anyone can see their own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
