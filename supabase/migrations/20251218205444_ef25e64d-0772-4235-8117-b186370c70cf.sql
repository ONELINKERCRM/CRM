-- =============================================
-- COMPLETE MARKETING BACKEND MIGRATION
-- =============================================

-- 1. Add opted_in column to leads for consent management
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_in BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_in_whatsapp BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_in_sms BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_in_email BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Create marketing_templates table for approved templates
CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  template_name TEXT NOT NULL,
  template_key TEXT,
  language TEXT DEFAULT 'en',
  category TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  header_type TEXT,
  header_content TEXT,
  footer_text TEXT,
  buttons_json JSONB,
  variables JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  meta_template_id TEXT,
  rejection_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Add missing columns to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS marketing_template_id UUID REFERENCES public.marketing_templates(id);
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS consent_required BOOLEAN DEFAULT true;

-- 4. Add recipient email column to campaign_recipients
ALTER TABLE public.campaign_recipients ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.campaign_recipients ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- 5. Add more analytics columns
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS total_clicked INTEGER DEFAULT 0;
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS total_bounced INTEGER DEFAULT 0;
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS total_unsubscribed INTEGER DEFAULT 0;
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS delivery_rate NUMERIC(5,2);
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS open_rate NUMERIC(5,2);
ALTER TABLE public.campaign_analytics ADD COLUMN IF NOT EXISTS click_rate NUMERIC(5,2);

-- 6. Add performed_by to campaign_logs for audit
ALTER TABLE public.campaign_logs ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES auth.users(id);

-- 7. Create marketing_webhooks table for status callbacks
CREATE TABLE IF NOT EXISTS public.marketing_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message_id TEXT,
  recipient_id UUID REFERENCES public.campaign_recipients(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Create campaign_schedules for scheduled campaigns
CREATE TABLE IF NOT EXISTS public.campaign_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Create consent_logs for compliance
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  source TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Enable RLS on new tables
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- 11. Create helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION public.is_marketing_admin(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents
    WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND role IN ('admin', 'manager')
    AND status = 'active'
  );
$$;

-- 12. Create helper function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

-- 13. RLS Policies for marketing_templates
CREATE POLICY "Users can view company templates"
  ON public.marketing_templates FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can create templates"
  ON public.marketing_templates FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

CREATE POLICY "Admins can update templates"
  ON public.marketing_templates FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete templates"
  ON public.marketing_templates FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 14. RLS Policies for marketing_webhooks
CREATE POLICY "Users can view company webhooks"
  ON public.marketing_webhooks FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

-- 15. RLS Policies for campaign_schedules
CREATE POLICY "Users can view company schedules"
  ON public.campaign_schedules FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage schedules"
  ON public.campaign_schedules FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 16. RLS Policies for consent_logs
CREATE POLICY "Users can view company consent logs"
  ON public.consent_logs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can create consent logs"
  ON public.consent_logs FOR INSERT
  WITH CHECK (true);

-- 17. Drop and recreate campaign policies with role restrictions
DROP POLICY IF EXISTS "Users can create campaigns" ON public.campaigns;
CREATE POLICY "Admins can create campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update company campaigns" ON public.campaigns;
CREATE POLICY "Admins can update campaigns"
  ON public.campaigns FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 18. Restrict marketing_connections to admins
DROP POLICY IF EXISTS "Users can create connections for their company" ON public.marketing_connections;
CREATE POLICY "Admins can create connections"
  ON public.marketing_connections FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can update their company connections" ON public.marketing_connections;
CREATE POLICY "Admins can update connections"
  ON public.marketing_connections FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can delete their company connections" ON public.marketing_connections;
CREATE POLICY "Admins can delete connections"
  ON public.marketing_connections FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 19. Create function to update analytics from webhook
CREATE OR REPLACE FUNCTION public.update_campaign_analytics_from_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);
  
  INSERT INTO public.campaign_analytics (campaign_id, company_id)
  SELECT c.id, c.company_id FROM public.campaigns c WHERE c.id = v_campaign_id
  ON CONFLICT (campaign_id) DO NOTHING;
  
  UPDATE public.campaign_analytics SET
    total_sent = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = v_campaign_id AND delivery_status IN ('sent', 'delivered', 'read')),
    total_delivered = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = v_campaign_id AND delivery_status IN ('delivered', 'read')),
    total_read = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = v_campaign_id AND delivery_status = 'read'),
    total_failed = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = v_campaign_id AND delivery_status = 'failed'),
    updated_at = now()
  WHERE campaign_id = v_campaign_id;
  
  RETURN NEW;
END;
$$;

-- 20. Create trigger for analytics update
DROP TRIGGER IF EXISTS trigger_update_campaign_analytics ON public.campaign_recipients;
CREATE TRIGGER trigger_update_campaign_analytics
  AFTER UPDATE OF delivery_status ON public.campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_analytics_from_recipient();

-- 21. Create function to check consent before sending
CREATE OR REPLACE FUNCTION public.check_lead_consent(p_lead_id UUID, p_channel TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_channel
    WHEN 'whatsapp' THEN COALESCE(opted_in_whatsapp, opted_in, true)
    WHEN 'sms' THEN COALESCE(opted_in_sms, opted_in, true)
    WHEN 'email' THEN COALESCE(opted_in_email, opted_in, true)
    ELSE COALESCE(opted_in, true)
  END
  FROM public.leads WHERE id = p_lead_id;
$$;

-- 22. Create function to validate audience before campaign
CREATE OR REPLACE FUNCTION public.validate_campaign_audience(p_campaign_id UUID)
RETURNS TABLE (
  total_recipients INTEGER,
  valid_recipients INTEGER,
  opted_out INTEGER,
  missing_contact INTEGER,
  duplicates INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients WHERE campaign_id = p_campaign_id),
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients cr
     JOIN leads l ON cr.lead_id = l.id
     WHERE cr.campaign_id = p_campaign_id
     AND check_lead_consent(l.id, v_campaign.channel)
     AND CASE v_campaign.channel
       WHEN 'whatsapp' THEN l.phone IS NOT NULL AND l.phone != ''
       WHEN 'sms' THEN l.phone IS NOT NULL AND l.phone != ''
       WHEN 'email' THEN l.email IS NOT NULL AND l.email != ''
       ELSE true
     END),
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients cr
     JOIN leads l ON cr.lead_id = l.id
     WHERE cr.campaign_id = p_campaign_id
     AND NOT check_lead_consent(l.id, v_campaign.channel)),
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients cr
     LEFT JOIN leads l ON cr.lead_id = l.id
     WHERE cr.campaign_id = p_campaign_id
     AND CASE v_campaign.channel
       WHEN 'whatsapp' THEN l.phone IS NULL OR l.phone = ''
       WHEN 'sms' THEN l.phone IS NULL OR l.phone = ''
       WHEN 'email' THEN l.email IS NULL OR l.email = ''
       ELSE false
     END),
    (SELECT COUNT(*)::INTEGER FROM campaign_recipients WHERE campaign_id = p_campaign_id AND is_duplicate = true);
END;
$$;

-- 23. Create function to retry failed messages
CREATE OR REPLACE FUNCTION public.queue_failed_for_retry(p_campaign_id UUID, p_max_retries INTEGER DEFAULT 3)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE campaign_recipients
  SET 
    delivery_status = 'queued',
    retry_count = COALESCE(retry_count, 0) + 1,
    error_message = NULL,
    failed_at = NULL
  WHERE campaign_id = p_campaign_id
    AND delivery_status = 'failed'
    AND COALESCE(retry_count, 0) < p_max_retries;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  INSERT INTO campaign_logs (campaign_id, company_id, action, action_type, details)
  SELECT id, company_id, 'Queued ' || v_count || ' failed messages for retry', 'retry', 
    jsonb_build_object('count', v_count, 'timestamp', now())
  FROM campaigns WHERE id = p_campaign_id;
  
  RETURN v_count;
END;
$$;

-- 24. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(campaign_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_lead ON public.campaign_recipients(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(company_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON public.campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_marketing_templates_channel ON public.marketing_templates(company_id, channel, status);
CREATE INDEX IF NOT EXISTS idx_marketing_webhooks_message ON public.marketing_webhooks(message_id);
CREATE INDEX IF NOT EXISTS idx_leads_consent ON public.leads(company_id, opted_in);

-- 25. Enable realtime for campaign tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_analytics;