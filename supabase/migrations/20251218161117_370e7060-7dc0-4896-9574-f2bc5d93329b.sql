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