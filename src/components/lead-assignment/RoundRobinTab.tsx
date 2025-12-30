import { useState } from "react";
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  RefreshCw,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string;
  avatar: string;
  weightedShare: number;
  maxPerDay: number;
  maxPerHour: number;
  status: "online" | "offline" | "auto-paused";
  currentLoad: number;
  lastAssigned: string;
  performanceScore: number;
}

const initialAgents: Agent[] = [
  {
    id: "1",
    name: "Sarah Ahmed",
    avatar: "",
    weightedShare: 25,
    maxPerDay: 20,
    maxPerHour: 5,
    status: "online",
    currentLoad: 12,
    lastAssigned: "5 min ago",
    performanceScore: 94
  },
  {
    id: "2",
    name: "Mohammed Ali",
    avatar: "",
    weightedShare: 30,
    maxPerDay: 25,
    maxPerHour: 6,
    status: "online",
    currentLoad: 18,
    lastAssigned: "2 min ago",
    performanceScore: 88
  },
  {
    id: "3",
    name: "Fatima Hassan",
    avatar: "",
    weightedShare: 20,
    maxPerDay: 15,
    maxPerHour: 4,
    status: "auto-paused",
    currentLoad: 8,
    lastAssigned: "45 min ago",
    performanceScore: 91
  },
  {
    id: "4",
    name: "Ahmed Khalil",
    avatar: "",
    weightedShare: 15,
    maxPerDay: 12,
    maxPerHour: 3,
    status: "offline",
    currentLoad: 0,
    lastAssigned: "2 hours ago",
    performanceScore: 85
  },
  {
    id: "5",
    name: "Layla Omar",
    avatar: "",
    weightedShare: 10,
    maxPerDay: 10,
    maxPerHour: 3,
    status: "online",
    currentLoad: 6,
    lastAssigned: "15 min ago",
    performanceScore: 92
  }
];

export const RoundRobinTab = () => {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(true);
  const [skipOffline, setSkipOffline] = useState(true);
  const [autoReturn, setAutoReturn] = useState(true);
  const [assignmentOrder, setAssignmentOrder] = useState("smart");
  const [redistributionHours, setRedistributionHours] = useState(4);
  const [notifyBeforeReassign, setNotifyBeforeReassign] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [newAgent, setNewAgent] = useState({
    name: "",
    weightedShare: 20,
    maxPerDay: 15,
    maxPerHour: 4
  });

  const totalAssignedToday = agents.reduce((sum, a) => sum + a.currentLoad, 0);
  const leadsSkipped = 3;
  const assignmentErrors = 1;
  const topPerformer = agents.reduce((prev, curr) => 
    curr.performanceScore > prev.performanceScore ? curr : prev
  );

  const handleRemoveAgent = (id: string) => {
    setAgents(agents.filter(a => a.id !== id));
    toast.success("Agent removed from pool");
  };

  const handleSaveAgent = () => {
    if (!newAgent.name) {
      toast.error("Please enter agent name");
      return;
    }

    if (editingAgent) {
      setAgents(agents.map(a => 
        a.id === editingAgent.id 
          ? { ...a, ...newAgent }
          : a
      ));
      toast.success("Agent updated");
    } else {
      const newId = String(Math.max(...agents.map(a => parseInt(a.id))) + 1);
      setAgents([...agents, {
        id: newId,
        name: newAgent.name,
        avatar: "",
        weightedShare: newAgent.weightedShare,
        maxPerDay: newAgent.maxPerDay,
        maxPerHour: newAgent.maxPerHour,
        status: "online",
        currentLoad: 0,
        lastAssigned: "Never",
        performanceScore: 80
      }]);
      toast.success("Agent added to pool");
    }

    setIsDialogOpen(false);
    setEditingAgent(null);
    setNewAgent({ name: "", weightedShare: 20, maxPerDay: 15, maxPerHour: 4 });
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setNewAgent({
      name: agent.name,
      weightedShare: agent.weightedShare,
      maxPerDay: agent.maxPerDay,
      maxPerHour: agent.maxPerHour
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="bg-success/10 text-success border-success/20">Online</Badge>;
      case "offline":
        return <Badge variant="secondary">Offline</Badge>;
      case "auto-paused":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Auto-paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Round Robin Logic</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Leads are automatically distributed among agents in rotation. Configure weights, 
                limits, and availability rules to optimize lead distribution fairly across your team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Block */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAssignedToday}</p>
                <p className="text-xs text-muted-foreground">Assigned Today</p>
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
                <p className="text-2xl font-bold">{leadsSkipped}</p>
                <p className="text-xs text-muted-foreground">Leads Skipped</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-2xl font-bold">{assignmentErrors}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
                {assignmentErrors > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    Retry
                  </Button>
                )}
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
                <p className="text-sm font-medium truncate">{topPerformer.name}</p>
                <p className="text-xs text-muted-foreground">Top Performer ({topPerformer.performanceScore}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Round Robin Controls</CardTitle>
          <CardDescription>Configure how leads are distributed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="rr-enabled" className="flex-1">Enable Round Robin</Label>
              <Switch
                id="rr-enabled"
                checked={roundRobinEnabled}
                onCheckedChange={setRoundRobinEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="skip-offline" className="flex-1">Skip Offline Agents</Label>
              <Switch
                id="skip-offline"
                checked={skipOffline}
                onCheckedChange={setSkipOffline}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-return" className="flex-1">Auto-return when online</Label>
              <Switch
                id="auto-return"
                checked={autoReturn}
                onCheckedChange={setAutoReturn}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Assignment Order</Label>
              <Select value={assignmentOrder} onValueChange={setAssignmentOrder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict Rotation</SelectItem>
                  <SelectItem value="smart">Smart (Performance-based)</SelectItem>
                  <SelectItem value="weighted">Weighted Rotation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Redistribute uncontacted leads after</Label>
              <Select 
                value={String(redistributionHours)} 
                onValueChange={(v) => setRedistributionHours(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="notify-reassign" className="flex-1">
              Notify agent before reassigning
            </Label>
            <Switch
              id="notify-reassign"
              checked={notifyBeforeReassign}
              onCheckedChange={setNotifyBeforeReassign}
            />
          </div>
        </CardContent>
      </Card>

      {/* Agent Pool Table Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Agent Pool ({agents.length})</h3>
        <Button size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      {/* Agent Pool Table - Desktop */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Weight %</TableHead>
              <TableHead>Max/Day</TableHead>
              <TableHead>Max/Hour</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Load</TableHead>
              <TableHead>Last Assigned</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={agent.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {agent.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{agent.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={agent.weightedShare} className="w-16 h-2" />
                    <span className="text-sm">{agent.weightedShare}%</span>
                  </div>
                </TableCell>
                <TableCell>{agent.maxPerDay}</TableCell>
                <TableCell>{agent.maxPerHour}</TableCell>
                <TableCell>{getStatusBadge(agent.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{agent.currentLoad}/{agent.maxPerDay}</span>
                    <Progress 
                      value={(agent.currentLoad / agent.maxPerDay) * 100} 
                      className="w-12 h-2" 
                    />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {agent.lastAssigned}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={agent.performanceScore >= 90 ? "border-success text-success" : ""}
                  >
                    {agent.performanceScore}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(agent)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleRemoveAgent(agent.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Agent Pool Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={agent.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {agent.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{agent.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(agent.status)}
                    <Badge variant="outline">{agent.performanceScore}%</Badge>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(agent)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => handleRemoveAgent(agent.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Weight</p>
                <p className="font-medium">{agent.weightedShare}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Load</p>
                <p className="font-medium">{agent.currentLoad}/{agent.maxPerDay}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Last</p>
                <p className="font-medium">{agent.lastAssigned}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Agent Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? "Edit Agent" : "Add Agent to Pool"}
            </DialogTitle>
            <DialogDescription>
              Configure agent settings for round robin distribution.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="Select or type agent name"
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Weighted Share: {newAgent.weightedShare}%</Label>
              <Slider
                value={[newAgent.weightedShare]}
                onValueChange={([value]) => setNewAgent({ ...newAgent, weightedShare: value })}
                min={5}
                max={50}
                step={5}
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max-day">Max Leads/Day</Label>
                <Input
                  id="max-day"
                  type="number"
                  value={newAgent.maxPerDay}
                  onChange={(e) => setNewAgent({ ...newAgent, maxPerDay: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-hour">Max Leads/Hour</Label>
                <Input
                  id="max-hour"
                  type="number"
                  value={newAgent.maxPerHour}
                  onChange={(e) => setNewAgent({ ...newAgent, maxPerHour: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAgent}>
              {editingAgent ? "Update Agent" : "Add Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
