-- =============================================
-- LEAD SOURCES BACKEND - FIXED SCHEMA
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing table if it exists with wrong schema
DROP TABLE IF EXISTS public.lead_source_logs CASCADE;
DROP TABLE IF EXISTS public.lead_webhooks CASCADE;
DROP TABLE IF EXISTS public.lead_sources CASCADE;

-- =============================================
-- LEAD_SOURCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'api',
  connection_details JSONB DEFAULT '{}'::jsonb,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'disconnected',
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
CREATE TABLE IF NOT EXISTS public.lead_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.lead_sources(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  secret_key TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
  verify_token TEXT DEFAULT md5(random()::text || clock_timestamp()::text),
  is_active BOOLEAN DEFAULT true,
  last_received_at TIMESTAMPTZ,
  total_received INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
    ALTER TABLE public.lead_webhooks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- =============================================
-- LEAD_SOURCE_LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.lead_source_logs (
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