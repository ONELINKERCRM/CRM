import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode, isValidElement } from "react";

interface EmptyStateProps {
  icon: LucideIcon | ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: IconOrElement,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}: EmptyStateProps) {
  // Render the icon based on its type
  const renderIcon = () => {
    // If it's a valid React element (JSX), render it directly
    if (isValidElement(IconOrElement)) {
      return IconOrElement;
    }
    // If it's a component function (LucideIcon), render it with props
    if (typeof IconOrElement === 'function') {
      const Icon = IconOrElement as LucideIcon;
      return <Icon className="h-8 w-8 text-muted-foreground/60" />;
    }
    // Fallback for other types
    return null;
  };
  
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        {renderIcon()}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
