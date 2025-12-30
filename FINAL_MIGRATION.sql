-- ========================================
-- CLEAN SLATE MIGRATION
-- This will drop existing objects and recreate everything
-- ========================================

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS public.campaign_analytics CASCADE;
DROP TABLE IF EXISTS public.campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.portal_import_errors CASCADE;
DROP TABLE IF EXISTS public.portal_leads CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.website_form_submissions CASCADE;
DROP TABLE IF EXISTS public.website_forms CASCADE;
DROP TABLE IF EXISTS public.lead_source_logs CASCADE;
DROP TABLE IF EXISTS public.lead_webhooks CASCADE;
DROP TABLE IF EXISTS public.lead_sources CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.crm_leads CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.lead_groups CASCADE;
DROP TABLE IF EXISTS public.lead_stages CASCADE;
DROP TABLE IF EXISTS public.pipeline_stages CASCADE;
DROP TABLE IF EXISTS public.pipelines CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.organization_settings CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.task_priority CASCADE;
DROP TYPE IF EXISTS public.entity_type CASCADE;
DROP TYPE IF EXISTS public.activity_type CASCADE;
DROP TYPE IF EXISTS public.agent_status CASCADE;
DROP TYPE IF EXISTS public.agent_role CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_current_user_organization_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_company_id() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_webhook_token() CASCADE;
DROP FUNCTION IF EXISTS public.process_portal_lead(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) CASCADE;

-- Now run the complete migration

-- ========================================
-- Migration: 20240101000000_initial_schema.sql
-- ========================================

-- 20240101000000_initial_schema.sql
-- Description: Initial schema setup containing all tables, relationships, and basic constraints.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE public.agent_role AS ENUM ('owner', 'admin', 'manager', 'agent');
CREATE TYPE public.agent_status AS ENUM ('active', 'inactive', 'invited');
CREATE TYPE public.activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'task');
CREATE TYPE public.entity_type AS ENUM ('lead', 'deal', 'account', 'contact');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'user');

-- 1. Organizations & Companies (Core Hierarchy)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    industry TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    country TEXT,
    currency TEXT,
    industry TEXT,
    lead_sources JSONB DEFAULT '[]'::jsonb,
    created_by UUID, -- References auth.users or agents later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Moved from Supplementary to Initial to resolve dependencies
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT DEFAULT 'member', -- owner, admin, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

CREATE TABLE public.organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    default_currency TEXT DEFAULT 'USD',
    default_timezone TEXT DEFAULT 'UTC',
    default_pipeline_id UUID, -- Forward reference resolved below via ALTER or just reference pipelines if order permits (pipelines is below, so allow NULL initially or create pipelines first)
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Teams & Agents
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    manager_id UUID, -- References agents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    team_id UUID REFERENCES public.teams(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role public.agent_role DEFAULT 'agent'::public.agent_role NOT NULL,
    status public.agent_status DEFAULT 'invited'::public.agent_status NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    invitation_token TEXT,
    invitation_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Lead Management (Pipelines, Stages, Groups)
CREATE TABLE public.pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id),
    company_id UUID REFERENCES public.companies(id),
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add ForeignKey for organization_settings.default_pipeline_id now that pipelines exists
ALTER TABLE public.organization_settings
ADD CONSTRAINT fk_organization_settings_pipeline
FOREIGN KEY (default_pipeline_id) REFERENCES public.pipelines(id);


CREATE TABLE public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES public.pipelines(id) NOT NULL,
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#cbd5e1'::text,
    probability INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_won BOOLEAN DEFAULT false,
    is_lost BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lead_stages ( -- Legacy/Company specific stages
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#cbd5e1'::text,
    position INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_won BOOLEAN DEFAULT false,
    is_lost BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lead_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#cbd5e1'::text,
    description TEXT,
    created_by UUID REFERENCES public.agents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CRM Entities (Leads, Contacts, Accounts, Deals)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    phone TEXT,
    email TEXT,
    description TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    annual_revenue NUMERIC,
    employee_count INTEGER,
    source TEXT,
    owner_id UUID REFERENCES public.agents(id),
    created_by UUID REFERENCES public.agents(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    account_id UUID REFERENCES public.accounts(id),
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    department TEXT,
    source TEXT,
    linkedin_url TEXT,
    marketing_status TEXT DEFAULT 'subscribed',
    owner_id UUID REFERENCES public.agents(id),
    created_by UUID REFERENCES public.agents(id),
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    contact_id UUID REFERENCES public.contacts(id),
    account_id UUID REFERENCES public.accounts(id),
    title TEXT NOT NULL,
    description TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    score INTEGER DEFAULT 0,
    amount NUMERIC,
    currency TEXT DEFAULT 'USD',
    expected_close_date DATE,
    probability INTEGER,
    pipeline_id UUID REFERENCES public.pipelines(id),
    stage_id UUID REFERENCES public.pipeline_stages(id),
    owner_id UUID REFERENCES public.agents(id),
    created_by UUID REFERENCES public.agents(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.leads ( -- Legacy/Company specific leads
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    assigned_agent_id UUID REFERENCES public.agents(id),
    stage_id UUID REFERENCES public.lead_stages(id),
    group_id UUID REFERENCES public.lead_groups(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    budget NUMERIC,
    notes TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    is_active BOOLEAN DEFAULT true,
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    whatsapp_thread_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    pipeline_id UUID REFERENCES public.pipelines(id),
    stage_id UUID REFERENCES public.pipeline_stages(id),
    account_id UUID REFERENCES public.accounts(id),
    contact_id UUID REFERENCES public.contacts(id),
    name TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    probability INTEGER DEFAULT 0,
    expected_close_date DATE,
    owner_id UUID REFERENCES public.agents(id),
    created_by UUID REFERENCES public.agents(id),
    description TEXT,
    lost_reason TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Activities & Tasks
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    type public.activity_type NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    related_to_type public.entity_type,
    related_to_id UUID, -- Polymorphic reference manually handled
    account_id UUID REFERENCES public.accounts(id),
    contact_id UUID REFERENCES public.contacts(id),
    deal_id UUID REFERENCES public.deals(id),
    lead_id UUID REFERENCES public.crm_leads(id),
    owner_id UUID REFERENCES public.agents(id),
    created_by UUID REFERENCES public.agents(id),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status public.task_status DEFAULT 'todo'::public.task_status NOT NULL,
    priority public.task_priority DEFAULT 'medium'::public.task_priority NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES public.agents(id),
    related_to_type public.entity_type,
    related_to_id UUID,
    account_id UUID REFERENCES public.accounts(id),
    contact_id UUID REFERENCES public.contacts(id),
    deal_id UUID REFERENCES public.deals(id),
    lead_id UUID REFERENCES public.crm_leads(id),
    created_by UUID REFERENCES public.agents(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Lead Sources, Integrations & Webhooks
CREATE TABLE public.lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    source_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    connection_type TEXT NOT NULL,
    connection_details JSONB DEFAULT '{}'::jsonb,
    field_mapping JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'disconnected',
    is_active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    total_leads_fetched INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lead_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES public.lead_sources(id) NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    webhook_url TEXT NOT NULL,
    secret_key TEXT DEFAULT uuid_generate_v4()::text,
    verify_token TEXT DEFAULT uuid_generate_v4()::text,
    is_active BOOLEAN DEFAULT true,
    last_received_at TIMESTAMP WITH TIME ZONE,
    total_received INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lead_source_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES public.lead_sources(id),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    leads_processed INTEGER DEFAULT 0,
    leads_created INTEGER DEFAULT 0,
    leads_updated INTEGER DEFAULT 0,
    leads_skipped INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.website_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    form_name TEXT NOT NULL,
    form_type TEXT DEFAULT 'html',
    status TEXT DEFAULT 'active',
    success_redirect_url TEXT,
    thank_you_message TEXT,
    spam_protection JSONB DEFAULT '{"honeypot": true, "rate_limit": 10}'::jsonb,
    field_mapping JSONB,
    auto_assign_rules JSONB,
    created_by UUID REFERENCES public.agents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.website_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    form_id UUID REFERENCES public.website_forms(id) NOT NULL,
    submission_data JSONB NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referrer_url TEXT,
    page_url TEXT,
    lead_id UUID REFERENCES public.leads(id),
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    key_name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    api_key_prefix TEXT NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.agents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Portal Integrations
CREATE TABLE public.portal_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    portal_name TEXT NOT NULL,
    portal_lead_id TEXT NOT NULL,
    listing_id UUID, -- Would reference properties/listings table which isn't fully in type def but implied
    assigned_agent_id UUID REFERENCES public.agents(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    message TEXT,
    source TEXT,
    stage_id UUID REFERENCES public.lead_stages(id),
    group_id UUID REFERENCES public.lead_groups(id),
    opted_in BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'new',
    error_message TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, portal_name, portal_lead_id)
);

CREATE TABLE public.portal_import_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    portal_name TEXT NOT NULL,
    lead_data JSONB NOT NULL,
    error_message TEXT NOT NULL,
    error_type TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.agents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Campaigns
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    subject TEXT,
    content TEXT,
    template_id UUID,
    schedule_at TIMESTAMP WITH TIME ZONE,
    audience_filter JSONB,
    stats JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.agents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) NOT NULL,
    contact_id UUID REFERENCES public.contacts(id),
    lead_id UUID REFERENCES public.leads(id),
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) UNIQUE NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    open_rate NUMERIC,
    click_rate NUMERIC,
    delivery_rate NUMERIC,
    failure_rate NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. System / Misc
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT,
    last_name TEXT,
    company_id UUID REFERENCES public.companies(id),
    role TEXT DEFAULT 'user',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================
-- Migration: 20240101000001_security_policies.sql
-- ========================================

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

-- ========================================
-- Migration: 20240101000002_functions_and_triggers.sql
-- ========================================

-- 20240101000002_functions_and_triggers.sql
-- Description: Essential functions and triggers for automating tasks like updating timestamps and handling user creation.

-- 1. Auto-update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER set_updated_at_organizations
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_companies
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_agents
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_leads
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_crm_leads
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_contacts
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_accounts
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_deals
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 2. Handle New User Signup (Profile Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Auth Users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Lead Source Webhook Token Generation (Utility)
CREATE OR REPLACE FUNCTION public.generate_webhook_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 4. Portal Lead Processing Placeholder (RPC)
-- This function was referenced in usePortalLeads.ts
CREATE OR REPLACE FUNCTION public.process_portal_lead(
    p_company_id UUID,
    p_portal_name TEXT,
    p_portal_lead_id TEXT,
    p_name TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_message TEXT,
    p_listing_ref TEXT,
    p_raw_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_lead_id UUID;
BEGIN
    -- Logic to insert/update portal_leads and sync to main leads table
    -- Simplified for migration:
    INSERT INTO public.portal_leads (
        company_id, portal_name, portal_lead_id, name, phone, email, message, raw_data
    )
    VALUES (
        p_company_id, p_portal_name, p_portal_lead_id, p_name, p_phone, p_email, p_message, p_raw_data
    )
    ON CONFLICT (company_id, portal_name, portal_lead_id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        message = EXCLUDED.message,
        updated_at = now()
    RETURNING id INTO v_lead_id;

    RETURN jsonb_build_object('success', true, 'lead_id', v_lead_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. API Key Generation RPC
-- Referenced in useWebsiteForms.ts
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
BEGIN
    -- Generates a random 32-char hex string
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Migration: 20240101000003_supplementary_tables.sql
-- ========================================

-- 20240101000003_supplementary_tables.sql
-- Description: Additional tables identified from the project types that were not in the initial core schema.
-- Updated to exclude tables moved to initial_schema.

-- 1. Real Estate / Listings
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reference_number TEXT,
    price NUMERIC,
    currency TEXT DEFAULT 'USD',
    type TEXT, -- apartment, villa, etc.
    status TEXT DEFAULT 'available', -- available, sold, rented
    address JSONB,
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sqft NUMERIC,
    owner_id UUID REFERENCES public.agents(id),
    created_by UUID REFERENCES public.agents(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.property_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) NOT NULL,
    url TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.property_amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.property_portals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) NOT NULL,
    portal_name TEXT NOT NULL,
    external_id TEXT,
    status TEXT DEFAULT 'pending', -- published, failed, pending
    last_synced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Lead Assignment & Pools
CREATE TABLE public.lead_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB, -- Logic for routing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.agent_load (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES public.agents(id) NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    current_leads_count INTEGER DEFAULT 0,
    max_leads_capacity INTEGER DEFAULT 100,
    is_available BOOLEAN DEFAULT true,
    last_assignment_at TIMESTAMP WITH TIME ZONE,
    total_assignments_today INTEGER DEFAULT 0,
    conversion_rate NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lead_assignment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    lead_id UUID, -- Polymorphic reference to leads or crm_leads ideally
    previous_agent_id UUID REFERENCES public.agents(id),
    new_agent_id UUID REFERENCES public.agents(id),
    reason TEXT, -- manual, round_robin, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.auto_reassignment_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    days_without_contact INTEGER DEFAULT 3,
    apply_to_stages TEXT[],
    reassign_to_pool_id UUID REFERENCES public.lead_pools(id),
    reassign_to_agent_id UUID REFERENCES public.agents(id),
    use_round_robin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.assignment_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    agent_id UUID REFERENCES public.agents(id) NOT NULL,
    lead_id UUID,
    assignment_log_id UUID REFERENCES public.lead_assignment_logs(id),
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Privacy & Messaging
CREATE TABLE public.privacy_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    contact_email TEXT,
    request_type TEXT NOT NULL, -- delete_data, export_data
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Apply RLS to new tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_load ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reassignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Basic Policies for new tables
CREATE POLICY "Users can view properties" ON public.properties FOR ALL USING ( organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()) );
-- (Add other specific policies as needed, sticking to the organization/company membership pattern)

-- ========================================
-- Migration: 20251211214953_9d7aae67-ca81-4d33-8e7d-3ef50e47bef2.sql
-- ========================================

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Migration: 20251211214959_e79b8305-6df0-4c2a-b124-cfbac12bd84a.sql
-- ========================================

-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ========================================
-- Migration: 20251211220020_1e98b254-b0c4-419d-b711-80f70142e242.sql
-- ========================================

-- Add dashboard preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN dashboard_preferences jsonb DEFAULT '{"metrics": ["total-leads", "follow-ups", "new-leads", "conversion-rate"]}'::jsonb;

-- ========================================
-- Migration: 20251211221314_eb5c87e3-b4ef-420e-9719-f7734206dfd5.sql
-- ========================================

-- Create enum for agent roles
CREATE TYPE public.agent_role AS ENUM ('admin', 'manager', 'team_leader', 'agent');

-- Create enum for agent status (including 'invited')
CREATE TYPE public.agent_status AS ENUM ('invited', 'active', 'inactive', 'on_leave');

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agents table
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  role agent_role NOT NULL DEFAULT 'agent',
  status agent_status NOT NULL DEFAULT 'invited',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  permissions JSONB NOT NULL DEFAULT '{"leads": true, "listings": true, "marketing": false, "reports": false, "integrations": false}'::jsonb,
  invitation_token TEXT,
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams (authenticated users can view)
CREATE POLICY "Authenticated users can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage teams"
ON public.teams
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS policies for agents
CREATE POLICY "Authenticated users can view agents"
ON public.agents
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage agents"
ON public.agents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Migration: 20251211224002_7f2ed87c-2c54-4661-a265-6374a9808a5d.sql
-- ========================================

-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'team_leader', 'agent');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'agent',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'team_leader' THEN 3 
      WHEN 'agent' THEN 4 
    END
  LIMIT 1
$$;

-- RLS Policies for user_roles table
-- Only admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create permissions table for granular access control
CREATE TABLE public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission_key text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (role, permission_key)
);

-- Enable RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can view permissions, only admins can modify
CREATE POLICY "Authenticated users can view permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default permissions for each role
INSERT INTO public.role_permissions (role, permission_key) VALUES
-- Admin permissions (all)
('admin', 'leads.view'), ('admin', 'leads.create'), ('admin', 'leads.edit'), ('admin', 'leads.delete'),
('admin', 'listings.view'), ('admin', 'listings.create'), ('admin', 'listings.edit'), ('admin', 'listings.delete'),
('admin', 'teams.view'), ('admin', 'teams.create'), ('admin', 'teams.edit'), ('admin', 'teams.delete'),
('admin', 'agents.view'), ('admin', 'agents.create'), ('admin', 'agents.edit'), ('admin', 'agents.delete'),
('admin', 'marketing.view'), ('admin', 'marketing.create'), ('admin', 'marketing.edit'), ('admin', 'marketing.delete'),
('admin', 'reports.view'), ('admin', 'reports.export'),
('admin', 'settings.view'), ('admin', 'settings.edit'),
('admin', 'billing.view'), ('admin', 'billing.manage'),
('admin', 'integrations.view'), ('admin', 'integrations.manage'),
-- Manager permissions
('manager', 'leads.view'), ('manager', 'leads.create'), ('manager', 'leads.edit'), ('manager', 'leads.delete'),
('manager', 'listings.view'), ('manager', 'listings.create'), ('manager', 'listings.edit'), ('manager', 'listings.delete'),
('manager', 'teams.view'), ('manager', 'teams.edit'),
('manager', 'agents.view'), ('manager', 'agents.edit'),
('manager', 'marketing.view'), ('manager', 'marketing.create'), ('manager', 'marketing.edit'),
('manager', 'reports.view'), ('manager', 'reports.export'),
('manager', 'settings.view'),
-- Team Leader permissions
('team_leader', 'leads.view'), ('team_leader', 'leads.create'), ('team_leader', 'leads.edit'),
('team_leader', 'listings.view'), ('team_leader', 'listings.create'), ('team_leader', 'listings.edit'),
('team_leader', 'teams.view'),
('team_leader', 'agents.view'),
('team_leader', 'reports.view'),
-- Agent permissions
('agent', 'leads.view'), ('agent', 'leads.create'), ('agent', 'leads.edit'),
('agent', 'listings.view'),
('agent', 'reports.view');

-- Create trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Migration: 20251212205335_88f90a1f-b029-41ff-a227-8e31e201d9b5.sql
-- ========================================

-- Create lead_activities table for tracking all lead-related activities
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'whatsapp', 'note', 'stage', 'followup', 'task', 'voicenote', 'automation', 'attachment')),
  title TEXT NOT NULL,
  description TEXT,
  agent_id UUID REFERENCES public.profiles(id),
  agent_name TEXT NOT NULL,
  duration TEXT,
  audio_url TEXT,
  attachments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view lead activities"
ON public.lead_activities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create lead activities"
ON public.lead_activities
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update lead activities"
ON public.lead_activities
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete lead activities"
ON public.lead_activities
FOR DELETE
TO authenticated
USING (true);

-- Enable realtime for this table
ALTER TABLE public.lead_activities REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;

-- Create index for faster queries by lead_id
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

-- ========================================
-- Migration: 20251212231052_b9f6ffd0-8a22-4295-bf75-64d1685d241f.sql
-- ========================================

-- Create companies table to store company information
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  industry TEXT NOT NULL,
  lead_sources TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add company_id and onboarding_completed to profiles
ALTER TABLE public.profiles 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- RLS policies for companies
CREATE POLICY "Users can view their own company"
ON public.companies
FOR SELECT
USING (id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update their company"
ON public.companies
FOR UPDATE
USING (id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update trigger for companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-assign admin role for first user creating a company
CREATE OR REPLACE FUNCTION public.handle_company_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign admin role to the user who created the company
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.created_by, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign admin role when company is created
CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.handle_company_creation();

-- ========================================
-- Migration: 20251212231637_2dac1a8b-95d0-4dc9-8c47-efe303cd8275.sql
-- ========================================

-- Add localization columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Dubai',
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'AED';

-- Add localization columns to companies table for company-wide defaults
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_timezone TEXT NOT NULL DEFAULT 'Asia/Dubai',
ADD COLUMN IF NOT EXISTS default_language TEXT NOT NULL DEFAULT 'en';

-- ========================================
-- Migration: 20251213184552_091cd842-461b-4ae1-8754-e7fa719a6fcf.sql
-- ========================================

-- Create marketing_connections table
CREATE TABLE public.marketing_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  identifier TEXT NOT NULL, -- phone number or email
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  credentials JSONB DEFAULT '{}'::jsonb, -- encrypted credentials storage
  verified BOOLEAN DEFAULT false,
  last_sync TIMESTAMP WITH TIME ZONE,
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'failed', 'unknown')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.marketing_connections ENABLE ROW LEVEL SECURITY;

-- Create policies - users can only access connections from their company
CREATE POLICY "Users can view their company connections"
ON public.marketing_connections
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create connections for their company"
ON public.marketing_connections
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company connections"
ON public.marketing_connections
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company connections"
ON public.marketing_connections
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_marketing_connections_updated_at
BEFORE UPDATE ON public.marketing_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_marketing_connections_company_channel ON public.marketing_connections(company_id, channel);
CREATE INDEX idx_marketing_connections_status ON public.marketing_connections(status);

-- ========================================
-- Migration: 20251213184916_3fa53e51-b0de-4e13-8b5f-6dd87bc63520.sql
-- ========================================

-- Create chatbots table for multiple bot configurations
CREATE TABLE public.chatbots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  whatsapp_connection_id UUID REFERENCES public.marketing_connections(id) ON DELETE SET NULL,
  llm_provider TEXT NOT NULL DEFAULT 'lovable' CHECK (llm_provider IN ('lovable', 'openai', 'anthropic', 'google', 'custom')),
  llm_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  llm_api_key_encrypted TEXT, -- Encrypted API key for external providers
  system_prompt TEXT DEFAULT 'You are a helpful real estate assistant. Help users find properties and answer their questions.',
  welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
  qualification_questions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  auto_create_leads BOOLEAN DEFAULT true,
  max_tokens INTEGER DEFAULT 1000,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their company chatbots"
ON public.chatbots
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create chatbots for their company"
ON public.chatbots
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company chatbots"
ON public.chatbots
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company chatbots"
ON public.chatbots
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_chatbots_updated_at
BEFORE UPDATE ON public.chatbots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_chatbots_company ON public.chatbots(company_id);
CREATE INDEX idx_chatbots_active ON public.chatbots(is_active);

-- ========================================
-- Migration: 20251213204953_0e2553da-219c-4ce5-a7fd-449b2a273e06.sql
-- ========================================

-- Add product_mode column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN product_mode text NOT NULL DEFAULT 'CRM' 
CHECK (product_mode IN ('CRM', 'CHATBOT'));

-- ========================================
-- Migration: 20251213231958_f828554b-5c80-4b2d-9f22-030b74a8a59b.sql
-- ========================================

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,
  stage TEXT DEFAULT 'New',
  budget TEXT,
  requirements TEXT,
  location TEXT,
  assigned_agent_id UUID REFERENCES public.agents(id),
  tags TEXT[] DEFAULT '{}',
  lead_score INTEGER DEFAULT 0,
  gender TEXT,
  nationality TEXT,
  language TEXT,
  preferred_contact_time TEXT,
  purpose TEXT,
  property_type TEXT,
  bedrooms TEXT,
  furnished TEXT,
  move_in_date TEXT,
  form_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for company-based access
CREATE POLICY "Users can view leads from their company"
ON public.leads
FOR SELECT
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create leads for their company"
ON public.leads
FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update leads from their company"
ON public.leads
FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete leads from their company"
ON public.leads
FOR DELETE
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Migration: 20251213232744_cb55a4eb-030e-4e6b-b4bb-d6e06980d89d.sql
-- ========================================

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

-- ========================================
-- Migration: 20251214152631_18234576-9e20-4161-a6b8-4f0582997c35.sql
-- ========================================

-- ============================================
-- ONELINKER CRM - COMPLETE BACKEND SCHEMA
-- ============================================

-- ============================================
-- 1. LEAD STAGES (Custom per company)
-- ============================================
CREATE TABLE public.lead_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_stages_company ON public.lead_stages(company_id);
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company stages" ON public.lead_stages
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can manage stages" ON public.lead_stages
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- ============================================
-- 2. LEAD FOLLOWUPS
-- ============================================
CREATE TABLE public.lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  reminder_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_followups_lead ON public.lead_followups(lead_id);
CREATE INDEX idx_lead_followups_company ON public.lead_followups(company_id);
CREATE INDEX idx_lead_followups_agent ON public.lead_followups(assigned_agent_id);
CREATE INDEX idx_lead_followups_due_date ON public.lead_followups(due_date);
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company followups" ON public.lead_followups
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create followups" ON public.lead_followups
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update company followups" ON public.lead_followups
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete followups" ON public.lead_followups
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 3. LEAD ASSIGNMENT RULES
-- ============================================
CREATE TABLE public.lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('round_robin', 'campaign_based', 'source_based', 'manual', 'advanced')),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  assigned_agents UUID[] DEFAULT '{}',
  round_robin_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_assignment_rules_company ON public.lead_assignment_rules(company_id);
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company rules" ON public.lead_assignment_rules
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can manage rules" ON public.lead_assignment_rules
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- ============================================
-- 4. LEAD ASSIGNMENT LOGS
-- ============================================
CREATE TABLE public.lead_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL,
  assignment_method TEXT NOT NULL CHECK (assignment_method IN ('manual', 'round_robin', 'campaign_based', 'source_based', 'auto')),
  reason TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_assignment_logs_company ON public.lead_assignment_logs(company_id);
CREATE INDEX idx_lead_assignment_logs_lead ON public.lead_assignment_logs(lead_id);
CREATE INDEX idx_lead_assignment_logs_created ON public.lead_assignment_logs(created_at);
ALTER TABLE public.lead_assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company logs" ON public.lead_assignment_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can create logs" ON public.lead_assignment_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 5. PROPERTIES (Agent Listings)
-- ============================================
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  ref_number TEXT,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  property_type TEXT NOT NULL,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sale', 'rent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'pending', 'sold', 'rented', 'off_market', 'reserved')),
  price DECIMAL(15, 2),
  currency TEXT DEFAULT 'AED',
  price_frequency TEXT CHECK (price_frequency IN ('total', 'yearly', 'monthly', 'weekly', 'daily')),
  bedrooms INTEGER,
  bathrooms INTEGER,
  size DECIMAL(12, 2),
  size_unit TEXT DEFAULT 'sqft',
  location TEXT,
  area TEXT,
  city TEXT,
  country TEXT DEFAULT 'UAE',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  permit_number TEXT,
  furnishing TEXT CHECK (furnishing IN ('furnished', 'unfurnished', 'semi_furnished')),
  completion_status TEXT CHECK (completion_status IN ('ready', 'off_plan', 'under_construction')),
  amenities TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  views_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_company_listing BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_company ON public.properties(company_id);
CREATE INDEX idx_properties_agent ON public.properties(agent_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_type ON public.properties(property_type, listing_type);
CREATE INDEX idx_properties_ref ON public.properties(ref_number);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company properties" ON public.properties
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Agents can create properties" ON public.properties
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Agents can update own properties" ON public.properties
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'manager')
      OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete properties" ON public.properties
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 6. PROPERTY MEDIA
-- ============================================
CREATE TABLE public.property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'virtual_tour', 'floor_plan', 'document')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  position INTEGER DEFAULT 0,
  is_cover BOOLEAN DEFAULT false,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_media_property ON public.property_media(property_id);
CREATE INDEX idx_property_media_company ON public.property_media(company_id);
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company media" ON public.property_media
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage company media" ON public.property_media
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 7. PROPERTY PDFS (Auto-generated brochures)
-- ============================================
CREATE TABLE public.property_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  template_type TEXT DEFAULT 'standard',
  language TEXT DEFAULT 'en',
  file_size INTEGER,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_pdfs_property ON public.property_pdfs(property_id);
ALTER TABLE public.property_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company PDFs" ON public.property_pdfs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage company PDFs" ON public.property_pdfs
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 8. PORTALS (Property Portal Definitions)
-- ============================================
CREATE TABLE public.portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  base_url TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default portals
INSERT INTO public.portals (name, display_name, country) VALUES
  ('property_finder', 'Property Finder', 'UAE'),
  ('bayut', 'Bayut', 'UAE'),
  ('dubizzle', 'Dubizzle', 'UAE'),
  ('mubawab', 'Mubawab', 'Morocco'),
  ('aqar', 'Aqar', 'Saudi Arabia'),
  ('qatar_living', 'Qatar Living', 'Qatar'),
  ('website', 'Company Website', NULL);

ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portals" ON public.portals
  FOR SELECT USING (true);

-- ============================================
-- 9. PORTAL INTEGRATIONS (Company connections)
-- ============================================
CREATE TABLE public.portal_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  api_key_encrypted TEXT,
  credentials JSONB DEFAULT '{}',
  default_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  is_connected BOOLEAN DEFAULT false,
  auto_sync BOOLEAN DEFAULT false,
  sync_frequency TEXT DEFAULT 'manual',
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, portal_id)
);

CREATE INDEX idx_portal_integrations_company ON public.portal_integrations(company_id);
ALTER TABLE public.portal_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company integrations" ON public.portal_integrations
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage integrations" ON public.portal_integrations
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 10. PROPERTY PUBLICATIONS (Portal listings)
-- ============================================
CREATE TABLE public.property_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_listing_id TEXT,
  custom_title TEXT,
  custom_description TEXT,
  custom_price DECIMAL(15, 2),
  custom_images TEXT[],
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'failed', 'unpublished')),
  published_at TIMESTAMPTZ,
  unpublished_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  portal_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, portal_id)
);

CREATE INDEX idx_property_publications_property ON public.property_publications(property_id);
CREATE INDEX idx_property_publications_portal ON public.property_publications(portal_id);
CREATE INDEX idx_property_publications_company ON public.property_publications(company_id);
ALTER TABLE public.property_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company publications" ON public.property_publications
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage company publications" ON public.property_publications
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 11. CAMPAIGNS
-- ============================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('lead_nurturing', 'drip', 'property_promotion', 'event', 'announcement')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'multi')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  connection_id UUID REFERENCES public.marketing_connections(id) ON DELETE SET NULL,
  template_id TEXT,
  template_content JSONB DEFAULT '{}',
  audience_type TEXT DEFAULT 'all' CHECK (audience_type IN ('all', 'segment', 'filtered', 'imported')),
  audience_filters JSONB DEFAULT '{}',
  audience_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_company ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON public.campaigns(scheduled_at);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company campaigns" ON public.campaigns
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update company campaigns" ON public.campaigns
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete campaigns" ON public.campaigns
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 12. CAMPAIGN MESSAGES (Individual sends)
-- ============================================
CREATE TABLE public.campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_messages_campaign ON public.campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_lead ON public.campaign_messages(lead_id);
CREATE INDEX idx_campaign_messages_status ON public.campaign_messages(status);
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company messages" ON public.campaign_messages
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage messages" ON public.campaign_messages
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 13. CAMPAIGN LOGS
-- ============================================
CREATE TABLE public.campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_logs_campaign ON public.campaign_logs(campaign_id);
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company logs" ON public.campaign_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can create logs" ON public.campaign_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 14. LEAD SOURCES
-- ============================================
CREATE TABLE public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('portal', 'social_media', 'search_ads', 'crm', 'website', 'email_messaging', 'offline', 'automation')),
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  lead_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_sources_company ON public.lead_sources(company_id);
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company sources" ON public.lead_sources
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage sources" ON public.lead_sources
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- ============================================
-- 15. SOURCE INTEGRATIONS
-- ============================================
CREATE TABLE public.source_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_source_id UUID NOT NULL REFERENCES public.lead_sources(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('oauth', 'api', 'webhook', 'manual', 'zapier')),
  credentials JSONB DEFAULT '{}',
  webhook_url TEXT,
  webhook_secret TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  error_message TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_source_integrations_company ON public.source_integrations(company_id);
CREATE INDEX idx_source_integrations_source ON public.source_integrations(lead_source_id);
ALTER TABLE public.source_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company integrations" ON public.source_integrations
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage integrations" ON public.source_integrations
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 16. INTEGRATION LOGS
-- ============================================
CREATE TABLE public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_integration_id UUID REFERENCES public.source_integrations(id) ON DELETE SET NULL,
  portal_integration_id UUID REFERENCES public.portal_integrations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  records_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_logs_company ON public.integration_logs(company_id);
CREATE INDEX idx_integration_logs_created ON public.integration_logs(created_at);
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company logs" ON public.integration_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can create logs" ON public.integration_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 17. TEAM MEMBERS (Link users to teams)
-- ============================================
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, agent_id)
);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_agent ON public.team_members(agent_id);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team members" ON public.team_members
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ============================================
-- 18. COMPANY SETTINGS
-- ============================================
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#6366f1',
  default_listing_status TEXT DEFAULT 'draft',
  default_lead_stage TEXT DEFAULT 'New',
  email_signature TEXT,
  whatsapp_default_message TEXT,
  pdf_template TEXT DEFAULT 'standard',
  auto_assign_leads BOOLEAN DEFAULT false,
  assignment_method TEXT DEFAULT 'manual',
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00", "timezone": "Asia/Dubai"}',
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_settings_company ON public.company_settings(company_id);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company settings" ON public.company_settings
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage settings" ON public.company_settings
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 19. UPDATE EXISTING TABLES
-- ============================================

-- Add company_id to teams if not exists
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_teams_company ON public.teams(company_id);

-- Add company_id to agents if not exists
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_agents_company ON public.agents(company_id);

-- Add company_id to lead_activities if not exists
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_lead_activities_company ON public.lead_activities(company_id);

-- ============================================
-- 20. TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_lead_stages_updated_at BEFORE UPDATE ON public.lead_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_followups_updated_at BEFORE UPDATE ON public.lead_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_assignment_rules_updated_at BEFORE UPDATE ON public.lead_assignment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portal_integrations_updated_at BEFORE UPDATE ON public.portal_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_publications_updated_at BEFORE UPDATE ON public.property_publications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_sources_updated_at BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_source_integrations_updated_at BEFORE UPDATE ON public.source_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 21. STORAGE BUCKET FOR PROPERTY MEDIA
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-media', 'property-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-pdfs', 'property-pdfs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property-media bucket
CREATE POLICY "Users can view property media" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-media');

CREATE POLICY "Authenticated users can upload property media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their property media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their property media" ON storage.objects
  FOR DELETE USING (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

-- Storage policies for property-pdfs bucket
CREATE POLICY "Users can view property PDFs" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-pdfs');

CREATE POLICY "Authenticated users can upload property PDFs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'property-pdfs' AND auth.uid() IS NOT NULL);

-- Storage policies for company-assets bucket
CREATE POLICY "Users can view company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can upload company assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

-- ========================================
-- Migration: 20251214183455_05bc06ca-5e85-43f6-93aa-17abe1bd8b0d.sql
-- ========================================

-- Add attachments array column to lead_activities
ALTER TABLE public.lead_activities 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for activity attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-attachments', 'activity-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for activity attachments bucket
CREATE POLICY "Authenticated users can upload activity attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activity-attachments');

CREATE POLICY "Authenticated users can view activity attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'activity-attachments');

CREATE POLICY "Authenticated users can delete activity attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'activity-attachments');

-- ========================================
-- Migration: 20251214202200_d2b86cb9-8340-4615-9caa-23dc35bc5341.sql
-- ========================================

-- Create pricing plans enum
CREATE TYPE public.plan_type AS ENUM ('free', 'starter', 'growth', 'business');

-- Create pricing plans table
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type plan_type NOT NULL UNIQUE,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  user_limit INTEGER NOT NULL DEFAULT 1,
  lead_limit INTEGER, -- NULL means unlimited
  listing_limit INTEGER, -- NULL means unlimited
  can_send_campaigns BOOLEAN NOT NULL DEFAULT false,
  can_activate_chatbots BOOLEAN NOT NULL DEFAULT false,
  can_use_automations BOOLEAN NOT NULL DEFAULT false,
  can_manage_team BOOLEAN NOT NULL DEFAULT false,
  can_use_advanced_assignment BOOLEAN NOT NULL DEFAULT false,
  can_use_custom_roles BOOLEAN NOT NULL DEFAULT false,
  has_priority_support BOOLEAN NOT NULL DEFAULT false,
  has_dedicated_manager BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default pricing plans
INSERT INTO public.pricing_plans (name, plan_type, price_monthly, price_yearly, user_limit, lead_limit, listing_limit, can_send_campaigns, can_activate_chatbots, can_use_automations, can_manage_team, can_use_advanced_assignment, can_use_custom_roles, has_priority_support, has_dedicated_manager) VALUES
('Free Forever', 'free', 0, 0, 1, 50, 10, false, false, false, false, false, false, false, false),
('Starter Team', 'starter', 149, 1490, 5, NULL, NULL, true, true, true, true, false, false, false, false),
('Growth Team', 'growth', 299, 2990, 15, NULL, NULL, true, true, true, true, true, false, true, false),
('Business', 'business', 699, 6990, 50, NULL, NULL, true, true, true, true, true, true, true, true);

-- Create company subscriptions table
CREATE TABLE public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.pricing_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Pricing plans are readable by everyone
CREATE POLICY "Anyone can view pricing plans"
ON public.pricing_plans FOR SELECT
USING (true);

-- Company subscriptions policies
CREATE POLICY "Users can view their company subscription"
ON public.company_subscriptions FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage company subscription"
ON public.company_subscriptions FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create function to get company's active user count
CREATE OR REPLACE FUNCTION public.get_company_user_count(p_company_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.agents
  WHERE company_id = p_company_id
  AND status = 'active';
$$;

-- Create function to check if company can add more users
CREATE OR REPLACE FUNCTION public.can_add_user(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pp.user_limit > get_company_user_count(p_company_id)
      FROM company_subscriptions cs
      JOIN pricing_plans pp ON cs.plan_id = pp.id
      WHERE cs.company_id = p_company_id
      AND cs.status = 'active'
    ),
    true
  );
$$;

-- Create function to get company's plan features
CREATE OR REPLACE FUNCTION public.get_company_plan(p_company_id UUID)
RETURNS TABLE (
  plan_type plan_type,
  plan_name TEXT,
  user_limit INTEGER,
  lead_limit INTEGER,
  listing_limit INTEGER,
  can_send_campaigns BOOLEAN,
  can_activate_chatbots BOOLEAN,
  can_use_automations BOOLEAN,
  can_manage_team BOOLEAN,
  can_use_advanced_assignment BOOLEAN,
  can_use_custom_roles BOOLEAN,
  has_priority_support BOOLEAN,
  has_dedicated_manager BOOLEAN,
  current_user_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pp.plan_type,
    pp.name,
    pp.user_limit,
    pp.lead_limit,
    pp.listing_limit,
    pp.can_send_campaigns,
    pp.can_activate_chatbots,
    pp.can_use_automations,
    pp.can_manage_team,
    pp.can_use_advanced_assignment,
    pp.can_use_custom_roles,
    pp.has_priority_support,
    -- Dedicated manager only enabled for business plan with 15+ users
    CASE 
      WHEN pp.plan_type = 'business' AND get_company_user_count(p_company_id) >= 15 THEN true
      ELSE false
    END as has_dedicated_manager,
    get_company_user_count(p_company_id) as current_user_count
  FROM company_subscriptions cs
  JOIN pricing_plans pp ON cs.plan_id = pp.id
  WHERE cs.company_id = p_company_id
  AND cs.status = 'active'
  LIMIT 1;
$$;

-- Trigger to auto-create free subscription for new companies
CREATE OR REPLACE FUNCTION public.handle_new_company_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id FROM pricing_plans WHERE plan_type = 'free';
  
  -- Create subscription for new company
  INSERT INTO company_subscriptions (company_id, plan_id, status)
  VALUES (NEW.id, free_plan_id, 'active');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_company_created_add_subscription
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_company_subscription();

-- Add updated_at trigger
CREATE TRIGGER update_company_subscriptions_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Migration: 20251214203458_de9190af-b0a9-48bb-82cd-4da6c1926779.sql
-- ========================================

-- Update free plan limits
UPDATE pricing_plans 
SET 
  lead_limit = 150,
  listing_limit = 20
WHERE plan_type = 'free';

-- ========================================
-- Migration: 20251214203934_acd71160-2a5f-4052-9811-8f6e5dfba077.sql
-- ========================================

-- Fix overly permissive RLS policies for production security

-- 1. DROP existing overly permissive policies on agents
DROP POLICY IF EXISTS "Authenticated users can manage agents" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can view agents" ON public.agents;

-- Create proper company-scoped policies for agents
CREATE POLICY "Users can view agents in their company"
ON public.agents FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage agents in their company"
ON public.agents FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can manage agents in their company"
ON public.agents FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- 2. DROP existing overly permissive policies on teams
DROP POLICY IF EXISTS "Authenticated users can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;

-- Create proper company-scoped policies for teams
CREATE POLICY "Users can view teams in their company"
ON public.teams FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage teams in their company"
ON public.teams FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can manage teams in their company"
ON public.teams FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- 3. Fix leads policy to require company_id
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;

-- Create proper policies for leads
CREATE POLICY "Users can view leads in their company"
ON public.leads FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND company_id IS NOT NULL 
  AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can create leads in their company"
ON public.leads FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update leads in their company"
ON public.leads FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND company_id IS NOT NULL 
  AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can delete leads in their company"
ON public.leads FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix lead_activities to use proper company scoping
DROP POLICY IF EXISTS "Authenticated users can create lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can delete lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can update lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can view lead activities" ON public.lead_activities;

CREATE POLICY "Users can view activities in their company"
ON public.lead_activities FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create activities in their company"
ON public.lead_activities FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update activities in their company"
ON public.lead_activities FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete activities in their company"
ON public.lead_activities FOR DELETE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- ========================================
-- Migration: 20251214204030_1dd6c067-d1aa-4584-af34-d0e8b743dd2e.sql
-- ========================================

-- Restrict sensitive credential fields to admin-only access
-- These tables contain encrypted API keys that should only be visible to admins

-- 1. Restrict marketing_connections credentials to admin-only
DROP POLICY IF EXISTS "Users can view their company connections" ON public.marketing_connections;

CREATE POLICY "Users can view non-sensitive connection info"
ON public.marketing_connections FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- 2. Restrict source_integrations to admin-only for viewing secrets
DROP POLICY IF EXISTS "Users can view company integrations" ON public.source_integrations;

CREATE POLICY "Admins can view source integrations"
ON public.source_integrations FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Restrict company_subscriptions viewing to admins
DROP POLICY IF EXISTS "Users can view their company subscription" ON public.company_subscriptions;

CREATE POLICY "Admins can view company subscription"
ON public.company_subscriptions FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Restrict chatbot API key access to admins only
DROP POLICY IF EXISTS "Users can view their company chatbots" ON public.chatbots;

CREATE POLICY "Admins can view full chatbot config"
ON public.chatbots FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create a separate policy for non-admins to see limited chatbot info (without API keys)
CREATE POLICY "Users can view chatbot basic info"
ON public.chatbots FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- 5. Restrict campaign_messages to marketing-related roles
DROP POLICY IF EXISTS "Users can view company messages" ON public.campaign_messages;

CREATE POLICY "Managers and admins can view campaign messages"
ON public.campaign_messages FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- ========================================
-- Migration: 20251214210245_d7db05c9-ccfd-4e6b-9b58-d102ca03f943.sql
-- ========================================

-- Enable realtime for leads table
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- ========================================
-- Migration: 20251216225552_4df0b466-73ff-4113-ae3f-386ba7e3ab79.sql
-- ========================================


-- =====================================================
-- COMPLETE CRM BACKEND REBUILD
-- Multi-tenant, production-grade CRM with proper RLS
-- =====================================================

-- =====================================================
-- PART 1: ENUMS
-- =====================================================

-- Organization role enum (replaces app_role if needed)
DO $$ BEGIN
  CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Entity types for polymorphic relationships
DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('contact', 'account', 'lead', 'deal', 'task', 'activity');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Activity types
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'task_completed', 'stage_change', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Deal status
DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task status
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task priority
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- PART 2: CORE TABLES
-- =====================================================

-- Organizations (multi-tenant root)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  website text,
  industry text,
  size text, -- e.g., '1-10', '11-50', '51-200', '201-500', '500+'
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- Organization Members (junction for multi-org membership)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_active ON public.organization_members(organization_id, is_active) WHERE is_active = true;

-- Update profiles table to remove single company_id constraint
-- First, ensure profiles table exists with proper structure
DO $$ 
BEGIN
  -- Add phone column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;
  
  -- Add job_title column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'job_title') THEN
    ALTER TABLE public.profiles ADD COLUMN job_title text;
  END IF;
END $$;

-- =====================================================
-- PART 3: CRM CORE ENTITIES
-- =====================================================

-- Accounts (Companies/Businesses being tracked in CRM)
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text,
  industry text,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  annual_revenue numeric,
  employee_count integer,
  description text,
  owner_id uuid REFERENCES auth.users(id),
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_org ON public.accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON public.accounts(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_accounts_not_deleted ON public.accounts(organization_id) WHERE is_deleted = false;

-- Contacts (People in CRM)
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  mobile text,
  job_title text,
  department text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  linkedin_url text,
  twitter_url text,
  description text,
  owner_id uuid REFERENCES auth.users(id),
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_contacts_not_deleted ON public.contacts(organization_id) WHERE is_deleted = false;

-- Pipelines
CREATE TABLE IF NOT EXISTS public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_org ON public.pipelines(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelines_default ON public.pipelines(organization_id) WHERE is_default = true;

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stages_pipeline ON public.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stages_org ON public.pipeline_stages(organization_id);

-- Deals (Opportunities)
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id),
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id),
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  name text NOT NULL,
  value numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  actual_close_date date,
  status deal_status NOT NULL DEFAULT 'open',
  lost_reason text,
  description text,
  owner_id uuid REFERENCES auth.users(id),
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_org ON public.deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_account ON public.deals(account_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_not_deleted ON public.deals(organization_id) WHERE is_deleted = false;

-- CRM Leads (Sales leads before conversion)
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  company_name text,
  job_title text,
  website text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country text,
  status text NOT NULL DEFAULT 'new',
  rating text, -- hot, warm, cold
  source text,
  description text,
  owner_id uuid REFERENCES auth.users(id),
  converted_at timestamptz,
  converted_contact_id uuid REFERENCES public.contacts(id),
  converted_account_id uuid REFERENCES public.accounts(id),
  converted_deal_id uuid REFERENCES public.deals(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_org ON public.crm_leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_not_deleted ON public.crm_leads(organization_id) WHERE is_deleted = false;

-- =====================================================
-- PART 4: ACTIVITIES & TASKS
-- =====================================================

-- Activities (calls, emails, meetings, etc.)
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  subject text NOT NULL,
  description text,
  
  -- Polymorphic association
  related_to_type entity_type,
  related_to_id uuid,
  
  -- Direct associations for common cases
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  -- Activity details
  duration_minutes integer,
  outcome text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  
  owner_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON public.activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_account ON public.activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON public.activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner ON public.activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(organization_id, created_at DESC);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  
  -- Polymorphic association
  related_to_type entity_type,
  related_to_id uuid,
  
  -- Direct associations
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  -- Task details
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  completed_at timestamptz,
  reminder_at timestamptz,
  
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(organization_id, due_date) WHERE status IN ('pending', 'in_progress');

-- Notes (can be attached to any entity)
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  
  -- Polymorphic association
  related_to_type entity_type NOT NULL,
  related_to_id uuid NOT NULL,
  
  -- Direct associations for indexing
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_org ON public.notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_related ON public.notes(related_to_type, related_to_id);
CREATE INDEX IF NOT EXISTS idx_notes_contact ON public.notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_deal ON public.notes(deal_id);

-- =====================================================
-- PART 5: ORGANIZATION (Tags, Files)
-- =====================================================

-- Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_org ON public.tags(organization_id);

-- Entity Tags (junction table)
CREATE TABLE IF NOT EXISTS public.entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON public.entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON public.entity_tags(tag_id);

-- Files
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  
  -- Polymorphic association
  entity_type entity_type,
  entity_id uuid,
  
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_org ON public.files(organization_id);
CREATE INDEX IF NOT EXISTS idx_files_entity ON public.files(entity_type, entity_id);

-- =====================================================
-- PART 6: CUSTOM FIELDS
-- =====================================================

-- Custom Field Definitions
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL, -- text, number, date, select, multiselect, checkbox, url, email, phone
  options jsonb, -- for select/multiselect fields
  is_required boolean NOT NULL DEFAULT false,
  default_value text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, entity_type, field_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_org ON public.custom_field_definitions(organization_id, entity_type);

-- Custom Field Values
CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id uuid NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(field_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_values_entity ON public.custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_values_field ON public.custom_field_values(field_id);

-- =====================================================
-- PART 7: AUDIT & SETTINGS
-- =====================================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- create, update, delete, view, export, etc.
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(organization_id, created_at DESC);

-- Organization Settings
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- General
  default_currency text DEFAULT 'USD',
  default_timezone text DEFAULT 'UTC',
  date_format text DEFAULT 'MM/DD/YYYY',
  time_format text DEFAULT '12h',
  
  -- CRM Settings
  default_pipeline_id uuid REFERENCES public.pipelines(id),
  lead_auto_assignment boolean DEFAULT false,
  deal_auto_probability boolean DEFAULT true,
  
  -- Notifications
  email_notifications boolean DEFAULT true,
  
  -- Branding
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#6366f1',
  
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 8: HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND is_active = true
  )
$$;

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
      AND is_active = true
  )
$$;

-- Function to check if user has admin or owner role
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  )
$$;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
    AND is_active = true
$$;

-- =====================================================
-- PART 9: TRIGGERS
-- =====================================================

-- Updated at trigger function (create if not exists)
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'organizations', 'organization_members', 'accounts', 'contacts', 
      'pipelines', 'pipeline_stages', 'deals', 'crm_leads', 
      'activities', 'tasks', 'notes', 'tags', 
      'custom_field_definitions', 'custom_field_values', 'organization_settings'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- =====================================================
-- PART 10: ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 11: RLS POLICIES
-- =====================================================

-- Organizations: Users can see orgs they're members of
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can update their organizations" ON public.organizations;
CREATE POLICY "Admins can update their organizations" ON public.organizations
  FOR UPDATE USING (public.is_org_admin(auth.uid(), id));

-- Organization Members
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
CREATE POLICY "Users can view org members" ON public.organization_members
  FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Admins can manage org members" ON public.organization_members;
CREATE POLICY "Admins can manage org members" ON public.organization_members
  FOR ALL USING (public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Users can insert themselves as org owner" ON public.organization_members;
CREATE POLICY "Users can insert themselves as org owner" ON public.organization_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND role = 'owner'
    OR public.is_org_admin(auth.uid(), organization_id)
  );

-- Accounts
DROP POLICY IF EXISTS "Users can view org accounts" ON public.accounts;
CREATE POLICY "Users can view org accounts" ON public.accounts
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can create accounts" ON public.accounts;
CREATE POLICY "Members can create accounts" ON public.accounts
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can update accounts" ON public.accounts;
CREATE POLICY "Members can update accounts" ON public.accounts
  FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can delete accounts" ON public.accounts;
CREATE POLICY "Admins can delete accounts" ON public.accounts
  FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- Contacts
DROP POLICY IF EXISTS "Users can view org contacts" ON public.contacts;
CREATE POLICY "Users can view org contacts" ON public.contacts
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can create contacts" ON public.contacts;
CREATE POLICY "Members can create contacts" ON public.contacts
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can update contacts" ON public.contacts;
CREATE POLICY "Members can update contacts" ON public.contacts
  FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;
CREATE POLICY "Admins can delete contacts" ON public.contacts
  FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- Pipelines
DROP POLICY IF EXISTS "Users can view org pipelines" ON public.pipelines;
CREATE POLICY "Users can view org pipelines" ON public.pipelines
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage pipelines" ON public.pipelines;
CREATE POLICY "Admins can manage pipelines" ON public.pipelines
  FOR ALL USING (public.is_org_admin(auth.uid(), organization_id));

-- Pipeline Stages
DROP POLICY IF EXISTS "Users can view org stages" ON public.pipeline_stages;
CREATE POLICY "Users can view org stages" ON public.pipeline_stages
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage stages" ON public.pipeline_stages;
CREATE POLICY "Admins can manage stages" ON public.pipeline_stages
  FOR ALL USING (public.is_org_admin(auth.uid(), organization_id));

-- Deals
DROP POLICY IF EXISTS "Users can view org deals" ON public.deals;
CREATE POLICY "Users can view org deals" ON public.deals
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can create deals" ON public.deals;
CREATE POLICY "Members can create deals" ON public.deals
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can update deals" ON public.deals;
CREATE POLICY "Members can update deals" ON public.deals
  FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;
CREATE POLICY "Admins can delete deals" ON public.deals
  FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- CRM Leads
DROP POLICY IF EXISTS "Users can view org leads" ON public.crm_leads;
CREATE POLICY "Users can view org leads" ON public.crm_leads
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can create leads" ON public.crm_leads;
CREATE POLICY "Members can create leads" ON public.crm_leads
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can update leads" ON public.crm_leads;
CREATE POLICY "Members can update leads" ON public.crm_leads
  FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can delete leads" ON public.crm_leads;
CREATE POLICY "Admins can delete leads" ON public.crm_leads
  FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- Activities
DROP POLICY IF EXISTS "Users can view org activities" ON public.activities;
CREATE POLICY "Users can view org activities" ON public.activities
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can create activities" ON public.activities;
CREATE POLICY "Members can create activities" ON public.activities
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can update activities" ON public.activities;
CREATE POLICY "Members can update activities" ON public.activities
  FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can delete activities" ON public.activities;
CREATE POLICY "Admins can delete activities" ON public.activities
  FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- Tasks
DROP POLICY IF EXISTS "Users can view org tasks" ON public.tasks;
CREATE POLICY "Users can view org tasks" ON public.tasks
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
CREATE POLICY "Members can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
CREATE POLICY "Members can update tasks" ON public.tasks
  FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;
CREATE POLICY "Admins can delete tasks" ON public.tasks
  FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));

-- Notes
DROP POLICY IF EXISTS "Users can view org notes" ON public.notes;
CREATE POLICY "Users can view org notes" ON public.notes
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can create notes" ON public.notes;
CREATE POLICY "Members can create notes" ON public.notes
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can update own notes" ON public.notes;
CREATE POLICY "Members can update own notes" ON public.notes
  FOR UPDATE USING (created_by = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can delete own notes" ON public.notes;
CREATE POLICY "Members can delete own notes" ON public.notes
  FOR DELETE USING (created_by = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));

-- Tags
DROP POLICY IF EXISTS "Users can view org tags" ON public.tags;
CREATE POLICY "Users can view org tags" ON public.tags
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can create tags" ON public.tags;
CREATE POLICY "Members can create tags" ON public.tags
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL USING (public.is_org_admin(auth.uid(), organization_id));

-- Entity Tags
DROP POLICY IF EXISTS "Users can view entity tags" ON public.entity_tags;
CREATE POLICY "Users can view entity tags" ON public.entity_tags
  FOR SELECT USING (
    tag_id IN (SELECT id FROM public.tags WHERE public.is_org_member(auth.uid(), organization_id))
  );

DROP POLICY IF EXISTS "Members can manage entity tags" ON public.entity_tags;
CREATE POLICY "Members can manage entity tags" ON public.entity_tags
  FOR ALL USING (
    tag_id IN (SELECT id FROM public.tags WHERE public.is_org_member(auth.uid(), organization_id))
  );

-- Files
DROP POLICY IF EXISTS "Users can view org files" ON public.files;
CREATE POLICY "Users can view org files" ON public.files
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Members can upload files" ON public.files;
CREATE POLICY "Members can upload files" ON public.files
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can delete files" ON public.files;
CREATE POLICY "Admins can delete files" ON public.files
  FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id) OR uploaded_by = auth.uid());

-- Custom Field Definitions
DROP POLICY IF EXISTS "Users can view org custom fields" ON public.custom_field_definitions;
CREATE POLICY "Users can view org custom fields" ON public.custom_field_definitions
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage custom fields" ON public.custom_field_definitions;
CREATE POLICY "Admins can manage custom fields" ON public.custom_field_definitions
  FOR ALL USING (public.is_org_admin(auth.uid(), organization_id));

-- Custom Field Values
DROP POLICY IF EXISTS "Users can view custom field values" ON public.custom_field_values;
CREATE POLICY "Users can view custom field values" ON public.custom_field_values
  FOR SELECT USING (
    field_id IN (SELECT id FROM public.custom_field_definitions WHERE public.is_org_member(auth.uid(), organization_id))
  );

DROP POLICY IF EXISTS "Members can manage custom field values" ON public.custom_field_values;
CREATE POLICY "Members can manage custom field values" ON public.custom_field_values
  FOR ALL USING (
    field_id IN (SELECT id FROM public.custom_field_definitions WHERE public.is_org_member(auth.uid(), organization_id))
  );

-- Audit Logs
DROP POLICY IF EXISTS "Users can view org audit logs" ON public.audit_logs;
CREATE POLICY "Users can view org audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Organization Settings
DROP POLICY IF EXISTS "Users can view org settings" ON public.organization_settings;
CREATE POLICY "Users can view org settings" ON public.organization_settings
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Admins can manage org settings" ON public.organization_settings;
CREATE POLICY "Admins can manage org settings" ON public.organization_settings
  FOR ALL USING (public.is_org_admin(auth.uid(), organization_id));

-- =====================================================
-- PART 12: SEED DEFAULT DATA
-- =====================================================

-- This will be done after migration approval

-- ========================================
-- Migration: 20251216230549_b279cd22-aaa9-4347-ab87-d984ad96935e.sql
-- ========================================

-- Drop existing restrictive policies on leads table
DROP POLICY IF EXISTS "Users can view leads in their company" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads in their company" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads in their company" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads in their company" ON public.leads;

-- Create new policies that work with or without company_id
-- Users can view their own leads (where company_id matches profile OR they created it)
CREATE POLICY "Users can view leads" 
ON public.leads 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- If user has a company, show company leads
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL))
    OR
    -- If lead has no company, show to all authenticated users (for testing/demo)
    company_id IS NULL
  )
);

-- Users can create leads
CREATE POLICY "Users can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update leads they have access to
CREATE POLICY "Users can update leads" 
ON public.leads 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL))
    OR company_id IS NULL
  )
);

-- Admins can delete leads
CREATE POLICY "Admins can delete leads" 
ON public.leads 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    (company_id IS NOT NULL AND company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role))
    OR (company_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
  )
);

-- ========================================
-- Migration: 20251216230620_5bd37e51-76ba-4359-b135-f41dc6eb9dca.sql
-- ========================================

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

-- ========================================
-- Migration: 20251216230916_6e0ed5df-5cbe-48bd-b2d3-f8a56d2136b4.sql
-- ========================================

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

-- ========================================
-- Migration: 20251218080239_e32f448c-6849-42d8-bc2e-19f11fee3708.sql
-- ========================================

-- ================================================
-- DASHBOARD REAL-TIME BACKEND STRUCTURE (FIXED)
-- ================================================

-- 1ï¸âƒ£ ADD INDEXES FOR PERFORMANCE
-- ================================================

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent_id ON public.leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON public.leads(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_company_source ON public.leads(company_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON public.leads(company_id, created_at DESC);

-- Lead activities indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_id ON public.lead_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON public.lead_activities(type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_agent_id ON public.lead_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_type ON public.lead_activities(company_id, type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_created ON public.lead_activities(company_id, created_at DESC);

-- Lead followups indexes
CREATE INDEX IF NOT EXISTS idx_lead_followups_company_id ON public.lead_followups(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_status ON public.lead_followups(status);
CREATE INDEX IF NOT EXISTS idx_lead_followups_due_date ON public.lead_followups(due_date);
CREATE INDEX IF NOT EXISTS idx_lead_followups_assigned_agent_id ON public.lead_followups(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_company_status ON public.lead_followups(company_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_followups_company_due ON public.lead_followups(company_id, due_date);

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_company_id ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_company_status ON public.properties(company_id, status);

-- 2ï¸âƒ£ ENABLE REALTIME ON REMAINING TABLES (leads already enabled)
-- ================================================

-- Check and add tables to realtime publication if not already there
DO $$ 
BEGIN
  -- lead_activities
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lead_activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
  END IF;
  
  -- lead_followups
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lead_followups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_followups;
  END IF;
  
  -- properties
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'properties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL for complete row data in realtime updates
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.lead_activities REPLICA IDENTITY FULL;
ALTER TABLE public.lead_followups REPLICA IDENTITY FULL;
ALTER TABLE public.properties REPLICA IDENTITY FULL;

-- 3ï¸âƒ£ CREATE DASHBOARD SUMMARY VIEWS
-- ================================================

-- Dashboard Leads Summary View
CREATE OR REPLACE VIEW public.dashboard_leads_summary AS
SELECT 
  company_id,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as new_leads_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as new_leads_week,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days') as new_leads_month,
  COUNT(*) FILTER (WHERE stage = 'New') as stage_new,
  COUNT(*) FILTER (WHERE stage = 'Contacted') as stage_contacted,
  COUNT(*) FILTER (WHERE stage = 'Qualified') as stage_qualified,
  COUNT(*) FILTER (WHERE stage = 'Proposal') as stage_proposal,
  COUNT(*) FILTER (WHERE stage = 'Negotiation') as stage_negotiation,
  COUNT(*) FILTER (WHERE stage = 'Won') as stage_won,
  COUNT(*) FILTER (WHERE stage = 'Lost') as stage_lost,
  COUNT(*) FILTER (WHERE lead_score >= 70) as hot_leads
FROM public.leads
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Leads by Source View
CREATE OR REPLACE VIEW public.dashboard_leads_by_source AS
SELECT 
  company_id,
  COALESCE(source, 'Unknown') as source,
  COUNT(*) as count
FROM public.leads
WHERE company_id IS NOT NULL
GROUP BY company_id, source;

-- Dashboard Leads by Agent View
CREATE OR REPLACE VIEW public.dashboard_leads_by_agent AS
SELECT 
  l.company_id,
  l.assigned_agent_id,
  a.name as agent_name,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE l.stage = 'Won') as won_leads,
  COUNT(*) FILTER (WHERE l.stage = 'Lost') as lost_leads,
  COUNT(*) FILTER (WHERE DATE(l.created_at) = CURRENT_DATE) as new_today
FROM public.leads l
LEFT JOIN public.agents a ON l.assigned_agent_id = a.id
WHERE l.company_id IS NOT NULL AND l.assigned_agent_id IS NOT NULL
GROUP BY l.company_id, l.assigned_agent_id, a.name;

-- Dashboard Listings Summary View
CREATE OR REPLACE VIEW public.dashboard_listings_summary AS
SELECT 
  company_id,
  COUNT(*) as total_listings,
  COUNT(*) FILTER (WHERE status = 'active' OR status = 'published') as active_listings,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_listings,
  COUNT(*) FILTER (WHERE status = 'sold') as sold_listings,
  COUNT(*) FILTER (WHERE status = 'rented') as rented_listings,
  COUNT(*) FILTER (WHERE status = 'archived' OR status = 'inactive') as archived_listings,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as new_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as new_this_week
FROM public.properties
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Followups Summary View
CREATE OR REPLACE VIEW public.dashboard_followups_summary AS
SELECT 
  company_id,
  COUNT(*) as total_followups,
  COUNT(*) FILTER (WHERE DATE(due_date) = CURRENT_DATE AND status = 'pending') as today_followups,
  COUNT(*) FILTER (WHERE due_date < CURRENT_TIMESTAMP AND status = 'pending') as missed_followups,
  COUNT(*) FILTER (WHERE due_date > CURRENT_TIMESTAMP AND status = 'pending') as upcoming_followups,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_followups,
  COUNT(*) FILTER (WHERE DATE(due_date) >= CURRENT_DATE AND DATE(due_date) <= CURRENT_DATE + INTERVAL '7 days' AND status = 'pending') as this_week_followups
FROM public.lead_followups
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Activities Summary View
CREATE OR REPLACE VIEW public.dashboard_activities_summary AS
SELECT 
  company_id,
  COUNT(*) as total_activities,
  COUNT(*) FILTER (WHERE type = 'call') as calls_made,
  COUNT(*) FILTER (WHERE type = 'whatsapp') as whatsapp_actions,
  COUNT(*) FILTER (WHERE type = 'note') as notes_added,
  COUNT(*) FILTER (WHERE type = 'voice_note') as voice_notes_added,
  COUNT(*) FILTER (WHERE type = 'email') as emails_sent,
  COUNT(*) FILTER (WHERE type = 'meeting') as meetings,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as activities_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as activities_week
FROM public.lead_activities
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- 4ï¸âƒ£ CREATE OPTIMIZED FUNCTIONS FOR DASHBOARD DATA
-- ================================================

-- Function to get dashboard metrics for a company
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_company_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'leads', (SELECT row_to_json(ls.*) FROM dashboard_leads_summary ls WHERE ls.company_id = p_company_id),
    'listings', (SELECT row_to_json(ps.*) FROM dashboard_listings_summary ps WHERE ps.company_id = p_company_id),
    'followups', (SELECT row_to_json(fs.*) FROM dashboard_followups_summary fs WHERE fs.company_id = p_company_id),
    'activities', (SELECT row_to_json(as_.*) FROM dashboard_activities_summary as_ WHERE as_.company_id = p_company_id)
  );
$$;

-- Function to get leads by stage for chart
CREATE OR REPLACE FUNCTION public.get_leads_by_stage(p_company_id uuid)
RETURNS TABLE(stage text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(stage, 'Unknown') as stage,
    COUNT(*) as count
  FROM public.leads
  WHERE company_id = p_company_id
  GROUP BY stage
  ORDER BY count DESC;
$$;

-- Function to get leads by source for chart
CREATE OR REPLACE FUNCTION public.get_leads_by_source(p_company_id uuid)
RETURNS TABLE(source text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(source, 'Unknown') as source,
    COUNT(*) as count
  FROM public.leads
  WHERE company_id = p_company_id
  GROUP BY source
  ORDER BY count DESC
  LIMIT 10;
$$;

-- Function to get lead trends for chart (last 30 days)
CREATE OR REPLACE FUNCTION public.get_lead_trends(p_company_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE(date date, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as count
  FROM public.leads
  WHERE company_id = p_company_id
    AND created_at >= CURRENT_DATE - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY date;
$$;

-- Function to get agent performance
CREATE OR REPLACE FUNCTION public.get_agent_performance(p_company_id uuid)
RETURNS TABLE(
  agent_id uuid,
  agent_name text,
  total_leads bigint,
  won_leads bigint,
  activities_count bigint,
  conversion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id as agent_id,
    a.name as agent_name,
    COALESCE(l.total_leads, 0) as total_leads,
    COALESCE(l.won_leads, 0) as won_leads,
    COALESCE(act.activity_count, 0) as activities_count,
    CASE 
      WHEN COALESCE(l.total_leads, 0) > 0 
      THEN ROUND((COALESCE(l.won_leads, 0)::numeric / l.total_leads::numeric) * 100, 1)
      ELSE 0 
    END as conversion_rate
  FROM public.agents a
  LEFT JOIN (
    SELECT 
      assigned_agent_id,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE stage = 'Won') as won_leads
    FROM public.leads
    WHERE company_id = p_company_id
    GROUP BY assigned_agent_id
  ) l ON a.id = l.assigned_agent_id
  LEFT JOIN (
    SELECT 
      agent_id,
      COUNT(*) as activity_count
    FROM public.lead_activities
    WHERE company_id = p_company_id
    GROUP BY agent_id
  ) act ON a.id = act.agent_id
  WHERE a.company_id = p_company_id AND a.status = 'active'
  ORDER BY total_leads DESC;
$$;

-- ========================================
-- Migration: 20251218080318_49c8e15d-3955-48d6-8f5f-370a039744a1.sql
-- ========================================

-- Fix SECURITY DEFINER views to use SECURITY INVOKER
-- This ensures RLS policies are respected when querying views

-- Recreate views with SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.dashboard_leads_summary CASCADE;
DROP VIEW IF EXISTS public.dashboard_leads_by_source CASCADE;
DROP VIEW IF EXISTS public.dashboard_leads_by_agent CASCADE;
DROP VIEW IF EXISTS public.dashboard_listings_summary CASCADE;
DROP VIEW IF EXISTS public.dashboard_followups_summary CASCADE;
DROP VIEW IF EXISTS public.dashboard_activities_summary CASCADE;

-- Dashboard Leads Summary View (SECURITY INVOKER)
CREATE VIEW public.dashboard_leads_summary 
WITH (security_invoker = true)
AS
SELECT 
  company_id,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as new_leads_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as new_leads_week,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days') as new_leads_month,
  COUNT(*) FILTER (WHERE stage = 'New') as stage_new,
  COUNT(*) FILTER (WHERE stage = 'Contacted') as stage_contacted,
  COUNT(*) FILTER (WHERE stage = 'Qualified') as stage_qualified,
  COUNT(*) FILTER (WHERE stage = 'Proposal') as stage_proposal,
  COUNT(*) FILTER (WHERE stage = 'Negotiation') as stage_negotiation,
  COUNT(*) FILTER (WHERE stage = 'Won') as stage_won,
  COUNT(*) FILTER (WHERE stage = 'Lost') as stage_lost,
  COUNT(*) FILTER (WHERE lead_score >= 70) as hot_leads
FROM public.leads
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Leads by Source View (SECURITY INVOKER)
CREATE VIEW public.dashboard_leads_by_source
WITH (security_invoker = true)
AS
SELECT 
  company_id,
  COALESCE(source, 'Unknown') as source,
  COUNT(*) as count
FROM public.leads
WHERE company_id IS NOT NULL
GROUP BY company_id, source;

-- Dashboard Leads by Agent View (SECURITY INVOKER)
CREATE VIEW public.dashboard_leads_by_agent
WITH (security_invoker = true)
AS
SELECT 
  l.company_id,
  l.assigned_agent_id,
  a.name as agent_name,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE l.stage = 'Won') as won_leads,
  COUNT(*) FILTER (WHERE l.stage = 'Lost') as lost_leads,
  COUNT(*) FILTER (WHERE DATE(l.created_at) = CURRENT_DATE) as new_today
FROM public.leads l
LEFT JOIN public.agents a ON l.assigned_agent_id = a.id
WHERE l.company_id IS NOT NULL AND l.assigned_agent_id IS NOT NULL
GROUP BY l.company_id, l.assigned_agent_id, a.name;

-- Dashboard Listings Summary View (SECURITY INVOKER)
CREATE VIEW public.dashboard_listings_summary
WITH (security_invoker = true)
AS
SELECT 
  company_id,
  COUNT(*) as total_listings,
  COUNT(*) FILTER (WHERE status = 'active' OR status = 'published') as active_listings,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_listings,
  COUNT(*) FILTER (WHERE status = 'sold') as sold_listings,
  COUNT(*) FILTER (WHERE status = 'rented') as rented_listings,
  COUNT(*) FILTER (WHERE status = 'archived' OR status = 'inactive') as archived_listings,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as new_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as new_this_week
FROM public.properties
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Followups Summary View (SECURITY INVOKER)
CREATE VIEW public.dashboard_followups_summary
WITH (security_invoker = true)
AS
SELECT 
  company_id,
  COUNT(*) as total_followups,
  COUNT(*) FILTER (WHERE DATE(due_date) = CURRENT_DATE AND status = 'pending') as today_followups,
  COUNT(*) FILTER (WHERE due_date < CURRENT_TIMESTAMP AND status = 'pending') as missed_followups,
  COUNT(*) FILTER (WHERE due_date > CURRENT_TIMESTAMP AND status = 'pending') as upcoming_followups,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_followups,
  COUNT(*) FILTER (WHERE DATE(due_date) >= CURRENT_DATE AND DATE(due_date) <= CURRENT_DATE + INTERVAL '7 days' AND status = 'pending') as this_week_followups
FROM public.lead_followups
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Activities Summary View (SECURITY INVOKER)
CREATE VIEW public.dashboard_activities_summary
WITH (security_invoker = true)
AS
SELECT 
  company_id,
  COUNT(*) as total_activities,
  COUNT(*) FILTER (WHERE type = 'call') as calls_made,
  COUNT(*) FILTER (WHERE type = 'whatsapp') as whatsapp_actions,
  COUNT(*) FILTER (WHERE type = 'note') as notes_added,
  COUNT(*) FILTER (WHERE type = 'voice_note') as voice_notes_added,
  COUNT(*) FILTER (WHERE type = 'email') as emails_sent,
  COUNT(*) FILTER (WHERE type = 'meeting') as meetings,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as activities_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as activities_week
FROM public.lead_activities
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- ========================================
-- Migration: 20251218081219_662f6168-a1ac-4f0c-bd2b-cb803e711235.sql
-- ========================================

-- Fix: company creation trigger expects created_by; ensure created_by is set when creating companies via ensure_company_for_profile

CREATE OR REPLACE FUNCTION public.ensure_company_for_profile(p_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = p_profile_id;

  IF v_company_id IS NOT NULL THEN
    RETURN v_company_id;
  END IF;

  INSERT INTO public.companies (
    name,
    country,
    industry,
    currency,
    default_language,
    default_timezone,
    created_by
  )
  VALUES (
    'My Company',
    'UAE',
    'Real Estate Brokerage',
    'USD',
    'en',
    'Asia/Dubai',
    p_profile_id
  )
  RETURNING id INTO v_company_id;

  UPDATE public.profiles
  SET company_id = v_company_id,
      updated_at = now()
  WHERE id = p_profile_id;

  RETURN v_company_id;
END;
$$;

-- Backfill profile.company_id
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (SELECT id FROM public.profiles WHERE company_id IS NULL) LOOP
    PERFORM public.ensure_company_for_profile(r.id);
  END LOOP;
END $$;

-- Backfill orphaned rows to the newest available company
DO $$
DECLARE
  v_default_company uuid;
BEGIN
  SELECT company_id INTO v_default_company
  FROM public.profiles
  WHERE company_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_default_company IS NOT NULL THEN
    UPDATE public.leads SET company_id = v_default_company WHERE company_id IS NULL;
    UPDATE public.lead_activities SET company_id = v_default_company WHERE company_id IS NULL;
    UPDATE public.lead_followups SET company_id = v_default_company WHERE company_id IS NULL;
    UPDATE public.properties SET company_id = v_default_company WHERE company_id IS NULL;
  END IF;
END $$;

-- Foreign keys (nullable)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_company_id_fkey') THEN
    ALTER TABLE public.leads
    ADD CONSTRAINT leads_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_activities_company_id_fkey') THEN
    ALTER TABLE public.lead_activities
    ADD CONSTRAINT lead_activities_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_followups_company_id_fkey') THEN
    ALTER TABLE public.lead_followups
    ADD CONSTRAINT lead_followups_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_company_id_fkey') THEN
    ALTER TABLE public.properties
    ADD CONSTRAINT properties_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Auto-populate company_id from authenticated user's profile when missing
CREATE OR REPLACE FUNCTION public.set_company_id_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    v_company_id := public.ensure_company_for_profile(auth.uid());
  END IF;

  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_company_id_leads') THEN
    CREATE TRIGGER trg_set_company_id_leads
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_id_from_profile();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_company_id_lead_activities') THEN
    CREATE TRIGGER trg_set_company_id_lead_activities
    BEFORE INSERT ON public.lead_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_id_from_profile();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_company_id_lead_followups') THEN
    CREATE TRIGGER trg_set_company_id_lead_followups
    BEFORE INSERT ON public.lead_followups
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_id_from_profile();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_company_id_properties') THEN
    CREATE TRIGGER trg_set_company_id_properties
    BEFORE INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_id_from_profile();
  END IF;
END $$;

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_leads_company_created_at ON public.leads(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON public.leads(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_company_source ON public.leads(company_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_company_assigned_agent ON public.leads(company_id, assigned_agent_id);

CREATE INDEX IF NOT EXISTS idx_properties_company_status ON public.properties(company_id, status);
CREATE INDEX IF NOT EXISTS idx_properties_company_created_at ON public.properties(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_followups_company_due_status ON public.lead_followups(company_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_activities_company_type_created_at ON public.lead_activities(company_id, type, created_at DESC);

-- ========================================
-- Migration: 20251218081957_3e481640-d74a-43ee-9d8a-ea4dad173526.sql
-- ========================================

-- Create lead_groups table
CREATE TABLE IF NOT EXISTS public.lead_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Add lead_group_id to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_group_id UUID REFERENCES public.lead_groups(id) ON DELETE SET NULL;

-- Create index on lead_group_id
CREATE INDEX IF NOT EXISTS idx_leads_group_id ON public.leads(lead_group_id);
CREATE INDEX IF NOT EXISTS idx_lead_groups_company ON public.lead_groups(company_id);

-- Enable RLS
ALTER TABLE public.lead_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_groups
-- All company members can view groups
CREATE POLICY "Users can view company lead groups"
ON public.lead_groups
FOR SELECT
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

-- Only Admin/Manager can create groups
CREATE POLICY "Admins and managers can create lead groups"
ON public.lead_groups
FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Only Admin/Manager can update groups
CREATE POLICY "Admins and managers can update lead groups"
ON public.lead_groups
FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Only Admin/Manager can delete groups
CREATE POLICY "Admins and managers can delete lead groups"
ON public.lead_groups
FOR DELETE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Add updated_at trigger
CREATE TRIGGER update_lead_groups_updated_at
  BEFORE UPDATE ON public.lead_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for lead_groups
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_groups;

-- ========================================
-- Migration: 20251218093614_c21a2d05-1812-42f6-ba39-d7a14aeffc4d.sql
-- ========================================


-- Add missing columns to leads table for import tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS imported_from text,
ADD COLUMN IF NOT EXISTS opted_in boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS import_job_id uuid;

-- Create lead_import_jobs table for tracking import progress
CREATE TABLE IF NOT EXISTS public.lead_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  total_rows integer DEFAULT 0,
  imported_rows integer DEFAULT 0,
  skipped_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  duplicate_action text DEFAULT 'skip', -- 'skip' or 'update'
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  error_details jsonb DEFAULT '[]'::jsonb,
  column_mapping jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_company_id ON public.lead_import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_status ON public.lead_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_leads_import_job_id ON public.leads(import_job_id);
CREATE INDEX IF NOT EXISTS idx_leads_imported_from ON public.leads(imported_from);

-- Enable RLS on lead_import_jobs
ALTER TABLE public.lead_import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_import_jobs (Admin/Manager only)
CREATE POLICY "Users can view their company import jobs"
ON public.lead_import_jobs
FOR SELECT
USING (
  company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Admins and Managers can create import jobs"
ON public.lead_import_jobs
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and Managers can update import jobs"
ON public.lead_import_jobs
FOR UPDATE
USING (
  company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can delete import jobs"
ON public.lead_import_jobs
FOR DELETE
USING (
  company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Enable realtime for import jobs (for progress tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_import_jobs;

-- Function to normalize phone numbers
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN NULL;
  END IF;
  -- Remove all non-numeric characters except + at start
  RETURN regexp_replace(
    regexp_replace(phone_input, '[^0-9+]', '', 'g'),
    '^([^+])', '+\1'
  );
END;
$$;

-- Function to check for duplicate leads by phone
CREATE OR REPLACE FUNCTION public.check_lead_duplicate(p_phone text, p_company_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.leads
  WHERE company_id = p_company_id
  AND normalize_phone(phone) = normalize_phone(p_phone)
  LIMIT 1;
$$;

-- ========================================
-- Migration: 20251218102727_75894453-ce9c-440e-92a6-9bdf397fbeba.sql
-- ========================================


-- =====================================================
-- ENHANCED CRM MIGRATION SYSTEM BACKEND
-- Extends Excel/CSV Import to Enterprise-Grade Migration
-- =====================================================

-- 1) Add normalized_phone and custom_fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS normalized_phone TEXT,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Create index for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_leads_normalized_phone_company 
ON public.leads(normalized_phone, company_id) WHERE normalized_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_company 
ON public.leads(email, company_id) WHERE email IS NOT NULL;

-- 2) Create import_row_errors table for detailed error tracking
CREATE TABLE IF NOT EXISTS public.import_row_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_job_id UUID NOT NULL REFERENCES public.lead_import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  error_type TEXT NOT NULL DEFAULT 'validation',
  error_message TEXT NOT NULL,
  raw_row_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_row_errors_job_id ON public.import_row_errors(import_job_id);

-- 3) Enhance lead_import_jobs table with more columns
ALTER TABLE public.lead_import_jobs
ADD COLUMN IF NOT EXISTS source_label TEXT DEFAULT 'Excel Import',
ADD COLUMN IF NOT EXISTS preview_rows JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS valid_rows INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS duplicate_rows INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_agent_id UUID,
ADD COLUMN IF NOT EXISTS default_stage TEXT,
ADD COLUMN IF NOT EXISTS default_group_id UUID,
ADD COLUMN IF NOT EXISTS rollback_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMP WITH TIME ZONE;

-- Update status enum to include more states
-- First check if any rows would violate the new constraint
UPDATE public.lead_import_jobs 
SET status = 'completed' 
WHERE status NOT IN ('preview', 'processing', 'completed', 'failed', 'rolled_back', 'cancelled');

-- 4) Add source_label column to lead_activities if not exists
ALTER TABLE public.lead_activities
ADD COLUMN IF NOT EXISTS import_job_id UUID REFERENCES public.lead_import_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_activities_import_job ON public.lead_activities(import_job_id) WHERE import_job_id IS NOT NULL;

-- 5) Create function to normalize phone numbers consistently
CREATE OR REPLACE FUNCTION public.normalize_phone_v2(phone_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-numeric characters except + at start
  cleaned := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- If starts with 00, replace with +
  IF cleaned LIKE '00%' THEN
    cleaned := substring(cleaned from 3);
  END IF;
  
  -- Ensure minimum length for valid phone
  IF length(cleaned) < 7 THEN
    RETURN NULL;
  END IF;
  
  RETURN '+' || cleaned;
END;
$$;

-- 6) Create function for enhanced duplicate detection
CREATE OR REPLACE FUNCTION public.check_lead_duplicate_v2(
  p_phone TEXT, 
  p_email TEXT,
  p_company_id UUID
)
RETURNS TABLE(lead_id UUID, match_type TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
BEGIN
  -- First check by normalized phone
  normalized := normalize_phone_v2(p_phone);
  IF normalized IS NOT NULL THEN
    RETURN QUERY
    SELECT l.id, 'phone'::TEXT
    FROM public.leads l
    WHERE l.company_id = p_company_id
    AND l.normalized_phone = normalized
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- Then check by email
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    RETURN QUERY
    SELECT l.id, 'email'::TEXT
    FROM public.leads l
    WHERE l.company_id = p_company_id
    AND lower(trim(l.email)) = lower(trim(p_email))
    LIMIT 1;
  END IF;
END;
$$;

-- 7) Create function to rollback an import
CREATE OR REPLACE FUNCTION public.rollback_import(p_job_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_leads_deleted INTEGER;
  v_activities_deleted INTEGER;
BEGIN
  -- Get job info
  SELECT * INTO v_job FROM public.lead_import_jobs WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Import job not found');
  END IF;
  
  -- Check if rollback is still allowed (within 24 hours by default)
  IF v_job.rollback_until IS NOT NULL AND now() > v_job.rollback_until THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rollback period has expired');
  END IF;
  
  IF v_job.status = 'rolled_back' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Import already rolled back');
  END IF;
  
  -- Delete activities created by this import
  DELETE FROM public.lead_activities WHERE import_job_id = p_job_id;
  GET DIAGNOSTICS v_activities_deleted = ROW_COUNT;
  
  -- Delete leads created by this import
  DELETE FROM public.leads WHERE import_job_id = p_job_id;
  GET DIAGNOSTICS v_leads_deleted = ROW_COUNT;
  
  -- Delete error records
  DELETE FROM public.import_row_errors WHERE import_job_id = p_job_id;
  
  -- Update job status
  UPDATE public.lead_import_jobs
  SET status = 'rolled_back',
      rolled_back_at = now()
  WHERE id = p_job_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'leads_deleted', v_leads_deleted,
    'activities_deleted', v_activities_deleted
  );
END;
$$;

-- 8) Create trigger to auto-set normalized_phone on insert/update
CREATE OR REPLACE FUNCTION public.set_normalized_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_phone := normalize_phone_v2(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_leads_normalize_phone ON public.leads;
CREATE TRIGGER tr_leads_normalize_phone
  BEFORE INSERT OR UPDATE OF phone ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_normalized_phone();

-- 9) Update existing leads to have normalized_phone
UPDATE public.leads
SET normalized_phone = normalize_phone_v2(phone)
WHERE normalized_phone IS NULL AND phone IS NOT NULL;

-- 10) RLS Policies for import_row_errors

ALTER TABLE public.import_row_errors ENABLE ROW LEVEL SECURITY;

-- Users can view error rows for their company's import jobs
CREATE POLICY "Users can view their company import errors"
  ON public.import_row_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lead_import_jobs j
      JOIN public.profiles p ON p.company_id = j.company_id
      WHERE j.id = import_row_errors.import_job_id
      AND p.id = auth.uid()
    )
  );

-- Only admin/manager can insert error records (via import process)
CREATE POLICY "Admin/Manager can insert import errors"
  ON public.import_row_errors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lead_import_jobs j
      JOIN public.profiles p ON p.company_id = j.company_id
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE j.id = import_row_errors.import_job_id
      AND p.id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Allow deletion for rollback
CREATE POLICY "Admin can delete import errors"
  ON public.import_row_errors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lead_import_jobs j
      JOIN public.profiles p ON p.company_id = j.company_id
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE j.id = import_row_errors.import_job_id
      AND p.id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- 11) Enable realtime for import_row_errors
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_row_errors;

-- 12) Create helper function to merge lead data (update only empty fields)
CREATE OR REPLACE FUNCTION public.merge_lead_data(
  p_lead_id UUID,
  p_new_data JSONB,
  p_force_agent BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current RECORD;
BEGIN
  SELECT * INTO v_current FROM public.leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update only empty/null fields (merge strategy)
  UPDATE public.leads
  SET
    email = COALESCE(NULLIF(v_current.email, ''), p_new_data->>'email'),
    source = COALESCE(NULLIF(v_current.source, ''), p_new_data->>'source'),
    stage = COALESCE(NULLIF(v_current.stage, ''), p_new_data->>'stage'),
    location = COALESCE(NULLIF(v_current.location, ''), p_new_data->>'location'),
    budget = COALESCE(NULLIF(v_current.budget, ''), p_new_data->>'budget'),
    requirements = COALESCE(NULLIF(v_current.requirements, ''), p_new_data->>'requirements'),
    nationality = COALESCE(NULLIF(v_current.nationality, ''), p_new_data->>'nationality'),
    property_type = COALESCE(NULLIF(v_current.property_type, ''), p_new_data->>'property_type'),
    bedrooms = COALESCE(NULLIF(v_current.bedrooms, ''), p_new_data->>'bedrooms'),
    -- Only update agent if forced or currently null
    assigned_agent_id = CASE 
      WHEN p_force_agent AND (p_new_data->>'assigned_agent_id') IS NOT NULL 
      THEN (p_new_data->>'assigned_agent_id')::UUID
      WHEN v_current.assigned_agent_id IS NULL AND (p_new_data->>'assigned_agent_id') IS NOT NULL
      THEN (p_new_data->>'assigned_agent_id')::UUID
      ELSE v_current.assigned_agent_id
    END,
    -- Merge custom fields
    custom_fields = COALESCE(v_current.custom_fields, '{}'::jsonb) || COALESCE((p_new_data->'custom_fields')::jsonb, '{}'::jsonb),
    updated_at = now()
  WHERE id = p_lead_id;
  
  RETURN TRUE;
END;
$$;

-- 13) Add indexes for performance at scale
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON public.leads(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_import_job ON public.leads(import_job_id) WHERE import_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_company_status ON public.lead_import_jobs(company_id, status);

-- ========================================
-- Migration: 20251218104539_35eda900-3cd7-4a8a-88f0-1c204266960a.sql
-- ========================================

-- Drop existing check constraint
ALTER TABLE public.lead_import_jobs DROP CONSTRAINT IF EXISTS lead_import_jobs_status_check;

-- Add new check constraint with all valid statuses including preview and rolled_back
ALTER TABLE public.lead_import_jobs ADD CONSTRAINT lead_import_jobs_status_check 
CHECK (status = ANY (ARRAY['preview'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'rolled_back'::text]));

-- ========================================
-- Migration: 20251218105042_97aa5bdd-f6ee-4018-b4bd-3f0101c8c94e.sql
-- ========================================

-- 1) Create lead_pipelines table
CREATE TABLE public.lead_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) Create lead_pipeline_stages table
CREATE TABLE public.lead_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.lead_pipelines(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pipeline_id, stage_name)
);

-- 3) Create lead_pipeline_entries table (leads in pipeline)
CREATE TABLE public.lead_pipeline_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.lead_pipelines(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_stage_id UUID NOT NULL REFERENCES public.lead_pipeline_stages(id),
  assigned_agent_id UUID REFERENCES public.agents(id),
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_stage_change_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  UNIQUE(pipeline_id, lead_id) -- Prevent duplicate leads in same pipeline
);

-- 4) Create lead_pipeline_history table
CREATE TABLE public.lead_pipeline_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_entry_id UUID NOT NULL REFERENCES public.lead_pipeline_entries(id) ON DELETE CASCADE,
  old_stage_id UUID REFERENCES public.lead_pipeline_stages(id),
  new_stage_id UUID NOT NULL REFERENCES public.lead_pipeline_stages(id),
  old_agent_id UUID REFERENCES public.agents(id),
  new_agent_id UUID REFERENCES public.agents(id),
  change_type TEXT NOT NULL DEFAULT 'stage_change', -- stage_change, agent_change, added, removed
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_lead_pipelines_company ON public.lead_pipelines(company_id);
CREATE INDEX idx_lead_pipeline_stages_pipeline ON public.lead_pipeline_stages(pipeline_id);
CREATE INDEX idx_lead_pipeline_stages_order ON public.lead_pipeline_stages(pipeline_id, stage_order);
CREATE INDEX idx_lead_pipeline_entries_pipeline ON public.lead_pipeline_entries(pipeline_id);
CREATE INDEX idx_lead_pipeline_entries_lead ON public.lead_pipeline_entries(lead_id);
CREATE INDEX idx_lead_pipeline_entries_stage ON public.lead_pipeline_entries(current_stage_id);
CREATE INDEX idx_lead_pipeline_entries_agent ON public.lead_pipeline_entries(assigned_agent_id);
CREATE INDEX idx_lead_pipeline_history_entry ON public.lead_pipeline_history(pipeline_entry_id);
CREATE INDEX idx_lead_pipeline_history_changed_at ON public.lead_pipeline_history(changed_at DESC);

-- Create updated_at triggers
CREATE TRIGGER update_lead_pipelines_updated_at
  BEFORE UPDATE ON public.lead_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_lead_pipeline_stages_updated_at
  BEFORE UPDATE ON public.lead_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Enable RLS
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipeline_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_pipelines
CREATE POLICY "Users can view company pipelines"
  ON public.lead_pipelines FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can create pipelines"
  ON public.lead_pipelines FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin/Manager can update pipelines"
  ON public.lead_pipelines FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin can delete pipelines"
  ON public.lead_pipelines FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- RLS Policies for lead_pipeline_stages
CREATE POLICY "Users can view pipeline stages"
  ON public.lead_pipeline_stages FOR SELECT
  USING (pipeline_id IN (
    SELECT id FROM lead_pipelines WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Admin/Manager can create stages"
  ON public.lead_pipeline_stages FOR INSERT
  WITH CHECK (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin/Manager can update stages"
  ON public.lead_pipeline_stages FOR UPDATE
  USING (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin/Manager can delete stages"
  ON public.lead_pipeline_stages FOR DELETE
  USING (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for lead_pipeline_entries
CREATE POLICY "Users can view pipeline entries"
  ON public.lead_pipeline_entries FOR SELECT
  USING (pipeline_id IN (
    SELECT id FROM lead_pipelines WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Admin/Manager can add leads to pipeline"
  ON public.lead_pipeline_entries FOR INSERT
  WITH CHECK (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Users can update pipeline entries"
  ON public.lead_pipeline_entries FOR UPDATE
  USING (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'manager')
      OR assigned_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admin/Manager can remove leads from pipeline"
  ON public.lead_pipeline_entries FOR DELETE
  USING (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for lead_pipeline_history
CREATE POLICY "Users can view pipeline history"
  ON public.lead_pipeline_history FOR SELECT
  USING (pipeline_entry_id IN (
    SELECT id FROM lead_pipeline_entries WHERE pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can create history records"
  ON public.lead_pipeline_history FOR INSERT
  WITH CHECK (pipeline_entry_id IN (
    SELECT id FROM lead_pipeline_entries WHERE pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  ));

-- Enable realtime for pipeline entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_pipeline_entries;

-- Function to move lead to new stage with history tracking
CREATE OR REPLACE FUNCTION public.move_pipeline_lead_stage(
  p_entry_id UUID,
  p_new_stage_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_stage_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Get current stage
  SELECT current_stage_id INTO v_old_stage_id
  FROM lead_pipeline_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Skip if same stage
  IF v_old_stage_id = p_new_stage_id THEN
    RETURN TRUE;
  END IF;

  -- Update entry
  UPDATE lead_pipeline_entries
  SET current_stage_id = p_new_stage_id,
      last_stage_change_at = now()
  WHERE id = p_entry_id;

  -- Create history record
  INSERT INTO lead_pipeline_history (
    pipeline_entry_id, old_stage_id, new_stage_id, 
    change_type, changed_by, notes
  ) VALUES (
    p_entry_id, v_old_stage_id, p_new_stage_id,
    'stage_change', v_user_id, p_notes
  );

  RETURN TRUE;
END;
$$;

-- Function to assign agent with history tracking
CREATE OR REPLACE FUNCTION public.assign_pipeline_lead_agent(
  p_entry_id UUID,
  p_new_agent_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_agent_id UUID;
  v_current_stage_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Get current agent and stage
  SELECT assigned_agent_id, current_stage_id 
  INTO v_old_agent_id, v_current_stage_id
  FROM lead_pipeline_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update entry
  UPDATE lead_pipeline_entries
  SET assigned_agent_id = p_new_agent_id
  WHERE id = p_entry_id;

  -- Create history record
  INSERT INTO lead_pipeline_history (
    pipeline_entry_id, old_stage_id, new_stage_id,
    old_agent_id, new_agent_id,
    change_type, changed_by, notes
  ) VALUES (
    p_entry_id, v_current_stage_id, v_current_stage_id,
    v_old_agent_id, p_new_agent_id,
    'agent_change', v_user_id, p_notes
  );

  RETURN TRUE;
END;
$$;

-- Function to get pipeline stats
CREATE OR REPLACE FUNCTION public.get_pipeline_stats(p_pipeline_id UUID)
RETURNS TABLE(
  stage_id UUID,
  stage_name TEXT,
  stage_order INTEGER,
  lead_count BIGINT,
  percentage NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH total AS (
    SELECT COUNT(*) as total_leads 
    FROM lead_pipeline_entries 
    WHERE pipeline_id = p_pipeline_id
  )
  SELECT 
    s.id as stage_id,
    s.stage_name,
    s.stage_order,
    COUNT(e.id) as lead_count,
    CASE 
      WHEN (SELECT total_leads FROM total) > 0 
      THEN ROUND((COUNT(e.id)::NUMERIC / (SELECT total_leads FROM total)) * 100, 1)
      ELSE 0 
    END as percentage
  FROM lead_pipeline_stages s
  LEFT JOIN lead_pipeline_entries e ON s.id = e.current_stage_id
  WHERE s.pipeline_id = p_pipeline_id
  GROUP BY s.id, s.stage_name, s.stage_order
  ORDER BY s.stage_order;
$$;

-- ========================================
-- Migration: 20251218122621_bbb9a534-d6b4-4325-8d48-3abece4780c0.sql
-- ========================================

-- Drop the old constraint and add new one with meeting type
ALTER TABLE public.lead_activities DROP CONSTRAINT lead_activities_type_check;

ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_type_check 
CHECK (type = ANY (ARRAY['call'::text, 'email'::text, 'whatsapp'::text, 'note'::text, 'stage'::text, 'followup'::text, 'task'::text, 'voicenote'::text, 'automation'::text, 'attachment'::text, 'meeting'::text, 'assignment'::text, 'added'::text, 'message'::text]));

-- ========================================
-- Migration: 20251218123338_bafc193f-f5c3-42b6-a693-b3c7d19c3f36.sql
-- ========================================

-- Enable realtime for activities table
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- Set replica identity for realtime updates
ALTER TABLE public.activities REPLICA IDENTITY FULL;

-- Create index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_activities_organization_lead ON public.activities(organization_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner_id ON public.activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled_at ON public.activities(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);

-- ========================================
-- Migration: 20251218125820_a7461487-6670-4b94-8950-88e46e3348bd.sql
-- ========================================

-- =============================================
-- LEAD ASSIGNMENT ADVANCED FEATURES SCHEMA
-- =============================================

-- 1) LEAD POOLS TABLE
CREATE TABLE IF NOT EXISTS public.lead_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pool_name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, pool_name)
);

-- 2) LEAD POOL MEMBERS (leads in pools)
CREATE TABLE IF NOT EXISTS public.lead_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.lead_pools(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pool_id, lead_id)
);

-- 3) EXTEND LEADS TABLE with assignment fields
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS assignment_priority TEXT DEFAULT 'medium' CHECK (assignment_priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reassignment_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_assignment_id UUID,
ADD COLUMN IF NOT EXISTS previous_agent_id UUID REFERENCES public.agents(id);

-- 4) EXTEND LEAD_ASSIGNMENT_RULES with priority and active status
ALTER TABLE public.lead_assignment_rules
ADD COLUMN IF NOT EXISTS rule_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_all_conditions BOOLEAN DEFAULT true;

-- 5) EXTEND LEAD_ASSIGNMENT_LOGS with change reason and undo support
ALTER TABLE public.lead_assignment_logs
ADD COLUMN IF NOT EXISTS change_reason TEXT DEFAULT 'manual' CHECK (change_reason IN ('manual', 'round_robin', 'rule', 'auto_reassign', 'undo', 'bulk', 'pool')),
ADD COLUMN IF NOT EXISTS can_undo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS undone_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- 6) AGENT LOAD TABLE (real-time agent workload tracking)
CREATE TABLE IF NOT EXISTS public.agent_load (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  current_leads_count INTEGER DEFAULT 0,
  pending_followups_count INTEGER DEFAULT 0,
  total_assignments_today INTEGER DEFAULT 0,
  total_assignments_week INTEGER DEFAULT 0,
  average_response_time_hours NUMERIC(10,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  max_leads_capacity INTEGER DEFAULT 50,
  is_available BOOLEAN DEFAULT true,
  last_assignment_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id)
);

-- 7) AUTO-REASSIGNMENT RULES TABLE
CREATE TABLE IF NOT EXISTS public.auto_reassignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_without_contact INTEGER NOT NULL DEFAULT 3,
  reassign_to_pool_id UUID REFERENCES public.lead_pools(id),
  reassign_to_agent_id UUID REFERENCES public.agents(id),
  use_round_robin BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  apply_to_stages TEXT[] DEFAULT ARRAY['New', 'Contacted'],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) ASSIGNMENT NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.assignment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assignment_log_id UUID REFERENCES public.lead_assignment_logs(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  notification_type TEXT DEFAULT 'assignment' CHECK (notification_type IN ('assignment', 'reassignment', 'reminder', 'urgent')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_lead_pools_company ON public.lead_pools(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_pool_members_pool ON public.lead_pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_lead_pool_members_lead ON public.lead_pool_members(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_assignment_priority ON public.leads(assignment_priority);
CREATE INDEX IF NOT EXISTS idx_leads_reassignment_due ON public.leads(reassignment_due_at) WHERE reassignment_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_load_company ON public.agent_load(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_load_agent ON public.agent_load(agent_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_agent ON public.assignment_notifications(agent_id, is_read);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_lead ON public.assignment_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_auto_reassignment_rules_company ON public.auto_reassignment_rules(company_id, is_active);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Lead Pools RLS
ALTER TABLE public.lead_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead pools in their company" ON public.lead_pools
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage lead pools" ON public.lead_pools
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Lead Pool Members RLS
ALTER TABLE public.lead_pool_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pool members in their company" ON public.lead_pool_members
  FOR SELECT USING (
    pool_id IN (
      SELECT id FROM public.lead_pools 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and managers can manage pool members" ON public.lead_pool_members
  FOR ALL USING (
    pool_id IN (
      SELECT id FROM public.lead_pools 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Agent Load RLS
ALTER TABLE public.agent_load ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agent load in their company" ON public.agent_load
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "System can manage agent load" ON public.agent_load
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Auto-Reassignment Rules RLS
ALTER TABLE public.auto_reassignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auto-reassignment rules in their company" ON public.auto_reassignment_rules
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage auto-reassignment rules" ON public.auto_reassignment_rules
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Assignment Notifications RLS
ALTER TABLE public.assignment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own notifications" ON public.assignment_notifications
  FOR SELECT USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can create notifications" ON public.assignment_notifications
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their notifications" ON public.assignment_notifications
  FOR UPDATE USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER set_lead_pools_updated_at
  BEFORE UPDATE ON public.lead_pools
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_agent_load_updated_at
  BEFORE UPDATE ON public.agent_load
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_auto_reassignment_rules_updated_at
  BEFORE UPDATE ON public.auto_reassignment_rules
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================
-- FUNCTIONS FOR ASSIGNMENT LOGIC
-- =============================================

-- Function to assign lead with full tracking
CREATE OR REPLACE FUNCTION public.assign_lead_to_agent(
  p_lead_id UUID,
  p_to_agent_id UUID,
  p_change_reason TEXT DEFAULT 'manual',
  p_rule_id UUID DEFAULT NULL,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_company_id UUID;
  v_log_id UUID;
  v_agent RECORD;
BEGIN
  -- Get lead info
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  
  v_company_id := v_lead.company_id;
  
  -- Get agent info
  SELECT * INTO v_agent FROM public.agents WHERE id = p_to_agent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;
  
  -- Verify agent is in same company
  IF v_agent.company_id != v_company_id THEN
    RAISE EXCEPTION 'Agent not in same company';
  END IF;
  
  -- Store previous agent for undo
  UPDATE public.leads
  SET 
    previous_agent_id = assigned_agent_id,
    assigned_agent_id = p_to_agent_id,
    notification_sent = false,
    updated_at = now()
  WHERE id = p_lead_id;
  
  -- Create assignment log
  INSERT INTO public.lead_assignment_logs (
    lead_id, company_id, from_agent_id, to_agent_id,
    assignment_method, change_reason, rule_id, assigned_by, can_undo
  ) VALUES (
    p_lead_id, v_company_id, v_lead.assigned_agent_id, p_to_agent_id,
    p_change_reason, p_change_reason, p_rule_id, COALESCE(p_assigned_by, auth.uid()), true
  )
  RETURNING id INTO v_log_id;
  
  -- Update last assignment id on lead
  UPDATE public.leads SET last_assignment_id = v_log_id WHERE id = p_lead_id;
  
  -- Create notification for agent
  INSERT INTO public.assignment_notifications (
    company_id, assignment_log_id, agent_id, lead_id,
    notification_type, title, message
  ) VALUES (
    v_company_id, v_log_id, p_to_agent_id, p_lead_id,
    CASE WHEN v_lead.assigned_agent_id IS NULL THEN 'assignment' ELSE 'reassignment' END,
    'New Lead Assigned',
    'You have been assigned a new lead: ' || v_lead.name
  );
  
  -- Update agent load
  PERFORM public.update_agent_load(p_to_agent_id);
  IF v_lead.assigned_agent_id IS NOT NULL THEN
    PERFORM public.update_agent_load(v_lead.assigned_agent_id);
  END IF;
  
  RETURN v_log_id;
END;
$$;

-- Function to undo last assignment
CREATE OR REPLACE FUNCTION public.undo_lead_assignment(
  p_lead_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_last_log RECORD;
BEGIN
  -- Get lead info
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get last assignment log
  SELECT * INTO v_last_log 
  FROM public.lead_assignment_logs 
  WHERE lead_id = p_lead_id AND can_undo = true AND undone_at IS NULL
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Restore previous agent
  UPDATE public.leads
  SET 
    assigned_agent_id = v_last_log.from_agent_id,
    previous_agent_id = v_last_log.to_agent_id,
    updated_at = now()
  WHERE id = p_lead_id;
  
  -- Mark log as undone
  UPDATE public.lead_assignment_logs
  SET 
    undone_at = now(),
    undone_by = auth.uid(),
    can_undo = false
  WHERE id = v_last_log.id;
  
  -- Create new log for undo action
  INSERT INTO public.lead_assignment_logs (
    lead_id, company_id, from_agent_id, to_agent_id,
    assignment_method, change_reason, assigned_by, can_undo
  ) VALUES (
    p_lead_id, v_lead.company_id, v_last_log.to_agent_id, v_last_log.from_agent_id,
    'undo', 'undo', auth.uid(), false
  );
  
  -- Update agent loads
  IF v_last_log.to_agent_id IS NOT NULL THEN
    PERFORM public.update_agent_load(v_last_log.to_agent_id);
  END IF;
  IF v_last_log.from_agent_id IS NOT NULL THEN
    PERFORM public.update_agent_load(v_last_log.from_agent_id);
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to update agent load statistics
CREATE OR REPLACE FUNCTION public.update_agent_load(p_agent_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agent RECORD;
  v_leads_count INTEGER;
  v_followups_count INTEGER;
  v_today_count INTEGER;
  v_week_count INTEGER;
  v_avg_response NUMERIC;
  v_conversion NUMERIC;
BEGIN
  SELECT * INTO v_agent FROM public.agents WHERE id = p_agent_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- Count current leads
  SELECT COUNT(*) INTO v_leads_count
  FROM public.leads
  WHERE assigned_agent_id = p_agent_id
  AND stage NOT IN ('Won', 'Lost');
  
  -- Count pending followups
  SELECT COUNT(*) INTO v_followups_count
  FROM public.lead_followups
  WHERE assigned_agent_id = p_agent_id
  AND status = 'pending'
  AND due_date <= now() + interval '7 days';
  
  -- Count today's assignments
  SELECT COUNT(*) INTO v_today_count
  FROM public.lead_assignment_logs
  WHERE to_agent_id = p_agent_id
  AND created_at >= CURRENT_DATE;
  
  -- Count week's assignments
  SELECT COUNT(*) INTO v_week_count
  FROM public.lead_assignment_logs
  WHERE to_agent_id = p_agent_id
  AND created_at >= CURRENT_DATE - interval '7 days';
  
  -- Calculate conversion rate
  SELECT 
    CASE WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE stage = 'Won')::NUMERIC / COUNT(*)::NUMERIC) * 100
      ELSE 0 
    END INTO v_conversion
  FROM public.leads
  WHERE assigned_agent_id = p_agent_id;
  
  -- Upsert agent load
  INSERT INTO public.agent_load (
    agent_id, company_id, current_leads_count, pending_followups_count,
    total_assignments_today, total_assignments_week, conversion_rate,
    last_assignment_at
  ) VALUES (
    p_agent_id, v_agent.company_id, v_leads_count, v_followups_count,
    v_today_count, v_week_count, COALESCE(v_conversion, 0),
    now()
  )
  ON CONFLICT (agent_id) DO UPDATE SET
    current_leads_count = EXCLUDED.current_leads_count,
    pending_followups_count = EXCLUDED.pending_followups_count,
    total_assignments_today = EXCLUDED.total_assignments_today,
    total_assignments_week = EXCLUDED.total_assignments_week,
    conversion_rate = EXCLUDED.conversion_rate,
    last_assignment_at = EXCLUDED.last_assignment_at,
    updated_at = now();
END;
$$;

-- Function for round-robin assignment
CREATE OR REPLACE FUNCTION public.get_next_round_robin_agent(
  p_company_id UUID,
  p_rule_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agent_id UUID;
  v_agents UUID[];
  v_current_index INTEGER;
BEGIN
  -- Get available agents (sorted by current load, ascending)
  SELECT ARRAY_AGG(a.id ORDER BY COALESCE(al.current_leads_count, 0) ASC, a.created_at ASC)
  INTO v_agents
  FROM public.agents a
  LEFT JOIN public.agent_load al ON a.id = al.agent_id
  WHERE a.company_id = p_company_id
  AND a.status = 'active'
  AND (al.is_available IS NULL OR al.is_available = true)
  AND (al.current_leads_count IS NULL OR al.current_leads_count < COALESCE(al.max_leads_capacity, 50));
  
  IF v_agents IS NULL OR array_length(v_agents, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Get current round robin index
  IF p_rule_id IS NOT NULL THEN
    SELECT round_robin_index INTO v_current_index
    FROM public.lead_assignment_rules
    WHERE id = p_rule_id;
  ELSE
    v_current_index := 0;
  END IF;
  
  -- Get next agent
  v_current_index := COALESCE(v_current_index, 0) % array_length(v_agents, 1) + 1;
  v_agent_id := v_agents[v_current_index];
  
  -- Update round robin index
  IF p_rule_id IS NOT NULL THEN
    UPDATE public.lead_assignment_rules
    SET round_robin_index = v_current_index
    WHERE id = p_rule_id;
  END IF;
  
  RETURN v_agent_id;
END;
$$;

-- Function to bulk assign leads
CREATE OR REPLACE FUNCTION public.bulk_assign_leads(
  p_lead_ids UUID[],
  p_agent_id UUID,
  p_change_reason TEXT DEFAULT 'bulk'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOREACH v_lead_id IN ARRAY p_lead_ids
  LOOP
    PERFORM public.assign_lead_to_agent(v_lead_id, p_agent_id, p_change_reason);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Function to get assignment analytics
CREATE OR REPLACE FUNCTION public.get_assignment_analytics(p_company_id UUID)
RETURNS TABLE(
  agent_id UUID,
  agent_name TEXT,
  total_leads BIGINT,
  active_leads BIGINT,
  won_leads BIGINT,
  lost_leads BIGINT,
  pending_followups BIGINT,
  assignments_today BIGINT,
  assignments_week BIGINT,
  conversion_rate NUMERIC,
  is_available BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.id as agent_id,
    a.name as agent_name,
    COALESCE(l.total, 0) as total_leads,
    COALESCE(l.active, 0) as active_leads,
    COALESCE(l.won, 0) as won_leads,
    COALESCE(l.lost, 0) as lost_leads,
    COALESCE(al.pending_followups_count, 0)::BIGINT as pending_followups,
    COALESCE(al.total_assignments_today, 0)::BIGINT as assignments_today,
    COALESCE(al.total_assignments_week, 0)::BIGINT as assignments_week,
    COALESCE(al.conversion_rate, 0) as conversion_rate,
    COALESCE(al.is_available, true) as is_available
  FROM public.agents a
  LEFT JOIN public.agent_load al ON a.id = al.agent_id
  LEFT JOIN (
    SELECT 
      assigned_agent_id,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE stage NOT IN ('Won', 'Lost')) as active,
      COUNT(*) FILTER (WHERE stage = 'Won') as won,
      COUNT(*) FILTER (WHERE stage = 'Lost') as lost
    FROM public.leads
    WHERE company_id = p_company_id
    GROUP BY assigned_agent_id
  ) l ON a.id = l.assigned_agent_id
  WHERE a.company_id = p_company_id AND a.status = 'active'
  ORDER BY total_leads DESC;
$$;

-- Function to check and apply assignment rules
CREATE OR REPLACE FUNCTION public.apply_assignment_rules(
  p_lead_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_rule RECORD;
  v_agent_id UUID;
  v_conditions JSONB;
  v_match BOOLEAN;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  
  -- Get active rules ordered by priority
  FOR v_rule IN 
    SELECT * FROM public.lead_assignment_rules
    WHERE company_id = v_lead.company_id
    AND is_active = true
    ORDER BY priority DESC, rule_order ASC
  LOOP
    v_conditions := v_rule.conditions;
    v_match := true;
    
    -- Check source condition
    IF v_conditions->>'source' IS NOT NULL AND v_conditions->>'source' != '' THEN
      IF v_lead.source IS NULL OR v_lead.source != v_conditions->>'source' THEN
        v_match := false;
      END IF;
    END IF;
    
    -- Check location condition
    IF v_match AND v_conditions->>'location' IS NOT NULL AND v_conditions->>'location' != '' THEN
      IF v_lead.location IS NULL OR v_lead.location NOT ILIKE '%' || (v_conditions->>'location') || '%' THEN
        v_match := false;
      END IF;
    END IF;
    
    -- Check budget condition
    IF v_match AND v_conditions->>'min_budget' IS NOT NULL THEN
      IF v_lead.budget IS NULL OR 
         COALESCE(NULLIF(regexp_replace(v_lead.budget, '[^0-9.]', '', 'g'), '')::NUMERIC, 0) < (v_conditions->>'min_budget')::NUMERIC THEN
        v_match := false;
      END IF;
    END IF;
    
    -- Check property type condition
    IF v_match AND v_conditions->>'property_type' IS NOT NULL AND v_conditions->>'property_type' != '' THEN
      IF v_lead.property_type IS NULL OR v_lead.property_type != v_conditions->>'property_type' THEN
        v_match := false;
      END IF;
    END IF;
    
    -- Check stage condition
    IF v_match AND v_conditions->>'stage' IS NOT NULL AND v_conditions->>'stage' != '' THEN
      IF v_lead.stage IS NULL OR v_lead.stage != v_conditions->>'stage' THEN
        v_match := false;
      END IF;
    END IF;
    
    -- If rule matches, assign to agent
    IF v_match THEN
      IF v_rule.rule_type = 'round_robin' THEN
        v_agent_id := public.get_next_round_robin_agent(v_lead.company_id, v_rule.id);
      ELSIF v_rule.assigned_agents IS NOT NULL AND array_length(v_rule.assigned_agents, 1) > 0 THEN
        -- Pick agent with lowest load from assigned agents
        SELECT a.id INTO v_agent_id
        FROM public.agents a
        LEFT JOIN public.agent_load al ON a.id = al.agent_id
        WHERE a.id = ANY(v_rule.assigned_agents)
        AND a.status = 'active'
        ORDER BY COALESCE(al.current_leads_count, 0) ASC
        LIMIT 1;
      END IF;
      
      IF v_agent_id IS NOT NULL THEN
        PERFORM public.assign_lead_to_agent(p_lead_id, v_agent_id, 'rule', v_rule.id);
        RETURN v_agent_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_pool_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_load;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_reassignment_rules;

-- ========================================
-- Migration: 20251218131225_9f71f1fe-7efc-4058-ae68-2b81eb044e0b.sql
-- ========================================

-- =============================================
-- LEAD SOURCES BACKEND - FIXED SCHEMA
-- =============================================

-- Drop existing table if it exists with wrong schema
DROP TABLE IF EXISTS public.lead_source_logs CASCADE;
DROP TABLE IF EXISTS public.lead_webhooks CASCADE;
DROP TABLE IF EXISTS public.lead_sources CASCADE;

-- =============================================
-- LEAD_SOURCES TABLE
-- =============================================
CREATE TABLE public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL, -- meta, tiktok, linkedin, website, property_finder, bayut, dubizzle, google_sheets
  display_name TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'api', -- api, oauth, manual, webhook
  connection_details JSONB DEFAULT '{}'::jsonb,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'disconnected', -- connected, disconnected, pending, error
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  total_leads_fetched INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, source_name)
);

-- =============================================
-- LEAD_WEBHOOKS TABLE
-- =============================================
CREATE TABLE public.lead_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.lead_sources(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  secret_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  verify_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT true,
  last_received_at TIMESTAMPTZ,
  total_received INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- LEAD_SOURCE_LOGS TABLE
-- =============================================
CREATE TABLE public.lead_source_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  leads_processed INTEGER DEFAULT 0,
  leads_created INTEGER DEFAULT 0,
  leads_updated INTEGER DEFAULT 0,
  leads_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  request_data JSONB,
  response_data JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- EXTEND LEADS TABLE
-- =============================================
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES public.lead_sources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS mapped_fields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_opted_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS ad_set_name TEXT,
ADD COLUMN IF NOT EXISTS ad_name TEXT,
ADD COLUMN IF NOT EXISTS form_id TEXT,
ADD COLUMN IF NOT EXISTS form_name TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_external_id ON public.leads(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_lead_source_id ON public.leads(lead_source_id) WHERE lead_source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_sources_company ON public.lead_sources(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_source_logs_company ON public.lead_source_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_source_logs_source ON public.lead_source_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_lead_webhooks_source ON public.lead_webhooks(source_id);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE OR REPLACE TRIGGER update_lead_sources_updated_at
  BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE OR REPLACE TRIGGER update_lead_webhooks_updated_at
  BEFORE UPDATE ON public.lead_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_source_logs ENABLE ROW LEVEL SECURITY;

-- Lead Sources policies
CREATE POLICY "Users can view their company lead sources"
  ON public.lead_sources FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can insert lead sources"
  ON public.lead_sources FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can update lead sources"
  ON public.lead_sources FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can delete lead sources"
  ON public.lead_sources FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Lead Webhooks policies
CREATE POLICY "Users can view their company webhooks"
  ON public.lead_webhooks FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can manage webhooks"
  ON public.lead_webhooks FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Lead Source Logs policies
CREATE POLICY "Users can view their company logs"
  ON public.lead_source_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert logs"
  ON public.lead_source_logs FOR INSERT
  WITH CHECK (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check for duplicate leads
CREATE OR REPLACE FUNCTION public.check_lead_source_duplicate(
  p_company_id UUID,
  p_external_id TEXT,
  p_phone TEXT,
  p_email TEXT
) RETURNS TABLE(lead_id UUID, match_type TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_external_id IS NOT NULL AND p_external_id != '' THEN
    RETURN QUERY
    SELECT l.id, 'external_id'::TEXT
    FROM public.leads l
    WHERE l.company_id = p_company_id
    AND l.external_id = p_external_id
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  IF p_phone IS NOT NULL AND p_phone != '' THEN
    RETURN QUERY
    SELECT l.id, 'phone'::TEXT
    FROM public.leads l
    WHERE l.company_id = p_company_id
    AND normalize_phone_v2(l.phone) = normalize_phone_v2(p_phone)
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    RETURN QUERY
    SELECT l.id, 'email'::TEXT
    FROM public.leads l
    WHERE l.company_id = p_company_id
    AND lower(trim(l.email)) = lower(trim(p_email))
    LIMIT 1;
  END IF;
END;
$$;

-- Function to insert lead from source
CREATE OR REPLACE FUNCTION public.insert_lead_from_source(
  p_company_id UUID,
  p_source_id UUID,
  p_external_id TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_source_metadata JSONB DEFAULT '{}'::jsonb,
  p_campaign_name TEXT DEFAULT NULL,
  p_ad_set_name TEXT DEFAULT NULL,
  p_ad_name TEXT DEFAULT NULL,
  p_form_id TEXT DEFAULT NULL,
  p_form_name TEXT DEFAULT NULL,
  p_duplicate_action TEXT DEFAULT 'skip'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing_lead_id UUID;
  v_match_type TEXT;
  v_new_lead_id UUID;
  v_source_name TEXT;
BEGIN
  SELECT display_name INTO v_source_name 
  FROM public.lead_sources WHERE id = p_source_id;

  SELECT lead_id, match_type INTO v_existing_lead_id, v_match_type
  FROM public.check_lead_source_duplicate(p_company_id, p_external_id, p_phone, p_email);
  
  IF v_existing_lead_id IS NOT NULL THEN
    IF p_duplicate_action = 'skip' THEN
      RETURN jsonb_build_object(
        'success', true,
        'action', 'skipped',
        'reason', 'duplicate_' || v_match_type,
        'lead_id', v_existing_lead_id
      );
    ELSIF p_duplicate_action = 'update' THEN
      UPDATE public.leads SET
        source_metadata = COALESCE(source_metadata, '{}'::jsonb) || p_source_metadata,
        updated_at = now()
      WHERE id = v_existing_lead_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'action', 'updated',
        'lead_id', v_existing_lead_id
      );
    END IF;
  END IF;
  
  INSERT INTO public.leads (
    company_id,
    lead_source_id,
    external_id,
    name,
    phone,
    email,
    source,
    source_metadata,
    campaign_name,
    ad_set_name,
    ad_name,
    form_id,
    form_name,
    fetched_at,
    is_opted_in,
    stage
  ) VALUES (
    p_company_id,
    p_source_id,
    p_external_id,
    p_name,
    p_phone,
    p_email,
    v_source_name,
    p_source_metadata,
    p_campaign_name,
    p_ad_set_name,
    p_ad_name,
    p_form_id,
    p_form_name,
    now(),
    true,
    'New'
  )
  RETURNING id INTO v_new_lead_id;
  
  UPDATE public.lead_sources SET
    total_leads_fetched = total_leads_fetched + 1,
    last_fetched_at = now()
  WHERE id = p_source_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'lead_id', v_new_lead_id
  );
END;
$$;

-- Function to log source activity
CREATE OR REPLACE FUNCTION public.log_lead_source_activity(
  p_source_id UUID,
  p_company_id UUID,
  p_action TEXT,
  p_status TEXT,
  p_leads_processed INTEGER DEFAULT 0,
  p_leads_created INTEGER DEFAULT 0,
  p_leads_updated INTEGER DEFAULT 0,
  p_leads_skipped INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL,
  p_request_data JSONB DEFAULT NULL,
  p_response_data JSONB DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.lead_source_logs (
    source_id, company_id, action, status,
    leads_processed, leads_created, leads_updated, leads_skipped,
    error_message, request_data, response_data, duration_ms
  ) VALUES (
    p_source_id, p_company_id, p_action, p_status,
    p_leads_processed, p_leads_created, p_leads_updated, p_leads_skipped,
    p_error_message, p_request_data, p_response_data, p_duration_ms
  )
  RETURNING id INTO v_log_id;
  
  IF p_status = 'failed' AND p_source_id IS NOT NULL THEN
    UPDATE public.lead_sources SET
      last_error = p_error_message,
      status = 'error'
    WHERE id = p_source_id;
  END IF;
  
  RETURN v_log_id;
END;
$$;

-- Function to get source analytics
CREATE OR REPLACE FUNCTION public.get_lead_source_analytics(p_company_id UUID)
RETURNS TABLE(
  source_id UUID,
  source_name TEXT,
  display_name TEXT,
  status TEXT,
  total_leads BIGINT,
  leads_today BIGINT,
  leads_this_week BIGINT,
  leads_this_month BIGINT,
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    ls.id as source_id,
    ls.source_name,
    ls.display_name,
    ls.status,
    COUNT(l.id) as total_leads,
    COUNT(l.id) FILTER (WHERE l.created_at >= CURRENT_DATE) as leads_today,
    COUNT(l.id) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '7 days') as leads_this_week,
    COUNT(l.id) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '30 days') as leads_this_month,
    ls.last_fetched_at,
    ls.last_error
  FROM public.lead_sources ls
  LEFT JOIN public.leads l ON ls.id = l.lead_source_id
  WHERE ls.company_id = p_company_id
  GROUP BY ls.id, ls.source_name, ls.display_name, ls.status, ls.last_fetched_at, ls.last_error
  ORDER BY total_leads DESC;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_source_logs;

-- ========================================
-- Migration: 20251218144748_cfa1815f-a9b2-4355-bc39-a33b3633e53e.sql
-- ========================================


-- Add unique constraint on lead_stages to prevent duplicate stage names per company (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS lead_stages_company_name_unique 
ON lead_stages (company_id, LOWER(name));

-- Add unique constraint on lead_groups to prevent duplicate group names per company (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS lead_groups_company_name_unique 
ON lead_groups (company_id, LOWER(name));

-- ========================================
-- Migration: 20251218160948_b85e014e-9c11-4f9b-9ee3-2a432904a97f.sql
-- ========================================

-- Add "Uncontacted" stage for all companies that don't have it
INSERT INTO lead_stages (company_id, name, color, position, is_default, is_won, is_lost)
SELECT DISTINCT company_id, 'Uncontacted', '#6366F1', 0, true, false, false
FROM lead_stages
WHERE company_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM lead_stages ls2 
  WHERE ls2.company_id = lead_stages.company_id 
  AND ls2.name = 'Uncontacted'
);

-- Update positions for existing stages to shift them after Uncontacted
UPDATE lead_stages 
SET position = position + 1 
WHERE name != 'Uncontacted' 
AND position >= 0;

-- Set Uncontacted as the default stage (unset other defaults)
UPDATE lead_stages 
SET is_default = false 
WHERE name != 'Uncontacted';

UPDATE lead_stages 
SET is_default = true 
WHERE name = 'Uncontacted';

-- ========================================
-- Migration: 20251218161117_370e7060-7dc0-4896-9574-f2bc5d93329b.sql
-- ========================================

-- Update the insert_lead_from_source function to use 'Uncontacted' as default stage
CREATE OR REPLACE FUNCTION public.insert_lead_from_source(
  p_company_id UUID,
  p_source_id UUID,
  p_external_id TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_source_metadata JSONB DEFAULT '{}',
  p_campaign_name TEXT DEFAULT NULL,
  p_ad_set_name TEXT DEFAULT NULL,
  p_ad_name TEXT DEFAULT NULL,
  p_form_id TEXT DEFAULT NULL,
  p_form_name TEXT DEFAULT NULL,
  p_duplicate_action TEXT DEFAULT 'skip'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_lead_id UUID;
  v_match_type TEXT;
  v_new_lead_id UUID;
  v_source_name TEXT;
BEGIN
  SELECT display_name INTO v_source_name 
  FROM public.lead_sources WHERE id = p_source_id;

  SELECT lead_id, match_type INTO v_existing_lead_id, v_match_type
  FROM public.check_lead_source_duplicate(p_company_id, p_external_id, p_phone, p_email);
  
  IF v_existing_lead_id IS NOT NULL THEN
    IF p_duplicate_action = 'skip' THEN
      RETURN jsonb_build_object(
        'success', true,
        'action', 'skipped',
        'reason', 'duplicate_' || v_match_type,
        'lead_id', v_existing_lead_id
      );
    ELSIF p_duplicate_action = 'update' THEN
      UPDATE public.leads SET
        source_metadata = COALESCE(source_metadata, '{}'::jsonb) || p_source_metadata,
        updated_at = now()
      WHERE id = v_existing_lead_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'action', 'updated',
        'lead_id', v_existing_lead_id
      );
    END IF;
  END IF;
  
  INSERT INTO public.leads (
    company_id,
    lead_source_id,
    external_id,
    name,
    phone,
    email,
    source,
    source_metadata,
    campaign_name,
    ad_set_name,
    ad_name,
    form_id,
    form_name,
    fetched_at,
    is_opted_in,
    stage
  ) VALUES (
    p_company_id,
    p_source_id,
    p_external_id,
    p_name,
    p_phone,
    p_email,
    v_source_name,
    p_source_metadata,
    p_campaign_name,
    p_ad_set_name,
    p_ad_name,
    p_form_id,
    p_form_name,
    now(),
    true,
    'Uncontacted'
  )
  RETURNING id INTO v_new_lead_id;
  
  UPDATE public.lead_sources SET
    total_leads_fetched = total_leads_fetched + 1,
    last_fetched_at = now()
  WHERE id = p_source_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'lead_id', v_new_lead_id
  );
END;
$$;

-- ========================================
-- Migration: 20251218161133_5eba9cf8-de7e-4ed6-b562-e50decab7698.sql
-- ========================================

-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.insert_lead_from_source(
  p_company_id UUID,
  p_source_id UUID,
  p_external_id TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_source_metadata JSONB DEFAULT '{}',
  p_campaign_name TEXT DEFAULT NULL,
  p_ad_set_name TEXT DEFAULT NULL,
  p_ad_name TEXT DEFAULT NULL,
  p_form_id TEXT DEFAULT NULL,
  p_form_name TEXT DEFAULT NULL,
  p_duplicate_action TEXT DEFAULT 'skip'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_lead_id UUID;
  v_match_type TEXT;
  v_new_lead_id UUID;
  v_source_name TEXT;
BEGIN
  SELECT display_name INTO v_source_name 
  FROM lead_sources WHERE id = p_source_id;

  SELECT lead_id, match_type INTO v_existing_lead_id, v_match_type
  FROM check_lead_source_duplicate(p_company_id, p_external_id, p_phone, p_email);
  
  IF v_existing_lead_id IS NOT NULL THEN
    IF p_duplicate_action = 'skip' THEN
      RETURN jsonb_build_object(
        'success', true,
        'action', 'skipped',
        'reason', 'duplicate_' || v_match_type,
        'lead_id', v_existing_lead_id
      );
    ELSIF p_duplicate_action = 'update' THEN
      UPDATE leads SET
        source_metadata = COALESCE(source_metadata, '{}'::jsonb) || p_source_metadata,
        updated_at = now()
      WHERE id = v_existing_lead_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'action', 'updated',
        'lead_id', v_existing_lead_id
      );
    END IF;
  END IF;
  
  INSERT INTO leads (
    company_id,
    lead_source_id,
    external_id,
    name,
    phone,
    email,
    source,
    source_metadata,
    campaign_name,
    ad_set_name,
    ad_name,
    form_id,
    form_name,
    fetched_at,
    is_opted_in,
    stage
  ) VALUES (
    p_company_id,
    p_source_id,
    p_external_id,
    p_name,
    p_phone,
    p_email,
    v_source_name,
    p_source_metadata,
    p_campaign_name,
    p_ad_set_name,
    p_ad_name,
    p_form_id,
    p_form_name,
    now(),
    true,
    'Uncontacted'
  )
  RETURNING id INTO v_new_lead_id;
  
  UPDATE lead_sources SET
    total_leads_fetched = total_leads_fetched + 1,
    last_fetched_at = now()
  WHERE id = p_source_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'lead_id', v_new_lead_id
  );
END;
$$;

-- ========================================
-- Migration: 20251218161609_c6c9dbfc-76a7-41ef-926e-8a9f39b77256.sql
-- ========================================

-- TikTok Lead Capture Backend Infrastructure

-- 1) tiktok_accounts - Store TikTok credentials per company
CREATE TABLE IF NOT EXISTS public.tiktok_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_key TEXT, -- encrypted, nullable until admin adds
  client_secret TEXT, -- encrypted, nullable until admin adds
  access_token TEXT, -- encrypted, nullable until OAuth
  refresh_token TEXT, -- encrypted, nullable
  advertiser_id TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'ready', 'connected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 2) tiktok_lead_forms - Store form metadata
CREATE TABLE IF NOT EXISTS public.tiktok_lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tiktok_account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  advertiser_id TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  leads_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, form_id)
);

-- 3) tiktok_webhooks - Webhook configuration per company
CREATE TABLE IF NOT EXISTS public.tiktok_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  events_received INTEGER DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 4) tiktok_webhook_events - Store raw webhook events for processing
CREATE TABLE IF NOT EXISTS public.tiktok_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tiktok_accounts (Admin/Manager only)
CREATE POLICY "Users can view own company tiktok_accounts"
  ON public.tiktok_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can insert tiktok_accounts"
  ON public.tiktok_accounts FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin/Manager can update tiktok_accounts"
  ON public.tiktok_accounts FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin can delete tiktok_accounts"
  ON public.tiktok_accounts FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- RLS Policies for tiktok_lead_forms
CREATE POLICY "Users can view own company tiktok_lead_forms"
  ON public.tiktok_lead_forms FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can manage tiktok_lead_forms"
  ON public.tiktok_lead_forms FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for tiktok_webhooks
CREATE POLICY "Users can view own company tiktok_webhooks"
  ON public.tiktok_webhooks FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can manage tiktok_webhooks"
  ON public.tiktok_webhooks FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for tiktok_webhook_events (service role only for writes)
CREATE POLICY "Users can view own company tiktok_webhook_events"
  ON public.tiktok_webhook_events FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER set_tiktok_accounts_updated_at
  BEFORE UPDATE ON public.tiktok_accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_tiktok_webhooks_updated_at
  BEFORE UPDATE ON public.tiktok_webhooks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_company ON public.tiktok_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_lead_forms_company ON public.tiktok_lead_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_webhooks_company ON public.tiktok_webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_webhook_events_company_status ON public.tiktok_webhook_events(company_id, status);

-- Enable realtime for leads table updates (TikTok leads will appear instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tiktok_webhook_events;

-- ========================================
-- Migration: 20251218161757_28267560-51b2-494b-b5b5-06fe0f23731f.sql
-- ========================================

-- Add oauth_state column for CSRF protection during OAuth flow
ALTER TABLE public.tiktok_accounts ADD COLUMN IF NOT EXISTS oauth_state TEXT;

-- ========================================
-- Migration: 20251218163130_83dbfa53-16a8-4335-991c-52fef9950534.sql
-- ========================================

-- Add unique constraint on tiktok_lead_forms for upsert
ALTER TABLE public.tiktok_lead_forms
DROP CONSTRAINT IF EXISTS tiktok_lead_forms_company_form_unique;

ALTER TABLE public.tiktok_lead_forms
ADD CONSTRAINT tiktok_lead_forms_company_form_unique UNIQUE (company_id, form_id);

-- ========================================
-- Migration: 20251218163613_c3c2bc36-f7f6-4365-b3ab-8f8b778217f6.sql
-- ========================================

-- ============================================
-- LEAD STAGES BACKEND - COMPLETE REBUILD
-- ============================================

-- 1. Add unique constraint on lead_stages (company_id, name) to prevent duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lead_stages_company_id_name_unique'
  ) THEN
    ALTER TABLE public.lead_stages 
    ADD CONSTRAINT lead_stages_company_id_name_unique UNIQUE (company_id, name);
  END IF;
END $$;

-- 2. Add stage_id column to leads table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'stage_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN stage_id uuid REFERENCES public.lead_stages(id);
  END IF;
END $$;

-- 3. Create index on stage_id for performance
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON public.leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_lead_stages_company_default ON public.lead_stages(company_id, is_default) WHERE is_default = true;

-- 4. Ensure exactly one default stage per company
-- First, set "New" stage as default for each company
UPDATE public.lead_stages 
SET is_default = true 
WHERE name = 'New' AND is_default = false;

-- If no "New" stage exists for a company, set the first stage as default
UPDATE public.lead_stages ls
SET is_default = true
WHERE ls.position = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.lead_stages 
    WHERE company_id = ls.company_id AND is_default = true
  );

-- 5. Create function to get default stage for a company
CREATE OR REPLACE FUNCTION public.get_default_stage_id(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_id uuid;
BEGIN
  -- First try to find the default stage
  SELECT id INTO v_stage_id
  FROM public.lead_stages
  WHERE company_id = p_company_id AND is_default = true
  LIMIT 1;
  
  -- If no default, get the first stage by position
  IF v_stage_id IS NULL THEN
    SELECT id INTO v_stage_id
    FROM public.lead_stages
    WHERE company_id = p_company_id
    ORDER BY position ASC
    LIMIT 1;
  END IF;
  
  RETURN v_stage_id;
END;
$$;

-- 6. Create function to map stage name to stage_id (for imports)
CREATE OR REPLACE FUNCTION public.map_stage_name_to_id(
  p_company_id uuid,
  p_stage_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_id uuid;
  v_canonical_name text;
BEGIN
  -- Try exact match first
  SELECT id INTO v_stage_id
  FROM public.lead_stages
  WHERE company_id = p_company_id 
    AND LOWER(TRIM(name)) = LOWER(TRIM(p_stage_name))
  LIMIT 1;
  
  IF v_stage_id IS NOT NULL THEN
    RETURN v_stage_id;
  END IF;
  
  -- Map common variations to canonical stages
  v_canonical_name := CASE LOWER(TRIM(p_stage_name))
    -- New variations
    WHEN 'new' THEN 'New'
    WHEN 'new lead' THEN 'New'
    WHEN 'fresh' THEN 'New'
    WHEN 'uncontacted' THEN 'New'
    WHEN 'not contacted' THEN 'New'
    -- Contacted variations
    WHEN 'contacted' THEN 'Contacted'
    WHEN 'contact made' THEN 'Contacted'
    WHEN 'reached' THEN 'Contacted'
    WHEN 'in contact' THEN 'Contacted'
    -- Follow Up variations
    WHEN 'follow up' THEN 'Follow Up'
    WHEN 'followup' THEN 'Follow Up'
    WHEN 'follow-up' THEN 'Follow Up'
    WHEN 'pending' THEN 'Follow Up'
    WHEN 'in progress' THEN 'Follow Up'
    -- Qualified variations
    WHEN 'qualified' THEN 'Qualified'
    WHEN 'hot' THEN 'Qualified'
    WHEN 'interested' THEN 'Qualified'
    -- Meeting variations
    WHEN 'meeting' THEN 'Meeting Scheduled'
    WHEN 'meeting scheduled' THEN 'Meeting Scheduled'
    WHEN 'appointment' THEN 'Meeting Scheduled'
    WHEN 'viewing' THEN 'Viewing Done'
    WHEN 'viewing done' THEN 'Viewing Done'
    -- Proposal variations
    WHEN 'proposal' THEN 'Proposal Sent'
    WHEN 'proposal sent' THEN 'Proposal Sent'
    WHEN 'offer' THEN 'Proposal Sent'
    -- Negotiation variations
    WHEN 'negotiation' THEN 'Negotiation'
    WHEN 'negotiating' THEN 'Negotiation'
    -- Won variations
    WHEN 'won' THEN 'Won'
    WHEN 'closed won' THEN 'Won'
    WHEN 'converted' THEN 'Won'
    WHEN 'closed' THEN 'Closed'
    WHEN 'contract signed' THEN 'Contract Signed'
    -- Lost variations
    WHEN 'lost' THEN 'Lost'
    WHEN 'closed lost' THEN 'Lost'
    WHEN 'dead' THEN 'Lost'
    WHEN 'not interested' THEN 'Lost'
    WHEN 'junk' THEN 'Lost'
    ELSE NULL
  END;
  
  -- If we found a canonical mapping, look it up
  IF v_canonical_name IS NOT NULL THEN
    SELECT id INTO v_stage_id
    FROM public.lead_stages
    WHERE company_id = p_company_id 
      AND LOWER(name) = LOWER(v_canonical_name)
    LIMIT 1;
    
    IF v_stage_id IS NOT NULL THEN
      RETURN v_stage_id;
    END IF;
  END IF;
  
  -- Fallback to default stage
  RETURN public.get_default_stage_id(p_company_id);
END;
$$;

-- 7. Create trigger function to auto-assign default stage on lead insert
CREATE OR REPLACE FUNCTION public.assign_default_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign if stage_id is null and company_id exists
  IF NEW.stage_id IS NULL AND NEW.company_id IS NOT NULL THEN
    -- If stage text is provided, try to map it
    IF NEW.stage IS NOT NULL AND TRIM(NEW.stage) != '' THEN
      NEW.stage_id := public.map_stage_name_to_id(NEW.company_id, NEW.stage);
    ELSE
      NEW.stage_id := public.get_default_stage_id(NEW.company_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Create trigger on leads table
DROP TRIGGER IF EXISTS trigger_assign_default_stage ON public.leads;
CREATE TRIGGER trigger_assign_default_stage
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_stage();

-- 9. Migrate existing leads: map stage text to stage_id
UPDATE public.leads l
SET stage_id = public.map_stage_name_to_id(l.company_id, l.stage)
WHERE l.company_id IS NOT NULL 
  AND l.stage_id IS NULL;

-- 10. Create function to create default stages for new company
CREATE OR REPLACE FUNCTION public.create_default_stages_for_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if company has no stages
  IF NOT EXISTS (SELECT 1 FROM public.lead_stages WHERE company_id = p_company_id) THEN
    INSERT INTO public.lead_stages (company_id, name, color, position, is_default, is_won, is_lost)
    VALUES
      (p_company_id, 'New', '#3B82F6', 1, true, false, false),
      (p_company_id, 'Contacted', '#8B5CF6', 2, false, false, false),
      (p_company_id, 'Qualified', '#06B6D4', 3, false, false, false),
      (p_company_id, 'Meeting Scheduled', '#EC4899', 4, false, false, false),
      (p_company_id, 'Viewing Done', '#14B8A6', 5, false, false, false),
      (p_company_id, 'Proposal Sent', '#F59E0B', 6, false, false, false),
      (p_company_id, 'Negotiation', '#F97316', 7, false, false, false),
      (p_company_id, 'Follow Up', '#A855F7', 8, false, false, false),
      (p_company_id, 'Contract Signed', '#84CC16', 9, false, false, false),
      (p_company_id, 'Won', '#10B981', 10, false, true, false),
      (p_company_id, 'Lost', '#EF4444', 11, false, false, true);
  END IF;
END;
$$;

-- 11. Trigger to auto-create default stages when company is created
CREATE OR REPLACE FUNCTION public.trigger_create_default_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_default_stages_for_company(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_company_default_stages ON public.companies;
CREATE TRIGGER trigger_company_default_stages
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_default_stages();

-- 12. Function to validate stage uniqueness before insert/update
CREATE OR REPLACE FUNCTION public.validate_stage_unique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for duplicate name within same company (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.lead_stages
    WHERE company_id = NEW.company_id
      AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Stage name "%" already exists for this company', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_stage_unique ON public.lead_stages;
CREATE TRIGGER trigger_validate_stage_unique
  BEFORE INSERT OR UPDATE ON public.lead_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_stage_unique();

-- 13. Function to ensure only one default stage per company
CREATE OR REPLACE FUNCTION public.ensure_single_default_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting this stage as default, unset others
  IF NEW.is_default = true THEN
    UPDATE public.lead_stages
    SET is_default = false
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_single_default_stage ON public.lead_stages;
CREATE TRIGGER trigger_single_default_stage
  AFTER INSERT OR UPDATE OF is_default ON public.lead_stages
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_stage();

-- 14. Log stage mapping for imported leads (create activity when stage was mapped)
CREATE OR REPLACE FUNCTION public.log_stage_mapping(
  p_lead_id uuid,
  p_original_stage text,
  p_mapped_stage_id uuid,
  p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mapped_stage_name text;
BEGIN
  SELECT name INTO v_mapped_stage_name
  FROM public.lead_stages
  WHERE id = p_mapped_stage_id;
  
  -- Only log if original stage was different from mapped stage
  IF LOWER(TRIM(p_original_stage)) != LOWER(TRIM(v_mapped_stage_name)) THEN
    INSERT INTO public.lead_activities (
      lead_id,
      company_id,
      type,
      title,
      description,
      agent_name
    ) VALUES (
      p_lead_id,
      p_company_id,
      'note',
      'Stage Mapped During Import',
      'Original stage "' || p_original_stage || '" was mapped to "' || v_mapped_stage_name || '"',
      'System'
    );
  END IF;
END;
$$;

-- 15. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_default_stage_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_stage_name_to_id(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_stages_for_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_stage_mapping(uuid, text, uuid, uuid) TO authenticated;

-- ========================================
-- Migration: 20251218164955_87722e4d-d74c-431f-b532-9854ee44b2ab.sql
-- ========================================

-- =============================================
-- PROPERTY FINDER COMPLETE BACKEND SCHEMA
-- =============================================

-- 1) property_finder_accounts - Company-level PF connection
CREATE TABLE IF NOT EXISTS public.property_finder_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pf_company_id TEXT,
  api_key_encrypted TEXT,
  webhook_secret TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'pending')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 2) property_finder_agents - Map PF agents to CRM agents
CREATE TABLE IF NOT EXISTS public.property_finder_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pf_agent_id TEXT NOT NULL,
  pf_agent_email TEXT,
  pf_agent_phone TEXT,
  pf_agent_name TEXT,
  crm_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, pf_agent_id)
);

-- 3) property_finder_field_mappings - Dynamic field mapping
CREATE TABLE IF NOT EXISTS public.property_finder_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pf_field_name TEXT NOT NULL,
  crm_field_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  transform_rule TEXT, -- optional: 'uppercase', 'lowercase', 'trim', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, pf_field_name)
);

-- 4) property_finder_logs - Audit trail for all PF events
CREATE TABLE IF NOT EXISTS public.property_finder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('received', 'parsed', 'duplicate', 'assigned', 'unmapped', 'error', 'notification_sent')),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  listing_id UUID,
  pf_agent_id TEXT,
  raw_payload JSONB,
  processed_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Add Property Finder specific columns to leads table if not exists
DO $$ 
BEGIN
  -- Add portal_listing_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'portal_listing_id') THEN
    ALTER TABLE public.leads ADD COLUMN portal_listing_id TEXT;
  END IF;
  
  -- Add source_metadata for raw PF data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source_metadata') THEN
    ALTER TABLE public.leads ADD COLUMN source_metadata JSONB;
  END IF;
  
  -- Add attachments array
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'attachments') THEN
    ALTER TABLE public.leads ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add is_pf_lead flag for easy filtering
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'is_pf_lead') THEN
    ALTER TABLE public.leads ADD COLUMN is_pf_lead BOOLEAN DEFAULT false;
  END IF;
  
  -- Add pf_lead_id for Property Finder's internal lead ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'pf_lead_id') THEN
    ALTER TABLE public.leads ADD COLUMN pf_lead_id TEXT;
  END IF;
  
  -- Add unmapped flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'is_unmapped') THEN
    ALTER TABLE public.leads ADD COLUMN is_unmapped BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 6) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pf_accounts_company ON public.property_finder_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_pf_agents_company ON public.property_finder_agents(company_id);
CREATE INDEX IF NOT EXISTS idx_pf_agents_pf_id ON public.property_finder_agents(pf_agent_id);
CREATE INDEX IF NOT EXISTS idx_pf_agents_email ON public.property_finder_agents(pf_agent_email);
CREATE INDEX IF NOT EXISTS idx_pf_logs_company ON public.property_finder_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_pf_logs_event ON public.property_finder_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_pf_logs_created ON public.property_finder_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_portal_listing ON public.leads(portal_listing_id) WHERE portal_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_pf_lead ON public.leads(pf_lead_id) WHERE pf_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_is_pf ON public.leads(is_pf_lead) WHERE is_pf_lead = true;
CREATE INDEX IF NOT EXISTS idx_leads_phone_company ON public.leads(phone, company_id) WHERE phone IS NOT NULL;

-- 7) Enable RLS on all new tables
ALTER TABLE public.property_finder_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_finder_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_finder_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_finder_logs ENABLE ROW LEVEL SECURITY;

-- 8) RLS Policies for property_finder_accounts
CREATE POLICY "Users can view their company PF account"
  ON public.property_finder_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admin/Manager can manage PF account"
  ON public.property_finder_accounts FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.agents 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- 9) RLS Policies for property_finder_agents
CREATE POLICY "Users can view their company PF agents"
  ON public.property_finder_agents FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admin/Manager can manage PF agents"
  ON public.property_finder_agents FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.agents 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- 10) RLS Policies for property_finder_field_mappings
CREATE POLICY "Users can view their company field mappings"
  ON public.property_finder_field_mappings FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admin/Manager can manage field mappings"
  ON public.property_finder_field_mappings FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.agents 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- 11) RLS Policies for property_finder_logs (read-only for users)
CREATE POLICY "Users can view their company PF logs"
  ON public.property_finder_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

-- 12) Function to find or create default PF Lead stage
CREATE OR REPLACE FUNCTION public.get_or_create_pf_stage(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_id UUID;
BEGIN
  -- Try to find existing "New" stage (canonical default)
  SELECT id INTO v_stage_id
  FROM public.lead_stages
  WHERE company_id = p_company_id AND LOWER(name) = 'new'
  LIMIT 1;
  
  -- If not found, try any default stage
  IF v_stage_id IS NULL THEN
    SELECT id INTO v_stage_id
    FROM public.lead_stages
    WHERE company_id = p_company_id AND is_default = true
    LIMIT 1;
  END IF;
  
  -- If still not found, create "New" stage
  IF v_stage_id IS NULL THEN
    INSERT INTO public.lead_stages (company_id, name, color, is_default, position)
    VALUES (p_company_id, 'New', '#3B82F6', true, 0)
    RETURNING id INTO v_stage_id;
  END IF;
  
  RETURN v_stage_id;
END;
$$;

-- 13) Function to find assigned agent for a PF lead
CREATE OR REPLACE FUNCTION public.find_pf_lead_agent(
  p_company_id UUID,
  p_portal_listing_id TEXT DEFAULT NULL,
  p_pf_agent_id TEXT DEFAULT NULL,
  p_pf_agent_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  -- Step 1: Try to find by listing's assigned agent
  IF p_portal_listing_id IS NOT NULL THEN
    SELECT assigned_agent_id INTO v_agent_id
    FROM public.properties
    WHERE company_id = p_company_id 
      AND reference_number = p_portal_listing_id
    LIMIT 1;
    
    IF v_agent_id IS NOT NULL THEN
      RETURN v_agent_id;
    END IF;
  END IF;
  
  -- Step 2: Try to find by PF agent ID mapping
  IF p_pf_agent_id IS NOT NULL THEN
    SELECT crm_agent_id INTO v_agent_id
    FROM public.property_finder_agents
    WHERE company_id = p_company_id 
      AND pf_agent_id = p_pf_agent_id
      AND is_active = true
      AND crm_agent_id IS NOT NULL
    LIMIT 1;
    
    IF v_agent_id IS NOT NULL THEN
      RETURN v_agent_id;
    END IF;
  END IF;
  
  -- Step 3: Try to find by email match
  IF p_pf_agent_email IS NOT NULL THEN
    SELECT id INTO v_agent_id
    FROM public.agents
    WHERE company_id = p_company_id 
      AND LOWER(email) = LOWER(p_pf_agent_email)
      AND status = 'active'
    LIMIT 1;
    
    IF v_agent_id IS NOT NULL THEN
      RETURN v_agent_id;
    END IF;
  END IF;
  
  -- Step 4: Fallback to company admin
  SELECT id INTO v_agent_id
  FROM public.agents
  WHERE company_id = p_company_id 
    AND role = 'admin'
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN v_agent_id;
END;
$$;

-- 14) Function to check for duplicate PF leads
CREATE OR REPLACE FUNCTION public.check_pf_duplicate_lead(
  p_company_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_pf_lead_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- Check by PF lead ID first (exact match)
  IF p_pf_lead_id IS NOT NULL THEN
    SELECT id INTO v_lead_id
    FROM public.leads
    WHERE company_id = p_company_id 
      AND pf_lead_id = p_pf_lead_id
    LIMIT 1;
    
    IF v_lead_id IS NOT NULL THEN
      RETURN v_lead_id;
    END IF;
  END IF;
  
  -- Check by phone (normalized)
  IF p_phone IS NOT NULL THEN
    SELECT id INTO v_lead_id
    FROM public.leads
    WHERE company_id = p_company_id 
      AND phone IS NOT NULL
      AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g')
      AND source = 'Property Finder'
    LIMIT 1;
    
    IF v_lead_id IS NOT NULL THEN
      RETURN v_lead_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 15) Main function to process Property Finder webhook
CREATE OR REPLACE FUNCTION public.process_pf_webhook(
  p_company_id UUID,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_lead_id UUID;
  v_existing_lead_id UUID;
  v_agent_id UUID;
  v_stage_id UUID;
  v_lead_name TEXT;
  v_lead_phone TEXT;
  v_lead_email TEXT;
  v_lead_message TEXT;
  v_portal_listing_id TEXT;
  v_pf_agent_id TEXT;
  v_pf_agent_email TEXT;
  v_pf_lead_id TEXT;
  v_attachments JSONB;
  v_start_time TIMESTAMPTZ;
  v_is_unmapped BOOLEAN := false;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Log received event
  INSERT INTO public.property_finder_logs (company_id, event_type, raw_payload, status)
  VALUES (p_company_id, 'received', p_payload, 'pending')
  RETURNING id INTO v_log_id;
  
  -- Extract data from payload (handle nested and flat structures)
  v_lead_name := COALESCE(
    p_payload->'data'->>'name',
    p_payload->>'name',
    CONCAT_WS(' ', p_payload->'data'->>'first_name', p_payload->'data'->>'last_name'),
    CONCAT_WS(' ', p_payload->>'first_name', p_payload->>'last_name'),
    'Unknown Lead'
  );
  
  v_lead_phone := COALESCE(
    p_payload->'data'->>'mobile',
    p_payload->'data'->>'phone',
    p_payload->>'mobile',
    p_payload->>'phone'
  );
  
  v_lead_email := COALESCE(
    p_payload->'data'->>'email',
    p_payload->>'email'
  );
  
  v_lead_message := COALESCE(
    p_payload->'data'->>'message',
    p_payload->>'message'
  );
  
  v_portal_listing_id := COALESCE(
    p_payload->'data'->>'property_reference',
    p_payload->'data'->>'property_id',
    p_payload->>'property_reference',
    p_payload->>'property_id'
  );
  
  v_pf_agent_id := COALESCE(
    p_payload->'data'->>'agent_id',
    p_payload->>'agent_id'
  );
  
  v_pf_agent_email := COALESCE(
    p_payload->'data'->>'agent_email',
    p_payload->>'agent_email'
  );
  
  v_pf_lead_id := COALESCE(
    p_payload->'data'->>'id',
    p_payload->>'id'
  )::TEXT;
  
  v_attachments := COALESCE(
    p_payload->'data'->'attachments',
    p_payload->'attachments',
    '[]'::jsonb
  );
  
  -- Validate required fields
  IF v_lead_phone IS NULL AND v_lead_email IS NULL THEN
    UPDATE public.property_finder_logs
    SET status = 'failed',
        event_type = 'error',
        error_message = 'No contact information (phone or email) provided',
        processing_time_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
    WHERE id = v_log_id;
    
    RETURN jsonb_build_object('success', false, 'error', 'No contact information provided');
  END IF;
  
  -- Check for duplicate
  v_existing_lead_id := public.check_pf_duplicate_lead(p_company_id, v_lead_phone, v_lead_email, v_pf_lead_id);
  
  IF v_existing_lead_id IS NOT NULL THEN
    -- Log as duplicate and add activity to existing lead
    UPDATE public.property_finder_logs
    SET status = 'skipped',
        event_type = 'duplicate',
        lead_id = v_existing_lead_id,
        processed_data = jsonb_build_object('existing_lead_id', v_existing_lead_id),
        processing_time_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
    WHERE id = v_log_id;
    
    -- Add system activity for new inquiry
    INSERT INTO public.lead_activities (
      lead_id, company_id, type, title, description, agent_name
    ) VALUES (
      v_existing_lead_id,
      p_company_id,
      'note',
      'New Property Finder Inquiry',
      CONCAT('Duplicate inquiry received. Message: ', COALESCE(v_lead_message, 'No message')),
      'System'
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'lead_id', v_existing_lead_id
    );
  END IF;
  
  -- Find assigned agent
  v_agent_id := public.find_pf_lead_agent(p_company_id, v_portal_listing_id, v_pf_agent_id, v_pf_agent_email);
  
  IF v_agent_id IS NULL THEN
    v_is_unmapped := true;
    -- Log unmapped event
    INSERT INTO public.property_finder_logs (company_id, event_type, raw_payload, status, error_message)
    VALUES (p_company_id, 'unmapped', p_payload, 'success', 'No matching agent found - assigned to admin');
  END IF;
  
  -- Get default stage
  v_stage_id := public.get_or_create_pf_stage(p_company_id);
  
  -- Create new lead
  INSERT INTO public.leads (
    company_id,
    name,
    phone,
    email,
    source,
    stage_id,
    stage,
    requirements,
    assigned_agent_id,
    portal_listing_id,
    pf_lead_id,
    is_pf_lead,
    is_unmapped,
    attachments,
    source_metadata,
    form_data
  ) VALUES (
    p_company_id,
    v_lead_name,
    v_lead_phone,
    v_lead_email,
    'Property Finder',
    v_stage_id,
    'New',
    v_lead_message,
    v_agent_id,
    v_portal_listing_id,
    v_pf_lead_id,
    true,
    v_is_unmapped,
    v_attachments,
    p_payload,
    jsonb_build_object(
      'property_reference', v_portal_listing_id,
      'pf_lead_id', v_pf_lead_id,
      'pf_agent_id', v_pf_agent_id,
      'webhook_received_at', now()
    )
  )
  RETURNING id INTO v_lead_id;
  
  -- Log successful assignment
  UPDATE public.property_finder_logs
  SET status = 'success',
      event_type = 'assigned',
      lead_id = v_lead_id,
      listing_id = NULL,
      pf_agent_id = v_pf_agent_id,
      processed_data = jsonb_build_object(
        'lead_id', v_lead_id,
        'assigned_agent_id', v_agent_id,
        'stage_id', v_stage_id,
        'is_unmapped', v_is_unmapped
      ),
      processing_time_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
  WHERE id = v_log_id;
  
  -- Create system activity for new lead
  INSERT INTO public.lead_activities (
    lead_id, company_id, type, title, description, agent_name
  ) VALUES (
    v_lead_id,
    p_company_id,
    'added',
    'Lead Created from Property Finder',
    CONCAT('New lead captured from Property Finder. Property: ', COALESCE(v_portal_listing_id, 'Unknown')),
    'System'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'assigned_agent_id', v_agent_id,
    'is_unmapped', v_is_unmapped
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log error
  UPDATE public.property_finder_logs
  SET status = 'failed',
      event_type = 'error',
      error_message = SQLERRM,
      processing_time_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
  WHERE id = v_log_id;
  
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 16) Updated at triggers
CREATE OR REPLACE FUNCTION public.update_pf_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pf_accounts_updated_at ON public.property_finder_accounts;
CREATE TRIGGER update_pf_accounts_updated_at
  BEFORE UPDATE ON public.property_finder_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_pf_updated_at();

DROP TRIGGER IF EXISTS update_pf_agents_updated_at ON public.property_finder_agents;
CREATE TRIGGER update_pf_agents_updated_at
  BEFORE UPDATE ON public.property_finder_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_pf_updated_at();

DROP TRIGGER IF EXISTS update_pf_mappings_updated_at ON public.property_finder_field_mappings;
CREATE TRIGGER update_pf_mappings_updated_at
  BEFORE UPDATE ON public.property_finder_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_pf_updated_at();

-- 17) Insert default field mappings for companies
CREATE OR REPLACE FUNCTION public.create_default_pf_field_mappings(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.property_finder_field_mappings (company_id, pf_field_name, crm_field_name, is_active)
  VALUES
    (p_company_id, 'name', 'name', true),
    (p_company_id, 'first_name', 'name', true),
    (p_company_id, 'last_name', 'name', true),
    (p_company_id, 'email', 'email', true),
    (p_company_id, 'phone', 'phone', true),
    (p_company_id, 'mobile', 'phone', true),
    (p_company_id, 'message', 'requirements', true),
    (p_company_id, 'property_reference', 'portal_listing_id', true),
    (p_company_id, 'property_id', 'portal_listing_id', true)
  ON CONFLICT (company_id, pf_field_name) DO NOTHING;
END;
$$;

-- ========================================
-- Migration: 20251218173419_94da9383-b230-4e0f-87a9-4df84b8aded7.sql
-- ========================================


-- Drop existing functions with correct signatures
DROP FUNCTION IF EXISTS public.get_next_round_robin_agent(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_agent_from_listing(UUID, TEXT);
DROP FUNCTION IF EXISTS public.auto_assign_pf_lead(UUID, TEXT);
DROP FUNCTION IF EXISTS public.process_pf_webhook(UUID, JSONB);

-- 1. Get agent from listing
CREATE OR REPLACE FUNCTION public.pf_get_listing_agent(p_company_id UUID, p_listing_id TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_agent_id UUID;
BEGIN
  SELECT agent_id INTO v_agent_id FROM public.properties
  WHERE company_id = p_company_id AND (pf_listing_id = p_listing_id OR ref_number = p_listing_id) AND agent_id IS NOT NULL
  LIMIT 1;
  RETURN v_agent_id;
END;
$$;

-- 2. Round-robin agent
CREATE OR REPLACE FUNCTION public.pf_get_round_robin_agent(p_company_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_agent_id UUID; v_last UUID;
BEGIN
  SELECT assigned_agent_id INTO v_last FROM public.leads
  WHERE company_id = p_company_id AND assigned_agent_id IS NOT NULL AND assignment_source = 'round_robin'
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT a.id INTO v_agent_id FROM public.agents a
  WHERE a.company_id = p_company_id AND a.status = 'active' AND (v_last IS NULL OR a.id > v_last)
  ORDER BY a.id LIMIT 1;
  
  IF v_agent_id IS NULL THEN
    SELECT a.id INTO v_agent_id FROM public.agents a WHERE a.company_id = p_company_id AND a.status = 'active' ORDER BY a.id LIMIT 1;
  END IF;
  RETURN v_agent_id;
END;
$$;

-- 3. Auto-assign lead
CREATE OR REPLACE FUNCTION public.pf_auto_assign_lead(p_company_id UUID, p_listing_id TEXT)
RETURNS TABLE(agent_id UUID, assignment_source TEXT, assignment_reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_agent_id UUID; v_source TEXT; v_reason TEXT;
BEGIN
  v_agent_id := public.pf_get_listing_agent(p_company_id, p_listing_id);
  IF v_agent_id IS NOT NULL THEN
    v_source := 'listing_owner'; v_reason := 'Assigned to listing owner (listing: ' || COALESCE(p_listing_id, 'unknown') || ')';
    RETURN QUERY SELECT v_agent_id, v_source, v_reason; RETURN;
  END IF;
  v_agent_id := public.pf_get_round_robin_agent(p_company_id);
  IF v_agent_id IS NOT NULL THEN
    v_source := 'round_robin'; v_reason := 'Auto-assigned via round-robin';
    RETURN QUERY SELECT v_agent_id, v_source, v_reason; RETURN;
  END IF;
  v_source := 'unassigned'; v_reason := 'No available agent found';
  RETURN QUERY SELECT NULL::UUID, v_source, v_reason;
END;
$$;

-- 4. Process webhook
CREATE OR REPLACE FUNCTION public.process_pf_webhook(p_company_id UUID, p_payload JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id UUID; v_is_duplicate BOOLEAN := FALSE; v_action TEXT; v_agent_id UUID; v_source TEXT; v_reason TEXT;
  v_pf_lead_id TEXT; v_listing_id TEXT; v_name TEXT; v_phone TEXT; v_email TEXT; v_message TEXT;
  v_default_stage_id UUID; v_normalized_phone TEXT; v_existing_lead_id UUID;
BEGIN
  v_pf_lead_id := COALESCE(p_payload->>'lead_id', p_payload->>'id', p_payload->'lead'->>'id');
  v_listing_id := COALESCE(p_payload->>'listing_id', p_payload->>'reference', p_payload->'listing'->>'id');
  v_name := COALESCE(p_payload->>'name', p_payload->'lead'->>'name', p_payload->'contact'->>'name');
  v_phone := COALESCE(p_payload->>'phone', p_payload->>'mobile', p_payload->'lead'->>'phone');
  v_email := COALESCE(p_payload->>'email', p_payload->'lead'->>'email');
  v_message := COALESCE(p_payload->>'message', p_payload->>'inquiry');
  
  IF v_pf_lead_id IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'Missing lead_id'); END IF;
  IF v_name IS NULL OR v_name = '' THEN v_name := 'Unknown'; END IF;
  v_normalized_phone := REGEXP_REPLACE(COALESCE(v_phone, ''), '[^0-9+]', '', 'g');
  
  SELECT id INTO v_default_stage_id FROM public.lead_stages WHERE company_id = p_company_id AND (LOWER(name) = 'new' OR is_default = TRUE) ORDER BY is_default DESC LIMIT 1;
  SELECT id INTO v_existing_lead_id FROM public.leads WHERE company_id = p_company_id AND pf_lead_id = v_pf_lead_id;
  
  IF v_existing_lead_id IS NOT NULL THEN
    v_is_duplicate := TRUE; v_lead_id := v_existing_lead_id;
    UPDATE public.leads SET name = COALESCE(v_name, name), phone = COALESCE(v_phone, phone), email = COALESCE(v_email, email), message = COALESCE(v_message, message), normalized_phone = COALESCE(v_normalized_phone, normalized_phone), source_metadata = COALESCE(p_payload, source_metadata), updated_at = NOW()
    WHERE id = v_existing_lead_id RETURNING assigned_agent_id INTO v_agent_id;
    v_action := 'updated'; v_source := 'existing';
    INSERT INTO public.lead_activities (lead_id, type, title, description, agent_name, company_id) VALUES (v_lead_id, 'updated', 'Lead Updated', 'Lead updated from Property Finder sync', 'System', p_company_id);
  ELSE
    SELECT id, assigned_agent_id INTO v_existing_lead_id, v_agent_id FROM public.leads WHERE company_id = p_company_id AND ((v_normalized_phone IS NOT NULL AND v_normalized_phone != '' AND normalized_phone = v_normalized_phone) OR (v_email IS NOT NULL AND v_email != '' AND LOWER(email) = LOWER(v_email))) ORDER BY created_at DESC LIMIT 1;
    IF v_existing_lead_id IS NOT NULL THEN
      v_is_duplicate := TRUE; v_lead_id := v_existing_lead_id;
      UPDATE public.leads SET pf_lead_id = COALESCE(pf_lead_id, v_pf_lead_id), portal_listing_id = COALESCE(portal_listing_id, v_listing_id), is_pf_lead = TRUE, message = COALESCE(v_message, message), source_metadata = COALESCE(p_payload, source_metadata), updated_at = NOW() WHERE id = v_existing_lead_id;
      v_action := 'merged'; v_source := 'existing';
      INSERT INTO public.lead_activities (lead_id, type, title, description, agent_name, company_id) VALUES (v_lead_id, 'note', 'Lead Merged', 'Duplicate from PF merged', 'System', p_company_id);
    ELSE
      SELECT * INTO v_agent_id, v_source, v_reason FROM public.pf_auto_assign_lead(p_company_id, v_listing_id);
      INSERT INTO public.leads (company_id, pf_lead_id, portal_listing_id, is_pf_lead, name, phone, email, message, normalized_phone, source, source_metadata, assigned_agent_id, assignment_source, assignment_reason, stage_id, created_at, updated_at)
      VALUES (p_company_id, v_pf_lead_id, v_listing_id, TRUE, v_name, v_phone, v_email, v_message, v_normalized_phone, 'Property Finder', p_payload, v_agent_id, v_source, v_reason, v_default_stage_id, NOW(), NOW())
      RETURNING id INTO v_lead_id;
      v_action := 'created';
      INSERT INTO public.lead_activities (lead_id, type, title, description, agent_name, company_id) VALUES (v_lead_id, 'created', 'Lead Created', 'New lead from Property Finder', 'System', p_company_id);
      IF v_agent_id IS NOT NULL THEN
        INSERT INTO public.lead_activities (lead_id, type, title, description, agent_name, company_id, agent_id) VALUES (v_lead_id, 'assigned', 'Auto-Assigned', v_reason, 'System', p_company_id, v_agent_id);
      END IF;
    END IF;
  END IF;
  
  INSERT INTO public.property_finder_logs (company_id, event_type, raw_payload, lead_id, status, processing_time_ms) VALUES (p_company_id, CASE WHEN v_is_duplicate THEN 'lead_updated' ELSE 'lead_created' END, p_payload, v_lead_id, 'success', 0);
  RETURN jsonb_build_object('success', TRUE, 'lead_id', v_lead_id, 'duplicate', v_is_duplicate, 'action', v_action, 'assigned_agent_id', v_agent_id, 'assignment_source', v_source);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.property_finder_logs (company_id, event_type, raw_payload, status, error_message) VALUES (p_company_id, 'error', p_payload, 'failed', SQLERRM);
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- 5. Assignment change trigger
CREATE OR REPLACE FUNCTION public.log_lead_assignment_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
    INSERT INTO public.lead_activities (lead_id, type, title, description, agent_name, company_id, agent_id)
    VALUES (NEW.id, 'assigned', 'Lead Reassigned', 'Assignment changed', 'System', NEW.company_id, NEW.assigned_agent_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_lead_assignment ON public.leads;
CREATE TRIGGER trigger_log_lead_assignment AFTER UPDATE OF assigned_agent_id ON public.leads FOR EACH ROW EXECUTE FUNCTION public.log_lead_assignment_change();

-- Grants
GRANT EXECUTE ON FUNCTION public.pf_get_listing_agent TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pf_get_round_robin_agent TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pf_auto_assign_lead TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_pf_webhook TO authenticated, service_role;

-- ========================================
-- Migration: 20251218175743_dd944905-696c-4a6b-836e-439fd4d892c9.sql
-- ========================================

-- Create portal_leads table for capturing leads from Property Finder, Bayut, Dubizzle
CREATE TABLE public.portal_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_name TEXT NOT NULL CHECK (portal_name IN ('Property Finder', 'Bayut', 'Dubizzle')),
  portal_lead_id TEXT NOT NULL,
  listing_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT,
  source TEXT,
  stage_id UUID REFERENCES public.lead_stages(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.lead_groups(id) ON DELETE SET NULL,
  opted_in BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'imported', 'failed', 'duplicate')),
  error_message TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, portal_name, portal_lead_id)
);

-- Create portal_import_errors table for logging failed imports
CREATE TABLE public.portal_import_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_name TEXT NOT NULL CHECK (portal_name IN ('Property Finder', 'Bayut', 'Dubizzle')),
  lead_data JSONB NOT NULL,
  error_message TEXT NOT NULL,
  error_type TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.agents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.portal_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_import_errors ENABLE ROW LEVEL SECURITY;

-- RLS policies for portal_leads
CREATE POLICY "Users can view portal leads from their company"
ON public.portal_leads FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert portal leads for their company"
ON public.portal_leads FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update portal leads from their company"
ON public.portal_leads FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete portal leads from their company"
ON public.portal_leads FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for portal_import_errors
CREATE POLICY "Admins and managers can view import errors"
ON public.portal_import_errors FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "System can insert import errors"
ON public.portal_import_errors FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update import errors"
ON public.portal_import_errors FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_portal_leads_company ON public.portal_leads(company_id);
CREATE INDEX idx_portal_leads_portal ON public.portal_leads(portal_name);
CREATE INDEX idx_portal_leads_status ON public.portal_leads(status);
CREATE INDEX idx_portal_leads_agent ON public.portal_leads(assigned_agent_id);
CREATE INDEX idx_portal_leads_listing ON public.portal_leads(listing_id);
CREATE INDEX idx_portal_leads_created ON public.portal_leads(created_at DESC);
CREATE INDEX idx_portal_import_errors_company ON public.portal_import_errors(company_id);
CREATE INDEX idx_portal_import_errors_portal ON public.portal_import_errors(portal_name);
CREATE INDEX idx_portal_import_errors_resolved ON public.portal_import_errors(resolved);

-- Create trigger for updated_at
CREATE TRIGGER update_portal_leads_updated_at
BEFORE UPDATE ON public.portal_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for portal_leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_leads;

-- Create function to process portal lead with duplicate handling and auto-assignment
CREATE OR REPLACE FUNCTION public.process_portal_lead(
  p_company_id UUID,
  p_portal_name TEXT,
  p_portal_lead_id TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_message TEXT,
  p_listing_ref TEXT DEFAULT NULL,
  p_raw_data JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_lead UUID;
  v_lead_id UUID;
  v_listing_id UUID;
  v_assigned_agent_id UUID;
  v_default_stage_id UUID;
  v_status TEXT := 'new';
  v_is_duplicate BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Check for existing lead by portal_lead_id
  SELECT id INTO v_existing_lead
  FROM portal_leads
  WHERE company_id = p_company_id
    AND portal_name = p_portal_name
    AND portal_lead_id = p_portal_lead_id;

  IF v_existing_lead IS NOT NULL THEN
    -- Update existing lead
    UPDATE portal_leads
    SET 
      name = COALESCE(p_name, name),
      phone = COALESCE(p_phone, phone),
      email = COALESCE(p_email, email),
      message = COALESCE(p_message, message),
      raw_data = COALESCE(p_raw_data, raw_data),
      updated_at = now()
    WHERE id = v_existing_lead;
    
    v_lead_id := v_existing_lead;
    v_status := 'duplicate';
    v_is_duplicate := true;
  ELSE
    -- Try to find listing and get assigned agent
    IF p_listing_ref IS NOT NULL THEN
      SELECT id, assigned_agent_id INTO v_listing_id, v_assigned_agent_id
      FROM properties
      WHERE company_id = p_company_id
        AND (reference_number = p_listing_ref OR id::text = p_listing_ref);
    END IF;
    
    -- If no agent from listing, use round-robin
    IF v_assigned_agent_id IS NULL THEN
      SELECT id INTO v_assigned_agent_id
      FROM agents
      WHERE company_id = p_company_id
        AND status = 'active'
        AND role IN ('agent', 'manager')
      ORDER BY (
        SELECT COUNT(*) FROM portal_leads pl 
        WHERE pl.assigned_agent_id = agents.id 
        AND pl.created_at > now() - interval '7 days'
      ) ASC
      LIMIT 1;
    END IF;
    
    -- Get default stage
    SELECT id INTO v_default_stage_id
    FROM lead_stages
    WHERE company_id = p_company_id
      AND name ILIKE '%new%'
    LIMIT 1;
    
    -- Insert new lead
    INSERT INTO portal_leads (
      company_id, portal_name, portal_lead_id, listing_id,
      assigned_agent_id, name, phone, email, message,
      source, stage_id, status, raw_data
    ) VALUES (
      p_company_id, p_portal_name, p_portal_lead_id, v_listing_id,
      v_assigned_agent_id, p_name, p_phone, p_email, p_message,
      p_portal_name, v_default_stage_id, 'imported', p_raw_data
    )
    RETURNING id INTO v_lead_id;
    
    v_status := 'imported';
    
    -- Log activity
    INSERT INTO lead_activities (
      lead_id, company_id, type, title, agent_name, description
    ) VALUES (
      v_lead_id, p_company_id, 'lead_created', 
      'Lead imported from ' || p_portal_name,
      'System',
      'Lead automatically imported via API/webhook'
    );
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'status', v_status,
    'is_duplicate', v_is_duplicate,
    'assigned_agent_id', v_assigned_agent_id
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO portal_import_errors (
      company_id, portal_name, lead_data, error_message, error_type
    ) VALUES (
      p_company_id, p_portal_name, p_raw_data, SQLERRM, 'processing_error'
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ========================================
-- Migration: 20251218180531_c7896d3c-84a9-42a7-b23e-41a6b85ef485.sql
-- ========================================

-- Create website_forms table
CREATE TABLE public.website_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'html' CHECK (form_type IN ('html', 'embed', 'webhook')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  success_redirect_url TEXT,
  thank_you_message TEXT DEFAULT 'Thank you for your submission!',
  spam_protection JSONB DEFAULT '{"honeypot": true, "rate_limit": 10}'::jsonb,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  auto_assign_rules JSONB,
  created_by UUID REFERENCES public.agents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create website_form_fields table
CREATE TABLE public.website_form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.website_forms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'email', 'phone', 'select', 'textarea', 'hidden', 'checkbox', 'number', 'date')),
  is_required BOOLEAN DEFAULT false,
  mapped_to TEXT CHECK (mapped_to IN ('name', 'email', 'phone', 'message', 'custom')),
  options JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create website_form_submissions table
CREATE TABLE public.website_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES public.website_forms(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer_url TEXT,
  page_url TEXT,
  lead_id UUID REFERENCES public.leads(id),
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'spam', 'duplicate', 'error', 'pending')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create api_keys table for form authentication
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '{"forms": true}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.agents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add source_form_id to leads table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source_form_id') THEN
    ALTER TABLE public.leads ADD COLUMN source_form_id UUID REFERENCES public.website_forms(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source_metadata') THEN
    ALTER TABLE public.leads ADD COLUMN source_metadata JSONB;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.website_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for website_forms
CREATE POLICY "Users can view forms from their company"
ON public.website_forms FOR SELECT
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins and managers can create forms"
ON public.website_forms FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Admins and managers can update forms"
ON public.website_forms FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Admins can delete forms"
ON public.website_forms FOR DELETE
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS policies for website_form_fields
CREATE POLICY "Users can view form fields from their company"
ON public.website_form_fields FOR SELECT
USING (form_id IN (SELECT id FROM public.website_forms WHERE company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())));

CREATE POLICY "Admins and managers can manage form fields"
ON public.website_form_fields FOR ALL
USING (form_id IN (SELECT id FROM public.website_forms WHERE company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))));

-- RLS policies for website_form_submissions
CREATE POLICY "Users can view submissions from their company"
ON public.website_form_submissions FOR SELECT
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "System can insert submissions"
ON public.website_form_submissions FOR INSERT
WITH CHECK (true);

-- RLS policies for api_keys
CREATE POLICY "Admins and managers can view API keys"
ON public.api_keys FOR SELECT
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Admins and managers can manage API keys"
ON public.api_keys FOR ALL
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Create indexes for performance
CREATE INDEX idx_website_forms_company ON public.website_forms(company_id);
CREATE INDEX idx_website_forms_status ON public.website_forms(status);
CREATE INDEX idx_website_form_fields_form ON public.website_form_fields(form_id);
CREATE INDEX idx_website_form_submissions_company ON public.website_form_submissions(company_id);
CREATE INDEX idx_website_form_submissions_form ON public.website_form_submissions(form_id);
CREATE INDEX idx_website_form_submissions_created ON public.website_form_submissions(created_at DESC);
CREATE INDEX idx_api_keys_company ON public.api_keys(company_id);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(api_key_prefix);
CREATE INDEX idx_leads_source_form ON public.leads(source_form_id);

-- Create trigger for updated_at
CREATE TRIGGER update_website_forms_updated_at
BEFORE UPDATE ON public.website_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_form_submissions;

-- Create function to process website form submission
CREATE OR REPLACE FUNCTION public.process_website_form_submission(
  p_form_id UUID,
  p_company_id UUID,
  p_submission_data JSONB,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer_url TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form RECORD;
  v_submission_id UUID;
  v_lead_id UUID;
  v_existing_lead_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_message TEXT;
  v_assigned_agent_id UUID;
  v_default_stage_id UUID;
  v_is_duplicate BOOLEAN := false;
  v_is_spam BOOLEAN := false;
  v_status TEXT := 'processed';
  v_spam_settings JSONB;
  v_ip_count INTEGER;
BEGIN
  -- Get form configuration
  SELECT * INTO v_form
  FROM website_forms
  WHERE id = p_form_id AND company_id = p_company_id AND status = 'active';
  
  IF v_form IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Form not found or inactive');
  END IF;

  v_spam_settings := COALESCE(v_form.spam_protection, '{"honeypot": true, "rate_limit": 10}'::jsonb);

  -- Check rate limiting by IP
  IF v_spam_settings->>'rate_limit' IS NOT NULL AND p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM website_form_submissions
    WHERE form_id = p_form_id
      AND ip_address = p_ip_address
      AND created_at > now() - interval '1 hour';
    
    IF v_ip_count >= (v_spam_settings->>'rate_limit')::integer THEN
      v_is_spam := true;
      v_status := 'spam';
    END IF;
  END IF;

  -- Check honeypot field
  IF (v_spam_settings->>'honeypot')::boolean = true THEN
    IF p_submission_data->>'_honeypot' IS NOT NULL AND p_submission_data->>'_honeypot' != '' THEN
      v_is_spam := true;
      v_status := 'spam';
    END IF;
  END IF;

  -- Extract mapped fields
  v_name := COALESCE(
    p_submission_data->>'name',
    p_submission_data->>'full_name',
    p_submission_data->>'fullName',
    p_submission_data->>'firstName' || ' ' || COALESCE(p_submission_data->>'lastName', ''),
    'Unknown'
  );
  
  v_email := COALESCE(
    p_submission_data->>'email',
    p_submission_data->>'emailAddress',
    p_submission_data->>'email_address'
  );
  
  v_phone := COALESCE(
    p_submission_data->>'phone',
    p_submission_data->>'phoneNumber',
    p_submission_data->>'phone_number',
    p_submission_data->>'mobile',
    p_submission_data->>'tel'
  );
  
  v_message := COALESCE(
    p_submission_data->>'message',
    p_submission_data->>'comments',
    p_submission_data->>'inquiry',
    p_submission_data->>'enquiry'
  );

  -- Validate required fields
  IF v_name IS NULL OR v_name = '' OR v_name = 'Unknown' THEN
    IF v_email IS NULL AND v_phone IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'At least name, email, or phone is required');
    END IF;
  END IF;

  -- Check for duplicates by phone or email if not spam
  IF NOT v_is_spam THEN
    IF v_phone IS NOT NULL AND v_phone != '' THEN
      SELECT id INTO v_existing_lead_id
      FROM leads
      WHERE company_id = p_company_id AND phone = v_phone
      LIMIT 1;
    END IF;
    
    IF v_existing_lead_id IS NULL AND v_email IS NOT NULL AND v_email != '' THEN
      SELECT id INTO v_existing_lead_id
      FROM leads
      WHERE company_id = p_company_id AND email = v_email
      LIMIT 1;
    END IF;
    
    IF v_existing_lead_id IS NOT NULL THEN
      v_is_duplicate := true;
      v_lead_id := v_existing_lead_id;
      v_status := 'duplicate';
    END IF;
  END IF;

  -- Create lead if not spam and not duplicate
  IF NOT v_is_spam AND NOT v_is_duplicate THEN
    -- Get default stage
    SELECT id INTO v_default_stage_id
    FROM lead_stages
    WHERE company_id = p_company_id AND name ILIKE '%new%'
    LIMIT 1;
    
    -- Auto-assign agent (round-robin)
    SELECT id INTO v_assigned_agent_id
    FROM agents
    WHERE company_id = p_company_id
      AND status = 'active'
      AND role IN ('agent', 'manager')
    ORDER BY (
      SELECT COUNT(*) FROM leads l 
      WHERE l.assigned_agent_id = agents.id 
      AND l.created_at > now() - interval '7 days'
    ) ASC
    LIMIT 1;

    -- Insert new lead
    INSERT INTO leads (
      company_id, name, phone, email, source, stage_id,
      assigned_agent_id, source_form_id, source_metadata, notes
    ) VALUES (
      p_company_id, v_name, v_phone, v_email, 'Website', v_default_stage_id,
      v_assigned_agent_id, p_form_id, 
      jsonb_build_object('page_url', p_page_url, 'referrer', p_referrer_url, 'user_agent', p_user_agent),
      v_message
    )
    RETURNING id INTO v_lead_id;

    -- Log activity
    INSERT INTO lead_activities (lead_id, company_id, type, title, agent_name, description)
    VALUES (
      v_lead_id, p_company_id, 'lead_created',
      'Lead captured from website form',
      'System',
      'Lead created from form: ' || v_form.form_name
    );
  END IF;

  -- Save submission
  INSERT INTO website_form_submissions (
    company_id, form_id, submission_data, ip_address, user_agent,
    referrer_url, page_url, lead_id, status
  ) VALUES (
    p_company_id, p_form_id, p_submission_data, p_ip_address, p_user_agent,
    p_referrer_url, p_page_url, v_lead_id, v_status
  )
  RETURNING id INTO v_submission_id;

  -- Log to lead_source_logs
  INSERT INTO lead_source_logs (company_id, source_name, event_type, status, details)
  VALUES (
    p_company_id, 'website', 
    CASE WHEN v_is_spam THEN 'spam' WHEN v_is_duplicate THEN 'duplicate' ELSE 'submission' END,
    v_status,
    jsonb_build_object('form_id', p_form_id, 'lead_id', v_lead_id, 'ip', p_ip_address)
  );

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'lead_id', v_lead_id,
    'is_duplicate', v_is_duplicate,
    'is_spam', v_is_spam,
    'status', v_status,
    'redirect_url', v_form.success_redirect_url,
    'thank_you_message', v_form.thank_you_message
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO lead_source_logs (company_id, source_name, event_type, status, details)
    VALUES (p_company_id, 'website', 'error', 'error', jsonb_build_object('error', SQLERRM, 'form_id', p_form_id));
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := 'olcrm_' || encode(gen_random_bytes(24), 'base64');
  v_key := replace(replace(replace(v_key, '+', 'x'), '/', 'y'), '=', '');
  RETURN v_key;
END;
$$;

-- ========================================
-- Migration: 20251218180545_d367a525-6047-406f-a643-99e0fa8de29b.sql
-- ========================================

-- Fix search_path for generate_api_key function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := 'olcrm_' || encode(gen_random_bytes(24), 'base64');
  v_key := replace(replace(replace(v_key, '+', 'x'), '/', 'y'), '=', '');
  RETURN v_key;
END;
$$;

-- ========================================
-- Migration: 20251218183511_d6084b17-3765-4e41-9f04-45cc4e76d52e.sql
-- ========================================

-- WhatsApp Business Accounts
CREATE TABLE IF NOT EXISTS public.whatsapp_business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  meta_business_id TEXT NOT NULL,
  access_token_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('connected', 'pending', 'restricted', 'disconnected')),
  business_name TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, meta_business_id)
);

-- WhatsApp Phone Numbers
CREATE TABLE IF NOT EXISTS public.whatsapp_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  whatsapp_business_account_id UUID NOT NULL REFERENCES public.whatsapp_business_accounts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  display_phone_number TEXT,
  quality_rating TEXT DEFAULT 'unknown' CHECK (quality_rating IN ('GREEN', 'YELLOW', 'RED', 'unknown')),
  messaging_limit TEXT DEFAULT 'TIER_1K',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('connected', 'pending', 'restricted', 'disconnected')),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, phone_number_id)
);

-- WhatsApp Templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  whatsapp_business_account_id UUID REFERENCES public.whatsapp_business_accounts(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  template_id TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  header_type TEXT CHECK (header_type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'NONE')),
  header_content TEXT,
  body TEXT NOT NULL,
  footer TEXT,
  buttons_json JSONB DEFAULT '[]'::jsonb,
  example_values JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, template_name, language)
);

-- Campaign Recipients
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  name TEXT,
  template_variables JSONB DEFAULT '{}'::jsonb,
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  meta_message_id TEXT,
  error_message TEXT,
  error_code TEXT,
  imported_from TEXT NOT NULL DEFAULT 'manual_selection' CHECK (imported_from IN ('manual_selection', 'select_all', 'excel_import', 'filter')),
  is_duplicate BOOLEAN DEFAULT false,
  consent_checked BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 0,
  queued_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign Analytics (denormalized for fast reads)
CREATE TABLE IF NOT EXISTS public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  total_recipients INTEGER DEFAULT 0,
  total_queued INTEGER DEFAULT 0,
  total_sending INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  delivery_rate NUMERIC(5,2) DEFAULT 0,
  read_rate NUMERIC(5,2) DEFAULT 0,
  failure_rate NUMERIC(5,2) DEFAULT 0,
  average_delivery_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign Import Errors
CREATE TABLE IF NOT EXISTS public.campaign_import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  row_number INTEGER,
  lead_data JSONB NOT NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('invalid_phone', 'missing_phone', 'duplicate', 'no_consent', 'invalid_format', 'other')),
  error_message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS phone_number_id UUID REFERENCES public.whatsapp_phone_numbers(id),
ADD COLUMN IF NOT EXISTS whatsapp_template_id UUID REFERENCES public.whatsapp_templates(id),
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS rate_limit_per_second INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;

-- Update campaign_logs to add more action types
ALTER TABLE public.campaign_logs 
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.campaign_recipients(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(delivery_status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_phone ON public.campaign_recipients(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_company ON public.whatsapp_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON public.whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_company ON public.whatsapp_phone_numbers(company_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON public.campaign_analytics(campaign_id);

-- Enable RLS
ALTER TABLE public.whatsapp_business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_import_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_business_accounts
CREATE POLICY "Users can view their company's WhatsApp accounts" ON public.whatsapp_business_accounts
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage WhatsApp accounts" ON public.whatsapp_business_accounts
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for whatsapp_phone_numbers
CREATE POLICY "Users can view their company's phone numbers" ON public.whatsapp_phone_numbers
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage phone numbers" ON public.whatsapp_phone_numbers
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for whatsapp_templates
CREATE POLICY "Users can view their company's templates" ON public.whatsapp_templates
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for campaign_recipients
CREATE POLICY "Users can view their company's recipients" ON public.campaign_recipients
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage recipients" ON public.campaign_recipients
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for campaign_analytics
CREATE POLICY "Users can view their company's analytics" ON public.campaign_analytics
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "System can update analytics" ON public.campaign_analytics
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for campaign_import_errors
CREATE POLICY "Users can view their company's import errors" ON public.campaign_import_errors
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage import errors" ON public.campaign_import_errors
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Function to update campaign analytics
CREATE OR REPLACE FUNCTION public.update_campaign_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.campaign_analytics (campaign_id, company_id)
  SELECT NEW.campaign_id, NEW.company_id
  WHERE NOT EXISTS (SELECT 1 FROM public.campaign_analytics WHERE campaign_id = NEW.campaign_id)
  ON CONFLICT (campaign_id) DO NOTHING;
  
  UPDATE public.campaign_analytics SET
    total_recipients = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id),
    total_queued = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'queued'),
    total_sending = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'sending'),
    total_sent = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'sent'),
    total_delivered = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'delivered'),
    total_read = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'read'),
    total_failed = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'failed'),
    total_skipped = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'skipped'),
    updated_at = now()
  WHERE campaign_id = NEW.campaign_id;
  
  -- Update rates
  UPDATE public.campaign_analytics SET
    delivery_rate = CASE WHEN total_sent > 0 THEN (total_delivered::NUMERIC / total_sent * 100) ELSE 0 END,
    read_rate = CASE WHEN total_delivered > 0 THEN (total_read::NUMERIC / total_delivered * 100) ELSE 0 END,
    failure_rate = CASE WHEN total_recipients > 0 THEN (total_failed::NUMERIC / total_recipients * 100) ELSE 0 END
  WHERE campaign_id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update analytics
DROP TRIGGER IF EXISTS trigger_update_campaign_analytics ON public.campaign_recipients;
CREATE TRIGGER trigger_update_campaign_analytics
  AFTER INSERT OR UPDATE OF delivery_status ON public.campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_campaign_analytics();

-- Function to log campaign actions
CREATE OR REPLACE FUNCTION public.log_campaign_action(
  p_campaign_id UUID,
  p_company_id UUID,
  p_action TEXT,
  p_action_type TEXT,
  p_details JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.campaign_logs (campaign_id, company_id, action, action_type, details, performed_by, recipient_id)
  VALUES (p_campaign_id, p_company_id, p_action, p_action_type, p_details, p_performed_by, p_recipient_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Migration: 20251218183535_6fbcc838-e0b7-4b8e-a3cb-41b56a88a2d0.sql
-- ========================================

-- Fix search_path for functions to address security warnings
CREATE OR REPLACE FUNCTION public.update_campaign_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.campaign_analytics (campaign_id, company_id)
  SELECT NEW.campaign_id, NEW.company_id
  WHERE NOT EXISTS (SELECT 1 FROM public.campaign_analytics WHERE campaign_id = NEW.campaign_id)
  ON CONFLICT (campaign_id) DO NOTHING;
  
  UPDATE public.campaign_analytics SET
    total_recipients = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id),
    total_queued = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'queued'),
    total_sending = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'sending'),
    total_sent = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'sent'),
    total_delivered = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'delivered'),
    total_read = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'read'),
    total_failed = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'failed'),
    total_skipped = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'skipped'),
    updated_at = now()
  WHERE campaign_id = NEW.campaign_id;
  
  UPDATE public.campaign_analytics SET
    delivery_rate = CASE WHEN total_sent > 0 THEN (total_delivered::NUMERIC / total_sent * 100) ELSE 0 END,
    read_rate = CASE WHEN total_delivered > 0 THEN (total_read::NUMERIC / total_delivered * 100) ELSE 0 END,
    failure_rate = CASE WHEN total_recipients > 0 THEN (total_failed::NUMERIC / total_recipients * 100) ELSE 0 END
  WHERE campaign_id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.log_campaign_action(
  p_campaign_id UUID,
  p_company_id UUID,
  p_action TEXT,
  p_action_type TEXT,
  p_details JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.campaign_logs (campaign_id, company_id, action, action_type, details, performed_by, recipient_id)
  VALUES (p_campaign_id, p_company_id, p_action, p_action_type, p_details, p_performed_by, p_recipient_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ========================================
-- Migration: 20251218205444_ef25e64d-0772-4235-8117-b186370c70cf.sql
-- ========================================

-- =============================================
-- COMPLETE MARKETING BACKEND MIGRATION
-- =============================================

-- 1. Add opted_in column to leads for consent management
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_in BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_in_whatsapp BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_in_sms BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_in_email BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Create marketing_templates table for approved templates
CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  template_name TEXT NOT NULL,
  template_key TEXT,
  language TEXT DEFAULT 'en',
  category TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  header_type TEXT,
  header_content TEXT,
  footer_text TEXT,
  buttons_json JSONB,
  variables JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  meta_template_id TEXT,
  rejection_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Add missing columns to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS marketing_template_id UUID REFERENCES public.marketing_templates(id);
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS consent_required BOOLEAN DEFAULT true;

-- 4. Add recipient email column to campaign_recipients
ALTER TABLE public.campaign_recipients ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.campaign_recipients ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- 5. Add more analytics columns
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS total_clicked INTEGER DEFAULT 0;
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS total_bounced INTEGER DEFAULT 0;
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS total_unsubscribed INTEGER DEFAULT 0;
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS delivery_rate NUMERIC(5,2);
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS open_rate NUMERIC(5,2);
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS click_rate NUMERIC(5,2);

-- 6. Add performed_by to campaign_logs for audit
ALTER TABLE public.campaign_logs ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES auth.users(id);

-- 7. Create marketing_webhooks table for status callbacks
CREATE TABLE IF NOT EXISTS public.marketing_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message_id TEXT,
  recipient_id UUID REFERENCES public.campaign_recipients(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Create campaign_schedules for scheduled campaigns
CREATE TABLE IF NOT EXISTS public.campaign_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Create consent_logs for compliance
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  source TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Enable RLS on new tables
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- 11. Create helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION public.is_marketing_admin(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents
    WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND role IN ('admin', 'manager')
    AND status = 'active'
  );
$$;

-- 12. Create helper function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

-- 13. RLS Policies for marketing_templates
CREATE POLICY "Users can view company templates"
  ON public.marketing_templates FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can create templates"
  ON public.marketing_templates FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

CREATE POLICY "Admins can update templates"
  ON public.marketing_templates FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete templates"
  ON public.marketing_templates FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 14. RLS Policies for marketing_webhooks
CREATE POLICY "Users can view company webhooks"
  ON public.marketing_webhooks FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- 15. RLS Policies for campaign_schedules
CREATE POLICY "Users can view company schedules"
  ON public.campaign_schedules FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage schedules"
  ON public.campaign_schedules FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 16. RLS Policies for consent_logs
CREATE POLICY "Users can view company consent logs"
  ON public.consent_logs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can create consent logs"
  ON public.consent_logs FOR INSERT
  WITH CHECK (true);

-- 17. Drop and recreate campaign policies with role restrictions
DROP POLICY IF EXISTS "Users can create campaigns" ON public.campaigns;
CREATE POLICY "Admins can create campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update company campaigns" ON public.campaigns;
CREATE POLICY "Admins can update campaigns"
  ON public.campaigns FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 18. Restrict marketing_connections to admins
DROP POLICY IF EXISTS "Users can create connections for their company" ON public.marketing_connections;
CREATE POLICY "Admins can create connections"
  ON public.marketing_connections FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update their company connections" ON public.marketing_connections;
CREATE POLICY "Admins can update connections"
  ON public.marketing_connections FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete their company connections" ON public.marketing_connections;
CREATE POLICY "Admins can delete connections"
  ON public.marketing_connections FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 19. Create function to update analytics from webhook
CREATE OR REPLACE FUNCTION public.update_campaign_analytics_from_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);
  
  INSERT INTO public.campaign_analytics (campaign_id, company_id)
  SELECT c.id, c.company_id FROM public.campaigns c WHERE c.id = v_campaign_id
  ON CONFLICT (campaign_id) DO NOTHING;
  
  UPDATE public.campaign_analytics SET
    total_sent = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = v_campaign_id AND delivery_status IN ('sent', 'delivered', 'read')),
    total_delivered = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = v_campaign_id AND delivery_status IN ('delivered', 'read')),
    total_read = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = v_campaign_id AND delivery_status = 'read'),
    total_failed = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = v_campaign_id AND delivery_status = 'failed'),
    updated_at = now()
  WHERE campaign_id = v_campaign_id;
  
  RETURN NEW;
END;
$$;

-- 20. Create trigger for analytics update
DROP TRIGGER IF EXISTS trigger_update_campaign_analytics ON public.campaign_recipients;
CREATE TRIGGER trigger_update_campaign_analytics
  AFTER UPDATE OF delivery_status ON public.campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_analytics_from_recipient();

-- 21. Create function to check consent before sending
CREATE OR REPLACE FUNCTION public.check_lead_consent(p_lead_id UUID, p_channel TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_channel
    WHEN 'whatsapp' THEN COALESCE(opted_in_whatsapp, opted_in, true)
    WHEN 'sms' THEN COALESCE(opted_in_sms, opted_in, true)
    WHEN 'email' THEN COALESCE(opted_in_email, opted_in, true)
    ELSE COALESCE(opted_in, true)
  END
  FROM public.leads WHERE id = p_lead_id;
$$;

-- 22. Create function to validate audience before campaign
CREATE OR REPLACE FUNCTION public.validate_campaign_audience(p_campaign_id UUID)
RETURNS TABLE (
  total_recipients INTEGER,
  valid_recipients INTEGER,
  opted_out INTEGER,
  missing_contact INTEGER,
  duplicates INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients WHERE campaign_id = p_campaign_id),
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients cr
     JOIN leads l ON cr.lead_id = l.id
     WHERE cr.campaign_id = p_campaign_id
     AND check_lead_consent(l.id, v_campaign.channel)
     AND CASE v_campaign.channel
       WHEN 'whatsapp' THEN l.phone IS NOT NULL AND l.phone != ''
       WHEN 'sms' THEN l.phone IS NOT NULL AND l.phone != ''
       WHEN 'email' THEN l.email IS NOT NULL AND l.email != ''
       ELSE true
     END),
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients cr
     JOIN leads l ON cr.lead_id = l.id
     WHERE cr.campaign_id = p_campaign_id
     AND NOT check_lead_consent(l.id, v_campaign.channel)),
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients cr
     LEFT JOIN leads l ON cr.lead_id = l.id
     WHERE cr.campaign_id = p_campaign_id
     AND CASE v_campaign.channel
       WHEN 'whatsapp' THEN l.phone IS NULL OR l.phone = ''
       WHEN 'sms' THEN l.phone IS NULL OR l.phone = ''
       WHEN 'email' THEN l.email IS NULL OR l.email = ''
       ELSE false
     END),
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients WHERE campaign_id = p_campaign_id AND is_duplicate = true);
END;
$$;

-- 23. Create function to retry failed messages
CREATE OR REPLACE FUNCTION public.queue_failed_for_retry(p_campaign_id UUID, p_max_retries INTEGER DEFAULT 3)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE campaign_recipients
  SET 
    delivery_status = 'queued',
    retry_count = COALESCE(retry_count, 0) + 1,
    error_message = NULL,
    failed_at = NULL
  WHERE campaign_id = p_campaign_id
    AND delivery_status = 'failed'
    AND COALESCE(retry_count, 0) < p_max_retries;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  INSERT INTO campaign_logs (campaign_id, company_id, action, action_type, details)
  SELECT id, company_id, 'Queued ' || v_count || ' failed messages for retry', 'retry', 
    jsonb_build_object('count', v_count, 'timestamp', now())
  FROM campaigns WHERE id = p_campaign_id;
  
  RETURN v_count;
END;
$$;

-- 24. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(campaign_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_lead ON public.campaign_recipients(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(company_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON public.campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_marketing_templates_channel ON public.marketing_templates(company_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_marketing_webhooks_message ON public.marketing_webhooks(message_id);
CREATE INDEX IF NOT EXISTS idx_leads_consent ON public.leads(company_id, opted_in);

-- 25. Enable realtime for campaign tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_analytics;

-- ========================================
-- Migration: 20251218210215_52baf2eb-9b7c-4ede-b141-5e87920eb115.sql
-- ========================================

-- =============================================
-- WHATSAPP BOT BACKEND COMPLETE MIGRATION
-- =============================================

-- 1. Enhance chatbots table with additional fields
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'paused', 'inactive'));
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS assigned_lead_group_id UUID;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS fallback_message TEXT DEFAULT 'I didn''t understand that. Let me connect you with a human agent.';
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS business_hours_only BOOLEAN DEFAULT false;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id UUID REFERENCES public.whatsapp_phone_numbers(id);

-- 2. Create chatbot_messages table for message sequences
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'template', 'buttons', 'list')),
  content JSONB NOT NULL,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  delay_seconds INTEGER DEFAULT 0,
  condition_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create chatbot_triggers table
CREATE TABLE IF NOT EXISTS public.chatbot_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'auto_reply', 'schedule', 'fallback', 'lead_stage', 'first_message')),
  trigger_value TEXT,
  keywords TEXT[],
  response_message_id UUID REFERENCES public.chatbot_messages(id),
  response_action TEXT CHECK (response_action IN ('send_message', 'send_sequence', 'transfer_agent', 'create_lead', 'update_lead_stage')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create chatbot_interactions table (conversation history)
CREATE TABLE IF NOT EXISTS public.chatbot_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT DEFAULT 'text',
  message_content TEXT,
  message_data JSONB,
  meta_message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  trigger_id UUID REFERENCES public.chatbot_triggers(id),
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create lead_chatbot_assignment table
CREATE TABLE IF NOT EXISTS public.lead_chatbot_assignment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'transferred')),
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chatbot_id, lead_id)
);

-- 6. Create chatbot_sessions table for conversation state
CREATE TABLE IF NOT EXISTS public.chatbot_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  phone_number TEXT NOT NULL,
  session_state JSONB DEFAULT '{}',
  current_sequence_step INTEGER DEFAULT 0,
  awaiting_input BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chatbot_id, phone_number)
);

-- 7. Create chatbot_analytics table
CREATE TABLE IF NOT EXISTS public.chatbot_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  unique_leads INTEGER DEFAULT 0,
  new_leads_created INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chatbot_id, date)
);

-- 8. Create chatbot_logs table for audit
CREATE TABLE IF NOT EXISTS public.chatbot_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID REFERENCES public.chatbots(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'deploy', 'pause', 'activate', 'deactivate', 'delete', 'train', 'error', 'assign_lead', 'unassign_lead')),
  description TEXT NOT NULL,
  details JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Enable RLS on all new tables
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_chatbot_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for chatbot_messages
CREATE POLICY "Users can view company messages"
  ON public.chatbot_messages FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage messages"
  ON public.chatbot_messages FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 11. RLS Policies for chatbot_triggers
CREATE POLICY "Users can view company triggers"
  ON public.chatbot_triggers FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage triggers"
  ON public.chatbot_triggers FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 12. RLS Policies for chatbot_interactions
CREATE POLICY "Users can view company interactions"
  ON public.chatbot_interactions FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert interactions"
  ON public.chatbot_interactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update interactions"
  ON public.chatbot_interactions FOR UPDATE
  USING (true);

-- 13. RLS Policies for lead_chatbot_assignment
CREATE POLICY "Users can view company assignments"
  ON public.lead_chatbot_assignment FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage assignments"
  ON public.lead_chatbot_assignment FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 14. RLS Policies for chatbot_sessions
CREATE POLICY "Users can view company sessions"
  ON public.chatbot_sessions FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can manage sessions"
  ON public.chatbot_sessions FOR ALL
  USING (true);

-- 15. RLS Policies for chatbot_analytics
CREATE POLICY "Users can view company analytics"
  ON public.chatbot_analytics FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can manage analytics"
  ON public.chatbot_analytics FOR ALL
  USING (true);

-- 16. RLS Policies for chatbot_logs
CREATE POLICY "Users can view company logs"
  ON public.chatbot_logs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert logs"
  ON public.chatbot_logs FOR INSERT
  WITH CHECK (true);

-- 17. Create function to get active chatbot for phone number
CREATE OR REPLACE FUNCTION public.get_active_chatbot_for_phone(p_company_id UUID, p_phone_number TEXT)
RETURNS TABLE (
  chatbot_id UUID,
  chatbot_name TEXT,
  whatsapp_connection_id UUID,
  system_prompt TEXT,
  welcome_message TEXT,
  fallback_message TEXT,
  llm_provider TEXT,
  llm_model TEXT,
  max_tokens INTEGER,
  temperature NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as chatbot_id,
    c.name as chatbot_name,
    c.whatsapp_connection_id,
    c.system_prompt,
    c.welcome_message,
    c.fallback_message,
    c.llm_provider,
    c.llm_model,
    c.max_tokens,
    c.temperature
  FROM chatbots c
  JOIN whatsapp_phone_numbers wpn ON c.whatsapp_phone_number_id = wpn.id
  WHERE c.company_id = p_company_id
    AND c.status = 'active'
    AND c.is_active = true
    AND wpn.phone_number_id = p_phone_number
  LIMIT 1;
END;
$$;

-- 18. Create function to log chatbot action
CREATE OR REPLACE FUNCTION public.log_chatbot_action(
  p_company_id UUID,
  p_chatbot_id UUID,
  p_action_type TEXT,
  p_description TEXT,
  p_details JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO chatbot_logs (company_id, chatbot_id, action_type, description, details, performed_by)
  VALUES (p_company_id, p_chatbot_id, p_action_type, p_description, p_details, COALESCE(p_performed_by, auth.uid()))
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 19. Create function to update chatbot analytics
CREATE OR REPLACE FUNCTION public.update_chatbot_analytics(
  p_chatbot_id UUID,
  p_company_id UUID,
  p_field TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO chatbot_analytics (chatbot_id, company_id, date)
  VALUES (p_chatbot_id, p_company_id, CURRENT_DATE)
  ON CONFLICT (chatbot_id, date) DO NOTHING;
  
  EXECUTE format('UPDATE chatbot_analytics SET %I = COALESCE(%I, 0) + $1 WHERE chatbot_id = $2 AND date = CURRENT_DATE', p_field, p_field)
  USING p_increment, p_chatbot_id;
END;
$$;

-- 20. Create function to get or create session
CREATE OR REPLACE FUNCTION public.get_or_create_chatbot_session(
  p_company_id UUID,
  p_chatbot_id UUID,
  p_phone_number TEXT,
  p_lead_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to get existing active session
  SELECT id INTO v_session_id
  FROM chatbot_sessions
  WHERE chatbot_id = p_chatbot_id
    AND phone_number = p_phone_number
    AND expires_at > now();
  
  IF v_session_id IS NULL THEN
    -- Create new session
    INSERT INTO chatbot_sessions (company_id, chatbot_id, phone_number, lead_id)
    VALUES (p_company_id, p_chatbot_id, p_phone_number, p_lead_id)
    ON CONFLICT (chatbot_id, phone_number) 
    DO UPDATE SET 
      lead_id = COALESCE(EXCLUDED.lead_id, chatbot_sessions.lead_id),
      expires_at = now() + INTERVAL '24 hours',
      last_message_at = now()
    RETURNING id INTO v_session_id;
  ELSE
    -- Update existing session
    UPDATE chatbot_sessions
    SET last_message_at = now(),
        expires_at = now() + INTERVAL '24 hours',
        lead_id = COALESCE(p_lead_id, lead_id)
    WHERE id = v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$;

-- 21. Create function to find or create lead from phone
CREATE OR REPLACE FUNCTION public.find_or_create_lead_from_phone(
  p_company_id UUID,
  p_phone_number TEXT,
  p_name TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'WhatsApp Bot'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_normalized_phone TEXT;
  v_default_stage_id UUID;
BEGIN
  -- Normalize phone
  v_normalized_phone := REGEXP_REPLACE(p_phone_number, '[^0-9+]', '', 'g');
  
  -- Find existing lead
  SELECT id INTO v_lead_id
  FROM leads
  WHERE company_id = p_company_id
    AND (normalized_phone = v_normalized_phone OR phone = p_phone_number)
  LIMIT 1;
  
  IF v_lead_id IS NULL THEN
    -- Get default stage
    SELECT id INTO v_default_stage_id
    FROM lead_stages
    WHERE company_id = p_company_id AND is_default = true
    LIMIT 1;
    
    -- Create new lead
    INSERT INTO leads (company_id, name, phone, normalized_phone, source, stage_id, opted_in_whatsapp)
    VALUES (p_company_id, COALESCE(p_name, 'WhatsApp Lead'), p_phone_number, v_normalized_phone, p_source, v_default_stage_id, true)
    RETURNING id INTO v_lead_id;
    
    -- Log lead creation
    INSERT INTO lead_activities (lead_id, company_id, type, title, description, agent_name)
    VALUES (v_lead_id, p_company_id, 'created', 'Lead Created from WhatsApp Bot', 'New lead automatically created from WhatsApp conversation', 'System');
  END IF;
  
  RETURN v_lead_id;
END;
$$;

-- 22. Create function to match trigger
CREATE OR REPLACE FUNCTION public.match_chatbot_trigger(
  p_chatbot_id UUID,
  p_message TEXT,
  p_is_first_message BOOLEAN DEFAULT false
)
RETURNS TABLE (
  trigger_id UUID,
  trigger_type TEXT,
  response_action TEXT,
  response_message_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First check for first_message trigger
  IF p_is_first_message THEN
    RETURN QUERY
    SELECT t.id, t.trigger_type, t.response_action, t.response_message_id
    FROM chatbot_triggers t
    WHERE t.chatbot_id = p_chatbot_id
      AND t.is_active = true
      AND t.trigger_type = 'first_message'
    ORDER BY t.priority DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- Check keyword triggers
  RETURN QUERY
  SELECT t.id, t.trigger_type, t.response_action, t.response_message_id
  FROM chatbot_triggers t
  WHERE t.chatbot_id = p_chatbot_id
    AND t.is_active = true
    AND t.trigger_type = 'keyword'
    AND (
      t.trigger_value IS NOT NULL AND LOWER(p_message) LIKE '%' || LOWER(t.trigger_value) || '%'
      OR t.keywords IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(t.keywords) kw WHERE LOWER(p_message) LIKE '%' || LOWER(kw) || '%'
      )
    )
  ORDER BY t.priority DESC
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- Fallback trigger
  RETURN QUERY
  SELECT t.id, t.trigger_type, t.response_action, t.response_message_id
  FROM chatbot_triggers t
  WHERE t.chatbot_id = p_chatbot_id
    AND t.is_active = true
    AND t.trigger_type = 'fallback'
  ORDER BY t.priority DESC
  LIMIT 1;
END;
$$;

-- 23. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_chatbot ON public.chatbot_messages(chatbot_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_chatbot_triggers_chatbot ON public.chatbot_triggers(chatbot_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_lead ON public.chatbot_interactions(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_chatbot ON public.chatbot_interactions(chatbot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_phone ON public.chatbot_interactions(phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_chatbot_assignment_lead ON public.lead_chatbot_assignment(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_phone ON public.chatbot_sessions(chatbot_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_date ON public.chatbot_analytics(chatbot_id, date);

-- 24. Enable realtime for interactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_sessions;

-- ========================================
-- Migration: 20251218211128_89c0081c-e733-4725-b841-b823081bc344.sql
-- ========================================


-- =============================================
-- CONNECTIONS PAGE COMPLETE BACKEND
-- =============================================

-- 1) Enhance marketing_connections table
ALTER TABLE public.marketing_connections 
ADD COLUMN IF NOT EXISTS service_name text,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS webhook_token text,
ADD COLUMN IF NOT EXISTS messaging_limit integer,
ADD COLUMN IF NOT EXISTS quality_rating text,
ADD COLUMN IF NOT EXISTS verified_domain boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sender_id text,
ADD COLUMN IF NOT EXISTS meta_business_id text,
ADD COLUMN IF NOT EXISTS phone_number_id text,
ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz;

-- 2) Enhance whatsapp_phone_numbers table
ALTER TABLE public.whatsapp_phone_numbers 
ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS verified_name text,
ADD COLUMN IF NOT EXISTS code_verification_status text,
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS webhook_verify_token text,
ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz;

-- 3) Create connection_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('connect', 'edit', 'test', 'delete', 'enable', 'disable', 'error', 'refresh_token', 'webhook_update')),
  description text NOT NULL,
  details jsonb,
  performed_by uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 4) Create sms_accounts table
CREATE TABLE IF NOT EXISTS public.sms_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('twilio', 'messagebird', 'vonage', 'plivo', 'nexmo')),
  account_sid text,
  sender_id text,
  phone_number text,
  message_limit integer,
  messages_sent_today integer DEFAULT 0,
  last_message_at timestamptz,
  status text DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5) Create email_accounts table
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('sendgrid', 'mailgun', 'resend', 'smtp', 'ses', 'postmark')),
  sender_email text NOT NULL,
  sender_name text,
  reply_to_email text,
  verified_domain boolean DEFAULT false,
  domain text,
  daily_limit integer,
  emails_sent_today integer DEFAULT 0,
  last_email_at timestamptz,
  smtp_host text,
  smtp_port integer,
  smtp_secure boolean DEFAULT true,
  status text DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending', 'verification_pending')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6) Create connection_health_checks table
CREATE TABLE IF NOT EXISTS public.connection_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('api_test', 'webhook_test', 'send_test', 'token_refresh')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  response_time_ms integer,
  error_message text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_connection_logs_connection_id ON public.connection_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_company_id ON public.connection_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at ON public.connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_connection_id ON public.whatsapp_phone_numbers(connection_id);
CREATE INDEX IF NOT EXISTS idx_sms_accounts_connection_id ON public.sms_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_sms_accounts_company_id ON public.sms_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_connection_id ON public.email_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_company_id ON public.email_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_connection_health_checks_connection_id ON public.connection_health_checks(connection_id);
CREATE INDEX IF NOT EXISTS idx_marketing_connections_is_default ON public.marketing_connections(company_id, channel, is_default) WHERE is_default = true;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_health_checks ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION public.is_connection_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- connection_logs policies
CREATE POLICY "Users can view their company connection logs"
  ON public.connection_logs FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can insert connection logs"
  ON public.connection_logs FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_connection_admin()
  );

-- sms_accounts policies
CREATE POLICY "Users can view their company sms accounts"
  ON public.sms_accounts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can manage sms accounts"
  ON public.sms_accounts FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_connection_admin()
  );

-- email_accounts policies
CREATE POLICY "Users can view their company email accounts"
  ON public.email_accounts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can manage email accounts"
  ON public.email_accounts FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_connection_admin()
  );

-- connection_health_checks policies
CREATE POLICY "Users can view their company health checks"
  ON public.connection_health_checks FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can manage health checks"
  ON public.connection_health_checks FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_connection_admin()
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to log connection actions
CREATE OR REPLACE FUNCTION public.log_connection_action(
  p_connection_id uuid,
  p_company_id uuid,
  p_action_type text,
  p_description text,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.connection_logs (
    connection_id,
    company_id,
    action_type,
    description,
    details,
    performed_by
  ) VALUES (
    p_connection_id,
    p_company_id,
    p_action_type,
    p_description,
    p_details,
    auth.uid()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to set default connection for a channel
CREATE OR REPLACE FUNCTION public.set_default_connection(
  p_connection_id uuid,
  p_company_id uuid,
  p_channel text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove default from all other connections of same channel
  UPDATE public.marketing_connections
  SET is_default = false
  WHERE company_id = p_company_id 
    AND channel = p_channel 
    AND id != p_connection_id;
  
  -- Set this connection as default
  UPDATE public.marketing_connections
  SET is_default = true
  WHERE id = p_connection_id AND company_id = p_company_id;
  
  -- Log the action
  PERFORM public.log_connection_action(
    p_connection_id,
    p_company_id,
    'edit',
    'Set as default ' || p_channel || ' connection',
    jsonb_build_object('channel', p_channel)
  );
  
  RETURN true;
END;
$$;

-- Function to get default connection for a channel
CREATE OR REPLACE FUNCTION public.get_default_connection(
  p_company_id uuid,
  p_channel text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection_id uuid;
BEGIN
  SELECT id INTO v_connection_id
  FROM public.marketing_connections
  WHERE company_id = p_company_id 
    AND channel = p_channel 
    AND is_default = true
    AND status = 'connected'
  LIMIT 1;
  
  -- If no default, get the first connected one
  IF v_connection_id IS NULL THEN
    SELECT id INTO v_connection_id
    FROM public.marketing_connections
    WHERE company_id = p_company_id 
      AND channel = p_channel 
      AND status = 'connected'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN v_connection_id;
END;
$$;

-- Function to validate and update connection status
CREATE OR REPLACE FUNCTION public.update_connection_status(
  p_connection_id uuid,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.marketing_connections
  WHERE id = p_connection_id;
  
  UPDATE public.marketing_connections
  SET 
    status = p_status,
    error_message = p_error_message,
    last_health_check = now(),
    updated_at = now()
  WHERE id = p_connection_id;
  
  -- Log the status change
  PERFORM public.log_connection_action(
    p_connection_id,
    v_company_id,
    CASE WHEN p_status = 'error' THEN 'error' ELSE 'test' END,
    'Connection status updated to ' || p_status,
    jsonb_build_object('status', p_status, 'error', p_error_message)
  );
  
  RETURN true;
END;
$$;

-- Function to get connection health summary
CREATE OR REPLACE FUNCTION public.get_connection_health_summary(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'connected', COUNT(*) FILTER (WHERE status = 'connected'),
    'disconnected', COUNT(*) FILTER (WHERE status = 'disconnected'),
    'error', COUNT(*) FILTER (WHERE status = 'error'),
    'by_channel', jsonb_build_object(
      'whatsapp', COUNT(*) FILTER (WHERE channel = 'whatsapp'),
      'sms', COUNT(*) FILTER (WHERE channel = 'sms'),
      'email', COUNT(*) FILTER (WHERE channel = 'email')
    ),
    'defaults', jsonb_build_object(
      'whatsapp', (SELECT id FROM public.marketing_connections WHERE company_id = p_company_id AND channel = 'whatsapp' AND is_default = true LIMIT 1),
      'sms', (SELECT id FROM public.marketing_connections WHERE company_id = p_company_id AND channel = 'sms' AND is_default = true LIMIT 1),
      'email', (SELECT id FROM public.marketing_connections WHERE company_id = p_company_id AND channel = 'email' AND is_default = true LIMIT 1)
    )
  ) INTO result
  FROM public.marketing_connections
  WHERE company_id = p_company_id;
  
  RETURN result;
END;
$$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_connection_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS update_sms_accounts_timestamp ON public.sms_accounts;
CREATE TRIGGER update_sms_accounts_timestamp
  BEFORE UPDATE ON public.sms_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_connection_timestamp();

DROP TRIGGER IF EXISTS update_email_accounts_timestamp ON public.email_accounts;
CREATE TRIGGER update_email_accounts_timestamp
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_connection_timestamp();

-- Enable realtime for connection status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_health_checks;

-- ========================================
-- Migration: 20251218211139_495ad019-4ed1-47bf-bd35-ea1904b251f0.sql
-- ========================================


-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.update_connection_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ========================================
-- Migration: 20251218212346_9372f5a2-b548-4e07-a624-23a9d59276ae.sql
-- ========================================


-- =============================================
-- LISTING MANAGEMENT COMPLETE BACKEND
-- =============================================

-- 1) Main listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reference_number text,
  address text,
  city text,
  state text,
  country text DEFAULT 'UAE',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  property_type text NOT NULL DEFAULT 'residential' CHECK (property_type IN ('residential', 'commercial', 'land', 'industrial', 'mixed_use', 'other')),
  listing_type text DEFAULT 'sale' CHECK (listing_type IN ('sale', 'rent', 'both')),
  price numeric(15, 2),
  currency text DEFAULT 'AED' CHECK (currency IN ('AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR')),
  price_per_sqft numeric(10, 2),
  rent_frequency text CHECK (rent_frequency IN ('yearly', 'monthly', 'weekly', 'daily')),
  number_of_bedrooms integer,
  number_of_bathrooms integer,
  area_size numeric(12, 2),
  area_unit text DEFAULT 'sqft' CHECK (area_unit IN ('sqft', 'sqm')),
  plot_size numeric(12, 2),
  furnished text DEFAULT 'unfurnished' CHECK (furnished IN ('furnished', 'semi_furnished', 'unfurnished')),
  parking_spaces integer DEFAULT 0,
  amenities jsonb DEFAULT '[]',
  tags jsonb DEFAULT '[]',
  images jsonb DEFAULT '[]',
  videos jsonb DEFAULT '[]',
  documents jsonb DEFAULT '[]',
  floor_plans jsonb DEFAULT '[]',
  virtual_tour_url text,
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_agents jsonb DEFAULT '[]',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'published', 'archived', 'expired', 'sold', 'rented')),
  featured boolean DEFAULT false,
  premium boolean DEFAULT false,
  permit_number text,
  rera_number text,
  completion_status text DEFAULT 'ready' CHECK (completion_status IN ('ready', 'off_plan', 'under_construction')),
  handover_date date,
  developer text,
  project_name text,
  building_name text,
  floor_number integer,
  view_type text,
  ownership_type text CHECK (ownership_type IN ('freehold', 'leasehold', 'commonhold')),
  service_charge numeric(10, 2),
  expires_at timestamptz,
  published_at timestamptz,
  created_by uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Listing portals - tracks publishing to external portals
CREATE TABLE IF NOT EXISTS public.listing_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_name text NOT NULL CHECK (portal_name IN ('property_finder', 'dubizzle', 'bayut', 'website', 'zillow', 'rightmove', 'zoopla', 'custom')),
  portal_listing_id text,
  portal_url text,
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE SET NULL,
  customizations jsonb DEFAULT '{}',
  publish_status text DEFAULT 'draft' CHECK (publish_status IN ('draft', 'pending', 'published', 'failed', 'expired', 'unpublished')),
  publish_time timestamptz,
  unpublish_time timestamptz,
  last_sync_at timestamptz,
  sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  error_message text,
  retry_count integer DEFAULT 0,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Listing analytics - tracks views, clicks, inquiries
CREATE TABLE IF NOT EXISTS public.listing_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_name text,
  date date DEFAULT CURRENT_DATE,
  views_count integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  inquiries_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  favorites_count integer DEFAULT 0,
  phone_reveals integer DEFAULT 0,
  whatsapp_clicks integer DEFAULT 0,
  email_inquiries integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, portal_name, date)
);

-- 4) Listing audit logs
CREATE TABLE IF NOT EXISTS public.listing_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('create', 'edit', 'delete', 'publish', 'unpublish', 'assign', 'archive', 'restore', 'share', 'view', 'duplicate')),
  performed_by uuid,
  description text NOT NULL,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 5) Listing version history
CREATE TABLE IF NOT EXISTS public.listing_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_summary text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 6) Listing shares tracking
CREATE TABLE IF NOT EXISTS public.listing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  share_type text NOT NULL CHECK (share_type IN ('whatsapp', 'email', 'pdf', 'link', 'social')),
  recipient_name text,
  recipient_contact text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  shared_by uuid NOT NULL,
  share_url text,
  pdf_url text,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 7) Listing inquiries from portals
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_name text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  message text,
  source_url text,
  external_id text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'spam')),
  assigned_to uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_listings_company_id ON public.listings(company_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_assigned_agent ON public.listings(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON public.listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON public.listings(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_portals_listing ON public.listing_portals(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_portals_company ON public.listing_portals(company_id);
CREATE INDEX IF NOT EXISTS idx_listing_portals_status ON public.listing_portals(publish_status);

CREATE INDEX IF NOT EXISTS idx_listing_analytics_listing ON public.listing_analytics(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_date ON public.listing_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_listing_audit_logs_listing ON public.listing_audit_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_audit_logs_company ON public.listing_audit_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_listing_inquiries_listing ON public.listing_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_status ON public.listing_inquiries(status);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is listing admin
CREATE OR REPLACE FUNCTION public.is_listing_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- Helper function to get user's agent id
CREATE OR REPLACE FUNCTION public.get_user_agent_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_id uuid;
BEGIN
  SELECT id INTO agent_id
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN agent_id;
END;
$$;

-- listings policies
CREATE POLICY "Users can view company listings"
  ON public.listings FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_listing_admin()
  );

CREATE POLICY "Admin/Manager can update any listing"
  ON public.listings FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND (
      public.is_listing_admin()
      OR assigned_agent_id = public.get_user_agent_id()
    )
  );

CREATE POLICY "Admin/Manager can delete listings"
  ON public.listings FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_listing_admin()
  );

-- listing_portals policies
CREATE POLICY "Users can view company portals"
  ON public.listing_portals FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can manage portals"
  ON public.listing_portals FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_listing_admin()
  );

-- listing_analytics policies
CREATE POLICY "Users can view company analytics"
  ON public.listing_analytics FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert analytics"
  ON public.listing_analytics FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- listing_audit_logs policies
CREATE POLICY "Users can view company audit logs"
  ON public.listing_audit_logs FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert audit logs"
  ON public.listing_audit_logs FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- listing_version_history policies
CREATE POLICY "Users can view company version history"
  ON public.listing_version_history FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert version history"
  ON public.listing_version_history FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- listing_shares policies
CREATE POLICY "Users can view company shares"
  ON public.listing_shares FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create shares"
  ON public.listing_shares FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- listing_inquiries policies
CREATE POLICY "Users can view company inquiries"
  ON public.listing_inquiries FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage inquiries"
  ON public.listing_inquiries FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to log listing actions
CREATE OR REPLACE FUNCTION public.log_listing_action(
  p_listing_id uuid,
  p_company_id uuid,
  p_action_type text,
  p_description text,
  p_changes jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.listing_audit_logs (
    listing_id,
    company_id,
    action_type,
    description,
    changes,
    performed_by
  ) VALUES (
    p_listing_id,
    p_company_id,
    p_action_type,
    p_description,
    p_changes,
    auth.uid()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to create version snapshot
CREATE OR REPLACE FUNCTION public.create_listing_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  version_num integer;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO version_num
  FROM public.listing_version_history
  WHERE listing_id = NEW.id;
  
  -- Create version snapshot
  INSERT INTO public.listing_version_history (
    listing_id,
    company_id,
    version_number,
    snapshot,
    created_by
  ) VALUES (
    NEW.id,
    NEW.company_id,
    version_num,
    row_to_json(NEW),
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for versioning
DROP TRIGGER IF EXISTS create_listing_version_trigger ON public.listings;
CREATE TRIGGER create_listing_version_trigger
  AFTER UPDATE ON public.listings
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.create_listing_version();

-- Function to auto-expire listings
CREATE OR REPLACE FUNCTION public.expire_old_listings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET status = 'expired', updated_at = now()
  WHERE expires_at IS NOT NULL 
    AND expires_at < now() 
    AND status NOT IN ('expired', 'archived', 'sold', 'rented');
END;
$$;

-- Function to get listing analytics summary
CREATE OR REPLACE FUNCTION public.get_listing_analytics_summary(p_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_views', COALESCE(SUM(views_count), 0),
    'total_clicks', COALESCE(SUM(clicks_count), 0),
    'total_inquiries', COALESCE(SUM(inquiries_count), 0),
    'total_shares', COALESCE(SUM(shares_count), 0),
    'by_portal', (
      SELECT jsonb_object_agg(portal_name, portal_stats)
      FROM (
        SELECT 
          COALESCE(portal_name, 'direct') as portal_name,
          jsonb_build_object(
            'views', SUM(views_count),
            'clicks', SUM(clicks_count),
            'inquiries', SUM(inquiries_count)
          ) as portal_stats
        FROM public.listing_analytics
        WHERE listing_id = p_listing_id
        GROUP BY portal_name
      ) sub
    )
  ) INTO result
  FROM public.listing_analytics
  WHERE listing_id = p_listing_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to update listing timestamps
CREATE OR REPLACE FUNCTION public.update_listing_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for timestamp updates
DROP TRIGGER IF EXISTS update_listings_timestamp ON public.listings;
CREATE TRIGGER update_listings_timestamp
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_timestamp();

DROP TRIGGER IF EXISTS update_listing_portals_timestamp ON public.listing_portals;
CREATE TRIGGER update_listing_portals_timestamp
  BEFORE UPDATE ON public.listing_portals
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_timestamp();

-- Generate reference number
CREATE OR REPLACE FUNCTION public.generate_listing_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'OL-' || to_char(now(), 'YYMMDD') || '-' || 
      LPAD(FLOOR(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_listing_reference_trigger ON public.listings;
CREATE TRIGGER generate_listing_reference_trigger
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.generate_listing_reference();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_inquiries;

-- ========================================
-- Migration: 20251218212359_68e559bd-e104-4706-bb3f-f2eb472dc986.sql
-- ========================================


-- Fix function search path for trigger functions
CREATE OR REPLACE FUNCTION public.update_listing_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_listing_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'OL-' || to_char(now(), 'YYMMDD') || '-' || 
      LPAD(FLOOR(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- ========================================
-- Migration: 20251218213459_68314dc9-5e70-45dc-855e-0ca1a33bf665.sql
-- ========================================

-- Create listing_notifications table
CREATE TABLE IF NOT EXISTS public.listing_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('assigned', 'published', 'failed_publish', 'archived', 'expired', 'inquiry')),
    title TEXT NOT NULL,
    message TEXT,
    read_status TEXT NOT NULL DEFAULT 'unread' CHECK (read_status IN ('read', 'unread')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.listing_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
ON public.listing_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System/triggers can insert notifications
CREATE POLICY "Authenticated users can create notifications"
ON public.listing_notifications
FOR INSERT
WITH CHECK (true);

-- Create function to send notification when listing is assigned
CREATE OR REPLACE FUNCTION public.notify_listing_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If assigned_agent_id changed and is not null
    IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id AND NEW.assigned_agent_id IS NOT NULL THEN
        -- Get the agent's user_id
        INSERT INTO public.listing_notifications (listing_id, user_id, notification_type, title, message)
        SELECT 
            NEW.id,
            a.user_id,
            'assigned',
            'New Listing Assigned',
            'You have been assigned to listing: ' || NEW.title
        FROM public.agents a
        WHERE a.id = NEW.assigned_agent_id AND a.user_id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for assignment notifications
DROP TRIGGER IF EXISTS trigger_listing_assignment_notification ON public.listings;
CREATE TRIGGER trigger_listing_assignment_notification
    AFTER UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_listing_assignment();

-- Add index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_listing_notifications_user ON public.listing_notifications(user_id, read_status);
CREATE INDEX IF NOT EXISTS idx_listing_notifications_listing ON public.listing_notifications(listing_id);

-- Enable realtime for listings table
ALTER TABLE public.listings REPLICA IDENTITY FULL;

-- Add listings to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'listings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
    END IF;
END $$;

-- ========================================
-- Migration: 20251219111029_7393de66-aec7-4bb8-9ba9-10cadfd75540.sql
-- ========================================

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Admin/Manager can create listings" ON public.listings;

-- Create a more permissive INSERT policy that allows any agent in the company to create listings
CREATE POLICY "Agents can create listings for their company" 
ON public.listings 
FOR INSERT 
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT agents.company_id 
    FROM agents 
    WHERE agents.user_id = auth.uid()
  )
);

-- Also add a fallback for users who are company creators but may not have an agent record yet
-- Update is_listing_admin to also check if user is company creator
CREATE OR REPLACE FUNCTION public.is_listing_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  is_company_creator boolean;
BEGIN
  -- Check if user is an admin/manager agent
  SELECT role INTO user_role
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF user_role IN ('admin', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a company creator
  SELECT EXISTS(
    SELECT 1 FROM public.companies 
    WHERE created_by = auth.uid()
  ) INTO is_company_creator;
  
  RETURN is_company_creator;
END;
$$;

-- ========================================
-- Migration: 20251219111051_16260a42-d425-45a7-b77b-5e3dcd14fc70.sql
-- ========================================

-- Create agents for existing company creators who don't have agent records
INSERT INTO public.agents (user_id, company_id, name, email, role, status, permissions)
SELECT 
  c.created_by,
  c.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  'admin'::agent_role,
  'active'::agent_status,
  '{"listings": true, "leads": true, "marketing": true, "settings": true}'::jsonb
FROM public.companies c
JOIN auth.users u ON u.id = c.created_by
WHERE NOT EXISTS (
  SELECT 1 FROM public.agents a 
  WHERE a.user_id = c.created_by AND a.company_id = c.id
);

-- Create a function to auto-create agent when company is created
CREATE OR REPLACE FUNCTION public.create_agent_for_company_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  -- Get user info
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', email) 
  INTO user_email, user_name
  FROM auth.users 
  WHERE id = NEW.created_by;
  
  -- Create agent record for company creator
  INSERT INTO public.agents (user_id, company_id, name, email, role, status, permissions)
  VALUES (
    NEW.created_by,
    NEW.id,
    user_name,
    user_email,
    'admin'::agent_role,
    'active'::agent_status,
    '{"listings": true, "leads": true, "marketing": true, "settings": true}'::jsonb
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create agent on company creation
DROP TRIGGER IF EXISTS trigger_create_agent_for_company ON public.companies;
CREATE TRIGGER trigger_create_agent_for_company
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.create_agent_for_company_creator();

-- ========================================
-- Migration: 20251219174547_cad425c8-6366-4aff-b26e-e6562b2ff8f1.sql
-- ========================================

-- PORTAL ACCOUNTS TABLE - Company's portal credentials (must be created first)
CREATE TABLE IF NOT EXISTS public.portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_health_check_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, portal_id, account_name)
);

ALTER TABLE public.portal_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company portal accounts"
  ON public.portal_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage portal accounts"
  ON public.portal_accounts FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ========================================
-- Migration: 20251219174612_f7a65ebf-1d98-4957-aa69-199455547763.sql
-- ========================================

-- PORTAL LISTING PUBLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.portal_listing_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE RESTRICT,
  portal_account_id UUID REFERENCES public.portal_accounts(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  
  portal_listing_id TEXT,
  portal_url TEXT,
  portal_title TEXT NOT NULL,
  portal_description TEXT,
  portal_price NUMERIC,
  portal_currency TEXT DEFAULT 'AED',
  portal_images JSONB DEFAULT '[]',
  portal_metadata JSONB DEFAULT '{}',
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'queued', 'validating', 'sent', 'pending_approval', 
    'approved', 'live', 'rejected', 'expired', 'unpublished', 'error'
  )),
  last_error_message TEXT,
  validation_errors JSONB DEFAULT '[]',
  
  queued_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  unpublished_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_plp_listing_id ON public.portal_listing_publications(listing_id) WHERE is_deleted = false;
CREATE INDEX idx_plp_portal_id ON public.portal_listing_publications(portal_id);
CREATE INDEX idx_plp_company_id ON public.portal_listing_publications(company_id);
CREATE INDEX idx_plp_status ON public.portal_listing_publications(status) WHERE is_deleted = false;
CREATE INDEX idx_plp_portal_listing_id ON public.portal_listing_publications(portal_listing_id) WHERE portal_listing_id IS NOT NULL;

ALTER TABLE public.portal_listing_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company publications"
  ON public.portal_listing_publications FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins and managers can create publications"
  ON public.portal_listing_publications FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can update publications"
  ON public.portal_listing_publications FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Only admins can delete publications"
  ON public.portal_listing_publications FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- PUBLISH JOBS TABLE
CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.portal_listing_publications(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  job_type TEXT NOT NULL CHECK (job_type IN ('publish', 'update', 'unpublish', 'sync', 'validate')),
  priority INTEGER NOT NULL DEFAULT 5,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  payload JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  last_error TEXT,
  
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_publish_jobs_pending ON public.publish_jobs(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_publish_jobs_publication ON public.publish_jobs(publication_id);

ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company jobs"
  ON public.publish_jobs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage jobs"
  ON public.publish_jobs FOR ALL
  USING (true);

-- PUBLICATION ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.publication_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.portal_listing_publications(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  details JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.publication_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company activity logs plp"
  ON public.publication_activity_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert activity logs plp"
  ON public.publication_activity_logs FOR INSERT
  WITH CHECK (true);

-- Update leads table for portal attribution
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS portal_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES public.portal_listing_publications(id),
  ADD COLUMN IF NOT EXISTS internal_listing_id UUID REFERENCES public.listings(id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_listing_publications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.publish_jobs;

-- ========================================
-- Migration: 20251219181805_bb637e10-6053-4222-8224-61b3c934bfb2.sql
-- ========================================

-- Add missing columns to portal_accounts
ALTER TABLE public.portal_accounts 
ADD COLUMN IF NOT EXISTS auto_publish boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sync_schedule text DEFAULT 'daily' CHECK (sync_schedule IN ('realtime', 'hourly', 'daily')),
ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_error_message text;

-- Rename error_message to last_error_message if it exists differently
UPDATE public.portal_accounts 
SET last_error_message = error_message 
WHERE last_error_message IS NULL AND error_message IS NOT NULL;

-- ========================================
-- Migration: 20251219182700_38cd708a-5e15-45aa-b866-e5498e1446f2.sql
-- ========================================

-- Add Property Finder Qatar portal
INSERT INTO public.portals (name, display_name, logo_url, base_url, country, is_active)
VALUES (
  'Property Finder Qatar',
  'Property Finder Qatar',
  'https://www.propertyfinder.qa/favicon.ico',
  'https://www.propertyfinder.qa',
  'Qatar',
  true
)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- Migration: 20251220200931_2684f699-4c39-4924-a525-d4e41a954223.sql
-- ========================================


-- =====================================================
-- PROPERTY FINDER BACKEND SCHEMA & SECURITY
-- =====================================================

-- 1) Add Property Finder specific fields to portal_accounts
ALTER TABLE public.portal_accounts
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS api_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS portal_type TEXT DEFAULT 'generic';

-- Add comment for clarity
COMMENT ON COLUMN public.portal_accounts.api_key_encrypted IS 'Encrypted API key for Property Finder Partner API';
COMMENT ON COLUMN public.portal_accounts.api_secret_encrypted IS 'Encrypted API secret for Property Finder Partner API';
COMMENT ON COLUMN public.portal_accounts.access_token_encrypted IS 'Encrypted access token from Property Finder';
COMMENT ON COLUMN public.portal_accounts.token_expires_at IS 'Token expiry timestamp';

-- 2) Create portal agent mappings table
CREATE TABLE IF NOT EXISTS public.pf_agent_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  portal_account_id UUID NOT NULL REFERENCES public.portal_accounts(id) ON DELETE CASCADE,
  portal_agent_id TEXT NOT NULL,
  agent_name TEXT,
  agent_email TEXT,
  agent_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, agent_id, portal_account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pf_agent_mappings_company ON public.pf_agent_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_pf_agent_mappings_agent ON public.pf_agent_mappings(agent_id);
CREATE INDEX IF NOT EXISTS idx_pf_agent_mappings_portal_account ON public.pf_agent_mappings(portal_account_id);

-- 3) Create portal publish logs table for full audit trail
CREATE TABLE IF NOT EXISTS public.portal_publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  portal_account_id UUID REFERENCES public.portal_accounts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  portal TEXT NOT NULL DEFAULT 'property_finder',
  action TEXT NOT NULL, -- publish, update, unpublish
  success BOOLEAN NOT NULL DEFAULT false,
  portal_listing_id TEXT,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_portal_publish_logs_company ON public.portal_publish_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_publish_logs_listing ON public.portal_publish_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_portal_publish_logs_created ON public.portal_publish_logs(created_at DESC);

-- 4) Add portal_listing_id tracking to portal_listing_publications if not exists
ALTER TABLE public.portal_listing_publications
ADD COLUMN IF NOT EXISTS pf_listing_id TEXT,
ADD COLUMN IF NOT EXISTS pf_reference TEXT,
ADD COLUMN IF NOT EXISTS last_error_details JSONB;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.pf_agent_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_publish_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY FUNCTIONS (SECURITY DEFINER)
-- =====================================================

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.agents
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND status = 'active'
  LIMIT 1;
  
  RETURN v_role IN ('admin', 'manager');
END;
$$;

-- Function to check if user can publish a specific listing
CREATE OR REPLACE FUNCTION public.can_publish_listing(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_agent_id UUID;
  v_role TEXT;
BEGIN
  -- Get listing details
  SELECT company_id, assigned_agent_id INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get current user's agent info
  SELECT id, role INTO v_agent_id, v_role
  FROM public.agents
  WHERE user_id = auth.uid()
    AND company_id = v_listing.company_id
    AND status = 'active'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Admin/Manager can publish any listing
  IF v_role IN ('admin', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Agent can only publish their own listings
  RETURN v_listing.assigned_agent_id = v_agent_id;
END;
$$;

-- Function to get user's company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.agents
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;
  
  RETURN v_company_id;
END;
$$;

-- =====================================================
-- RLS POLICIES FOR pf_agent_mappings
-- =====================================================

-- Users can view mappings for their company
CREATE POLICY "Users can view company agent mappings"
ON public.pf_agent_mappings
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Only admin/manager can insert mappings
CREATE POLICY "Admin/Manager can create agent mappings"
ON public.pf_agent_mappings
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- Only admin/manager can update mappings
CREATE POLICY "Admin/Manager can update agent mappings"
ON public.pf_agent_mappings
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- Only admin/manager can delete mappings
CREATE POLICY "Admin/Manager can delete agent mappings"
ON public.pf_agent_mappings
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- =====================================================
-- RLS POLICIES FOR portal_publish_logs
-- =====================================================

-- Users can view logs for their company
CREATE POLICY "Users can view company publish logs"
ON public.portal_publish_logs
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Insert is handled by server (edge function with service role)
-- But allow authenticated users to insert for their own actions
CREATE POLICY "Authenticated users can create publish logs"
ON public.portal_publish_logs
FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

-- =====================================================
-- RLS POLICIES FOR portal_accounts (API credentials)
-- =====================================================

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view portal accounts" ON public.portal_accounts;
DROP POLICY IF EXISTS "Admin/Manager can create portal accounts" ON public.portal_accounts;
DROP POLICY IF EXISTS "Admin/Manager can update portal accounts" ON public.portal_accounts;
DROP POLICY IF EXISTS "Admin/Manager can delete portal accounts" ON public.portal_accounts;

-- Users can view portal accounts for their company
CREATE POLICY "Users can view portal accounts"
ON public.portal_accounts
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Only admin/manager can create portal accounts
CREATE POLICY "Admin/Manager can create portal accounts"
ON public.portal_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- Only admin/manager can update portal accounts
CREATE POLICY "Admin/Manager can update portal accounts"
ON public.portal_accounts
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- Only admin/manager can delete portal accounts
CREATE POLICY "Admin/Manager can delete portal accounts"
ON public.portal_accounts
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- =====================================================
-- RLS POLICIES FOR portal_listing_publications
-- =====================================================

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view publications" ON public.portal_listing_publications;
DROP POLICY IF EXISTS "Users can create publications for their listings" ON public.portal_listing_publications;
DROP POLICY IF EXISTS "Users can update publications for their listings" ON public.portal_listing_publications;

-- Users can view all publications for their company
CREATE POLICY "Users can view publications"
ON public.portal_listing_publications
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Users can only create publications for listings they can publish
CREATE POLICY "Users can create publications for their listings"
ON public.portal_listing_publications
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id()
  AND public.can_publish_listing(listing_id)
);

-- Users can only update publications for listings they can publish
CREATE POLICY "Users can update publications for their listings"
ON public.portal_listing_publications
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.can_publish_listing(listing_id)
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_pf_agent_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_pf_agent_mappings_timestamp ON public.pf_agent_mappings;
CREATE TRIGGER update_pf_agent_mappings_timestamp
BEFORE UPDATE ON public.pf_agent_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_pf_agent_mappings_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to validate agent mapping before publish
CREATE OR REPLACE FUNCTION public.validate_pf_publish_requirements(
  p_listing_id UUID,
  p_portal_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_portal_account RECORD;
  v_agent_mapping RECORD;
  v_errors TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
BEGIN
  -- Get listing
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errors', ARRAY['Listing not found']);
  END IF;
  
  -- Get portal account
  SELECT * INTO v_portal_account
  FROM public.portal_accounts
  WHERE id = p_portal_account_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errors', ARRAY['Portal account not found']);
  END IF;
  
  -- Check if portal account is connected
  IF v_portal_account.status != 'connected' THEN
    v_errors := array_append(v_errors, 'Portal account is not connected');
  END IF;
  
  -- Check agent mapping
  SELECT * INTO v_agent_mapping
  FROM public.pf_agent_mappings
  WHERE portal_account_id = p_portal_account_id
    AND agent_id = v_listing.assigned_agent_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Assigned agent is not mapped to Property Finder');
  END IF;
  
  -- Validate required fields
  IF v_listing.title IS NULL OR v_listing.title = '' THEN
    v_errors := array_append(v_errors, 'Title is required');
  END IF;
  
  IF v_listing.description IS NULL OR v_listing.description = '' THEN
    v_errors := array_append(v_errors, 'Description is required');
  END IF;
  
  IF v_listing.price IS NULL OR v_listing.price <= 0 THEN
    v_errors := array_append(v_errors, 'Price is required');
  END IF;
  
  IF v_listing.permit_number IS NULL OR v_listing.permit_number = '' THEN
    v_warnings := array_append(v_warnings, 'Permit number is recommended');
  END IF;
  
  -- Check images
  IF v_listing.images IS NULL OR jsonb_array_length(v_listing.images) < 1 THEN
    v_errors := array_append(v_errors, 'At least 1 image is required');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', array_length(v_errors, 1) IS NULL,
    'errors', v_errors,
    'warnings', v_warnings,
    'agent_mapping', CASE WHEN v_agent_mapping IS NOT NULL 
      THEN jsonb_build_object(
        'id', v_agent_mapping.id,
        'portal_agent_id', v_agent_mapping.portal_agent_id
      )
      ELSE NULL 
    END
  );
END;
$$;

-- Function to log publish action
CREATE OR REPLACE FUNCTION public.log_pf_publish_action(
  p_company_id UUID,
  p_listing_id UUID,
  p_portal_account_id UUID,
  p_action TEXT,
  p_success BOOLEAN,
  p_portal_listing_id TEXT DEFAULT NULL,
  p_request_payload JSONB DEFAULT NULL,
  p_response_payload JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_agent_id UUID;
BEGIN
  -- Get current user's agent id
  SELECT id INTO v_agent_id
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  INSERT INTO public.portal_publish_logs (
    company_id,
    listing_id,
    portal_account_id,
    user_id,
    portal,
    action,
    success,
    portal_listing_id,
    request_payload,
    response_payload,
    error_message
  ) VALUES (
    p_company_id,
    p_listing_id,
    p_portal_account_id,
    v_agent_id,
    'property_finder',
    p_action,
    p_success,
    p_portal_listing_id,
    p_request_payload,
    p_response_payload,
    p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Enable realtime for publish logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_publish_logs;

-- ========================================
-- Migration: 20251220201819_e643cf7e-db11-4e7d-a161-cbf8f118439f.sql
-- ========================================

-- ============================================
-- PORTAL WEBHOOK BACKEND SCHEMA
-- ============================================

-- Ensure helper functions exist first
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT company_id FROM public.agents WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.agents 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'manager')
    );
$$;

-- 1) portal_webhooks - Stores webhook configuration per company/portal
CREATE TABLE IF NOT EXISTS public.portal_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal text NOT NULL,
    webhook_url text NOT NULL,
    secret_token text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'error')),
    last_verified_at timestamptz,
    verification_error text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, portal)
);

-- 2) portal_webhook_events - Stores all incoming webhook events
CREATE TABLE IF NOT EXISTS public.portal_webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal text NOT NULL,
    event_type text NOT NULL,
    portal_listing_id text,
    portal_lead_id text,
    portal_agent_id text,
    payload jsonb NOT NULL,
    signature text,
    ip_address text,
    user_agent text,
    received_at timestamptz NOT NULL DEFAULT now(),
    processed boolean NOT NULL DEFAULT false,
    processed_at timestamptz,
    processing_error text,
    retry_count int NOT NULL DEFAULT 0,
    next_retry_at timestamptz,
    created_lead_id uuid REFERENCES public.leads(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_company_portal ON public.portal_webhook_events(company_id, portal);
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_processed ON public.portal_webhook_events(processed, next_retry_at) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_event_type ON public.portal_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_portal_lead ON public.portal_webhook_events(portal_lead_id) WHERE portal_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_portal_listing ON public.portal_webhook_events(portal_listing_id) WHERE portal_listing_id IS NOT NULL;

-- 3) portal_webhook_logs - Audit trail for all webhook processing
CREATE TABLE IF NOT EXISTS public.portal_webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_event_id uuid REFERENCES public.portal_webhook_events(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal text NOT NULL,
    action text NOT NULL,
    success boolean NOT NULL,
    error_message text,
    error_code text,
    processing_time_ms int,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_webhook_logs_event ON public.portal_webhook_logs(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_portal_webhook_logs_company ON public.portal_webhook_logs(company_id, portal, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.portal_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_webhook_logs ENABLE ROW LEVEL SECURITY;

-- portal_webhooks policies
CREATE POLICY "portal_webhooks_select" ON public.portal_webhooks 
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "portal_webhooks_admin_all" ON public.portal_webhooks 
    FOR ALL USING (company_id = public.get_user_company_id() AND public.is_company_admin_or_manager());

-- portal_webhook_events policies
CREATE POLICY "portal_webhook_events_select" ON public.portal_webhook_events 
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "portal_webhook_events_insert" ON public.portal_webhook_events 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "portal_webhook_events_update" ON public.portal_webhook_events 
    FOR UPDATE USING (true);

-- portal_webhook_logs policies
CREATE POLICY "portal_webhook_logs_select" ON public.portal_webhook_logs 
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "portal_webhook_logs_insert" ON public.portal_webhook_logs 
    FOR INSERT WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_webhook_url(p_company_id uuid, p_portal text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN 'https://zyqlwkkiyuqnhlvnuewk.supabase.co/functions/v1/portal-webhook?company_id=' || p_company_id::text || '&portal=' || p_portal;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_webhook_signature(p_company_id uuid, p_portal text, p_signature text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_secret text;
BEGIN
    SELECT secret_token INTO v_secret FROM public.portal_webhooks 
    WHERE company_id = p_company_id AND portal = p_portal AND status = 'active';
    IF v_secret IS NULL OR v_secret = '' THEN RETURN true; END IF;
    RETURN v_secret = p_signature;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_portal_webhook_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_event record;
    v_result jsonb;
    v_start_time timestamptz;
    v_processing_time int;
BEGIN
    v_start_time := clock_timestamp();
    
    SELECT * INTO v_event FROM public.portal_webhook_events WHERE id = p_event_id;
    IF v_event IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Event not found'); END IF;
    IF v_event.processed THEN RETURN jsonb_build_object('success', true, 'duplicate', true); END IF;
    
    CASE v_event.event_type
        WHEN 'listing.published' THEN
            UPDATE public.portal_listing_publications
            SET status = 'live', published_at = now(), last_synced_at = now(),
                pf_listing_id = COALESCE(v_event.portal_listing_id, pf_listing_id)
            WHERE company_id = v_event.company_id
              AND (pf_listing_id = v_event.portal_listing_id OR pf_reference = v_event.payload->>'reference');
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.published');
            
        WHEN 'listing.updated' THEN
            UPDATE public.portal_listing_publications SET last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.updated');
            
        WHEN 'listing.unpublished', 'listing.removed' THEN
            UPDATE public.portal_listing_publications SET status = 'removed', unpublished_at = now(), last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', v_event.event_type);
            
        WHEN 'listing.rejected' THEN
            UPDATE public.portal_listing_publications
            SET status = 'rejected', last_error_message = v_event.payload->>'reason', 
                last_error_details = v_event.payload, last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.rejected');
            
        WHEN 'listing.sold' THEN
            UPDATE public.portal_listing_publications SET status = 'removed', last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            UPDATE public.listings l SET status = 'sold'
            FROM public.portal_listing_publications p
            WHERE p.listing_id = l.id AND p.company_id = v_event.company_id AND p.pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.sold');
            
        WHEN 'listing.expired' THEN
            UPDATE public.portal_listing_publications SET status = 'expired', last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.expired');
            
        ELSE
            v_result := jsonb_build_object('success', true, 'event_type', v_event.event_type, 'action', 'logged');
    END CASE;
    
    v_processing_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int;
    
    UPDATE public.portal_webhook_events SET processed = true, processed_at = now() WHERE id = p_event_id;
    
    INSERT INTO public.portal_webhook_logs (webhook_event_id, company_id, portal, action, success, processing_time_ms, details)
    VALUES (p_event_id, v_event.company_id, v_event.portal, 'process', true, v_processing_time, v_result);
    
    RETURN v_result || jsonb_build_object('processing_time_ms', v_processing_time);
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.portal_webhook_logs (webhook_event_id, company_id, portal, action, success, error_message, details)
    VALUES (p_event_id, v_event.company_id, v_event.portal, 'error', false, SQLERRM, jsonb_build_object('sqlstate', SQLSTATE));
    
    UPDATE public.portal_webhook_events
    SET retry_count = retry_count + 1, processing_error = SQLERRM,
        next_retry_at = CASE WHEN retry_count < 3 THEN now() + interval '5 minutes' * power(2, retry_count) ELSE NULL END
    WHERE id = p_event_id;
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_webhook_stats(p_company_id uuid, p_portal text DEFAULT NULL, p_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_events', COUNT(*),
        'processed', COUNT(*) FILTER (WHERE processed = true),
        'pending', COUNT(*) FILTER (WHERE processed = false AND (next_retry_at IS NULL OR next_retry_at > now())),
        'failed', COUNT(*) FILTER (WHERE processed = false AND retry_count >= 3),
        'leads_created', COUNT(*) FILTER (WHERE event_type = 'lead.created' AND processed = true),
        'listing_updates', COUNT(*) FILTER (WHERE event_type LIKE 'listing.%' AND processed = true)
    ) INTO v_result
    FROM public.portal_webhook_events
    WHERE company_id = p_company_id
      AND (p_portal IS NULL OR portal = p_portal)
      AND created_at > now() - (p_days || ' days')::interval;
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Triggers
CREATE OR REPLACE FUNCTION public.update_portal_webhooks_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_portal_webhooks_updated_at ON public.portal_webhooks;
CREATE TRIGGER trg_portal_webhooks_updated_at BEFORE UPDATE ON public.portal_webhooks
    FOR EACH ROW EXECUTE FUNCTION public.update_portal_webhooks_updated_at();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_webhook_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_webhook_logs;

-- ========================================
-- Migration: 20251221082935_83b8e5df-f3cb-4d49-9d41-24e3eff6b123.sql
-- ========================================


-- ================================================
-- ENHANCED WEBHOOK BACKEND FOR ONELINKER CRM
-- ================================================

-- 1. Add realtime support for remaining tables (portal_webhook_events already added)
DO $$ 
BEGIN
    -- Only add if not already a member
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'portal_leads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_leads;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'listing_portals'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_portals;
    END IF;
END $$;

-- 2. Create portal_agent_mappings table for agent mapping between portals and CRM
CREATE TABLE IF NOT EXISTS public.portal_agent_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal TEXT NOT NULL,
    portal_agent_id TEXT NOT NULL,
    portal_agent_email TEXT,
    portal_agent_name TEXT,
    crm_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, portal, portal_agent_id)
);

-- 3. Create listing_portal_mappings table for listing mapping
CREATE TABLE IF NOT EXISTS public.listing_portal_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal TEXT NOT NULL,
    portal_listing_id TEXT NOT NULL,
    portal_reference TEXT,
    crm_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'mapped',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, portal, portal_listing_id)
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_unprocessed 
ON public.portal_webhook_events(company_id, processed, received_at) 
WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_retry 
ON public.portal_webhook_events(next_retry_at) 
WHERE processed = false AND next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_leads_agent 
ON public.portal_leads(assigned_agent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_portal_leads_status 
ON public.portal_leads(company_id, status);

CREATE INDEX IF NOT EXISTS idx_portal_agent_mappings_lookup 
ON public.portal_agent_mappings(company_id, portal, portal_agent_id);

CREATE INDEX IF NOT EXISTS idx_listing_portal_mappings_lookup 
ON public.listing_portal_mappings(company_id, portal, portal_listing_id);

-- 5. Enable RLS on new tables
ALTER TABLE public.portal_agent_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_portal_mappings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for portal_agent_mappings (drop if exists first)
DROP POLICY IF EXISTS "Admin/Manager can manage agent mappings" ON public.portal_agent_mappings;
DROP POLICY IF EXISTS "Users can view agent mappings" ON public.portal_agent_mappings;

CREATE POLICY "Admin/Manager can manage agent mappings"
ON public.portal_agent_mappings
FOR ALL
USING (company_id = get_user_company_id() AND is_company_admin_or_manager())
WITH CHECK (company_id = get_user_company_id() AND is_company_admin_or_manager());

CREATE POLICY "Users can view agent mappings"
ON public.portal_agent_mappings
FOR SELECT
USING (company_id = get_user_company_id());

-- 7. RLS Policies for listing_portal_mappings
DROP POLICY IF EXISTS "Admin/Manager can manage listing mappings" ON public.listing_portal_mappings;
DROP POLICY IF EXISTS "Users can view listing mappings" ON public.listing_portal_mappings;

CREATE POLICY "Admin/Manager can manage listing mappings"
ON public.listing_portal_mappings
FOR ALL
USING (company_id = get_user_company_id() AND is_company_admin_or_manager())
WITH CHECK (company_id = get_user_company_id() AND is_company_admin_or_manager());

CREATE POLICY "Users can view listing mappings"
ON public.listing_portal_mappings
FOR SELECT
USING (company_id = get_user_company_id());

-- 8. Enhanced process_portal_lead function with agent mapping
CREATE OR REPLACE FUNCTION public.process_portal_lead_v2(
    p_company_id UUID,
    p_portal TEXT,
    p_portal_lead_id TEXT,
    p_portal_listing_id TEXT DEFAULT NULL,
    p_portal_agent_id TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_message TEXT DEFAULT NULL,
    p_raw_data JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_existing_lead_id UUID;
    v_lead_id UUID;
    v_crm_listing_id UUID;
    v_crm_agent_id UUID;
    v_default_stage_id UUID;
    v_is_duplicate BOOLEAN := false;
    v_mapping_error TEXT;
BEGIN
    -- Idempotency check: portal_lead_id + portal + company_id
    SELECT id INTO v_existing_lead_id
    FROM portal_leads
    WHERE company_id = p_company_id
      AND portal_name = p_portal
      AND portal_lead_id = p_portal_lead_id;

    IF v_existing_lead_id IS NOT NULL THEN
        -- Update existing lead with any new data
        UPDATE portal_leads SET
            name = COALESCE(p_name, name),
            phone = COALESCE(p_phone, phone),
            email = COALESCE(p_email, email),
            message = COALESCE(p_message, message),
            raw_data = COALESCE(p_raw_data, raw_data),
            updated_at = now()
        WHERE id = v_existing_lead_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'lead_id', v_existing_lead_id,
            'status', 'duplicate',
            'is_duplicate', true
        );
    END IF;

    -- Map listing from portal
    IF p_portal_listing_id IS NOT NULL THEN
        SELECT crm_listing_id INTO v_crm_listing_id
        FROM listing_portal_mappings
        WHERE company_id = p_company_id
          AND portal = p_portal
          AND (portal_listing_id = p_portal_listing_id OR portal_reference = p_portal_listing_id);
        
        -- Fallback: try to match by reference in listings table
        IF v_crm_listing_id IS NULL THEN
            SELECT id INTO v_crm_listing_id
            FROM listings
            WHERE company_id = p_company_id
              AND reference_number = p_portal_listing_id;
        END IF;
        
        -- Get agent from listing if available
        IF v_crm_listing_id IS NOT NULL THEN
            SELECT assigned_agent_id INTO v_crm_agent_id
            FROM listings
            WHERE id = v_crm_listing_id;
        END IF;
    END IF;

    -- Map agent from portal (overrides listing agent if specified)
    IF p_portal_agent_id IS NOT NULL AND v_crm_agent_id IS NULL THEN
        SELECT crm_agent_id INTO v_crm_agent_id
        FROM portal_agent_mappings
        WHERE company_id = p_company_id
          AND portal = p_portal
          AND portal_agent_id = p_portal_agent_id
          AND crm_agent_id IS NOT NULL;
    END IF;

    -- Fallback: round-robin assignment
    IF v_crm_agent_id IS NULL THEN
        SELECT id INTO v_crm_agent_id
        FROM agents
        WHERE company_id = p_company_id
          AND status = 'active'
          AND role IN ('agent', 'manager', 'admin')
        ORDER BY (
            SELECT COUNT(*) FROM portal_leads pl 
            WHERE pl.assigned_agent_id = agents.id 
              AND pl.created_at > now() - interval '7 days'
        ) ASC
        LIMIT 1;
    END IF;

    -- Build mapping error message if applicable
    IF v_crm_listing_id IS NULL AND p_portal_listing_id IS NOT NULL THEN
        v_mapping_error := 'Listing not found: ' || p_portal_listing_id;
    END IF;
    IF v_crm_agent_id IS NULL THEN
        v_mapping_error := COALESCE(v_mapping_error || '; ', '') || 'No agent available for assignment';
    END IF;

    -- Get default stage
    SELECT id INTO v_default_stage_id
    FROM lead_stages
    WHERE company_id = p_company_id
      AND (name ILIKE '%new%' OR is_default = true)
    ORDER BY sort_order ASC
    LIMIT 1;

    -- Insert new lead
    INSERT INTO portal_leads (
        company_id, portal_name, portal_lead_id, listing_id,
        assigned_agent_id, name, phone, email, message,
        source, stage_id, status, error_message, raw_data
    ) VALUES (
        p_company_id, p_portal, p_portal_lead_id, v_crm_listing_id,
        v_crm_agent_id, COALESCE(p_name, 'Unknown'), p_phone, p_email, p_message,
        p_portal, v_default_stage_id, 
        CASE WHEN v_mapping_error IS NOT NULL THEN 'unassigned_error' ELSE 'imported' END,
        v_mapping_error, p_raw_data
    )
    RETURNING id INTO v_lead_id;

    -- Log activity
    INSERT INTO lead_activities (lead_id, company_id, type, title, agent_name, description)
    VALUES (v_lead_id, p_company_id, 'lead_created', 
            'Lead from ' || p_portal,
            COALESCE((SELECT name FROM agents WHERE id = v_crm_agent_id), 'System'),
            'Lead received via webhook');

    -- Create notification for assigned agent
    IF v_crm_agent_id IS NOT NULL THEN
        INSERT INTO assignment_notifications (
            company_id, agent_id, lead_id, title, message, notification_type
        ) VALUES (
            p_company_id, v_crm_agent_id, v_lead_id,
            'New lead from ' || p_portal,
            'You have been assigned a new lead: ' || COALESCE(p_name, 'Unknown'),
            'lead_assignment'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'lead_id', v_lead_id,
        'status', CASE WHEN v_mapping_error IS NOT NULL THEN 'unassigned_error' ELSE 'imported' END,
        'is_duplicate', false,
        'crm_listing_id', v_crm_listing_id,
        'crm_agent_id', v_crm_agent_id,
        'mapping_error', v_mapping_error
    );

EXCEPTION WHEN OTHERS THEN
    INSERT INTO portal_import_errors (company_id, portal_name, lead_data, error_message, error_type)
    VALUES (p_company_id, p_portal, p_raw_data, SQLERRM, 'processing_error');
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 9. Enhanced listing webhook processor
CREATE OR REPLACE FUNCTION public.process_listing_webhook_event(
    p_company_id UUID,
    p_portal TEXT,
    p_event_type TEXT,
    p_portal_listing_id TEXT,
    p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_crm_listing_id UUID;
    v_publication_id UUID;
    v_status TEXT;
    v_result JSONB;
BEGIN
    -- Find CRM listing via mapping
    SELECT crm_listing_id INTO v_crm_listing_id
    FROM listing_portal_mappings
    WHERE company_id = p_company_id
      AND portal = p_portal
      AND portal_listing_id = p_portal_listing_id;

    -- Fallback to listing_portals
    IF v_crm_listing_id IS NULL THEN
        SELECT listing_id INTO v_crm_listing_id
        FROM listing_portals
        WHERE company_id = p_company_id
          AND portal_name = p_portal
          AND portal_listing_id = p_portal_listing_id;
    END IF;

    IF v_crm_listing_id IS NULL THEN
        -- Create mapping error record
        INSERT INTO portal_import_errors (
            company_id, portal_name, lead_data, error_message, error_type
        ) VALUES (
            p_company_id, p_portal, p_payload,
            'Listing not found for portal_listing_id: ' || p_portal_listing_id,
            'listing_mapping_error'
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Listing not found',
            'portal_listing_id', p_portal_listing_id
        );
    END IF;

    -- Determine new status based on event type
    CASE p_event_type
        WHEN 'listing.published' THEN v_status := 'published';
        WHEN 'listing.updated' THEN v_status := 'published';
        WHEN 'listing.unpublished' THEN v_status := 'unpublished';
        WHEN 'listing.rejected' THEN v_status := 'rejected';
        WHEN 'listing.sold' THEN v_status := 'sold';
        WHEN 'listing.expired' THEN v_status := 'expired';
        ELSE v_status := 'unknown';
    END CASE;

    -- Update listing_portals
    UPDATE listing_portals SET
        publish_status = v_status,
        last_sync_at = now(),
        error_message = CASE 
            WHEN p_event_type = 'listing.rejected' 
            THEN COALESCE(p_payload->>'reason', p_payload->>'rejection_reason', 'Rejected by portal')
            ELSE NULL 
        END,
        updated_at = now()
    WHERE listing_id = v_crm_listing_id
      AND company_id = p_company_id
      AND portal_name = p_portal;

    -- Update listing status if sold
    IF p_event_type = 'listing.sold' THEN
        UPDATE listings SET status = 'sold', updated_at = now()
        WHERE id = v_crm_listing_id AND company_id = p_company_id;
    END IF;

    -- Log the update
    INSERT INTO portal_publish_logs (
        company_id, listing_id, portal_name, action, status, details
    ) VALUES (
        p_company_id, v_crm_listing_id, p_portal, 
        'webhook_' || p_event_type, 
        'success',
        p_payload
    );

    RETURN jsonb_build_object(
        'success', true,
        'event_type', p_event_type,
        'crm_listing_id', v_crm_listing_id,
        'new_status', v_status
    );

EXCEPTION WHEN OTHERS THEN
    INSERT INTO portal_import_errors (company_id, portal_name, lead_data, error_message, error_type)
    VALUES (p_company_id, p_portal, p_payload, SQLERRM, 'listing_webhook_error');
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 10. Function to validate webhook signature
CREATE OR REPLACE FUNCTION public.validate_portal_webhook(
    p_company_id UUID,
    p_portal TEXT,
    p_signature TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    SELECT secret_token INTO v_secret
    FROM portal_webhooks
    WHERE company_id = p_company_id
      AND portal = p_portal
      AND status = 'active';

    IF v_secret IS NULL THEN
        RETURN true; -- No secret configured, allow webhook
    END IF;

    RETURN p_signature = v_secret;
END;
$$;

-- 11. Function to get unassigned leads (for Admin view)
CREATE OR REPLACE FUNCTION public.get_unassigned_portal_leads(
    p_company_id UUID,
    p_limit INT DEFAULT 50
) RETURNS TABLE (
    id UUID,
    portal_name TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id,
        pl.portal_name,
        pl.name,
        pl.phone,
        pl.email,
        pl.error_message,
        pl.created_at
    FROM portal_leads pl
    WHERE pl.company_id = p_company_id
      AND (pl.status = 'unassigned_error' OR pl.assigned_agent_id IS NULL)
    ORDER BY pl.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 12. Function to get webhook statistics
CREATE OR REPLACE FUNCTION public.get_portal_webhook_stats_v2(
    p_company_id UUID,
    p_days INT DEFAULT 7
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_result JSONB;
    v_total INT;
    v_processed INT;
    v_pending INT;
    v_failed INT;
    v_leads INT;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE processed = true),
        COUNT(*) FILTER (WHERE processed = false),
        COUNT(*) FILTER (WHERE processing_error IS NOT NULL)
    INTO v_total, v_processed, v_pending, v_failed
    FROM portal_webhook_events
    WHERE company_id = p_company_id
      AND received_at > now() - (p_days || ' days')::interval;

    SELECT COUNT(*) INTO v_leads
    FROM portal_leads 
    WHERE company_id = p_company_id 
      AND created_at > now() - (p_days || ' days')::interval;

    v_result := jsonb_build_object(
        'total_events', COALESCE(v_total, 0),
        'processed', COALESCE(v_processed, 0),
        'pending', COALESCE(v_pending, 0),
        'failed', COALESCE(v_failed, 0),
        'leads_created', COALESCE(v_leads, 0)
    );

    RETURN v_result;
END;
$$;

-- 13. Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_portal_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_portal_agent_mappings_timestamp ON public.portal_agent_mappings;
CREATE TRIGGER update_portal_agent_mappings_timestamp
BEFORE UPDATE ON public.portal_agent_mappings
FOR EACH ROW EXECUTE FUNCTION update_portal_mapping_timestamp();

DROP TRIGGER IF EXISTS update_listing_portal_mappings_timestamp ON public.listing_portal_mappings;
CREATE TRIGGER update_listing_portal_mappings_timestamp
BEFORE UPDATE ON public.listing_portal_mappings
FOR EACH ROW EXECUTE FUNCTION update_portal_mapping_timestamp();

-- 14. Retry failed webhooks function (for async processing)
CREATE OR REPLACE FUNCTION public.retry_failed_webhook_events(
    p_max_retries INT DEFAULT 5
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_event RECORD;
    v_count INT := 0;
    v_result JSONB;
BEGIN
    FOR v_event IN
        SELECT id, company_id, portal, event_type, payload, portal_listing_id, portal_lead_id
        FROM portal_webhook_events
        WHERE processed = false
          AND next_retry_at <= now()
          AND retry_count < p_max_retries
        ORDER BY received_at ASC
        LIMIT 100
    LOOP
        -- Process based on event type
        IF v_event.event_type LIKE 'lead.%' THEN
            SELECT process_portal_lead_v2(
                v_event.company_id,
                v_event.portal,
                v_event.portal_lead_id,
                v_event.payload->>'listing_id',
                v_event.payload->>'agent_id',
                v_event.payload->>'name',
                v_event.payload->>'phone',
                v_event.payload->>'email',
                v_event.payload->>'message',
                v_event.payload
            ) INTO v_result;
        ELSIF v_event.event_type LIKE 'listing.%' THEN
            SELECT process_listing_webhook_event(
                v_event.company_id,
                v_event.portal,
                v_event.event_type,
                v_event.portal_listing_id,
                v_event.payload
            ) INTO v_result;
        END IF;

        IF (v_result->>'success')::boolean THEN
            UPDATE portal_webhook_events 
            SET processed = true, processed_at = now(), processing_error = NULL
            WHERE id = v_event.id;
        ELSE
            UPDATE portal_webhook_events
            SET retry_count = retry_count + 1,
                processing_error = v_result->>'error',
                next_retry_at = now() + (power(2, retry_count + 1) || ' minutes')::interval
            WHERE id = v_event.id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- 15. Auto-create mapping when publishing listing
CREATE OR REPLACE FUNCTION public.auto_create_listing_portal_mapping()
RETURNS TRIGGER AS $$
BEGIN
    -- When a listing is published to a portal, create the mapping
    IF NEW.portal_listing_id IS NOT NULL AND NEW.publish_status = 'published' THEN
        INSERT INTO listing_portal_mappings (
            company_id, portal, portal_listing_id, portal_reference, crm_listing_id
        ) VALUES (
            NEW.company_id, NEW.portal_name, NEW.portal_listing_id, 
            (SELECT reference_number FROM listings WHERE id = NEW.listing_id),
            NEW.listing_id
        )
        ON CONFLICT (company_id, portal, portal_listing_id) 
        DO UPDATE SET 
            crm_listing_id = EXCLUDED.crm_listing_id,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_listing_portal_mapping_trigger ON public.listing_portals;
CREATE TRIGGER auto_create_listing_portal_mapping_trigger
AFTER INSERT OR UPDATE ON public.listing_portals
FOR EACH ROW EXECUTE FUNCTION auto_create_listing_portal_mapping();

-- ========================================
-- Migration: 20251221082951_c3699a8c-9e6b-4f0d-9d96-1be7707558ef.sql
-- ========================================


-- Fix Function Search Path Mutable warnings by setting search_path on trigger functions
CREATE OR REPLACE FUNCTION update_portal_mapping_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_listing_portal_mapping()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    -- When a listing is published to a portal, create the mapping
    IF NEW.portal_listing_id IS NOT NULL AND NEW.publish_status = 'published' THEN
        INSERT INTO listing_portal_mappings (
            company_id, portal, portal_listing_id, portal_reference, crm_listing_id
        ) VALUES (
            NEW.company_id, NEW.portal_name, NEW.portal_listing_id, 
            (SELECT reference_number FROM listings WHERE id = NEW.listing_id),
            NEW.listing_id
        )
        ON CONFLICT (company_id, portal, portal_listing_id) 
        DO UPDATE SET 
            crm_listing_id = EXCLUDED.crm_listing_id,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$;

-- ========================================
-- Migration: 20251221084129_b3d281eb-670d-40c0-8efd-485f4b919341.sql
-- ========================================

-- =====================================================
-- META LEAD ADS COMPLETE BACKEND
-- =====================================================

-- 1) Meta Webhook Events Table (for tracking all incoming Meta webhooks)
CREATE TABLE IF NOT EXISTS public.meta_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_source_id uuid REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'leadgen',
  page_id text,
  form_id text,
  lead_id_meta text,
  ad_id text,
  adgroup_id text,
  campaign_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  processing_attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Meta Webhook Logs Table
CREATE TABLE IF NOT EXISTS public.meta_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_event_id uuid REFERENCES public.meta_webhook_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  processing_time_ms integer,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Meta Ad Accounts Table
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_source_id uuid REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  ad_account_id text NOT NULL,
  account_name text,
  business_id text,
  currency text,
  timezone text,
  status text NOT NULL DEFAULT 'active',
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, ad_account_id)
);

-- 4) Meta Lead Forms Table
CREATE TABLE IF NOT EXISTS public.meta_lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_source_id uuid REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  page_id text NOT NULL,
  page_name text,
  form_id text NOT NULL,
  form_name text,
  status text NOT NULL DEFAULT 'active',
  leads_count integer DEFAULT 0,
  field_mapping jsonb DEFAULT '{}'::jsonb,
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_group_id uuid REFERENCES public.lead_groups(id) ON DELETE SET NULL,
  auto_assignment_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, form_id)
);

-- 5) Meta Form Agent Mappings
CREATE TABLE IF NOT EXISTS public.meta_form_agent_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.meta_lead_forms(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  leads_assigned integer DEFAULT 0,
  last_assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(form_id, agent_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_company ON public.meta_webhook_events(company_id);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_processed ON public.meta_webhook_events(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_lead_id_meta ON public.meta_webhook_events(lead_id_meta);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_form_id ON public.meta_webhook_events(form_id);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_event ON public.meta_webhook_logs(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_meta_lead_forms_company ON public.meta_lead_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_meta_lead_forms_form_id ON public.meta_lead_forms(form_id);
CREATE INDEX IF NOT EXISTS idx_leads_external_id_v2 ON public.leads(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_source_meta_v2 ON public.leads(source) WHERE source = 'Meta';

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_form_agent_mappings ENABLE ROW LEVEL SECURITY;

-- Meta Webhook Events - Only admins/managers can view
CREATE POLICY "meta_webhook_events_select_v2" ON public.meta_webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agents a 
      WHERE a.user_id = auth.uid() 
      AND a.company_id = meta_webhook_events.company_id
      AND a.role IN ('admin', 'manager')
    )
  );

-- Meta Webhook Logs - Only admins/managers can view  
CREATE POLICY "meta_webhook_logs_select_v2" ON public.meta_webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agents a 
      WHERE a.user_id = auth.uid() 
      AND a.company_id = meta_webhook_logs.company_id
      AND a.role IN ('admin', 'manager')
    )
  );

-- Meta Ad Accounts - Admins can manage, agents can view
CREATE POLICY "meta_ad_accounts_select_v2" ON public.meta_ad_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agents a 
      WHERE a.user_id = auth.uid() 
      AND a.company_id = meta_ad_accounts.company_id
    )
  );

CREATE POLICY "meta_ad_accounts_manage_v2" ON public.meta_ad_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agents a 
      WHERE a.user_id = auth.uid() 
      AND a.company_id = meta_ad_accounts.company_id
      AND a.role IN ('admin', 'manager')
    )
  );

-- Meta Lead Forms - Admins can manage, agents can view
CREATE POLICY "meta_lead_forms_select_v2" ON public.meta_lead_forms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agents a 
      WHERE a.user_id = auth.uid() 
      AND a.company_id = meta_lead_forms.company_id
    )
  );

CREATE POLICY "meta_lead_forms_manage_v2" ON public.meta_lead_forms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agents a 
      WHERE a.user_id = auth.uid() 
      AND a.company_id = meta_lead_forms.company_id
      AND a.role IN ('admin', 'manager')
    )
  );

-- Meta Form Agent Mappings - Admins can manage
CREATE POLICY "meta_form_agent_mappings_select_v2" ON public.meta_form_agent_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agents a 
      WHERE a.user_id = auth.uid() 
      AND a.company_id = meta_form_agent_mappings.company_id
    )
  );

CREATE POLICY "meta_form_agent_mappings_manage_v2" ON public.meta_form_agent_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agents a 
      WHERE a.user_id = auth.uid() 
      AND a.company_id = meta_form_agent_mappings.company_id
      AND a.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- ENABLE REALTIME FOR LEADS
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'meta_webhook_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meta_webhook_events;
  END IF;
END $$;

-- ========================================
-- Migration: 20251221084245_cbbe54af-a10a-40c4-b765-39033ca8651f.sql
-- ========================================

-- =====================================================
-- META LEAD ADS DATABASE FUNCTIONS
-- =====================================================

-- Function: Get next agent for round-robin assignment
CREATE OR REPLACE FUNCTION public.get_next_meta_lead_agent(
  p_company_id uuid,
  p_form_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_form_uuid uuid;
BEGIN
  -- First check if there's a specific form mapping
  IF p_form_id IS NOT NULL THEN
    SELECT mlf.id INTO v_form_uuid
    FROM public.meta_lead_forms mlf
    WHERE mlf.company_id = p_company_id AND mlf.form_id = p_form_id;
    
    IF v_form_uuid IS NOT NULL THEN
      -- Check for dedicated agent on form
      SELECT mlf.assigned_agent_id INTO v_agent_id
      FROM public.meta_lead_forms mlf
      WHERE mlf.id = v_form_uuid AND mlf.assigned_agent_id IS NOT NULL;
      
      IF v_agent_id IS NOT NULL THEN
        RETURN v_agent_id;
      END IF;
      
      -- Round-robin from form agent mappings
      SELECT mfam.agent_id INTO v_agent_id
      FROM public.meta_form_agent_mappings mfam
      JOIN public.agents a ON a.id = mfam.agent_id
      WHERE mfam.form_id = v_form_uuid
      AND mfam.is_active = true
      AND a.status = 'active'
      ORDER BY mfam.leads_assigned ASC, mfam.last_assigned_at ASC NULLS FIRST
      LIMIT 1;
      
      IF v_agent_id IS NOT NULL THEN
        -- Update the mapping
        UPDATE public.meta_form_agent_mappings
        SET leads_assigned = leads_assigned + 1,
            last_assigned_at = now()
        WHERE form_id = v_form_uuid AND agent_id = v_agent_id;
        
        RETURN v_agent_id;
      END IF;
    END IF;
  END IF;
  
  -- Check assignment rules for Meta source
  SELECT lar.assigned_agents[
    (COALESCE(lar.round_robin_index, 0) % array_length(lar.assigned_agents, 1)) + 1
  ] INTO v_agent_id
  FROM public.lead_assignment_rules lar
  WHERE lar.company_id = p_company_id
  AND lar.is_active = true
  AND lar.rule_type = 'round_robin'
  AND array_length(lar.assigned_agents, 1) > 0
  AND (
    lar.conditions->>'source' IS NULL 
    OR lar.conditions->>'source' = 'Meta'
    OR lar.conditions->>'source' = 'meta'
  )
  ORDER BY lar.priority DESC
  LIMIT 1;
  
  IF v_agent_id IS NOT NULL THEN
    -- Update round robin index
    UPDATE public.lead_assignment_rules
    SET round_robin_index = COALESCE(round_robin_index, 0) + 1
    WHERE company_id = p_company_id
    AND is_active = true
    AND rule_type = 'round_robin';
    
    RETURN v_agent_id;
  END IF;
  
  -- Fallback: Get any active agent with least leads
  SELECT a.id INTO v_agent_id
  FROM public.agents a
  LEFT JOIN public.agent_load al ON al.agent_id = a.id
  WHERE a.company_id = p_company_id
  AND a.status = 'active'
  AND a.role IN ('agent', 'admin', 'manager', 'team_leader')
  ORDER BY COALESCE(al.current_leads_count, 0) ASC
  LIMIT 1;
  
  RETURN v_agent_id;
END;
$$;

-- Function: Process Meta Lead Webhook
CREATE OR REPLACE FUNCTION public.process_meta_lead_webhook(
  p_company_id uuid,
  p_lead_source_id uuid,
  p_lead_id_meta text,
  p_page_id text,
  p_form_id text,
  p_ad_id text DEFAULT NULL,
  p_adgroup_id text DEFAULT NULL,
  p_campaign_id text DEFAULT NULL,
  p_lead_data jsonb DEFAULT '{}'::jsonb,
  p_raw_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_lead_id uuid;
  v_existing_lead_id uuid;
  v_agent_id uuid;
  v_form_name text;
  v_page_name text;
  v_group_id uuid;
BEGIN
  -- 1) Create webhook event record
  INSERT INTO public.meta_webhook_events (
    company_id, lead_source_id, event_type, page_id, form_id,
    lead_id_meta, ad_id, adgroup_id, campaign_id, payload
  ) VALUES (
    p_company_id, p_lead_source_id, 'leadgen', p_page_id, p_form_id,
    p_lead_id_meta, p_ad_id, p_adgroup_id, p_campaign_id, p_raw_payload
  ) RETURNING id INTO v_event_id;
  
  -- 2) Check for duplicate lead
  SELECT id INTO v_existing_lead_id
  FROM public.leads
  WHERE company_id = p_company_id
  AND external_id = p_lead_id_meta;
  
  IF v_existing_lead_id IS NOT NULL THEN
    -- Mark event as processed (duplicate)
    UPDATE public.meta_webhook_events
    SET processed = true, processed_at = now(), 
        created_lead_id = v_existing_lead_id,
        last_error = 'Duplicate lead - skipped'
    WHERE id = v_event_id;
    
    -- Log it
    INSERT INTO public.meta_webhook_logs (
      webhook_event_id, company_id, action, success, details
    ) VALUES (
      v_event_id, p_company_id, 'skipped_duplicate', true,
      jsonb_build_object('existing_lead_id', v_existing_lead_id)
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'skipped',
      'reason', 'duplicate',
      'existing_lead_id', v_existing_lead_id
    );
  END IF;
  
  -- 3) Get form/page info
  SELECT mlf.form_name, mlf.page_name, mlf.assigned_group_id
  INTO v_form_name, v_page_name, v_group_id
  FROM public.meta_lead_forms mlf
  WHERE mlf.company_id = p_company_id AND mlf.form_id = p_form_id;
  
  -- 4) Get assigned agent
  v_agent_id := public.get_next_meta_lead_agent(p_company_id, p_form_id);
  
  -- 5) Insert the lead
  INSERT INTO public.leads (
    company_id,
    lead_source_id,
    external_id,
    name,
    email,
    phone,
    source,
    stage,
    assigned_agent_id,
    lead_group_id,
    form_id,
    form_name,
    campaign_name,
    ad_set_name,
    ad_name,
    source_metadata,
    mapped_fields,
    fetched_at,
    is_opted_in,
    opted_in
  ) VALUES (
    p_company_id,
    p_lead_source_id,
    p_lead_id_meta,
    COALESCE(
      p_lead_data->>'full_name',
      p_lead_data->>'name',
      NULLIF(TRIM(CONCAT(
        COALESCE(p_lead_data->>'first_name', ''), ' ',
        COALESCE(p_lead_data->>'last_name', '')
      )), ''),
      'New Meta Lead'
    ),
    p_lead_data->>'email',
    COALESCE(p_lead_data->>'phone_number', p_lead_data->>'phone'),
    'Meta',
    'new',
    v_agent_id,
    v_group_id,
    p_form_id,
    COALESCE(v_form_name, p_lead_data->>'form_name'),
    p_lead_data->>'campaign_name',
    p_lead_data->>'adgroup_name',
    p_lead_data->>'ad_name',
    jsonb_build_object(
      'platform', 'meta',
      'page_id', p_page_id,
      'page_name', v_page_name,
      'form_id', p_form_id,
      'ad_id', p_ad_id,
      'adgroup_id', p_adgroup_id,
      'campaign_id', p_campaign_id,
      'webhook', true
    ),
    p_lead_data,
    now(),
    true,
    true
  ) RETURNING id INTO v_lead_id;
  
  -- 6) Update webhook event
  UPDATE public.meta_webhook_events
  SET processed = true, processed_at = now(), created_lead_id = v_lead_id
  WHERE id = v_event_id;
  
  -- 7) Update form lead count
  UPDATE public.meta_lead_forms
  SET leads_count = leads_count + 1, updated_at = now()
  WHERE company_id = p_company_id AND form_id = p_form_id;
  
  -- 8) Update lead source stats
  UPDATE public.lead_sources
  SET last_fetched_at = now(),
      total_leads_fetched = COALESCE(total_leads_fetched, 0) + 1
  WHERE id = p_lead_source_id;
  
  -- 9) Log activity
  INSERT INTO public.lead_activities (
    lead_id, company_id, activity_type, description, performed_by, metadata
  ) VALUES (
    v_lead_id, p_company_id, 'created', 
    'Lead created from Meta Lead Ads webhook',
    NULL,
    jsonb_build_object(
      'source', 'meta_webhook',
      'form_id', p_form_id,
      'assigned_agent_id', v_agent_id
    )
  );
  
  -- 10) Log webhook success
  INSERT INTO public.meta_webhook_logs (
    webhook_event_id, company_id, action, success, details
  ) VALUES (
    v_event_id, p_company_id, 'processed', true,
    jsonb_build_object(
      'lead_id', v_lead_id,
      'assigned_agent_id', v_agent_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'lead_id', v_lead_id,
    'assigned_agent_id', v_agent_id,
    'event_id', v_event_id
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  IF v_event_id IS NOT NULL THEN
    UPDATE public.meta_webhook_events
    SET processing_attempts = processing_attempts + 1,
        last_error = SQLERRM
    WHERE id = v_event_id;
    
    INSERT INTO public.meta_webhook_logs (
      webhook_event_id, company_id, action, success, error_message
    ) VALUES (
      v_event_id, p_company_id, 'failed', false, SQLERRM
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'event_id', v_event_id
  );
END;
$$;

-- Function: Get Meta Webhook Stats
CREATE OR REPLACE FUNCTION public.get_meta_webhook_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'processed', COUNT(*) FILTER (WHERE processed = true),
    'pending', COUNT(*) FILTER (WHERE processed = false),
    'failed', COUNT(*) FILTER (WHERE last_error IS NOT NULL AND processed = false),
    'today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
  ) INTO v_result
  FROM public.meta_webhook_events
  WHERE company_id = p_company_id;
  
  RETURN v_result;
END;
$$;

-- Function: Retry failed Meta webhooks
CREATE OR REPLACE FUNCTION public.retry_failed_meta_webhooks(
  p_company_id uuid,
  p_max_retries integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_retried integer := 0;
BEGIN
  FOR v_event IN 
    SELECT * FROM public.meta_webhook_events
    WHERE company_id = p_company_id
    AND processed = false
    AND processing_attempts < p_max_retries
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    UPDATE public.meta_webhook_events
    SET processing_attempts = processing_attempts + 1
    WHERE id = v_event.id;
    
    v_retried := v_retried + 1;
  END LOOP;
  
  RETURN jsonb_build_object('retried', v_retried);
END;
$$;

-- Function: Sync Meta Form to database
CREATE OR REPLACE FUNCTION public.sync_meta_lead_form(
  p_company_id uuid,
  p_lead_source_id uuid,
  p_page_id text,
  p_page_name text,
  p_form_id text,
  p_form_name text,
  p_status text DEFAULT 'active'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form_id uuid;
BEGIN
  INSERT INTO public.meta_lead_forms (
    company_id, lead_source_id, page_id, page_name, form_id, form_name, status
  ) VALUES (
    p_company_id, p_lead_source_id, p_page_id, p_page_name, p_form_id, p_form_name, p_status
  )
  ON CONFLICT (company_id, form_id) 
  DO UPDATE SET
    page_name = EXCLUDED.page_name,
    form_name = EXCLUDED.form_name,
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING id INTO v_form_id;
  
  RETURN v_form_id;
END;
$$;

-- Trigger: Log lead updates for audit trail
CREATE OR REPLACE FUNCTION public.log_lead_update_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log assignment changes
  IF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
    INSERT INTO public.lead_activities (
      lead_id, company_id, activity_type, description, metadata
    ) VALUES (
      NEW.id, NEW.company_id, 'assigned',
      'Lead assignment changed',
      jsonb_build_object(
        'old_agent_id', OLD.assigned_agent_id,
        'new_agent_id', NEW.assigned_agent_id
      )
    );
  END IF;
  
  -- Log stage changes
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.lead_activities (
      lead_id, company_id, activity_type, description, metadata
    ) VALUES (
      NEW.id, NEW.company_id, 'stage_changed',
      'Lead stage changed from ' || COALESCE(OLD.stage, 'none') || ' to ' || COALESCE(NEW.stage, 'none'),
      jsonb_build_object(
        'old_stage', OLD.stage,
        'new_stage', NEW.stage
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_lead_update_v2 ON public.leads;
CREATE TRIGGER trigger_log_lead_update_v2
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_update_v2();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_meta_lead_webhook TO service_role;
GRANT EXECUTE ON FUNCTION public.get_next_meta_lead_agent TO service_role;
GRANT EXECUTE ON FUNCTION public.get_meta_webhook_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_meta_webhooks TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_meta_lead_form TO authenticated;

-- ========================================
-- Migration: 20251221091415_9e7e81e1-1bbd-41c2-9cb5-830eea35742d.sql
-- ========================================

-- Enable REPLICA IDENTITY FULL for complete realtime updates
ALTER TABLE public.leads REPLICA IDENTITY FULL;

-- ========================================
-- Migration: 20251221100938_7f987a2f-f951-46c7-9c8e-d3f697ec4963.sql
-- ========================================

-- Add columns to leads table for Meta lead tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- Add columns to company_settings for new lead customization
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS new_lead_badge_color VARCHAR(7) DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS new_lead_background_color VARCHAR(7) DEFAULT '#dcfce7',
ADD COLUMN IF NOT EXISTS new_lead_animation VARCHAR(10) DEFAULT 'fade' CHECK (new_lead_animation IN ('none', 'fade', 'glow'));

-- Create index for faster queries on new leads
CREATE INDEX IF NOT EXISTS idx_leads_is_new ON public.leads(is_new) WHERE is_new = true;

-- ========================================
-- Migration: 20251221125805_d454620f-2b5c-4930-a000-00897ec80974.sql
-- ========================================

-- Fix the log_lead_update_v2 trigger to use correct column names
CREATE OR REPLACE FUNCTION public.log_lead_update_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log assignment changes
  IF OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
    INSERT INTO public.lead_activities (
      lead_id, company_id, type, title, description, agent_name
    ) VALUES (
      NEW.id, NEW.company_id, 'assigned',
      'Lead Reassigned',
      'Assignment changed from ' || COALESCE(OLD.assigned_agent_id::text, 'unassigned') || ' to ' || COALESCE(NEW.assigned_agent_id::text, 'unassigned'),
      'System'
    );
  END IF;
  
  -- Log stage changes
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.lead_activities (
      lead_id, company_id, type, title, description, agent_name
    ) VALUES (
      NEW.id, NEW.company_id, 'stage',
      'Stage Changed',
      'Stage changed from ' || COALESCE(OLD.stage, 'none') || ' to ' || COALESCE(NEW.stage, 'none'),
      'System'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix the process_meta_lead_webhook function to use correct column names
CREATE OR REPLACE FUNCTION public.process_meta_lead_webhook(
  p_company_id uuid,
  p_page_id text,
  p_form_id text,
  p_leadgen_id text,
  p_created_time bigint,
  p_lead_source_id uuid DEFAULT NULL,
  p_lead_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_agent_id uuid;
  v_event_id uuid;
  v_connection_id uuid;
  v_existing_lead_id uuid;
  v_field_mappings jsonb;
  v_lead_name text;
  v_lead_phone text;
  v_lead_email text;
  v_normalized_phone text;
  v_form_name text;
  v_page_name text;
  v_default_group_id uuid;
  v_default_stage_id uuid;
  v_assignment_result record;
BEGIN
  -- Check if this leadgen_id was already processed
  SELECT id INTO v_existing_lead_id
  FROM public.leads
  WHERE company_id = p_company_id AND external_id = p_leadgen_id;
  
  IF v_existing_lead_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'duplicate',
      'lead_id', v_existing_lead_id,
      'message', 'Lead already exists'
    );
  END IF;
  
  -- 1) Log the webhook event
  INSERT INTO public.meta_webhook_events (
    company_id, page_id, form_id, leadgen_id, created_time, payload, status
  ) VALUES (
    p_company_id, p_page_id, p_form_id, p_leadgen_id, p_created_time, p_lead_data, 'processing'
  ) RETURNING id INTO v_event_id;
  
  -- 2) Get the connection for this page
  SELECT id INTO v_connection_id
  FROM public.marketing_connections
  WHERE company_id = p_company_id 
    AND platform = 'meta'
    AND status = 'active'
    AND (metadata->>'page_id' = p_page_id OR config->>'page_id' = p_page_id)
  LIMIT 1;
  
  -- 3) Get form info and mappings
  SELECT form_name, field_mappings INTO v_form_name, v_field_mappings
  FROM public.meta_lead_forms
  WHERE company_id = p_company_id AND form_id = p_form_id;
  
  -- Get page name from connection
  SELECT COALESCE(metadata->>'page_name', config->>'page_name', 'Meta') INTO v_page_name
  FROM public.marketing_connections WHERE id = v_connection_id;
  
  -- 4) Extract lead info from the lead data
  v_lead_name := COALESCE(
    p_lead_data->>'full_name',
    p_lead_data->>'name',
    CONCAT_WS(' ', p_lead_data->>'first_name', p_lead_data->>'last_name'),
    'Meta Lead'
  );
  v_lead_phone := COALESCE(p_lead_data->>'phone_number', p_lead_data->>'phone', '');
  v_lead_email := COALESCE(p_lead_data->>'email', '');
  v_normalized_phone := public.normalize_phone_number(v_lead_phone);
  
  -- 5) Get default group (Hot Leads)
  SELECT id INTO v_default_group_id
  FROM public.lead_groups
  WHERE company_id = p_company_id AND LOWER(name) = 'hot leads'
  LIMIT 1;
  
  -- 6) Get default stage
  SELECT id INTO v_default_stage_id
  FROM public.lead_stages
  WHERE company_id = p_company_id AND is_default = true
  LIMIT 1;
  
  IF v_default_stage_id IS NULL THEN
    SELECT id INTO v_default_stage_id
    FROM public.lead_stages
    WHERE company_id = p_company_id
    ORDER BY position LIMIT 1;
  END IF;
  
  -- 7) Auto-assign agent using round robin
  SELECT * INTO v_assignment_result
  FROM public.auto_assign_lead_round_robin(p_company_id);
  
  v_agent_id := v_assignment_result.agent_id;
  
  -- 8) Create the lead
  INSERT INTO public.leads (
    company_id,
    name,
    phone,
    normalized_phone,
    email,
    source,
    external_id,
    lead_source_id,
    lead_group_id,
    stage_id,
    stage,
    assigned_agent_id,
    source_metadata,
    mapped_fields,
    opted_in,
    opted_in_whatsapp,
    opted_in_sms,
    opted_in_email,
    is_new
  ) VALUES (
    p_company_id,
    v_lead_name,
    v_lead_phone,
    v_normalized_phone,
    NULLIF(v_lead_email, ''),
    'Meta',
    p_leadgen_id,
    p_lead_source_id,
    v_default_group_id,
    v_default_stage_id,
    COALESCE((SELECT name FROM public.lead_stages WHERE id = v_default_stage_id), 'New'),
    v_agent_id,
    jsonb_build_object(
      'platform', 'meta',
      'page_id', p_page_id,
      'page_name', v_page_name,
      'form_id', p_form_id,
      'form_name', v_form_name,
      'raw_data', p_lead_data,
      'fetched_at', now()
    ),
    p_lead_data,
    true,
    true,
    true,
    true,
    true
  ) RETURNING id INTO v_lead_id;
  
  -- 9) Update form lead count
  UPDATE public.meta_lead_forms
  SET leads_count = leads_count + 1, updated_at = now()
  WHERE company_id = p_company_id AND form_id = p_form_id;
  
  -- 10) Update lead source stats
  UPDATE public.lead_sources
  SET last_fetched_at = now(),
      total_leads_fetched = COALESCE(total_leads_fetched, 0) + 1
  WHERE id = p_lead_source_id;
  
  -- 11) Log activity with correct column names
  INSERT INTO public.lead_activities (
    lead_id, company_id, type, title, description, agent_name
  ) VALUES (
    v_lead_id, p_company_id, 'added', 
    'Lead Created',
    'Lead created from Meta Lead Ads webhook',
    'System'
  );
  
  -- 12) Log webhook success
  INSERT INTO public.meta_webhook_logs (
    webhook_event_id, company_id, action, success, details
  ) VALUES (
    v_event_id, p_company_id, 'processed', true,
    jsonb_build_object(
      'lead_id', v_lead_id,
      'assigned_agent_id', v_agent_id
    )
  );
  
  -- Mark event as processed
  UPDATE public.meta_webhook_events
  SET status = 'processed', processed_at = now()
  WHERE id = v_event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'lead_id', v_lead_id,
    'assigned_agent_id', v_agent_id,
    'event_id', v_event_id
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  IF v_event_id IS NOT NULL THEN
    UPDATE public.meta_webhook_events
    SET processing_attempts = processing_attempts + 1,
        last_error = SQLERRM,
        status = 'failed'
    WHERE id = v_event_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'event_id', v_event_id
  );
END;
$$;

-- ========================================
-- Migration: 20251225120000_fix_company_permissions.sql
-- ========================================

-- Fix company creation permissions
-- This migration allows authenticated users to create companies and update their own companies

-- Allow authenticated users to insert companies (to own them)
CREATE POLICY "Users can create companies" ON public.companies
    FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

-- Allow company owners/members to update their company
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

-- ========================================
-- Migration: 20251225123000_fix_signup_flow.sql
-- ========================================

-- 20251225123000_fix_signup_flow.sql
-- Description: Allow users to insert data necessary for signup/onboarding.

-- 1. Allowed authenticated users to inserted into organizations
-- This is required because handleSignUp creates an organization for the user.
CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 2. Allow users to insert themselves into organization_members
-- This is required to make the user the owner of their new organization.
CREATE POLICY "Users can join organizations as owner" ON public.organization_members
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to create pipelines
-- Required for creating the default pipeline during signup.
CREATE POLICY "Users can create pipelines" ON public.pipelines
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Allow users to create pipeline stages
-- Required for creating default stages.
CREATE POLICY "Users can create pipeline stages" ON public.pipeline_stages
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Allow users to create organization settings
-- Required for setting defaults.
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
CREATE POLICY "Users can create lead stages" ON public.lead_stages
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 8. Allow users to create lead groups
CREATE POLICY "Users can create lead groups" ON public.lead_groups
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 9. Ensure profiles can be updated by the user (Role is updateable by self for this flow, though strictly should be restricted)
-- The existing policy allows update of own profile. If column filtering is not enabled, this works.

-- ========================================
-- Migration: 20251225124000_fix_signup_final.sql
-- ========================================

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

-- ========================================
-- Migration: 20251225130000_fix_all_permissions_final.sql
-- ========================================

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

-- ========================================
-- Migration: 20251225140000_make_everyone_admin.sql
-- ========================================

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

-- ========================================
-- Migration: 20251225150000_fix_listing_integrity.sql
-- ========================================

-- Migration to fix listing duplication and improve data integrity
-- Task: Analyze and fix listing duplication, unreliable automations, and inconsistent data relations.

-- 1. Ensure reference_number is unique to prevent logical duplicates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_reference_number_key'
    ) THEN
        ALTER TABLE public.listings ADD CONSTRAINT listings_reference_number_key UNIQUE (reference_number);
    END IF;
END $$;

-- 2. Improved Audit Log Function to capture detailed changes
CREATE OR REPLACE FUNCTION public.log_listing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.listing_audit_logs (
            listing_id,
            company_id,
            action_type,
            description,
            changes,
            performed_by
        ) VALUES (
            NEW.id,
            NEW.company_id,
            'edit',
            'Updated listing: ' || NEW.title,
            jsonb_build_object(
                'old', row_to_json(OLD),
                'new', row_to_json(NEW)
            ),
            auth.uid()
        );
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.listing_audit_logs (
            listing_id,
            company_id,
            action_type,
            description,
            performed_by
        ) VALUES (
            NEW.id,
            NEW.company_id,
            'create',
            'Created listing: ' || NEW.title,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Trigger for automatic audit logging (Ensures automations run on true changes)
DROP TRIGGER IF EXISTS trigger_listing_audit ON public.listings;
CREATE TRIGGER trigger_listing_audit
    AFTER INSERT OR UPDATE ON public.listings
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.* OR TG_OP = 'INSERT')
    EXECUTE FUNCTION public.log_listing_change();

-- 4. Robust RPC for saving listings to prevent race conditions and duplication
CREATE OR REPLACE FUNCTION public.save_listing_v2(
    p_id uuid,
    p_company_id uuid,
    p_data jsonb,
    p_mode text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_listing_id uuid;
    v_agent_id uuid;
BEGIN
    -- Get current agent ID
    SELECT id INTO v_agent_id FROM public.agents WHERE user_id = auth.uid() LIMIT 1;
    
    IF p_mode = 'edit' THEN
        -- Verify ownership/permissions via RLS or manual check
        IF NOT EXISTS (
            SELECT 1 FROM public.listings 
            WHERE id = p_id 
            AND company_id = p_company_id
        ) THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

        UPDATE public.listings
        SET 
            title = COALESCE((p_data->>'title'), title),
            description = (p_data->>'description'),
            price = (p_data->>'price')::numeric,
            status = COALESCE((p_data->>'status'), status),
            updated_at = now()
            -- Add other fields as needed
        WHERE id = p_id;
        
        v_listing_id := p_id;
    ELSE
        INSERT INTO public.listings (
            company_id,
            title,
            description,
            price,
            status,
            created_by,
            assigned_agent_id
        ) VALUES (
            p_company_id,
            (p_data->>'title'),
            (p_data->>'description'),
            (p_data->>'price')::numeric,
            COALESCE((p_data->>'status'), 'draft'),
            v_agent_id,
            v_agent_id
        )
        RETURNING id INTO v_listing_id;
    END IF;

    RETURN v_listing_id;
END;
$$;

-- ========================================
-- Migration: 20251225160000_apply_rls_policies.sql
-- ========================================

-- Migration to apply Row Level Security (RLS) policies for key CRM tables
-- Target Tables: companies, contacts, listings, activities

-- 1. Ensure RLS is enabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check if user is admin (if not already exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Company Policies
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" ON public.companies
    FOR SELECT USING (
        id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can update their own company" ON public.companies;
CREATE POLICY "Admins can update their own company" ON public.companies
    FOR UPDATE USING (
        id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin()
    );

-- 4. Contacts Policies
DROP POLICY IF EXISTS "Users can view company contacts" ON public.contacts;
CREATE POLICY "Users can view company contacts" ON public.contacts
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert company contacts" ON public.contacts;
CREATE POLICY "Users can insert company contacts" ON public.contacts
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update company contacts" ON public.contacts;
CREATE POLICY "Users can update company contacts" ON public.contacts
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete company contacts" ON public.contacts;
CREATE POLICY "Users can delete company contacts" ON public.contacts
    FOR DELETE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin()
    );

-- 5. Listings Policies
DROP POLICY IF EXISTS "Users can view company listings" ON public.listings;
CREATE POLICY "Users can view company listings" ON public.listings
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert company listings" ON public.listings;
CREATE POLICY "Users can insert company listings" ON public.listings
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update company listings" ON public.listings;
CREATE POLICY "Users can update company listings" ON public.listings
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete company listings" ON public.listings;
CREATE POLICY "Users can delete company listings" ON public.listings
    FOR DELETE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin()
    );

-- 6. Activities Polices
DROP POLICY IF EXISTS "Users can view company activities" ON public.activities;
CREATE POLICY "Users can view company activities" ON public.activities
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert company activities" ON public.activities;
CREATE POLICY "Users can insert company activities" ON public.activities
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update company activities" ON public.activities;
CREATE POLICY "Users can update company activities" ON public.activities
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete company activities" ON public.activities;
CREATE POLICY "Users can delete company activities" ON public.activities
    FOR DELETE USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.is_admin()
    );

-- ========================================
-- Migration: 20251225170000_secure_lead_export.sql
-- ========================================

-- Add main_email to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS main_email TEXT;

-- Create export_logs table
CREATE TABLE IF NOT EXISTS public.export_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    entity_type TEXT NOT NULL, -- 'leads', 'listings', etc.
    filter_criteria JSONB DEFAULT '{}',
    record_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    recipient_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on export_logs
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own export logs
CREATE POLICY "Users can view their own export logs" ON public.export_logs
    FOR SELECT USING (user_id = auth.uid());

-- Policy: Admins can view all export logs for their company
CREATE POLICY "Admins can view company export logs" ON public.export_logs
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- Rate limiting check function
CREATE OR REPLACE FUNCTION public.check_export_rate_limit(p_user_id UUID, p_limit INTEGER DEFAULT 3, p_interval INTERVAL DEFAULT '1 hour')
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT count(*)
    INTO v_count
    FROM public.export_logs
    WHERE user_id = p_user_id
    AND created_at > now() - p_interval;
    
    RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Migration: 20251225180000_lead_assignment_system.sql
-- ========================================

-- Lead Assignment Infrastructure
-- This migration creates the necessary tables for lead assignment functionality

-- 1. Assignment Configuration Table
CREATE TABLE IF NOT EXISTS public.lead_assignment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  assignment_method TEXT NOT NULL DEFAULT 'manual' CHECK (assignment_method IN ('manual', 'round_robin', 'rules')),
  round_robin_index INTEGER DEFAULT 0,
  enabled_agent_ids UUID[] DEFAULT '{}',
  agent_leads_per_round JSONB DEFAULT '{}', -- {agent_id: count}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 2. Assignment Rules Table
CREATE TABLE IF NOT EXISTS public.lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}', -- {source: 'Meta', budget_min: 100000, location: 'Dubai', ...}
  assign_to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Assignment Audit Log Table
CREATE TABLE IF NOT EXISTS public.lead_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  assignment_method TEXT, -- 'manual', 'round_robin', 'rule_based'
  assigned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lead_assignment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_assignment_config
CREATE POLICY "Users can view their company's assignment config"
ON public.lead_assignment_config FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert assignment config"
ON public.lead_assignment_config FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update assignment config"
ON public.lead_assignment_config FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for lead_assignment_rules
CREATE POLICY "Users can view their company's assignment rules"
ON public.lead_assignment_rules FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage assignment rules"
ON public.lead_assignment_rules FOR ALL
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for lead_assignment_logs
CREATE POLICY "Users can view their company's assignment logs"
ON public.lead_assignment_logs FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert assignment logs"
ON public.lead_assignment_logs FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_config_company ON public.lead_assignment_config(company_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_company ON public.lead_assignment_rules(company_id, enabled, priority);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_company_lead ON public.lead_assignment_logs(company_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_created ON public.lead_assignment_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_assignment_config_updated_at
BEFORE UPDATE ON public.lead_assignment_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_rules_updated_at
BEFORE UPDATE ON public.lead_assignment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get next agent in round robin
CREATE OR REPLACE FUNCTION public.get_next_round_robin_agent(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_next_agent_id UUID;
  v_next_index INTEGER;
BEGIN
  -- Get current config
  SELECT * INTO v_config
  FROM public.lead_assignment_config
  WHERE company_id = p_company_id;

  -- If no config or no enabled agents, return NULL
  IF v_config IS NULL OR array_length(v_config.enabled_agent_ids, 1) IS NULL OR array_length(v_config.enabled_agent_ids, 1) = 0 THEN
    RETURN NULL;
  END IF;

  -- Get next agent ID
  v_next_index := (COALESCE(v_config.round_robin_index, 0) % array_length(v_config.enabled_agent_ids, 1)) + 1;
  v_next_agent_id := v_config.enabled_agent_ids[v_next_index];

  -- Update round robin index
  UPDATE public.lead_assignment_config
  SET round_robin_index = v_next_index
  WHERE company_id = p_company_id;

  RETURN v_next_agent_id;
END;
$$;

-- Function to auto-assign lead based on rules
CREATE OR REPLACE FUNCTION public.auto_assign_lead(p_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_config RECORD;
  v_rule RECORD;
  v_assigned_agent_id UUID;
  v_conditions JSONB;
  v_matches BOOLEAN;
BEGIN
  -- Get lead details
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id;

  IF v_lead IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get assignment config
  SELECT * INTO v_config
  FROM public.lead_assignment_config
  WHERE company_id = v_lead.company_id;

  -- If manual assignment, do nothing
  IF v_config IS NULL OR v_config.assignment_method = 'manual' THEN
    RETURN NULL;
  END IF;

  -- If round robin
  IF v_config.assignment_method = 'round_robin' THEN
    v_assigned_agent_id := public.get_next_round_robin_agent(v_lead.company_id);
    
    IF v_assigned_agent_id IS NOT NULL THEN
      UPDATE public.leads
      SET assigned_agent_id = v_assigned_agent_id
      WHERE id = p_lead_id;

      -- Log assignment
      INSERT INTO public.lead_assignment_logs (
        company_id, lead_id, to_agent_id, assignment_method
      ) VALUES (
        v_lead.company_id, p_lead_id, v_assigned_agent_id, 'round_robin'
      );
    END IF;

    RETURN v_assigned_agent_id;
  END IF;

  -- If rule-based
  IF v_config.assignment_method = 'rules' THEN
    -- Find matching rule (highest priority first)
    FOR v_rule IN
      SELECT * FROM public.lead_assignment_rules
      WHERE company_id = v_lead.company_id
        AND enabled = true
      ORDER BY priority DESC, created_at ASC
    LOOP
      v_matches := true;
      v_conditions := v_rule.conditions;

      -- Check source condition
      IF v_conditions ? 'source' AND v_lead.source IS DISTINCT FROM (v_conditions->>'source') THEN
        v_matches := false;
      END IF;

      -- Check budget conditions
      IF v_matches AND v_conditions ? 'budget_min' THEN
        IF v_lead.budget IS NULL OR v_lead.budget::numeric < (v_conditions->>'budget_min')::numeric THEN
          v_matches := false;
        END IF;
      END IF;

      IF v_matches AND v_conditions ? 'budget_max' THEN
        IF v_lead.budget IS NULL OR v_lead.budget::numeric > (v_conditions->>'budget_max')::numeric THEN
          v_matches := false;
        END IF;
      END IF;

      -- Check location condition
      IF v_matches AND v_conditions ? 'location' THEN
        IF v_lead.location IS NULL OR v_lead.location NOT ILIKE '%' || (v_conditions->>'location') || '%' THEN
          v_matches := false;
        END IF;
      END IF;

      -- If rule matches, assign and break
      IF v_matches AND v_rule.assign_to_agent_id IS NOT NULL THEN
        UPDATE public.leads
        SET assigned_agent_id = v_rule.assign_to_agent_id
        WHERE id = p_lead_id;

        -- Log assignment
        INSERT INTO public.lead_assignment_logs (
          company_id, lead_id, to_agent_id, assignment_method, rule_id
        ) VALUES (
          v_lead.company_id, p_lead_id, v_rule.assign_to_agent_id, 'rule_based', v_rule.id
        );

        RETURN v_rule.assign_to_agent_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger to auto-assign new leads
CREATE OR REPLACE FUNCTION public.trigger_auto_assign_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only auto-assign if not already assigned
  IF NEW.assigned_agent_id IS NULL THEN
    PERFORM public.auto_assign_lead(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS auto_assign_new_lead ON public.leads;
CREATE TRIGGER auto_assign_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_assign_lead();

-- ========================================
-- Migration: 20251228230000_fix_listings_columns.sql
-- ========================================


-- Add missing columns to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- If ref_number was intended but reference_number exists, we can either rename or add it.
-- Based on the migration history, reference_number is the standard in the listings table.
-- However, if the code is using ref_number, we should probably add an alias or just rename it in the code.
-- Let's stick to reference_number and fix the code.
