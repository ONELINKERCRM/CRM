-- =============================================
-- WHATSAPP BOT BACKEND COMPLETE MIGRATION
-- =============================================

-- 1. Enhance chatbots table with additional fields
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'paused', 'inactive'));
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS assigned_lead_group_id UUID;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS fallback_message TEXT DEFAULT 'I didn''t understand that. Let me connect you with a human agent.';
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS business_hours_only BOOLEAN DEFAULT false;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id UUID REFERENCES public.whatsapp_phone_numbers(id);

-- 2. Create chatbot_messages table for message sequences
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'template', 'buttons', 'list')),
  content JSONB NOT NULL,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  delay_seconds INTEGER DEFAULT 0,
  condition_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create chatbot_triggers table
CREATE TABLE IF NOT EXISTS public.chatbot_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'auto_reply', 'schedule', 'fallback', 'lead_stage', 'first_message')),
  trigger_value TEXT,
  keywords TEXT[],
  response_message_id UUID REFERENCES public.chatbot_messages(id),
  response_action TEXT CHECK (response_action IN ('send_message', 'send_sequence', 'transfer_agent', 'create_lead', 'update_lead_stage')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create chatbot_interactions table (conversation history)
CREATE TABLE IF NOT EXISTS public.chatbot_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT DEFAULT 'text',
  message_content TEXT,
  message_data JSONB,
  meta_message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  trigger_id UUID REFERENCES public.chatbot_triggers(id),
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create lead_chatbot_assignment table
CREATE TABLE IF NOT EXISTS public.lead_chatbot_assignment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'transferred')),
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chatbot_id, lead_id)
);

-- 6. Create chatbot_sessions table for conversation state
CREATE TABLE IF NOT EXISTS public.chatbot_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  phone_number TEXT NOT NULL,
  session_state JSONB DEFAULT '{}',
  current_sequence_step INTEGER DEFAULT 0,
  awaiting_input BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chatbot_id, phone_number)
);

-- 7. Create chatbot_analytics table
CREATE TABLE IF NOT EXISTS public.chatbot_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  unique_leads INTEGER DEFAULT 0,
  new_leads_created INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chatbot_id, date)
);

-- 8. Create chatbot_logs table for audit
CREATE TABLE IF NOT EXISTS public.chatbot_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chatbot_id UUID REFERENCES public.chatbots(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'deploy', 'pause', 'activate', 'deactivate', 'delete', 'train', 'error', 'assign_lead', 'unassign_lead')),
  description TEXT NOT NULL,
  details JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Enable RLS on all new tables
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_chatbot_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for chatbot_messages
CREATE POLICY "Users can view company messages"
  ON public.chatbot_messages FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage messages"
  ON public.chatbot_messages FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 11. RLS Policies for chatbot_triggers
CREATE POLICY "Users can view company triggers"
  ON public.chatbot_triggers FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage triggers"
  ON public.chatbot_triggers FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 12. RLS Policies for chatbot_interactions
CREATE POLICY "Users can view company interactions"
  ON public.chatbot_interactions FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert interactions"
  ON public.chatbot_interactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update interactions"
  ON public.chatbot_interactions FOR UPDATE
  USING (true);

-- 13. RLS Policies for lead_chatbot_assignment
CREATE POLICY "Users can view company assignments"
  ON public.lead_chatbot_assignment FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage assignments"
  ON public.lead_chatbot_assignment FOR ALL
  USING (company_id = get_user_company_id(auth.uid()) AND is_marketing_admin(auth.uid(), company_id));

-- 14. RLS Policies for chatbot_sessions
CREATE POLICY "Users can view company sessions"
  ON public.chatbot_sessions FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can manage sessions"
  ON public.chatbot_sessions FOR ALL
  USING (true);

-- 15. RLS Policies for chatbot_analytics
CREATE POLICY "Users can view company analytics"
  ON public.chatbot_analytics FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can manage analytics"
  ON public.chatbot_analytics FOR ALL
  USING (true);

-- 16. RLS Policies for chatbot_logs
CREATE POLICY "Users can view company logs"
  ON public.chatbot_logs FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert logs"
  ON public.chatbot_logs FOR INSERT
  WITH CHECK (true);

-- 17. Create function to get active chatbot for phone number
CREATE OR REPLACE FUNCTION public.get_active_chatbot_for_phone(p_company_id UUID, p_phone_number TEXT)
RETURNS TABLE (
  chatbot_id UUID,
  chatbot_name TEXT,
  whatsapp_connection_id UUID,
  system_prompt TEXT,
  welcome_message TEXT,
  fallback_message TEXT,
  llm_provider TEXT,
  llm_model TEXT,
  max_tokens INTEGER,
  temperature NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as chatbot_id,
    c.name as chatbot_name,
    c.whatsapp_connection_id,
    c.system_prompt,
    c.welcome_message,
    c.fallback_message,
    c.llm_provider,
    c.llm_model,
    c.max_tokens,
    c.temperature
  FROM chatbots c
  JOIN whatsapp_phone_numbers wpn ON c.whatsapp_phone_number_id = wpn.id
  WHERE c.company_id = p_company_id
    AND c.status = 'active'
    AND c.is_active = true
    AND wpn.phone_number_id = p_phone_number
  LIMIT 1;
END;
$$;

-- 18. Create function to log chatbot action
CREATE OR REPLACE FUNCTION public.log_chatbot_action(
  p_company_id UUID,
  p_chatbot_id UUID,
  p_action_type TEXT,
  p_description TEXT,
  p_details JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO chatbot_logs (company_id, chatbot_id, action_type, description, details, performed_by)
  VALUES (p_company_id, p_chatbot_id, p_action_type, p_description, p_details, COALESCE(p_performed_by, auth.uid()))
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 19. Create function to update chatbot analytics
CREATE OR REPLACE FUNCTION public.update_chatbot_analytics(
  p_chatbot_id UUID,
  p_company_id UUID,
  p_field TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO chatbot_analytics (chatbot_id, company_id, date)
  VALUES (p_chatbot_id, p_company_id, CURRENT_DATE)
  ON CONFLICT (chatbot_id, date) DO NOTHING;
  
  EXECUTE format('UPDATE chatbot_analytics SET %I = COALESCE(%I, 0) + $1 WHERE chatbot_id = $2 AND date = CURRENT_DATE', p_field, p_field)
  USING p_increment, p_chatbot_id;
END;
$$;

-- 20. Create function to get or create session
CREATE OR REPLACE FUNCTION public.get_or_create_chatbot_session(
  p_company_id UUID,
  p_chatbot_id UUID,
  p_phone_number TEXT,
  p_lead_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to get existing active session
  SELECT id INTO v_session_id
  FROM chatbot_sessions
  WHERE chatbot_id = p_chatbot_id
    AND phone_number = p_phone_number
    AND expires_at > now();
  
  IF v_session_id IS NULL THEN
    -- Create new session
    INSERT INTO chatbot_sessions (company_id, chatbot_id, phone_number, lead_id)
    VALUES (p_company_id, p_chatbot_id, p_phone_number, p_lead_id)
    ON CONFLICT (chatbot_id, phone_number) 
    DO UPDATE SET 
      lead_id = COALESCE(EXCLUDED.lead_id, chatbot_sessions.lead_id),
      expires_at = now() + INTERVAL '24 hours',
      last_message_at = now()
    RETURNING id INTO v_session_id;
  ELSE
    -- Update existing session
    UPDATE chatbot_sessions
    SET last_message_at = now(),
        expires_at = now() + INTERVAL '24 hours',
        lead_id = COALESCE(p_lead_id, lead_id)
    WHERE id = v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$;

-- 21. Create function to find or create lead from phone
CREATE OR REPLACE FUNCTION public.find_or_create_lead_from_phone(
  p_company_id UUID,
  p_phone_number TEXT,
  p_name TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'WhatsApp Bot'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_normalized_phone TEXT;
  v_default_stage_id UUID;
BEGIN
  -- Normalize phone
  v_normalized_phone := REGEXP_REPLACE(p_phone_number, '[^0-9+]', '', 'g');
  
  -- Find existing lead
  SELECT id INTO v_lead_id
  FROM leads
  WHERE company_id = p_company_id
    AND (normalized_phone = v_normalized_phone OR phone = p_phone_number)
  LIMIT 1;
  
  IF v_lead_id IS NULL THEN
    -- Get default stage
    SELECT id INTO v_default_stage_id
    FROM lead_stages
    WHERE company_id = p_company_id AND is_default = true
    LIMIT 1;
    
    -- Create new lead
    INSERT INTO leads (company_id, name, phone, normalized_phone, source, stage_id, opted_in_whatsapp)
    VALUES (p_company_id, COALESCE(p_name, 'WhatsApp Lead'), p_phone_number, v_normalized_phone, p_source, v_default_stage_id, true)
    RETURNING id INTO v_lead_id;
    
    -- Log lead creation
    INSERT INTO lead_activities (lead_id, company_id, type, title, description, agent_name)
    VALUES (v_lead_id, p_company_id, 'created', 'Lead Created from WhatsApp Bot', 'New lead automatically created from WhatsApp conversation', 'System');
  END IF;
  
  RETURN v_lead_id;
END;
$$;

-- 22. Create function to match trigger
CREATE OR REPLACE FUNCTION public.match_chatbot_trigger(
  p_chatbot_id UUID,
  p_message TEXT,
  p_is_first_message BOOLEAN DEFAULT false
)
RETURNS TABLE (
  trigger_id UUID,
  trigger_type TEXT,
  response_action TEXT,
  response_message_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First check for first_message trigger
  IF p_is_first_message THEN
    RETURN QUERY
    SELECT t.id, t.trigger_type, t.response_action, t.response_message_id
    FROM chatbot_triggers t
    WHERE t.chatbot_id = p_chatbot_id
      AND t.is_active = true
      AND t.trigger_type = 'first_message'
    ORDER BY t.priority DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- Check keyword triggers
  RETURN QUERY
  SELECT t.id, t.trigger_type, t.response_action, t.response_message_id
  FROM chatbot_triggers t
  WHERE t.chatbot_id = p_chatbot_id
    AND t.is_active = true
    AND t.trigger_type = 'keyword'
    AND (
      t.trigger_value IS NOT NULL AND LOWER(p_message) LIKE '%' || LOWER(t.trigger_value) || '%'
      OR t.keywords IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(t.keywords) kw WHERE LOWER(p_message) LIKE '%' || LOWER(kw) || '%'
      )
    )
  ORDER BY t.priority DESC
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- Fallback trigger
  RETURN QUERY
  SELECT t.id, t.trigger_type, t.response_action, t.response_message_id
  FROM chatbot_triggers t
  WHERE t.chatbot_id = p_chatbot_id
    AND t.is_active = true
    AND t.trigger_type = 'fallback'
  ORDER BY t.priority DESC
  LIMIT 1;
END;
$$;

-- 23. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_chatbot ON public.chatbot_messages(chatbot_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_chatbot_triggers_chatbot ON public.chatbot_triggers(chatbot_id, is_active);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_lead ON public.chatbot_interactions(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_chatbot ON public.chatbot_interactions(chatbot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_phone ON public.chatbot_interactions(phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_chatbot_assignment_lead ON public.lead_chatbot_assignment(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_phone ON public.chatbot_sessions(chatbot_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_chatbot_analytics_date ON public.chatbot_analytics(chatbot_id, date);

-- 24. Enable realtime for interactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_sessions;