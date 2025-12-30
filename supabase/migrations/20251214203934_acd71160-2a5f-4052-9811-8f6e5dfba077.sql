-- Fix overly permissive RLS policies for production security

-- 1. DROP existing overly permissive policies on agents
DROP POLICY IF EXISTS "Authenticated users can manage agents" ON public.agents;
DROP POLICY IF EXISTS "Authenticated users can view agents" ON public.agents;

-- Create proper company-scoped policies for agents
DROP POLICY IF EXISTS "Users can view agents in their company" ON public.agents;
CREATE POLICY "Users can view agents in their company"
ON public.agents FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage agents in their company" ON public.agents;
CREATE POLICY "Admins can manage agents in their company"
ON public.agents FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Managers can manage agents in their company" ON public.agents;
CREATE POLICY "Managers can manage agents in their company"
ON public.agents FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- 2. DROP existing overly permissive policies on teams
DROP POLICY IF EXISTS "Authenticated users can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;

-- Create proper company-scoped policies for teams
DROP POLICY IF EXISTS "Users can view teams in their company" ON public.teams;
CREATE POLICY "Users can view teams in their company"
ON public.teams FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage teams in their company" ON public.teams;
CREATE POLICY "Admins can manage teams in their company"
ON public.teams FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Managers can manage teams in their company" ON public.teams;
CREATE POLICY "Managers can manage teams in their company"
ON public.teams FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- 3. Fix leads policy to require company_id
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;

-- Create proper policies for leads
DROP POLICY IF EXISTS "Users can view leads in their company" ON public.leads;
CREATE POLICY "Users can view leads in their company"
ON public.leads FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND company_id IS NOT NULL 
  AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create leads in their company" ON public.leads;
CREATE POLICY "Users can create leads in their company"
ON public.leads FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update leads in their company" ON public.leads;
CREATE POLICY "Users can update leads in their company"
ON public.leads FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND company_id IS NOT NULL 
  AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete leads in their company" ON public.leads;
CREATE POLICY "Admins can delete leads in their company"
ON public.leads FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix lead_activities to use proper company scoping
DROP POLICY IF EXISTS "Authenticated users can create lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can delete lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can update lead activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can view lead activities" ON public.lead_activities;

DROP POLICY IF EXISTS "Users can view activities in their company" ON public.lead_activities;
CREATE POLICY "Users can view activities in their company"
ON public.lead_activities FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create activities in their company" ON public.lead_activities;
CREATE POLICY "Users can create activities in their company"
ON public.lead_activities FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update activities in their company" ON public.lead_activities;
CREATE POLICY "Users can update activities in their company"
ON public.lead_activities FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can delete activities in their company" ON public.lead_activities;
CREATE POLICY "Admins can delete activities in their company"
ON public.lead_activities FOR DELETE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);