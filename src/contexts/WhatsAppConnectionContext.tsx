import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WhatsAppConnection {
  id: string;
  phoneNumber: string;
  displayName: string;
  provider: 'meta' | 'twilio' | '360dialog' | 'vonage';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  apiKey?: string;
  token?: string;
}

interface WhatsAppConnectionContextType {
  connections: WhatsAppConnection[];
  activeConnection: WhatsAppConnection | null;
  isLoading: boolean;
  addConnection: (connection: Omit<WhatsAppConnection, 'id'>) => void;
  updateConnection: (id: string, updates: Partial<WhatsAppConnection>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string) => void;
  testConnection: (id: string) => Promise<boolean>;
}

const WhatsAppConnectionContext = createContext<WhatsAppConnectionContextType | undefined>(undefined);

export function WhatsAppConnectionProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
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
        .eq('channel', 'whatsapp')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: WhatsAppConnection[] = (data || []).map(row => ({
        id: row.id,
        phoneNumber: row.identifier,
        displayName: row.display_name,
        provider: row.provider as WhatsAppConnection['provider'],
        status: row.status as WhatsAppConnection['status'],
        lastSync: row.last_sync ? new Date(row.last_sync) : undefined,
        apiKey: (row.credentials as Record<string, string>)?.apiKey || (row.credentials as Record<string, string>)?.accessToken,
        token: (row.credentials as Record<string, string>)?.businessId,
      }));

      setConnections(mapped);
      if (mapped.length > 0 && !activeConnectionId) {
        setActiveConnectionId(mapped[0].id);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp connections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile?.company_id, activeConnectionId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const addConnection = useCallback(async (connection: Omit<WhatsAppConnection, 'id'>) => {
    if (!user || !profile?.company_id) {
      toast.error('Please log in to add connections');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('marketing_connections')
        .insert({
          company_id: profile.company_id,
          channel: 'whatsapp',
          provider: connection.provider,
          display_name: connection.displayName,
          identifier: connection.phoneNumber,
          credentials: { apiKey: connection.apiKey, businessId: connection.token },
          status: connection.status,
          last_sync: connection.lastSync?.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newConnection: WhatsAppConnection = {
        id: data.id,
        phoneNumber: data.identifier,
        displayName: data.display_name,
        provider: data.provider as WhatsAppConnection['provider'],
        status: data.status as WhatsAppConnection['status'],
        lastSync: data.last_sync ? new Date(data.last_sync) : undefined,
        apiKey: connection.apiKey,
        token: connection.token,
      };

      setConnections(prev => [newConnection, ...prev]);
      toast.success('WhatsApp connection added');
    } catch (err) {
      console.error('Error adding WhatsApp connection:', err);
      toast.error('Failed to add connection');
    }
  }, [user, profile?.company_id]);

  const updateConnection = useCallback(async (id: string, updates: Partial<WhatsAppConnection>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.displayName) dbUpdates.display_name = updates.displayName;
      if (updates.phoneNumber) dbUpdates.identifier = updates.phoneNumber;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.lastSync) dbUpdates.last_sync = updates.lastSync.toISOString();

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
      toast.success('Connection removed');
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
      const success = connection.apiKey && connection.phoneNumber;
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
    <WhatsAppConnectionContext.Provider value={{
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
    </WhatsAppConnectionContext.Provider>
  );
}

export function useWhatsAppConnection() {
  const context = useContext(WhatsAppConnectionContext);
  if (context === undefined) {
    throw new Error('useWhatsAppConnection must be used within a WhatsAppConnectionProvider');
  }
  return context;
}
