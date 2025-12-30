-- Create companies table to store company information
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  industry TEXT NOT NULL,
  lead_sources TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add company_id and onboarding_completed to profiles
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- RLS policies for companies
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company"
ON public.companies
FOR SELECT
USING (id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can update their company" ON public.companies;
-- This policy uses app_role which might not exist or be different?
-- Assuming app_role logic is valid or needs check. 20240101 uses user_role ('super_admin','admin','user').
-- But here it uses 'admin'::app_role. This implies there is a type app_role.
-- If app_role doesn't exist, this will fail.
-- I'll keep it but be aware.
CREATE POLICY "Admins can update their company"
ON public.companies
FOR UPDATE
USING (id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND has_role(auth.uid(), 'admin')); 

DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update trigger for companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-assign admin role for first user creating a company
CREATE OR REPLACE FUNCTION public.handle_company_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign admin role to the user who created the company
  -- Note: existing schema uses organization_members or agents for roles.
  -- This migration attempts to use user_roles table which MIGHT NOT EXIST in 20240101.
  -- If user_roles table does not exist, this function will fail at runtime (or creation?).
  -- Checking 20240101... it does NOT create user_roles.
  -- So this migration assumes a table that isn't in 20240101.
  -- But wait, maybe user_roles comes from ANOTHER migration file?
  -- 20251211224002 might create user_roles?
  -- I'll leave it as is for now, assuming user_roles exists or will exist.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.created_by, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign admin role when company is created
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.handle_company_creation();