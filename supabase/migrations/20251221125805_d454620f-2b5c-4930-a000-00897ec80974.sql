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