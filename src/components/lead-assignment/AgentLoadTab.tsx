import { useState } from "react";
import {
  Users,
  TrendingUp,
  Clock,
  Target,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAgentLoad } from "@/hooks/useLeadAssignment";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const AgentLoadTab = () => {
  const { agentLoads, isLoading, fetchAgentLoads, updateAgentAvailability } = useAgentLoad();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAgentLoads();
    setRefreshing(false);
  };

  // Calculate totals
  const totalLeads = agentLoads.reduce((sum, a) => sum + a.current_leads_count, 0);
  const totalFollowups = agentLoads.reduce((sum, a) => sum + a.pending_followups_count, 0);
  const avgConversion = agentLoads.length > 0 
    ? (agentLoads.reduce((sum, a) => sum + Number(a.conversion_rate), 0) / agentLoads.length).toFixed(1)
    : "0";
  const availableAgents = agentLoads.filter(a => a.is_available).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Agent Load Balancing</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Monitor agent workload in real-time. System automatically balances lead distribution 
                  based on current load and availability.
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLeads}</p>
                <p className="text-xs text-muted-foreground">Active Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFollowups}</p>
                <p className="text-xs text-muted-foreground">Pending Follow-ups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgConversion}%</p>
                <p className="text-xs text-muted-foreground">Avg Conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableAgents}/{agentLoads.length}</p>
                <p className="text-xs text-muted-foreground">Available Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Load Table - Desktop */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle className="text-base">Agent Workload Overview</CardTitle>
          <CardDescription>Real-time agent capacity and performance metrics</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Load</TableHead>
              <TableHead>Today</TableHead>
              <TableHead>This Week</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Conversion</TableHead>
              <TableHead>Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentLoads.map((agent) => (
              <TableRow key={agent.agent_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${agent.agent_name}`} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {agent.agent_name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{agent.agent_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <LoadStatusBadge 
                    load={agent.current_leads_count} 
                    max={agent.max_leads_capacity} 
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(agent.current_leads_count / agent.max_leads_capacity) * 100} 
                      className="w-16 h-2" 
                    />
                    <span className="text-sm">
                      {agent.current_leads_count}/{agent.max_leads_capacity}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{agent.total_assignments_today}</TableCell>
                <TableCell>{agent.total_assignments_week}</TableCell>
                <TableCell>
                  <Badge variant={agent.pending_followups_count > 5 ? "destructive" : "secondary"}>
                    {agent.pending_followups_count}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={Number(agent.conversion_rate) >= 20 ? "border-success text-success" : ""}
                  >
                    {agent.conversion_rate}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={agent.is_available}
                    onCheckedChange={(checked) => updateAgentAvailability(agent.agent_id, checked)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Agent Load Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {agentLoads.map((agent) => (
          <Card key={agent.agent_id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${agent.agent_name}`} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {agent.agent_name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{agent.agent_name}</h4>
                  <LoadStatusBadge 
                    load={agent.current_leads_count} 
                    max={agent.max_leads_capacity} 
                  />
                </div>
              </div>
              <Switch
                checked={agent.is_available}
                onCheckedChange={(checked) => updateAgentAvailability(agent.agent_id, checked)}
              />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Load</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(agent.current_leads_count / agent.max_leads_capacity) * 100} 
                    className="w-20 h-2" 
                  />
                  <span>{agent.current_leads_count}/{agent.max_leads_capacity}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-semibold">{agent.total_assignments_today}</p>
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-semibold">{agent.pending_followups_count}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-semibold">{agent.conversion_rate}%</p>
                  <p className="text-xs text-muted-foreground">Conv.</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {agentLoads.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Agents Found</h3>
            <p className="text-sm text-muted-foreground">
              Add agents to your team to see workload analytics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const LoadStatusBadge = ({ load, max }: { load: number; max: number }) => {
  const percentage = (load / max) * 100;
  
  if (percentage >= 90) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Overloaded
      </Badge>
    );
  }
  if (percentage >= 70) {
    return (
      <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
        <AlertTriangle className="h-3 w-3" />
        High Load
      </Badge>
    );
  }
  return (
    <Badge className="bg-success/10 text-success border-success/20 gap-1">
      <CheckCircle className="h-3 w-3" />
      Available
    </Badge>
  );
};
