
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
