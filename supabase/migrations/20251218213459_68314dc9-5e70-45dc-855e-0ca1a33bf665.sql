-- Create listing_notifications table
CREATE TABLE IF NOT EXISTS public.listing_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('assigned', 'published', 'failed_publish', 'archived', 'expired', 'inquiry')),
    title TEXT NOT NULL,
    message TEXT,
    read_status TEXT NOT NULL DEFAULT 'unread' CHECK (read_status IN ('read', 'unread')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.listing_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
ON public.listing_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System/triggers can insert notifications
CREATE POLICY "Authenticated users can create notifications"
ON public.listing_notifications
FOR INSERT
WITH CHECK (true);

-- Create function to send notification when listing is assigned
CREATE OR REPLACE FUNCTION public.notify_listing_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If assigned_agent_id changed and is not null
    IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id AND NEW.assigned_agent_id IS NOT NULL THEN
        -- Get the agent's user_id
        INSERT INTO public.listing_notifications (listing_id, user_id, notification_type, title, message)
        SELECT 
            NEW.id,
            a.user_id,
            'assigned',
            'New Listing Assigned',
            'You have been assigned to listing: ' || NEW.title
        FROM public.agents a
        WHERE a.id = NEW.assigned_agent_id AND a.user_id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for assignment notifications
DROP TRIGGER IF EXISTS trigger_listing_assignment_notification ON public.listings;
CREATE TRIGGER trigger_listing_assignment_notification
    AFTER UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_listing_assignment();

-- Add index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_listing_notifications_user ON public.listing_notifications(user_id, read_status);
CREATE INDEX IF NOT EXISTS idx_listing_notifications_listing ON public.listing_notifications(listing_id);

-- Enable realtime for listings table
ALTER TABLE public.listings REPLICA IDENTITY FULL;

-- Add listings to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'listings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
    END IF;
END $$;