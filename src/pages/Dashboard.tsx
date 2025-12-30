import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Settings2,
  Check,
  UserCheck,
  PhoneCall,
  Target,
  DollarSign,
  Clock,
  BarChart3,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StageBadge } from "@/components/ui/stage-badge";
import { Button } from "@/components/ui/button";
import { DashboardFilters, DashboardFiltersState } from "@/components/dashboard/DashboardFilters";
import { OnboardingWidget } from '@/components/dashboard/OnboardingWidget';
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const activityIcons = {
  call: Phone,
  email: Mail,
  note: FileText,
  whatsapp: MessageSquare,
  meeting: Calendar,
  followup: Clock,
};

// Available metrics for stat cards - values will be filled from real data
const getAvailableMetrics = (
  t: (key: string) => string,
  formatCurrency: (amount: number) => string,
  metrics: {
    totalLeads: number;
    totalLeadsChange: number;
    newLeadsToday: number;
    activeListings: number;
    listingsChange: number;
    meetingsToday: number;
    conversionRate: number;
    followUpsDue: number;
    overdueFollowUps: number;
    callsToday: number;
    hotLeads: number;
  }
) => [
    { id: "total-leads", titleKey: "total_leads", value: metrics.totalLeads.toLocaleString(), changeKey: "from_last_month", changeValue: `${metrics.totalLeadsChange >= 0 ? '+' : ''}${metrics.totalLeadsChange}%`, changeType: metrics.totalLeadsChange >= 0 ? "positive" as const : "negative" as const, icon: Users, iconColor: "bg-primary/10 text-primary" },
    { id: "conversion-rate", titleKey: "conversion_rate", value: `${metrics.conversionRate}%`, changeKey: "from_last_month", changeValue: "", changeType: "neutral" as const, icon: TrendingUp, iconColor: "bg-success/10 text-success" },
    { id: "active-listings", titleKey: "active_listings", value: metrics.activeListings.toString(), changeKey: "from_last_week", changeValue: `${metrics.listingsChange >= 0 ? '+' : ''}${metrics.listingsChange}`, changeType: metrics.listingsChange >= 0 ? "positive" as const : "negative" as const, icon: Building2, iconColor: "bg-warning/10 text-warning" },
    { id: "meetings-today", titleKey: "meetings_today", value: metrics.meetingsToday.toString(), changeKey: "today", changeValue: "", changeType: "neutral" as const, icon: Calendar, iconColor: "bg-info/10 text-info" },
    { id: "new-leads", titleKey: "new_leads", value: metrics.newLeadsToday.toString(), changeKey: "today", changeValue: "", changeType: "positive" as const, icon: UserCheck, iconColor: "bg-emerald/10 text-emerald-600" },
    { id: "follow-ups", titleKey: "follow_ups_due", value: metrics.followUpsDue.toString(), changeKey: "overdue", changeValue: metrics.overdueFollowUps.toString(), changeType: metrics.overdueFollowUps > 0 ? "negative" as const : "neutral" as const, icon: Clock, iconColor: "bg-orange-100 text-orange-600" },
    { id: "calls-made", titleKey: "calls_made", value: metrics.callsToday.toString(), changeKey: "today", changeValue: "", changeType: "positive" as const, icon: PhoneCall, iconColor: "bg-blue-100 text-blue-600" },
    { id: "hot-leads", titleKey: "hot_leads", value: metrics.hotLeads.toString(), changeKey: "ready_to_close", changeValue: "", changeType: "neutral" as const, icon: Target, iconColor: "bg-red-100 text-red-600" },
  ];

const DEFAULT_METRICS = ["total-leads", "conversion-rate", "active-listings", "meetings-today"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { t, formatCurrency, formatRelativeTime, isRTL } = useLocalization();
  const isMobile = useIsMobile();

  // Fetch real dashboard data
  const {
    metrics: dashboardMetrics,
    leadsTrend: leadsTrendData,
    leadsByStage: leadsByStageData,
    leadsBySource: leadsBySourceData,
    agentPerformance,
    recentActivities,
    isLoading: isDataLoading,
    refetch,
  } = useDashboardData();

  const [filters, setFilters] = useState<DashboardFiltersState>({
    dateRange: { from: undefined, to: undefined },
    datePreset: "this-month",
    agents: [],
    sources: [],
    statuses: [],
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_METRICS);
  const [tempSelectedMetrics, setTempSelectedMetrics] = useState<string[]>(selectedMetrics);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = async () => {
    await refetch();
    toast.success("Dashboard refreshed");
  };

  // Load preferences from database on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("dashboard_preferences")
        .eq("id", user.id)
        .single();

      if (!error && data?.dashboard_preferences) {
        const prefs = data.dashboard_preferences as { metrics?: string[] };
        if (prefs.metrics && Array.isArray(prefs.metrics)) {
          setSelectedMetrics(prefs.metrics);
        }
      }
      setIsLoading(false);
    };

    loadPreferences();
  }, [user?.id]);

  // Get current hour to determine greeting
  const currentHour = new Date().getHours();
  const getGreeting = () => {
    if (currentHour < 12) return t('good_morning');
    if (currentHour < 17) return t('good_afternoon');
    return t('good_evening');
  };

  // Get available metrics with translations and real data
  const availableMetrics = getAvailableMetrics(t, formatCurrency, dashboardMetrics);

  // Get user's first name from profile or email
  const userName = profile?.first_name || user?.email?.split("@")[0] || "there";

  const handleOpenCustomize = () => {
    setTempSelectedMetrics(selectedMetrics);
    setIsCustomizeOpen(true);
  };

  const handleSaveCustomize = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ dashboard_preferences: { metrics: tempSelectedMetrics } })
      .eq("id", user.id);

    setIsSaving(false);

    if (error) {
      toast.error("Failed to save preferences");
      return;
    }

    setSelectedMetrics(tempSelectedMetrics);
    setIsCustomizeOpen(false);
    toast.success("Dashboard customized successfully");
  };

  const handleMetricChange = (position: number, metricId: string) => {
    const newMetrics = [...tempSelectedMetrics];
    newMetrics[position] = metricId;
    setTempSelectedMetrics(newMetrics);
  };

  const getMetricById = (id: string) => availableMetrics.find(m => m.id === id);

  const content = (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header - Enhanced */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-4 sm:p-6">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/4 w-24 h-24 bg-primary/10 rounded-full blur-2xl translate-y-1/2" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                {getGreeting()}, {userName}!
              </h1>
              <span className="text-2xl sm:text-3xl animate-pulse">👋</span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t('crm_overview')}
            </p>
            {/* Quick stats inline */}
            <div className="flex items-center gap-4 pt-2 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span><strong className="text-foreground">{dashboardMetrics.newLeadsToday}</strong> {t('new_leads').toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span><strong className="text-foreground">{dashboardMetrics.meetingsToday}</strong> {t('meeting').toLowerCase()}s</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DashboardFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </div>
      </div>

      {/* Onboarding Widget */}
      <OnboardingWidget />

      {/* Stats Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">{t('key_metrics')}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 sm:h-8 gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
            onClick={handleOpenCustomize}
          >
            <Settings2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('customize')}</span>
          </Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {selectedMetrics.map((metricId) => {
            const metric = getMetricById(metricId);
            if (!metric) return null;
            const title = t(metric.titleKey);
            const change = metric.changeValue ? `${metric.changeValue} ${t(metric.changeKey)}` : t(metric.changeKey);
            return (
              <StatCard
                key={metric.id}
                title={title}
                value={metric.value}
                change={change}
                changeType={metric.changeType}
                icon={metric.icon}
                iconColor={metric.iconColor}
              />
            );
          })}
        </div>
      </div>

      {/* Customize Dialog */}
      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Dashboard Metrics</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Choose which metrics to display in each position on your dashboard.
            </p>
            {[0, 1, 2, 3].map((position) => (
              <div key={position} className="space-y-2">
                <Label className="text-xs text-muted-foreground">Position {position + 1}</Label>
                <Select
                  value={tempSelectedMetrics[position]}
                  onValueChange={(value) => handleMetricChange(position, value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {availableMetrics.map((metric) => (
                      <SelectItem
                        key={metric.id}
                        value={metric.id}
                        disabled={tempSelectedMetrics.includes(metric.id) && tempSelectedMetrics[position] !== metric.id}
                      >
                        <div className="flex items-center gap-2">
                          <metric.icon className="h-4 w-4" />
                          {t(metric.titleKey)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomizeOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomize} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Leads Trend Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base font-semibold">Leads Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[200px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsTrendData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLeads)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leads by Stage */}
        <Card className="shadow-card">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base font-semibold">Leads by Stage</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 h-[160px] sm:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsByStageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 40 : 60}
                      outerRadius={isMobile ? 65 : 90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {leadsByStageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:flex-1 grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-1.5 sm:gap-y-2">
                {leadsByStageData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground flex-1 truncate">{item.name}</span>
                    <span className="text-xs sm:text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads by Source */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsBySourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis dataKey="source" type="category" stroke="#9CA3AF" fontSize={12} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="leads" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agentPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No agent data available</p>
            ) : (
              agentPerformance.map((agent, index) => (
                <div key={agent.id || agent.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${agent.avatar}`} />
                    <AvatarFallback>{agent.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.leads} leads • {agent.closed} closed</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Activities</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1"
            onClick={() => navigate("/activities")}
          >
            See All Activities
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activities</p>
            ) : (
              recentActivities.map((activity) => {
                const Icon = activityIcons[activity.type as keyof typeof activityIcons] || FileText;
                return (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 smooth">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.avatar}`} />
                      <AvatarFallback>{activity.agent?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.agent}</span>
                        <span className="text-muted-foreground"> made a {activity.type} with </span>
                        <span className="font-medium">{activity.lead}</span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Show skeleton while loading
  if (isLoading || isDataLoading) {
    return <DashboardSkeleton />;
  }

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="h-full -m-3 p-3">
        {content}
      </PullToRefresh>
    );
  }

  return content;
}
