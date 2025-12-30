import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GroupBadgeProps {
  groupId?: string;
  groupName?: string;
  groupColor?: string;
  className?: string;
  showTooltip?: boolean;
}

export function GroupBadge({ groupId, groupName, groupColor, className, showTooltip = false }: GroupBadgeProps) {
  // Don't render if no group name provided
  if (!groupName) {
    return null;
  }
  
  const color = groupColor || '#8b5cf6';
  
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium text-foreground",
        className
      )}
    >
      <span 
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {groupName}
    </span>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{groupName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}