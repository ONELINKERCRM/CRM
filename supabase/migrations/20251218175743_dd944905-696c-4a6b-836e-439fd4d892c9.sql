-- Create portal_leads table for capturing leads from Property Finder, Bayut, Dubizzle
CREATE TABLE IF NOT EXISTS public.portal_leads (
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
CREATE TABLE IF NOT EXISTS public.portal_import_errors (
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
DROP POLICY IF EXISTS "Users can view portal leads from their company" ON public.portal_leads;
CREATE POLICY "Users can view portal leads from their company"
ON public.portal_leads FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert portal leads for their company" ON public.portal_leads;
CREATE POLICY "Users can insert portal leads for their company"
ON public.portal_leads FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update portal leads from their company" ON public.portal_leads;
CREATE POLICY "Users can update portal leads from their company"
ON public.portal_leads FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can delete portal leads from their company" ON public.portal_leads;
CREATE POLICY "Admins can delete portal leads from their company"
ON public.portal_leads FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS policies for portal_import_errors
DROP POLICY IF EXISTS "Admins and managers can view import errors" ON public.portal_import_errors;
CREATE POLICY "Admins and managers can view import errors"
ON public.portal_import_errors FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "System can insert import errors" ON public.portal_import_errors;
CREATE POLICY "System can insert import errors"
ON public.portal_import_errors FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update import errors" ON public.portal_import_errors;
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