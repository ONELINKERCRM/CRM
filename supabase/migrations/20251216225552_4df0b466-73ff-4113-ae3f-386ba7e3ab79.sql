
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

DO $$ BEGIN
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS website text;
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS size text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

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

DO $$ BEGIN
    ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id);
    ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS invited_at timestamptz;
    ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

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

DO $$ BEGIN
    ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS status deal_status NOT NULL DEFAULT 'open';
    ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0;
    ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS actual_close_date date;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

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
  status task_status NOT NULL DEFAULT 'todo',
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
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(organization_id, due_date) WHERE status IN ('todo', 'in_progress');

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
      AND role = _role::text
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
