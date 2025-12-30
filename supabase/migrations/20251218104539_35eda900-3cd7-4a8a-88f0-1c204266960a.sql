-- Drop existing check constraint
ALTER TABLE public.lead_import_jobs DROP CONSTRAINT IF EXISTS lead_import_jobs_status_check;

-- Add new check constraint with all valid statuses including preview and rolled_back
ALTER TABLE public.lead_import_jobs ADD CONSTRAINT lead_import_jobs_status_check 
CHECK (status = ANY (ARRAY['preview'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'rolled_back'::text]));