import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

export interface CrmLead {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  status: string;
  rating: string | null;
  source: string | null;
  description: string | null;
  owner_id: string | null;
  converted_at: string | null;
  converted_contact_id: string | null;
  converted_account_id: string | null;
  converted_deal_id: string | null;
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

interface CreateLeadData {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  website?: string;
  city?: string;
  country?: string;
  status?: string;
  rating?: string;
  source?: string;
  description?: string;
  owner_id?: string;
}

interface ConvertLeadData {
  create_contact?: boolean;
  create_account?: boolean;
  create_deal?: boolean;
  deal_name?: string;
  deal_value?: number;
  pipeline_id?: string;
  stage_id?: string;
}

export function useCrmLeads() {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!currentOrg) {
      setLeads([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('is_deleted', false)
        .is('converted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLeads((data || []) as CrmLead[]);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  const createLead = useCallback(async (data: CreateLeadData): Promise<CrmLead> => {
    if (!currentOrg) throw new Error('No organization selected');

    const { data: lead, error } = await supabase
      .from('crm_leads')
      .insert({
        ...data,
        organization_id: currentOrg.id,
        status: data.status || 'new',
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    setLeads(prev => [lead, ...prev]);
    return lead;
  }, [currentOrg, user]);

  const updateLead = useCallback(async (leadId: string, data: Partial<CreateLeadData>) => {
    const { data: lead, error } = await supabase
      .from('crm_leads')
      .update(data)
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...lead } : l));
    return lead;
  }, []);

  const deleteLead = useCallback(async (leadId: string) => {
    const { error } = await supabase
      .from('crm_leads')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', leadId);

    if (error) throw error;

    setLeads(prev => prev.filter(l => l.id !== leadId));
  }, []);

  const convertLead = useCallback(async (leadId: string, options: ConvertLeadData = {}) => {
    if (!currentOrg) throw new Error('No organization selected');

    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    const results: { contactId?: string; accountId?: string; dealId?: string } = {};

    // Create account if requested
    if (options.create_account && lead.company_name) {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          organization_id: currentOrg.id,
          name: lead.company_name,
          website: lead.website,
          phone: lead.phone,
          owner_id: lead.owner_id,
          source: lead.source,
          created_by: user?.id,
        })
        .select()
        .single();

      if (accountError) throw accountError;
      results.accountId = account.id;
    }

    // Create contact if requested
    if (options.create_contact) {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          organization_id: currentOrg.id,
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          job_title: lead.job_title,
          city: lead.city,
          country: lead.country,
          account_id: results.accountId,
          owner_id: lead.owner_id,
          source: lead.source,
          description: lead.description,
          created_by: user?.id,
        })
        .select()
        .single();

      if (contactError) throw contactError;
      results.contactId = contact.id;
    }

    // Create deal if requested
    if (options.create_deal && options.pipeline_id && options.stage_id) {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          organization_id: currentOrg.id,
          name: options.deal_name || `${lead.first_name} ${lead.last_name || ''} - Deal`.trim(),
          value: options.deal_value || 0,
          pipeline_id: options.pipeline_id,
          stage_id: options.stage_id,
          account_id: results.accountId,
          contact_id: results.contactId,
          owner_id: lead.owner_id,
          source: lead.source,
          created_by: user?.id,
        })
        .select()
        .single();

      if (dealError) throw dealError;
      results.dealId = deal.id;
    }

    // Mark lead as converted
    const { error: updateError } = await supabase
      .from('crm_leads')
      .update({
        converted_at: new Date().toISOString(),
        converted_contact_id: results.contactId,
        converted_account_id: results.accountId,
        converted_deal_id: results.dealId,
        status: 'converted',
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    // Remove from local state
    setLeads(prev => prev.filter(l => l.id !== leadId));

    return results;
  }, [currentOrg, user, leads]);

  // Stats
  const newLeads = leads.filter(l => l.status === 'new');
  const qualifiedLeads = leads.filter(l => l.status === 'qualified');
  const hotLeads = leads.filter(l => l.rating === 'hot');

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    newLeads,
    qualifiedLeads,
    hotLeads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    convertLead,
    refetch: fetchLeads,
  };
}
