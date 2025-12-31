import { useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  User,
  Clock,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAssignmentNotifications, AssignmentNotification } from "@/hooks/useLeadAssignment";

export const NotificationsTab = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, fetchNotifications } = useAssignmentNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationClick = async (notification: AssignmentNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    navigate(`/leads/${notification.lead_id}`);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <User className="h-4 w-4 text-primary" />;
      case "reassignment":
        return <RefreshCw className="h-4 w-4 text-warning" />;
      case "urgent":
        return <Bell className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "assignment":
        return <Badge className="bg-primary/10 text-primary border-primary/20">New</Badge>;
      case "reassignment":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Reassigned</Badge>;
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground">Assignment Notifications</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Stay updated on lead assignments, reassignments, and urgent alerts.
                  Agents receive notifications immediately when leads are assigned to them.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
                  <CheckCheck className="h-4 w-4" />
                  Mark All Read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.filter(n => n.is_read).length}</p>
                <p className="text-xs text-muted-foreground">Read</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.notification_type === "reassignment").length}
                </p>
                <p className="text-xs text-muted-foreground">Reassignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.notification_type === "urgent").length}
                </p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Notifications</CardTitle>
          <CardDescription>Click on a notification to view the lead</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Notifications</h3>
              <p className="text-sm text-muted-foreground">
                You're all caught up! Notifications will appear here when leads are assigned.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        !notification.is_read ? "bg-primary/10" : "bg-muted"
                      )}>
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={cn(
                            "text-sm truncate",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          {getNotificationBadge(notification.notification_type)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          Lead: {notification.lead_name}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
