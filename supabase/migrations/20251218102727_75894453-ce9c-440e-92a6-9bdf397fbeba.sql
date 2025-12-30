
-- =====================================================
-- ENHANCED CRM MIGRATION SYSTEM BACKEND
-- Extends Excel/CSV Import to Enterprise-Grade Migration
-- =====================================================

-- 1) Add normalized_phone and custom_fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS normalized_phone TEXT,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Create index for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_leads_normalized_phone_company 
ON public.leads(normalized_phone, company_id) WHERE normalized_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_company 
ON public.leads(email, company_id) WHERE email IS NOT NULL;

-- 2) Create import_row_errors table for detailed error tracking
CREATE TABLE IF NOT EXISTS public.import_row_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_job_id UUID NOT NULL REFERENCES public.lead_import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  error_type TEXT NOT NULL DEFAULT 'validation',
  error_message TEXT NOT NULL,
  raw_row_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_row_errors_job_id ON public.import_row_errors(import_job_id);

-- 3) Enhance lead_import_jobs table with more columns
ALTER TABLE public.lead_import_jobs
ADD COLUMN IF NOT EXISTS source_label TEXT DEFAULT 'Excel Import',
ADD COLUMN IF NOT EXISTS preview_rows JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS valid_rows INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS duplicate_rows INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_agent_id UUID,
ADD COLUMN IF NOT EXISTS default_stage TEXT,
ADD COLUMN IF NOT EXISTS default_group_id UUID,
ADD COLUMN IF NOT EXISTS rollback_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMP WITH TIME ZONE;

-- Update status enum to include more states
-- First check if any rows would violate the new constraint
UPDATE public.lead_import_jobs 
SET status = 'completed' 
WHERE status NOT IN ('preview', 'processing', 'completed', 'failed', 'rolled_back', 'cancelled');

-- 4) Add source_label column to lead_activities if not exists
ALTER TABLE public.lead_activities
ADD COLUMN IF NOT EXISTS import_job_id UUID REFERENCES public.lead_import_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_activities_import_job ON public.lead_activities(import_job_id) WHERE import_job_id IS NOT NULL;

-- 5) Create function to normalize phone numbers consistently
CREATE OR REPLACE FUNCTION public.normalize_phone_v2(phone_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-numeric characters except + at start
  cleaned := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- If starts with 00, replace with +
  IF cleaned LIKE '00%' THEN
    cleaned := substring(cleaned from 3);
  END IF;
  
  -- Ensure minimum length for valid phone
  IF length(cleaned) < 7 THEN
    RETURN NULL;
  END IF;
  
  RETURN '+' || cleaned;
END;
$$;

-- 6) Create function for enhanced duplicate detection
CREATE OR REPLACE FUNCTION public.check_lead_duplicate_v2(
  p_phone TEXT, 
  p_email TEXT,
  p_company_id UUID
)
RETURNS TABLE(lead_id UUID, match_type TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
BEGIN
  -- First check by normalized phone
  normalized := normalize_phone_v2(p_phone);
  IF normalized IS NOT NULL THEN
    RETURN QUERY
    SELECT l.id, 'phone'::TEXT
    FROM public.leads l
    WHERE l.company_id = p_company_id
    AND l.normalized_phone = normalized
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;
  
  -- Then check by email
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    RETURN QUERY
    SELECT l.id, 'email'::TEXT
    FROM public.leads l
    WHERE l.company_id = p_company_id
    AND lower(trim(l.email)) = lower(trim(p_email))
    LIMIT 1;
  END IF;
END;
$$;

-- 7) Create function to rollback an import
CREATE OR REPLACE FUNCTION public.rollback_import(p_job_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_leads_deleted INTEGER;
  v_activities_deleted INTEGER;
BEGIN
  -- Get job info
  SELECT * INTO v_job FROM public.lead_import_jobs WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Import job not found');
  END IF;
  
  -- Check if rollback is still allowed (within 24 hours by default)
  IF v_job.rollback_until IS NOT NULL AND now() > v_job.rollback_until THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rollback period has expired');
  END IF;
  
  IF v_job.status = 'rolled_back' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Import already rolled back');
  END IF;
  
  -- Delete activities created by this import
  DELETE FROM public.lead_activities WHERE import_job_id = p_job_id;
  GET DIAGNOSTICS v_activities_deleted = ROW_COUNT;
  
  -- Delete leads created by this import
  DELETE FROM public.leads WHERE import_job_id = p_job_id;
  GET DIAGNOSTICS v_leads_deleted = ROW_COUNT;
  
  -- Delete error records
  DELETE FROM public.import_row_errors WHERE import_job_id = p_job_id;
  
  -- Update job status
  UPDATE public.lead_import_jobs
  SET status = 'rolled_back',
      rolled_back_at = now()
  WHERE id = p_job_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'leads_deleted', v_leads_deleted,
    'activities_deleted', v_activities_deleted
  );
END;
$$;

-- 8) Create trigger to auto-set normalized_phone on insert/update
CREATE OR REPLACE FUNCTION public.set_normalized_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_phone := normalize_phone_v2(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_leads_normalize_phone ON public.leads;
CREATE TRIGGER tr_leads_normalize_phone
  BEFORE INSERT OR UPDATE OF phone ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_normalized_phone();

-- 9) Update existing leads to have normalized_phone
UPDATE public.leads
SET normalized_phone = normalize_phone_v2(phone)
WHERE normalized_phone IS NULL AND phone IS NOT NULL;

-- 10) RLS Policies for import_row_errors

ALTER TABLE public.import_row_errors ENABLE ROW LEVEL SECURITY;

-- Users can view error rows for their company's import jobs
CREATE POLICY "Users can view their company import errors"
  ON public.import_row_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lead_import_jobs j
      JOIN public.profiles p ON p.company_id = j.company_id
      WHERE j.id = import_row_errors.import_job_id
      AND p.id = auth.uid()
    )
  );

-- Only admin/manager can insert error records (via import process)
CREATE POLICY "Admin/Manager can insert import errors"
  ON public.import_row_errors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lead_import_jobs j
      JOIN public.profiles p ON p.company_id = j.company_id
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE j.id = import_row_errors.import_job_id
      AND p.id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Allow deletion for rollback
CREATE POLICY "Admin can delete import errors"
  ON public.import_row_errors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lead_import_jobs j
      JOIN public.profiles p ON p.company_id = j.company_id
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE j.id = import_row_errors.import_job_id
      AND p.id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- 11) Enable realtime for import_row_errors
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_row_errors;

-- 12) Create helper function to merge lead data (update only empty fields)
CREATE OR REPLACE FUNCTION public.merge_lead_data(
  p_lead_id UUID,
  p_new_data JSONB,
  p_force_agent BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current RECORD;
BEGIN
  SELECT * INTO v_current FROM public.leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update only empty/null fields (merge strategy)
  UPDATE public.leads
  SET
    email = COALESCE(NULLIF(v_current.email, ''), p_new_data->>'email'),
    source = COALESCE(NULLIF(v_current.source, ''), p_new_data->>'source'),
    stage = COALESCE(NULLIF(v_current.stage, ''), p_new_data->>'stage'),
    location = COALESCE(NULLIF(v_current.location, ''), p_new_data->>'location'),
    budget = COALESCE(NULLIF(v_current.budget, ''), p_new_data->>'budget'),
    requirements = COALESCE(NULLIF(v_current.requirements, ''), p_new_data->>'requirements'),
    nationality = COALESCE(NULLIF(v_current.nationality, ''), p_new_data->>'nationality'),
    property_type = COALESCE(NULLIF(v_current.property_type, ''), p_new_data->>'property_type'),
    bedrooms = COALESCE(NULLIF(v_current.bedrooms, ''), p_new_data->>'bedrooms'),
    -- Only update agent if forced or currently null
    assigned_agent_id = CASE 
      WHEN p_force_agent AND (p_new_data->>'assigned_agent_id') IS NOT NULL 
      THEN (p_new_data->>'assigned_agent_id')::UUID
      WHEN v_current.assigned_agent_id IS NULL AND (p_new_data->>'assigned_agent_id') IS NOT NULL
      THEN (p_new_data->>'assigned_agent_id')::UUID
      ELSE v_current.assigned_agent_id
    END,
    -- Merge custom fields
    custom_fields = COALESCE(v_current.custom_fields, '{}'::jsonb) || COALESCE((p_new_data->'custom_fields')::jsonb, '{}'::jsonb),
    updated_at = now()
  WHERE id = p_lead_id;
  
  RETURN TRUE;
END;
$$;

-- 13) Add indexes for performance at scale
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON public.leads(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_import_job ON public.leads(import_job_id) WHERE import_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_import_jobs_company_status ON public.lead_import_jobs(company_id, status);
