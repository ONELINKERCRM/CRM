import { cn } from "@/lib/utils";
import { useStages } from "@/contexts/StagesContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, X } from "lucide-react";

interface StageBadgeProps {
  stage: string;
  stageColor?: string;
  className?: string;
  showTooltip?: boolean;
}

export function StageBadge({ stage, stageColor, className, showTooltip = false }: StageBadgeProps) {
  const { stages } = useStages();
  
  // Find the stage in context by name or id
  const stageData = stages.find(s => 
    s.name.toLowerCase() === stage.toLowerCase() || 
    s.id.toLowerCase() === stage.toLowerCase()
  );
  
  // Use provided color, then context color, then colorful fallback based on name
  const getFallbackColor = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('new')) return '#3B82F6';
    if (lowerName.includes('contact')) return '#8B5CF6';
    if (lowerName.includes('qualif')) return '#06B6D4';
    if (lowerName.includes('meet')) return '#EC4899';
    if (lowerName.includes('view')) return '#14B8A6';
    if (lowerName.includes('follow')) return '#A855F7';
    if (lowerName.includes('proposal')) return '#F59E0B';
    if (lowerName.includes('negoti')) return '#F97316';
    if (lowerName.includes('contract')) return '#84CC16';
    if (lowerName.includes('won') || lowerName.includes('closed')) return '#10B981';
    if (lowerName.includes('lost')) return '#EF4444';
    return '#3B82F6'; // Blue as default fallback
  };
  
  const color = stageColor || stageData?.color || getFallbackColor(stage);
  const stageName = stageData?.name || stage;
  
  // Determine if this is a won or lost stage based on name
  const isWon = stageName.toLowerCase().includes('won') || stageName.toLowerCase().includes('closed - won');
  const isLost = stageName.toLowerCase().includes('lost') || stageName.toLowerCase().includes('no answer');
  
  const renderIcon = () => {
    if (isWon) {
      return (
        <span 
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </span>
      );
    }
    if (isLost) {
      return (
        <X className="w-4 h-4 flex-shrink-0" style={{ color }} strokeWidth={3} />
      );
    }
    return (
      <span 
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      />
    );
  };
  
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm font-medium text-foreground",
        className
      )}
    >
      {renderIcon()}
      {stageName}
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
            <p className="font-medium">{stageName}</p>
            {stageData?.category && (
              <p className="text-xs text-muted-foreground capitalize">{stageData.category} stage</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}