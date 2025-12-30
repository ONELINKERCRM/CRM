-- Create lead_groups table
CREATE TABLE IF NOT EXISTS public.lead_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Add lead_group_id to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_group_id UUID REFERENCES public.lead_groups(id) ON DELETE SET NULL;

-- Create index on lead_group_id
CREATE INDEX IF NOT EXISTS idx_leads_group_id ON public.leads(lead_group_id);
CREATE INDEX IF NOT EXISTS idx_lead_groups_company ON public.lead_groups(company_id);

-- Enable RLS
ALTER TABLE public.lead_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_groups
-- All company members can view groups
CREATE POLICY "Users can view company lead groups"
ON public.lead_groups
FOR SELECT
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

-- Only Admin/Manager can create groups
CREATE POLICY "Admins and managers can create lead groups"
ON public.lead_groups
FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Only Admin/Manager can update groups
CREATE POLICY "Admins and managers can update lead groups"
ON public.lead_groups
FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Only Admin/Manager can delete groups
CREATE POLICY "Admins and managers can delete lead groups"
ON public.lead_groups
FOR DELETE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Add updated_at trigger
CREATE TRIGGER update_lead_groups_updated_at
  BEFORE UPDATE ON public.lead_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for lead_groups
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_groups;