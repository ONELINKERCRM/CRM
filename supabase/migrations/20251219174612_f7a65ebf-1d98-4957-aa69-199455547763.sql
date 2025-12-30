-- PORTAL LISTING PUBLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.portal_listing_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE RESTRICT,
  portal_account_id UUID REFERENCES public.portal_accounts(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE RESTRICT,
  
  portal_listing_id TEXT,
  portal_url TEXT,
  portal_title TEXT NOT NULL,
  portal_description TEXT,
  portal_price NUMERIC,
  portal_currency TEXT DEFAULT 'AED',
  portal_images JSONB DEFAULT '[]',
  portal_metadata JSONB DEFAULT '{}',
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'queued', 'validating', 'sent', 'pending_approval', 
    'approved', 'live', 'rejected', 'expired', 'unpublished', 'error'
  )),
  last_error_message TEXT,
  validation_errors JSONB DEFAULT '[]',
  
  queued_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  unpublished_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_plp_listing_id ON public.portal_listing_publications(listing_id) WHERE is_deleted = false;
CREATE INDEX idx_plp_portal_id ON public.portal_listing_publications(portal_id);
CREATE INDEX idx_plp_company_id ON public.portal_listing_publications(company_id);
CREATE INDEX idx_plp_status ON public.portal_listing_publications(status) WHERE is_deleted = false;
CREATE INDEX idx_plp_portal_listing_id ON public.portal_listing_publications(portal_listing_id) WHERE portal_listing_id IS NOT NULL;

ALTER TABLE public.portal_listing_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company publications"
  ON public.portal_listing_publications FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins and managers can create publications"
  ON public.portal_listing_publications FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can update publications"
  ON public.portal_listing_publications FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Only admins can delete publications"
  ON public.portal_listing_publications FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- PUBLISH JOBS TABLE
CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.portal_listing_publications(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  job_type TEXT NOT NULL CHECK (job_type IN ('publish', 'update', 'unpublish', 'sync', 'validate')),
  priority INTEGER NOT NULL DEFAULT 5,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  payload JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  last_error TEXT,
  
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_publish_jobs_pending ON public.publish_jobs(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_publish_jobs_publication ON public.publish_jobs(publication_id);

ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company jobs"
  ON public.publish_jobs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage jobs"
  ON public.publish_jobs FOR ALL
  USING (true);

-- PUBLICATION ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.publication_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES public.portal_listing_publications(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  details JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.publication_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company activity logs plp"
  ON public.publication_activity_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert activity logs plp"
  ON public.publication_activity_logs FOR INSERT
  WITH CHECK (true);

-- Update leads table for portal attribution
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS portal_listing_id TEXT,
  ADD COLUMN IF NOT EXISTS publication_id UUID REFERENCES public.portal_listing_publications(id),
  ADD COLUMN IF NOT EXISTS internal_listing_id UUID REFERENCES public.listings(id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_listing_publications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.publish_jobs;