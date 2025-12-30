-- PORTAL ACCOUNTS TABLE - Company's portal credentials (must be created first)
CREATE TABLE IF NOT EXISTS public.portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_health_check_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, portal_id, account_name)
);

ALTER TABLE public.portal_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company portal accounts"
  ON public.portal_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage portal accounts"
  ON public.portal_accounts FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );