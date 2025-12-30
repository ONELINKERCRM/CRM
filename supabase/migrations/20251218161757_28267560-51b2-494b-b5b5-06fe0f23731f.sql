-- Add oauth_state column for CSRF protection during OAuth flow
ALTER TABLE public.tiktok_accounts ADD COLUMN IF NOT EXISTS oauth_state TEXT;