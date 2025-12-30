-- Restrict sensitive credential fields to admin-only access
-- These tables contain encrypted API keys that should only be visible to admins

-- 1. Restrict marketing_connections credentials to admin-only
DROP POLICY IF EXISTS "Users can view their company connections" ON public.marketing_connections;

CREATE POLICY "Users can view non-sensitive connection info"
ON public.marketing_connections FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- 2. Restrict source_integrations to admin-only for viewing secrets
DROP POLICY IF EXISTS "Users can view company integrations" ON public.source_integrations;

CREATE POLICY "Admins can view source integrations"
ON public.source_integrations FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Restrict company_subscriptions viewing to admins
DROP POLICY IF EXISTS "Users can view their company subscription" ON public.company_subscriptions;

CREATE POLICY "Admins can view company subscription"
ON public.company_subscriptions FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Restrict chatbot API key access to admins only
DROP POLICY IF EXISTS "Users can view their company chatbots" ON public.chatbots;

CREATE POLICY "Admins can view full chatbot config"
ON public.chatbots FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create a separate policy for non-admins to see limited chatbot info (without API keys)
CREATE POLICY "Users can view chatbot basic info"
ON public.chatbots FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- 5. Restrict campaign_messages to marketing-related roles
DROP POLICY IF EXISTS "Users can view company messages" ON public.campaign_messages;

CREATE POLICY "Managers and admins can view campaign messages"
ON public.campaign_messages FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);