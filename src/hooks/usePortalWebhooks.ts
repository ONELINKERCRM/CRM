import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PortalWebhook {
  id: string;
  company_id: string;
  portal: string;
  webhook_url: string;
  secret_token?: string;
  status: "active" | "disabled" | "error";
  last_verified_at?: string;
  verification_error?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PortalWebhookEvent {
  id: string;
  company_id: string;
  portal: string;
  event_type: string;
  portal_listing_id?: string;
  portal_lead_id?: string;
  portal_agent_id?: string;
  payload: Record<string, unknown>;
  signature?: string;
  ip_address?: string;
  received_at: string;
  processed: boolean;
  processed_at?: string;
  processing_error?: string;
  retry_count: number;
  created_lead_id?: string;
  created_at: string;
}

export interface PortalWebhookLog {
  id: string;
  webhook_event_id?: string;
  company_id: string;
  portal: string;
  action: string;
  success: boolean;
  error_message?: string;
  error_code?: string;
  processing_time_ms?: number;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface WebhookStats {
  total_events: number;
  processed: number;
  pending: number;
  failed: number;
  leads_created: number;
  listing_updates: number;
}

export function usePortalWebhooks(portal?: string) {
  const [webhooks, setWebhooks] = useState<PortalWebhook[]>([]);
  const [events, setEvents] = useState<PortalWebhookEvent[]>([]);
  const [logs, setLogs] = useState<PortalWebhookLog[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();
  const fetchEventsRef = useRef<(() => Promise<void>) | null>(null);
  const fetchStatsRef = useRef<(() => Promise<void>) | null>(null);
  const fetchLogsRef = useRef<(() => Promise<void>) | null>(null);

  // Get company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agent } = await supabase
        .from("agents")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (agent) {
        setCompanyId(agent.company_id);
      }
    };
    fetchCompanyId();
  }, []);

  // Fetch webhooks configuration
  const fetchWebhooks = useCallback(async () => {
    if (!companyId) return;

    const query = supabase
      .from("portal_webhooks")
      .select("*")
      .eq("company_id", companyId);

    if (portal) {
      query.eq("portal", portal);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching webhooks:", error);
    } else {
      setWebhooks(data as PortalWebhook[]);
    }
  }, [companyId, portal]);

  // Fetch webhook events
  const fetchEvents = useCallback(async (limit = 50) => {
    if (!companyId) return;

    const query = supabase
      .from("portal_webhook_events")
      .select("*")
      .eq("company_id", companyId);

    if (portal) {
      query.eq("portal", portal);
    }

    const { data, error } = await query
      .order("received_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching webhook events:", error);
    } else {
      setEvents(data as PortalWebhookEvent[]);
    }
  }, [companyId, portal]);

  // Fetch webhook logs
  const fetchLogs = useCallback(async (limit = 100) => {
    if (!companyId) return;

    const query = supabase
      .from("portal_webhook_logs")
      .select("*")
      .eq("company_id", companyId);

    if (portal) {
      query.eq("portal", portal);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching webhook logs:", error);
    } else {
      setLogs(data as PortalWebhookLog[]);
    }
  }, [companyId, portal]);

  // Fetch stats
  const fetchStats = useCallback(async (days = 7) => {
    if (!companyId) return;

    const { data, error } = await supabase.rpc("get_webhook_stats", {
      p_company_id: companyId,
      p_portal: portal || null,
      p_days: days,
    });

    if (error) {
      console.error("Error fetching webhook stats:", error);
    } else if (data && typeof data === "object") {
      setStats(data as unknown as WebhookStats);
    }
  }, [companyId, portal]);

  // Generate webhook URL
  const generateWebhookUrl = useCallback(async (portalName: string): Promise<string | null> => {
    if (!companyId) return null;

    const { data, error } = await supabase.rpc("generate_webhook_url", {
      p_company_id: companyId,
      p_portal: portalName,
    });

    if (error) {
      console.error("Error generating webhook URL:", error);
      return null;
    }

    return data as string;
  }, [companyId]);

  // Create/update webhook configuration
  const upsertWebhook = useCallback(async (
    portalName: string,
    secretToken?: string
  ): Promise<PortalWebhook | null> => {
    if (!companyId) return null;

    const webhookUrl = await generateWebhookUrl(portalName);
    if (!webhookUrl) return null;

    const { data, error } = await supabase
      .from("portal_webhooks")
      .upsert({
        company_id: companyId,
        portal: portalName,
        webhook_url: webhookUrl,
        secret_token: secretToken,
        status: "active",
      }, {
        onConflict: "company_id,portal",
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting webhook:", error);
      toast({
        title: "Error",
        description: "Failed to configure webhook",
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Webhook configured",
      description: `Webhook URL for ${portalName} is ready`,
    });

    await fetchWebhooks();
    return data as PortalWebhook;
  }, [companyId, generateWebhookUrl, fetchWebhooks, toast]);

  // Disable webhook
  const disableWebhook = useCallback(async (webhookId: string) => {
    const { error } = await supabase
      .from("portal_webhooks")
      .update({ status: "disabled" })
      .eq("id", webhookId);

    if (error) {
      console.error("Error disabling webhook:", error);
      toast({
        title: "Error",
        description: "Failed to disable webhook",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Webhook disabled",
      description: "The webhook has been disabled",
    });

    await fetchWebhooks();
    return true;
  }, [fetchWebhooks, toast]);

  // Retry failed event
  const retryEvent = useCallback(async (eventId: string) => {
    const { data, error } = await supabase.rpc("process_portal_webhook_event", {
      p_event_id: eventId,
    });

    if (error) {
      console.error("Error retrying event:", error);
      toast({
        title: "Retry failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Event reprocessed",
      description: "The webhook event has been reprocessed",
    });

    await fetchEvents();
    return data;
  }, [fetchEvents, toast]);

  // Keep refs updated
  useEffect(() => {
    fetchEventsRef.current = fetchEvents;
  }, [fetchEvents]);

  useEffect(() => {
    fetchStatsRef.current = fetchStats;
  }, [fetchStats]);

  useEffect(() => {
    fetchLogsRef.current = fetchLogs;
  }, [fetchLogs]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchWebhooks(),
        fetchEvents(),
        fetchLogs(),
        fetchStats(),
      ]);
      setIsLoading(false);
    };

    loadData();

    // Subscribe to realtime updates
    const eventsChannel = supabase
      .channel("portal_webhook_events_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portal_webhook_events",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          if (fetchEventsRef.current) fetchEventsRef.current();
          if (fetchStatsRef.current) fetchStatsRef.current();
        }
      )
      .subscribe();

    const logsChannel = supabase
      .channel("portal_webhook_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "portal_webhook_logs",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          if (fetchLogsRef.current) fetchLogsRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [companyId, fetchWebhooks]); // Removed fetch functions - using ref pattern

  return {
    webhooks,
    events,
    logs,
    stats,
    isLoading,
    companyId,
    fetchWebhooks,
    fetchEvents,
    fetchLogs,
    fetchStats,
    generateWebhookUrl,
    upsertWebhook,
    disableWebhook,
    retryEvent,
  };
}
