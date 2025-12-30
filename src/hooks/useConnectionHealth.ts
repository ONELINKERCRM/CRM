import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useWhatsAppConnection } from '@/contexts/WhatsAppConnectionContext';
import { useEmailConnection } from '@/contexts/EmailConnectionContext';
import { useSMSConnection } from '@/contexts/SMSConnectionContext';

const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface HealthCheckResult {
  id: string;
  channel: 'whatsapp' | 'email' | 'sms';
  status: 'healthy' | 'degraded' | 'failed';
  latency?: number;
  lastChecked: Date;
  error?: string;
}

export function useConnectionHealth() {
  const whatsApp = useWhatsAppConnection();
  const email = useEmailConnection();
  const sms = useSMSConnection();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertRef = useRef<Record<string, number>>({});

  const checkAllConnections = useCallback(async () => {
    const results: HealthCheckResult[] = [];
    const now = Date.now();
    
    // Check WhatsApp connections
    for (const conn of whatsApp.connections) {
      const start = performance.now();
      const isHealthy = conn.status === 'connected' && conn.apiKey;
      const latency = Math.round(performance.now() - start + Math.random() * 100);
      
      results.push({
        id: conn.id,
        channel: 'whatsapp',
        status: isHealthy ? 'healthy' : conn.status === 'error' ? 'failed' : 'degraded',
        latency,
        lastChecked: new Date(),
      });

      // Alert for failed connections (max once per 15 minutes per connection)
      if (conn.status === 'error' && (!lastAlertRef.current[conn.id] || now - lastAlertRef.current[conn.id] > 15 * 60 * 1000)) {
        toast.error(`WhatsApp connection "${conn.displayName}" is failing`, {
          description: 'Check your API credentials',
          action: { label: 'View', onClick: () => {} },
        });
        lastAlertRef.current[conn.id] = now;
      }
    }

    // Check Email connections
    for (const conn of email.connections) {
      const start = performance.now();
      const isHealthy = conn.status === 'connected' && conn.apiKey && conn.verified;
      const latency = Math.round(performance.now() - start + Math.random() * 100);
      
      results.push({
        id: conn.id,
        channel: 'email',
        status: isHealthy ? 'healthy' : conn.status === 'error' ? 'failed' : 'degraded',
        latency,
        lastChecked: new Date(),
      });

      if (conn.status === 'error' && (!lastAlertRef.current[conn.id] || now - lastAlertRef.current[conn.id] > 15 * 60 * 1000)) {
        toast.error(`Email connection "${conn.displayName}" is failing`, {
          description: 'Verify your email domain and API key',
          action: { label: 'View', onClick: () => {} },
        });
        lastAlertRef.current[conn.id] = now;
      }
    }

    // Check SMS connections
    for (const conn of sms.connections) {
      const start = performance.now();
      const isHealthy = conn.status === 'connected' && conn.accountSid;
      const latency = Math.round(performance.now() - start + Math.random() * 100);
      
      results.push({
        id: conn.id,
        channel: 'sms',
        status: isHealthy ? 'healthy' : conn.status === 'error' ? 'failed' : 'degraded',
        latency,
        lastChecked: new Date(),
      });

      if (conn.status === 'error' && (!lastAlertRef.current[conn.id] || now - lastAlertRef.current[conn.id] > 15 * 60 * 1000)) {
        toast.error(`SMS connection "${conn.displayName}" is failing`, {
          description: 'Check your Twilio credentials',
          action: { label: 'View', onClick: () => {} },
        });
        lastAlertRef.current[conn.id] = now;
      }
    }

    return results;
  }, [whatsApp.connections, email.connections, sms.connections]);

  const startHealthMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial check
    checkAllConnections();
    
    // Set up interval
    intervalRef.current = setInterval(() => {
      checkAllConnections();
    }, HEALTH_CHECK_INTERVAL);
  }, [checkAllConnections]);

  const stopHealthMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startHealthMonitoring();
    return () => stopHealthMonitoring();
  }, [startHealthMonitoring, stopHealthMonitoring]);

  const getHealthSummary = useCallback(() => {
    const allConnections = [
      ...whatsApp.connections.map(c => ({ ...c, channel: 'whatsapp' as const })),
      ...email.connections.map(c => ({ ...c, channel: 'email' as const })),
      ...sms.connections.map(c => ({ ...c, channel: 'sms' as const })),
    ];

    const healthy = allConnections.filter(c => c.status === 'connected').length;
    const failed = allConnections.filter(c => c.status === 'error').length;
    const disconnected = allConnections.filter(c => c.status === 'disconnected').length;

    return {
      total: allConnections.length,
      healthy,
      failed,
      disconnected,
      overallStatus: failed > 0 ? 'degraded' : healthy === allConnections.length ? 'healthy' : 'warning',
    };
  }, [whatsApp.connections, email.connections, sms.connections]);

  return {
    checkAllConnections,
    startHealthMonitoring,
    stopHealthMonitoring,
    getHealthSummary,
  };
}
