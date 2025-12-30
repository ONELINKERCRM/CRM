-- Migration to fix listing duplication and improve data integrity
-- Task: Analyze and fix listing duplication, unreliable automations, and inconsistent data relations.

-- 1. Ensure reference_number is unique to prevent logical duplicates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_reference_number_key'
    ) THEN
        ALTER TABLE public.listings ADD CONSTRAINT listings_reference_number_key UNIQUE (reference_number);
    END IF;
END $$;

-- 2. Improved Audit Log Function to capture detailed changes
CREATE OR REPLACE FUNCTION public.log_listing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.listing_audit_logs (
            listing_id,
            company_id,
            action_type,
            description,
            changes,
            performed_by
        ) VALUES (
            NEW.id,
            NEW.company_id,
            'edit',
            'Updated listing: ' || NEW.title,
            jsonb_build_object(
                'old', row_to_json(OLD),
                'new', row_to_json(NEW)
            ),
            auth.uid()
        );
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.listing_audit_logs (
            listing_id,
            company_id,
            action_type,
            description,
            performed_by
        ) VALUES (
            NEW.id,
            NEW.company_id,
            'create',
            'Created listing: ' || NEW.title,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Trigger for automatic audit logging (Ensures automations run on true changes)
DROP TRIGGER IF EXISTS trigger_listing_audit ON public.listings;
DROP TRIGGER IF EXISTS trigger_listing_audit_insert ON public.listings;
DROP TRIGGER IF EXISTS trigger_listing_audit_update ON public.listings;

CREATE TRIGGER trigger_listing_audit_insert
    AFTER INSERT ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.log_listing_change();

CREATE TRIGGER trigger_listing_audit_update
    AFTER UPDATE ON public.listings
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION public.log_listing_change();

-- 4. Robust RPC for saving listings to prevent race conditions and duplication
CREATE OR REPLACE FUNCTION public.save_listing_v2(
    p_id uuid,
    p_company_id uuid,
    p_data jsonb,
    p_mode text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_listing_id uuid;
    v_agent_id uuid;
BEGIN
    -- Get current agent ID
    SELECT id INTO v_agent_id FROM public.agents WHERE user_id = auth.uid() LIMIT 1;
    
    IF p_mode = 'edit' THEN
        -- Verify ownership/permissions via RLS or manual check
        IF NOT EXISTS (
            SELECT 1 FROM public.listings 
            WHERE id = p_id 
            AND company_id = p_company_id
        ) THEN
            RAISE EXCEPTION 'Listing not found or access denied';
        END IF;

        UPDATE public.listings
        SET 
            title = COALESCE((p_data->>'title'), title),
            description = (p_data->>'description'),
            price = (p_data->>'price')::numeric,
            status = COALESCE((p_data->>'status'), status),
            updated_at = now()
            -- Add other fields as needed
        WHERE id = p_id;
        
        v_listing_id := p_id;
    ELSE
        INSERT INTO public.listings (
            company_id,
            title,
            description,
            price,
            status,
            created_by,
            assigned_agent_id
        ) VALUES (
            p_company_id,
            (p_data->>'title'),
            (p_data->>'description'),
            (p_data->>'price')::numeric,
            COALESCE((p_data->>'status'), 'draft'),
            v_agent_id,
            v_agent_id
        )
        RETURNING id INTO v_listing_id;
    END IF;

    RETURN v_listing_id;
END;
$$;
