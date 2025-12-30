import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Settings,
  GripVertical,
  Pencil,
  Trash2,
  Copy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LeadGroup {
  id: string;
  name: string;
  color: string;
  leadCount?: number;
}

const groupColors = [
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Green", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
];

interface SortableGroupItemProps {
  group: LeadGroup;
  onEdit: (group: LeadGroup) => void;
  onDelete: (group: LeadGroup) => void;
  onDuplicate: (group: LeadGroup) => void;
  onGroupClick?: (groupName: string) => void;
  isAdmin: boolean;
  isActive?: boolean;
}

function SortableGroupItem({ group, onEdit, onDelete, onDuplicate, onGroupClick, isAdmin, isActive }: SortableGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button[data-settings]')) return;
    onGroupClick?.(group.name);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            onClick={handleClick}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer hover:bg-muted/50",
              isDragging && "opacity-50 shadow-lg z-50",
              isAdmin && "active:cursor-grabbing",
              isActive && "bg-primary/10 border-primary ring-1 ring-primary/30"
            )}
          >
            {isAdmin && (
              <GripVertical
                className="h-3 w-3 text-muted-foreground/50 flex-shrink-0"
                {...attributes}
                {...listeners}
              />
            )}
            <Users className="h-3 w-3 flex-shrink-0" style={{ color: group.color }} />
            <span className="text-sm font-medium whitespace-nowrap">{group.name}</span>
            <Badge variant="secondary" className="h-5 min-w-[20px] text-xs px-1.5">
              {group.leadCount || 0}
            </Badge>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-0.5 hover:bg-muted"
                    data-settings
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => onEdit(group)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit Group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(group)}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(group)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{group.leadCount || 0} leads in {group.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface GroupManagerProps {
  groups: LeadGroup[];
  onGroupsChange: (groups: LeadGroup[]) => void;
  onGroupFilter?: (groupName: string) => void;
  activeGroup?: string;
  isAdmin?: boolean;
}

export function GroupManager({ groups, onGroupsChange, onGroupFilter, activeGroup, isAdmin = true }: GroupManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LeadGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<LeadGroup | null>(null);

  const [groupName, setGroupName] = useState("");
  const [groupColor, setGroupColor] = useState(groupColors[0].value);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      const newGroups = arrayMove(groups, oldIndex, newIndex);
      onGroupsChange(newGroups);
      toast.success("Group order updated");
    }
  };

  const MAX_GROUPS = 10;

  const openAddDialog = () => {
    if (groups.length >= MAX_GROUPS) {
      toast.error(`Maximum ${MAX_GROUPS} groups allowed`);
      return;
    }
    setGroupName("");
    setGroupColor(groupColors[0].value);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (group: LeadGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupColor(group.color);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (group: LeadGroup) => {
    setDeletingGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleDuplicate = (group: LeadGroup) => {
    if (groups.length >= MAX_GROUPS) {
      toast.error(`Maximum ${MAX_GROUPS} groups allowed`);
      return;
    }
    const newGroup: LeadGroup = {
      id: `group-${Date.now()}`,
      name: `${group.name} (Copy)`,
      color: group.color,
      leadCount: 0,
    };
    onGroupsChange([...groups, newGroup]);
    toast.success(`Group "${group.name}" duplicated`);
  };

  const handleAddGroup = () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    const newGroup: LeadGroup = {
      id: `group-${Date.now()}`,
      name: groupName.trim(),
      color: groupColor,
      leadCount: 0,
    };
    onGroupsChange([...groups, newGroup]);
    setIsAddDialogOpen(false);
    toast.success(`Group "${groupName}" created`);
  };

  const handleEditGroup = () => {
    if (!editingGroup || !groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    const updatedGroups = groups.map((g) =>
      g.id === editingGroup.id
        ? { ...g, name: groupName.trim(), color: groupColor }
        : g
    );
    onGroupsChange(updatedGroups);
    setIsEditDialogOpen(false);
    setEditingGroup(null);
    toast.success(`Group "${groupName}" updated`);
  };

  const handleDeleteGroup = () => {
    if (!deletingGroup) return;
    const updatedGroups = groups.filter((g) => g.id !== deletingGroup.id);
    onGroupsChange(updatedGroups);
    setIsDeleteDialogOpen(false);
    setDeletingGroup(null);
    toast.success(`Group "${deletingGroup.name}" deleted`);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={groups.map((g) => g.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-center gap-2">
            {groups.map((group) => (
              <SortableGroupItem
                key={group.id}
                group={group}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onDuplicate={handleDuplicate}
                onGroupClick={onGroupFilter}
                isAdmin={isAdmin}
                isActive={activeGroup === group.name}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 whitespace-nowrap"
          onClick={openAddDialog}
        >
          <Plus className="h-4 w-4" />
          Add Group
        </Button>
      )}

      {/* Add Group Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Group</DialogTitle>
            <DialogDescription>
              Create a group to organize your leads
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="e.g., Hot Leads, VIP, Priority"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Group Color</Label>
              <div className="flex flex-wrap gap-2">
                {groupColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      groupColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setGroupColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Modify group settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Group Name</Label>
              <Input
                id="edit-group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Group Color</Label>
              <div className="flex flex-wrap gap-2">
                {groupColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      groupColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setGroupColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? 
              {(deletingGroup?.leadCount || 0) > 0 && (
                <span className="block mt-2 text-destructive">
                  This group has {deletingGroup?.leadCount} leads. They will be removed from this group.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
