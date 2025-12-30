import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CampaignStep } from './types';

interface Step {
  id: CampaignStep;
  label: string;
  labelAr: string;
}

const steps: Step[] = [
  { id: 'channel', label: 'Channel', labelAr: 'القناة' },
  { id: 'connection', label: 'Connection', labelAr: 'الاتصال' },
  { id: 'type', label: 'Type', labelAr: 'النوع' },
  { id: 'template', label: 'Template', labelAr: 'القالب' },
  { id: 'audience', label: 'Audience', labelAr: 'الجمهور' },
  { id: 'schedule', label: 'Schedule', labelAr: 'الجدولة' },
  { id: 'review', label: 'Review', labelAr: 'المراجعة' },
];

interface CampaignStepIndicatorProps {
  currentStep: CampaignStep;
  completedSteps: CampaignStep[];
  onStepClick?: (step: CampaignStep) => void;
  isRTL?: boolean;
}

export function CampaignStepIndicator({ 
  currentStep, 
  completedSteps, 
  onStepClick,
  isRTL = false 
}: CampaignStepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full overflow-x-auto pb-2 no-scrollbar">
      <div className={cn("flex items-center gap-2 min-w-max", isRTL && "flex-row-reverse")}>
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          const canClick = isCompleted || isPast;

          return (
            <div key={step.id} className={cn("flex items-center", isRTL && "flex-row-reverse")}>
              <button
                onClick={() => canClick && onStepClick?.(step.id)}
                disabled={!canClick}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  isCurrent && "bg-primary text-primary-foreground shadow-md",
                  isCompleted && !isCurrent && "bg-success/10 text-success hover:bg-success/20 cursor-pointer",
                  !isCurrent && !isCompleted && "bg-muted/50 text-muted-foreground",
                  canClick && !isCurrent && "hover:bg-muted cursor-pointer"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2",
                  isCurrent && "border-primary-foreground bg-primary-foreground/20",
                  isCompleted && !isCurrent && "border-success bg-success text-success-foreground",
                  !isCurrent && !isCompleted && "border-muted-foreground/30"
                )}>
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">
                  {isRTL ? step.labelAr : step.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-6 h-0.5 mx-1",
                  index < currentIndex ? "bg-success" : "bg-muted-foreground/20"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
