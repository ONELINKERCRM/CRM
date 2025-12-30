import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  History,
  CheckCircle,
  ChevronDown,
  UserPlus,
  RefreshCw,
  FolderOpen,
  BarChart3,
  Clock,
  Bell,
  Zap,
  Settings,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadAssignmentPageSkeleton } from "@/components/ui/page-skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAssignmentConfig } from "@/hooks/useAssignmentConfig";
import { useLocalization } from "@/contexts/LocalizationContext";

// Import new tabs
import { LeadPoolsTab } from "@/components/lead-assignment/LeadPoolsTab";
import { AgentLoadTab } from "@/components/lead-assignment/AgentLoadTab";
import { AutoReassignTab } from "@/components/lead-assignment/AutoReassignTab";
import { NotificationsTab } from "@/components/lead-assignment/NotificationsTab";
import { RoundRobinTab } from "@/components/lead-assignment/RoundRobinTab";
import { GlobalSettingsTab } from "@/components/lead-assignment/GlobalSettingsTab";
import { CampaignRulesTab } from "@/components/lead-assignment/CampaignRulesTab";
import { AdvancedLogicTab } from "@/components/lead-assignment/AdvancedLogicTab";
import { useAssignmentNotifications } from "@/hooks/useLeadAssignment";

interface Agent {
  id: string;
  name: string;
  email: string;
  assignLeads: boolean;
  leadsPerRound: number;
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.3
};

const LeadAssignmentPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isAdmin } = useUserRole();
  const { unreadCount } = useAssignmentNotifications();
  const { config, isLoading: configLoading, updateAssignmentMethod, updateEnabledAgents } = useAssignmentConfig();
  const { t } = useLocalization();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Derive assignment method from config
  const assignmentMethod = config?.assignment_method || "manual";

  useEffect(() => {
    const fetchAgents = async () => {
      if (!profile?.company_id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("agents")
          .select("id, name, email")
          .eq("company_id", profile.company_id)
          .eq("status", "active");

        if (error) throw error;

        // Map agents with their assignment status from config
        const mappedAgents = (data || []).map((agent) => ({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          assignLeads: config?.enabled_agent_ids?.includes(agent.id) || false,
          leadsPerRound: (config?.agent_leads_per_round as any)?.[agent.id] || 1,
        }));

        setAgents(mappedAgents);
      } catch (error: any) {
        console.error("Error fetching agents:", error);
        toast.error("Failed to load agents");
      } finally {
        setIsLoading(false);
      }
    };

    if (!configLoading) {
      fetchAgents();
    }
  }, [profile?.company_id, config, configLoading]);

  // Show skeleton while loading
  if (isLoading || configLoading) {
    return <LeadAssignmentPageSkeleton isMobile={isMobile} />;
  }

  // Permission check
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Only administrators can configure lead assignment settings. Please contact your admin for access.
        </p>
      </div>
    );
  }

  const activeAgents = agents.filter((a) => a.assignLeads);
  const activeAgentName = activeAgents.length === 1 ? activeAgents[0] : null;

  const handleToggleAssign = async (id: string) => {
    // Optimistic update
    const previousAgents = [...agents];
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, assignLeads: !a.assignLeads } : a))
    );

    try {
      const updatedAgents = agents.map((a) =>
        a.id === id ? { ...a, assignLeads: !a.assignLeads } : a
      );
      const enabledIds = updatedAgents.filter((a) => a.assignLeads).map((a) => a.id);
      const leadsPerRound = updatedAgents
        .filter((a) => a.assignLeads)
        .reduce((acc, a) => ({ ...acc, [a.id]: a.leadsPerRound }), {});

      const success = await updateEnabledAgents(enabledIds, leadsPerRound);

      if (!success) {
        // Rollback on failure
        setAgents(previousAgents);
      }
    } catch (error) {
      // Rollback on error
      setAgents(previousAgents);
      toast.error("Failed to update agent assignment");
    }
  };

  const handleLeadsPerRoundChange = async (id: string, value: string) => {
    // Optimistic update
    const previousAgents = [...agents];
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, leadsPerRound: parseInt(value) } : a
      )
    );

    try {
      const updatedAgents = agents.map((a) =>
        a.id === id ? { ...a, leadsPerRound: parseInt(value) } : a
      );
      const enabledIds = updatedAgents.filter((a) => a.assignLeads).map((a) => a.id);
      const leadsPerRound = updatedAgents
        .filter((a) => a.assignLeads)
        .reduce((acc, a) => ({ ...acc, [a.id]: a.leadsPerRound }), {});

      const success = await updateEnabledAgents(enabledIds, leadsPerRound);

      if (!success) {
        // Rollback on failure
        setAgents(previousAgents);
      }
    } catch (error) {
      // Rollback on error
      setAgents(previousAgents);
      toast.error("Failed to update leads per round");
    }
  };

  const handleAssignmentMethodChange = async (method: "manual" | "round_robin" | "rules") => {
    setIsSaving(true);
    try {
      const success = await updateAssignmentMethod(method);
      if (!success) {
        toast.error("Failed to update assignment method");
      }
    } catch (error) {
      toast.error("Failed to update assignment method");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Zap },
    { id: "pools", label: "Lead Pools", icon: FolderOpen },
    { id: "load", label: "Agent Load", icon: BarChart3 },
    { id: "auto-reassign", label: "Auto Reassign", icon: Clock },
    { id: "round-robin", label: "Round Robin", icon: RefreshCw },
    { id: "rules", label: "Rules", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Lead Assignment
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Configure how leads are assigned to your team
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/assignment-logs")}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          View Logs
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-transparent p-0 mb-6">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 px-4 py-2"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {/* Assignment Method Selection */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Assignment Method</h3>
              <RadioGroup
                value={assignmentMethod}
                onValueChange={(v) => handleAssignmentMethodChange(v as "manual" | "round_robin" | "rules")}
                className="space-y-4"
                disabled={isSaving}
              >
                {/* Manual Option */}
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="manual" id="manual" className="mt-1" />
                  <Label htmlFor="manual" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Manual Assignment</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Leads will be added to an unassigned pool. Managers can manually assign leads to agents.
                    </p>
                  </Label>
                </div>

                {/* Round Robin Option */}
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="round-robin" id="round-robin" className="mt-1" />
                  <Label htmlFor="round-robin" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Round Robin</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically distribute leads among selected team members in rotation.
                    </p>
                  </Label>
                </div>

                {/* Rule-Based Option */}
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="rules" id="rules" className="mt-1" />
                  <Label htmlFor="rules" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Rule-Based Assignment</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Assign leads based on campaign, budget, location, property type, and custom rules.
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Round Robin Configuration */}
          {assignmentMethod === "round-robin" && (
            <>
              {/* Info Banner */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Automatically Assign to Team Member(s)
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Assign leads to selected team members in a round robin distribution. Only the assigned team member will receive an alert for each new lead.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agent Assignment Table */}
              <Card>
                <CardContent className="p-0">
                  {/* Table Header Info */}
                  <div className="p-4 border-b">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ASSIGNING LEADS TO {activeAgents.length} TEAM MEMBER
                      {activeAgents.length !== 1 ? "S" : ""}
                    </p>
                    {activeAgentName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        All leads will be automatically assigned to {activeAgentName.name} ({activeAgentName.email})
                      </p>
                    )}
                    {activeAgents.length > 1 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Leads will be distributed among {activeAgents.length} team members in round robin
                      </p>
                    )}
                    {activeAgents.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        No team members selected. Enable at least one team member to auto-assign leads.
                      </p>
                    )}
                  </div>

                  {agents.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <p>No active agents found. Add agents to your team first.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-12"></TableHead>
                              <TableHead className="font-medium">
                                <div className="flex items-center gap-1">
                                  NAME
                                  <ChevronDown className="h-3 w-3" />
                                </div>
                              </TableHead>
                              <TableHead className="text-center font-medium">
                                ASSIGN LEADS
                              </TableHead>
                              <TableHead className="text-center font-medium">
                                LEADS/ROUND
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agents.map((agent, index) => (
                              <TableRow key={agent.id} className="hover:bg-muted/50">
                                <TableCell className="text-muted-foreground font-medium">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-semibold text-foreground">
                                      {agent.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {agent.email}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center gap-2">
                                    <Switch
                                      checked={agent.assignLeads}
                                      onCheckedChange={() => handleToggleAssign(agent.id)}
                                    />
                                    <span
                                      className={`text-sm ${agent.assignLeads
                                        ? "text-primary font-medium"
                                        : "text-muted-foreground"
                                        }`}
                                    >
                                      {agent.assignLeads ? "Yes" : "No"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {agent.assignLeads ? (
                                    <Select
                                      value={String(agent.leadsPerRound)}
                                      onValueChange={(value) =>
                                        handleLeadsPerRoundChange(agent.id, value)
                                      }
                                    >
                                      <SelectTrigger className="w-28 mx-auto">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">1 lead</SelectItem>
                                        <SelectItem value="2">2 leads</SelectItem>
                                        <SelectItem value="3">3 leads</SelectItem>
                                        <SelectItem value="5">5 leads</SelectItem>
                                        <SelectItem value="10">10 leads</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="md:hidden divide-y">
                        {agents.map((agent, index) => (
                          <div key={agent.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground font-medium text-sm w-5">
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {agent.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {agent.email}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pl-8">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={agent.assignLeads}
                                  onCheckedChange={() => handleToggleAssign(agent.id)}
                                />
                                <span
                                  className={`text-sm ${agent.assignLeads
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground"
                                    }`}
                                >
                                  {agent.assignLeads ? "Yes" : "No"}
                                </span>
                              </div>
                              {agent.assignLeads ? (
                                <Select
                                  value={String(agent.leadsPerRound)}
                                  onValueChange={(value) =>
                                    handleLeadsPerRoundChange(agent.id, value)
                                  }
                                >
                                  <SelectTrigger className="w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 lead</SelectItem>
                                    <SelectItem value="2">2 leads</SelectItem>
                                    <SelectItem value="3">3 leads</SelectItem>
                                    <SelectItem value="5">5 leads</SelectItem>
                                    <SelectItem value="10">10 leads</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Manual Assignment Info */}
          {assignmentMethod === "manual" && (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-6 text-center">
                <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Manual Assignment Enabled</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  New leads will appear in the unassigned pool. Team managers can manually assign leads to agents from the Leads page.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rule-Based Assignment Info */}
          {assignmentMethod === "rules" && (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-6 text-center">
                <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Rule-Based Assignment Enabled</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Leads will be automatically assigned based on your configured rules.
                  Configure rules in the Rules tab.
                </p>
                <Button onClick={() => setActiveTab("rules")} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configure Rules
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lead Pools Tab */}
        <TabsContent value="pools" className="mt-0">
          <LeadPoolsTab />
        </TabsContent>

        {/* Agent Load Tab */}
        <TabsContent value="load" className="mt-0">
          <AgentLoadTab />
        </TabsContent>

        {/* Auto Reassign Tab */}
        <TabsContent value="auto-reassign" className="mt-0">
          <AutoReassignTab />
        </TabsContent>

        {/* Round Robin Tab */}
        <TabsContent value="round-robin" className="mt-0">
          <RoundRobinTab />
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="mt-0">
          <CampaignRulesTab />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-0">
          <NotificationsTab />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-0">
          <GlobalSettingsTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default LeadAssignmentPage;
