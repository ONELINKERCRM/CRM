-- =============================================
-- LEAD ASSIGNMENT ADVANCED FEATURES SCHEMA
-- =============================================

-- Drop conflicting tables from previous migrations (Supplementary)
DROP TABLE IF EXISTS public.lead_pools CASCADE;
DROP TABLE IF EXISTS public.lead_pool_members CASCADE;
DROP TABLE IF EXISTS public.agent_load CASCADE;
DROP TABLE IF EXISTS public.auto_reassignment_rules CASCADE;
DROP TABLE IF EXISTS public.assignment_notifications CASCADE;

-- 1) LEAD POOLS TABLE
CREATE TABLE IF NOT EXISTS public.lead_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pool_name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, pool_name)
);

-- 2) LEAD POOL MEMBERS (leads in pools)
CREATE TABLE IF NOT EXISTS public.lead_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.lead_pools(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pool_id, lead_id)
);

-- 3) EXTEND LEADS TABLE with assignment fields
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS assignment_priority TEXT DEFAULT 'medium' CHECK (assignment_priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reassignment_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_assignment_id UUID,
ADD COLUMN IF NOT EXISTS previous_agent_id UUID REFERENCES public.agents(id);

-- 4) EXTEND LEAD_ASSIGNMENT_RULES with priority and active status
ALTER TABLE public.lead_assignment_rules
ADD COLUMN IF NOT EXISTS rule_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_all_conditions BOOLEAN DEFAULT true;

-- 5) EXTEND LEAD_ASSIGNMENT_LOGS with change reason and undo support
ALTER TABLE public.lead_assignment_logs
ADD COLUMN IF NOT EXISTS change_reason TEXT DEFAULT 'manual' CHECK (change_reason IN ('manual', 'round_robin', 'rule', 'auto_reassign', 'undo', 'bulk', 'pool')),
ADD COLUMN IF NOT EXISTS can_undo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS undone_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- 6) AGENT LOAD TABLE (real-time agent workload tracking)
CREATE TABLE IF NOT EXISTS public.agent_load (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  current_leads_count INTEGER DEFAULT 0,
  pending_followups_count INTEGER DEFAULT 0,
  total_assignments_today INTEGER DEFAULT 0,
  total_assignments_week INTEGER DEFAULT 0,
  average_response_time_hours NUMERIC(10,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  max_leads_capacity INTEGER DEFAULT 50,
  is_available BOOLEAN DEFAULT true,
  last_assignment_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id)
);

-- 7) AUTO-REASSIGNMENT RULES TABLE
CREATE TABLE IF NOT EXISTS public.auto_reassignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_without_contact INTEGER NOT NULL DEFAULT 3,
  reassign_to_pool_id UUID REFERENCES public.lead_pools(id),
  reassign_to_agent_id UUID REFERENCES public.agents(id),
  use_round_robin BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  apply_to_stages TEXT[] DEFAULT ARRAY['New', 'Contacted'],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) ASSIGNMENT NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.assignment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assignment_log_id UUID REFERENCES public.lead_assignment_logs(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  notification_type TEXT DEFAULT 'assignment' CHECK (notification_type IN ('assignment', 'reassignment', 'reminder', 'urgent')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_lead_pools_company ON public.lead_pools(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_pool_members_pool ON public.lead_pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_lead_pool_members_lead ON public.lead_pool_members(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_assignment_priority ON public.leads(assignment_priority);
CREATE INDEX IF NOT EXISTS idx_leads_reassignment_due ON public.leads(reassignment_due_at) WHERE reassignment_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_load_company ON public.agent_load(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_load_agent ON public.agent_load(agent_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_agent ON public.assignment_notifications(agent_id, is_read);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_lead ON public.assignment_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_auto_reassignment_rules_company ON public.auto_reassignment_rules(company_id, is_active);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Lead Pools RLS
ALTER TABLE public.lead_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead pools in their company" ON public.lead_pools
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage lead pools" ON public.lead_pools
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Lead Pool Members RLS
ALTER TABLE public.lead_pool_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pool members in their company" ON public.lead_pool_members
  FOR SELECT USING (
    pool_id IN (
      SELECT id FROM public.lead_pools 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and managers can manage pool members" ON public.lead_pool_members
  FOR ALL USING (
    pool_id IN (
      SELECT id FROM public.lead_pools 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Agent Load RLS
ALTER TABLE public.agent_load ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agent load in their company" ON public.agent_load
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "System can manage agent load" ON public.agent_load
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Auto-Reassignment Rules RLS
ALTER TABLE public.auto_reassignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view auto-reassignment rules in their company" ON public.auto_reassignment_rules
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage auto-reassignment rules" ON public.auto_reassignment_rules
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Assignment Notifications RLS
ALTER TABLE public.assignment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own notifications" ON public.assignment_notifications
  FOR SELECT USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can create notifications" ON public.assignment_notifications
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their notifications" ON public.assignment_notifications
  FOR UPDATE USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER set_lead_pools_updated_at
  BEFORE UPDATE ON public.lead_pools
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_agent_load_updated_at
  BEFORE UPDATE ON public.agent_load
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_auto_reassignment_rules_updated_at
  BEFORE UPDATE ON public.auto_reassignment_rules
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================
-- FUNCTIONS FOR ASSIGNMENT LOGIC
-- =============================================

-- Function to assign lead with full tracking
CREATE OR REPLACE FUNCTION public.assign_lead_to_agent(
  p_lead_id UUID,
  p_to_agent_id UUID,
  p_change_reason TEXT DEFAULT 'manual',
  p_rule_id UUID DEFAULT NULL,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_company_id UUID;
  v_log_id UUID;
  v_agent RECORD;
BEGIN
  -- Get lead info
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  
  v_company_id := v_lead.company_id;
  
  -- Get agent info
  SELECT * INTO v_agent FROM public.agents WHERE id = p_to_agent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;
  
  -- Verify agent is in same company
  IF v_agent.company_id != v_company_id THEN
    RAISE EXCEPTION 'Agent not in same company';
  END IF;
  
  -- Store previous agent for undo
  UPDATE public.leads
  SET 
    previous_agent_id = assigned_agent_id,
    assigned_agent_id = p_to_agent_id,
    notification_sent = false,
    updated_at = now()
  WHERE id = p_lead_id;
  
  -- Create assignment log
  INSERT INTO public.lead_assignment_logs (
    lead_id, company_id, from_agent_id, to_agent_id,
    assignment_method, change_reason, rule_id, assigned_by, can_undo
  ) VALUES (
    p_lead_id, v_company_id, v_lead.assigned_agent_id, p_to_agent_id,
    p_change_reason, p_change_reason, p_rule_id, COALESCE(p_assigned_by, auth.uid()), true
  )
  RETURNING id INTO v_log_id;
  
  -- Update last assignment id on lead
  UPDATE public.leads SET last_assignment_id = v_log_id WHERE id = p_lead_id;
  
  -- Create notification for agent
  INSERT INTO public.assignment_notifications (
    company_id, assignment_log_id, agent_id, lead_id,
    notification_type, title, message
  ) VALUES (
    v_company_id, v_log_id, p_to_agent_id, p_lead_id,
    CASE WHEN v_lead.assigned_agent_id IS NULL THEN 'assignment' ELSE 'reassignment' END,
    'New Lead Assigned',
    'You have been assigned a new lead: ' || v_lead.name
  );
  
  -- Update agent load
  PERFORM public.update_agent_load(p_to_agent_id);
  IF v_lead.assigned_agent_id IS NOT NULL THEN
    PERFORM public.update_agent_load(v_lead.assigned_agent_id);
  END IF;
  
  RETURN v_log_id;
END;
$$;

-- Function to undo last assignment
CREATE OR REPLACE FUNCTION public.undo_lead_assignment(
  p_lead_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_last_log RECORD;
BEGIN
  -- Get lead info
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get last assignment log
  SELECT * INTO v_last_log 
  FROM public.lead_assignment_logs 
  WHERE lead_id = p_lead_id AND can_undo = true AND undone_at IS NULL
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Restore previous agent
  UPDATE public.leads
  SET 
    assigned_agent_id = v_last_log.from_agent_id,
    previous_agent_id = v_last_log.to_agent_id,
    updated_at = now()
  WHERE id = p_lead_id;
  
  -- Mark log as undone
  UPDATE public.lead_assignment_logs
  SET 
    undone_at = now(),
    undone_by = auth.uid(),
    can_undo = false
  WHERE id = v_last_log.id;
  
  -- Create new log for undo action
  INSERT INTO public.lead_assignment_logs (
    lead_id, company_id, from_agent_id, to_agent_id,
    assignment_method, change_reason, assigned_by, can_undo
  ) VALUES (
    p_lead_id, v_lead.company_id, v_last_log.to_agent_id, v_last_log.from_agent_id,
    'undo', 'undo', auth.uid(), false
  );
  
  -- Update agent loads
  IF v_last_log.to_agent_id IS NOT NULL THEN
    PERFORM public.update_agent_load(v_last_log.to_agent_id);
  END IF;
  IF v_last_log.from_agent_id IS NOT NULL THEN
    PERFORM public.update_agent_load(v_last_log.from_agent_id);
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to update agent load statistics
CREATE OR REPLACE FUNCTION public.update_agent_load(p_agent_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agent RECORD;
  v_leads_count INTEGER;
  v_followups_count INTEGER;
  v_today_count INTEGER;
  v_week_count INTEGER;
  v_avg_response NUMERIC;
  v_conversion NUMERIC;
BEGIN
  SELECT * INTO v_agent FROM public.agents WHERE id = p_agent_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- Count current leads
  SELECT COUNT(*) INTO v_leads_count
  FROM public.leads
  WHERE assigned_agent_id = p_agent_id
  AND stage NOT IN ('Won', 'Lost');
  
  -- Count pending followups
  SELECT COUNT(*) INTO v_followups_count
  FROM public.lead_followups
  WHERE assigned_agent_id = p_agent_id
  AND status = 'pending'
  AND due_date <= now() + interval '7 days';
  
  -- Count today's assignments
  SELECT COUNT(*) INTO v_today_count
  FROM public.lead_assignment_logs
  WHERE to_agent_id = p_agent_id
  AND created_at >= CURRENT_DATE;
  
  -- Count week's assignments
  SELECT COUNT(*) INTO v_week_count
  FROM public.lead_assignment_logs
  WHERE to_agent_id = p_agent_id
  AND created_at >= CURRENT_DATE - interval '7 days';
  
  -- Calculate conversion rate
  SELECT 
    CASE WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE stage = 'Won')::NUMERIC / COUNT(*)::NUMERIC) * 100
      ELSE 0 
    END INTO v_conversion
  FROM public.leads
  WHERE assigned_agent_id = p_agent_id;
  
  -- Upsert agent load
  INSERT INTO public.agent_load (
    agent_id, company_id, current_leads_count, pending_followups_count,
    total_assignments_today, total_assignments_week, conversion_rate,
    last_assignment_at
  ) VALUES (
    p_agent_id, v_agent.company_id, v_leads_count, v_followups_count,
    v_today_count, v_week_count, COALESCE(v_conversion, 0),
    now()
  )
  ON CONFLICT (agent_id) DO UPDATE SET
    current_leads_count = EXCLUDED.current_leads_count,
    pending_followups_count = EXCLUDED.pending_followups_count,
    total_assignments_today = EXCLUDED.total_assignments_today,
    total_assignments_week = EXCLUDED.total_assignments_week,
    conversion_rate = EXCLUDED.conversion_rate,
    last_assignment_at = EXCLUDED.last_assignment_at,
    updated_at = now();
END;
$$;

-- Function for round-robin assignment
CREATE OR REPLACE FUNCTION public.get_next_round_robin_agent(
  p_company_id UUID,
  p_rule_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agent_id UUID;
  v_agents UUID[];
  v_current_index INTEGER;
BEGIN
  -- Get available agents (sorted by current load, ascending)
  SELECT ARRAY_AGG(a.id ORDER BY COALESCE(al.current_leads_count, 0) ASC, a.created_at ASC)
  INTO v_agents
  FROM public.agents a
  LEFT JOIN public.agent_load al ON a.id = al.agent_id
  WHERE a.company_id = p_company_id
  AND a.status = 'active'
  AND (al.is_available IS NULL OR al.is_available = true)
  AND (al.current_leads_count IS NULL OR al.current_leads_count < COALESCE(al.max_leads_capacity, 50));
  
  IF v_agents IS NULL OR array_length(v_agents, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Get current round robin index
  IF p_rule_id IS NOT NULL THEN
    SELECT round_robin_index INTO v_current_index
    FROM public.lead_assignment_rules
    WHERE id = p_rule_id;
  ELSE
    v_current_index := 0;
  END IF;
  
  -- Get next agent
  v_current_index := COALESCE(v_current_index, 0) % array_length(v_agents, 1) + 1;
  v_agent_id := v_agents[v_current_index];
  
  -- Update round robin index
  IF p_rule_id IS NOT NULL THEN
    UPDATE public.lead_assignment_rules
    SET round_robin_index = v_current_index
    WHERE id = p_rule_id;
  END IF;
  
  RETURN v_agent_id;
END;
$$;

-- Function to bulk assign leads
CREATE OR REPLACE FUNCTION public.bulk_assign_leads(
  p_lead_ids UUID[],
  p_agent_id UUID,
  p_change_reason TEXT DEFAULT 'bulk'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOREACH v_lead_id IN ARRAY p_lead_ids
  LOOP
    PERFORM public.assign_lead_to_agent(v_lead_id, p_agent_id, p_change_reason);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Function to get assignment analytics
CREATE OR REPLACE FUNCTION public.get_assignment_analytics(p_company_id UUID)
RETURNS TABLE(
  agent_id UUID,
  agent_name TEXT,
  total_leads BIGINT,
  active_leads BIGINT,
  won_leads BIGINT,
  lost_leads BIGINT,
  pending_followups BIGINT,
  assignments_today BIGINT,
  assignments_week BIGINT,
  conversion_rate NUMERIC,
  is_available BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.id as agent_id,
    a.name as agent_name,
    COALESCE(l.total, 0) as total_leads,
    COALESCE(l.active, 0) as active_leads,
    COALESCE(l.won, 0) as won_leads,
    COALESCE(l.lost, 0) as lost_leads,
    COALESCE(al.pending_followups_count, 0)::BIGINT as pending_followups,
    COALESCE(al.total_assignments_today, 0)::BIGINT as assignments_today,
    COALESCE(al.total_assignments_week, 0)::BIGINT as assignments_week,
    COALESCE(al.conversion_rate, 0) as conversion_rate,
    COALESCE(al.is_available, true) as is_available
  FROM public.agents a
  LEFT JOIN public.agent_load al ON a.id = al.agent_id
  LEFT JOIN (
    SELECT 
      assigned_agent_id,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE stage NOT IN ('Won', 'Lost')) as active,
      COUNT(*) FILTER (WHERE stage = 'Won') as won,
      COUNT(*) FILTER (WHERE stage = 'Lost') as lost
    FROM public.leads
    WHERE company_id = p_company_id
    GROUP BY assigned_agent_id
  ) l ON a.id = l.assigned_agent_id
  WHERE a.company_id = p_company_id AND a.status = 'active'
  ORDER BY total_leads DESC;
$$;

-- Function to check and apply assignment rules
CREATE OR REPLACE FUNCTION public.apply_assignment_rules(
  p_lead_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_rule RECORD;
  v_agent_id UUID;
  v_conditions JSONB;
  v_match BOOLEAN;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  
  -- Get active rules ordered by priority
  FOR v_rule IN 
    SELECT * FROM public.lead_assignment_rules
    WHERE company_id = v_lead.company_id
    AND is_active = true
    ORDER BY priority DESC, rule_order ASC
  LOOP
    v_conditions := v_rule.conditions;
    v_match := true;
    
    -- Check source condition
    IF v_conditions->>'source' IS NOT NULL AND v_conditions->>'source' != '' THEN
      IF v_lead.source IS NULL OR v_lead.source != v_conditions->>'source' THEN
        v_match := false;
      END IF;
    END IF;
    
    -- Check location condition
    IF v_match AND v_conditions->>'location' IS NOT NULL AND v_conditions->>'location' != '' THEN
      IF v_lead.location IS NULL OR v_lead.location NOT ILIKE '%' || (v_conditions->>'location') || '%' THEN
        v_match := false;
      END IF;
    END IF;
    
    -- Check budget condition
    IF v_match AND v_conditions->>'min_budget' IS NOT NULL THEN
      IF v_lead.budget IS NULL OR 
         COALESCE(NULLIF(regexp_replace(v_lead.budget, '[^0-9.]', '', 'g'), '')::NUMERIC, 0) < (v_conditions->>'min_budget')::NUMERIC THEN
        v_match := false;
      END IF;
    END IF;
    
    -- Check property type condition
    IF v_match AND v_conditions->>'property_type' IS NOT NULL AND v_conditions->>'property_type' != '' THEN
      IF v_lead.property_type IS NULL OR v_lead.property_type != v_conditions->>'property_type' THEN
        v_match := false;
      END IF;
    END IF;
    
    -- Check stage condition
    IF v_match AND v_conditions->>'stage' IS NOT NULL AND v_conditions->>'stage' != '' THEN
      IF v_lead.stage IS NULL OR v_lead.stage != v_conditions->>'stage' THEN
        v_match := false;
      END IF;
    END IF;
    
    -- If rule matches, assign to agent
    IF v_match THEN
      IF v_rule.rule_type = 'round_robin' THEN
        v_agent_id := public.get_next_round_robin_agent(v_lead.company_id, v_rule.id);
      ELSIF v_rule.assigned_agents IS NOT NULL AND array_length(v_rule.assigned_agents, 1) > 0 THEN
        -- Pick agent with lowest load from assigned agents
        SELECT a.id INTO v_agent_id
        FROM public.agents a
        LEFT JOIN public.agent_load al ON a.id = al.agent_id
        WHERE a.id = ANY(v_rule.assigned_agents)
        AND a.status = 'active'
        ORDER BY COALESCE(al.current_leads_count, 0) ASC
        LIMIT 1;
      END IF;
      
      IF v_agent_id IS NOT NULL THEN
        PERFORM public.assign_lead_to_agent(p_lead_id, v_agent_id, 'rule', v_rule.id);
        RETURN v_agent_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_pool_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_load;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_reassignment_rules;