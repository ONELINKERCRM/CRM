-- Create pricing plans enum
CREATE TYPE public.plan_type AS ENUM ('free', 'starter', 'growth', 'business');

-- Create pricing plans table
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type plan_type NOT NULL UNIQUE,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  user_limit INTEGER NOT NULL DEFAULT 1,
  lead_limit INTEGER, -- NULL means unlimited
  listing_limit INTEGER, -- NULL means unlimited
  can_send_campaigns BOOLEAN NOT NULL DEFAULT false,
  can_activate_chatbots BOOLEAN NOT NULL DEFAULT false,
  can_use_automations BOOLEAN NOT NULL DEFAULT false,
  can_manage_team BOOLEAN NOT NULL DEFAULT false,
  can_use_advanced_assignment BOOLEAN NOT NULL DEFAULT false,
  can_use_custom_roles BOOLEAN NOT NULL DEFAULT false,
  has_priority_support BOOLEAN NOT NULL DEFAULT false,
  has_dedicated_manager BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default pricing plans
INSERT INTO public.pricing_plans (name, plan_type, price_monthly, price_yearly, user_limit, lead_limit, listing_limit, can_send_campaigns, can_activate_chatbots, can_use_automations, can_manage_team, can_use_advanced_assignment, can_use_custom_roles, has_priority_support, has_dedicated_manager) VALUES
('Free Forever', 'free', 0, 0, 1, 50, 10, false, false, false, false, false, false, false, false),
('Starter Team', 'starter', 149, 1490, 5, NULL, NULL, true, true, true, true, false, false, false, false),
('Growth Team', 'growth', 299, 2990, 15, NULL, NULL, true, true, true, true, true, false, true, false),
('Business', 'business', 699, 6990, 50, NULL, NULL, true, true, true, true, true, true, true, true);

-- Create company subscriptions table
CREATE TABLE public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.pricing_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Pricing plans are readable by everyone
CREATE POLICY "Anyone can view pricing plans"
ON public.pricing_plans FOR SELECT
USING (true);

-- Company subscriptions policies
CREATE POLICY "Users can view their company subscription"
ON public.company_subscriptions FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage company subscription"
ON public.company_subscriptions FOR ALL
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create function to get company's active user count
CREATE OR REPLACE FUNCTION public.get_company_user_count(p_company_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.agents
  WHERE company_id = p_company_id
  AND status = 'active';
$$;

-- Create function to check if company can add more users
CREATE OR REPLACE FUNCTION public.can_add_user(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pp.user_limit > get_company_user_count(p_company_id)
      FROM company_subscriptions cs
      JOIN pricing_plans pp ON cs.plan_id = pp.id
      WHERE cs.company_id = p_company_id
      AND cs.status = 'active'
    ),
    true
  );
$$;

-- Create function to get company's plan features
CREATE OR REPLACE FUNCTION public.get_company_plan(p_company_id UUID)
RETURNS TABLE (
  plan_type plan_type,
  plan_name TEXT,
  user_limit INTEGER,
  lead_limit INTEGER,
  listing_limit INTEGER,
  can_send_campaigns BOOLEAN,
  can_activate_chatbots BOOLEAN,
  can_use_automations BOOLEAN,
  can_manage_team BOOLEAN,
  can_use_advanced_assignment BOOLEAN,
  can_use_custom_roles BOOLEAN,
  has_priority_support BOOLEAN,
  has_dedicated_manager BOOLEAN,
  current_user_count INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pp.plan_type,
    pp.name,
    pp.user_limit,
    pp.lead_limit,
    pp.listing_limit,
    pp.can_send_campaigns,
    pp.can_activate_chatbots,
    pp.can_use_automations,
    pp.can_manage_team,
    pp.can_use_advanced_assignment,
    pp.can_use_custom_roles,
    pp.has_priority_support,
    -- Dedicated manager only enabled for business plan with 15+ users
    CASE 
      WHEN pp.plan_type = 'business' AND get_company_user_count(p_company_id) >= 15 THEN true
      ELSE false
    END as has_dedicated_manager,
    get_company_user_count(p_company_id) as current_user_count
  FROM company_subscriptions cs
  JOIN pricing_plans pp ON cs.plan_id = pp.id
  WHERE cs.company_id = p_company_id
  AND cs.status = 'active'
  LIMIT 1;
$$;

-- Trigger to auto-create free subscription for new companies
CREATE OR REPLACE FUNCTION public.handle_new_company_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id FROM pricing_plans WHERE plan_type = 'free';
  
  -- Create subscription for new company
  INSERT INTO company_subscriptions (company_id, plan_id, status)
  VALUES (NEW.id, free_plan_id, 'active');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_company_created_add_subscription
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_company_subscription();

-- Add updated_at trigger
CREATE TRIGGER update_company_subscriptions_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();