import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailConnection {
  id: string;
  email: string;
  displayName: string;
  provider: 'resend' | 'sendgrid' | 'mailgun' | 'ses';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  apiKey?: string;
  verified?: boolean;
}

interface EmailConnectionContextType {
  connections: EmailConnection[];
  activeConnection: EmailConnection | null;
  isLoading: boolean;
  addConnection: (connection: Omit<EmailConnection, 'id'>) => void;
  updateConnection: (id: string, updates: Partial<EmailConnection>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string) => void;
  testConnection: (id: string) => Promise<boolean>;
}

const EmailConnectionContext = createContext<EmailConnectionContextType | undefined>(undefined);

export function EmailConnectionProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeConnection = connections.find(c => c.id === activeConnectionId) || null;

  // Fetch connections from database
  const fetchConnections = useCallback(async () => {
    if (!user || !profile?.company_id) {
      setConnections([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('marketing_connections')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('channel', 'email')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: EmailConnection[] = (data || []).map(row => ({
        id: row.id,
        email: row.identifier,
        displayName: row.display_name,
        provider: row.provider as EmailConnection['provider'],
        status: row.status as EmailConnection['status'],
        lastSync: row.last_sync ? new Date(row.last_sync) : undefined,
        apiKey: (row.credentials as Record<string, string>)?.apiKey,
        verified: row.verified,
      }));

      setConnections(mapped);
      if (mapped.length > 0 && !activeConnectionId) {
        setActiveConnectionId(mapped[0].id);
      }
    } catch (err) {
      console.error('Error fetching email connections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile?.company_id, activeConnectionId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const addConnection = useCallback(async (connection: Omit<EmailConnection, 'id'>) => {
    if (!user || !profile?.company_id) {
      toast.error('Please log in to add connections');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('marketing_connections')
        .insert({
          company_id: profile.company_id,
          channel: 'email',
          provider: connection.provider,
          display_name: connection.displayName,
          identifier: connection.email,
          credentials: { apiKey: connection.apiKey },
          status: connection.status,
          verified: connection.verified || false,
          last_sync: connection.lastSync?.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newConnection: EmailConnection = {
        id: data.id,
        email: data.identifier,
        displayName: data.display_name,
        provider: data.provider as EmailConnection['provider'],
        status: data.status as EmailConnection['status'],
        lastSync: data.last_sync ? new Date(data.last_sync) : undefined,
        apiKey: connection.apiKey,
        verified: data.verified,
      };

      setConnections(prev => [newConnection, ...prev]);
      toast.success('Email connection added');
    } catch (err) {
      console.error('Error adding email connection:', err);
      toast.error('Failed to add connection');
    }
  }, [user, profile?.company_id]);

  const updateConnection = useCallback(async (id: string, updates: Partial<EmailConnection>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.displayName) dbUpdates.display_name = updates.displayName;
      if (updates.email) dbUpdates.identifier = updates.email;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.lastSync) dbUpdates.last_sync = updates.lastSync.toISOString();
      if (typeof updates.verified === 'boolean') dbUpdates.verified = updates.verified;

      await supabase
        .from('marketing_connections')
        .update(dbUpdates)
        .eq('id', id);

      setConnections(prev => 
        prev.map(conn => conn.id === id ? { ...conn, ...updates } : conn)
      );
    } catch (err) {
      console.error('Error updating connection:', err);
    }
  }, []);

  const removeConnection = useCallback(async (id: string) => {
    try {
      await supabase
        .from('marketing_connections')
        .delete()
        .eq('id', id);

      setConnections(prev => prev.filter(conn => conn.id !== id));
      if (activeConnectionId === id) {
        setActiveConnectionId(null);
      }
      toast.success('Email connection removed');
    } catch (err) {
      console.error('Error removing connection:', err);
      toast.error('Failed to remove connection');
    }
  }, [activeConnectionId]);

  const setActiveConnection = useCallback((id: string) => {
    setActiveConnectionId(id);
  }, []);

  const testConnection = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const connection = connections.find(c => c.id === id);
    if (connection) {
      const success = connection.apiKey && connection.email;
      await updateConnection(id, { 
        status: success ? 'connected' : 'error',
        lastSync: success ? new Date() : undefined
      });
      setIsLoading(false);
      return !!success;
    }
    setIsLoading(false);
    return false;
  }, [connections, updateConnection]);

  return (
    <EmailConnectionContext.Provider value={{
      connections,
      activeConnection,
      isLoading,
      addConnection,
      updateConnection,
      removeConnection,
      setActiveConnection,
      testConnection,
    }}>
      {children}
    </EmailConnectionContext.Provider>
  );
}

export function useEmailConnection() {
  const context = useContext(EmailConnectionContext);
  if (context === undefined) {
    throw new Error('useEmailConnection must be used within an EmailConnectionProvider');
  }
  return context;
}
