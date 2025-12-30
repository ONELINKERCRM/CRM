
-- Add missing columns to leads table for import tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS imported_from text,
ADD COLUMN IF NOT EXISTS opted_in boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS import_job_id uuid;

-- Create lead_import_jobs table for tracking import progress
CREATE TABLE IF NOT EXISTS public.lead_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  total_rows integer DEFAULT 0,
  imported_rows integer DEFAULT 0,
  skipped_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  duplicate_action text DEFAULT 'skip', -- 'skip' or 'update'
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  error_details jsonb DEFAULT '[]'::jsonb,
  column_mapping jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_company_id ON public.lead_import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_status ON public.lead_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_leads_import_job_id ON public.leads(import_job_id);
CREATE INDEX IF NOT EXISTS idx_leads_imported_from ON public.leads(imported_from);

-- Enable RLS on lead_import_jobs
ALTER TABLE public.lead_import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_import_jobs (Admin/Manager only)
CREATE POLICY "Users can view their company import jobs"
ON public.lead_import_jobs
FOR SELECT
USING (
  company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Admins and Managers can create import jobs"
ON public.lead_import_jobs
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and Managers can update import jobs"
ON public.lead_import_jobs
FOR UPDATE
USING (
  company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can delete import jobs"
ON public.lead_import_jobs
FOR DELETE
USING (
  company_id IN (
    SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
  )
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Enable realtime for import jobs (for progress tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_import_jobs;

-- Function to normalize phone numbers
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN NULL;
  END IF;
  -- Remove all non-numeric characters except + at start
  RETURN regexp_replace(
    regexp_replace(phone_input, '[^0-9+]', '', 'g'),
    '^([^+])', '+\1'
  );
END;
$$;

-- Function to check for duplicate leads by phone
CREATE OR REPLACE FUNCTION public.check_lead_duplicate(p_phone text, p_company_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.leads
  WHERE company_id = p_company_id
  AND normalize_phone(phone) = normalize_phone(p_phone)
  LIMIT 1;
$$;
