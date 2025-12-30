-- 1) Create lead_pipelines table
CREATE TABLE public.lead_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) Create lead_pipeline_stages table
CREATE TABLE public.lead_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.lead_pipelines(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pipeline_id, stage_name)
);

-- 3) Create lead_pipeline_entries table (leads in pipeline)
CREATE TABLE public.lead_pipeline_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.lead_pipelines(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_stage_id UUID NOT NULL REFERENCES public.lead_pipeline_stages(id),
  assigned_agent_id UUID REFERENCES public.agents(id),
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_stage_change_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  UNIQUE(pipeline_id, lead_id) -- Prevent duplicate leads in same pipeline
);

-- 4) Create lead_pipeline_history table
CREATE TABLE public.lead_pipeline_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_entry_id UUID NOT NULL REFERENCES public.lead_pipeline_entries(id) ON DELETE CASCADE,
  old_stage_id UUID REFERENCES public.lead_pipeline_stages(id),
  new_stage_id UUID NOT NULL REFERENCES public.lead_pipeline_stages(id),
  old_agent_id UUID REFERENCES public.agents(id),
  new_agent_id UUID REFERENCES public.agents(id),
  change_type TEXT NOT NULL DEFAULT 'stage_change', -- stage_change, agent_change, added, removed
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_lead_pipelines_company ON public.lead_pipelines(company_id);
CREATE INDEX idx_lead_pipeline_stages_pipeline ON public.lead_pipeline_stages(pipeline_id);
CREATE INDEX idx_lead_pipeline_stages_order ON public.lead_pipeline_stages(pipeline_id, stage_order);
CREATE INDEX idx_lead_pipeline_entries_pipeline ON public.lead_pipeline_entries(pipeline_id);
CREATE INDEX idx_lead_pipeline_entries_lead ON public.lead_pipeline_entries(lead_id);
CREATE INDEX idx_lead_pipeline_entries_stage ON public.lead_pipeline_entries(current_stage_id);
CREATE INDEX idx_lead_pipeline_entries_agent ON public.lead_pipeline_entries(assigned_agent_id);
CREATE INDEX idx_lead_pipeline_history_entry ON public.lead_pipeline_history(pipeline_entry_id);
CREATE INDEX idx_lead_pipeline_history_changed_at ON public.lead_pipeline_history(changed_at DESC);

-- Create updated_at triggers
CREATE TRIGGER update_lead_pipelines_updated_at
  BEFORE UPDATE ON public.lead_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_lead_pipeline_stages_updated_at
  BEFORE UPDATE ON public.lead_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Enable RLS
ALTER TABLE public.lead_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pipeline_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_pipelines
CREATE POLICY "Users can view company pipelines"
  ON public.lead_pipelines FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin/Manager can create pipelines"
  ON public.lead_pipelines FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin/Manager can update pipelines"
  ON public.lead_pipelines FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin can delete pipelines"
  ON public.lead_pipelines FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- RLS Policies for lead_pipeline_stages
CREATE POLICY "Users can view pipeline stages"
  ON public.lead_pipeline_stages FOR SELECT
  USING (pipeline_id IN (
    SELECT id FROM lead_pipelines WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Admin/Manager can create stages"
  ON public.lead_pipeline_stages FOR INSERT
  WITH CHECK (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin/Manager can update stages"
  ON public.lead_pipeline_stages FOR UPDATE
  USING (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admin/Manager can delete stages"
  ON public.lead_pipeline_stages FOR DELETE
  USING (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for lead_pipeline_entries
CREATE POLICY "Users can view pipeline entries"
  ON public.lead_pipeline_entries FOR SELECT
  USING (pipeline_id IN (
    SELECT id FROM lead_pipelines WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Admin/Manager can add leads to pipeline"
  ON public.lead_pipeline_entries FOR INSERT
  WITH CHECK (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Users can update pipeline entries"
  ON public.lead_pipeline_entries FOR UPDATE
  USING (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'manager')
      OR assigned_agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admin/Manager can remove leads from pipeline"
  ON public.lead_pipeline_entries FOR DELETE
  USING (
    pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  );

-- RLS Policies for lead_pipeline_history
CREATE POLICY "Users can view pipeline history"
  ON public.lead_pipeline_history FOR SELECT
  USING (pipeline_entry_id IN (
    SELECT id FROM lead_pipeline_entries WHERE pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can create history records"
  ON public.lead_pipeline_history FOR INSERT
  WITH CHECK (pipeline_entry_id IN (
    SELECT id FROM lead_pipeline_entries WHERE pipeline_id IN (
      SELECT id FROM lead_pipelines WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  ));

-- Enable realtime for pipeline entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_pipeline_entries;

-- Function to move lead to new stage with history tracking
CREATE OR REPLACE FUNCTION public.move_pipeline_lead_stage(
  p_entry_id UUID,
  p_new_stage_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_stage_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Get current stage
  SELECT current_stage_id INTO v_old_stage_id
  FROM lead_pipeline_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Skip if same stage
  IF v_old_stage_id = p_new_stage_id THEN
    RETURN TRUE;
  END IF;

  -- Update entry
  UPDATE lead_pipeline_entries
  SET current_stage_id = p_new_stage_id,
      last_stage_change_at = now()
  WHERE id = p_entry_id;

  -- Create history record
  INSERT INTO lead_pipeline_history (
    pipeline_entry_id, old_stage_id, new_stage_id, 
    change_type, changed_by, notes
  ) VALUES (
    p_entry_id, v_old_stage_id, p_new_stage_id,
    'stage_change', v_user_id, p_notes
  );

  RETURN TRUE;
END;
$$;

-- Function to assign agent with history tracking
CREATE OR REPLACE FUNCTION public.assign_pipeline_lead_agent(
  p_entry_id UUID,
  p_new_agent_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_agent_id UUID;
  v_current_stage_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Get current agent and stage
  SELECT assigned_agent_id, current_stage_id 
  INTO v_old_agent_id, v_current_stage_id
  FROM lead_pipeline_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update entry
  UPDATE lead_pipeline_entries
  SET assigned_agent_id = p_new_agent_id
  WHERE id = p_entry_id;

  -- Create history record
  INSERT INTO lead_pipeline_history (
    pipeline_entry_id, old_stage_id, new_stage_id,
    old_agent_id, new_agent_id,
    change_type, changed_by, notes
  ) VALUES (
    p_entry_id, v_current_stage_id, v_current_stage_id,
    v_old_agent_id, p_new_agent_id,
    'agent_change', v_user_id, p_notes
  );

  RETURN TRUE;
END;
$$;

-- Function to get pipeline stats
CREATE OR REPLACE FUNCTION public.get_pipeline_stats(p_pipeline_id UUID)
RETURNS TABLE(
  stage_id UUID,
  stage_name TEXT,
  stage_order INTEGER,
  lead_count BIGINT,
  percentage NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH total AS (
    SELECT COUNT(*) as total_leads 
    FROM lead_pipeline_entries 
    WHERE pipeline_id = p_pipeline_id
  )
  SELECT 
    s.id as stage_id,
    s.stage_name,
    s.stage_order,
    COUNT(e.id) as lead_count,
    CASE 
      WHEN (SELECT total_leads FROM total) > 0 
      THEN ROUND((COUNT(e.id)::NUMERIC / (SELECT total_leads FROM total)) * 100, 1)
      ELSE 0 
    END as percentage
  FROM lead_pipeline_stages s
  LEFT JOIN lead_pipeline_entries e ON s.id = e.current_stage_id
  WHERE s.pipeline_id = p_pipeline_id
  GROUP BY s.id, s.stage_name, s.stage_order
  ORDER BY s.stage_order;
$$;