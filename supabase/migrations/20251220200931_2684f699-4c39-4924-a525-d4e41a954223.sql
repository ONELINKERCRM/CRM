
-- =====================================================
-- PROPERTY FINDER BACKEND SCHEMA & SECURITY
-- =====================================================

-- 1) Add Property Finder specific fields to portal_accounts
ALTER TABLE public.portal_accounts
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS api_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS portal_type TEXT DEFAULT 'generic';

-- Add comment for clarity
COMMENT ON COLUMN public.portal_accounts.api_key_encrypted IS 'Encrypted API key for Property Finder Partner API';
COMMENT ON COLUMN public.portal_accounts.api_secret_encrypted IS 'Encrypted API secret for Property Finder Partner API';
COMMENT ON COLUMN public.portal_accounts.access_token_encrypted IS 'Encrypted access token from Property Finder';
COMMENT ON COLUMN public.portal_accounts.token_expires_at IS 'Token expiry timestamp';

-- 2) Create portal agent mappings table
CREATE TABLE IF NOT EXISTS public.pf_agent_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  portal_account_id UUID NOT NULL REFERENCES public.portal_accounts(id) ON DELETE CASCADE,
  portal_agent_id TEXT NOT NULL,
  agent_name TEXT,
  agent_email TEXT,
  agent_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, agent_id, portal_account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pf_agent_mappings_company ON public.pf_agent_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_pf_agent_mappings_agent ON public.pf_agent_mappings(agent_id);
CREATE INDEX IF NOT EXISTS idx_pf_agent_mappings_portal_account ON public.pf_agent_mappings(portal_account_id);

-- 3) Create portal publish logs table for full audit trail
CREATE TABLE IF NOT EXISTS public.portal_publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  portal_account_id UUID REFERENCES public.portal_accounts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  portal TEXT NOT NULL DEFAULT 'property_finder',
  action TEXT NOT NULL, -- publish, update, unpublish
  success BOOLEAN NOT NULL DEFAULT false,
  portal_listing_id TEXT,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_portal_publish_logs_company ON public.portal_publish_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_publish_logs_listing ON public.portal_publish_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_portal_publish_logs_created ON public.portal_publish_logs(created_at DESC);

-- 4) Add portal_listing_id tracking to portal_listing_publications if not exists
ALTER TABLE public.portal_listing_publications
ADD COLUMN IF NOT EXISTS pf_listing_id TEXT,
ADD COLUMN IF NOT EXISTS pf_reference TEXT,
ADD COLUMN IF NOT EXISTS last_error_details JSONB;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.pf_agent_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_publish_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY FUNCTIONS (SECURITY DEFINER)
-- =====================================================

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.agents
  WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND status = 'active'
  LIMIT 1;
  
  RETURN v_role IN ('admin', 'manager');
END;
$$;

-- Function to check if user can publish a specific listing
CREATE OR REPLACE FUNCTION public.can_publish_listing(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_agent_id UUID;
  v_role TEXT;
BEGIN
  -- Get listing details
  SELECT company_id, assigned_agent_id INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get current user's agent info
  SELECT id, role INTO v_agent_id, v_role
  FROM public.agents
  WHERE user_id = auth.uid()
    AND company_id = v_listing.company_id
    AND status = 'active'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Admin/Manager can publish any listing
  IF v_role IN ('admin', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Agent can only publish their own listings
  RETURN v_listing.assigned_agent_id = v_agent_id;
END;
$$;

-- Function to get user's company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.agents
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;
  
  RETURN v_company_id;
END;
$$;

-- =====================================================
-- RLS POLICIES FOR pf_agent_mappings
-- =====================================================

-- Users can view mappings for their company
CREATE POLICY "Users can view company agent mappings"
ON public.pf_agent_mappings
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Only admin/manager can insert mappings
CREATE POLICY "Admin/Manager can create agent mappings"
ON public.pf_agent_mappings
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- Only admin/manager can update mappings
CREATE POLICY "Admin/Manager can update agent mappings"
ON public.pf_agent_mappings
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- Only admin/manager can delete mappings
CREATE POLICY "Admin/Manager can delete agent mappings"
ON public.pf_agent_mappings
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- =====================================================
-- RLS POLICIES FOR portal_publish_logs
-- =====================================================

-- Users can view logs for their company
CREATE POLICY "Users can view company publish logs"
ON public.portal_publish_logs
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Insert is handled by server (edge function with service role)
-- But allow authenticated users to insert for their own actions
CREATE POLICY "Authenticated users can create publish logs"
ON public.portal_publish_logs
FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id());

-- =====================================================
-- RLS POLICIES FOR portal_accounts (API credentials)
-- =====================================================

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view portal accounts" ON public.portal_accounts;
DROP POLICY IF EXISTS "Admin/Manager can create portal accounts" ON public.portal_accounts;
DROP POLICY IF EXISTS "Admin/Manager can update portal accounts" ON public.portal_accounts;
DROP POLICY IF EXISTS "Admin/Manager can delete portal accounts" ON public.portal_accounts;

-- Users can view portal accounts for their company
CREATE POLICY "Users can view portal accounts"
ON public.portal_accounts
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Only admin/manager can create portal accounts
CREATE POLICY "Admin/Manager can create portal accounts"
ON public.portal_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- Only admin/manager can update portal accounts
CREATE POLICY "Admin/Manager can update portal accounts"
ON public.portal_accounts
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- Only admin/manager can delete portal accounts
CREATE POLICY "Admin/Manager can delete portal accounts"
ON public.portal_accounts
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.is_company_admin_or_manager(company_id)
);

-- =====================================================
-- RLS POLICIES FOR portal_listing_publications
-- =====================================================

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view publications" ON public.portal_listing_publications;
DROP POLICY IF EXISTS "Users can create publications for their listings" ON public.portal_listing_publications;
DROP POLICY IF EXISTS "Users can update publications for their listings" ON public.portal_listing_publications;

-- Users can view all publications for their company
CREATE POLICY "Users can view publications"
ON public.portal_listing_publications
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

-- Users can only create publications for listings they can publish
CREATE POLICY "Users can create publications for their listings"
ON public.portal_listing_publications
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id()
  AND public.can_publish_listing(listing_id)
);

-- Users can only update publications for listings they can publish
CREATE POLICY "Users can update publications for their listings"
ON public.portal_listing_publications
FOR UPDATE
TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND public.can_publish_listing(listing_id)
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_pf_agent_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_pf_agent_mappings_timestamp ON public.pf_agent_mappings;
CREATE TRIGGER update_pf_agent_mappings_timestamp
BEFORE UPDATE ON public.pf_agent_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_pf_agent_mappings_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to validate agent mapping before publish
CREATE OR REPLACE FUNCTION public.validate_pf_publish_requirements(
  p_listing_id UUID,
  p_portal_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_portal_account RECORD;
  v_agent_mapping RECORD;
  v_errors TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
BEGIN
  -- Get listing
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errors', ARRAY['Listing not found']);
  END IF;
  
  -- Get portal account
  SELECT * INTO v_portal_account
  FROM public.portal_accounts
  WHERE id = p_portal_account_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'errors', ARRAY['Portal account not found']);
  END IF;
  
  -- Check if portal account is connected
  IF v_portal_account.status != 'connected' THEN
    v_errors := array_append(v_errors, 'Portal account is not connected');
  END IF;
  
  -- Check agent mapping
  SELECT * INTO v_agent_mapping
  FROM public.pf_agent_mappings
  WHERE portal_account_id = p_portal_account_id
    AND agent_id = v_listing.assigned_agent_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Assigned agent is not mapped to Property Finder');
  END IF;
  
  -- Validate required fields
  IF v_listing.title IS NULL OR v_listing.title = '' THEN
    v_errors := array_append(v_errors, 'Title is required');
  END IF;
  
  IF v_listing.description IS NULL OR v_listing.description = '' THEN
    v_errors := array_append(v_errors, 'Description is required');
  END IF;
  
  IF v_listing.price IS NULL OR v_listing.price <= 0 THEN
    v_errors := array_append(v_errors, 'Price is required');
  END IF;
  
  IF v_listing.permit_number IS NULL OR v_listing.permit_number = '' THEN
    v_warnings := array_append(v_warnings, 'Permit number is recommended');
  END IF;
  
  -- Check images
  IF v_listing.images IS NULL OR jsonb_array_length(v_listing.images) < 1 THEN
    v_errors := array_append(v_errors, 'At least 1 image is required');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', array_length(v_errors, 1) IS NULL,
    'errors', v_errors,
    'warnings', v_warnings,
    'agent_mapping', CASE WHEN v_agent_mapping IS NOT NULL 
      THEN jsonb_build_object(
        'id', v_agent_mapping.id,
        'portal_agent_id', v_agent_mapping.portal_agent_id
      )
      ELSE NULL 
    END
  );
END;
$$;

-- Function to log publish action
CREATE OR REPLACE FUNCTION public.log_pf_publish_action(
  p_company_id UUID,
  p_listing_id UUID,
  p_portal_account_id UUID,
  p_action TEXT,
  p_success BOOLEAN,
  p_portal_listing_id TEXT DEFAULT NULL,
  p_request_payload JSONB DEFAULT NULL,
  p_response_payload JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_agent_id UUID;
BEGIN
  -- Get current user's agent id
  SELECT id INTO v_agent_id
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  INSERT INTO public.portal_publish_logs (
    company_id,
    listing_id,
    portal_account_id,
    user_id,
    portal,
    action,
    success,
    portal_listing_id,
    request_payload,
    response_payload,
    error_message
  ) VALUES (
    p_company_id,
    p_listing_id,
    p_portal_account_id,
    v_agent_id,
    'property_finder',
    p_action,
    p_success,
    p_portal_listing_id,
    p_request_payload,
    p_response_payload,
    p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Enable realtime for publish logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_publish_logs;
