-- Lead Assignment Infrastructure
-- This migration creates the necessary tables for lead assignment functionality

-- 1. Assignment Configuration Table
CREATE TABLE IF NOT EXISTS public.lead_assignment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  assignment_method TEXT NOT NULL DEFAULT 'manual' CHECK (assignment_method IN ('manual', 'round_robin', 'rules')),
  round_robin_index INTEGER DEFAULT 0,
  enabled_agent_ids UUID[] DEFAULT '{}',
  agent_leads_per_round JSONB DEFAULT '{}', -- {agent_id: count}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- 2. Assignment Rules Table
CREATE TABLE IF NOT EXISTS public.lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}', -- {source: 'Meta', budget_min: 100000, location: 'Dubai', ...}
  assign_to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ 
BEGIN
    -- Ensure columns exist in lead_assignment_config
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_assignment_config' AND column_name = 'assignment_method') THEN
        ALTER TABLE public.lead_assignment_config ADD COLUMN assignment_method TEXT NOT NULL DEFAULT 'manual' CHECK (assignment_method IN ('manual', 'round_robin', 'rules'));
    END IF;

    -- Ensure columns exist in lead_assignment_rules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_assignment_rules' AND column_name = 'enabled') THEN
        ALTER TABLE public.lead_assignment_rules ADD COLUMN enabled BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_assignment_rules' AND column_name = 'priority') THEN
        ALTER TABLE public.lead_assignment_rules ADD COLUMN priority INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_assignment_rules' AND column_name = 'conditions') THEN
        ALTER TABLE public.lead_assignment_rules ADD COLUMN conditions JSONB NOT NULL DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_assignment_rules' AND column_name = 'assign_to_agent_id') THEN
        ALTER TABLE public.lead_assignment_rules ADD COLUMN assign_to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Assignment Audit Log Table
CREATE TABLE IF NOT EXISTS public.lead_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  assignment_method TEXT, -- 'manual', 'round_robin', 'rule_based'
  assigned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lead_assignment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_assignment_config
CREATE POLICY "Users can view their company's assignment config"
ON public.lead_assignment_config FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert assignment config"
ON public.lead_assignment_config FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update assignment config"
ON public.lead_assignment_config FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for lead_assignment_rules
CREATE POLICY "Users can view their company's assignment rules"
ON public.lead_assignment_rules FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage assignment rules"
ON public.lead_assignment_rules FOR ALL
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for lead_assignment_logs
CREATE POLICY "Users can view their company's assignment logs"
ON public.lead_assignment_logs FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert assignment logs"
ON public.lead_assignment_logs FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_config_company ON public.lead_assignment_config(company_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_company ON public.lead_assignment_rules(company_id, enabled, priority);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_company_lead ON public.lead_assignment_logs(company_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_created ON public.lead_assignment_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_assignment_config_updated_at
BEFORE UPDATE ON public.lead_assignment_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_rules_updated_at
BEFORE UPDATE ON public.lead_assignment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get next agent in round robin
CREATE OR REPLACE FUNCTION public.get_next_round_robin_agent(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_next_agent_id UUID;
  v_next_index INTEGER;
BEGIN
  -- Get current config
  SELECT * INTO v_config
  FROM public.lead_assignment_config
  WHERE company_id = p_company_id;

  -- If no config or no enabled agents, return NULL
  IF v_config IS NULL OR array_length(v_config.enabled_agent_ids, 1) IS NULL OR array_length(v_config.enabled_agent_ids, 1) = 0 THEN
    RETURN NULL;
  END IF;

  -- Get next agent ID
  v_next_index := (COALESCE(v_config.round_robin_index, 0) % array_length(v_config.enabled_agent_ids, 1)) + 1;
  v_next_agent_id := v_config.enabled_agent_ids[v_next_index];

  -- Update round robin index
  UPDATE public.lead_assignment_config
  SET round_robin_index = v_next_index
  WHERE company_id = p_company_id;

  RETURN v_next_agent_id;
END;
$$;

-- Function to auto-assign lead based on rules
CREATE OR REPLACE FUNCTION public.auto_assign_lead(p_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_config RECORD;
  v_rule RECORD;
  v_assigned_agent_id UUID;
  v_conditions JSONB;
  v_matches BOOLEAN;
BEGIN
  -- Get lead details
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id;

  IF v_lead IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get assignment config
  SELECT * INTO v_config
  FROM public.lead_assignment_config
  WHERE company_id = v_lead.company_id;

  -- If manual assignment, do nothing
  IF v_config IS NULL OR v_config.assignment_method = 'manual' THEN
    RETURN NULL;
  END IF;

  -- If round robin
  IF v_config.assignment_method = 'round_robin' THEN
    v_assigned_agent_id := public.get_next_round_robin_agent(v_lead.company_id);
    
    IF v_assigned_agent_id IS NOT NULL THEN
      UPDATE public.leads
      SET assigned_agent_id = v_assigned_agent_id
      WHERE id = p_lead_id;

      -- Log assignment
      INSERT INTO public.lead_assignment_logs (
        company_id, lead_id, to_agent_id, assignment_method
      ) VALUES (
        v_lead.company_id, p_lead_id, v_assigned_agent_id, 'round_robin'
      );
    END IF;

    RETURN v_assigned_agent_id;
  END IF;

  -- If rule-based
  IF v_config.assignment_method = 'rules' THEN
    -- Find matching rule (highest priority first)
    FOR v_rule IN
      SELECT * FROM public.lead_assignment_rules
      WHERE company_id = v_lead.company_id
        AND enabled = true
      ORDER BY priority DESC, created_at ASC
    LOOP
      v_matches := true;
      v_conditions := v_rule.conditions;

      -- Check source condition
      IF v_conditions ? 'source' AND v_lead.source IS DISTINCT FROM (v_conditions->>'source') THEN
        v_matches := false;
      END IF;

      -- Check budget conditions
      IF v_matches AND v_conditions ? 'budget_min' THEN
        IF v_lead.budget IS NULL OR v_lead.budget::numeric < (v_conditions->>'budget_min')::numeric THEN
          v_matches := false;
        END IF;
      END IF;

      IF v_matches AND v_conditions ? 'budget_max' THEN
        IF v_lead.budget IS NULL OR v_lead.budget::numeric > (v_conditions->>'budget_max')::numeric THEN
          v_matches := false;
        END IF;
      END IF;

      -- Check location condition
      IF v_matches AND v_conditions ? 'location' THEN
        IF v_lead.location IS NULL OR v_lead.location NOT ILIKE '%' || (v_conditions->>'location') || '%' THEN
          v_matches := false;
        END IF;
      END IF;

      -- If rule matches, assign and break
      IF v_matches AND v_rule.assign_to_agent_id IS NOT NULL THEN
        UPDATE public.leads
        SET assigned_agent_id = v_rule.assign_to_agent_id
        WHERE id = p_lead_id;

        -- Log assignment
        INSERT INTO public.lead_assignment_logs (
          company_id, lead_id, to_agent_id, assignment_method, rule_id
        ) VALUES (
          v_lead.company_id, p_lead_id, v_rule.assign_to_agent_id, 'rule_based', v_rule.id
        );

        RETURN v_rule.assign_to_agent_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger to auto-assign new leads
CREATE OR REPLACE FUNCTION public.trigger_auto_assign_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only auto-assign if not already assigned
  IF NEW.assigned_agent_id IS NULL THEN
    PERFORM public.auto_assign_lead(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS auto_assign_new_lead ON public.leads;
CREATE TRIGGER auto_assign_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_assign_lead();
