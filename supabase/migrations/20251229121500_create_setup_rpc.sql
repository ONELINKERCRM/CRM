-- Create a comprehensive setup function to handle new organization creation atomically
-- This bypasses RLS issues by running as SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.setup_new_account(
    p_company_name TEXT,
    p_slug TEXT,
    p_country TEXT,
    p_currency TEXT,
    p_timezone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of the creator (postgres)
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_company_id UUID;
    v_pipeline_id UUID;
    v_lead_pipeline_id UUID;
BEGIN
    -- Get the ID of the user calling this function
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Create Organization
    INSERT INTO public.organizations (
        name, slug, industry, settings, created_by
    ) VALUES (
        p_company_name, 
        p_slug, 
        'Real Estate', 
        jsonb_build_object('country', p_country, 'currency', p_currency, 'timezone', p_timezone),
        v_user_id
    )
    RETURNING id INTO v_org_id;

    -- 2. Add User as Owner
    INSERT INTO public.organization_members (
        organization_id, user_id, role, joined_at
    ) VALUES (
        v_org_id, v_user_id, 'owner', now()
    );

    -- 3. Create Default Sales Pipeline
    INSERT INTO public.pipelines (
        organization_id, name, description, is_default, created_by
    ) VALUES (
        v_org_id, 'Sales Pipeline', 'Default sales pipeline', true, v_user_id
    )
    RETURNING id INTO v_pipeline_id;

    -- 4. Create Default Pipeline Stages
    INSERT INTO public.pipeline_stages (
        pipeline_id, organization_id, name, color, probability, sort_order, is_won, is_lost
    ) VALUES 
        (v_pipeline_id, v_org_id, 'New', '#6366f1', 10, 0, false, false),
        (v_pipeline_id, v_org_id, 'Contacted', '#3b82f6', 20, 1, false, false),
        (v_pipeline_id, v_org_id, 'Qualified', '#0ea5e9', 40, 2, false, false),
        (v_pipeline_id, v_org_id, 'Proposal', '#f59e0b', 60, 3, false, false),
        (v_pipeline_id, v_org_id, 'Negotiation', '#f97316', 80, 4, false, false),
        (v_pipeline_id, v_org_id, 'Won', '#22c55e', 100, 5, true, false),
        (v_pipeline_id, v_org_id, 'Lost', '#ef4444', 0, 6, false, true);

    -- 5. Create Organization Settings
    INSERT INTO public.organization_settings (
        organization_id, default_currency, default_timezone, default_pipeline_id
    ) VALUES (
        v_org_id, p_currency, p_timezone, v_pipeline_id
    );

    -- 6. Create Company (Legacy compatibility)
    INSERT INTO public.companies (
        name, country, currency, industry, lead_sources, created_by
    ) VALUES (
        p_company_name, p_country, p_currency, 'brokerage', '[]'::jsonb, v_user_id
    )
    RETURNING id INTO v_company_id;

    -- 7. Create Lead Stages (Legacy)
    INSERT INTO public.lead_stages (
        company_id, name, color, position, is_default, is_won, is_lost
    ) VALUES
        (v_company_id, 'New', '#3B82F6', 0, true, false, false),
        (v_company_id, 'Contacted', '#8B5CF6', 1, false, false, false),
        (v_company_id, 'Qualified', '#06B6D4', 2, false, false, false),
        (v_company_id, 'Meeting Scheduled', '#EC4899', 3, false, false, false),
        (v_company_id, 'Viewing Done', '#14B8A6', 4, false, false, false),
        (v_company_id, 'Proposal Sent', '#F59E0B', 5, false, false, false),
        (v_company_id, 'Negotiation', '#F97316', 6, false, false, false),
        (v_company_id, 'Contract Signed', '#84CC16', 7, false, false, false),
        (v_company_id, 'Won', '#10B981', 8, false, true, false),
        (v_company_id, 'Lost', '#EF4444', 9, false, false, true);

    -- 8. Create Lead Groups
    INSERT INTO public.lead_groups (
        company_id, created_by, name, color
    ) VALUES
        (v_company_id, v_user_id, 'VIP', '#F59E0B'),
        (v_company_id, v_user_id, 'Hot Leads', '#EF4444'),
        (v_company_id, v_user_id, 'Cold Leads', '#3B82F6'),
        (v_company_id, v_user_id, 'Investors', '#8B5CF6'),
        (v_company_id, v_user_id, 'First Time Buyers', '#06B6D4'),
        (v_company_id, v_user_id, 'Cash Buyers', '#10B981'),
        (v_company_id, v_user_id, 'Follow Up Required', '#EC4899');

    -- 9. Create Lead Pipeline (New System)
    INSERT INTO public.lead_pipelines (
        company_id, name, description, is_default, created_by
    ) VALUES (
        v_company_id, 'Sales Pipeline', 'Default sales pipeline', true, v_user_id
    )
    RETURNING id INTO v_lead_pipeline_id;

    -- 10. Create Lead Pipeline Stages
    INSERT INTO public.lead_pipeline_stages (
        pipeline_id, stage_name, stage_order, color, is_won, is_lost
    ) VALUES
        (v_lead_pipeline_id, 'New', 0, '#3b82f6', false, false),
        (v_lead_pipeline_id, 'Contacted', 1, '#8b5cf6', false, false),
        (v_lead_pipeline_id, 'Qualified', 2, '#0ea5e9', false, false),
        (v_lead_pipeline_id, 'Proposal Sent', 3, '#f59e0b', false, false),
        (v_lead_pipeline_id, 'Won', 4, '#22c55e', true, false),
        (v_lead_pipeline_id, 'Lost', 5, '#ef4444', false, true);

    -- 11. Update Profile
    UPDATE public.profiles
    SET 
        company_id = v_company_id,
        onboarding_completed = true,
        role = 'admin'
    WHERE id = v_user_id;

    -- 12. Create User Role
    -- Use INSERT ON CONFLICT to avoid errors if trigger already created it
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    RETURN jsonb_build_object(
        'organization_id', v_org_id,
        'company_id', v_company_id,
        'pipeline_id', v_pipeline_id
    );
END;
$$;
