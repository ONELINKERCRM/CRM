
-- =============================================
-- CONNECTIONS PAGE COMPLETE BACKEND
-- =============================================

-- 1) Enhance marketing_connections table
ALTER TABLE public.marketing_connections 
ADD COLUMN IF NOT EXISTS service_name text,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS webhook_token text,
ADD COLUMN IF NOT EXISTS messaging_limit integer,
ADD COLUMN IF NOT EXISTS quality_rating text,
ADD COLUMN IF NOT EXISTS verified_domain boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sender_id text,
ADD COLUMN IF NOT EXISTS meta_business_id text,
ADD COLUMN IF NOT EXISTS phone_number_id text,
ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz;

-- 2) Enhance whatsapp_phone_numbers table
ALTER TABLE public.whatsapp_phone_numbers 
ADD COLUMN IF NOT EXISTS connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS verified_name text,
ADD COLUMN IF NOT EXISTS code_verification_status text,
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS webhook_verify_token text,
ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz;

-- 3) Create connection_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('connect', 'edit', 'test', 'delete', 'enable', 'disable', 'error', 'refresh_token', 'webhook_update')),
  description text NOT NULL,
  details jsonb,
  performed_by uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 4) Create sms_accounts table
CREATE TABLE IF NOT EXISTS public.sms_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('twilio', 'messagebird', 'vonage', 'plivo', 'nexmo')),
  account_sid text,
  sender_id text,
  phone_number text,
  message_limit integer,
  messages_sent_today integer DEFAULT 0,
  last_message_at timestamptz,
  status text DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5) Create email_accounts table
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('sendgrid', 'mailgun', 'resend', 'smtp', 'ses', 'postmark')),
  sender_email text NOT NULL,
  sender_name text,
  reply_to_email text,
  verified_domain boolean DEFAULT false,
  domain text,
  daily_limit integer,
  emails_sent_today integer DEFAULT 0,
  last_email_at timestamptz,
  smtp_host text,
  smtp_port integer,
  smtp_secure boolean DEFAULT true,
  status text DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending', 'verification_pending')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6) Create connection_health_checks table
CREATE TABLE IF NOT EXISTS public.connection_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.marketing_connections(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('api_test', 'webhook_test', 'send_test', 'token_refresh')),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  response_time_ms integer,
  error_message text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_connection_logs_connection_id ON public.connection_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_company_id ON public.connection_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at ON public.connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_connection_id ON public.whatsapp_phone_numbers(connection_id);
CREATE INDEX IF NOT EXISTS idx_sms_accounts_connection_id ON public.sms_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_sms_accounts_company_id ON public.sms_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_connection_id ON public.email_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_company_id ON public.email_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_connection_health_checks_connection_id ON public.connection_health_checks(connection_id);
CREATE INDEX IF NOT EXISTS idx_marketing_connections_is_default ON public.marketing_connections(company_id, channel, is_default) WHERE is_default = true;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_health_checks ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION public.is_connection_admin()
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

-- connection_logs policies
CREATE POLICY "Users can view their company connection logs"
  ON public.connection_logs FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can insert connection logs"
  ON public.connection_logs FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_connection_admin()
  );

-- sms_accounts policies
CREATE POLICY "Users can view their company sms accounts"
  ON public.sms_accounts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can manage sms accounts"
  ON public.sms_accounts FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_connection_admin()
  );

-- email_accounts policies
CREATE POLICY "Users can view their company email accounts"
  ON public.email_accounts FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can manage email accounts"
  ON public.email_accounts FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_connection_admin()
  );

-- connection_health_checks policies
CREATE POLICY "Users can view their company health checks"
  ON public.connection_health_checks FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Manager can manage health checks"
  ON public.connection_health_checks FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.agents WHERE user_id = auth.uid())
    AND public.is_connection_admin()
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to log connection actions
CREATE OR REPLACE FUNCTION public.log_connection_action(
  p_connection_id uuid,
  p_company_id uuid,
  p_action_type text,
  p_description text,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.connection_logs (
    connection_id,
    company_id,
    action_type,
    description,
    details,
    performed_by
  ) VALUES (
    p_connection_id,
    p_company_id,
    p_action_type,
    p_description,
    p_details,
    auth.uid()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to set default connection for a channel
CREATE OR REPLACE FUNCTION public.set_default_connection(
  p_connection_id uuid,
  p_company_id uuid,
  p_channel text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove default from all other connections of same channel
  UPDATE public.marketing_connections
  SET is_default = false
  WHERE company_id = p_company_id 
    AND channel = p_channel 
    AND id != p_connection_id;
  
  -- Set this connection as default
  UPDATE public.marketing_connections
  SET is_default = true
  WHERE id = p_connection_id AND company_id = p_company_id;
  
  -- Log the action
  PERFORM public.log_connection_action(
    p_connection_id,
    p_company_id,
    'edit',
    'Set as default ' || p_channel || ' connection',
    jsonb_build_object('channel', p_channel)
  );
  
  RETURN true;
END;
$$;

-- Function to get default connection for a channel
CREATE OR REPLACE FUNCTION public.get_default_connection(
  p_company_id uuid,
  p_channel text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection_id uuid;
BEGIN
  SELECT id INTO v_connection_id
  FROM public.marketing_connections
  WHERE company_id = p_company_id 
    AND channel = p_channel 
    AND is_default = true
    AND status = 'connected'
  LIMIT 1;
  
  -- If no default, get the first connected one
  IF v_connection_id IS NULL THEN
    SELECT id INTO v_connection_id
    FROM public.marketing_connections
    WHERE company_id = p_company_id 
      AND channel = p_channel 
      AND status = 'connected'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN v_connection_id;
END;
$$;

-- Function to validate and update connection status
CREATE OR REPLACE FUNCTION public.update_connection_status(
  p_connection_id uuid,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.marketing_connections
  WHERE id = p_connection_id;
  
  UPDATE public.marketing_connections
  SET 
    status = p_status,
    error_message = p_error_message,
    last_health_check = now(),
    updated_at = now()
  WHERE id = p_connection_id;
  
  -- Log the status change
  PERFORM public.log_connection_action(
    p_connection_id,
    v_company_id,
    CASE WHEN p_status = 'error' THEN 'error' ELSE 'test' END,
    'Connection status updated to ' || p_status,
    jsonb_build_object('status', p_status, 'error', p_error_message)
  );
  
  RETURN true;
END;
$$;

-- Function to get connection health summary
CREATE OR REPLACE FUNCTION public.get_connection_health_summary(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'connected', COUNT(*) FILTER (WHERE status = 'connected'),
    'disconnected', COUNT(*) FILTER (WHERE status = 'disconnected'),
    'error', COUNT(*) FILTER (WHERE status = 'error'),
    'by_channel', jsonb_build_object(
      'whatsapp', COUNT(*) FILTER (WHERE channel = 'whatsapp'),
      'sms', COUNT(*) FILTER (WHERE channel = 'sms'),
      'email', COUNT(*) FILTER (WHERE channel = 'email')
    ),
    'defaults', jsonb_build_object(
      'whatsapp', (SELECT id FROM public.marketing_connections WHERE company_id = p_company_id AND channel = 'whatsapp' AND is_default = true LIMIT 1),
      'sms', (SELECT id FROM public.marketing_connections WHERE company_id = p_company_id AND channel = 'sms' AND is_default = true LIMIT 1),
      'email', (SELECT id FROM public.marketing_connections WHERE company_id = p_company_id AND channel = 'email' AND is_default = true LIMIT 1)
    )
  ) INTO result
  FROM public.marketing_connections
  WHERE company_id = p_company_id;
  
  RETURN result;
END;
$$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_connection_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS update_sms_accounts_timestamp ON public.sms_accounts;
CREATE TRIGGER update_sms_accounts_timestamp
  BEFORE UPDATE ON public.sms_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_connection_timestamp();

DROP TRIGGER IF EXISTS update_email_accounts_timestamp ON public.email_accounts;
CREATE TRIGGER update_email_accounts_timestamp
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_connection_timestamp();

-- Enable realtime for connection status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_health_checks;
