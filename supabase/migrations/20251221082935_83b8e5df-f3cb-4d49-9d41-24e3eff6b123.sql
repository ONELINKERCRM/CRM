
-- ================================================
-- ENHANCED WEBHOOK BACKEND FOR ONELINKER CRM
-- ================================================

-- 1. Add realtime support for remaining tables (portal_webhook_events already added)
DO $$ 
BEGIN
    -- Only add if not already a member
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'portal_leads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_leads;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'listing_portals'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_portals;
    END IF;
END $$;

-- 2. Create portal_agent_mappings table for agent mapping between portals and CRM
CREATE TABLE IF NOT EXISTS public.portal_agent_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal TEXT NOT NULL,
    portal_agent_id TEXT NOT NULL,
    portal_agent_email TEXT,
    portal_agent_name TEXT,
    crm_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, portal, portal_agent_id)
);

-- 3. Create listing_portal_mappings table for listing mapping
CREATE TABLE IF NOT EXISTS public.listing_portal_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    portal TEXT NOT NULL,
    portal_listing_id TEXT NOT NULL,
    portal_reference TEXT,
    crm_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'mapped',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, portal, portal_listing_id)
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_unprocessed 
ON public.portal_webhook_events(company_id, processed, received_at) 
WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_portal_webhook_events_retry 
ON public.portal_webhook_events(next_retry_at) 
WHERE processed = false AND next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_leads_agent 
ON public.portal_leads(assigned_agent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_portal_leads_status 
ON public.portal_leads(company_id, status);

CREATE INDEX IF NOT EXISTS idx_portal_agent_mappings_lookup 
ON public.portal_agent_mappings(company_id, portal, portal_agent_id);

CREATE INDEX IF NOT EXISTS idx_listing_portal_mappings_lookup 
ON public.listing_portal_mappings(company_id, portal, portal_listing_id);

-- 5. Enable RLS on new tables
ALTER TABLE public.portal_agent_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_portal_mappings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for portal_agent_mappings (drop if exists first)
DROP POLICY IF EXISTS "Admin/Manager can manage agent mappings" ON public.portal_agent_mappings;
DROP POLICY IF EXISTS "Users can view agent mappings" ON public.portal_agent_mappings;

CREATE POLICY "Admin/Manager can manage agent mappings"
ON public.portal_agent_mappings
FOR ALL
USING (company_id = get_user_company_id() AND is_company_admin_or_manager())
WITH CHECK (company_id = get_user_company_id() AND is_company_admin_or_manager());

CREATE POLICY "Users can view agent mappings"
ON public.portal_agent_mappings
FOR SELECT
USING (company_id = get_user_company_id());

-- 7. RLS Policies for listing_portal_mappings
DROP POLICY IF EXISTS "Admin/Manager can manage listing mappings" ON public.listing_portal_mappings;
DROP POLICY IF EXISTS "Users can view listing mappings" ON public.listing_portal_mappings;

CREATE POLICY "Admin/Manager can manage listing mappings"
ON public.listing_portal_mappings
FOR ALL
USING (company_id = get_user_company_id() AND is_company_admin_or_manager())
WITH CHECK (company_id = get_user_company_id() AND is_company_admin_or_manager());

CREATE POLICY "Users can view listing mappings"
ON public.listing_portal_mappings
FOR SELECT
USING (company_id = get_user_company_id());

-- 8. Enhanced process_portal_lead function with agent mapping
CREATE OR REPLACE FUNCTION public.process_portal_lead_v2(
    p_company_id UUID,
    p_portal TEXT,
    p_portal_lead_id TEXT,
    p_portal_listing_id TEXT DEFAULT NULL,
    p_portal_agent_id TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_message TEXT DEFAULT NULL,
    p_raw_data JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_existing_lead_id UUID;
    v_lead_id UUID;
    v_crm_listing_id UUID;
    v_crm_agent_id UUID;
    v_default_stage_id UUID;
    v_is_duplicate BOOLEAN := false;
    v_mapping_error TEXT;
BEGIN
    -- Idempotency check: portal_lead_id + portal + company_id
    SELECT id INTO v_existing_lead_id
    FROM portal_leads
    WHERE company_id = p_company_id
      AND portal_name = p_portal
      AND portal_lead_id = p_portal_lead_id;

    IF v_existing_lead_id IS NOT NULL THEN
        -- Update existing lead with any new data
        UPDATE portal_leads SET
            name = COALESCE(p_name, name),
            phone = COALESCE(p_phone, phone),
            email = COALESCE(p_email, email),
            message = COALESCE(p_message, message),
            raw_data = COALESCE(p_raw_data, raw_data),
            updated_at = now()
        WHERE id = v_existing_lead_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'lead_id', v_existing_lead_id,
            'status', 'duplicate',
            'is_duplicate', true
        );
    END IF;

    -- Map listing from portal
    IF p_portal_listing_id IS NOT NULL THEN
        SELECT crm_listing_id INTO v_crm_listing_id
        FROM listing_portal_mappings
        WHERE company_id = p_company_id
          AND portal = p_portal
          AND (portal_listing_id = p_portal_listing_id OR portal_reference = p_portal_listing_id);
        
        -- Fallback: try to match by reference in listings table
        IF v_crm_listing_id IS NULL THEN
            SELECT id INTO v_crm_listing_id
            FROM listings
            WHERE company_id = p_company_id
              AND reference_number = p_portal_listing_id;
        END IF;
        
        -- Get agent from listing if available
        IF v_crm_listing_id IS NOT NULL THEN
            SELECT assigned_agent_id INTO v_crm_agent_id
            FROM listings
            WHERE id = v_crm_listing_id;
        END IF;
    END IF;

    -- Map agent from portal (overrides listing agent if specified)
    IF p_portal_agent_id IS NOT NULL AND v_crm_agent_id IS NULL THEN
        SELECT crm_agent_id INTO v_crm_agent_id
        FROM portal_agent_mappings
        WHERE company_id = p_company_id
          AND portal = p_portal
          AND portal_agent_id = p_portal_agent_id
          AND crm_agent_id IS NOT NULL;
    END IF;

    -- Fallback: round-robin assignment
    IF v_crm_agent_id IS NULL THEN
        SELECT id INTO v_crm_agent_id
        FROM agents
        WHERE company_id = p_company_id
          AND status = 'active'
          AND role IN ('agent', 'manager', 'admin')
        ORDER BY (
            SELECT COUNT(*) FROM portal_leads pl 
            WHERE pl.assigned_agent_id = agents.id 
              AND pl.created_at > now() - interval '7 days'
        ) ASC
        LIMIT 1;
    END IF;

    -- Build mapping error message if applicable
    IF v_crm_listing_id IS NULL AND p_portal_listing_id IS NOT NULL THEN
        v_mapping_error := 'Listing not found: ' || p_portal_listing_id;
    END IF;
    IF v_crm_agent_id IS NULL THEN
        v_mapping_error := COALESCE(v_mapping_error || '; ', '') || 'No agent available for assignment';
    END IF;

    -- Get default stage
    SELECT id INTO v_default_stage_id
    FROM lead_stages
    WHERE company_id = p_company_id
      AND (name ILIKE '%new%' OR is_default = true)
    ORDER BY sort_order ASC
    LIMIT 1;

    -- Insert new lead
    INSERT INTO portal_leads (
        company_id, portal_name, portal_lead_id, listing_id,
        assigned_agent_id, name, phone, email, message,
        source, stage_id, status, error_message, raw_data
    ) VALUES (
        p_company_id, p_portal, p_portal_lead_id, v_crm_listing_id,
        v_crm_agent_id, COALESCE(p_name, 'Unknown'), p_phone, p_email, p_message,
        p_portal, v_default_stage_id, 
        CASE WHEN v_mapping_error IS NOT NULL THEN 'unassigned_error' ELSE 'imported' END,
        v_mapping_error, p_raw_data
    )
    RETURNING id INTO v_lead_id;

    -- Log activity
    INSERT INTO lead_activities (lead_id, company_id, type, title, agent_name, description)
    VALUES (v_lead_id, p_company_id, 'lead_created', 
            'Lead from ' || p_portal,
            COALESCE((SELECT name FROM agents WHERE id = v_crm_agent_id), 'System'),
            'Lead received via webhook');

    -- Create notification for assigned agent
    IF v_crm_agent_id IS NOT NULL THEN
        INSERT INTO assignment_notifications (
            company_id, agent_id, lead_id, title, message, notification_type
        ) VALUES (
            p_company_id, v_crm_agent_id, v_lead_id,
            'New lead from ' || p_portal,
            'You have been assigned a new lead: ' || COALESCE(p_name, 'Unknown'),
            'lead_assignment'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'lead_id', v_lead_id,
        'status', CASE WHEN v_mapping_error IS NOT NULL THEN 'unassigned_error' ELSE 'imported' END,
        'is_duplicate', false,
        'crm_listing_id', v_crm_listing_id,
        'crm_agent_id', v_crm_agent_id,
        'mapping_error', v_mapping_error
    );

EXCEPTION WHEN OTHERS THEN
    INSERT INTO portal_import_errors (company_id, portal_name, lead_data, error_message, error_type)
    VALUES (p_company_id, p_portal, p_raw_data, SQLERRM, 'processing_error');
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 9. Enhanced listing webhook processor
CREATE OR REPLACE FUNCTION public.process_listing_webhook_event(
    p_company_id UUID,
    p_portal TEXT,
    p_event_type TEXT,
    p_portal_listing_id TEXT,
    p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_crm_listing_id UUID;
    v_publication_id UUID;
    v_status TEXT;
    v_result JSONB;
BEGIN
    -- Find CRM listing via mapping
    SELECT crm_listing_id INTO v_crm_listing_id
    FROM listing_portal_mappings
    WHERE company_id = p_company_id
      AND portal = p_portal
      AND portal_listing_id = p_portal_listing_id;

    -- Fallback to listing_portals
    IF v_crm_listing_id IS NULL THEN
        SELECT listing_id INTO v_crm_listing_id
        FROM listing_portals
        WHERE company_id = p_company_id
          AND portal_name = p_portal
          AND portal_listing_id = p_portal_listing_id;
    END IF;

    IF v_crm_listing_id IS NULL THEN
        -- Create mapping error record
        INSERT INTO portal_import_errors (
            company_id, portal_name, lead_data, error_message, error_type
        ) VALUES (
            p_company_id, p_portal, p_payload,
            'Listing not found for portal_listing_id: ' || p_portal_listing_id,
            'listing_mapping_error'
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Listing not found',
            'portal_listing_id', p_portal_listing_id
        );
    END IF;

    -- Determine new status based on event type
    CASE p_event_type
        WHEN 'listing.published' THEN v_status := 'published';
        WHEN 'listing.updated' THEN v_status := 'published';
        WHEN 'listing.unpublished' THEN v_status := 'unpublished';
        WHEN 'listing.rejected' THEN v_status := 'rejected';
        WHEN 'listing.sold' THEN v_status := 'sold';
        WHEN 'listing.expired' THEN v_status := 'expired';
        ELSE v_status := 'unknown';
    END CASE;

    -- Update listing_portals
    UPDATE listing_portals SET
        publish_status = v_status,
        last_sync_at = now(),
        error_message = CASE 
            WHEN p_event_type = 'listing.rejected' 
            THEN COALESCE(p_payload->>'reason', p_payload->>'rejection_reason', 'Rejected by portal')
            ELSE NULL 
        END,
        updated_at = now()
    WHERE listing_id = v_crm_listing_id
      AND company_id = p_company_id
      AND portal_name = p_portal;

    -- Update listing status if sold
    IF p_event_type = 'listing.sold' THEN
        UPDATE listings SET status = 'sold', updated_at = now()
        WHERE id = v_crm_listing_id AND company_id = p_company_id;
    END IF;

    -- Log the update
    INSERT INTO portal_publish_logs (
        company_id, listing_id, portal_name, action, status, details
    ) VALUES (
        p_company_id, v_crm_listing_id, p_portal, 
        'webhook_' || p_event_type, 
        'success',
        p_payload
    );

    RETURN jsonb_build_object(
        'success', true,
        'event_type', p_event_type,
        'crm_listing_id', v_crm_listing_id,
        'new_status', v_status
    );

EXCEPTION WHEN OTHERS THEN
    INSERT INTO portal_import_errors (company_id, portal_name, lead_data, error_message, error_type)
    VALUES (p_company_id, p_portal, p_payload, SQLERRM, 'listing_webhook_error');
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 10. Function to validate webhook signature
CREATE OR REPLACE FUNCTION public.validate_portal_webhook(
    p_company_id UUID,
    p_portal TEXT,
    p_signature TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    SELECT secret_token INTO v_secret
    FROM portal_webhooks
    WHERE company_id = p_company_id
      AND portal = p_portal
      AND status = 'active';

    IF v_secret IS NULL THEN
        RETURN true; -- No secret configured, allow webhook
    END IF;

    RETURN p_signature = v_secret;
END;
$$;

-- 11. Function to get unassigned leads (for Admin view)
CREATE OR REPLACE FUNCTION public.get_unassigned_portal_leads(
    p_company_id UUID,
    p_limit INT DEFAULT 50
) RETURNS TABLE (
    id UUID,
    portal_name TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.id,
        pl.portal_name,
        pl.name,
        pl.phone,
        pl.email,
        pl.error_message,
        pl.created_at
    FROM portal_leads pl
    WHERE pl.company_id = p_company_id
      AND (pl.status = 'unassigned_error' OR pl.assigned_agent_id IS NULL)
    ORDER BY pl.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 12. Function to get webhook statistics
CREATE OR REPLACE FUNCTION public.get_portal_webhook_stats_v2(
    p_company_id UUID,
    p_days INT DEFAULT 7
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_result JSONB;
    v_total INT;
    v_processed INT;
    v_pending INT;
    v_failed INT;
    v_leads INT;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE processed = true),
        COUNT(*) FILTER (WHERE processed = false),
        COUNT(*) FILTER (WHERE processing_error IS NOT NULL)
    INTO v_total, v_processed, v_pending, v_failed
    FROM portal_webhook_events
    WHERE company_id = p_company_id
      AND received_at > now() - (p_days || ' days')::interval;

    SELECT COUNT(*) INTO v_leads
    FROM portal_leads 
    WHERE company_id = p_company_id 
      AND created_at > now() - (p_days || ' days')::interval;

    v_result := jsonb_build_object(
        'total_events', COALESCE(v_total, 0),
        'processed', COALESCE(v_processed, 0),
        'pending', COALESCE(v_pending, 0),
        'failed', COALESCE(v_failed, 0),
        'leads_created', COALESCE(v_leads, 0)
    );

    RETURN v_result;
END;
$$;

-- 13. Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_portal_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_portal_agent_mappings_timestamp ON public.portal_agent_mappings;
CREATE TRIGGER update_portal_agent_mappings_timestamp
BEFORE UPDATE ON public.portal_agent_mappings
FOR EACH ROW EXECUTE FUNCTION update_portal_mapping_timestamp();

DROP TRIGGER IF EXISTS update_listing_portal_mappings_timestamp ON public.listing_portal_mappings;
CREATE TRIGGER update_listing_portal_mappings_timestamp
BEFORE UPDATE ON public.listing_portal_mappings
FOR EACH ROW EXECUTE FUNCTION update_portal_mapping_timestamp();

-- 14. Retry failed webhooks function (for async processing)
CREATE OR REPLACE FUNCTION public.retry_failed_webhook_events(
    p_max_retries INT DEFAULT 5
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_event RECORD;
    v_count INT := 0;
    v_result JSONB;
BEGIN
    FOR v_event IN
        SELECT id, company_id, portal, event_type, payload, portal_listing_id, portal_lead_id
        FROM portal_webhook_events
        WHERE processed = false
          AND next_retry_at <= now()
          AND retry_count < p_max_retries
        ORDER BY received_at ASC
        LIMIT 100
    LOOP
        -- Process based on event type
        IF v_event.event_type LIKE 'lead.%' THEN
            SELECT process_portal_lead_v2(
                v_event.company_id,
                v_event.portal,
                v_event.portal_lead_id,
                v_event.payload->>'listing_id',
                v_event.payload->>'agent_id',
                v_event.payload->>'name',
                v_event.payload->>'phone',
                v_event.payload->>'email',
                v_event.payload->>'message',
                v_event.payload
            ) INTO v_result;
        ELSIF v_event.event_type LIKE 'listing.%' THEN
            SELECT process_listing_webhook_event(
                v_event.company_id,
                v_event.portal,
                v_event.event_type,
                v_event.portal_listing_id,
                v_event.payload
            ) INTO v_result;
        END IF;

        IF (v_result->>'success')::boolean THEN
            UPDATE portal_webhook_events 
            SET processed = true, processed_at = now(), processing_error = NULL
            WHERE id = v_event.id;
        ELSE
            UPDATE portal_webhook_events
            SET retry_count = retry_count + 1,
                processing_error = v_result->>'error',
                next_retry_at = now() + (power(2, retry_count + 1) || ' minutes')::interval
            WHERE id = v_event.id;
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- 15. Auto-create mapping when publishing listing
CREATE OR REPLACE FUNCTION public.auto_create_listing_portal_mapping()
RETURNS TRIGGER AS $$
BEGIN
    -- When a listing is published to a portal, create the mapping
    IF NEW.portal_listing_id IS NOT NULL AND NEW.publish_status = 'published' THEN
        INSERT INTO listing_portal_mappings (
            company_id, portal, portal_listing_id, portal_reference, crm_listing_id
        ) VALUES (
            NEW.company_id, NEW.portal_name, NEW.portal_listing_id, 
            (SELECT reference_number FROM listings WHERE id = NEW.listing_id),
            NEW.listing_id
        )
        ON CONFLICT (company_id, portal, portal_listing_id) 
        DO UPDATE SET 
            crm_listing_id = EXCLUDED.crm_listing_id,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_listing_portal_mapping_trigger ON public.listing_portals;
CREATE TRIGGER auto_create_listing_portal_mapping_trigger
AFTER INSERT OR UPDATE ON public.listing_portals
FOR EACH ROW EXECUTE FUNCTION auto_create_listing_portal_mapping();
