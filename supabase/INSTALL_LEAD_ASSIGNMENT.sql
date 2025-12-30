-- ============================================
-- Lead Assignment System - Manual Installation
-- ============================================
-- Copy and paste this entire script into Supabase SQL Editor
-- and click "Run" to install the lead assignment system

-- Step 1: Create Tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.lead_assignment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  assignment_method TEXT NOT NULL DEFAULT 'manual' CHECK (assignment_method IN ('manual', 'round_robin', 'rules')),
  round_robin_index INTEGER DEFAULT 0,
  enabled_agent_ids UUID[] DEFAULT '{}',
  agent_leads_per_round JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS public.lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}',
  assign_to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  assignment_method TEXT,
  assigned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Enable RLS
-- ============================================

ALTER TABLE public.lead_assignment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_logs ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies
-- ============================================

-- Policies for lead_assignment_config
DROP POLICY IF EXISTS "Users can view their company's assignment config" ON public.lead_assignment_config;
CREATE POLICY "Users can view their company's assignment config"
ON public.lead_assignment_config FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert assignment config" ON public.lead_assignment_config;
CREATE POLICY "Users can insert assignment config"
ON public.lead_assignment_config FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update assignment config" ON public.lead_assignment_config;
CREATE POLICY "Users can update assignment config"
ON public.lead_assignment_config FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for lead_assignment_rules
DROP POLICY IF EXISTS "Users can view their company's assignment rules" ON public.lead_assignment_rules;
CREATE POLICY "Users can view their company's assignment rules"
ON public.lead_assignment_rules FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage assignment rules" ON public.lead_assignment_rules;
CREATE POLICY "Users can manage assignment rules"
ON public.lead_assignment_rules FOR ALL
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for lead_assignment_logs
DROP POLICY IF EXISTS "Users can view their company's assignment logs" ON public.lead_assignment_logs;
CREATE POLICY "Users can view their company's assignment logs"
ON public.lead_assignment_logs FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "System can insert assignment logs" ON public.lead_assignment_logs;
CREATE POLICY "System can insert assignment logs"
ON public.lead_assignment_logs FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Step 4: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_assignment_config_company ON public.lead_assignment_config(company_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_company ON public.lead_assignment_rules(company_id, enabled, priority);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_company_lead ON public.lead_assignment_logs(company_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_created ON public.lead_assignment_logs(created_at DESC);

-- Step 5: Create Triggers
-- ============================================

DROP TRIGGER IF EXISTS update_assignment_config_updated_at ON public.lead_assignment_config;
CREATE TRIGGER update_assignment_config_updated_at
BEFORE UPDATE ON public.lead_assignment_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_rules_updated_at ON public.lead_assignment_rules;
CREATE TRIGGER update_assignment_rules_updated_at
BEFORE UPDATE ON public.lead_assignment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Installation Complete!
-- ============================================
-- You can now use the Lead Assignment page
-- Refresh your browser to see the changes
