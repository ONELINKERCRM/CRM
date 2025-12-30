-- TikTok Lead Capture Backend Infrastructure

-- 1) tiktok_accounts - Store TikTok credentials per company
CREATE TABLE IF NOT EXISTS public.tiktok_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_key TEXT, -- encrypted, nullable until admin adds
  client_secret TEXT, -- encrypted, nullable until admin adds
  access_token TEXT, -- encrypted, nullable until OAuth
  refresh_token TEXT, -- encrypted, nullable
  advertiser_id TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'ready', 'connected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 2) tiktok_lead_forms - Store form metadata
CREATE TABLE IF NOT EXISTS public.tiktok_lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tiktok_account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  advertiser_id TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  leads_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, form_id)
);

-- 3) tiktok_webhooks - Webhook configuration per company
CREATE TABLE IF NOT EXISTS public.tiktok_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  events_received INTEGER DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- 4) tiktok_webhook_events - Store raw webhook events for processing
CREATE TABLE IF NOT EXISTS public.tiktok_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tiktok_accounts (Admin/Manager only)
CREATE POLICY "Users can view own company tiktok_accounts"
  ON public.tiktok_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can insert tiktok_accounts"
  ON public.tiktok_accounts FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin/Manager can update tiktok_accounts"
  ON public.tiktok_accounts FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin can delete tiktok_accounts"
  ON public.tiktok_accounts FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- RLS Policies for tiktok_lead_forms
CREATE POLICY "Users can view own company tiktok_lead_forms"
  ON public.tiktok_lead_forms FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can manage tiktok_lead_forms"
  ON public.tiktok_lead_forms FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for tiktok_webhooks
CREATE POLICY "Users can view own company tiktok_webhooks"
  ON public.tiktok_webhooks FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can manage tiktok_webhooks"
  ON public.tiktok_webhooks FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for tiktok_webhook_events (service role only for writes)
CREATE POLICY "Users can view own company tiktok_webhook_events"
  ON public.tiktok_webhook_events FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER set_tiktok_accounts_updated_at
  BEFORE UPDATE ON public.tiktok_accounts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_tiktok_webhooks_updated_at
  BEFORE UPDATE ON public.tiktok_webhooks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_company ON public.tiktok_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_lead_forms_company ON public.tiktok_lead_forms(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_webhooks_company ON public.tiktok_webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_webhook_events_company_status ON public.tiktok_webhook_events(company_id, status);

-- Enable realtime for leads table updates (TikTok leads will appear instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tiktok_webhook_events;