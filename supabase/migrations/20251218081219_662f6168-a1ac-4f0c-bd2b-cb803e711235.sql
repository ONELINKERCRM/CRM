-- Fix: company creation trigger expects created_by; ensure created_by is set when creating companies via ensure_company_for_profile

CREATE OR REPLACE FUNCTION public.ensure_company_for_profile(p_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = p_profile_id;

  IF v_company_id IS NOT NULL THEN
    RETURN v_company_id;
  END IF;

  INSERT INTO public.companies (
    name,
    country,
    industry,
    currency,
    default_language,
    default_timezone,
    created_by
  )
  VALUES (
    'My Company',
    'UAE',
    'Real Estate Brokerage',
    'USD',
    'en',
    'Asia/Dubai',
    p_profile_id
  )
  RETURNING id INTO v_company_id;

  UPDATE public.profiles
  SET company_id = v_company_id,
      updated_at = now()
  WHERE id = p_profile_id;

  RETURN v_company_id;
END;
$$;

-- Backfill profile.company_id
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (SELECT id FROM public.profiles WHERE company_id IS NULL) LOOP
    PERFORM public.ensure_company_for_profile(r.id);
  END LOOP;
END $$;

-- Backfill orphaned rows to the newest available company
DO $$
DECLARE
  v_default_company uuid;
BEGIN
  SELECT company_id INTO v_default_company
  FROM public.profiles
  WHERE company_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_default_company IS NOT NULL THEN
    UPDATE public.leads SET company_id = v_default_company WHERE company_id IS NULL;
    UPDATE public.lead_activities SET company_id = v_default_company WHERE company_id IS NULL;
    UPDATE public.lead_followups SET company_id = v_default_company WHERE company_id IS NULL;
    UPDATE public.properties SET company_id = v_default_company WHERE company_id IS NULL;
  END IF;
END $$;

-- Foreign keys (nullable)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_company_id_fkey') THEN
    ALTER TABLE public.leads
    ADD CONSTRAINT leads_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_activities_company_id_fkey') THEN
    ALTER TABLE public.lead_activities
    ADD CONSTRAINT lead_activities_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_followups_company_id_fkey') THEN
    ALTER TABLE public.lead_followups
    ADD CONSTRAINT lead_followups_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_company_id_fkey') THEN
    ALTER TABLE public.properties
    ADD CONSTRAINT properties_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Auto-populate company_id from authenticated user's profile when missing
CREATE OR REPLACE FUNCTION public.set_company_id_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    v_company_id := public.ensure_company_for_profile(auth.uid());
  END IF;

  NEW.company_id := v_company_id;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_company_id_leads') THEN
    CREATE TRIGGER trg_set_company_id_leads
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_id_from_profile();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_company_id_lead_activities') THEN
    CREATE TRIGGER trg_set_company_id_lead_activities
    BEFORE INSERT ON public.lead_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_id_from_profile();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_company_id_lead_followups') THEN
    CREATE TRIGGER trg_set_company_id_lead_followups
    BEFORE INSERT ON public.lead_followups
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_id_from_profile();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_company_id_properties') THEN
    CREATE TRIGGER trg_set_company_id_properties
    BEFORE INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_id_from_profile();
  END IF;
END $$;

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_leads_company_created_at ON public.leads(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON public.leads(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_company_source ON public.leads(company_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_company_assigned_agent ON public.leads(company_id, assigned_agent_id);

CREATE INDEX IF NOT EXISTS idx_properties_company_status ON public.properties(company_id, status);
CREATE INDEX IF NOT EXISTS idx_properties_company_created_at ON public.properties(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_followups_company_due_status ON public.lead_followups(company_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_activities_company_type_created_at ON public.lead_activities(company_id, type, created_at DESC);
