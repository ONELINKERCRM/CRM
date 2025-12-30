-- Create marketing_connections table
CREATE TABLE public.marketing_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  identifier TEXT NOT NULL, -- phone number or email
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  credentials JSONB DEFAULT '{}'::jsonb, -- encrypted credentials storage
  verified BOOLEAN DEFAULT false,
  last_sync TIMESTAMP WITH TIME ZONE,
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'failed', 'unknown')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.marketing_connections ENABLE ROW LEVEL SECURITY;

-- Create policies - users can only access connections from their company
CREATE POLICY "Users can view their company connections"
ON public.marketing_connections
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create connections for their company"
ON public.marketing_connections
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company connections"
ON public.marketing_connections
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company connections"
ON public.marketing_connections
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_marketing_connections_updated_at
BEFORE UPDATE ON public.marketing_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_marketing_connections_company_channel ON public.marketing_connections(company_id, channel);
CREATE INDEX idx_marketing_connections_status ON public.marketing_connections(status);