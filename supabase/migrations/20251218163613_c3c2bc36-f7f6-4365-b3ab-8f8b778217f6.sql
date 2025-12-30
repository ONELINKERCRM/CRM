-- ============================================
-- LEAD STAGES BACKEND - COMPLETE REBUILD
-- ============================================

-- 1. Add unique constraint on lead_stages (company_id, name) to prevent duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lead_stages_company_id_name_unique'
  ) THEN
    ALTER TABLE public.lead_stages 
    ADD CONSTRAINT lead_stages_company_id_name_unique UNIQUE (company_id, name);
  END IF;
END $$;

-- 2. Add stage_id column to leads table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'stage_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN stage_id uuid REFERENCES public.lead_stages(id);
  END IF;
END $$;

-- 3. Create index on stage_id for performance
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON public.leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_lead_stages_company_default ON public.lead_stages(company_id, is_default) WHERE is_default = true;

-- 4. Ensure exactly one default stage per company
-- First, set "New" stage as default for each company
UPDATE public.lead_stages 
SET is_default = true 
WHERE name = 'New' AND is_default = false;

-- If no "New" stage exists for a company, set the first stage as default
UPDATE public.lead_stages ls
SET is_default = true
WHERE ls.position = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.lead_stages 
    WHERE company_id = ls.company_id AND is_default = true
  );

-- 5. Create function to get default stage for a company
CREATE OR REPLACE FUNCTION public.get_default_stage_id(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_id uuid;
BEGIN
  -- First try to find the default stage
  SELECT id INTO v_stage_id
  FROM public.lead_stages
  WHERE company_id = p_company_id AND is_default = true
  LIMIT 1;
  
  -- If no default, get the first stage by position
  IF v_stage_id IS NULL THEN
    SELECT id INTO v_stage_id
    FROM public.lead_stages
    WHERE company_id = p_company_id
    ORDER BY position ASC
    LIMIT 1;
  END IF;
  
  RETURN v_stage_id;
END;
$$;

-- 6. Create function to map stage name to stage_id (for imports)
CREATE OR REPLACE FUNCTION public.map_stage_name_to_id(
  p_company_id uuid,
  p_stage_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_id uuid;
  v_canonical_name text;
BEGIN
  -- Try exact match first
  SELECT id INTO v_stage_id
  FROM public.lead_stages
  WHERE company_id = p_company_id 
    AND LOWER(TRIM(name)) = LOWER(TRIM(p_stage_name))
  LIMIT 1;
  
  IF v_stage_id IS NOT NULL THEN
    RETURN v_stage_id;
  END IF;
  
  -- Map common variations to canonical stages
  v_canonical_name := CASE LOWER(TRIM(p_stage_name))
    -- New variations
    WHEN 'new' THEN 'New'
    WHEN 'new lead' THEN 'New'
    WHEN 'fresh' THEN 'New'
    WHEN 'uncontacted' THEN 'New'
    WHEN 'not contacted' THEN 'New'
    -- Contacted variations
    WHEN 'contacted' THEN 'Contacted'
    WHEN 'contact made' THEN 'Contacted'
    WHEN 'reached' THEN 'Contacted'
    WHEN 'in contact' THEN 'Contacted'
    -- Follow Up variations
    WHEN 'follow up' THEN 'Follow Up'
    WHEN 'followup' THEN 'Follow Up'
    WHEN 'follow-up' THEN 'Follow Up'
    WHEN 'pending' THEN 'Follow Up'
    WHEN 'in progress' THEN 'Follow Up'
    -- Qualified variations
    WHEN 'qualified' THEN 'Qualified'
    WHEN 'hot' THEN 'Qualified'
    WHEN 'interested' THEN 'Qualified'
    -- Meeting variations
    WHEN 'meeting' THEN 'Meeting Scheduled'
    WHEN 'meeting scheduled' THEN 'Meeting Scheduled'
    WHEN 'appointment' THEN 'Meeting Scheduled'
    WHEN 'viewing' THEN 'Viewing Done'
    WHEN 'viewing done' THEN 'Viewing Done'
    -- Proposal variations
    WHEN 'proposal' THEN 'Proposal Sent'
    WHEN 'proposal sent' THEN 'Proposal Sent'
    WHEN 'offer' THEN 'Proposal Sent'
    -- Negotiation variations
    WHEN 'negotiation' THEN 'Negotiation'
    WHEN 'negotiating' THEN 'Negotiation'
    -- Won variations
    WHEN 'won' THEN 'Won'
    WHEN 'closed won' THEN 'Won'
    WHEN 'converted' THEN 'Won'
    WHEN 'closed' THEN 'Closed'
    WHEN 'contract signed' THEN 'Contract Signed'
    -- Lost variations
    WHEN 'lost' THEN 'Lost'
    WHEN 'closed lost' THEN 'Lost'
    WHEN 'dead' THEN 'Lost'
    WHEN 'not interested' THEN 'Lost'
    WHEN 'junk' THEN 'Lost'
    ELSE NULL
  END;
  
  -- If we found a canonical mapping, look it up
  IF v_canonical_name IS NOT NULL THEN
    SELECT id INTO v_stage_id
    FROM public.lead_stages
    WHERE company_id = p_company_id 
      AND LOWER(name) = LOWER(v_canonical_name)
    LIMIT 1;
    
    IF v_stage_id IS NOT NULL THEN
      RETURN v_stage_id;
    END IF;
  END IF;
  
  -- Fallback to default stage
  RETURN public.get_default_stage_id(p_company_id);
END;
$$;

-- 7. Create trigger function to auto-assign default stage on lead insert
CREATE OR REPLACE FUNCTION public.assign_default_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign if stage_id is null and company_id exists
  IF NEW.stage_id IS NULL AND NEW.company_id IS NOT NULL THEN
    -- If stage text is provided, try to map it
    IF NEW.stage IS NOT NULL AND TRIM(NEW.stage) != '' THEN
      NEW.stage_id := public.map_stage_name_to_id(NEW.company_id, NEW.stage);
    ELSE
      NEW.stage_id := public.get_default_stage_id(NEW.company_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Create trigger on leads table
DROP TRIGGER IF EXISTS trigger_assign_default_stage ON public.leads;
CREATE TRIGGER trigger_assign_default_stage
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_stage();

-- 9. Migrate existing leads: map stage text to stage_id
UPDATE public.leads l
SET stage_id = public.map_stage_name_to_id(l.company_id, l.stage)
WHERE l.company_id IS NOT NULL 
  AND l.stage_id IS NULL;

-- 10. Create function to create default stages for new company
CREATE OR REPLACE FUNCTION public.create_default_stages_for_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if company has no stages
  IF NOT EXISTS (SELECT 1 FROM public.lead_stages WHERE company_id = p_company_id) THEN
    INSERT INTO public.lead_stages (company_id, name, color, position, is_default, is_won, is_lost)
    VALUES
      (p_company_id, 'New', '#3B82F6', 1, true, false, false),
      (p_company_id, 'Contacted', '#8B5CF6', 2, false, false, false),
      (p_company_id, 'Qualified', '#06B6D4', 3, false, false, false),
      (p_company_id, 'Meeting Scheduled', '#EC4899', 4, false, false, false),
      (p_company_id, 'Viewing Done', '#14B8A6', 5, false, false, false),
      (p_company_id, 'Proposal Sent', '#F59E0B', 6, false, false, false),
      (p_company_id, 'Negotiation', '#F97316', 7, false, false, false),
      (p_company_id, 'Follow Up', '#A855F7', 8, false, false, false),
      (p_company_id, 'Contract Signed', '#84CC16', 9, false, false, false),
      (p_company_id, 'Won', '#10B981', 10, false, true, false),
      (p_company_id, 'Lost', '#EF4444', 11, false, false, true);
  END IF;
END;
$$;

-- 11. Trigger to auto-create default stages when company is created
CREATE OR REPLACE FUNCTION public.trigger_create_default_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_default_stages_for_company(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_company_default_stages ON public.companies;
CREATE TRIGGER trigger_company_default_stages
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_default_stages();

-- 12. Function to validate stage uniqueness before insert/update
CREATE OR REPLACE FUNCTION public.validate_stage_unique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for duplicate name within same company (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.lead_stages
    WHERE company_id = NEW.company_id
      AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Stage name "%" already exists for this company', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_stage_unique ON public.lead_stages;
CREATE TRIGGER trigger_validate_stage_unique
  BEFORE INSERT OR UPDATE ON public.lead_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_stage_unique();

-- 13. Function to ensure only one default stage per company
CREATE OR REPLACE FUNCTION public.ensure_single_default_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting this stage as default, unset others
  IF NEW.is_default = true THEN
    UPDATE public.lead_stages
    SET is_default = false
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_single_default_stage ON public.lead_stages;
CREATE TRIGGER trigger_single_default_stage
  AFTER INSERT OR UPDATE OF is_default ON public.lead_stages
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_stage();

-- 14. Log stage mapping for imported leads (create activity when stage was mapped)
CREATE OR REPLACE FUNCTION public.log_stage_mapping(
  p_lead_id uuid,
  p_original_stage text,
  p_mapped_stage_id uuid,
  p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mapped_stage_name text;
BEGIN
  SELECT name INTO v_mapped_stage_name
  FROM public.lead_stages
  WHERE id = p_mapped_stage_id;
  
  -- Only log if original stage was different from mapped stage
  IF LOWER(TRIM(p_original_stage)) != LOWER(TRIM(v_mapped_stage_name)) THEN
    INSERT INTO public.lead_activities (
      lead_id,
      company_id,
      type,
      title,
      description,
      agent_name
    ) VALUES (
      p_lead_id,
      p_company_id,
      'note',
      'Stage Mapped During Import',
      'Original stage "' || p_original_stage || '" was mapped to "' || v_mapped_stage_name || '"',
      'System'
    );
  END IF;
END;
$$;

-- 15. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_default_stage_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_stage_name_to_id(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_stages_for_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_stage_mapping(uuid, text, uuid, uuid) TO authenticated;