import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Agent } from './types';
import { AgentCard } from './AgentCard';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableAgentCardProps {
  agent: Agent;
  onView: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onReassign: (agent: Agent) => void;
  onToggleStatus: (agent: Agent) => void;
  isAdmin?: boolean;
  isSelected?: boolean;
  onSelect?: (agent: Agent, selected: boolean) => void;
  selectionMode?: boolean;
}

export function DraggableAgentCard({
  agent,
  onView,
  onEdit,
  onReassign,
  onToggleStatus,
  isAdmin,
  isSelected = false,
  onSelect,
  selectionMode = false,
}: DraggableAgentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: agent.id,
    data: { agent, type: 'agent' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50"
      )}
    >
      <div
        {...listeners}
        {...attributes}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 p-1 rounded cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover:opacity-100 transition-opacity bg-muted hover:bg-muted-foreground/20",
          isDragging && "opacity-100"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <AgentCard
        agent={agent}
        onView={onView}
        onEdit={onEdit}
        onReassign={onReassign}
        onToggleStatus={onToggleStatus}
        isAdmin={isAdmin}
        isSelected={isSelected}
        onSelect={onSelect}
        selectionMode={selectionMode}
      />
    </div>
  );
}
