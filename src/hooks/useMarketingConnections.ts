import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoCompany } from '@/hooks/useAutoCompany';
import { toast } from 'sonner';

export type ChannelType = 'whatsapp' | 'email' | 'sms';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';
export type HealthStatus = 'healthy' | 'degraded' | 'failed' | 'unknown';

export interface MarketingConnection {
  id: string;
  company_id: string | null;
  channel: ChannelType;
  provider: string;
  display_name: string;
  identifier: string;
  status: ConnectionStatus;
  credentials: Record<string, string>;
  verified: boolean;
  last_sync: string | null;
  last_health_check: string | null;
  health_status: HealthStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ConnectionInput {
  channel: ChannelType;
  provider: string;
  displayName: string;
  identifier: string;
  credentials: Record<string, string>;
  verified?: boolean;
}

export function useMarketingConnections() {
  const { user } = useAuth();
  const { companyId, isLoading: companyLoading } = useAutoCompany();
  const [connections, setConnections] = useState<MarketingConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all connections for the user's company
  const fetchConnections = useCallback(async () => {
    if (!user || !companyId || companyLoading) {
      if (!companyLoading) {
        setConnections([]);
        setIsLoading(false);
      }
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('marketing_connections')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      const mapped: MarketingConnection[] = (data || []).map(row => ({
        ...row,
        channel: row.channel as ChannelType,
        status: row.status as ConnectionStatus,
        health_status: row.health_status as HealthStatus,
        credentials: (row.credentials || {}) as Record<string, string>,
      }));
      
      setConnections(mapped);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching connections:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, companyId, companyLoading]);

  // Add a new connection
  const addConnection = useCallback(async (input: ConnectionInput): Promise<MarketingConnection | null> => {
    if (!user || !companyId) {
      toast.error('Please log in to add connections');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('marketing_connections')
        .insert({
          company_id: companyId,
          channel: input.channel,
          provider: input.provider,
          display_name: input.displayName,
          identifier: input.identifier,
          credentials: input.credentials,
          verified: input.verified || false,
          status: 'connected',
          last_sync: new Date().toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      const mapped: MarketingConnection = {
        ...data,
        channel: data.channel as ChannelType,
        status: data.status as ConnectionStatus,
        health_status: data.health_status as HealthStatus,
        credentials: (data.credentials || {}) as Record<string, string>,
      };
      
      setConnections(prev => [mapped, ...prev]);
      return mapped;
    } catch (err: any) {
      console.error('Error adding connection:', err);
      toast.error('Failed to add connection');
      return null;
    }
  }, [user, companyId]);

  // Update a connection
  const updateConnection = useCallback(async (
    id: string, 
    updates: Partial<Pick<MarketingConnection, 'display_name' | 'identifier' | 'status' | 'credentials' | 'verified' | 'last_sync' | 'health_status' | 'last_health_check'>>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('marketing_connections')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      
      setConnections(prev => 
        prev.map(conn => conn.id === id ? { ...conn, ...updates } : conn)
      );
      return true;
    } catch (err: any) {
      console.error('Error updating connection:', err);
      toast.error('Failed to update connection');
      return false;
    }
  }, []);

  // Remove a connection
  const removeConnection = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('marketing_connections')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setConnections(prev => prev.filter(conn => conn.id !== id));
      toast.success('Connection removed');
      return true;
    } catch (err: any) {
      console.error('Error removing connection:', err);
      toast.error('Failed to remove connection');
      return false;
    }
  }, []);

  // Test a connection
  const testConnection = useCallback(async (id: string): Promise<boolean> => {
    const connection = connections.find(c => c.id === id);
    if (!connection) return false;

    // Simulate API test (in production, this would call the actual provider API)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const hasCredentials = Object.keys(connection.credentials).length > 0;
    const success = !!(hasCredentials && connection.identifier);
    
    await updateConnection(id, {
      status: success ? 'connected' : 'error',
      health_status: success ? 'healthy' : 'failed',
      last_health_check: new Date().toISOString(),
      last_sync: success ? new Date().toISOString() : connection.last_sync,
    });

    return success;
  }, [connections, updateConnection]);

  // Get connections by channel
  const getConnectionsByChannel = useCallback((channel: ChannelType) => {
    return connections.filter(c => c.channel === channel);
  }, [connections]);

  // Run health check on all connections
  const runHealthCheck = useCallback(async () => {
    const updates = connections.map(async (conn) => {
      const hasCredentials = Object.keys(conn.credentials).length > 0;
      const isHealthy = hasCredentials && conn.status === 'connected';
      
      return updateConnection(conn.id, {
        health_status: isHealthy ? 'healthy' : conn.status === 'error' ? 'failed' : 'degraded',
        last_health_check: new Date().toISOString(),
      });
    });

    await Promise.all(updates);
  }, [connections, updateConnection]);

  // Initial fetch
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Set up realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('marketing_connections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketing_connections',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConnections(prev => [payload.new as MarketingConnection, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConnections(prev => 
              prev.map(conn => conn.id === payload.new.id ? payload.new as MarketingConnection : conn)
            );
          } else if (payload.eventType === 'DELETE') {
            setConnections(prev => prev.filter(conn => conn.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return {
    connections,
    isLoading,
    error,
    addConnection,
    updateConnection,
    removeConnection,
    testConnection,
    getConnectionsByChannel,
    runHealthCheck,
    refetch: fetchConnections,
  };
}
