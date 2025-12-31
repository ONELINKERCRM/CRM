import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoCompany } from '@/hooks/useAutoCompany';
import { toast } from 'sonner';

export interface LeadSource {
  id: string;
  company_id: string;
  source_name: string;
  display_name: string;
  connection_type: string;
  connection_details: Record<string, any>;
  field_mapping: Record<string, any>;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  is_active: boolean;
  last_fetched_at: string | null;
  last_error: string | null;
  total_leads_fetched: number;
  created_at: string;
  updated_at: string;
}

export interface LeadSourceLog {
  id: string;
  source_id: string | null;
  company_id: string;
  action: string;
  status: string;
  leads_processed: number;
  leads_created: number;
  leads_updated: number;
  leads_skipped: number;
  error_message: string | null;
  created_at: string;
}

export interface LeadWebhook {
  id: string;
  source_id: string;
  company_id: string;
  webhook_url: string;
  secret_key: string;
  verify_token: string;
  is_active: boolean;
  last_received_at: string | null;
  total_received: number;
}

const SOURCE_CONFIGS = [
  { name: 'meta', display_name: 'Meta (Facebook / Instagram)', connection_type: 'oauth' },
  { name: 'tiktok', display_name: 'TikTok', connection_type: 'oauth' },
  { name: 'linkedin', display_name: 'LinkedIn', connection_type: 'oauth' },
  { name: 'website', display_name: 'Website', connection_type: 'webhook' },
  { name: 'property_finder', display_name: 'Property Finder', connection_type: 'api' },
  { name: 'bayut', display_name: 'Bayut', connection_type: 'api' },
  { name: 'dubizzle', display_name: 'Dubizzle', connection_type: 'api' },
  { name: 'google_sheets', display_name: 'Google Sheets', connection_type: 'oauth' },
];

export function useLeadSources() {
  const { user } = useAuth();
  const { companyId, isLoading: companyLoading, error: companyError } = useAutoCompany();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [logs, setLogs] = useState<LeadSourceLog[]>([]);
  const [webhooks, setWebhooks] = useState<LeadWebhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchSourcesRef = useRef<(() => Promise<void>) | null>(null);
  const fetchLogsRef = useRef<((sourceId?: string) => Promise<void>) | null>(null);

  // Sync loading and error state from useAutoCompany
  useEffect(() => {
    if (companyError) {
      setError(companyError);
      setIsLoading(false);
    }
  }, [companyError]);

  // Fetch sources with error handling
  const fetchSources = useCallback(async () => {
    if (!companyId) {

      return;
    }


    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('[useLeadSources] Error fetching lead_sources:', fetchError);
        throw fetchError;
      }


      setSources((data || []) as LeadSource[]);
    } catch (err: any) {
      console.error('[useLeadSources] fetchSources error:', err);
      setError('Failed to load lead sources');
      toast.error('Failed to load lead sources');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Fetch logs
  const fetchLogs = useCallback(async (sourceId?: string) => {
    if (!companyId) return;

    try {
      let query = supabase
        .from('lead_source_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (sourceId) {
        query = query.eq('source_id', sourceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as LeadSourceLog[]);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
    }
  }, [companyId]);

  // Fetch webhooks
  const fetchWebhooks = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('lead_webhooks')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      setWebhooks((data || []) as LeadWebhook[]);
    } catch (error: any) {
      console.error('Error fetching webhooks:', error);
    }
  }, [companyId]);

  // Keep refs updated
  useEffect(() => {
    fetchSourcesRef.current = fetchSources;
  }, [fetchSources]);

  useEffect(() => {
    fetchLogsRef.current = fetchLogs;
  }, [fetchLogs]);

  // Initialize sources for company
  const initializeSources = useCallback(async () => {
    if (!companyId) return;

    try {
      const existingSources = sources.map(s => s.source_name);
      const missingSources = SOURCE_CONFIGS.filter(c => !existingSources.includes(c.name));

      if (missingSources.length > 0) {
        const { error } = await supabase
          .from('lead_sources')
          .insert(
            missingSources.map(config => ({
              company_id: companyId,
              source_name: config.name,
              display_name: config.display_name,
              connection_type: config.connection_type,
              status: 'disconnected',
              created_by: user?.id
            }))
          );

        if (error) throw error;
        await fetchSources();
      }
    } catch (error: any) {
      console.error('Error initializing sources:', error);
    }
  }, [companyId, sources, user?.id, fetchSources]);

  // Connect source
  const connectSource = useCallback(async (
    sourceId: string,
    connectionDetails: Record<string, any>,
    fieldMapping?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase
        .from('lead_sources')
        .update({
          connection_details: connectionDetails,
          field_mapping: fieldMapping || {},
          status: 'pending'
        })
        .eq('id', sourceId);

      if (error) throw error;

      // Test connection
      const testResult = await testConnection(sourceId);

      if (testResult.success) {
        toast.success('Source connected successfully');
      } else {
        toast.error(testResult.error || 'Connection failed');
      }

      await fetchSources();
      return testResult;
    } catch (error: any) {
      toast.error('Failed to connect source');
      return { success: false, error: error.message };
    }
  }, [fetchSources]);

  // Disconnect source
  const disconnectSource = useCallback(async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('lead_sources')
        .update({
          connection_details: {},
          status: 'disconnected',
          last_error: null
        })
        .eq('id', sourceId);

      if (error) throw error;
      toast.success('Source disconnected');
      await fetchSources();
    } catch (error: any) {
      toast.error('Failed to disconnect source');
    }
  }, [fetchSources]);

  // Test connection
  const testConnection = useCallback(async (sourceId: string) => {
    if (!companyId) return { success: false, error: 'No company' };

    try {
      const { data, error } = await supabase.functions.invoke('lead-source-fetch', {
        body: { source_id: sourceId, company_id: companyId, action: 'test' }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [companyId]);

  // Get Meta forms from connected pages
  const getMetaForms = useCallback(async (sourceId: string) => {
    if (!companyId) return [];

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${supabaseUrl}/functions/v1/meta-oauth?action=get_forms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ source_id: sourceId, company_id: companyId })
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch forms');

      return data.forms || [];
    } catch (error: any) {
      console.error('Error fetching Meta forms:', error);
      return [];
    }
  }, [companyId]);

  // Get TikTok forms
  const getTikTokForms = useCallback(async () => {
    if (!companyId) return [];

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${supabaseUrl}/functions/v1/tiktok-integration?action=get_forms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ company_id: companyId })
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch forms');

      return data.forms || [];
    } catch (error: any) {
      console.error('Error fetching TikTok forms:', error);
      return [];
    }
  }, [companyId]);

  // Fetch leads manually with optional filters
  const fetchLeads = useCallback(async (
    sourceId: string,
    options?: { form_ids?: string[]; date_from?: string; date_to?: string }
  ) => {
    if (!companyId) return { success: false, error: 'No company' };

    try {
      toast.loading('Fetching leads...', { id: 'fetch-leads' });

      // Find the source to check its type
      const source = sources.find(s => s.id === sourceId);
      let data;

      if (source?.source_name === 'meta') {
        // Use Meta OAuth edge function for fetching - action must be in query params
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(
          `${supabaseUrl}/functions/v1/meta-oauth?action=fetch_leads`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({
              source_id: sourceId,
              company_id: companyId,
              form_ids: options?.form_ids,
              date_from: options?.date_from,
              date_to: options?.date_to
            })
          }
        );

        data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      } else if (source?.source_name === 'tiktok') {
        // Use TikTok integration edge function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(
          `${supabaseUrl}/functions/v1/tiktok-integration?action=fetch_leads`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({
              form_ids: options?.form_ids,
              date_from: options?.date_from,
              date_to: options?.date_to
            })
          }
        );

        data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      } else {
        // Use generic lead-source-fetch for other sources
        const response = await supabase.functions.invoke('lead-source-fetch', {
          body: { source_id: sourceId, company_id: companyId, action: 'fetch' }
        });

        if (response.error) throw response.error;
        data = response.data;
      }

      toast.dismiss('fetch-leads');
      if (data.success) {
        toast.success(`Fetched ${data.created || 0} new leads`);
      } else {
        toast.error(data.error || 'Fetch failed');
      }

      await fetchSources();
      await fetchLogs(sourceId);
      return data;
    } catch (error: any) {
      toast.dismiss('fetch-leads');
      toast.error('Failed to fetch leads');
      return { success: false, error: error.message };
    }
  }, [companyId, sources, fetchSources, fetchLogs]);

  // Get webhook URL for source
  const getWebhookUrl = useCallback((sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source || !companyId) return '';

    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const webhook = webhooks.find(w => w.source_id === sourceId);
    const verifyToken = webhook?.verify_token || '';

    return `${baseUrl}/functions/v1/lead-source-webhook?source=${source.source_name}&company_id=${companyId}&verify_token=${verifyToken}`;
  }, [sources, webhooks, companyId]);

  // Create webhook for source
  const createWebhook = useCallback(async (sourceId: string) => {
    if (!companyId) return null;

    try {
      const source = sources.find(s => s.id === sourceId);
      if (!source) return null;

      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lead-source-webhook?source=${source.source_name}&company_id=${companyId}`;

      const { data, error } = await supabase
        .from('lead_webhooks')
        .insert({
          source_id: sourceId,
          company_id: companyId,
          webhook_url: webhookUrl,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      await fetchWebhooks();
      return data;
    } catch (error: any) {
      console.error('Error creating webhook:', error);
      return null;
    }
  }, [companyId, sources, fetchWebhooks]);

  // Update field mapping
  const updateFieldMapping = useCallback(async (sourceId: string, fieldMapping: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('lead_sources')
        .update({ field_mapping: fieldMapping })
        .eq('id', sourceId);

      if (error) throw error;
      toast.success('Field mapping updated');
      await fetchSources();
    } catch (error: any) {
      toast.error('Failed to update field mapping');
    }
  }, [fetchSources]);

  // Mark website source as connected
  const markWebsiteConnected = useCallback(async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('lead_sources')
        .update({
          status: 'connected',
          connection_details: { embed_installed: true, installed_at: new Date().toISOString() }
        })
        .eq('id', sourceId);

      if (error) throw error;
      await fetchSources();
    } catch (error: any) {
      console.error('Failed to mark website as connected:', error);
    }
  }, [fetchSources]);

  // Initialize on mount
  useEffect(() => {
    if (companyId) {
      fetchSources();
      fetchLogs();
      fetchWebhooks();
    }
  }, [companyId, fetchSources, fetchLogs, fetchWebhooks]);

  // Initialize sources after first fetch
  useEffect(() => {
    if (companyId && sources.length === 0 && !isLoading) {
      initializeSources();
    }
  }, [companyId, sources.length, isLoading, initializeSources]);

  // Real-time subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('lead-sources-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_sources', filter: `company_id=eq.${companyId}` },
        () => {
          if (fetchSourcesRef.current) fetchSourcesRef.current();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lead_source_logs', filter: `company_id=eq.${companyId}` },
        () => {
          if (fetchLogsRef.current) fetchLogsRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]); // Removed fetch functions - using ref pattern

  return {
    sources,
    logs,
    webhooks,
    isLoading: isLoading || companyLoading,
    companyId,
    error,
    connectSource,
    disconnectSource,
    testConnection,
    fetchLeads,
    getMetaForms,
    getTikTokForms,
    getWebhookUrl,
    createWebhook,
    updateFieldMapping,
    markWebsiteConnected,
    refetch: fetchSources,
    refetchLogs: fetchLogs,
    SOURCE_CONFIGS
  };
}
