import { useState } from "react";
import {
  Plus,
  Trash2,
  MoreHorizontal,
  Clock,
  RefreshCw,
  Zap,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAutoReassignment, AutoReassignmentRule } from "@/hooks/useLeadAssignment";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_STAGES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation"];

export const AutoReassignTab = () => {
  const { rules, isLoading, createRule, toggleRule, deleteRule } = useAutoReassignment();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    name: "",
    days_without_contact: 3,
    use_round_robin: true,
    apply_to_stages: ["New", "Contacted"]
  });

  const handleCreate = async () => {
    if (!newRule.name.trim()) return;
    
    const result = await createRule(newRule);
    if (result) {
      setIsCreateOpen(false);
      setNewRule({
        name: "",
        days_without_contact: 3,
        use_round_robin: true,
        apply_to_stages: ["New", "Contacted"]
      });
    }
  };

  const handleDelete = async () => {
    if (deleteRuleId) {
      await deleteRule(deleteRuleId);
      setDeleteRuleId(null);
    }
  };

  const toggleStage = (stage: string) => {
    setNewRule(prev => ({
      ...prev,
      apply_to_stages: prev.apply_to_stages.includes(stage)
        ? prev.apply_to_stages.filter(s => s !== stage)
        : [...prev.apply_to_stages, stage]
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Auto-Reassignment Rules</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically reassign leads that haven't been contacted within a specified time. 
                This ensures no lead falls through the cracks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Active Rules ({rules.filter(r => r.is_active).length})</h3>
        <Button size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Auto-Reassignment Rules</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create rules to automatically reassign uncontacted leads.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => toggleRule(rule.id, !rule.is_active)}
              onDelete={() => setDeleteRuleId(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Auto-Reassignment Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                placeholder="e.g., 3-Day No Contact"
                value={newRule.name}
                onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Reassign After (Days)</Label>
              <Select 
                value={String(newRule.days_without_contact)} 
                onValueChange={(v) => setNewRule(prev => ({ ...prev, days_without_contact: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Apply to Lead Stages</Label>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_STAGES.map((stage) => (
                  <div key={stage} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stage-${stage}`}
                      checked={newRule.apply_to_stages.includes(stage)}
                      onCheckedChange={() => toggleStage(stage)}
                    />
                    <label htmlFor={`stage-${stage}`} className="text-sm">
                      {stage}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Use Round Robin</Label>
                <p className="text-xs text-muted-foreground">
                  Distribute reassigned leads evenly
                </p>
              </div>
              <Switch
                checked={newRule.use_round_robin}
                onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, use_round_robin: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newRule.name.trim()}>
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the auto-reassignment rule. 
              Leads currently in queue will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const RuleCard = ({ 
  rule, 
  onToggle, 
  onDelete 
}: { 
  rule: AutoReassignmentRule; 
  onToggle: () => void;
  onDelete: () => void;
}) => {
  return (
    <Card className={!rule.is_active ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              rule.is_active ? "bg-primary/10" : "bg-muted"
            }`}>
              <Zap className={`h-5 w-5 ${rule.is_active ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{rule.name}</h4>
                <Badge variant={rule.is_active ? "default" : "secondary"}>
                  {rule.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Reassign after {rule.days_without_contact} day{rule.days_without_contact !== 1 ? "s" : ""} without contact
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {rule.apply_to_stages.map((stage) => (
                  <Badge key={stage} variant="outline" className="text-xs">
                    {stage}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.is_active}
              onCheckedChange={onToggle}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Rule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>{rule.use_round_robin ? "Round Robin" : "Manual"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
