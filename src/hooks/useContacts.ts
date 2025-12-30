import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Contact {
  id: string;
  organization_id: string;
  account_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  job_title: string | null;
  department: string | null;
  city: string | null;
  country: string | null;
  linkedin_url: string | null;
  description: string | null;
  owner_id: string | null;
  source: string | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  account?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface CreateContactData {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  city?: string;
  country?: string;
  linkedin_url?: string;
  description?: string;
  account_id?: string;
  owner_id?: string;
  source?: string;
}

export function useContacts() {
  const { currentOrg } = useOrganization();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!currentOrg) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select(`
          *,
          account:accounts (id, name)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setContacts((data || []) as Contact[]);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  const createContact = useCallback(async (data: CreateContactData): Promise<Contact> => {
    if (!currentOrg) throw new Error('No organization selected');

    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        ...data,
        organization_id: currentOrg.id,
      })
      .select()
      .single();

    if (error) throw error;

    setContacts(prev => [contact, ...prev]);
    return contact;
  }, [currentOrg]);

  const updateContact = useCallback(async (contactId: string, data: Partial<CreateContactData>) => {
    const { data: contact, error } = await supabase
      .from('contacts')
      .update(data)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;

    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ...contact } : c));
    return contact;
  }, []);

  const deleteContact = useCallback(async (contactId: string) => {
    // Soft delete
    const { error } = await supabase
      .from('contacts')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', contactId);

    if (error) throw error;

    setContacts(prev => prev.filter(c => c.id !== contactId));
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    isLoading,
    error,
    createContact,
    updateContact,
    deleteContact,
    refetch: fetchContacts,
  };
}
