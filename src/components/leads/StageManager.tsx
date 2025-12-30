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
  X,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LeadStage {
  id: string;
  name: string;
  color: string;
  category?: "initial" | "intermediate" | "final";
  leadCount?: number;
}

const stageColors = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Green", value: "#10B981" },
  { name: "Red", value: "#EF4444" },
  { name: "Pink", value: "#EC4899" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Orange", value: "#F97316" },
];

const categoryLabels = {
  initial: "Initial",
  intermediate: "Intermediate",
  final: "Final",
};

interface SortableStageItemProps {
  stage: LeadStage;
  onEdit: (stage: LeadStage) => void;
  onDelete: (stage: LeadStage) => void;
  onDuplicate: (stage: LeadStage) => void;
  onStageClick?: (stageName: string) => void;
  isAdmin: boolean;
  isActive?: boolean;
}

function SortableStageItem({ stage, onEdit, onDelete, onDuplicate, onStageClick, isAdmin, isActive }: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger filter if clicking on settings dropdown
    if ((e.target as HTMLElement).closest('button[data-settings]')) return;
    onStageClick?.(stage.name);
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
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-sm font-medium whitespace-nowrap">{stage.name}</span>
            <Badge variant="secondary" className="h-5 min-w-[20px] text-xs px-1.5">
              {stage.leadCount}
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
                  <DropdownMenuItem onClick={() => onEdit(stage)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit Stage
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(stage)}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(stage)}
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
          <p>{stage.leadCount} leads in {stage.name}</p>
          <p className="text-xs text-muted-foreground">{categoryLabels[stage.category]} stage</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface StageManagerProps {
  stages: LeadStage[];
  onStagesChange: (stages: LeadStage[]) => void;
  onStageFilter?: (stageName: string) => void;
  activeStage?: string;
  isAdmin?: boolean;
}

export function StageManager({ stages, onStagesChange, onStageFilter, activeStage, isAdmin = true }: StageManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<LeadStage | null>(null);
  const [deletingStage, setDeletingStage] = useState<LeadStage | null>(null);
  const [moveToStageId, setMoveToStageId] = useState<string>("");

  // Form state
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState(stageColors[0].value);
  const [stageCategory, setStageCategory] = useState<"initial" | "intermediate" | "final">("intermediate");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over.id);
      const newStages = arrayMove(stages, oldIndex, newIndex);
      onStagesChange(newStages);
      toast.success("Stage order updated");
    }
  };

  const MAX_STAGES = 12;

  const openAddDialog = () => {
    if (stages.length >= MAX_STAGES) {
      toast.error(`Maximum ${MAX_STAGES} stages allowed`);
      return;
    }
    setStageName("");
    setStageColor(stageColors[0].value);
    setStageCategory("intermediate");
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (stage: LeadStage) => {
    setEditingStage(stage);
    setStageName(stage.name);
    setStageColor(stage.color);
    setStageCategory(stage.category);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (stage: LeadStage) => {
    setDeletingStage(stage);
    setMoveToStageId(stages.find((s) => s.id !== stage.id)?.id || "");
    setIsDeleteDialogOpen(true);
  };

  const handleDuplicate = (stage: LeadStage) => {
    if (stages.length >= MAX_STAGES) {
      toast.error(`Maximum ${MAX_STAGES} stages allowed`);
      return;
    }
    const newStage: LeadStage = {
      id: `stage-${Date.now()}`,
      name: `${stage.name} (Copy)`,
      color: stage.color,
      category: stage.category,
      leadCount: 0,
    };
    onStagesChange([...stages, newStage]);
    toast.success(`Stage "${stage.name}" duplicated`);
  };

  const handleAddStage = () => {
    if (!stageName.trim()) {
      toast.error("Stage name is required");
      return;
    }
    const newStage: LeadStage = {
      id: `stage-${Date.now()}`,
      name: stageName.trim(),
      color: stageColor,
      category: stageCategory,
      leadCount: 0,
    };
    onStagesChange([...stages, newStage]);
    setIsAddDialogOpen(false);
    toast.success(`Stage "${stageName}" created`);
  };

  const handleEditStage = () => {
    if (!editingStage || !stageName.trim()) {
      toast.error("Stage name is required");
      return;
    }
    const updatedStages = stages.map((s) =>
      s.id === editingStage.id
        ? { ...s, name: stageName.trim(), color: stageColor, category: stageCategory }
        : s
    );
    onStagesChange(updatedStages);
    setIsEditDialogOpen(false);
    setEditingStage(null);
    toast.success(`Stage "${stageName}" updated`);
  };

  const handleDeleteStage = () => {
    if (!deletingStage) return;
    
    if (deletingStage.leadCount > 0 && !moveToStageId) {
      toast.error("Please select a stage to move leads to");
      return;
    }

    // In a real app, this would move leads to the selected stage
    const updatedStages = stages.filter((s) => s.id !== deletingStage.id);
    
    if (deletingStage.leadCount > 0 && moveToStageId) {
      // Update lead counts
      const targetIndex = updatedStages.findIndex((s) => s.id === moveToStageId);
      if (targetIndex !== -1) {
        updatedStages[targetIndex] = {
          ...updatedStages[targetIndex],
          leadCount: updatedStages[targetIndex].leadCount + deletingStage.leadCount,
        };
      }
    }

    onStagesChange(updatedStages);
    setIsDeleteDialogOpen(false);
    setDeletingStage(null);
    toast.success(`Stage "${deletingStage.name}" deleted`);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={stages.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-center gap-2">
            {stages.map((stage) => (
              <SortableStageItem
                key={stage.id}
                stage={stage}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onDuplicate={handleDuplicate}
                onStageClick={onStageFilter}
                isAdmin={isAdmin}
                isActive={activeStage === stage.name}
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
          Add Stage
        </Button>
      )}

      {/* Add Stage Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Stage</DialogTitle>
            <DialogDescription>
              Create a new lead stage for your pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name</Label>
              <Input
                id="stage-name"
                placeholder="e.g., Qualified, Proposal Sent"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stage Color</Label>
              <div className="flex flex-wrap gap-2">
                {stageColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      stageColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setStageColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stage Category</Label>
              <Select value={stageCategory} onValueChange={(v: any) => setStageCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="initial">Initial (Entry stages)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (In progress)</SelectItem>
                  <SelectItem value="final">Final (Closed/Lost)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStage}>Create Stage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
            <DialogDescription>
              Modify stage settings. Changes will apply to all leads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-stage-name">Stage Name</Label>
              <Input
                id="edit-stage-name"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stage Color</Label>
              <div className="flex flex-wrap gap-2">
                {stageColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      stageColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setStageColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stage Category</Label>
              <Select value={stageCategory} onValueChange={(v: any) => setStageCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="initial">Initial (Entry stages)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (In progress)</SelectItem>
                  <SelectItem value="final">Final (Closed/Lost)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditStage}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage "{deletingStage?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingStage?.leadCount && deletingStage.leadCount > 0 ? (
                <>
                  This stage has <strong>{deletingStage.leadCount} leads</strong>. 
                  Please select a stage to move them to before deleting.
                </>
              ) : (
                "This action cannot be undone. The stage will be permanently removed."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deletingStage?.leadCount && deletingStage.leadCount > 0 && (
            <div className="py-4">
              <Label>Move leads to</Label>
              <Select value={moveToStageId} onValueChange={setMoveToStageId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {stages
                    .filter((s) => s.id !== deletingStage?.id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
