import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  organization_id: string;
  name: string;
  color: string;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  stages?: PipelineStage[];
}

interface CreatePipelineData {
  name: string;
  description?: string;
  is_default?: boolean;
}

interface CreateStageData {
  name: string;
  color?: string;
  probability?: number;
  is_won?: boolean;
  is_lost?: boolean;
}

export function usePipelines() {
  const { currentOrg, isAdmin } = useOrganization();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipelines = useCallback(async () => {
    if (!currentOrg) {
      setPipelines([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pipelines')
        .select(`
          *,
          stages:pipeline_stages (*)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      // Sort stages within each pipeline
      const pipelinesWithSortedStages = (data || []).map(p => ({
        ...p,
        stages: (p.stages || []).sort((a: PipelineStage, b: PipelineStage) => a.sort_order - b.sort_order),
      }));

      setPipelines(pipelinesWithSortedStages);
    } catch (err) {
      console.error('Error fetching pipelines:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pipelines');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  const createPipeline = useCallback(async (data: CreatePipelineData): Promise<Pipeline> => {
    if (!currentOrg) throw new Error('No organization selected');
    if (!isAdmin) throw new Error('Only admins can create pipelines');

    const { data: pipeline, error } = await supabase
      .from('pipelines')
      .insert({
        ...data,
        organization_id: currentOrg.id,
        sort_order: pipelines.length,
      })
      .select()
      .single();

    if (error) throw error;

    await fetchPipelines();
    return pipeline;
  }, [currentOrg, isAdmin, pipelines.length, fetchPipelines]);

  const updatePipeline = useCallback(async (pipelineId: string, data: Partial<CreatePipelineData>) => {
    if (!isAdmin) throw new Error('Only admins can update pipelines');

    const { error } = await supabase
      .from('pipelines')
      .update(data)
      .eq('id', pipelineId);

    if (error) throw error;

    await fetchPipelines();
  }, [isAdmin, fetchPipelines]);

  const deletePipeline = useCallback(async (pipelineId: string) => {
    if (!isAdmin) throw new Error('Only admins can delete pipelines');

    const { error } = await supabase
      .from('pipelines')
      .update({ is_active: false })
      .eq('id', pipelineId);

    if (error) throw error;

    await fetchPipelines();
  }, [isAdmin, fetchPipelines]);

  // Stage operations
  const createStage = useCallback(async (pipelineId: string, data: CreateStageData): Promise<PipelineStage> => {
    if (!currentOrg) throw new Error('No organization selected');
    if (!isAdmin) throw new Error('Only admins can create stages');

    const pipeline = pipelines.find(p => p.id === pipelineId);
    const sortOrder = (pipeline?.stages?.length || 0);

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .insert({
        ...data,
        pipeline_id: pipelineId,
        organization_id: currentOrg.id,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    await fetchPipelines();
    return stage;
  }, [currentOrg, isAdmin, pipelines, fetchPipelines]);

  const updateStage = useCallback(async (stageId: string, data: Partial<CreateStageData & { sort_order: number }>) => {
    if (!isAdmin) throw new Error('Only admins can update stages');

    const { error } = await supabase
      .from('pipeline_stages')
      .update(data)
      .eq('id', stageId);

    if (error) throw error;

    await fetchPipelines();
  }, [isAdmin, fetchPipelines]);

  const deleteStage = useCallback(async (stageId: string) => {
    if (!isAdmin) throw new Error('Only admins can delete stages');

    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', stageId);

    if (error) throw error;

    await fetchPipelines();
  }, [isAdmin, fetchPipelines]);

  const reorderStages = useCallback(async (pipelineId: string, stageIds: string[]) => {
    if (!isAdmin) throw new Error('Only admins can reorder stages');

    // Update each stage's sort_order
    const updates = stageIds.map((id, index) => 
      supabase
        .from('pipeline_stages')
        .update({ sort_order: index })
        .eq('id', id)
    );

    await Promise.all(updates);
    await fetchPipelines();
  }, [isAdmin, fetchPipelines]);

  // Get default pipeline
  const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  return {
    pipelines,
    defaultPipeline,
    isLoading,
    error,
    createPipeline,
    updatePipeline,
    deletePipeline,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    refetch: fetchPipelines,
  };
}
