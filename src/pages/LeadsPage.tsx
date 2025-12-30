import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Download,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserPlus,
  Trash2,
  Tag,
  FileSpreadsheet,
  Contact,
  CalendarIcon,
  Loader2,
  Users,
  Layers,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StageBadge } from "@/components/ui/stage-badge";
import { GroupBadge } from "@/components/ui/group-badge";
import { SourceBadge } from "@/components/ui/source-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import { ExcelImportDialog } from "@/components/leads/ExcelImportDialog";
import { ContactsImportDialog } from "@/components/leads/ContactsImportDialog";
import { ReassignLeadsDialog } from "@/components/leads/ReassignLeadsDialog";
import { ChangeStageDialog } from "@/components/leads/ChangeStageDialog";
import { StageManager } from "@/components/leads/StageManager";
import { GroupManager } from "@/components/leads/GroupManager";
import { NewLeadRow } from "@/components/leads/NewLeadRow";
import { MobileLeadCard } from "@/components/leads/MobileLeadCard";
import { DeleteLeadsDialog } from "@/components/leads/DeleteLeadsDialog";
import { LeadsFilterDialog } from "@/components/leads/LeadsFilterDialog";
import { ExportLeadsDialog } from "@/components/leads/ExportLeadsDialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useUserRole } from "@/hooks/useUserRole";
import { LeadsPageSkeleton } from "@/components/ui/page-skeletons";
import { MobileSearchFilter } from "@/components/ui/mobile-search-filter";
import { useStages } from "@/contexts/StagesContext";
import { useGroups } from "@/contexts/GroupsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useLeads, Lead } from "@/hooks/useLeads";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const sources = ["Meta", "TikTok", "Website", "Referral", "Google Ads", "WhatsApp", "Cold Call", "Property Finder"];



function LeadsPageContent() {


  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t, formatRelativeTime, isRTL } = useLocalization();
  const { stages: baseStages = [], setStages } = useStages();

  // Ensure "New" stage exists if not present
  const rawStages = baseStages || [];
  const hasNewStage = rawStages.some(s => s.name === "New");
  // If we have "Uncontacted" leads but no "New" stage, we might need to handle that, 
  // but usually "New" is a default stage.

  const { groups: baseGroups = [], setGroups } = useGroups();
  const { leads: leadsData, isLoading, refetch, setLeads, syncPropertyFinderLeads } = useLeads();
  const leads = leadsData || [];
  const { canDeleteLeads, isAdmin } = useUserRole();
  const { settings: companySettings } = useCompanySettings();

  // Debounced search to prevent excessive filtering
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Calculate lead counts for stages based on actual leads data
  const stages = useMemo(() => {
    return (baseStages || []).map(stage => ({
      ...stage,
      leadCount: leads.filter(lead => {
        const normalized = (!lead.stage || lead.stage === "Uncontacted") ? "New" : lead.stage;
        return normalized === stage.name;
      }).length
    }));
  }, [baseStages, leads]);

  // Calculate lead counts for groups based on actual leads data
  const groups = useMemo(() => {
    return (baseGroups || []).map(group => ({
      ...group,
      leadCount: leads.filter(lead => lead.lead_group?.name === group.name).length
    }));
  }, [baseGroups, leads]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<"stages" | "groups">("stages");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isMobile ? 20 : 10);
  const [sortBy, setSortBy] = useState("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter states
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [createdDateFrom, setCreatedDateFrom] = useState<Date | undefined>(undefined);
  const [createdDateTo, setCreatedDateTo] = useState<Date | undefined>(undefined);
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Extract unique agents and sources from leads data
  const availableAgents = useMemo(() => {
    const uniqueAgents = new Map();
    leads.forEach(l => {
      if (l.agent && l.agent.id) {
        uniqueAgents.set(l.agent.id, l.agent.name || "Unknown Agent");
      }
    });
    return Array.from(uniqueAgents.entries()).map(([id, name]) => ({ id, name }));
  }, [leads]);

  const availableSources = useMemo(() => {
    const s = new Set(sources);
    leads.forEach(l => {
      if (l.source) s.add(l.source);
    });
    return Array.from(s);
  }, [leads]);

  const agentNames = useMemo(() => availableAgents.map(a => a.name).filter(Boolean), [availableAgents]);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isContactsImportOpen, setIsContactsImportOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isChangeStageOpen, setIsChangeStageOpen] = useState(false);
  const [singleLeadAction, setSingleLeadAction] = useState<{ type: 'assign' | 'stage'; leadId: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadsToDelete, setLeadsToDelete] = useState<string[]>([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Infinite scroll state for mobile
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset visible count when any filter changes
  useEffect(() => {
    setVisibleCount(20);
  }, [filterStage, filterGroup, filterSource, filterAgent, searchQuery, createdDateFrom, createdDateTo]);

  // Infinite scroll observer
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 20);
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore]);

  useEffect(() => {
    if (!isMobile || !loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isMobile, handleLoadMore]);

  const handleRefresh = async () => {
    setVisibleCount(20);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Leads refreshed");
  };

  const handleSyncPropertyFinder = async () => {
    // Get company_id from profile - for now use a placeholder
    // In production, this would come from AuthContext
    setIsSyncing(true);
    try {
      const result = await syncPropertyFinderLeads('demo-company-id');
      toast.success(`Synced ${result?.inserted || 0} leads from Property Finder`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFabOption = (option: string) => {
    setIsFabOpen(false);
    switch (option) {
      case "manual":
        setIsAddLeadOpen(true);
        break;
      case "excel":
        setIsExcelImportOpen(true);
        break;
      case "contact":
        setIsContactsImportOpen(true);
        break;
    }
  };

  const handleExcelImport = (leads: Record<string, string>[]) => {
    console.log("Imported leads:", leads);
    // In a real app, this would add leads to the database
  };

  const handleContactsImport = (leads: { name: string; phone: string; email?: string }[]) => {
    console.log("Imported contacts:", leads);
    // In a real app, this would add leads to the database
  };


  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) => {
      const newSelection = prev.includes(id) ? prev.filter((leadId) => leadId !== id) : [...prev, id];
      // Exit selection mode if no leads selected
      if (newSelection.length === 0) {
        setIsSelectionMode(false);
      }
      return newSelection;
    });
  };

  // Long press handlers for mobile selection
  const handleLongPressStart = (id: string) => {
    longPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setIsSelectionMode(true);
      setSelectedLeads((prev) => prev.includes(id) ? prev : [...prev, id]);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLeadCardClick = (id: string) => {
    if (isSelectionMode) {
      toggleSelectLead(id);
    } else {
      navigate(`/leads/${id}`);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setFilterSource("all");
    setFilterStage("all");
    setFilterAgent("all");
    setCreatedDateFrom(undefined);
    setCreatedDateTo(undefined);
  };

  const handleBulkAssign = () => {
    setSingleLeadAction(null);
    setIsReassignOpen(true);
  };

  const handleReassign = (agentId: string, agentName: string) => {
    const leadsToReassign = singleLeadAction ? [singleLeadAction.leadId] : selectedLeads;
    setLeads(prev => prev.map(lead =>
      leadsToReassign.includes(lead.id)
        ? { ...lead, agent: { ...lead.agent, name: agentName } }
        : lead
    ));
    toast.success(`${leadsToReassign.length} lead(s) assigned to ${agentName}`);
    setSelectedLeads([]);
    setSingleLeadAction(null);
  };

  const handleBulkStageChange = () => {
    setSingleLeadAction(null);
    setIsChangeStageOpen(true);
  };

  const handleStageChange = async (stageId: string, stageName: string) => {
    const leadsToChange = singleLeadAction ? [singleLeadAction.leadId] : selectedLeads;

    // Update in database - also mark is_new as false when stage changes
    const { error } = await supabase
      .from("leads")
      .update({
        stage_id: stageId,
        stage: stageName, // Keep text field in sync for backwards compatibility
        is_new: false, // Mark as not new when stage changes
      })
      .in("id", leadsToChange);

    if (error) {
      console.error("Error updating leads stage:", error);
      toast.error("Failed to update lead stages");
      return;
    }

    // Update local state with the stage relation
    const selectedStage = stages.find(s => s.id === stageId);
    setLeads(prev => prev.map(lead =>
      leadsToChange.includes(lead.id)
        ? {
          ...lead,
          stage: stageName,
          stage_id: stageId,
          is_new: false, // Mark as not new
          lead_stage: selectedStage ? {
            id: selectedStage.id,
            name: selectedStage.name,
            color: selectedStage.color,
            position: selectedStage.position || 0,
            is_default: selectedStage.is_default || false,
            is_won: selectedStage.is_won || false,
            is_lost: selectedStage.is_lost || false,
          } : null
        }
        : lead
    ));
    toast.success(`${leadsToChange.length} lead(s) moved to ${stageName}`);
    setSelectedLeads([]);
    setSingleLeadAction(null);
  };

  const handleBulkTag = () => {
    toast.success(`Adding tag to ${selectedLeads.length} leads...`);
  };

  const handleBulkExport = () => {
    toast.success(`Exporting ${selectedLeads.length} leads...`);
  };

  const handleBulkDelete = () => {
    if (!canDeleteLeads) {
      toast.error("Only admins can delete leads");
      return;
    }
    setLeadsToDelete(selectedLeads);
    setIsDeleteDialogOpen(true);
  };

  // Single lead actions from three dots menu
  const handleSingleLeadAssign = (leadId: string) => {
    setSingleLeadAction({ type: 'assign', leadId });
    setIsReassignOpen(true);
  };

  const handleSingleLeadStageChange = (leadId: string) => {
    setSingleLeadAction({ type: 'stage', leadId });
    setIsChangeStageOpen(true);
  };

  const handleSingleLeadDelete = (leadId: string) => {
    if (!canDeleteLeads) {
      toast.error("Only admins can delete leads");
      return;
    }
    setLeadsToDelete([leadId]);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    setLeads(prev => prev.filter(lead => !leadsToDelete.includes(lead.id)));
    setSelectedLeads(prev => prev.filter(id => !leadsToDelete.includes(id)));
    setLeadsToDelete([]);
  };

  // Inline edit handler - also updates is_new in database
  const handleInlineUpdate = async (leadId: string, updates: Partial<Lead>) => {
    // If stage changes or if is_new is explicitly set to false, update in database too
    if (updates.stage || updates.is_new === false) {
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.stage) {
        dbUpdates.is_new = false; // Mark as not new when stage changes
      }
      delete dbUpdates.agent;
      delete dbUpdates.lead_group;
      delete dbUpdates.lead_stage;

      await supabase
        .from("leads")
        .update(dbUpdates)
        .eq("id", leadId);
    }

    // Update local state
    setLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, ...updates, is_new: updates.stage ? false : lead.is_new } : lead
    ));
    toast.success("Lead updated");
  };

  const handleImport = () => {
    setIsExcelImportOpen(true);
  };

  const handleExport = () => {
    setIsExportDialogOpen(true);
  };

  const getSourceBadgeColor = (source: string) => {
    const colors: Record<string, string> = {
      "Meta": "bg-blue-100 text-blue-700 border-blue-200",
      "TikTok": "bg-pink-100 text-pink-700 border-pink-200",
      "Website": "bg-emerald-100 text-emerald-700 border-emerald-200",
      "Referral": "bg-purple-100 text-purple-700 border-purple-200",
      "Google Ads": "bg-red-100 text-red-700 border-red-200",
      "WhatsApp": "bg-green-100 text-green-700 border-green-200",
    };
    return colors[source] || "bg-muted text-muted-foreground";
  };

  // Helper to normalize stage names (e.g. legacy "Uncontacted" -> "New")
  const normalizeStage = (stageName: string | null) => {
    if (!stageName) return "New";
    if (stageName === "Uncontacted") return "New";
    return stageName;
  };

  // Count leads per stage (excluding Lost from "All" count)
  const stageCounts = stages.reduce((acc, stage) => {
    acc[stage.name] = leads.filter(lead => normalizeStage(lead.stage) === stage.name).length;
    return acc;
  }, {} as Record<string, number>);

  // Filter leads: apply all filters
  const filteredLeads = leads.filter(lead => {
    // Hide Lost leads unless specifically filtering by Lost
    if (lead.stage === "Lost" && filterStage !== "Lost" && filterStage !== "all") {
      return false;
    }

    // Apply stage filter
    if (filterStage !== "all" && normalizeStage(lead.stage) !== filterStage) {
      return false;
    }

    // Apply group filter
    if (filterGroup !== "all" && lead.lead_group?.name !== filterGroup) {
      return false;
    }

    // Apply source filter
    if (filterSource !== "all" && lead.source !== filterSource) {
      return false;
    }

    // Apply agent filter
    if (filterAgent !== "all" && lead.agent?.name !== filterAgent) {
      return false;
    }

    // Apply search query
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      const matchesName = lead.name?.toLowerCase().includes(query);
      const matchesPhone = lead.phone?.toLowerCase().includes(query);
      const matchesEmail = lead.email?.toLowerCase().includes(query);
      if (!matchesName && !matchesPhone && !matchesEmail) {
        return false;
      }
    }

    // Apply date filter
    if (createdDateFrom || createdDateTo) {
      const leadDate = new Date(lead.created_at);
      if (createdDateFrom && leadDate < createdDateFrom) {
        return false;
      }
      if (createdDateTo && leadDate > createdDateTo) {
        return false;
      }
    }

    return true;
  });

  // Count for "All" excludes Lost
  const allCount = leads.filter(lead => lead.stage !== "Lost").length;

  // Pagination based on filtered leads
  const totalLeads = filteredLeads.length;
  const totalPages = Math.ceil(totalLeads / pageSize);

  // Get current page leads for select all functionality
  const currentPageLeads = useMemo(() => {
    return filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const toggleSelectAll = () => {
    const currentPageIds = currentPageLeads.map((lead) => lead.id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedLeads.includes(id));

    if (allCurrentPageSelected) {
      // Deselect all current page leads
      setSelectedLeads(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all current page leads (merge with existing selections)
      setSelectedLeads(prev => {
        const newSelection = [...prev];
        currentPageIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const content = (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header - Hidden on mobile */}
      {!isMobile && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">{t('leads')}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">{t('manage_track_leads')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSyncPropertyFinder} disabled={isSyncing} className="flex-1 sm:flex-none">
              <RefreshCw className={cn("h-4 w-4 sm:mr-2", isSyncing && "animate-spin")} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync PF'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('export')}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('add_lead')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsAddLeadOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manual Add
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsExcelImportOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsContactsImportOpen(true)}>
                  <Contact className="h-4 w-4 mr-2" />
                  From Contacts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Stages & Groups Tabs - Desktop only */}
      <Card className="p-3 sm:p-4 hidden lg:block">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "stages" | "groups")}>
          <div className="flex items-center justify-between mb-3">
            <TabsList className="h-8">
              <TabsTrigger value="stages" className="gap-1.5 text-xs px-3">
                <Layers className="h-3.5 w-3.5" />
                Stages
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-1.5 text-xs px-3">
                <Users className="h-3.5 w-3.5" />
                Groups
              </TabsTrigger>
            </TabsList>
            {activeTab === "stages" && filterStage !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setFilterStage("all")}
              >
                <X className="h-3 w-3 mr-1" />
                Clear filter
              </Button>
            )}
            {activeTab === "groups" && filterGroup !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setFilterGroup("all")}
              >
                <X className="h-3 w-3 mr-1" />
                Clear filter
              </Button>
            )}
          </div>
          <TabsContent value="stages" className="mt-0">
            <StageManager
              stages={stages}
              onStagesChange={setStages}
              onStageFilter={(stageName) => setFilterStage(filterStage === stageName ? "all" : stageName)}
              activeStage={filterStage !== "all" ? filterStage : undefined}
              isAdmin={true}
            />
          </TabsContent>
          <TabsContent value="groups" className="mt-0">
            <GroupManager
              groups={groups}
              onGroupsChange={setGroups}
              onGroupFilter={(groupName) => setFilterGroup(filterGroup === groupName ? "all" : groupName)}
              activeGroup={filterGroup !== "all" ? filterGroup : undefined}
              isAdmin={true}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Search & Filters - Desktop Only */}
      <Card className="hidden lg:block p-4 rounded-2xl shadow-subtle border-border/60">
        <div className="flex flex-col gap-3">
          {/* Search - Beautiful Mobile Design */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_leads')}
              className="pl-11 h-12 rounded-2xl bg-muted/40 border-0 text-base focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-background placeholder:text-muted-foreground/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter Row - Modern Pill Design */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {/* Source Filter */}
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className={cn(
                "w-auto min-w-[110px] h-9 rounded-full text-xs font-medium gap-1.5 transition-all flex-shrink-0",
                filterSource !== "all"
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "bg-muted/50 border-transparent hover:bg-muted"
              )}>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="bg-popover rounded-xl">
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Agent Filter */}
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className={cn(
                "w-auto min-w-[100px] h-9 rounded-full text-xs font-medium gap-1.5 transition-all flex-shrink-0",
                filterAgent !== "all"
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "bg-muted/50 border-transparent hover:bg-muted"
              )}>
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent className="bg-popover rounded-xl">
                <SelectItem value="all">All Agents</SelectItem>
                {agentNames.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Stage Filter - Desktop only (mobile uses chips) */}
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className={cn(
                "w-auto min-w-[100px] h-9 rounded-full text-xs font-medium gap-1.5 transition-all hidden lg:flex",
                filterStage !== "all"
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "bg-muted/50 border-transparent hover:bg-muted"
              )}>
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent className="bg-popover rounded-xl">
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 rounded-full text-xs font-medium px-4 transition-all flex-shrink-0",
                    (createdDateFrom || createdDateTo)
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "bg-muted/50 border-transparent hover:bg-muted"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {createdDateFrom ? format(createdDateFrom, "MMM d") : "Date"}
                    {createdDateTo && createdDateFrom ? ` - ${format(createdDateTo, "MMM d")}` : ""}
                  </span>
                  <span className="sm:hidden">Date</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 rounded-2xl" align="start">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={createdDateFrom && format(createdDateFrom, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs rounded-full"
                      onClick={() => {
                        const today = new Date();
                        setCreatedDateFrom(startOfDay(today));
                        setCreatedDateTo(endOfDay(today));
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs rounded-full"
                      onClick={() => {
                        const yesterday = subDays(new Date(), 1);
                        setCreatedDateFrom(startOfDay(yesterday));
                        setCreatedDateTo(endOfDay(yesterday));
                      }}
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs rounded-full"
                      onClick={() => {
                        const today = new Date();
                        setCreatedDateFrom(startOfWeek(today, { weekStartsOn: 1 }));
                        setCreatedDateTo(endOfWeek(today, { weekStartsOn: 1 }));
                      }}
                    >
                      This Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs rounded-full"
                      onClick={() => {
                        const today = new Date();
                        setCreatedDateFrom(startOfMonth(today));
                        setCreatedDateTo(endOfMonth(today));
                      }}
                    >
                      This Month
                    </Button>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">From</span>
                      <Calendar
                        mode="single"
                        selected={createdDateFrom}
                        onSelect={setCreatedDateFrom}
                        className="rounded-xl border p-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">To</span>
                      <Calendar
                        mode="single"
                        selected={createdDateTo}
                        onSelect={setCreatedDateTo}
                        className="rounded-xl border p-2"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {(filterSource !== "all" || filterAgent !== "all" || filterStage !== "all" || createdDateFrom) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full px-4 flex-shrink-0"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions - Beautiful Mobile Design */}
        {selectedLeads.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50 animate-fade-in">
            {/* Header row with count and cancel */}
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="font-semibold text-sm px-3 py-1">
                {selectedLeads.length} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLeads([])}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />{t('cancel')}</Button>
            </div>

            {/* Action buttons grid */}
            <div className={cn("grid gap-2", canDeleteLeads ? "grid-cols-5" : "grid-cols-4")}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkAssign}
                className="flex flex-col items-center justify-center h-14 p-1"
              >
                <UserPlus className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Assign</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkStageChange}
                className="flex flex-col items-center justify-center h-14 p-1"
              >
                <GitBranch className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Stage</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkTag}
                className="flex flex-col items-center justify-center h-14 p-1"
              >
                <Tag className="h-4 w-4 mb-1" />
                <span className="text-[10px]">Tag</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="flex flex-col items-center justify-center h-14 p-1"
              >
                <Download className="h-4 w-4 mb-1" />
                <span className="text-[10px]">{t('export')}</span>
              </Button>
              {canDeleteLeads && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="flex flex-col items-center justify-center h-14 p-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mb-1" />
                  <span className="text-[10px]">{t('delete')}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Desktop Table */}
      <Card className="hidden lg:block overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={currentPageLeads.length > 0 && currentPageLeads.every(lead => selectedLeads.includes(lead.id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">
                    Lead Name
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>{t('phone')}</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("created")}>
                  <div className="flex items-center gap-1">{t('created')}<ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Group</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((lead) => (
                <NewLeadRow
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLeads.includes(lead.id)}
                  onToggleSelect={() => toggleSelectLead(lead.id)}
                  onNavigate={() => navigate(`/leads/${lead.id}`)}
                  onUpdate={(updates) => handleInlineUpdate(lead.id, updates)}
                  getSourceBadgeColor={getSourceBadgeColor}
                  agents={agentNames}
                  companySettings={companySettings ? {
                    new_lead_badge_color: companySettings.new_lead_badge_color,
                    new_lead_background_color: companySettings.new_lead_background_color,
                    new_lead_animation: companySettings.new_lead_animation,
                  } : undefined}
                  renderActions={() => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSingleLeadAssign(lead.id)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign to Agent
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSingleLeadStageChange(lead.id)}>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Change Stage
                        </DropdownMenuItem>
                        {canDeleteLeads && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleSingleLeadDelete(lead.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />{t('delete')}</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalLeads)} of {totalLeads} leads
            </p>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >{t('next')}<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Mobile Search & Filter Bar */}
      <div className="lg:hidden">
        <MobileSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search clients & phone..."
          onFilterClick={() => setIsFilterDialogOpen(true)}
        />
      </div>

      {/* Mobile/Tablet Stage Filter Chips - Fixed padding for no cutoff */}
      <div className="lg:hidden w-full overflow-x-auto no-scrollbar">
        <div className="flex gap-2 pb-3 px-4" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
          <button
            onClick={() => setFilterStage("all")}
            className={cn(
              "flex-shrink-0 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm active:scale-95",
              filterStage === "all"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "bg-card text-foreground border border-border hover:bg-muted/50"
            )}
          >
            All
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-bold min-w-[24px] text-center",
              filterStage === "all"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {allCount}
            </span>
          </button>
          {stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setFilterStage(stage.name)}
              className={cn(
                "flex-shrink-0 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm active:scale-95",
                filterStage === stage.name
                  ? "text-white shadow-md"
                  : "bg-card text-foreground border border-border hover:bg-muted/50"
              )}
              style={filterStage === stage.name ? { backgroundColor: stage.color, boxShadow: `0 4px 12px ${stage.color}40` } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: filterStage === stage.name ? 'white' : stage.color }}
              />
              {stage.name}
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-bold min-w-[24px] text-center",
                filterStage === stage.name
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              )}>
                {stageCounts[stage.name] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile/Tablet Cards with Infinite Scroll */}
      <div className="lg:hidden space-y-2 pb-24 px-1">
        {/* Selection mode indicator */}
        {isSelectionMode && (
          <div className="flex items-center justify-between bg-primary/10 p-3 rounded-xl mb-2 mx-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-bold text-primary bg-primary/20">
                {selectedLeads.length}
              </Badge>
              <span className="text-sm font-medium text-primary">
                leads selected
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedLeads([]);
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />{t('cancel')}</Button>
          </div>
        )}

        {/* Lead count indicator */}
        {!isSelectionMode && filteredLeads.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-muted-foreground">
              {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
            </span>
            <span className="text-xs text-muted-foreground">
              Long press to select
            </span>
          </div>
        )}

        {/* Lead Cards */}
        {filteredLeads.slice(0, visibleCount).map((lead) => (
          <MobileLeadCard
            key={lead.id}
            lead={lead}
            isSelected={selectedLeads.includes(lead.id)}
            isSelectionMode={isSelectionMode}
            onSelect={() => toggleSelectLead(lead.id)}
            onClick={() => handleLeadCardClick(lead.id)}
            onLongPressStart={() => handleLongPressStart(lead.id)}
            onLongPressEnd={handleLongPressEnd}
            onViewDetails={() => navigate(`/leads/${lead.id}`)}
            onAssign={() => handleSingleLeadAssign(lead.id)}
            onChangeStage={() => handleSingleLeadStageChange(lead.id)}
            onDelete={() => handleSingleLeadDelete(lead.id)}
            canDelete={canDeleteLeads}
            companySettings={companySettings ? {
              new_lead_badge_color: companySettings.new_lead_badge_color,
              new_lead_background_color: companySettings.new_lead_background_color,
              new_lead_animation: companySettings.new_lead_animation,
            } : undefined}
          />
        ))}

        {/* Infinite Scroll Loader with Skeleton Cards */}
        {visibleCount < filteredLeads.length && (
          <div ref={loadMoreRef}>
            {isLoadingMore ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-2xl border border-border/60 p-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-5 w-12 bg-muted rounded-full" />
                        </div>
                        <div className="h-3 w-24 bg-muted rounded" />
                        <div className="flex gap-2 mt-2">
                          <div className="h-6 w-16 bg-muted rounded-full" />
                          <div className="h-6 w-14 bg-muted rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <span className="text-xs text-muted-foreground">Scroll for more</span>
              </div>
            )}
          </div>
        )}

        {/* End of list indicator */}
        {visibleCount >= filteredLeads.length && filteredLeads.length > 0 && (
          <div className="text-center py-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <span className="text-xs text-muted-foreground">
                Showing all {filteredLeads.length} leads
              </span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No leads found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {searchQuery || filterSource !== "all" || filterStage !== "all"
                ? "Try adjusting your filters or search query"
                : "Add your first lead to get started"}
            </p>
            <Button
              className="mt-4"
              onClick={() => setIsAddLeadOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Show skeleton while loading
  if (isLoading) {
    return <LeadsPageSkeleton isMobile={isMobile} />;
  }

  if (isMobile) {
    return (
      <>
        <PullToRefresh onRefresh={handleRefresh} className="h-full -m-3 p-3">
          {content}
        </PullToRefresh>

        {typeof document !== "undefined" &&
          createPortal(
            <>
              {/* FAB Menu Overlay - Fixed outside scroll container */}
              {isFabOpen && (
                <div
                  className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
                  onClick={() => setIsFabOpen(false)}
                />
              )}

              {/* FAB Options - Fixed outside scroll container */}
              <div
                className={`fixed bottom-36 right-4 z-50 flex flex-col gap-2 transition-all duration-200 ${isFabOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none"
                  }`}
              >
                <button
                  onClick={() => handleFabOption("excel")}
                  className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border active:scale-95 transition-transform"
                >
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium">Import Excel</span>
                </button>
                <button
                  onClick={() => handleFabOption("contact")}
                  className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border active:scale-95 transition-transform"
                >
                  <Contact className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">From Contacts</span>
                </button>
                <button
                  onClick={() => handleFabOption("manual")}
                  className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border active:scale-95 transition-transform"
                >
                  <UserPlus className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Manual Add</span>
                </button>
              </div>

              {/* Floating Action Button - Fixed outside scroll container */}
              <button
                onClick={() => setIsFabOpen(!isFabOpen)}
                className={`fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-all duration-200 ${isFabOpen ? "rotate-45" : ""
                  }`}
              >
                <Plus className="h-6 w-6" />
              </button>
            </>,
            document.body
          )}

        {/* Mobile Leads Filter Dialog */}
        <LeadsFilterDialog
          open={isFilterDialogOpen}
          onOpenChange={setIsFilterDialogOpen}
          filterStage={filterStage}
          onFilterStageChange={setFilterStage}
          filterGroup={filterGroup}
          onFilterGroupChange={setFilterGroup}
          filterSource={filterSource}
          onFilterSourceChange={setFilterSource}
          filterAgent={filterAgent}
          onFilterAgentChange={setFilterAgent}
          onReset={() => {
            setFilterStage("all");
            setFilterGroup("all");
            setFilterSource("all");
            setFilterAgent("all");
          }}
        />

        {/* Add Lead Dialog for Manual Add */}
        <AddLeadDialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen} />

        {/* Excel Import Dialog */}
        <ExcelImportDialog
          open={isExcelImportOpen}
          onOpenChange={setIsExcelImportOpen}
          onImport={handleExcelImport}
        />

        {/* Contacts Import Dialog */}
        <ContactsImportDialog
          open={isContactsImportOpen}
          onOpenChange={setIsContactsImportOpen}
          onImport={handleContactsImport}
        />
      </>
    );
  }

  return (
    <>
      {content}

      {/* FAB Menu & Button - Desktop/Tablet (fixed via portal) */}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {/* FAB Menu Overlay - Desktop */}
            {isFabOpen && (
              <div
                className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
                onClick={() => setIsFabOpen(false)}
              />
            )}

            {/* FAB Options - Desktop/Tablet */}
            <div
              className={`fixed bottom-24 right-4 z-50 flex flex-col gap-2 transition-all duration-200 ${isFabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                }`}
            >
              <button
                onClick={() => handleFabOption("excel")}
                className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border hover:bg-accent active:scale-95 transition-all"
              >
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium">Import Excel</span>
              </button>
              <button
                onClick={() => handleFabOption("contact")}
                className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border hover:bg-accent active:scale-95 transition-all"
              >
                <Contact className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">From Contacts</span>
              </button>
              <button
                onClick={() => handleFabOption("manual")}
                className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border hover:bg-accent active:scale-95 transition-all"
              >
                <UserPlus className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Manual Add</span>
              </button>
            </div>

            {/* Floating Action Button - Desktop/Tablet */}
            <button
              onClick={() => setIsFabOpen(!isFabOpen)}
              className={`fixed bottom-6 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all duration-200 ${isFabOpen ? "rotate-45" : ""
                }`}
            >
              <Plus className="h-6 w-6" />
            </button>
          </>,
          document.body
        )}

      {/* Excel Import Dialog for Desktop */}
      <ExcelImportDialog
        open={isExcelImportOpen}
        onOpenChange={setIsExcelImportOpen}
        onImport={handleExcelImport}
      />
      {/* Contacts Import Dialog for Desktop */}
      <ContactsImportDialog
        open={isContactsImportOpen}
        onOpenChange={setIsContactsImportOpen}
        onImport={handleContactsImport}
      />
      {/* Add Lead Dialog for Desktop */}
      <AddLeadDialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen} />
      {/* Reassign Leads Dialog */}
      <ReassignLeadsDialog
        open={isReassignOpen}
        onOpenChange={(open) => {
          setIsReassignOpen(open);
          if (!open) setSingleLeadAction(null);
        }}
        selectedLeadIds={singleLeadAction ? [singleLeadAction.leadId] : selectedLeads}
        onReassign={handleReassign}
      />
      {/* Change Stage Dialog */}
      <ChangeStageDialog
        open={isChangeStageOpen}
        onOpenChange={(open) => {
          setIsChangeStageOpen(open);
          if (!open) setSingleLeadAction(null);
        }}
        selectedLeadIds={singleLeadAction ? [singleLeadAction.leadId] : selectedLeads}
        onStageChange={handleStageChange}
      />
      {/* Delete Leads Dialog - Admin Only */}
      <DeleteLeadsDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        leadIds={leadsToDelete}
        onSuccess={handleDeleteSuccess}
      />
      {/* Mobile Leads Filter Dialog */}
      <LeadsFilterDialog
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        filterStage={filterStage}
        onFilterStageChange={setFilterStage}
        filterGroup={filterGroup}
        onFilterGroupChange={setFilterGroup}
        filterSource={filterSource}
        onFilterSourceChange={setFilterSource}
        filterAgent={filterAgent}
        onFilterAgentChange={setFilterAgent}
        onReset={() => {
          setFilterStage("all");
          setFilterGroup("all");
          setFilterSource("all");
          setFilterAgent("all");
        }}
        availableAgents={availableAgents}
        availableSources={availableSources}
      />

      <ExportLeadsDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        leads={leads}
        availableAgents={availableAgents}
      />
    </>
  );
}

export default function LeadsPage() {
  return (
    <ErrorBoundary>
      <LeadsPageContent />
    </ErrorBoundary>
  );
}
