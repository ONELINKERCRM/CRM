import { Check, X, AlertTriangle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PortalCustomization } from "./types";

interface ValidationStatusProps {
  customizations: Record<string, PortalCustomization>;
  selectedPortals: string[];
}

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  action: () => void;
}

export function ValidationStatus({
  customizations,
  selectedPortals,
}: ValidationStatusProps) {
  const allErrors: { portal: string; error: string }[] = [];
  const allWarnings: { portal: string; warning: string }[] = [];

  selectedPortals.forEach((portalId) => {
    const cust = customizations[portalId];
    if (cust) {
      cust.errors.forEach((error) => {
        allErrors.push({ portal: portalId, error });
      });
      // Add warnings for low scores
      if (cust.validationScore < 90 && cust.validationScore >= 70) {
        allWarnings.push({
          portal: portalId,
          warning: "Some optional fields are missing",
        });
      }
    }
  });

  const avgScore = selectedPortals.length > 0
    ? Math.round(
        selectedPortals.reduce(
          (sum, id) => sum + (customizations[id]?.validationScore || 0),
          0
        ) / selectedPortals.length
      )
    : 0;

  const scoreColor =
    avgScore >= 90
      ? "text-emerald-600"
      : avgScore >= 70
      ? "text-amber-600"
      : "text-red-600";

  const smartSuggestions: SmartSuggestion[] = [
    {
      id: "enhance-desc",
      title: "Enhance Descriptions",
      description: "Auto-generate SEO-optimized descriptions for all portals",
      action: () => {},
    },
    {
      id: "best-cover",
      title: "Optimal Cover Image",
      description: "Recommend the best image as cover based on quality analysis",
      action: () => {},
    },
    {
      id: "keyword-boost",
      title: "Boost SEO Keywords",
      description: "Add high-ranking keywords for better portal visibility",
      action: () => {},
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Validation Status</span>
          <span className={cn("text-2xl font-bold", scoreColor)}>{avgScore}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress
          value={avgScore}
          className={cn(
            "h-3",
            avgScore >= 90
              ? "[&>div]:bg-emerald-500"
              : avgScore >= 70
              ? "[&>div]:bg-amber-500"
              : "[&>div]:bg-red-500"
          )}
        />

        {/* Errors */}
        {allErrors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600 flex items-center gap-1">
              <X className="h-4 w-4" />
              {allErrors.length} Error{allErrors.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
              {allErrors.slice(0, 3).map((item, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-5">
                  • {item.error}
                </p>
              ))}
              {allErrors.length > 3 && (
                <p className="text-xs text-muted-foreground pl-5">
                  +{allErrors.length - 3} more errors
                </p>
              )}
            </div>
          </div>
        )}

        {/* Warnings */}
        {allWarnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {allWarnings.length} Warning{allWarnings.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1">
              {allWarnings.map((item, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-5">
                  • {item.warning}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* All Good */}
        {allErrors.length === 0 && allWarnings.length === 0 && selectedPortals.length > 0 && (
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">All validations passed!</span>
          </div>
        )}

        {/* Smart Suggestions */}
        <div className="pt-2 border-t">
          <p className="text-sm font-medium flex items-center gap-1 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Smart Suggestions
          </p>
          <div className="space-y-2">
            {smartSuggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-auto py-2 px-3 text-left"
                onClick={suggestion.action}
              >
                <div>
                  <p className="text-sm font-medium">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.description}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
