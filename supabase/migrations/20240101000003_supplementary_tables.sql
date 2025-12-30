-- 20240101000003_supplementary_tables.sql
-- Description: Additional tables identified from the project types that were not in the initial core schema.
-- Updated to exclude tables moved to initial_schema.

-- 1. Real Estate / Listings
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reference_number TEXT,
    price NUMERIC,
    currency TEXT DEFAULT 'USD',
    type TEXT, -- apartment, villa, etc.
    status TEXT DEFAULT 'available', -- available, sold, rented
    address JSONB,
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sqft NUMERIC,
    owner_id UUID REFERENCES public.agents(id),
    created_by UUID REFERENCES public.agents(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) NOT NULL,
    url TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.property_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.property_portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) NOT NULL,
    portal_name TEXT NOT NULL,
    external_id TEXT,
    status TEXT DEFAULT 'pending', -- published, failed, pending
    last_synced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Lead Assignment & Pools
CREATE TABLE public.lead_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB, -- Logic for routing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.agent_load (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.agents(id) NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    current_leads_count INTEGER DEFAULT 0,
    max_leads_capacity INTEGER DEFAULT 100,
    is_available BOOLEAN DEFAULT true,
    last_assignment_at TIMESTAMP WITH TIME ZONE,
    total_assignments_today INTEGER DEFAULT 0,
    conversion_rate NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.lead_assignment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    lead_id UUID, -- Polymorphic reference to leads or crm_leads ideally
    previous_agent_id UUID REFERENCES public.agents(id),
    new_agent_id UUID REFERENCES public.agents(id),
    reason TEXT, -- manual, round_robin, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.auto_reassignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    days_without_contact INTEGER DEFAULT 3,
    apply_to_stages TEXT[],
    reassign_to_pool_id UUID REFERENCES public.lead_pools(id),
    reassign_to_agent_id UUID REFERENCES public.agents(id),
    use_round_robin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.assignment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    agent_id UUID REFERENCES public.agents(id) NOT NULL,
    lead_id UUID,
    assignment_log_id UUID REFERENCES public.lead_assignment_logs(id),
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Privacy & Messaging
CREATE TABLE public.privacy_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    contact_email TEXT,
    request_type TEXT NOT NULL, -- delete_data, export_data
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Apply RLS to new tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_load ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reassignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Basic Policies for new tables
CREATE POLICY "Users can view properties" ON public.properties FOR ALL USING ( organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()) );
-- (Add other specific policies as needed, sticking to the organization/company membership pattern)
