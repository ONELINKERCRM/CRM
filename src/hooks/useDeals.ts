import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export type DealStatus = 'open' | 'won' | 'lost';

export interface Deal {
  id: string;
  organization_id: string;
  pipeline_id: string;
  stage_id: string;
  account_id: string | null;
  contact_id: string | null;
  name: string;
  value: number;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  status: DealStatus;
  lost_reason: string | null;
  description: string | null;
  owner_id: string | null;
  source: string | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  stage?: {
    id: string;
    name: string;
    color: string;
    probability: number;
  } | null;
  account?: {
    id: string;
    name: string;
  } | null;
  contact?: {
    id: string;
    first_name: string;
    last_name: string | null;
  } | null;
  owner?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface CreateDealData {
  name: string;
  pipeline_id: string;
  stage_id: string;
  value?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  account_id?: string;
  contact_id?: string;
  owner_id?: string;
  source?: string;
  description?: string;
}

export function useDeals(pipelineId?: string) {
  const { currentOrg } = useOrganization();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!currentOrg) {
      setDeals([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('deals')
        .select(`
          *,
          stage:pipeline_stages (id, name, color, probability),
          account:accounts (id, name),
          contact:contacts (id, first_name, last_name)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setDeals((data || []) as Deal[]);
    } catch (err) {
      console.error('Error fetching deals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch deals');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, pipelineId]);

  const createDeal = useCallback(async (data: CreateDealData): Promise<Deal> => {
    if (!currentOrg) throw new Error('No organization selected');

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        ...data,
        organization_id: currentOrg.id,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;

    await fetchDeals();
    return deal;
  }, [currentOrg, fetchDeals]);

  const updateDeal = useCallback(async (dealId: string, data: Partial<CreateDealData & { status: DealStatus; lost_reason?: string; actual_close_date?: string }>) => {
    const { data: deal, error } = await supabase
      .from('deals')
      .update(data)
      .eq('id', dealId)
      .select()
      .single();

    if (error) throw error;

    await fetchDeals();
    return deal;
  }, [fetchDeals]);

  const moveDealToStage = useCallback(async (dealId: string, stageId: string) => {
    return updateDeal(dealId, { stage_id: stageId });
  }, [updateDeal]);

  const markAsWon = useCallback(async (dealId: string) => {
    return updateDeal(dealId, { 
      status: 'won', 
      actual_close_date: new Date().toISOString().split('T')[0] 
    });
  }, [updateDeal]);

  const markAsLost = useCallback(async (dealId: string, reason?: string) => {
    return updateDeal(dealId, { 
      status: 'lost', 
      lost_reason: reason,
      actual_close_date: new Date().toISOString().split('T')[0] 
    });
  }, [updateDeal]);

  const deleteDeal = useCallback(async (dealId: string) => {
    const { error } = await supabase
      .from('deals')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', dealId);

    if (error) throw error;

    setDeals(prev => prev.filter(d => d.id !== dealId));
  }, []);

  // Stats
  const totalValue = deals.filter(d => d.status === 'open').reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = deals.filter(d => d.status === 'won').reduce((sum, d) => sum + (d.value || 0), 0);
  const openDeals = deals.filter(d => d.status === 'open');
  const wonDeals = deals.filter(d => d.status === 'won');
  const lostDeals = deals.filter(d => d.status === 'lost');

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return {
    deals,
    openDeals,
    wonDeals,
    lostDeals,
    totalValue,
    wonValue,
    isLoading,
    error,
    createDeal,
    updateDeal,
    moveDealToStage,
    markAsWon,
    markAsLost,
    deleteDeal,
    refetch: fetchDeals,
  };
}
