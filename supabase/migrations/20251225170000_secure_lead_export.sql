-- Add main_email to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS main_email TEXT;

-- Create export_logs table
CREATE TABLE IF NOT EXISTS public.export_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    entity_type TEXT NOT NULL, -- 'leads', 'listings', etc.
    filter_criteria JSONB DEFAULT '{}',
    record_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    recipient_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on export_logs
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own export logs
CREATE POLICY "Users can view their own export logs" ON public.export_logs
    FOR SELECT USING (user_id = auth.uid());

-- Policy: Admins can view all export logs for their company
CREATE POLICY "Admins can view company export logs" ON public.export_logs
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

-- Rate limiting check function
CREATE OR REPLACE FUNCTION public.check_export_rate_limit(p_user_id UUID, p_limit INTEGER DEFAULT 3, p_interval INTERVAL DEFAULT '1 hour')
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT count(*)
    INTO v_count
    FROM public.export_logs
    WHERE user_id = p_user_id
    AND created_at > now() - p_interval;
    
    RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
