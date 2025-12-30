import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AssignmentLog {
  id: string;
  leadName: string;
  leadEmail: string;
  source: string;
  assignedTo: string;
  assignedToAvatar: string;
  previousAgent: string | null;
  rule: string;
  method: "Campaign Rule" | "Round Robin" | "Manual" | "Advanced Logic" | "Auto-Reassign";
  status: "success" | "failed" | "pending" | "reassigned";
  timestamp: string;
  responseTime: string | null;
  notes: string;
}

interface UseAssignmentLogsResult {
  logs: AssignmentLog[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  stats: {
    total: number;
    success: number;
    failed: number;
    pending: number;
    reassigned: number;
  };
  sources: string[];
}

export function useAssignmentLogs(): UseAssignmentLogsResult {
  const [logs, setLogs] = useState<AssignmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLogs([]);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        setLogs([]);
        return;
      }

      // Fetch assignment logs with related data
      const { data: assignmentLogs, error: logsError } = await supabase
        .from("lead_assignment_logs")
        .select(`
          id,
          assignment_method,
          change_reason,
          created_at,
          can_undo,
          undone_at,
          lead:leads(id, name, email, source),
          from_agent:agents!lead_assignment_logs_from_agent_id_fkey(id, name, avatar_url),
          to_agent:agents!lead_assignment_logs_to_agent_id_fkey(id, name, avatar_url),
          rule:campaign_assignment_rules(name)
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsError) {
        console.error("Error fetching assignment logs:", logsError);
        throw logsError;
      }

      // Transform to AssignmentLog format
      const transformedLogs: AssignmentLog[] = (assignmentLogs || []).map((log: any) => {
        const leadData = log.lead || {};
        const toAgentData = log.to_agent || {};
        const fromAgentData = log.from_agent;
        const ruleData = log.rule;

        // Map assignment_method to display format
        let method: AssignmentLog["method"] = "Manual";
        switch (log.assignment_method) {
          case "campaign_rule":
            method = "Campaign Rule";
            break;
          case "round_robin":
            method = "Round Robin";
            break;
          case "manual":
            method = "Manual";
            break;
          case "advanced_logic":
            method = "Advanced Logic";
            break;
          case "auto_reassign":
            method = "Auto-Reassign";
            break;
        }

        // Determine status
        let status: AssignmentLog["status"] = "success";
        if (log.undone_at) {
          status = "reassigned";
        } else if (fromAgentData && toAgentData?.id !== fromAgentData?.id) {
          status = "reassigned";
        } else if (!toAgentData?.id) {
          status = "failed";
        }

        return {
          id: log.id,
          leadName: leadData.name || "Unknown Lead",
          leadEmail: leadData.email || "",
          source: leadData.source || "Unknown",
          assignedTo: toAgentData.name || "Unassigned",
          assignedToAvatar: toAgentData.avatar_url || "",
          previousAgent: fromAgentData?.name || null,
          rule: ruleData?.name || log.change_reason || "Direct Assignment",
          method,
          status,
          timestamp: log.created_at ? new Date(log.created_at).toLocaleString() : "",
          responseTime: null, // Would need to calculate from activity logs
          notes: log.change_reason || "",
        };
      });

      setLogs(transformedLogs);
    } catch (err) {
      console.error("Failed to fetch assignment logs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === "success").length,
    failed: logs.filter(l => l.status === "failed").length,
    pending: logs.filter(l => l.status === "pending").length,
    reassigned: logs.filter(l => l.status === "reassigned").length,
  };

  const sources = [...new Set(logs.map(l => l.source))];

  return {
    logs,
    isLoading,
    error,
    refetch: fetchLogs,
    stats,
    sources,
  };
}
