-- Add attachments array column to lead_activities
ALTER TABLE public.lead_activities 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for activity attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-attachments', 'activity-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for activity attachments bucket
CREATE POLICY "Authenticated users can upload activity attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activity-attachments');

CREATE POLICY "Authenticated users can view activity attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'activity-attachments');

CREATE POLICY "Authenticated users can delete activity attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'activity-attachments');