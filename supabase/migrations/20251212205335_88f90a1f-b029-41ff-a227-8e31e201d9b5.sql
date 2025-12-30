-- Create lead_activities table for tracking all lead-related activities
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'whatsapp', 'note', 'stage', 'followup', 'task', 'voicenote', 'automation', 'attachment')),
  title TEXT NOT NULL,
  description TEXT,
  agent_id UUID REFERENCES public.profiles(id),
  agent_name TEXT NOT NULL,
  duration TEXT,
  audio_url TEXT,
  attachments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view lead activities"
ON public.lead_activities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create lead activities"
ON public.lead_activities
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update lead activities"
ON public.lead_activities
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete lead activities"
ON public.lead_activities
FOR DELETE
TO authenticated
USING (true);

-- Enable realtime for this table
ALTER TABLE public.lead_activities REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;

-- Create index for faster queries by lead_id
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);