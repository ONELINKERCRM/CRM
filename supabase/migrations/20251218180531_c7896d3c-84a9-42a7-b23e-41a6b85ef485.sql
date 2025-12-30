-- Create website_forms table
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.website_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'html' CHECK (form_type IN ('html', 'embed', 'webhook')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  success_redirect_url TEXT,
  thank_you_message TEXT DEFAULT 'Thank you for your submission!',
  spam_protection JSONB DEFAULT '{"honeypot": true, "rate_limit": 10}'::jsonb,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  auto_assign_rules JSONB,
  created_by UUID REFERENCES public.agents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create website_form_fields table
CREATE TABLE IF NOT EXISTS public.website_form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.website_forms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'email', 'phone', 'select', 'textarea', 'hidden', 'checkbox', 'number', 'date')),
  is_required BOOLEAN DEFAULT false,
  mapped_to TEXT CHECK (mapped_to IN ('name', 'email', 'phone', 'message', 'custom')),
  options JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create website_form_submissions table
CREATE TABLE IF NOT EXISTS public.website_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES public.website_forms(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer_url TEXT,
  page_url TEXT,
  lead_id UUID REFERENCES public.leads(id),
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('processed', 'spam', 'duplicate', 'error', 'pending')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create api_keys table for form authentication
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '{"forms": true}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.agents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add source_form_id to leads table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source_form_id') THEN
    ALTER TABLE public.leads ADD COLUMN source_form_id UUID REFERENCES public.website_forms(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'source_metadata') THEN
    ALTER TABLE public.leads ADD COLUMN source_metadata JSONB;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.website_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for website_forms
CREATE POLICY "Users can view forms from their company"
ON public.website_forms FOR SELECT
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "Admins and managers can create forms"
ON public.website_forms FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Admins and managers can update forms"
ON public.website_forms FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Admins can delete forms"
ON public.website_forms FOR DELETE
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS policies for website_form_fields
CREATE POLICY "Users can view form fields from their company"
ON public.website_form_fields FOR SELECT
USING (form_id IN (SELECT id FROM public.website_forms WHERE company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())));

CREATE POLICY "Admins and managers can manage form fields"
ON public.website_form_fields FOR ALL
USING (form_id IN (SELECT id FROM public.website_forms WHERE company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))));

-- RLS policies for website_form_submissions
CREATE POLICY "Users can view submissions from their company"
ON public.website_form_submissions FOR SELECT
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid()));

CREATE POLICY "System can insert submissions"
ON public.website_form_submissions FOR INSERT
WITH CHECK (true);

-- RLS policies for api_keys
CREATE POLICY "Admins and managers can view API keys"
ON public.api_keys FOR SELECT
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Admins and managers can manage API keys"
ON public.api_keys FOR ALL
USING (company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid() AND role IN ('admin', 'manager')));

-- Create indexes for performance
CREATE INDEX idx_website_forms_company ON public.website_forms(company_id);
CREATE INDEX idx_website_forms_status ON public.website_forms(status);
CREATE INDEX idx_website_form_fields_form ON public.website_form_fields(form_id);
CREATE INDEX idx_website_form_submissions_company ON public.website_form_submissions(company_id);
CREATE INDEX idx_website_form_submissions_form ON public.website_form_submissions(form_id);
CREATE INDEX idx_website_form_submissions_created ON public.website_form_submissions(created_at DESC);
CREATE INDEX idx_api_keys_company ON public.api_keys(company_id);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(api_key_prefix);
CREATE INDEX idx_leads_source_form ON public.leads(source_form_id);

-- Create trigger for updated_at
CREATE TRIGGER update_website_forms_updated_at
BEFORE UPDATE ON public.website_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_form_submissions;

-- Create function to process website form submission
CREATE OR REPLACE FUNCTION public.process_website_form_submission(
  p_form_id UUID,
  p_company_id UUID,
  p_submission_data JSONB,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer_url TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form RECORD;
  v_submission_id UUID;
  v_lead_id UUID;
  v_existing_lead_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_message TEXT;
  v_assigned_agent_id UUID;
  v_default_stage_id UUID;
  v_is_duplicate BOOLEAN := false;
  v_is_spam BOOLEAN := false;
  v_status TEXT := 'processed';
  v_spam_settings JSONB;
  v_ip_count INTEGER;
BEGIN
  -- Get form configuration
  SELECT * INTO v_form
  FROM website_forms
  WHERE id = p_form_id AND company_id = p_company_id AND status = 'active';
  
  IF v_form IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Form not found or inactive');
  END IF;

  v_spam_settings := COALESCE(v_form.spam_protection, '{"honeypot": true, "rate_limit": 10}'::jsonb);

  -- Check rate limiting by IP
  IF v_spam_settings->>'rate_limit' IS NOT NULL AND p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM website_form_submissions
    WHERE form_id = p_form_id
      AND ip_address = p_ip_address
      AND created_at > now() - interval '1 hour';
    
    IF v_ip_count >= (v_spam_settings->>'rate_limit')::integer THEN
      v_is_spam := true;
      v_status := 'spam';
    END IF;
  END IF;

  -- Check honeypot field
  IF (v_spam_settings->>'honeypot')::boolean = true THEN
    IF p_submission_data->>'_honeypot' IS NOT NULL AND p_submission_data->>'_honeypot' != '' THEN
      v_is_spam := true;
      v_status := 'spam';
    END IF;
  END IF;

  -- Extract mapped fields
  v_name := COALESCE(
    p_submission_data->>'name',
    p_submission_data->>'full_name',
    p_submission_data->>'fullName',
    p_submission_data->>'firstName' || ' ' || COALESCE(p_submission_data->>'lastName', ''),
    'Unknown'
  );
  
  v_email := COALESCE(
    p_submission_data->>'email',
    p_submission_data->>'emailAddress',
    p_submission_data->>'email_address'
  );
  
  v_phone := COALESCE(
    p_submission_data->>'phone',
    p_submission_data->>'phoneNumber',
    p_submission_data->>'phone_number',
    p_submission_data->>'mobile',
    p_submission_data->>'tel'
  );
  
  v_message := COALESCE(
    p_submission_data->>'message',
    p_submission_data->>'comments',
    p_submission_data->>'inquiry',
    p_submission_data->>'enquiry'
  );

  -- Validate required fields
  IF v_name IS NULL OR v_name = '' OR v_name = 'Unknown' THEN
    IF v_email IS NULL AND v_phone IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'At least name, email, or phone is required');
    END IF;
  END IF;

  -- Check for duplicates by phone or email if not spam
  IF NOT v_is_spam THEN
    IF v_phone IS NOT NULL AND v_phone != '' THEN
      SELECT id INTO v_existing_lead_id
      FROM leads
      WHERE company_id = p_company_id AND phone = v_phone
      LIMIT 1;
    END IF;
    
    IF v_existing_lead_id IS NULL AND v_email IS NOT NULL AND v_email != '' THEN
      SELECT id INTO v_existing_lead_id
      FROM leads
      WHERE company_id = p_company_id AND email = v_email
      LIMIT 1;
    END IF;
    
    IF v_existing_lead_id IS NOT NULL THEN
      v_is_duplicate := true;
      v_lead_id := v_existing_lead_id;
      v_status := 'duplicate';
    END IF;
  END IF;

  -- Create lead if not spam and not duplicate
  IF NOT v_is_spam AND NOT v_is_duplicate THEN
    -- Get default stage
    SELECT id INTO v_default_stage_id
    FROM lead_stages
    WHERE company_id = p_company_id AND name ILIKE '%new%'
    LIMIT 1;
    
    -- Auto-assign agent (round-robin)
    SELECT id INTO v_assigned_agent_id
    FROM agents
    WHERE company_id = p_company_id
      AND status = 'active'
      AND role IN ('agent', 'manager')
    ORDER BY (
      SELECT COUNT(*) FROM leads l 
      WHERE l.assigned_agent_id = agents.id 
      AND l.created_at > now() - interval '7 days'
    ) ASC
    LIMIT 1;

    -- Insert new lead
    INSERT INTO leads (
      company_id, name, phone, email, source, stage_id,
      assigned_agent_id, source_form_id, source_metadata, notes
    ) VALUES (
      p_company_id, v_name, v_phone, v_email, 'Website', v_default_stage_id,
      v_assigned_agent_id, p_form_id, 
      jsonb_build_object('page_url', p_page_url, 'referrer', p_referrer_url, 'user_agent', p_user_agent),
      v_message
    )
    RETURNING id INTO v_lead_id;

    -- Log activity
    INSERT INTO lead_activities (lead_id, company_id, type, title, agent_name, description)
    VALUES (
      v_lead_id, p_company_id, 'lead_created',
      'Lead captured from website form',
      'System',
      'Lead created from form: ' || v_form.form_name
    );
  END IF;

  -- Save submission
  INSERT INTO website_form_submissions (
    company_id, form_id, submission_data, ip_address, user_agent,
    referrer_url, page_url, lead_id, status
  ) VALUES (
    p_company_id, p_form_id, p_submission_data, p_ip_address, p_user_agent,
    p_referrer_url, p_page_url, v_lead_id, v_status
  )
  RETURNING id INTO v_submission_id;

  -- Log to lead_source_logs
  INSERT INTO lead_source_logs (company_id, source_name, event_type, status, details)
  VALUES (
    p_company_id, 'website', 
    CASE WHEN v_is_spam THEN 'spam' WHEN v_is_duplicate THEN 'duplicate' ELSE 'submission' END,
    v_status,
    jsonb_build_object('form_id', p_form_id, 'lead_id', v_lead_id, 'ip', p_ip_address)
  );

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'lead_id', v_lead_id,
    'is_duplicate', v_is_duplicate,
    'is_spam', v_is_spam,
    'status', v_status,
    'redirect_url', v_form.success_redirect_url,
    'thank_you_message', v_form.thank_you_message
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO lead_source_logs (company_id, source_name, event_type, status, details)
    VALUES (p_company_id, 'website', 'error', 'error', jsonb_build_object('error', SQLERRM, 'form_id', p_form_id));
    
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := 'olcrm_' || encode(gen_random_bytes(24), 'base64');
  v_key := replace(replace(replace(v_key, '+', 'x'), '/', 'y'), '=', '');
  RETURN v_key;
END;
$$;