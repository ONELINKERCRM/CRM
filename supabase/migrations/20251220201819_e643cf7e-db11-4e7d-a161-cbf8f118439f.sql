-- ============================================
-- PORTAL WEBHOOK BACKEND SCHEMA
-- ============================================

-- Ensure helper functions exist first
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT company_id FROM public.agents WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.agents 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'manager')
    );
$$;

-- 1) portal_webhooks - Stores webhook configuration per company/portal
CREATE TABLE IF NOT EXISTS public.portal_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal text NOT NULL,
    webhook_url text NOT NULL,
    secret_token text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'error')),
    last_verified_at timestamptz,
    verification_error text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, portal)
);

-- 2) portal_webhook_events - Stores all incoming webhook events
CREATE TABLE IF NOT EXISTS public.portal_webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal text NOT NULL,
    event_type text NOT NULL,
    portal_listing_id text,
    portal_lead_id text,
    portal_agent_id text,
    payload jsonb NOT NULL,
    signature text,
    ip_address text,
    user_agent text,
    received_at timestamptz NOT NULL DEFAULT now(),
    processed boolean NOT NULL DEFAULT false,
    processed_at timestamptz,
    processing_error text,
    retry_count int NOT NULL DEFAULT 0,
    next_retry_at timestamptz,
    created_lead_id uuid REFERENCES public.leads(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_company_portal ON public.portal_webhook_events(company_id, portal);
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_processed ON public.portal_webhook_events(processed, next_retry_at) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_event_type ON public.portal_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_portal_lead ON public.portal_webhook_events(portal_lead_id) WHERE portal_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_portal_listing ON public.portal_webhook_events(portal_listing_id) WHERE portal_listing_id IS NOT NULL;

-- 3) portal_webhook_logs - Audit trail for all webhook processing
CREATE TABLE IF NOT EXISTS public.portal_webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_event_id uuid REFERENCES public.portal_webhook_events(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal text NOT NULL,
    action text NOT NULL,
    success boolean NOT NULL,
    error_message text,
    error_code text,
    processing_time_ms int,
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_webhook_logs_event ON public.portal_webhook_logs(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_portal_webhook_logs_company ON public.portal_webhook_logs(company_id, portal, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.portal_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_webhook_logs ENABLE ROW LEVEL SECURITY;

-- portal_webhooks policies
CREATE POLICY "portal_webhooks_select" ON public.portal_webhooks 
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "portal_webhooks_admin_all" ON public.portal_webhooks 
    FOR ALL USING (company_id = public.get_user_company_id() AND public.is_company_admin_or_manager());

-- portal_webhook_events policies
CREATE POLICY "portal_webhook_events_select" ON public.portal_webhook_events 
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "portal_webhook_events_insert" ON public.portal_webhook_events 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "portal_webhook_events_update" ON public.portal_webhook_events 
    FOR UPDATE USING (true);

-- portal_webhook_logs policies
CREATE POLICY "portal_webhook_logs_select" ON public.portal_webhook_logs 
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "portal_webhook_logs_insert" ON public.portal_webhook_logs 
    FOR INSERT WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_webhook_url(p_company_id uuid, p_portal text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN 'https://zyqlwkkiyuqnhlvnuewk.supabase.co/functions/v1/portal-webhook?company_id=' || p_company_id::text || '&portal=' || p_portal;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_webhook_signature(p_company_id uuid, p_portal text, p_signature text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_secret text;
BEGIN
    SELECT secret_token INTO v_secret FROM public.portal_webhooks 
    WHERE company_id = p_company_id AND portal = p_portal AND status = 'active';
    IF v_secret IS NULL OR v_secret = '' THEN RETURN true; END IF;
    RETURN v_secret = p_signature;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_portal_webhook_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_event record;
    v_result jsonb;
    v_start_time timestamptz;
    v_processing_time int;
BEGIN
    v_start_time := clock_timestamp();
    
    SELECT * INTO v_event FROM public.portal_webhook_events WHERE id = p_event_id;
    IF v_event IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Event not found'); END IF;
    IF v_event.processed THEN RETURN jsonb_build_object('success', true, 'duplicate', true); END IF;
    
    CASE v_event.event_type
        WHEN 'listing.published' THEN
            UPDATE public.portal_listing_publications
            SET status = 'live', published_at = now(), last_synced_at = now(),
                pf_listing_id = COALESCE(v_event.portal_listing_id, pf_listing_id)
            WHERE company_id = v_event.company_id
              AND (pf_listing_id = v_event.portal_listing_id OR pf_reference = v_event.payload->>'reference');
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.published');
            
        WHEN 'listing.updated' THEN
            UPDATE public.portal_listing_publications SET last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.updated');
            
        WHEN 'listing.unpublished', 'listing.removed' THEN
            UPDATE public.portal_listing_publications SET status = 'removed', unpublished_at = now(), last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', v_event.event_type);
            
        WHEN 'listing.rejected' THEN
            UPDATE public.portal_listing_publications
            SET status = 'rejected', last_error_message = v_event.payload->>'reason', 
                last_error_details = v_event.payload, last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.rejected');
            
        WHEN 'listing.sold' THEN
            UPDATE public.portal_listing_publications SET status = 'removed', last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            UPDATE public.listings l SET status = 'sold'
            FROM public.portal_listing_publications p
            WHERE p.listing_id = l.id AND p.company_id = v_event.company_id AND p.pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.sold');
            
        WHEN 'listing.expired' THEN
            UPDATE public.portal_listing_publications SET status = 'expired', last_synced_at = now()
            WHERE company_id = v_event.company_id AND pf_listing_id = v_event.portal_listing_id;
            v_result := jsonb_build_object('success', true, 'event_type', 'listing.expired');
            
        ELSE
            v_result := jsonb_build_object('success', true, 'event_type', v_event.event_type, 'action', 'logged');
    END CASE;
    
    v_processing_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int;
    
    UPDATE public.portal_webhook_events SET processed = true, processed_at = now() WHERE id = p_event_id;
    
    INSERT INTO public.portal_webhook_logs (webhook_event_id, company_id, portal, action, success, processing_time_ms, details)
    VALUES (p_event_id, v_event.company_id, v_event.portal, 'process', true, v_processing_time, v_result);
    
    RETURN v_result || jsonb_build_object('processing_time_ms', v_processing_time);
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.portal_webhook_logs (webhook_event_id, company_id, portal, action, success, error_message, details)
    VALUES (p_event_id, v_event.company_id, v_event.portal, 'error', false, SQLERRM, jsonb_build_object('sqlstate', SQLSTATE));
    
    UPDATE public.portal_webhook_events
    SET retry_count = retry_count + 1, processing_error = SQLERRM,
        next_retry_at = CASE WHEN retry_count < 3 THEN now() + interval '5 minutes' * power(2, retry_count) ELSE NULL END
    WHERE id = p_event_id;
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_webhook_stats(p_company_id uuid, p_portal text DEFAULT NULL, p_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_events', COUNT(*),
        'processed', COUNT(*) FILTER (WHERE processed = true),
        'pending', COUNT(*) FILTER (WHERE processed = false AND (next_retry_at IS NULL OR next_retry_at > now())),
        'failed', COUNT(*) FILTER (WHERE processed = false AND retry_count >= 3),
        'leads_created', COUNT(*) FILTER (WHERE event_type = 'lead.created' AND processed = true),
        'listing_updates', COUNT(*) FILTER (WHERE event_type LIKE 'listing.%' AND processed = true)
    ) INTO v_result
    FROM public.portal_webhook_events
    WHERE company_id = p_company_id
      AND (p_portal IS NULL OR portal = p_portal)
      AND created_at > now() - (p_days || ' days')::interval;
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Triggers
CREATE OR REPLACE FUNCTION public.update_portal_webhooks_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_portal_webhooks_updated_at ON public.portal_webhooks;
CREATE TRIGGER trg_portal_webhooks_updated_at BEFORE UPDATE ON public.portal_webhooks
    FOR EACH ROW EXECUTE FUNCTION public.update_portal_webhooks_updated_at();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_webhook_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_webhook_logs;