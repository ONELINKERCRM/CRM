import { useState, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  Trash2,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PipelineSkeleton } from "@/components/ui/page-skeletons";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
import { useLeads, Lead } from "@/hooks/useLeads";
import { useStages, LeadStage } from "@/contexts/StagesContext";
import { formatDistanceToNow } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";

interface DraggableLeadCardProps {
  lead: Lead;
  stageColor: string;
}

const DraggableLeadCard = memo(function DraggableLeadCard({ lead, stageColor }: DraggableLeadCardProps) {
  const navigate = useNavigate();

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: lead.id,
    data: { lead, stageColor },
  });

  if (!lead) return null;

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false });
    } catch {
      return "Recently";
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "touch-none",
        isDragging && "opacity-0"
      )}
    >
      <Card
        className="p-3 border-l-4 transition-all hover:shadow-md bg-background"
        style={{ borderLeftColor: stageColor }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            </div>
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} />
              <AvatarFallback>{lead.name[0]}</AvatarFallback>
            </Avatar>
            <div className="cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
              <p className="font-medium text-sm">{lead.name}</p>
              {lead.budget && (
                <p className="text-xs text-primary font-medium">{lead.budget}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-3.5 w-3.5 mr-2" />
                Assign Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
          <span>{lead.source || "Unknown"}</span>
          <span>{getTimeAgo(lead.created_at)}</span>
        </div>
        {lead.agent && (
          <div className="flex items-center gap-1 mt-2 pl-6">
            <Avatar className="h-5 w-5">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.agent.name}`} />
              <AvatarFallback>{lead.agent.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </Card>
    </div>
  );
}, (prev, next) => {
  return prev.lead.id === next.lead.id &&
    prev.lead.stage === next.lead.stage && // crucial for updates
    prev.lead.updated_at === next.lead.updated_at &&
    prev.stageColor === next.stageColor;
});

interface StageColumnProps {
  stage: LeadStage;
  leads: Lead[];
  allStages: LeadStage[];
}

const StageColumn = memo(function StageColumn({
  stage,
  leads,
}: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const RENDER_LIMIT = 50;
  const displayLeads = leads.slice(0, RENDER_LIMIT);
  const hiddenCount = Math.max(0, leads.length - RENDER_LIMIT);

  return (
    <div className="w-[280px] sm:w-72 flex-shrink-0 h-full">
      <Card className={cn(
        "shadow-card h-full transition-all duration-200 flex flex-col",
        isOver && "ring-2 ring-primary ring-offset-2 bg-primary/5"
      )}>
        <CardHeader className="pb-3 flex-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <CardTitle className="text-sm font-semibold">{stage.name}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {leads.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent ref={setNodeRef} className="space-y-3 min-h-[200px] flex-1 overflow-y-auto min-h-0">
          {displayLeads.map((lead) => (
            <DraggableLeadCard
              key={lead.id}
              lead={lead}
              stageColor={stage.color}
            />
          ))}
          {hiddenCount > 0 && (
            <div className="text-center py-2 text-xs text-muted-foreground bg-muted/30 rounded-md">
              + {hiddenCount} more leads
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

// Overlay card shown while dragging
function DragOverlayCard({ lead, stageColor }: { lead: Lead; stageColor: string }) {
  if (!lead) return null;

  return (
    // Width = Column Width (280px/72) - CardContent Padding (p-6/3rem)
    // 280px - 48px = 232px
    // 18rem - 3rem = 15rem (w-60 is 15rem, w-72 is 18rem)
    <div className="w-[232px] sm:w-[240px] flex flex-col">
      <Card
        className="p-3 border-l-4 shadow-2xl bg-background rotate-2 cursor-grabbing"
        style={{ borderLeftColor: stageColor }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} />
              <AvatarFallback>{lead.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{lead.name}</p>
              {lead.budget && (
                <p className="text-xs text-primary font-medium">{lead.budget}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
          <span>{lead.source || "Unknown"}</span>
        </div>
      </Card>
    </div>
  );
}

export default function PipelinePage() {
  const { t } = useLocalization();
  const { leads, isLoading: isLeadsLoading, setLeads, refetch } = useLeads();
  const { stages, isLoading: isStagesLoading } = useStages();

  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [activeStageColor, setActiveStageColor] = useState<string>("#888");

  const isLoading = isLeadsLoading || isStagesLoading;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Group leads by stage - Optimized to O(N)
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    const stageNameMap: Record<string, string> = {};

    // Initialize buckets and name map
    stages.forEach((stage) => {
      grouped[stage.id] = [];
      stageNameMap[stage.name] = stage.id;
    });

    // Single pass through leads
    leads.forEach((lead) => {
      let targetStageId = lead.stage_id;

      // Fallback strategies for finding stage
      if (!targetStageId) {
        let stageName = lead.stage || "";
        if (stageName === "Uncontacted") stageName = "New";
        targetStageId = stageNameMap[stageName];
      }

      // If we found a valid stage ID in our current stages
      if (targetStageId && grouped[targetStageId]) {
        grouped[targetStageId].push(lead);
      } else {
        // Fallback for leads with invalid stages -> put in first stage (usually New)
        if (stages.length > 0) {
          grouped[stages[0].id].push(lead);
        }
      }
    });

    // Ensure we handle stage ordering? 
    // The pipeline columns iterate 'stages' array, so visual order is correct.
    // The grouped object keys order doesn't matter.

    return grouped;
  }, [stages, leads]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    if (lead) {
      setActiveLead(lead);
      const stage = stages.find(s => s.id === lead.stage_id || s.name === lead.stage);
      setActiveStageColor(stage?.color || "#888");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const targetStageId = over.id as string;
    const lead = leads.find(l => l.id === leadId);

    if (!lead) return;

    // Check if dropped on a stage
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    if (lead.stage_id === targetStageId) return;

    // Optimistic update
    const previousStageId = lead.stage_id;
    const previousStageName = lead.stage;

    setLeads(prev => prev.map(l =>
      l.id === leadId
        ? { ...l, stage_id: targetStage.id, stage: targetStage.name, is_new: false }
        : l
    ));

    toast.success(`Lead moved to ${targetStage.name}`);

    // Update in database
    const { error } = await supabase
      .from("leads")
      .update({
        stage_id: targetStage.id,
        stage: targetStage.name,
        is_new: false
      })
      .eq("id", leadId);

    if (error) {
      console.error("Error updating lead stage:", error);
      toast.error("Failed to update lead stage");
      // Revert optimistic update
      setLeads(prev => prev.map(l =>
        l.id === leadId
          ? { ...l, stage_id: previousStageId, stage: previousStageName }
          : l
      ));
    }
  };

  if (isLoading) {
    return <PipelineSkeleton />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-none">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('pipeline')}</h1>
          <p className="text-muted-foreground text-sm">Drag and drop leads between stages to update their status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pipeline Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto pb-4 min-h-0">
          <div className="flex gap-4 min-w-max h-full">
            {stages.map((stage) => {
              const stageLeads = leadsByStage[stage.id] || [];
              return (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  leads={stageLeads}
                  allStages={stages}
                />
              );
            })}
          </div>
        </div>

        {/* Empty State when no leads exist */}
        {leads.length === 0 && (
          <Card className="mt-4">
            <CardContent className="p-6">
              <EmptyState
                icon={Inbox}
                title="No leads found"
                description="Start by adding a new lead in the Leads page."
                actionLabel="Go to Leads"
                onAction={() => navigate("/leads")}
              />
            </CardContent>
          </Card>
        )}

        <DragOverlay>
          {activeLead && (
            <DragOverlayCard lead={activeLead} stageColor={activeStageColor} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}