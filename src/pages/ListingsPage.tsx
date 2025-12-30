import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Upload,
  Download,
  Building2,
  Home,
  Eye,
  TrendingUp,
  Cloud,
  Trash2,
  Share2,
  X,
  SlidersHorizontal,
  UserPlus,
  RefreshCw,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/ui/stat-card";
import { ListingCard, ListingCardMobile, ListingRowItem, type Listing } from "@/components/listings/ListingCard";
import { AddEditListingForm } from "@/components/listings/AddEditListingForm";
import { PublishToPortalsDialog } from "@/components/listings/PublishToPortalsDialog";
import { AssignAgentDialog } from "@/components/listings/AssignAgentDialog";
import { BulkEditListingsDialog } from "@/components/listings/BulkEditListingsDialog";
import { ListingsFiltersDialog } from "@/components/listings/ListingsFiltersDialog";
import { ListingsImportDialog } from "@/components/listings/ListingsImportDialog";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { ListingsPageSkeleton } from "@/components/ui/page-skeletons";
import { MobileSearchFilter } from "@/components/ui/mobile-search-filter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useListings, type Listing as DBListing } from "@/hooks/useListings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePortals } from "@/hooks/usePortalPublications";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";

// Helper to format price for display


const FloatingAddListingFAB = ({
  onClick,
  bottomClass,
}: {
  onClick: () => void;
  bottomClass: string;
}) => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <button
      onClick={onClick}
      className={`fixed right-4 ${bottomClass} z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all`}
    >
      <Plus className="h-6 w-6" />
    </button>,
    document.body
  );
};

export default function ListingsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t, formatCurrency, isRTL } = useLocalization();
  const { listings: dbListings, isLoading, refetch } = useListings();
  const { portals } = usePortals();
  const { activeMembers: agents } = useOrganizationMembers();

  // Map DB status to UI status
  const mapStatus = (status: string | null): "Active" | "Draft" | "Pending" | "Rented" | "Sold" => {
    const statusMap: Record<string, "Active" | "Draft" | "Pending" | "Rented" | "Sold"> = {
      active: "Active",
      published: "Active",
      draft: "Draft",
      pending: "Pending",
      rented: "Rented",
      sold: "Sold",
      reserved: "Pending",
      off_market: "Draft",
      archived: "Draft",
      expired: "Draft",
    };
    return statusMap[(status || "draft").toLowerCase()] || "Draft";
  };

  // Helper to format price for display
  const formatListingPrice = (price: number | null, currency: string): string => {
    if (!price) return "Price on request";
    return `${currency} ${price.toLocaleString()}`;
  };

  // Transform DB listings to UI format
  const listings: Listing[] = dbListings.map((item) => ({
    id: item.id,
    title: item.title,
    price: formatListingPrice(item.price, item.currency),
    location: item.location || item.city || "Unknown",
    bedrooms: item.bedrooms || 0,
    bathrooms: item.bathrooms || 0,
    size: item.size ? `${item.size} ${item.size_unit || "sqft"}` : "N/A",
    type: item.property_type ? item.property_type.charAt(0).toUpperCase() + item.property_type.slice(1) : "Apartment",
    status: mapStatus(item.status),
    agent: { name: item.agent?.name || "Unassigned", avatar: item.agent?.avatar || "" },
    views: item.views || 0,
    inquiries: item.inquiries || 0,
    image: item.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
    refNumber: item.reference_number || item.ref_number || `REF-${item.id.slice(0, 6).toUpperCase()}`,
    portals: item.portals || [],
    latitude: item.latitude || undefined,
    longitude: item.longitude || undefined,
    plotSize: item.plot_size || undefined,
    view: item.view_type || undefined,
    ownershipType: item.ownership_type || undefined,
    serviceCharges: item.service_charge || undefined,
    developer: item.developer || undefined,
    projectName: item.project_name || undefined,
    buildingName: item.building_name || undefined,
    floorNumber: item.floor_number || undefined,
    parkingSpaces: item.parking_spaces || undefined,
    virtualTourUrl: item.virtual_tour_url || undefined,
    videoUrl: (item.videos && item.videos.length > 0) ? (typeof item.videos[0] === 'string' ? item.videos[0] : item.videos[0]?.url) : undefined,
  }));

  // Calculate real stats
  const totalListings = listings.length;
  const activeListings = listings.filter(l => l.status === "Active").length;
  const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalInquiries = listings.reduce((sum, l) => sum + (l.inquiries || 0), 0);



  const formatStatValue = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssignAgentOpen, setIsAssignAgentOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [agentFilter, setAgentFilter] = useState("all");
  const [portalFilter, setPortalFilter] = useState("all");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleRefresh = async () => {
    await refetch();
    toast.success("Listings refreshed");
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.refNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || listing.status.toLowerCase() === statusFilter;
    const matchesType = typeFilter === "all" || listing.type.toLowerCase() === typeFilter;
    const matchesAgent = agentFilter === "all" || listing.agent.name.includes(agentFilter.split(" ")[0]);
    const matchesPortal = portalFilter === "all" || listing.portals?.includes(portalFilter);
    return matchesSearch && matchesStatus && matchesType && matchesAgent && matchesPortal;
  });

  const handleSelectAll = () => {
    if (selectedListings.length === filteredListings.length) {
      setSelectedListings([]);
    } else {
      setSelectedListings(filteredListings.map((l) => l.id));
    }
  };

  const handleSelectListing = (id: string) => {
    setSelectedListings((prev) => {
      const newSelection = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      // Automatically toggle selection mode
      if (newSelection.length > 0) {
        setIsSelectionMode(true);
      } else {
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
      setSelectedListings((prev) => prev.includes(id) ? prev : [...prev, id]);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleListingCardClick = (id: string) => {
    if (isSelectionMode) {
      handleSelectListing(id);
    } else {
      navigate(`/listings/${id}`);
    }
  };

  const handlePublishToPortals = (portalIds: string[]) => {
    toast.success(`Published to ${portalIds.length} portals`);
    setSelectedListings([]);
  };

  const handleAssignAgent = async (agentId: string, agentName: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ assigned_agent_id: agentId })
        .in('id', selectedListings);

      if (error) throw error;

      toast.success(`${selectedListings.length} listing(s) assigned to ${agentName}`);
      setSelectedListings([]);
      refetch();
    } catch (err: any) {
      console.error("Error assigning agent:", err);
      toast.error("Failed to assign agent: " + err.message);
    }
  };

  const handleUpdateListing = (id: string, data: Partial<Listing>) => {
    // Real updates come via real-time subscription
    toast.success("Updating listing...");
  };

  const handleDeleteListing = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', deleteTarget);

      if (error) throw error;
      toast.success("Listing deleted successfully");
      refetch();
    } catch (err: any) {
      console.error("Error deleting listing:", err);
      toast.error("Failed to delete listing: " + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleDuplicateListing = async (id: string) => {
    try {
      toast.loading("Duplicating listing...", { id: "duplicate-listing" });

      // Fetch the original listing
      const { data: original, error: fetchError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create a copy without the ID and with a new title
      const { id: _, created_at: __, updated_at: ___, ...copyData } = original;
      const duplicatedData = {
        ...copyData,
        title: `${copyData.title} (Copy)`,
        reference_number: null, // Let the system generate a new one
        status: 'draft', // Always duplicate as draft
      };

      const { data: newData, error: insertError } = await supabase
        .from('listings')
        .insert(duplicatedData)
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Listing duplicated successfully", { id: "duplicate-listing" });
      refetch();
    } catch (err: any) {
      console.error("Error duplicating listing:", err);
      toast.error("Failed to duplicate: " + err.message, { id: "duplicate-listing" });
    }
  };
  const handleBulkAction = async (action: string) => {
    const count = selectedListings.length;
    if (count === 0) return;

    try {
      switch (action) {
        case "publish":
          setIsPublishDialogOpen(true);
          return;
        case "assign":
          setIsAssignAgentOpen(true);
          return;
        case "edit":
          setIsBulkEditOpen(true);
          return;
        case "archive":
          const { error: archiveError } = await supabase
            .from('listings')
            .update({ status: 'archived' })
            .in('id', selectedListings);
          if (archiveError) throw archiveError;
          toast.success(`${count} listings archived`);
          break;
        case "unpublish":
          const { error: unpublishError } = await supabase
            .from('listings')
            .update({ status: 'draft' }) // Assuming draft means unpublished
            .in('id', selectedListings);
          if (unpublishError) throw unpublishError;
          toast.success(`${count} listings unpublished`);
          break;
        case "delete":
          if (!confirm(`Are you sure you want to delete ${count} listings?`)) return;
          const { error: deleteError } = await supabase
            .from('listings')
            .delete()
            .in('id', selectedListings);
          if (deleteError) throw deleteError;
          toast.success(`${count} listings deleted`);
          break;
        case "share":
          toast.success(`Preparing to share ${count} listings...`);
          break;
        case "sync":
          toast.success(`Syncing ${count} listings with portals...`);
          break;
      }
      setSelectedListings([]);
      refetch();
    } catch (err: any) {
      console.error(`Error performing bulk ${action}:`, err);
      toast.error(`Bulk ${action} failed: ${err.message}`);
    }
  };

  const handleExportListings = () => {
    if (filteredListings.length === 0) {
      toast.error("No listings to export");
      return;
    }

    // Define columns to export
    const columns = [
      { key: 'title', label: 'Title' },
      { key: 'price', label: 'Price' },
      { key: 'location', label: 'Location' },
      { key: 'bedrooms', label: 'Bedrooms' },
      { key: 'bathrooms', label: 'Bathrooms' },
      { key: 'size', label: 'Size' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'refNumber', label: 'Ref Number' },
    ];

    // Create CSV content
    const headerRow = columns.map(col => `"${col.label}"`).join(',');
    const dataRows = filteredListings.map(listing => {
      return columns.map(col => {
        const val = listing[col.key as keyof Listing];
        const stringVal = val !== undefined && val !== null ? String(val) : '';
        return `"${stringVal.replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\n');

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `listings_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Listings exported successfully");
  };

  const handleBulkEditSave = (changes: { currency?: string; sizeUnit?: string }) => {
    // In a real implementation, this would update the database
    toast.success(`Updated ${selectedListings.length} listings`);
    setSelectedListings([]);
  };

  const [dialogFilters, setDialogFilters] = useState({
    status: statusFilter,
    type: typeFilter,
    bedrooms: "any",
    priceRange: "any",
    portal: portalFilter,
    agent: agentFilter,
  });

  const handleApplyFilters = () => {
    setStatusFilter(dialogFilters.status);
    setTypeFilter(dialogFilters.type);
    setPortalFilter(dialogFilters.portal);
    setAgentFilter(dialogFilters.agent);
    toast.success("Filters applied");
  };

  const handleResetFilters = () => {
    const resetFilters = {
      status: "all",
      type: "all",
      bedrooms: "any",
      priceRange: "any",
      portal: "all",
      agent: "all",
    };
    setDialogFilters(resetFilters);
    setStatusFilter("all");
    setTypeFilter("all");
    setPortalFilter("all");
    setAgentFilter("all");
    toast.success("Filters reset");
  };

  const content = (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile Search & Filter Bar */}
      {isMobile && (
        <MobileSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={t('search_listings')}
          onFilterClick={() => {
            // Sync dialog filters with current filter state before opening
            setDialogFilters({
              status: statusFilter,
              type: typeFilter,
              bedrooms: "any",
              priceRange: "any",
              portal: portalFilter,
              agent: agentFilter,
            });
            setIsFilterOpen(true);
          }}
        />
      )}
      {/* Page Header - Hidden on mobile */}
      {!isMobile && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('my_listings')}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">{t('manage_property_listings')}</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3">
                  <Upload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('import')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('import')} CSV / Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportListings}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('export')} CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsAddFormOpen(true)} size="sm" className="h-8">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('add_listing')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Add Listing Form */}
      <AddEditListingForm
        open={isAddFormOpen}
        onOpenChange={setIsAddFormOpen}
        mode="add"
      />

      {/* Stats - Only 2 cards on mobile/tablet */}
      <div className="lg:hidden grid grid-cols-2 gap-2">
        <StatCard
          title={t('total_listings')}
          value={totalListings.toString()}
          icon={Building2}
          iconColor="bg-primary/10 text-primary"
          compact
        />
        <StatCard
          title={t('active')}
          value={activeListings.toString()}
          icon={Home}
          iconColor="bg-success/10 text-success"
          compact
        />
      </div>

      {/* Stats - Full grid on desktop */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        <StatCard
          title={t('total_listings')}
          value={totalListings.toString()}
          icon={Building2}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCard
          title={t('active')}
          value={activeListings.toString()}
          icon={Home}
          iconColor="bg-success/10 text-success"
        />
        <StatCard
          title={t('total_views')}
          value={formatStatValue(totalViews)}
          icon={Eye}
          iconColor="bg-info/10 text-info"
        />
        <StatCard
          title={t('inquiries')}
          value={formatStatValue(totalInquiries)}
          icon={TrendingUp}
          iconColor="bg-warning/10 text-warning"
        />
      </div>

      {/* Filters Bar - Desktop Only */}
      <Card className="hidden lg:block p-3 sm:p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_listings')}
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Quick Filters - visible on mobile too */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-9 flex-shrink-0">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_status')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="draft">{t('draft')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="rented">{t('rented')}</SelectItem>
                <SelectItem value="sold">{t('sold')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-9 flex-shrink-0">
                <SelectValue placeholder={t('property_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_types')}</SelectItem>
                <SelectItem value="apartment">{t('apartment')}</SelectItem>
                <SelectItem value="villa">{t('villa')}</SelectItem>
                <SelectItem value="townhouse">{t('townhouse')}</SelectItem>
                <SelectItem value="penthouse">{t('penthouse')}</SelectItem>
                <SelectItem value="studio">{t('studio')}</SelectItem>
              </SelectContent>
            </Select>

            {/* More Filters */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => {
                setDialogFilters({
                  status: statusFilter,
                  type: typeFilter,
                  bedrooms: "any",
                  priceRange: "any",
                  portal: portalFilter,
                  agent: agentFilter,
                });
                setIsFilterOpen(true);
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            {/* View Toggle - hidden on mobile */}
            <div className="hidden sm:flex items-center border rounded-lg p-0.5 flex-shrink-0">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar - Mobile optimized */}
        {selectedListings.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-3 border-t bg-primary/5 -mx-3 sm:-mx-4 px-3 sm:px-4 -mb-3 sm:-mb-4 pb-3 sm:pb-4 rounded-b-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedListings.length === filteredListings.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-xs sm:text-sm font-medium">
                {selectedListings.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setSelectedListings([])}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs flex-shrink-0"
                onClick={() => handleBulkAction("publish")}
              >
                <Cloud className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Publish</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs flex-shrink-0"
                onClick={() => handleBulkAction("assign")}
              >
                <UserPlus className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Assign</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs flex-shrink-0"
                onClick={() => handleBulkAction("edit")}
              >
                <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">{t('edit')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs flex-shrink-0"
                onClick={() => handleBulkAction("sync")}
              >
                <RefreshCw className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Sync</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs flex-shrink-0"
                onClick={() => handleBulkAction("share")}
              >
                <Share2 className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive flex-shrink-0"
                onClick={() => handleBulkAction("delete")}
              >
                <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">{t('delete')}</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Select All - hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2">
        <Checkbox
          checked={selectedListings.length === filteredListings.length && filteredListings.length > 0}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-xs sm:text-sm text-muted-foreground">Select all</span>
        <Badge variant="secondary" className="ml-2 text-xs">
          {filteredListings.length} listings
        </Badge>
      </div>

      {/* Selection mode indicator for mobile */}
      {isMobile && isSelectionMode && (
        <div className="flex items-center justify-between bg-primary/10 p-2 rounded-lg mb-3">
          <span className="text-xs font-medium text-primary">
            {selectedListings.length} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => {
              setIsSelectionMode(false);
              setSelectedListings([]);
            }}
          >
            <X className="h-3 w-3 mr-1" />{t('cancel')}</Button>
        </div>
      )}

      {/* Listings Grid */}
      {isMobile ? (
        <div className="space-y-3 pb-24">
          {filteredListings.map((listing) => (
            <ListingCardMobile
              key={listing.id}
              listing={listing}
              selectable
              selected={selectedListings.includes(listing.id)}
              onSelect={handleSelectListing}
              showAgent={false}
              onUpdateListing={handleUpdateListing}
              isSelectionMode={isSelectionMode}
              onLongPressStart={handleLongPressStart}
              onLongPressEnd={handleLongPressEnd}
              onCardClick={handleListingCardClick}
              onDuplicate={handleDuplicateListing}
              onDelete={handleDeleteListing}
            />
          ))}
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filteredListings.map((listing) => (
            <ListingRowItem
              key={listing.id}
              listing={listing}
              selectable
              selected={selectedListings.includes(listing.id)}
              onSelect={handleSelectListing}
              showAgent
              onUpdateListing={handleUpdateListing}
              isSelectionMode={isSelectionMode}
              onLongPressStart={handleLongPressStart}
              onLongPressEnd={handleLongPressEnd}
              onCardClick={handleListingCardClick}
              onDuplicate={handleDuplicateListing}
              onDelete={handleDeleteListing}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              selectable
              selected={selectedListings.includes(listing.id)}
              onSelect={handleSelectListing}
              showAgent={false}
              onUpdateListing={handleUpdateListing}
              isSelectionMode={isSelectionMode}
              onLongPressStart={handleLongPressStart}
              onLongPressEnd={handleLongPressEnd}
              onCardClick={handleListingCardClick}
              onDuplicate={handleDuplicateListing}
              onDelete={handleDeleteListing}
            />
          ))}
        </div>
      )}

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No listings found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or add a new listing
          </p>
          <Button onClick={() => setIsAddFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Listing
          </Button>
        </div>
      )}


      {/* Publish to Portals Dialog */}
      <PublishToPortalsDialog
        open={isPublishDialogOpen}
        onOpenChange={setIsPublishDialogOpen}
        listingIds={selectedListings}
        onPublish={handlePublishToPortals}
      />

      {/* Assign Agent Dialog */}
      <AssignAgentDialog
        open={isAssignAgentOpen}
        onOpenChange={setIsAssignAgentOpen}
        listingIds={selectedListings}
        onAssign={handleAssignAgent}
      />

      {/* Bulk Edit Dialog */}
      <BulkEditListingsDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        listingIds={selectedListings}
        onSave={handleBulkEditSave}
      />

      {/* Import Dialog */}
      <ListingsImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImportComplete={refetch}
      />
    </div>
  );

  // Wrap with PullToRefresh on mobile
  // Show skeleton while loading
  if (isLoading) {
    return <ListingsPageSkeleton isMobile={isMobile} />;
  }

  if (isMobile) {
    return (
      <>
        <PullToRefresh onRefresh={handleRefresh} className="h-full -m-3 p-3">
          {content}
        </PullToRefresh>

        {/* Floating Action Button - Fixed outside scroll container */}
        <FloatingAddListingFAB
          onClick={() => setIsAddFormOpen(true)}
          bottomClass="bottom-20"
        />
      </>
    );
  }

  return (
    <>
      {content}

      {/* Floating Action Button - Desktop */}
      <FloatingAddListingFAB
        onClick={() => setIsAddFormOpen(true)}
        bottomClass="bottom-6"
      />

      {/* Filters Dialog */}
      <ListingsFiltersDialog
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={dialogFilters}
        onFiltersChange={setDialogFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        agents={agents.map(m => ({ id: m.id, name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Agent' }))}
        portals={portals.map(p => ({ id: p.id, name: p.name }))}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the property listing
              from the system and all connected portals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Listing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}