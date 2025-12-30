-- 20240101000001_security_policies.sql
-- Description: Row Level Security (RLS) policies to secure data access based on organization and company context.

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_source_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization ID
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.organization_members -- Assuming a join table exists or linking user to org directly via profiles/agents
    WHERE user_id = auth.uid()
    LIMIT 1;
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's company ID
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID AS $$
DECLARE
    comp_id UUID;
BEGIN
    SELECT company_id INTO comp_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Fallback to agents table if profile doesn't have it (depending on structure)
    IF comp_id IS NULL THEN
        SELECT company_id INTO comp_id
        FROM public.agents
        WHERE user_id = auth.uid();
    END IF;
    
    RETURN comp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Organization Access
CREATE POLICY "Users can view their own organizations" ON public.organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- 2. Company Access
CREATE POLICY "Users can view companies they belong to" ON public.companies
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        ) OR
        id = public.get_current_user_company_id()
    );

-- 3. CRM Entity Access (Broad Policy for Company Data)
-- Applies to: agents, teams, leads, deals, contacts, accounts, etc.
-- Pattern: Allow if company_id matches user's company_id

-- Agents
CREATE POLICY "Users can view agents in their company" ON public.agents
    FOR SELECT USING (company_id = public.get_current_user_company_id());

-- Leads (Legacy)
CREATE POLICY "Users can view leads in their company" ON public.leads
    FOR ALL USING (company_id = public.get_current_user_company_id());

-- CRM Leads (New)
CREATE POLICY "Users can view crm_leads in their organization" ON public.crm_leads
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- Contacts
CREATE POLICY "Users can view contacts in their organization" ON public.contacts
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- Accounts
CREATE POLICY "Users can view accounts in their organization" ON public.accounts
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- Deals
CREATE POLICY "Users can view deals in their organization" ON public.deals
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- Activities
CREATE POLICY "Users can view activities in their organization" ON public.activities
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- Lead Sources
CREATE POLICY "Users can view lead sources in their company" ON public.lead_sources
    FOR ALL USING (company_id = public.get_current_user_company_id());

-- Website Forms
CREATE POLICY "Users can view website forms in their company" ON public.website_forms
    FOR ALL USING (company_id = public.get_current_user_company_id());

-- Portal Leads
CREATE POLICY "Users can view portal leads in their company" ON public.portal_leads
    FOR ALL USING (company_id = public.get_current_user_company_id());

-- Campaigns
CREATE POLICY "Users can view campaigns in their company" ON public.campaigns
    FOR ALL USING (company_id = public.get_current_user_company_id());

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- TODO: Add specific policies for INSERT/UPDATE/DELETE based on roles (admin/manager/agent) as needed.
-- Currently using permissive "ALL" for members of the same company/org to simplify migration.
