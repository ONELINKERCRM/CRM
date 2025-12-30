import { Agent, roleLabels, statusColors } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, UserMinus, Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentCardProps {
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

export function AgentCard({
  agent,
  onView,
  onEdit,
  onReassign,
  onToggleStatus,
  isAdmin,
  isSelected = false,
  onSelect,
  selectionMode = false,
}: AgentCardProps) {
  const initials = agent.name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleCheckboxChange = (checked: boolean) => {
    onSelect?.(agent, checked);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg transition-colors group",
        isSelected
          ? "bg-primary/10 border border-primary/30"
          : "bg-muted/30 hover:bg-muted/50"
      )}
    >
      {(selectionMode || isAdmin) && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          className={cn(
            "transition-opacity",
            selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        />
      )}

      <Avatar className="h-8 w-8 transition-transform group-hover:scale-105">
        <AvatarImage src={agent.avatar} alt={agent.name} />
        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground truncate">{agent.name}</h4>
          <Badge variant="outline" className="text-[9px] h-4.5 px-1 font-normal">
            {roleLabels[agent.role]}
          </Badge>
          <Badge className={cn('text-[9px] h-4.5 px-1 font-normal', statusColors[agent.status])}>
            {agent.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{agent.email}</p>
      </div>

      {isAdmin && !selectionMode && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => onView(agent)}>
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Agent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReassign(agent)}>
              <UserMinus className="h-4 w-4 mr-2" />
              Reassign Team
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggleStatus(agent)}>
              <Power className="h-4 w-4 mr-2" />
              {agent.status === 'active' ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}