import { useState } from "react";
import { 
  Plus, 
  GripVertical, 
  Edit, 
  Copy, 
  Trash2, 
  Eye, 
  MoreHorizontal,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface CampaignRule {
  id: string;
  name: string;
  source: string;
  priority: number;
  assignedTo: string;
  assignmentType: string;
  status: boolean;
  lastTriggered: string;
  conditions: string[];
  fallback: string;
}

const initialRules: CampaignRule[] = [
  {
    id: "1",
    name: "Google Ads Premium Leads",
    source: "Google Ads",
    priority: 1,
    assignedTo: "Premium Team",
    assignmentType: "Team",
    status: true,
    lastTriggered: "2 min ago",
    conditions: ["Budget > 2M AED", "Property: Villa"],
    fallback: "Round Robin"
  },
  {
    id: "2",
    name: "Meta Campaigns - Dubai",
    source: "Meta Ads",
    priority: 2,
    assignedTo: "Sarah Ahmed",
    assignmentType: "Agent",
    status: true,
    lastTriggered: "15 min ago",
    conditions: ["City: Dubai", "Lead Type: Buyer"],
    fallback: "Unassigned Pool"
  },
  {
    id: "3",
    name: "Website Inquiries",
    source: "Website",
    priority: 3,
    assignedTo: "Auto Round Robin",
    assignmentType: "Round Robin",
    status: true,
    lastTriggered: "1 hour ago",
    conditions: ["All Leads"],
    fallback: "Night Team"
  },
  {
    id: "4",
    name: "WhatsApp Leads - Arabic",
    source: "WhatsApp",
    priority: 4,
    assignedTo: "Arabic Team",
    assignmentType: "Team",
    status: false,
    lastTriggered: "3 days ago",
    conditions: ["Language: Arabic"],
    fallback: "Retry in 5 min"
  },
  {
    id: "5",
    name: "Referral Program",
    source: "Referral",
    priority: 5,
    assignedTo: "Weighted Distribution",
    assignmentType: "Weighted",
    status: true,
    lastTriggered: "5 hours ago",
    conditions: ["Source: Referral"],
    fallback: "Manager Review"
  }
];

const sources = [
  "Google Ads", "Meta Ads", "Website", "Landing Page", "WhatsApp", 
  "Organic", "Cold Call", "Referral", "Property Finder", "Bayut"
];

const assignmentTypes = [
  { value: "agent", label: "Specific Agent" },
  { value: "team", label: "Team" },
  { value: "roundrobin", label: "Auto Round Robin" },
  { value: "weighted", label: "Weighted Distribution" }
];

const conditions = [
  "Budget", "Country", "City", "Location", "Property Type", 
  "Lead Type", "Language", "Time of Inquiry"
];

const fallbackOptions = [
  "Fallback Agent", "Fallback Team", "Unassigned Pool", "Retry every 5 min", "Retry every 15 min"
];

export const CampaignRulesTab = () => {
  const [rules, setRules] = useState<CampaignRule[]>(initialRules);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CampaignRule | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    source: "",
    priority: 5,
    assignmentType: "roundrobin",
    assignedTo: "",
    fallback: "Unassigned Pool",
    conditions: [] as string[]
  });

  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, status: !rule.status } : rule
    ));
    toast.success("Rule status updated");
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
    toast.success("Rule deleted");
  };

  const handleDuplicateRule = (rule: CampaignRule) => {
    const newId = String(Math.max(...rules.map(r => parseInt(r.id))) + 1);
    const duplicatedRule = {
      ...rule,
      id: newId,
      name: `${rule.name} (Copy)`,
      priority: rules.length + 1
    };
    setRules([...rules, duplicatedRule]);
    toast.success("Rule duplicated");
  };

  const handleSaveRule = () => {
    if (!newRule.name || !newRule.source) {
      toast.error("Please fill in required fields");
      return;
    }

    if (editingRule) {
      setRules(rules.map(r => 
        r.id === editingRule.id 
          ? { ...editingRule, ...newRule, assignedTo: newRule.assignedTo || newRule.assignmentType }
          : r
      ));
      toast.success("Rule updated successfully");
    } else {
      const newId = String(Math.max(...rules.map(r => parseInt(r.id))) + 1);
      setRules([...rules, {
        id: newId,
        name: newRule.name,
        source: newRule.source,
        priority: newRule.priority,
        assignedTo: newRule.assignedTo || newRule.assignmentType,
        assignmentType: newRule.assignmentType,
        status: true,
        lastTriggered: "Never",
        conditions: newRule.conditions,
        fallback: newRule.fallback
      }]);
      toast.success("Rule created successfully");
    }

    setIsDialogOpen(false);
    setEditingRule(null);
    setNewRule({
      name: "",
      source: "",
      priority: 5,
      assignmentType: "roundrobin",
      assignedTo: "",
      fallback: "Unassigned Pool",
      conditions: []
    });
  };

  const openEditDialog = (rule: CampaignRule) => {
    setEditingRule(rule);
    setNewRule({
      name: rule.name,
      source: rule.source,
      priority: rule.priority,
      assignmentType: rule.assignmentType.toLowerCase().replace(" ", ""),
      assignedTo: rule.assignedTo,
      fallback: rule.fallback,
      conditions: rule.conditions
    });
    setIsDialogOpen(true);
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      "Google Ads": "bg-red-100 text-red-700 border-red-200",
      "Meta Ads": "bg-blue-100 text-blue-700 border-blue-200",
      "Website": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "WhatsApp": "bg-green-100 text-green-700 border-green-200",
      "Referral": "bg-purple-100 text-purple-700 border-purple-200",
      "Landing Page": "bg-amber-100 text-amber-700 border-amber-200",
      "Organic": "bg-cyan-100 text-cyan-700 border-cyan-200",
      "Cold Call": "bg-slate-100 text-slate-700 border-slate-200"
    };
    return colors[source] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Campaign Rule
          </Button>
        </div>
      </div>

      {/* Rules Table - Desktop */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Rule Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Triggered</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.map((rule) => (
              <TableRow key={rule.id} className="group">
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.conditions.join(", ")}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getSourceColor(rule.source)}>
                    {rule.source}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono">
                    #{rule.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{rule.assignedTo}</p>
                    <p className="text-xs text-muted-foreground">{rule.assignmentType}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.status}
                    onCheckedChange={() => handleToggleStatus(rule.id)}
                  />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {rule.lastTriggered}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateRule(rule)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Logic
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Rules Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredRules.map((rule) => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    #{rule.priority}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getSourceColor(rule.source)}`}>
                    {rule.source}
                  </Badge>
                </div>
                <h3 className="font-medium truncate">{rule.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {rule.assignedTo}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last: {rule.lastTriggered}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.status}
                  onCheckedChange={() => handleToggleStatus(rule.id)}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicateRule(rule)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Campaign Rule" : "Create Campaign Rule"}
            </DialogTitle>
            <DialogDescription>
              Configure how leads from specific sources should be assigned.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name *</Label>
                <Input
                  id="rule-name"
                  placeholder="e.g., Google Ads Premium"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Campaign / Source *</Label>
                <Select
                  value={newRule.source}
                  onValueChange={(value) => setNewRule({ ...newRule, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority Level: {newRule.priority}</Label>
              <Slider
                value={[newRule.priority]}
                onValueChange={([value]) => setNewRule({ ...newRule, priority: value })}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers = higher priority. Rules with priority 1 run first.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Assignment Type</Label>
                <Select
                  value={newRule.assignmentType}
                  onValueChange={(value) => setNewRule({ ...newRule, assignmentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fallback Option</Label>
                <Select
                  value={newRule.fallback}
                  onValueChange={(value) => setNewRule({ ...newRule, fallback: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fallback" />
                  </SelectTrigger>
                  <SelectContent>
                    {fallbackOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Conditions</Label>
              <div className="flex flex-wrap gap-2">
                {conditions.map((condition) => (
                  <Badge
                    key={condition}
                    variant={newRule.conditions.includes(condition) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const updated = newRule.conditions.includes(condition)
                        ? newRule.conditions.filter(c => c !== condition)
                        : [...newRule.conditions, condition];
                      setNewRule({ ...newRule, conditions: updated });
                    }}
                  >
                    {condition}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to toggle conditions for this rule.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule}>
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
