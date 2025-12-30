import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortalLead {
  id: string;
  company_id: string;
  portal_name: 'Property Finder' | 'Bayut' | 'Dubizzle';
  portal_lead_id: string;
  listing_id?: string;
  assigned_agent_id?: string;
  name: string;
  phone?: string;
  email?: string;
  message?: string;
  source?: string;
  stage_id?: string;
  group_id?: string;
  opted_in: boolean;
  status: 'new' | 'imported' | 'failed' | 'duplicate';
  error_message?: string;
  raw_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined relations
  agent?: { id: string; name: string; email: string; avatar_url?: string };
  stage?: { id: string; name: string; color: string };
  group?: { id: string; name: string; color: string };
  listing?: { id: string; title: string; reference_number?: string };
}

export interface PortalImportError {
  id: string;
  company_id: string;
  portal_name: string;
  lead_data: Record<string, unknown>;
  error_message: string;
  error_type?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export interface PortalLeadsStats {
  total: number;
  by_portal: Record<string, number>;
  by_status: Record<string, number>;
  today: number;
  this_week: number;
}

export function usePortalLeads() {
  const [leads, setLeads] = useState<PortalLead[]>([]);
  const [errors, setErrors] = useState<PortalImportError[]>([]);
  const [stats, setStats] = useState<PortalLeadsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Get company ID for the current user
  useEffect(() => {
    const getCompanyId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: agent } = await supabase
          .from('agents')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
        
        if (agent?.company_id) {
          setCompanyId(agent.company_id);
        }
      }
    };
    getCompanyId();
  }, []);

  // Fetch portal leads
  const fetchLeads = useCallback(async (filters?: {
    portal_name?: string;
    status?: string;
    agent_id?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('portal_leads')
        .select(`
          *,
          agent:agents!portal_leads_assigned_agent_id_fkey(id, name, email, avatar_url),
          stage:lead_stages!portal_leads_stage_id_fkey(id, name, color),
          group:lead_groups!portal_leads_group_id_fkey(id, name, color),
          listing:properties!portal_leads_listing_id_fkey(id, title, reference_number)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.portal_name) {
        query = query.eq('portal_name', filters.portal_name);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.agent_id) {
        query = query.eq('assigned_agent_id', filters.agent_id);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeads((data || []) as unknown as PortalLead[]);
    } catch (error) {
      console.error('Error fetching portal leads:', error);
      toast.error('Failed to fetch portal leads');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Fetch import errors
  const fetchErrors = useCallback(async (resolved = false) => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('portal_import_errors')
        .select('*')
        .eq('company_id', companyId)
        .eq('resolved', resolved)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setErrors((data || []) as PortalImportError[]);
    } catch (error) {
      console.error('Error fetching import errors:', error);
    }
  }, [companyId]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!companyId) return;

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get all leads for stats
      const { data: allLeads, error } = await supabase
        .from('portal_leads')
        .select('portal_name, status, created_at')
        .eq('company_id', companyId);

      if (error) throw error;

      const byPortal: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let todayCount = 0;
      let weekCount = 0;

      (allLeads || []).forEach((lead) => {
        byPortal[lead.portal_name] = (byPortal[lead.portal_name] || 0) + 1;
        byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
        
        if (lead.created_at >= today) todayCount++;
        if (lead.created_at >= weekAgo) weekCount++;
      });

      setStats({
        total: allLeads?.length || 0,
        by_portal: byPortal,
        by_status: byStatus,
        today: todayCount,
        this_week: weekCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [companyId]);

  // Update lead assignment
  const assignLead = async (leadId: string, agentId: string | null) => {
    try {
      const { error } = await supabase
        .from('portal_leads')
        .update({ 
          assigned_agent_id: agentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      // Log activity
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        company_id: companyId,
        type: 'assignment',
        title: agentId ? 'Lead assigned' : 'Lead unassigned',
        agent_name: 'System',
        description: agentId ? `Lead assigned to agent` : 'Lead assignment removed',
      });

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, assigned_agent_id: agentId || undefined } : l
      ));
      
      toast.success('Lead assignment updated');
      return { success: true };
    } catch (error) {
      console.error('Error assigning lead:', error);
      toast.error('Failed to assign lead');
      return { success: false, error };
    }
  };

  // Update lead stage
  const updateStage = async (leadId: string, stageId: string) => {
    try {
      const { error } = await supabase
        .from('portal_leads')
        .update({ 
          stage_id: stageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, stage_id: stageId } : l
      ));
      
      toast.success('Lead stage updated');
      return { success: true };
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
      return { success: false, error };
    }
  };

  // Update lead group
  const updateGroup = async (leadId: string, groupId: string | null) => {
    try {
      const { error } = await supabase
        .from('portal_leads')
        .update({ 
          group_id: groupId,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, group_id: groupId || undefined } : l
      ));
      
      toast.success('Lead group updated');
      return { success: true };
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group');
      return { success: false, error };
    }
  };

  // Resolve import error
  const resolveError = async (errorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase
        .from('portal_import_errors')
        .update({ 
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: agent?.id
        })
        .eq('id', errorId);

      if (error) throw error;

      setErrors(prev => prev.filter(e => e.id !== errorId));
      toast.success('Error resolved');
      return { success: true };
    } catch (error) {
      console.error('Error resolving import error:', error);
      toast.error('Failed to resolve error');
      return { success: false, error };
    }
  };

  // Retry failed import
  const retryImport = async (errorId: string) => {
    try {
      const errorRecord = errors.find(e => e.id === errorId);
      if (!errorRecord) throw new Error('Error not found');

      // Call the RPC function to reprocess
      const { data: result, error } = await supabase.rpc('process_portal_lead', {
        p_company_id: companyId,
        p_portal_name: errorRecord.portal_name,
        p_portal_lead_id: String((errorRecord.lead_data as Record<string, unknown>).id || Date.now()),
        p_name: String((errorRecord.lead_data as Record<string, unknown>).name || 'Unknown'),
        p_phone: String((errorRecord.lead_data as Record<string, unknown>).phone || ''),
        p_email: String((errorRecord.lead_data as Record<string, unknown>).email || ''),
        p_message: String((errorRecord.lead_data as Record<string, unknown>).message || ''),
        p_listing_ref: null,
        p_raw_data: JSON.parse(JSON.stringify(errorRecord.lead_data)),
      });

      if (error) throw error;

      const resultData = result as Record<string, unknown> | null;
      if (resultData?.success) {
        await resolveError(errorId);
        await fetchLeads();
        toast.success('Lead imported successfully');
        return { success: true };
      } else {
        throw new Error(String(resultData?.error || 'Retry failed'));
      }
    } catch (error) {
      console.error('Error retrying import:', error);
      toast.error('Failed to retry import');
      return { success: false, error };
    }
  };

  // Fetch leads from portal API
  const syncFromPortal = async (portalName: string, sourceId: string, options?: {
    date_from?: string;
    date_to?: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-leads-fetch`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            portal_name: portalName,
            company_id: companyId,
            source_id: sourceId,
            date_from: options?.date_from,
            date_to: options?.date_to,
            action: 'fetch',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      await fetchLeads();
      await fetchStats();
      
      toast.success(`Imported ${data.imported} leads (${data.duplicates} duplicates, ${data.errors} errors)`);
      return { success: true, ...data };
    } catch (error) {
      console.error('Error syncing from portal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync leads');
      return { success: false, error };
    }
  };

  // Get webhook URL for a portal
  const getWebhookUrl = (portalName: string) => {
    const portalKey = portalName.toLowerCase().replace(' ', '-');
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-webhook?portal=${portalKey}&company_id=${companyId}`;
  };

  // Initial fetch when company ID is available
  useEffect(() => {
    if (companyId) {
      fetchLeads();
      fetchErrors();
      fetchStats();
    }
  }, [companyId, fetchLeads, fetchErrors, fetchStats]);

  // Set up realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('portal_leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portal_leads',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads(prev => [payload.new as PortalLead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(l => 
              l.id === (payload.new as PortalLead).id ? payload.new as PortalLead : l
            ));
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== (payload.old as PortalLead).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return {
    leads,
    errors,
    stats,
    isLoading,
    companyId,
    fetchLeads,
    fetchErrors,
    fetchStats,
    assignLead,
    updateStage,
    updateGroup,
    resolveError,
    retryImport,
    syncFromPortal,
    getWebhookUrl,
  };
}
