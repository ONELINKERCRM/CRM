import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  stage_name: string;
  stage_order: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

export interface PipelineEntry {
  id: string;
  pipeline_id: string;
  lead_id: string;
  current_stage_id: string;
  assigned_agent_id: string | null;
  added_at: string;
  last_stage_change_at: string | null;
  notes: string | null;
  lead: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    source: string | null;
    budget: string | null;
  };
  agent?: {
    id: string;
    name: string;
  } | null;
}

export interface Pipeline {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export function usePipeline(pipelineId?: string) {
  const { user } = useAuth();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [entries, setEntries] = useState<PipelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create default pipeline if none exists
  const createDefaultPipeline = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) return null;

      // Create pipeline
      const { data: newPipeline, error: pipelineError } = await supabase
        .from("lead_pipelines")
        .insert({
          company_id: profile.company_id,
          name: "Sales Pipeline",
          description: "Default sales pipeline",
          is_default: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Create default stages
      const defaultStages = [
        { stage_name: "New", stage_order: 0, color: "#3b82f6" },
        { stage_name: "Contacted", stage_order: 1, color: "#8b5cf6" },
        { stage_name: "Follow Up", stage_order: 2, color: "#f59e0b" },
        { stage_name: "Meeting", stage_order: 3, color: "#06b6d4" },
        { stage_name: "Proposal", stage_order: 4, color: "#10b981" },
        { stage_name: "Won", stage_order: 5, color: "#22c55e", is_won: true },
        { stage_name: "Lost", stage_order: 6, color: "#ef4444", is_lost: true },
      ];

      const { error: stagesError } = await supabase
        .from("lead_pipeline_stages")
        .insert(
          defaultStages.map((s) => ({
            ...s,
            pipeline_id: newPipeline.id,
          }))
        );

      if (stagesError) throw stagesError;

      return newPipeline;
    } catch (err) {
      console.error("Error creating default pipeline:", err);
      return null;
    }
  }, [user?.id]);

  // Fetch all pipelines for the company
  const fetchPipelines = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from("lead_pipelines")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPipelines(data || []);

      let activePipeline: Pipeline | null = null;

      // If no pipeline selected and we have pipelines, use default or first
      if (!pipelineId && data) {
        if (data.length > 0) {
          activePipeline = data.find((p) => p.is_default) || data[0];
        } else {
          // No pipelines found, create a default one
          activePipeline = await createDefaultPipeline();
          if (activePipeline) {
            setPipelines([activePipeline]);
          }
        }
      } else if (pipelineId && data) {
        activePipeline = data.find((p) => p.id === pipelineId) || null;
      }

      if (activePipeline) {
        setPipeline(activePipeline);
      }

      return activePipeline;
    } catch (err) {
      console.error("Error fetching pipelines:", err);
      setError("Failed to load pipelines");
      return null;
    }
  }, [user?.id, pipelineId, createDefaultPipeline]);

  // Fetch stages for a pipeline
  const fetchStages = useCallback(async (pipId: string) => {
    try {
      const { data, error } = await supabase
        .from("lead_pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipId)
        .order("stage_order", { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (err) {
      console.error("Error fetching stages:", err);
    }
  }, []);

  // Fetch entries (leads in pipeline) with lead and agent data
  const fetchEntriesRef = useRef<((pipId: string) => Promise<void>) | null>(null);
  const fetchEntries = useCallback(async (pipId: string) => {
    try {
      const { data, error } = await supabase
        .from("lead_pipeline_entries")
        .select(`
          *,
          lead:leads(id, name, phone, email, source, budget),
          agent:agents(id, name)
        `)
        .eq("pipeline_id", pipId)
        .order("added_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error("Error fetching pipeline entries:", err);
    }
  }, []);

  // Keep ref updated
  useEffect(() => {
    fetchEntriesRef.current = fetchEntries;
  }, [fetchEntries]);



  // Move lead to new stage
  const moveLeadToStage = useCallback(
    async (entryId: string, newStageId: string) => {
      try {
        const { data, error } = await supabase.rpc("move_pipeline_lead_stage", {
          p_entry_id: entryId,
          p_new_stage_id: newStageId,
        });

        if (error) throw error;

        // Update local state
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, current_stage_id: newStageId, last_stage_change_at: new Date().toISOString() }
              : e
          )
        );

        return true;
      } catch (err) {
        console.error("Error moving lead:", err);
        toast.error("Failed to move lead");
        return false;
      }
    },
    []
  );

  // Assign agent to lead
  const assignAgent = useCallback(
    async (entryId: string, agentId: string | null) => {
      try {
        const { error } = await supabase.rpc("assign_pipeline_lead_agent", {
          p_entry_id: entryId,
          p_new_agent_id: agentId,
        });

        if (error) throw error;

        // Refetch entries to get updated agent data
        if (pipeline) {
          await fetchEntries(pipeline.id);
        }

        return true;
      } catch (err) {
        console.error("Error assigning agent:", err);
        toast.error("Failed to assign agent");
        return false;
      }
    },
    [pipeline, fetchEntries]
  );

  // Remove lead from pipeline
  const removeFromPipeline = useCallback(
    async (entryId: string) => {
      try {
        const { error } = await supabase
          .from("lead_pipeline_entries")
          .delete()
          .eq("id", entryId);

        if (error) throw error;

        setEntries((prev) => prev.filter((e) => e.id !== entryId));
        toast.success("Lead removed from pipeline");
        return true;
      } catch (err) {
        console.error("Error removing lead:", err);
        toast.error("Failed to remove lead");
        return false;
      }
    },
    []
  );

  // Refresh entries
  const refreshEntries = useCallback(() => {
    if (pipeline) {
      fetchEntries(pipeline.id);
    }
  }, [pipeline, fetchEntries]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const activePipeline = await fetchPipelines();

      if (activePipeline) {
        // Parallel fetch of stages and entries to avoid intermediate empty state
        await Promise.all([
          fetchStages(activePipeline.id),
          fetchEntries(activePipeline.id)
        ]);
      }

      setIsLoading(false);
    };

    if (user?.id) {
      init();
    }
  }, [user?.id, fetchPipelines, fetchStages, fetchEntries]);

  // When pipeline changes, fetch its stages and entries
  useEffect(() => {
    const loadPipelineData = async () => {
      if (pipeline) {
        await Promise.all([fetchStages(pipeline.id), fetchEntries(pipeline.id)]);
      }
    };

    loadPipelineData();
  }, [pipeline, fetchStages, fetchEntries]);

  // If pipelineId prop changes, update the selected pipeline
  useEffect(() => {
    if (pipelineId && pipelines.length > 0) {
      const found = pipelines.find((p) => p.id === pipelineId);
      if (found) {
        setPipeline(found);
      }
    }
  }, [pipelineId, pipelines]);

  // Set up realtime subscription
  useEffect(() => {
    if (!pipeline) return;

    const channel = supabase
      .channel(`pipeline_entries_${pipeline.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_pipeline_entries",
          filter: `pipeline_id=eq.${pipeline.id}`,
        },
        () => {
          if (fetchEntriesRef.current) {
            fetchEntriesRef.current(pipeline.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pipeline]); // Removed fetchEntries - using ref pattern

  // Create default if no pipelines exist
  useEffect(() => {
    const ensurePipeline = async () => {
      if (!isLoading && pipelines.length === 0 && user?.id) {
        const newPipeline = await createDefaultPipeline();
        if (newPipeline) {
          setPipelines([newPipeline]);
          setPipeline(newPipeline);
        }
      }
    };

    ensurePipeline();
  }, [isLoading, pipelines.length, user?.id, createDefaultPipeline]);

  return {
    pipeline,
    pipelines,
    stages,
    entries,
    isLoading,
    error,
    setPipeline,
    moveLeadToStage,
    assignAgent,
    removeFromPipeline,
    refreshEntries,
    createDefaultPipeline,
  };
}
