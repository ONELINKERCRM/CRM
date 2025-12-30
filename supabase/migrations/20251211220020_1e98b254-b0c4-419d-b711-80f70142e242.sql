-- Add dashboard preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN dashboard_preferences jsonb DEFAULT '{"metrics": ["total-leads", "follow-ups", "new-leads", "conversion-rate"]}'::jsonb;