
-- Fix Function Search Path Mutable warnings by setting search_path on trigger functions
CREATE OR REPLACE FUNCTION update_portal_mapping_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_listing_portal_mapping()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;
