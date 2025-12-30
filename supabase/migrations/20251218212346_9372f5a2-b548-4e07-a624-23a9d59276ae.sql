
-- =============================================
-- LISTING MANAGEMENT COMPLETE BACKEND
-- =============================================

-- 1) Main listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reference_number text,
  address text,
  city text,
  state text,
  country text DEFAULT 'UAE',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  property_type text NOT NULL DEFAULT 'residential' CHECK (property_type IN ('residential', 'commercial', 'land', 'industrial', 'mixed_use', 'other')),
  listing_type text DEFAULT 'sale' CHECK (listing_type IN ('sale', 'rent', 'both')),
  price numeric(15, 2),
  currency text DEFAULT 'AED' CHECK (currency IN ('AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR')),
  price_per_sqft numeric(10, 2),
  rent_frequency text CHECK (rent_frequency IN ('yearly', 'monthly', 'weekly', 'daily')),
  number_of_bedrooms integer,
  number_of_bathrooms integer,
  area_size numeric(12, 2),
  area_unit text DEFAULT 'sqft' CHECK (area_unit IN ('sqft', 'sqm')),
  plot_size numeric(12, 2),
  furnished text DEFAULT 'unfurnished' CHECK (furnished IN ('furnished', 'semi_furnished', 'unfurnished')),
  parking_spaces integer DEFAULT 0,
  amenities jsonb DEFAULT '[]',
  tags jsonb DEFAULT '[]',
  images jsonb DEFAULT '[]',
  videos jsonb DEFAULT '[]',
  documents jsonb DEFAULT '[]',
  floor_plans jsonb DEFAULT '[]',
  virtual_tour_url text,
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_agents jsonb DEFAULT '[]',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'published', 'archived', 'expired', 'sold', 'rented')),
  featured boolean DEFAULT false,
  premium boolean DEFAULT false,
  permit_number text,
  rera_number text,
  completion_status text DEFAULT 'ready' CHECK (completion_status IN ('ready', 'off_plan', 'under_construction')),
  handover_date date,
  developer text,
  project_name text,
  building_name text,
  floor_number integer,
  view_type text,
  ownership_type text CHECK (ownership_type IN ('freehold', 'leasehold', 'commonhold')),
  service_charge numeric(10, 2),
  expires_at timestamptz,
  published_at timestamptz,
  created_by uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Listing portals - tracks publishing to external portals
CREATE TABLE IF NOT EXISTS public.listing_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_name text NOT NULL CHECK (portal_name IN ('property_finder', 'dubizzle', 'bayut', 'website', 'zillow', 'rightmove', 'zoopla', 'custom')),
  portal_listing_id text,
  portal_url text,
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE SET NULL,
  customizations jsonb DEFAULT '{}',
  publish_status text DEFAULT 'draft' CHECK (publish_status IN ('draft', 'pending', 'published', 'failed', 'expired', 'unpublished')),
  publish_time timestamptz,
  unpublish_time timestamptz,
  last_sync_at timestamptz,
  sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  error_message text,
  retry_count integer DEFAULT 0,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Listing analytics - tracks views, clicks, inquiries
CREATE TABLE IF NOT EXISTS public.listing_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_name text,
  date date DEFAULT CURRENT_DATE,
  views_count integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  inquiries_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  favorites_count integer DEFAULT 0,
  phone_reveals integer DEFAULT 0,
  whatsapp_clicks integer DEFAULT 0,
  email_inquiries integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, portal_name, date)
);

-- 4) Listing audit logs
CREATE TABLE IF NOT EXISTS public.listing_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('create', 'edit', 'delete', 'publish', 'unpublish', 'assign', 'archive', 'restore', 'share', 'view', 'duplicate')),
  performed_by uuid,
  description text NOT NULL,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 5) Listing version history
CREATE TABLE IF NOT EXISTS public.listing_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_summary text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 6) Listing shares tracking
CREATE TABLE IF NOT EXISTS public.listing_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  share_type text NOT NULL CHECK (share_type IN ('whatsapp', 'email', 'pdf', 'link', 'social')),
  recipient_name text,
  recipient_contact text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  shared_by uuid NOT NULL,
  share_url text,
  pdf_url text,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 7) Listing inquiries from portals
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_name text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  message text,
  source_url text,
  external_id text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'spam')),
  assigned_to uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_listings_company_id ON public.listings(company_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_assigned_agent ON public.listings(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON public.listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON public.listings(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_portals_listing ON public.listing_portals(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_portals_company ON public.listing_portals(company_id);
CREATE INDEX IF NOT EXISTS idx_listing_portals_status ON public.listing_portals(publish_status);

CREATE INDEX IF NOT EXISTS idx_listing_analytics_listing ON public.listing_analytics(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_analytics_date ON public.listing_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_listing_audit_logs_listing ON public.listing_audit_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_audit_logs_company ON public.listing_audit_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_listing_inquiries_listing ON public.listing_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_inquiries_status ON public.listing_inquiries(status);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is listing admin
CREATE OR REPLACE FUNCTION public.is_listing_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- Helper function to get user's agent id
CREATE OR REPLACE FUNCTION public.get_user_agent_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_id uuid;
BEGIN
  SELECT id INTO agent_id
  FROM public.agents
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN agent_id;
END;
$$;

-- listings policies
CREATE POLICY "Users can view company listings"
  ON public.listings FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_listing_admin()
  );

CREATE POLICY "Admin/Manager can update any listing"
  ON public.listings FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND (
      public.is_listing_admin()
      OR assigned_agent_id = public.get_user_agent_id()
    )
  );

CREATE POLICY "Admin/Manager can delete listings"
  ON public.listings FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_listing_admin()
  );

-- listing_portals policies
CREATE POLICY "Users can view company portals"
  ON public.listing_portals FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can manage portals"
  ON public.listing_portals FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_listing_admin()
  );

-- listing_analytics policies
CREATE POLICY "Users can view company analytics"
  ON public.listing_analytics FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert analytics"
  ON public.listing_analytics FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- listing_audit_logs policies
CREATE POLICY "Users can view company audit logs"
  ON public.listing_audit_logs FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert audit logs"
  ON public.listing_audit_logs FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- listing_version_history policies
CREATE POLICY "Users can view company version history"
  ON public.listing_version_history FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert version history"
  ON public.listing_version_history FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- listing_shares policies
CREATE POLICY "Users can view company shares"
  ON public.listing_shares FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create shares"
  ON public.listing_shares FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- listing_inquiries policies
CREATE POLICY "Users can view company inquiries"
  ON public.listing_inquiries FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage inquiries"
  ON public.listing_inquiries FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to log listing actions
CREATE OR REPLACE FUNCTION public.log_listing_action(
  p_listing_id uuid,
  p_company_id uuid,
  p_action_type text,
  p_description text,
  p_changes jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.listing_audit_logs (
    listing_id,
    company_id,
    action_type,
    description,
    changes,
    performed_by
  ) VALUES (
    p_listing_id,
    p_company_id,
    p_action_type,
    p_description,
    p_changes,
    auth.uid()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to create version snapshot
CREATE OR REPLACE FUNCTION public.create_listing_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  version_num integer;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO version_num
  FROM public.listing_version_history
  WHERE listing_id = NEW.id;
  
  -- Create version snapshot
  INSERT INTO public.listing_version_history (
    listing_id,
    company_id,
    version_number,
    snapshot,
    created_by
  ) VALUES (
    NEW.id,
    NEW.company_id,
    version_num,
    row_to_json(NEW),
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for versioning
DROP TRIGGER IF EXISTS create_listing_version_trigger ON public.listings;
CREATE TRIGGER create_listing_version_trigger
  AFTER UPDATE ON public.listings
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.create_listing_version();

-- Function to auto-expire listings
CREATE OR REPLACE FUNCTION public.expire_old_listings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET status = 'expired', updated_at = now()
  WHERE expires_at IS NOT NULL 
    AND expires_at < now() 
    AND status NOT IN ('expired', 'archived', 'sold', 'rented');
END;
$$;

-- Function to get listing analytics summary
CREATE OR REPLACE FUNCTION public.get_listing_analytics_summary(p_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_views', COALESCE(SUM(views_count), 0),
    'total_clicks', COALESCE(SUM(clicks_count), 0),
    'total_inquiries', COALESCE(SUM(inquiries_count), 0),
    'total_shares', COALESCE(SUM(shares_count), 0),
    'by_portal', (
      SELECT jsonb_object_agg(portal_name, portal_stats)
      FROM (
        SELECT 
          COALESCE(portal_name, 'direct') as portal_name,
          jsonb_build_object(
            'views', SUM(views_count),
            'clicks', SUM(clicks_count),
            'inquiries', SUM(inquiries_count)
          ) as portal_stats
        FROM public.listing_analytics
        WHERE listing_id = p_listing_id
        GROUP BY portal_name
      ) sub
    )
  ) INTO result
  FROM public.listing_analytics
  WHERE listing_id = p_listing_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to update listing timestamps
CREATE OR REPLACE FUNCTION public.update_listing_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for timestamp updates
DROP TRIGGER IF EXISTS update_listings_timestamp ON public.listings;
CREATE TRIGGER update_listings_timestamp
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_timestamp();

DROP TRIGGER IF EXISTS update_listing_portals_timestamp ON public.listing_portals;
CREATE TRIGGER update_listing_portals_timestamp
  BEFORE UPDATE ON public.listing_portals
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_timestamp();

-- Generate reference number
CREATE OR REPLACE FUNCTION public.generate_listing_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'OL-' || to_char(now(), 'YYMMDD') || '-' || 
      LPAD(FLOOR(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_listing_reference_trigger ON public.listings;
CREATE TRIGGER generate_listing_reference_trigger
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.generate_listing_reference();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_inquiries;
