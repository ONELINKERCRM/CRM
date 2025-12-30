-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT,
  stage TEXT DEFAULT 'New',
  budget TEXT,
  requirements TEXT,
  location TEXT,
  assigned_agent_id UUID REFERENCES public.agents(id),
  tags TEXT[] DEFAULT '{}',
  lead_score INTEGER DEFAULT 0,
  gender TEXT,
  nationality TEXT,
  language TEXT,
  preferred_contact_time TEXT,
  purpose TEXT,
  property_type TEXT,
  bedrooms TEXT,
  furnished TEXT,
  move_in_date TEXT,
  form_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- Add columns if they don't exist (Merging schema)
DO $$ BEGIN
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  stage TEXT DEFAULT 'New';
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  tags TEXT[] DEFAULT '{}';
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  lead_score INTEGER DEFAULT 0;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  gender TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  nationality TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  language TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  preferred_contact_time TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  purpose TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  property_type TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  bedrooms TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  furnished TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  move_in_date TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  form_data JSONB DEFAULT '{}';
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  budget TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  requirements TEXT;
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS  location TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for company-based access
DROP POLICY IF EXISTS "Users can view leads from their company" ON public.leads;
CREATE POLICY "Users can view leads from their company"
ON public.leads
FOR SELECT
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can create leads for their company" ON public.leads;
CREATE POLICY "Users can create leads for their company"
ON public.leads
FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update leads from their company" ON public.leads;
CREATE POLICY "Users can update leads from their company"
ON public.leads
FOR UPDATE
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete leads from their company" ON public.leads;
CREATE POLICY "Users can delete leads from their company"
ON public.leads
FOR DELETE
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();