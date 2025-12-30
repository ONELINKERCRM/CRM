import { useState } from "react";
import { Tags, Plus, Settings, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLeadGroups, LeadGroup } from "@/hooks/useLeadGroups";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadGroupSelectorProps {
  leadId: string;
  currentGroupId: string | null;
  agentName?: string;
  onGroupChange?: (groupId: string | null, groupName: string | null) => void;
}

const GROUP_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#06B6D4"
];

export function LeadGroupSelector({
  leadId,
  currentGroupId,
  agentName = "Agent",
  onGroupChange,
}: LeadGroupSelectorProps) {
  const { groups, isLoading, addGroup } = useLeadGroups();
  const { canManageGroups } = useUserRole();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleGroupChange = async (value: string) => {
    const newGroupId = value === "none" ? null : value;
    const oldGroup = groups.find(g => g.id === currentGroupId);
    const newGroup = groups.find(g => g.id === newGroupId);
    
    setIsUpdating(true);
    try {
      // Update lead's group
      const { error } = await supabase
        .from("leads")
        .update({ lead_group_id: newGroupId })
        .eq("id", leadId);

      if (error) throw error;

      // Log activity
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        type: "note",
        title: "Group Changed",
        description: `Group changed from "${oldGroup?.name || "None"}" to "${newGroup?.name || "None"}"`,
        agent_name: agentName,
      });

      toast.success(`Lead group updated to ${newGroup?.name || "None"}`);
      onGroupChange?.(newGroupId, newGroup?.name || null);
    } catch (error) {
      console.error("Error updating lead group:", error);
      toast.error("Failed to update lead group");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    setIsCreating(true);
    const newGroup = await addGroup(newGroupName.trim(), newGroupColor);
    setIsCreating(false);

    if (newGroup) {
      setShowCreateDialog(false);
      setNewGroupName("");
      setNewGroupColor(GROUP_COLORS[0]);
    }
  };

  const currentGroup = groups.find(g => g.id === currentGroupId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Lead Group</Label>
        {canManageGroups && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            New Group
          </Button>
        )}
      </div>

      <Select
        value={currentGroupId || "none"}
        onValueChange={handleGroupChange}
        disabled={isLoading || isUpdating}
      >
        <SelectTrigger className="h-10">
          <div className="flex items-center gap-2">
            {isUpdating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : currentGroup ? (
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentGroup.color }}
              />
            ) : (
              <Tags className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <SelectValue placeholder="Select group..." />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted" />
              No Group
            </div>
          </SelectItem>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                {group.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Lead Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                placeholder="e.g., VIP, Hot Buyer, Investor"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      newGroupColor === color
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewGroupColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
