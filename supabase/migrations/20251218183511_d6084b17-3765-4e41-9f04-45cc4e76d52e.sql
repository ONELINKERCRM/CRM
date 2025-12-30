-- WhatsApp Business Accounts
CREATE TABLE IF NOT EXISTS public.whatsapp_business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  meta_business_id TEXT NOT NULL,
  access_token_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('connected', 'pending', 'restricted', 'disconnected')),
  business_name TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, meta_business_id)
);

-- WhatsApp Phone Numbers
CREATE TABLE IF NOT EXISTS public.whatsapp_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  whatsapp_business_account_id UUID NOT NULL REFERENCES public.whatsapp_business_accounts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  display_phone_number TEXT,
  quality_rating TEXT DEFAULT 'unknown' CHECK (quality_rating IN ('GREEN', 'YELLOW', 'RED', 'unknown')),
  messaging_limit TEXT DEFAULT 'TIER_1K',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('connected', 'pending', 'restricted', 'disconnected')),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, phone_number_id)
);

-- WhatsApp Templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  whatsapp_business_account_id UUID REFERENCES public.whatsapp_business_accounts(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  template_id TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  header_type TEXT CHECK (header_type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'NONE')),
  header_content TEXT,
  body TEXT NOT NULL,
  footer TEXT,
  buttons_json JSONB DEFAULT '[]'::jsonb,
  example_values JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, template_name, language)
);

-- Campaign Recipients
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  name TEXT,
  template_variables JSONB DEFAULT '{}'::jsonb,
  delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  meta_message_id TEXT,
  error_message TEXT,
  error_code TEXT,
  imported_from TEXT NOT NULL DEFAULT 'manual_selection' CHECK (imported_from IN ('manual_selection', 'select_all', 'excel_import', 'filter')),
  is_duplicate BOOLEAN DEFAULT false,
  consent_checked BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 0,
  queued_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ 
BEGIN
  -- company_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'company_id') THEN
    ALTER TABLE public.campaign_recipients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;

  -- phone_number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'phone_number') THEN
    ALTER TABLE public.campaign_recipients ADD COLUMN phone_number TEXT DEFAULT '';
  END IF;

  -- name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'name') THEN
    ALTER TABLE public.campaign_recipients ADD COLUMN name TEXT;
  END IF;

  -- delivery_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'delivery_status') THEN
    ALTER TABLE public.campaign_recipients ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped'));
  END IF;

  -- template_variables
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'template_variables') THEN
    ALTER TABLE public.campaign_recipients ADD COLUMN template_variables JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- imported_from
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'imported_from') THEN
    ALTER TABLE public.campaign_recipients ADD COLUMN imported_from TEXT NOT NULL DEFAULT 'manual_selection' CHECK (imported_from IN ('manual_selection', 'select_all', 'excel_import', 'filter'));
  END IF;
  
  -- retry_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'retry_count') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN retry_count INTEGER DEFAULT 0;
  END IF;

  -- meta_message_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'meta_message_id') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN meta_message_id TEXT;
  END IF;

  -- error_code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'error_code') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN error_code TEXT;
  END IF;

  -- is_duplicate
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'is_duplicate') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN is_duplicate BOOLEAN DEFAULT false;
  END IF;

  -- consent_checked
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'consent_checked') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN consent_checked BOOLEAN DEFAULT true;
  END IF;

  -- queued_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'queued_at') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN queued_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- delivered_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'delivered_at') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;

  -- read_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'read_at') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN read_at TIMESTAMPTZ;
  END IF;

  -- failed_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_recipients' AND column_name = 'failed_at') THEN
      ALTER TABLE public.campaign_recipients ADD COLUMN failed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Campaign Analytics (denormalized for fast reads)
CREATE TABLE IF NOT EXISTS public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  total_recipients INTEGER DEFAULT 0,
  total_queued INTEGER DEFAULT 0,
  total_sending INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  delivery_rate NUMERIC(5,2) DEFAULT 0,
  read_rate NUMERIC(5,2) DEFAULT 0,
  failure_rate NUMERIC(5,2) DEFAULT 0,
  average_delivery_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign Import Errors
CREATE TABLE IF NOT EXISTS public.campaign_import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  row_number INTEGER,
  lead_data JSONB NOT NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('invalid_phone', 'missing_phone', 'duplicate', 'no_consent', 'invalid_format', 'other')),
  error_message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS phone_number_id UUID REFERENCES public.whatsapp_phone_numbers(id),
ADD COLUMN IF NOT EXISTS whatsapp_template_id UUID REFERENCES public.whatsapp_templates(id),
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS rate_limit_per_second INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;

-- Update campaign_logs to add more action types
ALTER TABLE public.campaign_logs 
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.campaign_recipients(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(delivery_status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_phone ON public.campaign_recipients(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_company ON public.whatsapp_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON public.whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_company ON public.whatsapp_phone_numbers(company_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON public.campaign_analytics(campaign_id);

-- Enable RLS
ALTER TABLE public.whatsapp_business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_import_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_business_accounts
CREATE POLICY "Users can view their company's WhatsApp accounts" ON public.whatsapp_business_accounts
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage WhatsApp accounts" ON public.whatsapp_business_accounts
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for whatsapp_phone_numbers
CREATE POLICY "Users can view their company's phone numbers" ON public.whatsapp_phone_numbers
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage phone numbers" ON public.whatsapp_phone_numbers
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for whatsapp_templates
CREATE POLICY "Users can view their company's templates" ON public.whatsapp_templates
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for campaign_recipients
CREATE POLICY "Users can view their company's recipients" ON public.campaign_recipients
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage recipients" ON public.campaign_recipients
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for campaign_analytics
CREATE POLICY "Users can view their company's analytics" ON public.campaign_analytics
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "System can update analytics" ON public.campaign_analytics
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for campaign_import_errors
CREATE POLICY "Users can view their company's import errors" ON public.campaign_import_errors
  FOR SELECT USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage import errors" ON public.campaign_import_errors
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.agents 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Function to update campaign analytics
CREATE OR REPLACE FUNCTION public.update_campaign_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.campaign_analytics (campaign_id, company_id)
  SELECT NEW.campaign_id, NEW.company_id
  WHERE NOT EXISTS (SELECT 1 FROM public.campaign_analytics WHERE campaign_id = NEW.campaign_id)
  ON CONFLICT (campaign_id) DO NOTHING;
  
  UPDATE public.campaign_analytics SET
    total_recipients = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id),
    total_queued = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'queued'),
    total_sending = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'sending'),
    total_sent = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'sent'),
    total_delivered = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'delivered'),
    total_read = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'read'),
    total_failed = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'failed'),
    total_skipped = (SELECT COUNT(*) FROM public.campaign_recipients WHERE campaign_id = NEW.campaign_id AND delivery_status = 'skipped'),
    updated_at = now()
  WHERE campaign_id = NEW.campaign_id;
  
  -- Update rates
  UPDATE public.campaign_analytics SET
    delivery_rate = CASE WHEN total_sent > 0 THEN (total_delivered::NUMERIC / total_sent * 100) ELSE 0 END,
    read_rate = CASE WHEN total_delivered > 0 THEN (total_read::NUMERIC / total_delivered * 100) ELSE 0 END,
    failure_rate = CASE WHEN total_recipients > 0 THEN (total_failed::NUMERIC / total_recipients * 100) ELSE 0 END
  WHERE campaign_id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update analytics
DROP TRIGGER IF EXISTS trigger_update_campaign_analytics ON public.campaign_recipients;
CREATE TRIGGER trigger_update_campaign_analytics
  AFTER INSERT OR UPDATE OF delivery_status ON public.campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_campaign_analytics();

-- Function to log campaign actions
CREATE OR REPLACE FUNCTION public.log_campaign_action(
  p_campaign_id UUID,
  p_company_id UUID,
  p_action TEXT,
  p_action_type TEXT,
  p_details JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.campaign_logs (campaign_id, company_id, action, action_type, details, performed_by, recipient_id)
  VALUES (p_campaign_id, p_company_id, p_action, p_action_type, p_details, p_performed_by, p_recipient_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;