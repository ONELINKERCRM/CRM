import { useState, useEffect } from "react";
import { Cloud, Loader2, ExternalLink, User, Star, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PortalAgent {
  id: string;
  name: string;
  avatar?: string;
  email: string;
}

interface Portal {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  lastSync?: string;
  status?: "synced" | "pending" | "error";
  agents: PortalAgent[];
}

const portals: Portal[] = [
  { 
    id: "pf", 
    name: "Property Finder", 
    logo: "🏠", 
    connected: true, 
    lastSync: "2 hours ago", 
    status: "synced",
    agents: [
      { id: "pf-1", name: "Sarah Mitchell", email: "sarah@propertyfinder.ae", avatar: "sarah" },
      { id: "pf-2", name: "Ahmed Hassan", email: "ahmed@propertyfinder.ae", avatar: "ahmed" },
      { id: "pf-3", name: "John Smith", email: "john@propertyfinder.ae", avatar: "john" },
    ]
  },
  { 
    id: "bayut", 
    name: "Bayut", 
    logo: "🏢", 
    connected: true, 
    lastSync: "3 hours ago", 
    status: "synced",
    agents: [
      { id: "by-1", name: "Sarah Mitchell", email: "sarah@bayut.com", avatar: "sarah" },
      { id: "by-2", name: "Mike Johnson", email: "mike@bayut.com", avatar: "mike" },
    ]
  },
  { 
    id: "dubizzle", 
    name: "Dubizzle", 
    logo: "📋", 
    connected: true, 
    lastSync: "1 day ago", 
    status: "pending",
    agents: [
      { id: "dz-1", name: "Emma Wilson", email: "emma@dubizzle.ae", avatar: "emma" },
      { id: "dz-2", name: "Sarah Mitchell", email: "sarah@dubizzle.ae", avatar: "sarah" },
    ]
  },
  { 
    id: "website", 
    name: "Company Website", 
    logo: "🌐", 
    connected: true, 
    lastSync: "Just now", 
    status: "synced",
    agents: [
      { id: "ws-1", name: "Sarah Mitchell", email: "sarah@company.com", avatar: "sarah" },
      { id: "ws-2", name: "Ahmed Hassan", email: "ahmed@company.com", avatar: "ahmed" },
      { id: "ws-3", name: "John Smith", email: "john@company.com", avatar: "john" },
      { id: "ws-4", name: "Emma Wilson", email: "emma@company.com", avatar: "emma" },
    ]
  },
  { id: "mubawab", name: "Mubawab", logo: "🏗️", connected: false, agents: [] },
  { id: "aqar", name: "Aqar", logo: "🏘️", connected: false, agents: [] },
];

interface PortalSelection {
  portalId: string;
  agentId: string;
}

interface DefaultAgentSettings {
  [portalId: string]: string; // portalId -> agentId
}

const STORAGE_KEY = "portal_default_agents";

const getDefaultAgents = (): DefaultAgentSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveDefaultAgent = (portalId: string, agentId: string) => {
  const defaults = getDefaultAgents();
  defaults[portalId] = agentId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
};

const removeDefaultAgent = (portalId: string) => {
  const defaults = getDefaultAgents();
  delete defaults[portalId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
};

interface PublishToPortalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingIds: string[];
  currentPortals?: string[];
  onPublish: (portalIds: string[]) => void;
}

export function PublishToPortalsDialog({
  open,
  onOpenChange,
  listingIds,
  currentPortals = [],
  onPublish,
}: PublishToPortalsDialogProps) {
  const [selections, setSelections] = useState<PortalSelection[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [defaultAgents, setDefaultAgents] = useState<DefaultAgentSettings>({});

  useEffect(() => {
    if (open) {
      // Load saved default agents
      const savedDefaults = getDefaultAgents();
      setDefaultAgents(savedDefaults);

      // Pre-select currently published portals OR use defaults for new listings
      if (currentPortals.length > 0) {
        const currentSelections = portals
          .filter((p) => p.connected && currentPortals.includes(p.name))
          .map((p) => ({
            portalId: p.id,
            agentId: savedDefaults[p.id] || p.agents[0]?.id || "",
          }));
        setSelections(currentSelections);
      } else {
        // For new listings, don't pre-select but remember defaults for when user selects
        setSelections([]);
      }
    }
  }, [open, currentPortals]);

  const togglePortal = (portalId: string) => {
    const portal = portals.find((p) => p.id === portalId);
    if (!portal) return;

    setSelections((prev) => {
      const isSelected = prev.some((s) => s.portalId === portalId);
      if (isSelected) {
        return prev.filter((s) => s.portalId !== portalId);
      } else {
        // Use default agent if set, otherwise first agent
        const defaultAgentId = defaultAgents[portalId] || portal.agents[0]?.id || "";
        return [...prev, { portalId, agentId: defaultAgentId }];
      }
    });
  };

  const updateAgentForPortal = (portalId: string, agentId: string) => {
    setSelections((prev) =>
      prev.map((s) => (s.portalId === portalId ? { ...s, agentId } : s))
    );
  };

  const toggleDefaultAgent = (portalId: string, agentId: string, isDefault: boolean) => {
    if (isDefault) {
      saveDefaultAgent(portalId, agentId);
      setDefaultAgents((prev) => ({ ...prev, [portalId]: agentId }));
      toast.success("Default agent saved", {
        description: `This agent will be auto-selected for ${portals.find((p) => p.id === portalId)?.name}`,
      });
    } else {
      removeDefaultAgent(portalId);
      setDefaultAgents((prev) => {
        const updated = { ...prev };
        delete updated[portalId];
        return updated;
      });
      toast.success("Default agent removed");
    }
  };

  const isPortalSelected = (portalId: string) =>
    selections.some((s) => s.portalId === portalId);

  const getSelectedAgent = (portalId: string) =>
    selections.find((s) => s.portalId === portalId)?.agentId || "";

  const handlePublish = async () => {
    // Validate all selected portals have agents
    const invalidSelections = selections.filter((s) => !s.agentId);
    if (invalidSelections.length > 0) {
      toast.error("Please select an agent for all selected portals");
      return;
    }

    setPublishing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const selectedPortalIds = selections.map((s) => s.portalId);
    const selectedNames = portals
      .filter((p) => selectedPortalIds.includes(p.id))
      .map((p) => p.name);
    
    onPublish(selectedPortalIds);
    setPublishing(false);
    onOpenChange(false);
    toast.success(
      `${listingIds.length} listing(s) published to ${selectedNames.length} portal(s)`,
      {
        description: "Each portal will display the assigned agent's contact info",
      }
    );
  };

  const selectAllPortals = () => {
    const allConnected = portals
      .filter((p) => p.connected)
      .map((p) => ({
        portalId: p.id,
        agentId: defaultAgents[p.id] || p.agents[0]?.id || "",
      }));
    setSelections(allConnected);
  };

  const deselectAllPortals = () => {
    setSelections([]);
  };

  const connectedPortals = portals.filter((p) => p.connected);
  const disconnectedPortals = portals.filter((p) => !p.connected);
  const allConnectedSelected = connectedPortals.every((p) => isPortalSelected(p.id));

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "synced":
        return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Synced</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Pending</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-700 text-[10px]">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            Publish to Portals
          </DialogTitle>
          <DialogDescription>
            Select portals and assign agents for {listingIds.length} listing{listingIds.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[450px]">
          <div className="space-y-4 pr-4">
            {/* Connected Portals */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Connected Portals</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={allConnectedSelected ? deselectAllPortals : selectAllPortals}
                >
                  {allConnectedSelected ? "Deselect All" : "Select All"}
                </Button>
              </div>
              {connectedPortals.map((portal) => {
                const isSelected = isPortalSelected(portal.id);
                const selectedAgentId = getSelectedAgent(portal.id);
                const selectedAgent = portal.agents.find((a) => a.id === selectedAgentId);
                const isDefaultAgent = defaultAgents[portal.id] === selectedAgentId && selectedAgentId !== "";

                return (
                  <div
                    key={portal.id}
                    className={`rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {/* Portal Header */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{portal.logo}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{portal.name}</span>
                            {getStatusBadge(portal.status)}
                            {defaultAgents[portal.id] && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Has default agent</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {portal.lastSync && (
                            <p className="text-xs text-muted-foreground">
                              Last sync: {portal.lastSync}
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={isSelected}
                        onCheckedChange={() => togglePortal(portal.id)}
                      />
                    </div>

                    {/* Agent Selection - shown when portal is selected */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-0">
                        <Separator className="mb-3" />
                        <div className="space-y-3">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Select Agent for this Portal
                          </label>
                          <Select
                            value={selectedAgentId}
                            onValueChange={(value) => updateAgentForPortal(portal.id, value)}
                          >
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="Choose an agent">
                                {selectedAgent && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedAgent.avatar}`}
                                      />
                                      <AvatarFallback className="text-[8px]">
                                        {selectedAgent.name[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{selectedAgent.name}</span>
                                    {isDefaultAgent && (
                                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    )}
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {portal.agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${agent.avatar}`}
                                      />
                                      <AvatarFallback className="text-[10px]">
                                        {agent.name[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium flex items-center gap-1">
                                        {agent.name}
                                        {defaultAgents[portal.id] === agent.id && (
                                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{agent.email}</p>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Set as Default Toggle */}
                          {selectedAgentId && (
                            <div className="flex items-center gap-2 pt-1">
                              <Checkbox
                                id={`default-${portal.id}`}
                                checked={isDefaultAgent}
                                onCheckedChange={(checked) =>
                                  toggleDefaultAgent(portal.id, selectedAgentId, checked as boolean)
                                }
                              />
                              <label
                                htmlFor={`default-${portal.id}`}
                                className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                              >
                                <Star className={cn(
                                  "h-3 w-3",
                                  isDefaultAgent ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                                )} />
                                Set as default for {portal.name}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Disconnected Portals */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Available Portals</h4>
              {disconnectedPortals.map((portal) => (
                <div
                  key={portal.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl grayscale">{portal.logo}</span>
                    <div>
                      <span className="font-medium text-sm">{portal.name}</span>
                      <p className="text-xs text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={selections.length === 0 || publishing}>
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 mr-2" />
                Publish to {selections.length} Portal{selections.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
