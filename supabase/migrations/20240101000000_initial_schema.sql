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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    industry TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT DEFAULT 'member', -- owner, admin, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

CREATE TABLE public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    default_currency TEXT DEFAULT 'USD',
    default_timezone TEXT DEFAULT 'UTC',
    default_pipeline_id UUID, -- Forward reference resolved below via ALTER or just reference pipelines if order permits (pipelines is below, so allow NULL initially or create pipelines first)
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Teams & Agents
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    manager_id UUID, -- References agents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.lead_sources(id) NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    webhook_url TEXT NOT NULL,
    secret_key TEXT DEFAULT gen_random_uuid()::text,
    verify_token TEXT DEFAULT gen_random_uuid()::text,
    is_active BOOLEAN DEFAULT true,
    last_received_at TIMESTAMP WITH TIME ZONE,
    total_received INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lead_source_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
