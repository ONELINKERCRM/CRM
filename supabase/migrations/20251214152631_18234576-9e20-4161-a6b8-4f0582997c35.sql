-- ============================================
-- ONELINKER CRM - COMPLETE BACKEND SCHEMA
-- ============================================

-- ============================================
-- ============================================
-- 1. LEAD STAGES (Custom per company)
-- ============================================

-- Drop potentially conflicting tables created by initial baseline
DROP TABLE IF EXISTS public.lead_stages CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.lead_sources CASCADE;
DROP TABLE IF EXISTS public.lead_assignment_logs CASCADE;

CREATE TABLE public.lead_stages (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_stages_company ON public.lead_stages(company_id);
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company stages" ON public.lead_stages
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can manage stages" ON public.lead_stages
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- ============================================
-- 2. LEAD FOLLOWUPS
-- ============================================
CREATE TABLE public.lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  reminder_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_followups_lead ON public.lead_followups(lead_id);
CREATE INDEX idx_lead_followups_company ON public.lead_followups(company_id);
CREATE INDEX idx_lead_followups_agent ON public.lead_followups(assigned_agent_id);
CREATE INDEX idx_lead_followups_due_date ON public.lead_followups(due_date);
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company followups" ON public.lead_followups
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create followups" ON public.lead_followups
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update company followups" ON public.lead_followups
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete followups" ON public.lead_followups
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 3. LEAD ASSIGNMENT RULES
-- ============================================
CREATE TABLE public.lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('round_robin', 'campaign_based', 'source_based', 'manual', 'advanced')),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  assigned_agents UUID[] DEFAULT '{}',
  round_robin_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_assignment_rules_company ON public.lead_assignment_rules(company_id);
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company rules" ON public.lead_assignment_rules
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can manage rules" ON public.lead_assignment_rules
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- ============================================
-- 4. LEAD ASSIGNMENT LOGS
-- ============================================
CREATE TABLE public.lead_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL,
  assignment_method TEXT NOT NULL CHECK (assignment_method IN ('manual', 'round_robin', 'campaign_based', 'source_based', 'auto')),
  reason TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_assignment_logs_company ON public.lead_assignment_logs(company_id);
CREATE INDEX idx_lead_assignment_logs_lead ON public.lead_assignment_logs(lead_id);
CREATE INDEX idx_lead_assignment_logs_created ON public.lead_assignment_logs(created_at);
ALTER TABLE public.lead_assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company logs" ON public.lead_assignment_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can create logs" ON public.lead_assignment_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 5. PROPERTIES (Agent Listings)
-- ============================================
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  ref_number TEXT,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  property_type TEXT NOT NULL,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sale', 'rent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'pending', 'sold', 'rented', 'off_market', 'reserved')),
  price DECIMAL(15, 2),
  currency TEXT DEFAULT 'AED',
  price_frequency TEXT CHECK (price_frequency IN ('total', 'yearly', 'monthly', 'weekly', 'daily')),
  bedrooms INTEGER,
  bathrooms INTEGER,
  size DECIMAL(12, 2),
  size_unit TEXT DEFAULT 'sqft',
  location TEXT,
  area TEXT,
  city TEXT,
  country TEXT DEFAULT 'UAE',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  permit_number TEXT,
  furnishing TEXT CHECK (furnishing IN ('furnished', 'unfurnished', 'semi_furnished')),
  completion_status TEXT CHECK (completion_status IN ('ready', 'off_plan', 'under_construction')),
  amenities TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  views_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_company_listing BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_company ON public.properties(company_id);
CREATE INDEX idx_properties_agent ON public.properties(agent_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_type ON public.properties(property_type, listing_type);
CREATE INDEX idx_properties_ref ON public.properties(ref_number);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company properties" ON public.properties
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Agents can create properties" ON public.properties
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Agents can update own properties" ON public.properties
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'manager')
      OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete properties" ON public.properties
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 6. PROPERTY MEDIA
-- ============================================
CREATE TABLE public.property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'virtual_tour', 'floor_plan', 'document')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  position INTEGER DEFAULT 0,
  is_cover BOOLEAN DEFAULT false,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_media_property ON public.property_media(property_id);
CREATE INDEX idx_property_media_company ON public.property_media(company_id);
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company media" ON public.property_media
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage company media" ON public.property_media
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 7. PROPERTY PDFS (Auto-generated brochures)
-- ============================================
CREATE TABLE public.property_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  template_type TEXT DEFAULT 'standard',
  language TEXT DEFAULT 'en',
  file_size INTEGER,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_pdfs_property ON public.property_pdfs(property_id);
ALTER TABLE public.property_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company PDFs" ON public.property_pdfs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage company PDFs" ON public.property_pdfs
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 8. PORTALS (Property Portal Definitions)
-- ============================================
CREATE TABLE public.portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  base_url TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default portals
INSERT INTO public.portals (name, display_name, country) VALUES
  ('property_finder', 'Property Finder', 'UAE'),
  ('bayut', 'Bayut', 'UAE'),
  ('dubizzle', 'Dubizzle', 'UAE'),
  ('mubawab', 'Mubawab', 'Morocco'),
  ('aqar', 'Aqar', 'Saudi Arabia'),
  ('qatar_living', 'Qatar Living', 'Qatar'),
  ('website', 'Company Website', NULL);

ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portals" ON public.portals
  FOR SELECT USING (true);

-- ============================================
-- 9. PORTAL INTEGRATIONS (Company connections)
-- ============================================
CREATE TABLE public.portal_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  api_key_encrypted TEXT,
  credentials JSONB DEFAULT '{}',
  default_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  is_connected BOOLEAN DEFAULT false,
  auto_sync BOOLEAN DEFAULT false,
  sync_frequency TEXT DEFAULT 'manual',
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, portal_id)
);

CREATE INDEX idx_portal_integrations_company ON public.portal_integrations(company_id);
ALTER TABLE public.portal_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company integrations" ON public.portal_integrations
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage integrations" ON public.portal_integrations
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 10. PROPERTY PUBLICATIONS (Portal listings)
-- ============================================
CREATE TABLE public.property_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_listing_id TEXT,
  custom_title TEXT,
  custom_description TEXT,
  custom_price DECIMAL(15, 2),
  custom_images TEXT[],
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'failed', 'unpublished')),
  published_at TIMESTAMPTZ,
  unpublished_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  portal_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, portal_id)
);

CREATE INDEX idx_property_publications_property ON public.property_publications(property_id);
CREATE INDEX idx_property_publications_portal ON public.property_publications(portal_id);
CREATE INDEX idx_property_publications_company ON public.property_publications(company_id);
ALTER TABLE public.property_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company publications" ON public.property_publications
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage company publications" ON public.property_publications
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 11. CAMPAIGNS
-- ============================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('lead_nurturing', 'drip', 'property_promotion', 'event', 'announcement')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'multi')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  connection_id UUID REFERENCES public.marketing_connections(id) ON DELETE SET NULL,
  template_id TEXT,
  template_content JSONB DEFAULT '{}',
  audience_type TEXT DEFAULT 'all' CHECK (audience_type IN ('all', 'segment', 'filtered', 'imported')),
  audience_filters JSONB DEFAULT '{}',
  audience_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_company ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON public.campaigns(scheduled_at);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company campaigns" ON public.campaigns
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update company campaigns" ON public.campaigns
  FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete campaigns" ON public.campaigns
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 12. CAMPAIGN MESSAGES (Individual sends)
-- ============================================
CREATE TABLE public.campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_messages_campaign ON public.campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_lead ON public.campaign_messages(lead_id);
CREATE INDEX idx_campaign_messages_status ON public.campaign_messages(status);
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company messages" ON public.campaign_messages
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage messages" ON public.campaign_messages
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 13. CAMPAIGN LOGS
-- ============================================
CREATE TABLE public.campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_logs_campaign ON public.campaign_logs(campaign_id);
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company logs" ON public.campaign_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can create logs" ON public.campaign_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 14. LEAD SOURCES
-- ============================================
CREATE TABLE public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('portal', 'social_media', 'search_ads', 'crm', 'website', 'email_messaging', 'offline', 'automation')),
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  lead_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_sources_company ON public.lead_sources(company_id);
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company sources" ON public.lead_sources
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage sources" ON public.lead_sources
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- ============================================
-- 15. SOURCE INTEGRATIONS
-- ============================================
CREATE TABLE public.source_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_source_id UUID NOT NULL REFERENCES public.lead_sources(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('oauth', 'api', 'webhook', 'manual', 'zapier')),
  credentials JSONB DEFAULT '{}',
  webhook_url TEXT,
  webhook_secret TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle',
  error_message TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_source_integrations_company ON public.source_integrations(company_id);
CREATE INDEX idx_source_integrations_source ON public.source_integrations(lead_source_id);
ALTER TABLE public.source_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company integrations" ON public.source_integrations
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage integrations" ON public.source_integrations
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 16. INTEGRATION LOGS
-- ============================================
CREATE TABLE public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_integration_id UUID REFERENCES public.source_integrations(id) ON DELETE SET NULL,
  portal_integration_id UUID REFERENCES public.portal_integrations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  records_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_logs_company ON public.integration_logs(company_id);
CREATE INDEX idx_integration_logs_created ON public.integration_logs(created_at);
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company logs" ON public.integration_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can create logs" ON public.integration_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 17. TEAM MEMBERS (Link users to teams)
-- ============================================
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, agent_id)
);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_agent ON public.team_members(agent_id);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team members" ON public.team_members
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- ============================================
-- 18. COMPANY SETTINGS
-- ============================================
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#6366f1',
  default_listing_status TEXT DEFAULT 'draft',
  default_lead_stage TEXT DEFAULT 'New',
  email_signature TEXT,
  whatsapp_default_message TEXT,
  pdf_template TEXT DEFAULT 'standard',
  auto_assign_leads BOOLEAN DEFAULT false,
  assignment_method TEXT DEFAULT 'manual',
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00", "timezone": "Asia/Dubai"}',
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_settings_company ON public.company_settings(company_id);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company settings" ON public.company_settings
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage settings" ON public.company_settings
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- ============================================
-- 19. UPDATE EXISTING TABLES
-- ============================================

-- Add company_id to teams if not exists
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_teams_company ON public.teams(company_id);

-- Add company_id to agents if not exists
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_agents_company ON public.agents(company_id);

-- Add company_id to lead_activities if not exists
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_lead_activities_company ON public.lead_activities(company_id);

-- ============================================
-- 20. TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_lead_stages_updated_at BEFORE UPDATE ON public.lead_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_followups_updated_at BEFORE UPDATE ON public.lead_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_assignment_rules_updated_at BEFORE UPDATE ON public.lead_assignment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portal_integrations_updated_at BEFORE UPDATE ON public.portal_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_publications_updated_at BEFORE UPDATE ON public.property_publications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_sources_updated_at BEFORE UPDATE ON public.lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_source_integrations_updated_at BEFORE UPDATE ON public.source_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 21. STORAGE BUCKET FOR PROPERTY MEDIA
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-media', 'property-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-pdfs', 'property-pdfs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property-media bucket
CREATE POLICY "Users can view property media" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-media');

CREATE POLICY "Authenticated users can upload property media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their property media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their property media" ON storage.objects
  FOR DELETE USING (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

-- Storage policies for property-pdfs bucket
CREATE POLICY "Users can view property PDFs" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-pdfs');

CREATE POLICY "Authenticated users can upload property PDFs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'property-pdfs' AND auth.uid() IS NOT NULL);

-- Storage policies for company-assets bucket
CREATE POLICY "Users can view company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can upload company assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);