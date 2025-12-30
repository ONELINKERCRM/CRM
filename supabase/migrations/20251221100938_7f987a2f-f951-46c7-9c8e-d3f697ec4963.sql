-- Add columns to leads table for Meta lead tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- Add columns to company_settings for new lead customization
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS new_lead_badge_color VARCHAR(7) DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS new_lead_background_color VARCHAR(7) DEFAULT '#dcfce7',
ADD COLUMN IF NOT EXISTS new_lead_animation VARCHAR(10) DEFAULT 'fade' CHECK (new_lead_animation IN ('none', 'fade', 'glow'));

-- Create index for faster queries on new leads
CREATE INDEX IF NOT EXISTS idx_leads_is_new ON public.leads(is_new) WHERE is_new = true;