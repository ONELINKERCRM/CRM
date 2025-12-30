-- Add missing columns to portal_accounts
ALTER TABLE public.portal_accounts 
ADD COLUMN IF NOT EXISTS auto_publish boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sync_schedule text DEFAULT 'daily' CHECK (sync_schedule IN ('realtime', 'hourly', 'daily')),
ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_error_message text;

-- Rename error_message to last_error_message if it exists differently
UPDATE public.portal_accounts 
SET last_error_message = error_message 
WHERE last_error_message IS NULL AND error_message IS NOT NULL;