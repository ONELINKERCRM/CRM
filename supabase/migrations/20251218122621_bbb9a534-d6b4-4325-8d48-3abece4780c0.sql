-- Drop the old constraint and add new one with meeting type
ALTER TABLE public.lead_activities DROP CONSTRAINT lead_activities_type_check;

ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_type_check 
CHECK (type = ANY (ARRAY['call'::text, 'email'::text, 'whatsapp'::text, 'note'::text, 'stage'::text, 'followup'::text, 'task'::text, 'voicenote'::text, 'automation'::text, 'attachment'::text, 'meeting'::text, 'assignment'::text, 'added'::text, 'message'::text]));