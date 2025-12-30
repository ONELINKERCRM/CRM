import { useState } from 'react';
import { Team, Agent } from './types';
import { AgentCard } from './AgentCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface TeamCardProps {
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

export function TeamCard({
  team,
  onEdit,
  onAddAgent,
  onDelete,
  onViewAgent,
  onEditAgent,
  onReassignAgent,
  onToggleAgentStatus,
  isAdmin,
  selectedAgentIds = new Set(),
  onSelectAgent,
  selectionMode = false,
}: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const leader = team.agents.find(a => a.role === 'team_leader');

  return (
    <Card className="border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{team.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {team.agents.length} agents
                  </Badge>
                </div>
                {leader && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-500" />
                    {leader.name}
                  </p>
                )}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(team)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t border-border pt-4 space-y-2">
              {team.agents.length > 0 ? (
                <div className="space-y-2">
                  {team.agents.map((agent) => (
                    <AgentCard
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
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No agents in this team</p>
                  {isAdmin && (
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