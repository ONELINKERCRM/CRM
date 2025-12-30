-- Create chatbots table for multiple bot configurations
CREATE TABLE public.chatbots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  whatsapp_connection_id UUID REFERENCES public.marketing_connections(id) ON DELETE SET NULL,
  llm_provider TEXT NOT NULL DEFAULT 'lovable' CHECK (llm_provider IN ('lovable', 'openai', 'anthropic', 'google', 'custom')),
  llm_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  llm_api_key_encrypted TEXT, -- Encrypted API key for external providers
  system_prompt TEXT DEFAULT 'You are a helpful real estate assistant. Help users find properties and answer their questions.',
  welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
  qualification_questions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  auto_create_leads BOOLEAN DEFAULT true,
  max_tokens INTEGER DEFAULT 1000,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their company chatbots"
ON public.chatbots
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create chatbots for their company"
ON public.chatbots
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company chatbots"
ON public.chatbots
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company chatbots"
ON public.chatbots
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_chatbots_updated_at
BEFORE UPDATE ON public.chatbots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_chatbots_company ON public.chatbots(company_id);
CREATE INDEX idx_chatbots_active ON public.chatbots(is_active);