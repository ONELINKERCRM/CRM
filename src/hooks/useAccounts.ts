import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Account {
  id: string;
  organization_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  annual_revenue: number | null;
  employee_count: number | null;
  description: string | null;
  owner_id: string | null;
  source: string | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface CreateAccountData {
  name: string;
  website?: string;
  industry?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  annual_revenue?: number;
  employee_count?: number;
  description?: string;
  owner_id?: string;
  source?: string;
}

export function useAccounts() {
  const { currentOrg } = useOrganization();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!currentOrg) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAccounts((data || []) as Account[]);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  const createAccount = useCallback(async (data: CreateAccountData): Promise<Account> => {
    if (!currentOrg) throw new Error('No organization selected');

    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        ...data,
        organization_id: currentOrg.id,
      })
      .select()
      .single();

    if (error) throw error;

    setAccounts(prev => [account, ...prev]);
    return account;
  }, [currentOrg]);

  const updateAccount = useCallback(async (accountId: string, data: Partial<CreateAccountData>) => {
    const { data: account, error } = await supabase
      .from('accounts')
      .update(data)
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;

    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, ...account } : a));
    return account;
  }, []);

  const deleteAccount = useCallback(async (accountId: string) => {
    const { error } = await supabase
      .from('accounts')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', accountId);

    if (error) throw error;

    setAccounts(prev => prev.filter(a => a.id !== accountId));
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    isLoading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts,
  };
}
