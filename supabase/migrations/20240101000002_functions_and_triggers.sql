-- 20240101000002_functions_and_triggers.sql
-- Description: Essential functions and triggers for automating tasks like updating timestamps and handling user creation.

-- 1. Auto-update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER set_updated_at_organizations
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_companies
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_agents
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_leads
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_crm_leads
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_contacts
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_accounts
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_deals
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 2. Handle New User Signup (Profile Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Auth Users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Lead Source Webhook Token Generation (Utility)
CREATE OR REPLACE FUNCTION public.generate_webhook_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 4. Portal Lead Processing Placeholder (RPC)
-- This function was referenced in usePortalLeads.ts
CREATE OR REPLACE FUNCTION public.process_portal_lead(
    p_company_id UUID,
    p_portal_name TEXT,
    p_portal_lead_id TEXT,
    p_name TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_message TEXT,
    p_listing_ref TEXT,
    p_raw_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_lead_id UUID;
BEGIN
    -- Logic to insert/update portal_leads and sync to main leads table
    -- Simplified for migration:
    INSERT INTO public.portal_leads (
        company_id, portal_name, portal_lead_id, name, phone, email, message, raw_data
    )
    VALUES (
        p_company_id, p_portal_name, p_portal_lead_id, p_name, p_phone, p_email, p_message, p_raw_data
    )
    ON CONFLICT (company_id, portal_name, portal_lead_id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        message = EXCLUDED.message,
        updated_at = now()
    RETURNING id INTO v_lead_id;

    RETURN jsonb_build_object('success', true, 'lead_id', v_lead_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. API Key Generation RPC
-- Referenced in useWebsiteForms.ts
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
BEGIN
    -- Generates a random 32-char hex string
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;
