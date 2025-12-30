-- Enable realtime for activities table
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- Set replica identity for realtime updates
ALTER TABLE public.activities REPLICA IDENTITY FULL;

-- Create index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_activities_organization_lead ON public.activities(organization_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner_id ON public.activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled_at ON public.activities(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);