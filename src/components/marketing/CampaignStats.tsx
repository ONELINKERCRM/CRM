import {
  Send,
  Users,
  TrendingUp,
  Eye,
  MousePointer,
  Mail,
  MessageSquare,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CampaignStatsProps {
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalLeadsReached: number;
    avgOpenRate: number;
    avgClickRate: number;
    leadsGenerated: number;
  };
}

export function CampaignStats({ stats }: CampaignStatsProps) {
  const statItems = [
    {
      label: "Total Campaigns",
      value: stats.totalCampaigns,
      icon: Mail,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Active Campaigns",
      value: stats.activeCampaigns,
      icon: Zap,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Leads Reached",
      value: stats.totalLeadsReached.toLocaleString(),
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Avg. Open Rate",
      value: `${stats.avgOpenRate}%`,
      icon: Eye,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Avg. Click Rate",
      value: `${stats.avgClickRate}%`,
      icon: MousePointer,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Leads Generated",
      value: stats.leadsGenerated,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", item.bgColor)}>
                <item.icon className={cn("h-5 w-5", item.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SmartSuggestions() {
  const suggestions = [
    {
      title: "Follow-up with Cold Leads",
      description: "156 leads haven't been contacted in 30+ days",
      action: "Create Re-engagement Campaign",
      icon: Users,
    },
    {
      title: "Best Time to Send",
      description: "Your leads are most active on Tuesdays at 10 AM",
      action: "Schedule Campaign",
      icon: TrendingUp,
    },
    {
      title: "New Property Alert",
      description: "12 new listings match 89 lead preferences",
      action: "Send Property Alerts",
      icon: Sparkles,
    },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Suggestions</h3>
        </div>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted smooth cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <suggestion.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                  <p className="text-xs text-primary mt-1 font-medium">{suggestion.action} →</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
