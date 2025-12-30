import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LeadPool {
  id: string;
  pool_name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  lead_count?: number;
}

export interface AgentLoad {
  id: string;
  agent_id: string;
  agent_name: string;
  current_leads_count: number;
  pending_followups_count: number;
  total_assignments_today: number;
  total_assignments_week: number;
  conversion_rate: number;
  max_leads_capacity: number;
  is_available: boolean;
  last_assignment_at: string | null;
}

export interface AssignmentNotification {
  id: string;
  lead_id: string;
  lead_name: string;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AutoReassignmentRule {
  id: string;
  name: string;
  days_without_contact: number;
  use_round_robin: boolean;
  is_active: boolean;
  apply_to_stages: string[];
}

export const useLeadPools = () => {
  const { profile } = useAuth();
  const [pools, setPools] = useState<LeadPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPools = useCallback(async () => {
    if (!profile?.company_id) return;
    
    const { data, error } = await supabase
      .from("lead_pools")
      .select(`
        *,
        lead_pool_members(count)
      `)
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pools:", error);
      return;
    }

    setPools(data?.map(p => ({
      ...p,
      lead_count: p.lead_pool_members?.[0]?.count || 0
    })) || []);
    setIsLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const createPool = async (name: string, description?: string, color?: string) => {
    if (!profile?.company_id) return null;

    const { data, error } = await supabase
      .from("lead_pools")
      .insert({
        company_id: profile.company_id,
        pool_name: name,
        description,
        color: color || "#3B82F6",
        created_by: profile.id
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create pool");
      return null;
    }

    toast.success("Pool created successfully");
    fetchPools();
    return data;
  };

  const deletePool = async (poolId: string) => {
    const { error } = await supabase
      .from("lead_pools")
      .delete()
      .eq("id", poolId);

    if (error) {
      toast.error("Failed to delete pool");
      return false;
    }

    toast.success("Pool deleted");
    fetchPools();
    return true;
  };

  const addLeadsToPool = async (poolId: string, leadIds: string[]) => {
    if (!profile?.id) return false;

    const insertData = leadIds.map(leadId => ({
      pool_id: poolId,
      lead_id: leadId,
      added_by: profile.id
    }));

    const { error } = await supabase
      .from("lead_pool_members")
      .upsert(insertData, { onConflict: "pool_id,lead_id" });

    if (error) {
      toast.error("Failed to add leads to pool");
      return false;
    }

    toast.success(`${leadIds.length} lead(s) added to pool`);
    fetchPools();
    return true;
  };

  return { pools, isLoading, fetchPools, createPool, deletePool, addLeadsToPool };
};

export const useAgentLoad = () => {
  const { profile } = useAuth();
  const [agentLoads, setAgentLoads] = useState<AgentLoad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgentLoads = useCallback(async () => {
    if (!profile?.company_id) return;

    // Fetch from get_assignment_analytics function
    const { data, error } = await supabase
      .rpc("get_assignment_analytics", { p_company_id: profile.company_id });

    if (error) {
      console.error("Error fetching agent loads:", error);
      // Fallback to direct query
      const { data: agents } = await supabase
        .from("agents")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .eq("status", "active");

      if (agents) {
        const { data: loads } = await supabase
          .from("agent_load")
          .select("*")
          .eq("company_id", profile.company_id);

        const combined = agents.map(agent => {
          const load = loads?.find(l => l.agent_id === agent.id);
          return {
            id: load?.id || agent.id,
            agent_id: agent.id,
            agent_name: agent.name,
            current_leads_count: load?.current_leads_count || 0,
            pending_followups_count: load?.pending_followups_count || 0,
            total_assignments_today: load?.total_assignments_today || 0,
            total_assignments_week: load?.total_assignments_week || 0,
            conversion_rate: load?.conversion_rate || 0,
            max_leads_capacity: load?.max_leads_capacity || 50,
            is_available: load?.is_available ?? true,
            last_assignment_at: load?.last_assignment_at || null
          };
        });
        setAgentLoads(combined);
      }
      setIsLoading(false);
      return;
    }

    setAgentLoads(data?.map((d: any) => ({
      id: d.agent_id,
      agent_id: d.agent_id,
      agent_name: d.agent_name,
      current_leads_count: d.active_leads || 0,
      pending_followups_count: d.pending_followups || 0,
      total_assignments_today: d.assignments_today || 0,
      total_assignments_week: d.assignments_week || 0,
      conversion_rate: d.conversion_rate || 0,
      max_leads_capacity: 50,
      is_available: d.is_available ?? true,
      last_assignment_at: null
    })) || []);
    setIsLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchAgentLoads();
  }, [fetchAgentLoads]);

  const updateAgentAvailability = async (agentId: string, isAvailable: boolean) => {
    if (!profile?.company_id) return false;

    const { error } = await supabase
      .from("agent_load")
      .upsert({
        agent_id: agentId,
        company_id: profile.company_id,
        is_available: isAvailable
      }, { onConflict: "agent_id" });

    if (error) {
      toast.error("Failed to update availability");
      return false;
    }

    toast.success(`Agent ${isAvailable ? "available" : "unavailable"}`);
    fetchAgentLoads();
    return true;
  };

  return { agentLoads, isLoading, fetchAgentLoads, updateAgentAvailability };
};

export const useAssignmentNotifications = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.company_id) return;

    const { data, error } = await supabase
      .from("assignment_notifications")
      .select(`
        *,
        leads:lead_id (name)
      `)
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      setIsLoading(false);
      return;
    }

    const mapped = data?.map(n => ({
      id: n.id,
      lead_id: n.lead_id,
      lead_name: n.leads?.name || "Unknown Lead",
      notification_type: n.notification_type,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
      created_at: n.created_at
    })) || [];

    setNotifications(mapped);
    setUnreadCount(mapped.filter(n => !n.is_read).length);
    setIsLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    if (profile?.company_id) {
      const channel = supabase
        .channel("assignment-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "assignment_notifications",
            filter: `company_id=eq.${profile.company_id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchNotifications, profile?.company_id]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("assignment_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (!error) {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.company_id) return;

    const { error } = await supabase
      .from("assignment_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("company_id", profile.company_id)
      .eq("is_read", false);

    if (!error) {
      toast.success("All notifications marked as read");
      fetchNotifications();
    }
  };

  return { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead };
};

export const useAutoReassignment = () => {
  const { profile } = useAuth();
  const [rules, setRules] = useState<AutoReassignmentRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!profile?.company_id) return;

    const { data, error } = await supabase
      .from("auto_reassignment_rules")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching rules:", error);
      setIsLoading(false);
      return;
    }

    setRules(data || []);
    setIsLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const createRule = async (rule: Partial<AutoReassignmentRule>) => {
    if (!profile?.company_id) return null;

    const { data, error } = await supabase
      .from("auto_reassignment_rules")
      .insert({
        company_id: profile.company_id,
        name: rule.name || "New Rule",
        days_without_contact: rule.days_without_contact || 3,
        use_round_robin: rule.use_round_robin ?? true,
        is_active: rule.is_active ?? true,
        apply_to_stages: rule.apply_to_stages || ["New", "Contacted"],
        created_by: profile.id
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create rule");
      return null;
    }

    toast.success("Auto-reassignment rule created");
    fetchRules();
    return data;
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("auto_reassignment_rules")
      .update({ is_active: isActive })
      .eq("id", ruleId);

    if (error) {
      toast.error("Failed to update rule");
      return false;
    }

    fetchRules();
    return true;
  };

  const deleteRule = async (ruleId: string) => {
    const { error } = await supabase
      .from("auto_reassignment_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      toast.error("Failed to delete rule");
      return false;
    }

    toast.success("Rule deleted");
    fetchRules();
    return true;
  };

  return { rules, isLoading, fetchRules, createRule, toggleRule, deleteRule };
};

export const useLeadAssignment = () => {
  const { profile } = useAuth();

  const assignLead = async (leadId: string, agentId: string, reason: string = "manual") => {
    const { data, error } = await supabase
      .rpc("assign_lead_to_agent", {
        p_lead_id: leadId,
        p_to_agent_id: agentId,
        p_change_reason: reason
      });

    if (error) {
      toast.error("Failed to assign lead");
      return null;
    }

    toast.success("Lead assigned successfully");
    return data;
  };

  const bulkAssignLeads = async (leadIds: string[], agentId: string) => {
    const { data, error } = await supabase
      .rpc("bulk_assign_leads", {
        p_lead_ids: leadIds,
        p_agent_id: agentId
      });

    if (error) {
      toast.error("Failed to bulk assign leads");
      return 0;
    }

    toast.success(`${data} leads assigned successfully`);
    return data;
  };

  const undoAssignment = async (leadId: string) => {
    const { data, error } = await supabase
      .rpc("undo_lead_assignment", {
        p_lead_id: leadId
      });

    if (error) {
      toast.error("Failed to undo assignment");
      return false;
    }

    if (data) {
      toast.success("Assignment undone");
    } else {
      toast.error("Cannot undo this assignment");
    }
    return data;
  };

  const setLeadPriority = async (leadId: string, priority: "low" | "medium" | "high" | "urgent") => {
    const { error } = await supabase
      .from("leads")
      .update({ assignment_priority: priority })
      .eq("id", leadId);

    if (error) {
      toast.error("Failed to set priority");
      return false;
    }

    toast.success(`Priority set to ${priority}`);
    return true;
  };

  return { assignLead, bulkAssignLeads, undoAssignment, setLeadPriority };
};
