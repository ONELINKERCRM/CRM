-- Add unique constraint on tiktok_lead_forms for upsert
ALTER TABLE public.tiktok_lead_forms
DROP CONSTRAINT IF EXISTS tiktok_lead_forms_company_form_unique;

ALTER TABLE public.tiktok_lead_forms
ADD CONSTRAINT tiktok_lead_forms_company_form_unique UNIQUE (company_id, form_id);