import {
  Mail,
  MessageSquare,
  Phone,
  Layers,
  Calendar,
  Users,
  Download,
  TrendingUp,
  Eye,
  MousePointer,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  ArrowUpRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Campaign } from "./CampaignCard";

interface CampaignDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
}

const typeIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  "multi-channel": Layers,
};

const statusConfig = {
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  scheduled: { label: "Scheduled", className: "bg-info/10 text-info border-info/20" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  paused: { label: "Paused", className: "bg-warning/10 text-warning border-warning/20" },
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground border-border" },
};

// Mock analytics data
const generateAnalytics = (campaign: Campaign) => ({
  email: {
    sent: 1250,
    delivered: 1180,
    opened: 456,
    clicked: 89,
    bounced: 70,
    openRate: 38.6,
    clickRate: 7.5,
    bounceRate: 5.6,
  },
  sms: {
    sent: 800,
    delivered: 780,
    read: 650,
    failed: 20,
    deliveryRate: 97.5,
    readRate: 83.3,
  },
  whatsapp: {
    sent: 500,
    delivered: 495,
    seen: 420,
    replied: 85,
    failed: 5,
    deliveryRate: 99,
    seenRate: 84.8,
  },
  leads: {
    generated: 34,
    converted: 12,
    conversionRate: 35.3,
  },
});

// Mock timeline data
const generateTimeline = () => [
  { id: 1, action: "Campaign Created", timestamp: "2024-01-15 09:00", status: "completed" },
  { id: 2, action: "Campaign Sent", timestamp: "2024-01-15 10:00", status: "completed" },
  { id: 3, action: "First Opens", timestamp: "2024-01-15 10:15", status: "completed" },
  { id: 4, action: "First Clicks", timestamp: "2024-01-15 10:30", status: "completed" },
  { id: 5, action: "First Lead Generated", timestamp: "2024-01-15 11:00", status: "completed" },
  { id: 6, action: "50% Opens Reached", timestamp: "2024-01-15 14:00", status: "completed" },
  { id: 7, action: "Campaign Completed", timestamp: "2024-01-16 10:00", status: "pending" },
];

export function CampaignDetailsDialog({
  open,
  onOpenChange,
  campaign,
}: CampaignDetailsDialogProps) {
  if (!campaign) return null;

  const TypeIcon = typeIcons[campaign.type];
  const status = statusConfig[campaign.status];
  const analytics = generateAnalytics(campaign);
  const timeline = generateTimeline();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              campaign.type === "email" && "bg-primary/10 text-primary",
              campaign.type === "sms" && "bg-info/10 text-info",
              campaign.type === "whatsapp" && "bg-success/10 text-success",
              campaign.type === "multi-channel" && "bg-warning/10 text-warning"
            )}>
              <TypeIcon className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">{campaign.name}</DialogTitle>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className={cn("text-xs", status.className)}>
                  {status.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {campaign.targetAudience} • {campaign.leadsCount.toLocaleString()} leads
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <Tabs defaultValue="overview" className="p-6">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Send className="h-4 w-4" />
                    <span className="text-sm">Total Sent</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{analytics.email.sent}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Delivered</span>
                  </div>
                  <p className="text-2xl font-bold text-success">{analytics.email.delivered}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">Opened</span>
                  </div>
                  <p className="text-2xl font-bold text-info">{analytics.email.opened}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Leads Generated</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{analytics.leads.generated}</p>
                </div>
              </div>

              {/* Campaign Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Campaign Details</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">{campaign.type}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Target Audience</span>
                      <span className="font-medium">{campaign.targetAudience}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="font-medium">
                        {new Date(campaign.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    {campaign.endDate && (
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">End Date</span>
                        <span className="font-medium">
                          {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Performance Summary</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Open Rate</span>
                        <span className="font-semibold">{analytics.email.openRate}%</span>
                      </div>
                      <Progress value={analytics.email.openRate} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Click Rate</span>
                        <span className="font-semibold">{analytics.email.clickRate}%</span>
                      </div>
                      <Progress value={analytics.email.clickRate} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Conversion Rate</span>
                        <span className="font-semibold">{analytics.leads.conversionRate}%</span>
                      </div>
                      <Progress value={analytics.leads.conversionRate} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              {/* Email Analytics */}
              {(campaign.type === "email" || campaign.type === "multi-channel") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Email Analytics</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold">{analytics.email.sent}</p>
                      <p className="text-sm text-muted-foreground">Sent</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-success">{analytics.email.delivered}</p>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-info">{analytics.email.opened}</p>
                      <p className="text-sm text-muted-foreground">Opened ({analytics.email.openRate}%)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-primary">{analytics.email.clicked}</p>
                      <p className="text-sm text-muted-foreground">Clicked ({analytics.email.clickRate}%)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-destructive">{analytics.email.bounced}</p>
                      <p className="text-sm text-muted-foreground">Bounced ({analytics.email.bounceRate}%)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Analytics */}
              {(campaign.type === "sms" || campaign.type === "multi-channel") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-info" />
                    <h4 className="font-semibold">SMS Analytics</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold">{analytics.sms.sent}</p>
                      <p className="text-sm text-muted-foreground">Sent</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-success">{analytics.sms.delivered}</p>
                      <p className="text-sm text-muted-foreground">Delivered ({analytics.sms.deliveryRate}%)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-info">{analytics.sms.read}</p>
                      <p className="text-sm text-muted-foreground">Read ({analytics.sms.readRate}%)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-destructive">{analytics.sms.failed}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp Analytics */}
              {(campaign.type === "whatsapp" || campaign.type === "multi-channel") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-success" />
                    <h4 className="font-semibold">WhatsApp Analytics</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold">{analytics.whatsapp.sent}</p>
                      <p className="text-sm text-muted-foreground">Sent</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-success">{analytics.whatsapp.delivered}</p>
                      <p className="text-sm text-muted-foreground">Delivered ({analytics.whatsapp.deliveryRate}%)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-info">{analytics.whatsapp.seen}</p>
                      <p className="text-sm text-muted-foreground">Seen ({analytics.whatsapp.seenRate}%)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-primary">{analytics.whatsapp.replied}</p>
                      <p className="text-sm text-muted-foreground">Replied</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-2xl font-bold text-destructive">{analytics.whatsapp.failed}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Leads Generated */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Lead Generation</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-2xl font-bold text-primary">{analytics.leads.generated}</p>
                    <p className="text-sm text-muted-foreground">Leads Generated</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                    <p className="text-2xl font-bold text-success">{analytics.leads.converted}</p>
                    <p className="text-sm text-muted-foreground">Converted</p>
                  </div>
                  <div className="p-4 rounded-xl bg-info/10 border border-info/20">
                    <p className="text-2xl font-bold text-info">{analytics.leads.conversionRate}%</p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-6">
              <div className="relative">
                {timeline.map((event, index) => (
                  <div key={event.id} className="flex gap-4 pb-6">
                    <div className="relative flex flex-col items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        event.status === "completed" 
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {event.status === "completed" ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-foreground">{event.action}</p>
                      <p className="text-sm text-muted-foreground">{event.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
