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