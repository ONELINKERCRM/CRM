-- =============================================
-- PROPERTY FINDER COMPLETE BACKEND SCHEMA
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) property_finder_accounts - Company-level PF connection
CREATE TABLE IF NOT EXISTS public.property_finder_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pf_company_id TEXT,
  api_key_encrypted TEXT,
  webhook_secret TEXT DEFAULT md5(random()::text || clock_timestamp()::text),
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