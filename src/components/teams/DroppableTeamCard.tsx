import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Team, Agent, statusColors } from './types';
import { DraggableAgentCard } from './DraggableAgentCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit,
  UserPlus,
  Trash2,
  Users,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DroppableTeamCardProps {
  team: Team;
  onEdit: (team: Team) => void;
  onAddAgent: (team: Team) => void;
  onRemoveAgent: (team: Team) => void;
  onAssignLeader: (team: Team) => void;
  onDelete: (team: Team) => void;
  onViewAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onReassignAgent: (agent: Agent) => void;
  onToggleAgentStatus: (agent: Agent) => void;
  isAdmin?: boolean;
  selectedAgentIds?: Set<string>;
  onSelectAgent?: (agent: Agent, selected: boolean) => void;
  selectionMode?: boolean;
}

export function DroppableTeamCard({
  team,
  onEdit,
  onAddAgent,
  onRemoveAgent,
  onAssignLeader,
  onDelete,
  onViewAgent,
  onEditAgent,
  onReassignAgent,
  onToggleAgentStatus,
  isAdmin,
  selectedAgentIds = new Set(),
  onSelectAgent,
  selectionMode = false,
}: DroppableTeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const leader = team.agents.find(a => a.role === 'team_leader');
  const leaderInitials = leader?.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'TL';

  const { isOver, setNodeRef } = useDroppable({
    id: `team-${team.id}`,
    data: { team, type: 'team' },
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "border-border transition-all duration-300",
        isOver
          ? "ring-2 ring-primary shadow-lg border-primary bg-primary/5"
          : "hover:shadow-lg"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  isOver ? "bg-primary/20" : "bg-primary/10"
                )}>
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base text-foreground">{team.name}</h3>
                    <Badge className={cn('text-xs', team.status === 'active' ? statusColors.active : statusColors.inactive)}>
                      {team.status}
                    </Badge>
                    {isOver && (
                      <Badge className="text-xs bg-primary text-primary-foreground animate-pulse">
                        Drop here
                      </Badge>
                    )}
                  </div>
                  {leader && (
                    <div className="flex items-center gap-2 mt-1">
                      <Crown className="h-3 w-3 text-amber-500" />
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={leader.avatar} />
                        <AvatarFallback className="text-[10px]">{leaderInitials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{leader.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-3 mr-2 text-center">
                <div className="px-2.5 py-1 bg-muted/50 rounded-lg">
                  <p className="text-base font-bold text-foreground">{team.agents.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Agents</p>
                </div>
                <div className="px-2.5 py-1 bg-muted/50 rounded-lg">
                  <p className="text-base font-bold text-foreground">{team.assignedLeads}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Leads</p>
                </div>
                <div className="px-2.5 py-1 bg-muted/50 rounded-lg">
                  <p className="text-base font-bold text-foreground">{team.assignedListings}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Listings</p>
                </div>
              </div>

              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onClick={() => onEdit(team)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Team
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddAgent(team)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Agent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAssignLeader(team)}>
                      <Crown className="h-4 w-4 mr-2" />
                      Assign Leader
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(team)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Mobile stats */}
          <div className="flex sm:hidden items-center gap-3 mt-3 pt-3 border-t border-border">
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold">{team.agents.length}</p>
              <p className="text-xs text-muted-foreground">Agents</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold">{team.assignedLeads}</p>
              <p className="text-xs text-muted-foreground">Leads</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold">{team.assignedListings}</p>
              <p className="text-xs text-muted-foreground">Listings</p>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-muted-foreground">Team Members ({team.agents.length})</h4>
              </div>
              {team.agents.length > 0 ? (
                <div className="space-y-2 pl-4">
                  {team.agents.map((agent) => (
                    <DraggableAgentCard
                      key={agent.id}
                      agent={agent}
                      onView={onViewAgent}
                      onEdit={onEditAgent}
                      onReassign={onReassignAgent}
                      onToggleStatus={onToggleAgentStatus}
                      isAdmin={isAdmin}
                      isSelected={selectedAgentIds.has(agent.id)}
                      onSelect={onSelectAgent}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "text-center py-8 rounded-lg transition-colors",
                  isOver ? "bg-primary/10" : "text-muted-foreground"
                )}>
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {isOver ? "Release to add agent to this team" : "No agents in this team"}
                  </p>
                  {isAdmin && !isOver && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => onAddAgent(team)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Agent
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
