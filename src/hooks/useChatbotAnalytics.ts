import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BotStats {
  totalConversations: number;
  activeNow: number;
  leadsQualified: number;
  handoversToday: number;
  avgResponseTime: string;
  satisfactionRate: number;
}

export interface RecentActivity {
  id: string;
  type: 'message' | 'qualification' | 'handover' | 'error';
  content: string;
  timestamp: Date;
}

interface UseChatbotAnalyticsResult {
  stats: BotStats;
  activities: RecentActivity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChatbotAnalytics(chatbotId?: string): UseChatbotAnalyticsResult {
  const [stats, setStats] = useState<BotStats>({
    totalConversations: 0,
    activeNow: 0,
    leadsQualified: 0,
    handoversToday: 0,
    avgResponseTime: "0s",
    satisfactionRate: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      // Get today's date for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build query for chatbot analytics
      let analyticsQuery = supabase
        .from("chatbot_analytics")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("date", { ascending: false })
        .limit(30);

      if (chatbotId) {
        analyticsQuery = analyticsQuery.eq("chatbot_id", chatbotId);
      }

      const { data: analyticsData } = await analyticsQuery;

      // Calculate aggregated stats
      const totalStats = (analyticsData || []).reduce((acc, day) => {
        acc.totalConversations += day.unique_leads || 0;
        acc.leadsQualified += day.new_leads_created || 0;
        acc.messagesSent += day.messages_sent || 0;
        acc.messagesReceived += day.messages_received || 0;
        acc.avgResponseTime += day.avg_response_time_ms || 0;
        return acc;
      }, { totalConversations: 0, leadsQualified: 0, messagesSent: 0, messagesReceived: 0, avgResponseTime: 0 });

      // Get active sessions count
      const { count: activeSessions } = await supabase
        .from("chatbot_sessions")
        .select("*", { count: "exact", head: true })
        .eq("company_id", profile.company_id)
        .gte("last_message_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

      // Calculate average response time
      const avgMs = analyticsData?.length ? totalStats.avgResponseTime / analyticsData.length : 0;
      const avgResponseTime = avgMs < 1000 ? `${Math.round(avgMs)}ms` : `${(avgMs / 1000).toFixed(1)}s`;

      setStats({
        totalConversations: totalStats.totalConversations,
        activeNow: activeSessions || 0,
        leadsQualified: totalStats.leadsQualified,
        handoversToday: 0, // Would need to track handover events
        avgResponseTime,
        satisfactionRate: 0, // Would need satisfaction feedback system
      });

      // Fetch recent interactions for activity feed
      let interactionsQuery = supabase
        .from("chatbot_interactions")
        .select("id, direction, message_content, message_type, created_at, status, lead_id")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (chatbotId) {
        interactionsQuery = interactionsQuery.eq("chatbot_id", chatbotId);
      }

      const { data: interactions } = await interactionsQuery;

      const recentActivities: RecentActivity[] = (interactions || []).map((interaction: any) => {
        let type: RecentActivity['type'] = 'message';
        let content = '';

        if (interaction.status === 'error') {
          type = 'error';
          content = 'Error sending message';
        } else if (interaction.direction === 'inbound') {
          type = 'message';
          content = `New message received: "${(interaction.message_content || '').substring(0, 50)}..."`;
        } else {
          type = 'message';
          content = `Bot responded: "${(interaction.message_content || '').substring(0, 50)}..."`;
        }

        return {
          id: interaction.id,
          type,
          content,
          timestamp: new Date(interaction.created_at),
        };
      });

      setActivities(recentActivities);
    } catch (err) {
      console.error("Failed to fetch chatbot analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [chatbotId]);

  return {
    stats,
    activities,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}
