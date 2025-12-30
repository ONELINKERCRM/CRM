-- ================================================
-- DASHBOARD REAL-TIME BACKEND STRUCTURE (FIXED)
-- ================================================

-- 1️⃣ ADD INDEXES FOR PERFORMANCE
-- ================================================

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent_id ON public.leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON public.leads(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_company_source ON public.leads(company_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON public.leads(company_id, created_at DESC);

-- Lead activities indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_id ON public.lead_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON public.lead_activities(type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_agent_id ON public.lead_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_type ON public.lead_activities(company_id, type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_created ON public.lead_activities(company_id, created_at DESC);

-- Lead followups indexes
CREATE INDEX IF NOT EXISTS idx_lead_followups_company_id ON public.lead_followups(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_status ON public.lead_followups(status);
CREATE INDEX IF NOT EXISTS idx_lead_followups_due_date ON public.lead_followups(due_date);
CREATE INDEX IF NOT EXISTS idx_lead_followups_assigned_agent_id ON public.lead_followups(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_company_status ON public.lead_followups(company_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_followups_company_due ON public.lead_followups(company_id, due_date);

-- Properties indexes
CREATE INDEX IF NOT EXISTS idx_properties_company_id ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_company_status ON public.properties(company_id, status);

-- 2️⃣ ENABLE REALTIME ON REMAINING TABLES (leads already enabled)
-- ================================================

-- Check and add tables to realtime publication if not already there
DO $$ 
BEGIN
  -- lead_activities
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lead_activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;
  END IF;
  
  -- lead_followups
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lead_followups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_followups;
  END IF;
  
  -- properties
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'properties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL for complete row data in realtime updates
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.lead_activities REPLICA IDENTITY FULL;
ALTER TABLE public.lead_followups REPLICA IDENTITY FULL;
ALTER TABLE public.properties REPLICA IDENTITY FULL;

-- 3️⃣ CREATE DASHBOARD SUMMARY VIEWS
-- ================================================

-- Dashboard Leads Summary View
CREATE OR REPLACE VIEW public.dashboard_leads_summary AS
SELECT 
  company_id,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as new_leads_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as new_leads_week,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days') as new_leads_month,
  COUNT(*) FILTER (WHERE stage = 'New') as stage_new,
  COUNT(*) FILTER (WHERE stage = 'Contacted') as stage_contacted,
  COUNT(*) FILTER (WHERE stage = 'Qualified') as stage_qualified,
  COUNT(*) FILTER (WHERE stage = 'Proposal') as stage_proposal,
  COUNT(*) FILTER (WHERE stage = 'Negotiation') as stage_negotiation,
  COUNT(*) FILTER (WHERE stage = 'Won') as stage_won,
  COUNT(*) FILTER (WHERE stage = 'Lost') as stage_lost,
  COUNT(*) FILTER (WHERE lead_score >= 70) as hot_leads
FROM public.leads
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Leads by Source View
CREATE OR REPLACE VIEW public.dashboard_leads_by_source AS
SELECT 
  company_id,
  COALESCE(source, 'Unknown') as source,
  COUNT(*) as count
FROM public.leads
WHERE company_id IS NOT NULL
GROUP BY company_id, source;

-- Dashboard Leads by Agent View
CREATE OR REPLACE VIEW public.dashboard_leads_by_agent AS
SELECT 
  l.company_id,
  l.assigned_agent_id,
  a.name as agent_name,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE l.stage = 'Won') as won_leads,
  COUNT(*) FILTER (WHERE l.stage = 'Lost') as lost_leads,
  COUNT(*) FILTER (WHERE DATE(l.created_at) = CURRENT_DATE) as new_today
FROM public.leads l
LEFT JOIN public.agents a ON l.assigned_agent_id = a.id
WHERE l.company_id IS NOT NULL AND l.assigned_agent_id IS NOT NULL
GROUP BY l.company_id, l.assigned_agent_id, a.name;

-- Dashboard Listings Summary View
CREATE OR REPLACE VIEW public.dashboard_listings_summary AS
SELECT 
  company_id,
  COUNT(*) as total_listings,
  COUNT(*) FILTER (WHERE status = 'active' OR status = 'published') as active_listings,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_listings,
  COUNT(*) FILTER (WHERE status = 'sold') as sold_listings,
  COUNT(*) FILTER (WHERE status = 'rented') as rented_listings,
  COUNT(*) FILTER (WHERE status = 'archived' OR status = 'inactive') as archived_listings,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as new_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as new_this_week
FROM public.properties
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Followups Summary View
CREATE OR REPLACE VIEW public.dashboard_followups_summary AS
SELECT 
  company_id,
  COUNT(*) as total_followups,
  COUNT(*) FILTER (WHERE DATE(due_date) = CURRENT_DATE AND status = 'pending') as today_followups,
  COUNT(*) FILTER (WHERE due_date < CURRENT_TIMESTAMP AND status = 'pending') as missed_followups,
  COUNT(*) FILTER (WHERE due_date > CURRENT_TIMESTAMP AND status = 'pending') as upcoming_followups,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_followups,
  COUNT(*) FILTER (WHERE DATE(due_date) >= CURRENT_DATE AND DATE(due_date) <= CURRENT_DATE + INTERVAL '7 days' AND status = 'pending') as this_week_followups
FROM public.lead_followups
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- Dashboard Activities Summary View
CREATE OR REPLACE VIEW public.dashboard_activities_summary AS
SELECT 
  company_id,
  COUNT(*) as total_activities,
  COUNT(*) FILTER (WHERE type = 'call') as calls_made,
  COUNT(*) FILTER (WHERE type = 'whatsapp') as whatsapp_actions,
  COUNT(*) FILTER (WHERE type = 'note') as notes_added,
  COUNT(*) FILTER (WHERE type = 'voice_note') as voice_notes_added,
  COUNT(*) FILTER (WHERE type = 'email') as emails_sent,
  COUNT(*) FILTER (WHERE type = 'meeting') as meetings,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as activities_today,
  COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days') as activities_week
FROM public.lead_activities
WHERE company_id IS NOT NULL
GROUP BY company_id;

-- 4️⃣ CREATE OPTIMIZED FUNCTIONS FOR DASHBOARD DATA
-- ================================================

-- Function to get dashboard metrics for a company
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_company_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'leads', (SELECT row_to_json(ls.*) FROM dashboard_leads_summary ls WHERE ls.company_id = p_company_id),
    'listings', (SELECT row_to_json(ps.*) FROM dashboard_listings_summary ps WHERE ps.company_id = p_company_id),
    'followups', (SELECT row_to_json(fs.*) FROM dashboard_followups_summary fs WHERE fs.company_id = p_company_id),
    'activities', (SELECT row_to_json(as_.*) FROM dashboard_activities_summary as_ WHERE as_.company_id = p_company_id)
  );
$$;

-- Function to get leads by stage for chart
CREATE OR REPLACE FUNCTION public.get_leads_by_stage(p_company_id uuid)
RETURNS TABLE(stage text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(stage, 'Unknown') as stage,
    COUNT(*) as count
  FROM public.leads
  WHERE company_id = p_company_id
  GROUP BY stage
  ORDER BY count DESC;
$$;

-- Function to get leads by source for chart
CREATE OR REPLACE FUNCTION public.get_leads_by_source(p_company_id uuid)
RETURNS TABLE(source text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(source, 'Unknown') as source,
    COUNT(*) as count
  FROM public.leads
  WHERE company_id = p_company_id
  GROUP BY source
  ORDER BY count DESC
  LIMIT 10;
$$;

-- Function to get lead trends for chart (last 30 days)
CREATE OR REPLACE FUNCTION public.get_lead_trends(p_company_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE(date date, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as count
  FROM public.leads
  WHERE company_id = p_company_id
    AND created_at >= CURRENT_DATE - (p_days || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY date;
$$;

-- Function to get agent performance
CREATE OR REPLACE FUNCTION public.get_agent_performance(p_company_id uuid)
RETURNS TABLE(
  agent_id uuid,
  agent_name text,
  total_leads bigint,
  won_leads bigint,
  activities_count bigint,
  conversion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id as agent_id,
    a.name as agent_name,
    COALESCE(l.total_leads, 0) as total_leads,
    COALESCE(l.won_leads, 0) as won_leads,
    COALESCE(act.activity_count, 0) as activities_count,
    CASE 
      WHEN COALESCE(l.total_leads, 0) > 0 
      THEN ROUND((COALESCE(l.won_leads, 0)::numeric / l.total_leads::numeric) * 100, 1)
      ELSE 0 
    END as conversion_rate
  FROM public.agents a
  LEFT JOIN (
    SELECT 
      assigned_agent_id,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE stage = 'Won') as won_leads
    FROM public.leads
    WHERE company_id = p_company_id
    GROUP BY assigned_agent_id
  ) l ON a.id = l.assigned_agent_id
  LEFT JOIN (
    SELECT 
      agent_id,
      COUNT(*) as activity_count
    FROM public.lead_activities
    WHERE company_id = p_company_id
    GROUP BY agent_id
  ) act ON a.id = act.agent_id
  WHERE a.company_id = p_company_id AND a.status = 'active'
  ORDER BY total_leads DESC;
$$;