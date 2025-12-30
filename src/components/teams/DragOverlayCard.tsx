import { Agent, roleLabels, statusColors } from './types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragOverlayCardProps {
  agent: Agent;
}

export function DragOverlayCard({ agent }: DragOverlayCardProps) {
  const initials = agent.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-card border-2 border-primary shadow-2xl cursor-grabbing">
      <div className="p-1">
        <GripVertical className="h-4 w-4 text-primary" />
      </div>
      <Avatar className="h-12 w-12 border-2 border-primary">
        <AvatarImage src={agent.avatar} alt={agent.name} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-foreground truncate">{agent.name}</h4>
          <Badge variant="outline" className="text-xs">
            {roleLabels[agent.role]}
          </Badge>
          <Badge className={cn('text-xs', statusColors[agent.status])}>
            {agent.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{agent.email}</p>
      </div>
    </div>
  );
}
