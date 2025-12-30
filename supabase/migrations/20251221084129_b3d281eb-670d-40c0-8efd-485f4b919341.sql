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