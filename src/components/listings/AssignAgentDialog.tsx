import { useState, useEffect } from "react";
import { UserPlus, Search, Loader2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  status: string;
  listingsCount?: number;
  performance?: number;
}

// Mock agent data for when database is empty
const mockAgents: Agent[] = [
  { id: "1", name: "Sarah Mitchell", email: "sarah@realty.com", avatar_url: null, role: "agent", status: "active", listingsCount: 24, performance: 95 },
  { id: "2", name: "Mike Roberts", email: "mike@realty.com", avatar_url: null, role: "team_leader", status: "active", listingsCount: 32, performance: 88 },
  { id: "3", name: "Emma Khan", email: "emma@realty.com", avatar_url: null, role: "agent", status: "active", listingsCount: 18, performance: 92 },
  { id: "4", name: "James Lee", email: "james@realty.com", avatar_url: null, role: "agent", status: "active", listingsCount: 15, performance: 85 },
];

interface AssignAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingIds: string[];
  currentAgentId?: string;
  onAssign: (agentId: string, agentName: string) => void;
}

export function AssignAgentDialog({
  open,
  onOpenChange,
  listingIds,
  currentAgentId,
  onAssign,
}: AssignAgentDialogProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("id, name, email, avatar_url, role, status")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      
      // Use mock data if no agents in database
      if (data && data.length > 0) {
        setAgents(data.map(a => ({ ...a, listingsCount: Math.floor(Math.random() * 30) + 5, performance: Math.floor(Math.random() * 20) + 80 })));
      } else {
        setAgents(mockAgents);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
      setAgents(mockAgents);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selectedAgent) return;
    
    setAssigning(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    onAssign(selectedAgent.id, selectedAgent.name);
    setAssigning(false);
    setSelectedAgent(null);
    setSearchQuery("");
    onOpenChange(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "team_leader":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Agent
          </DialogTitle>
          <DialogDescription>
            Select an agent for {listingIds.length} listing{listingIds.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Agents List */}
          <ScrollArea className="h-[320px] rounded-md border">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <UserPlus className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No agents found</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedAgent?.id === agent.id
                        ? "bg-primary/10 border border-primary"
                        : agent.id === currentAgentId
                        ? "bg-muted border border-border"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{agent.name}</span>
                        {agent.id === currentAgentId && (
                          <Badge variant="outline" className="text-[10px]">Current</Badge>
                        )}
                        <Badge variant={getRoleBadgeVariant(agent.role)} className="text-[10px] capitalize">
                          {agent.role.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted-foreground">{agent.listingsCount} listings</p>
                        {agent.performance && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <Star className="h-3 w-3 fill-current" />
                            {agent.performance}%
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedAgent?.id === agent.id && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedAgent || assigning}
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign to {selectedAgent?.name.split(" ")[0] || "Agent"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
