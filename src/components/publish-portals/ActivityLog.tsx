import { Clock, Check, X, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PublishActivity } from "./types";

interface ActivityLogProps {
  activities: PublishActivity[];
}

const actionStyles = {
  published: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-100" },
  unpublished: { icon: X, color: "text-muted-foreground", bg: "bg-muted" },
  updated: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-100" },
  failed: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
};

export function ActivityLog({ activities }: ActivityLogProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No publishing activity yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {activities.map((activity) => {
              const style = actionStyles[activity.action];
              const Icon = style.icon;

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
                >
                  <div className={cn("p-1.5 rounded-full", style.bg)}>
                    <Icon className={cn("h-3.5 w-3.5", style.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{activity.portalName}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {activity.action}
                      </Badge>
                    </div>
                    {activity.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.details}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
