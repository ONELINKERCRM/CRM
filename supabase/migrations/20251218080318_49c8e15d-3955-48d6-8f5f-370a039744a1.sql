-- Fix SECURITY DEFINER views to use SECURITY INVOKER
-- This ensures RLS policies are respected when querying views

-- Recreate views with SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.dashboard_leads_summary CASCADE;
DROP VIEW IF EXISTS public.dashboard_leads_by_source CASCADE;
DROP VIEW IF EXISTS public.dashboard_leads_by_agent CASCADE;
DROP VIEW IF EXISTS public.dashboard_listings_summary CASCADE;
DROP VIEW IF EXISTS public.dashboard_followups_summary CASCADE;
DROP VIEW IF EXISTS public.dashboard_activities_summary CASCADE;

-- Dashboard Leads Summary View (SECURITY INVOKER)
CREATE VIEW public.dashboard_leads_summary 
WITH (security_invoker = true)
AS
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

-- Dashboard Leads by Source View (SECURITY INVOKER)
CREATE VIEW public.dashboard_leads_by_source
WITH (security_invoker = true)
AS
SELECT 
  company_id,
  COALESCE(source, 'Unknown') as source,
  COUNT(*) as count
FROM public.leads
WHERE company_id IS NOT NULL
GROUP BY company_id, source;

-- Dashboard Leads by Agent View (SECURITY INVOKER)
CREATE VIEW public.dashboard_leads_by_agent
WITH (security_invoker = true)
AS
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

-- Dashboard Listings Summary View (SECURITY INVOKER)
CREATE VIEW public.dashboard_listings_summary
WITH (security_invoker = true)
AS
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

-- Dashboard Followups Summary View (SECURITY INVOKER)
CREATE VIEW public.dashboard_followups_summary
WITH (security_invoker = true)
AS
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

-- Dashboard Activities Summary View (SECURITY INVOKER)
CREATE VIEW public.dashboard_activities_summary
WITH (security_invoker = true)
AS
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