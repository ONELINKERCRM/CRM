import { useState, useEffect } from "react";
import { User, UserPlus, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface LeadAssignedSelectorProps {
  leadId: string;
  currentAgentId: string | null;
  currentAgentName?: string;
  onAgentChange?: (agentId: string | null, agentName: string | null) => void;
}

export function LeadAssignedSelector({
  leadId,
  currentAgentId,
  currentAgentName,
  onAgentChange,
}: LeadAssignedSelectorProps) {
  const { canReassignLeads } = useUserRole();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from("agents")
          .select("id, name, email, avatar_url, role")
          .eq("status", "active")
          .order("name");

        if (error) throw error;
        setAgents(data || []);
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handleAgentChange = async (value: string) => {
    if (!canReassignLeads) {
      toast.error("You don't have permission to reassign leads");
      return;
    }

    const newAgentId = value === "unassigned" ? null : value;
    const oldAgent = agents.find(a => a.id === currentAgentId);
    const newAgent = agents.find(a => a.id === newAgentId);

    setIsUpdating(true);
    try {
      // Update lead's assigned agent
      const { error } = await supabase
        .from("leads")
        .update({ assigned_agent_id: newAgentId })
        .eq("id", leadId);

      if (error) throw error;

      // Log activity for reassignment
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        type: "note",
        title: "Lead Reassigned",
        description: `Lead reassigned from "${oldAgent?.name || "Unassigned"}" to "${newAgent?.name || "Unassigned"}"`,
        agent_name: currentAgentName || "System",
      });

      toast.success(`Lead assigned to ${newAgent?.name || "Unassigned"}`);
      onAgentChange?.(newAgentId, newAgent?.name || null);
    } catch (error) {
      console.error("Error reassigning lead:", error);
      toast.error("Failed to reassign lead");
    } finally {
      setIsUpdating(false);
    }
  };

  const currentAgent = agents.find(a => a.id === currentAgentId);
  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "manager": return "default";
      case "team_leader": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Assigned Agent</Label>

      <Select
        value={currentAgentId || "unassigned"}
        onValueChange={handleAgentChange}
        disabled={isLoading || isUpdating || !canReassignLeads}
      >
        <SelectTrigger className="h-10">
          <div className="flex items-center gap-2">
            {isUpdating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : currentAgent ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={currentAgent.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(currentAgent.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <SelectValue placeholder="Select agent..." />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
              <span>Unassigned</span>
            </div>
          </SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={agent.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(agent.name)}
                  </AvatarFallback>
                </Avatar>
                <span>{agent.name}</span>
                <Badge
                  variant={getRoleBadgeVariant(agent.role)}
                  className="text-[9px] px-1 py-0 capitalize"
                >
                  {agent.role.replace("_", " ")}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!canReassignLeads && (
        <p className="text-[10px] text-muted-foreground">
          Only admins and managers can reassign leads
        </p>
      )}
    </div>
  );
}
