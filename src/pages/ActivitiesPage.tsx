import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAllActivities, ActivityType, Activity } from "@/hooks/useAllActivities";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useCrmLeads } from "@/hooks/useCrmLeads";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageContent } from "@/components/layout/PageContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format, parseISO, isToday, isSameDay } from "date-fns";
import {
  Search,
  Plus,
  Download,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  MessageSquare,
  CheckCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronLeft,
  Users,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

const activityTypeConfig: Record<ActivityType, { label: string; icon: any; color: string; bgColor: string }> = {
  call: { label: "Phone Call", icon: Phone, color: "text-blue-600", bgColor: "bg-blue-500" },
  email: { label: "Email", icon: Mail, color: "text-purple-600", bgColor: "bg-purple-500" },
  meeting: { label: "Meeting", icon: CalendarIcon, color: "text-green-600", bgColor: "bg-green-500" },
  note: { label: "Note", icon: FileText, color: "text-amber-600", bgColor: "bg-amber-500" },
  voicenote: { label: "Voice Note", icon: MessageSquare, color: "text-pink-600", bgColor: "bg-pink-500" },
  stage: { label: "Stage Change", icon: ArrowUpDown, color: "text-orange-600", bgColor: "bg-orange-500" },
  followup: { label: "Follow Up", icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-500" },
  attachment: { label: "Attachment", icon: FileText, color: "text-indigo-600", bgColor: "bg-indigo-500" },
  other: { label: "Other", icon: MessageSquare, color: "text-cyan-600", bgColor: "bg-cyan-500" },
};

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [pageSize] = useState(50);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [typeFilters, setTypeFilters] = useState<Set<ActivityType>>(new Set());
  const [agentFilters, setAgentFilters] = useState<Set<string>>(new Set());
  const [agentSearch, setAgentSearch] = useState("");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Form states
  const [formType, setFormType] = useState<ActivityType>("call");
  const [formSubject, setFormSubject] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [formOwnerId, setFormOwnerId] = useState("");
  const [formScheduledAt, setFormScheduledAt] = useState<Date | undefined>();

  const filters = useMemo(() => ({
    type: typeFilters.size === 1 ? Array.from(typeFilters)[0] : undefined,
    owner_id: agentFilters.size === 1 ? Array.from(agentFilters)[0] : undefined,
  }), [typeFilters, agentFilters]);

  const {
    activities,
    totalCount,
    isLoading,
    isAdminOrManager,
    createActivity,
    updateActivity,
    deleteActivity,
    getProfile,
  } = useAllActivities({ filters, page, pageSize });

  const { members } = useOrganizationMembers();
  const { leads } = useCrmLeads();

  // Filter activities by selected date and type/agent filters
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const activityDate = activity.scheduled_at 
        ? parseISO(activity.scheduled_at) 
        : parseISO(activity.created_at);
      
      // Date filter
      if (!isSameDay(activityDate, selectedDate)) return false;
      
      // Type filter
      if (typeFilters.size > 0 && !typeFilters.has(activity.type)) return false;
      
      // Agent filter
      if (agentFilters.size > 0 && activity.owner_id && !agentFilters.has(activity.owner_id)) return false;
      
      return true;
    });
  }, [activities, selectedDate, typeFilters, agentFilters]);

  // Group activities by date for timeline
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    
    filteredActivities.forEach((activity) => {
      const date = activity.scheduled_at 
        ? format(parseISO(activity.scheduled_at), "yyyy-MM-dd")
        : format(parseISO(activity.created_at), "yyyy-MM-dd");
      
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
    });

    // Sort by date descending
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        activities: items.sort((a, b) => {
          const timeA = a.scheduled_at || a.created_at;
          const timeB = b.scheduled_at || b.created_at;
          return timeB.localeCompare(timeA);
        }),
      }));
  }, [filteredActivities]);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!agentSearch) return members;
    const search = agentSearch.toLowerCase();
    return members.filter((m) => {
      const name = `${m.profile?.first_name || ""} ${m.profile?.last_name || ""}`.toLowerCase();
      return name.includes(search);
    });
  }, [members, agentSearch]);

  const activeFiltersCount = typeFilters.size + agentFilters.size;

  const toggleTypeFilter = (type: ActivityType) => {
    const newFilters = new Set(typeFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setTypeFilters(newFilters);
  };

  const toggleAgentFilter = (agentId: string) => {
    const newFilters = new Set(agentFilters);
    if (newFilters.has(agentId)) {
      newFilters.delete(agentId);
    } else {
      newFilters.add(agentId);
    }
    setAgentFilters(newFilters);
  };

  const resetForm = () => {
    setFormType("call");
    setFormSubject("");
    setFormDescription("");
    setFormLeadId("");
    setFormOwnerId("");
    setFormScheduledAt(undefined);
  };

  const handleAddActivity = async () => {
    if (!formSubject.trim()) {
      toast.error("Subject is required");
      return;
    }

    try {
      await createActivity({
        type: formType,
        subject: formSubject,
        description: formDescription || undefined,
        lead_id: formLeadId || undefined,
        owner_id: formOwnerId || undefined,
        scheduled_at: formScheduledAt?.toISOString(),
      });
      toast.success("Activity added successfully");
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add activity");
      console.error(error);
    }
  };

  const handleEditActivity = async () => {
    if (!selectedActivity || !formSubject.trim()) {
      toast.error("Subject is required");
      return;
    }

    try {
      await updateActivity(selectedActivity.id, {
        type: formType,
        subject: formSubject,
        description: formDescription || undefined,
        lead_id: formLeadId || undefined,
        owner_id: formOwnerId || undefined,
        scheduled_at: formScheduledAt?.toISOString(),
      });
      toast.success("Activity updated successfully");
      setShowEditDialog(false);
      setSelectedActivity(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to update activity");
      console.error(error);
    }
  };

  const handleDeleteActivity = async () => {
    if (!selectedActivity) return;

    try {
      await deleteActivity(selectedActivity.id);
      toast.success("Activity deleted successfully");
      setShowDeleteDialog(false);
      setSelectedActivity(null);
    } catch (error) {
      toast.error("Failed to delete activity");
      console.error(error);
    }
  };

  const openEditDialog = (activity: Activity) => {
    setSelectedActivity(activity);
    setFormType(activity.type);
    setFormSubject(activity.subject);
    setFormDescription(activity.description || "");
    setFormLeadId(activity.lead_id || "");
    setFormOwnerId(activity.owner_id || "");
    setFormScheduledAt(activity.scheduled_at ? parseISO(activity.scheduled_at) : undefined);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowDeleteDialog(true);
  };

  const handleExport = () => {
    const exportData = filteredActivities.map((a) => {
      const ownerProfile = getProfile(a.owner_id);
      return {
        "Lead Name": a.lead ? `${a.lead.first_name} ${a.lead.last_name || ""}`.trim() : "-",
        "Activity Type": activityTypeConfig[a.type]?.label || a.type,
        "Title": a.subject,
        "Description": a.description || "",
        "Assigned Agent": ownerProfile ? `${ownerProfile.first_name || ""} ${ownerProfile.last_name || ""}`.trim() : "-",
        "Activity Date": a.scheduled_at ? format(parseISO(a.scheduled_at), "PPp") : "-",
        "Created At": format(parseISO(a.created_at), "PPp"),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activities");
    XLSX.writeFile(workbook, `activities_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exported successfully");
  };

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return { main: format(date, "MMM d, yyyy"), sub: "Today" };
    }
    return { main: format(date, "MMM d, yyyy"), sub: format(date, "EEEE") };
  };

  // Filter sidebar content (reused in both desktop sidebar and mobile sheet)
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Calendar Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Calendar</h2>
        <Card>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md"
            />
            <div className="mt-2 flex justify-end">
              <Button
                variant="link"
                size="sm"
                className="text-primary font-medium"
                onClick={() => setSelectedDate(new Date())}
              >
                TODAY
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Filters ({activeFiltersCount})</h2>
        
        {/* Activity Type Filters */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              By Activity Type
            </h3>
            <div className="space-y-2">
              {Object.entries(activityTypeConfig).map(([key, { label, icon: Icon }]) => (
                <label
                  key={key}
                  className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-md -mx-2"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", activityTypeConfig[key as ActivityType].color)} />
                    <span className="text-sm">{label}</span>
                  </div>
                  <Checkbox
                    checked={typeFilters.has(key as ActivityType)}
                    onCheckedChange={() => toggleTypeFilter(key as ActivityType)}
                  />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Member Filters */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              By Team Member
            </h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members"
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="pl-9 bg-muted/50"
              />
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <label
                    key={member.user_id}
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-md -mx-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.profile?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {(member.profile?.first_name?.[0] || "") + (member.profile?.last_name?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {member.profile?.first_name || "Unknown"} {member.profile?.last_name || ""}
                      </span>
                    </div>
                    <Checkbox
                      checked={agentFilters.has(member.user_id)}
                      onCheckedChange={() => toggleAgentFilter(member.user_id)}
                    />
                  </label>
                ))}
                {filteredMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No team members found
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (isLoading && activities.length === 0) {
    return (
      <PageContent className="pb-24 lg:pb-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Activities</h1>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent className="pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg lg:text-xl font-semibold">Activities</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Filter Button */}
          {isMobile && (
            <Sheet open={showFiltersSheet} onOpenChange={setShowFiltersSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filters & Calendar</SheetTitle>
                </SheetHeader>
                <FilterContent />
              </SheetContent>
            </Sheet>
          )}
          {isAdminOrManager && (
            <>
              {!isMobile && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Add Activity</span>}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Date Display */}
      {isMobile && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{format(selectedDate, "MMM d, yyyy")}</span>
            {isToday(selectedDate) && (
              <span className="text-xs text-primary">(Today)</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-xs"
            onClick={() => setShowFiltersSheet(true)}
          >
            Change Date
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Left Sidebar - Calendar & Filters (Desktop Only) */}
        {!isMobile && (
          <div className="hidden lg:block">
            <FilterContent />
          </div>
        )}

        {/* Right Side - Timeline */}
        <div className="lg:col-span-1">
          {!isMobile && <h2 className="text-lg font-semibold mb-3">Timeline</h2>}
          
          {/* Load Previous Button */}
          {page > 1 && (
            <Button
              variant="ghost"
              className="w-full mb-4 text-primary hover:text-primary text-sm"
              onClick={() => setPage(page - 1)}
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              LOAD PREVIOUS
            </Button>
          )}

          {/* Timeline Content */}
          <Card>
            <CardContent className="p-0">
              {groupedActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 lg:py-16 text-muted-foreground px-4">
                  <CalendarIcon className="h-10 w-10 lg:h-12 lg:w-12 mb-4 opacity-50" />
                  <p className="text-base lg:text-lg font-medium text-center">No activities found</p>
                  <p className="text-xs lg:text-sm text-center">Try selecting a different date or adjusting filters</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {groupedActivities.map(({ date, activities: dayActivities }) => {
                    const { main, sub } = formatDateHeader(date);
                    return (
                      <div key={date} className={cn("flex flex-col lg:flex-row")}>
                        {/* Date Column - Only on Desktop */}
                        {!isMobile && (
                          <div className="w-[140px] shrink-0 p-4 border-r border-border bg-muted/30">
                            <p className="font-semibold text-sm">{main}</p>
                            <p className="text-xs text-muted-foreground">{sub}</p>
                            <p className="text-xs text-primary mt-2 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {dayActivities.length} {dayActivities.length === 1 ? "activity" : "activities"}
                            </p>
                          </div>
                        )}

                        {/* Mobile Date Header */}
                        {isMobile && (
                          <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{main}</p>
                              <span className="text-xs text-muted-foreground">({sub})</span>
                            </div>
                            <span className="text-xs text-primary">
                              {dayActivities.length} {dayActivities.length === 1 ? "activity" : "activities"}
                            </span>
                          </div>
                        )}

                        {/* Activities Column */}
                        <div className="flex-1 divide-y divide-border">
                          {dayActivities.map((activity) => {
                            const config = activityTypeConfig[activity.type] || activityTypeConfig.other;
                            const Icon = config.icon;
                            const ownerProfile = getProfile(activity.owner_id);
                            const activityTime = activity.scheduled_at 
                              ? format(parseISO(activity.scheduled_at), "hh:mm a")
                              : format(parseISO(activity.created_at), "hh:mm a");

                            return (
                              <div
                                key={activity.id}
                                className={cn(
                                  "flex items-start gap-3 lg:gap-4 p-3 lg:p-4 hover:bg-muted/30 transition-colors group",
                                  isMobile && "active:bg-muted/50"
                                )}
                              >
                                {/* Time - Hidden on Mobile, shown inline instead */}
                                {!isMobile && (
                                  <span className="text-xs text-muted-foreground w-[60px] shrink-0 pt-1">
                                    {activityTime}
                                  </span>
                                )}

                                {/* Icon Circle */}
                                <div className={cn(
                                  "w-8 h-8 lg:w-8 lg:h-8 rounded-full flex items-center justify-center shrink-0",
                                  config.bgColor
                                )}>
                                  <Icon className="h-4 w-4 text-white" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">
                                        {activity.lead 
                                          ? `${activity.lead.first_name} ${activity.lead.last_name || ""}`.trim()
                                          : activity.subject}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-muted-foreground">{config.label}</span>
                                        {isMobile && (
                                          <span className="text-xs text-muted-foreground">• {activityTime}</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Actions Menu */}
                                    {isAdminOrManager && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                              "h-8 w-8 shrink-0",
                                              !isMobile && "opacity-0 group-hover:opacity-100 transition-opacity"
                                            )}
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => openEditDialog(activity)}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => openDeleteDialog(activity)}
                                            className="text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                  
                                  {activity.description && (
                                    <p className="text-xs lg:text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {activity.description}
                                    </p>
                                  )}
                                  {ownerProfile && (
                                    <p className="text-xs text-muted-foreground mt-1.5 lg:mt-2 flex items-center gap-1">
                                      <span className="inline-block w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-muted" />
                                      by {ownerProfile.first_name || ""} {ownerProfile.last_name || ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Load More */}
          {totalCount > page * pageSize && (
            <Button
              variant="ghost"
              className="w-full mt-4 text-primary hover:text-primary text-sm"
              onClick={() => setPage(page + 1)}
            >
              Load More Activities
            </Button>
          )}
        </div>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>Create a new activity for a lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as ActivityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(activityTypeConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead</Label>
                <Select value={formLeadId} onValueChange={setFormLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads?.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.first_name} {lead.last_name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Activity subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Activity description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select value={formOwnerId} onValueChange={setFormOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profile?.first_name || "Unknown"} {member.profile?.last_name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formScheduledAt ? format(formScheduledAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formScheduledAt} onSelect={setFormScheduledAt} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleAddActivity} className="w-full sm:w-auto">Add Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Activity Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>Update activity details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as ActivityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(activityTypeConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead</Label>
                <Select value={formLeadId} onValueChange={setFormLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads?.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.first_name} {lead.last_name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Activity subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Activity description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select value={formOwnerId} onValueChange={setFormOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profile?.first_name || "Unknown"} {member.profile?.last_name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formScheduledAt ? format(formScheduledAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formScheduledAt} onSelect={setFormScheduledAt} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleEditActivity} className="w-full sm:w-auto">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteActivity} className="w-full sm:w-auto">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
