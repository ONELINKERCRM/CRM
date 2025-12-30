import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Eye,
  Share2,
  Building2,
  FileText,
  Link2,
  Home,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { ListingsPageSkeleton } from "@/components/ui/page-skeletons";
import { MobileSearchFilter } from "@/components/ui/mobile-search-filter";
import { CompanyListingsFiltersDialog } from "@/components/listings/CompanyListingsFiltersDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCompanyListings, type CompanyListing } from "@/hooks/useCompanyListings";
import { toast } from "sonner";
import { generatePropertyPDF } from "@/lib/generatePropertyPDF";

// Helper to format price
const formatPrice = (price: number | null, currency: string): string => {
  if (!price) return "Price on request";
  return `${currency} ${price.toLocaleString()}`;
};

// Helper to format size
const formatSize = (size: number | null, unit: string | null): string => {
  if (!size) return "N/A";
  return `${size.toLocaleString()} ${unit || "sqft"}`;
};

// Helper to map status for display
const mapStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: "Published",
    published: "Published",
    draft: "Draft",
    pending: "Pending",
    archived: "Archived",
    expired: "Expired",
    sold: "Sold",
    rented: "Rented",
  };
  return statusMap[status?.toLowerCase()] || status;
};

export default function CompanyListingsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { listings, stats, isLoading, refetch } = useCompanyListings();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [dialogFilters, setDialogFilters] = useState({
    type: "all",
    location: "all",
    priceRange: "any",
    agent: "all",
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success("Properties refreshed");
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (listing.address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (listing.city || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      typeFilter === "all" ||
      (listing.property_type || "").toLowerCase() === typeFilter;
    const matchesLocation =
      locationFilter === "all" ||
      (listing.city || "").toLowerCase().includes(locationFilter);
    return matchesSearch && matchesType && matchesLocation;
  });

  const handleShare = (e: React.MouseEvent, listing: CompanyListing) => {
    e.stopPropagation();
    const message = `🏠 ${listing.title}\n💰 ${formatPrice(listing.price, listing.currency)}\n📍 ${listing.address || listing.city || "N/A"}\n🛏️ ${listing.bedrooms || 0} Beds | 🛁 ${listing.bathrooms || 0} Baths | 📐 ${formatSize(listing.size, listing.size_unit)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopyLink = (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/company-listings/${listingId}`);
    toast.success("Link copied to clipboard!");
  };

  const handleDownloadPDF = async (e: React.MouseEvent, listing: CompanyListing) => {
    e.stopPropagation();
    toast.loading("Generating PDF...", { id: "pdf-gen" });
    try {
      await generatePropertyPDF({
        id: listing.id,
        title: listing.title,
        description: listing.description || `Beautiful ${listing.property_type || "property"} located in ${listing.city || "Dubai"}.`,
        price: formatPrice(listing.price, listing.currency),
        location: listing.address || listing.city || "N/A",
        bedrooms: listing.bedrooms || 0,
        bathrooms: listing.bathrooms || 0,
        size: formatSize(listing.size, listing.size_unit),
        type: listing.property_type || "Property",
        status: mapStatus(listing.status),
        refNumber: listing.reference_number || `REF-${listing.id.slice(0, 6).toUpperCase()}`,
        agent: listing.agent
          ? {
              name: listing.agent.name,
              phone: "+971 50 123 4567",
              email: `${listing.agent.name.toLowerCase().replace(" ", ".")}@onelinker.com`,
            }
          : undefined,
        images: listing.images || [],
      });
      toast.success("PDF generated!", { id: "pdf-gen" });
    } catch (error) {
      toast.error("Failed to generate PDF", { id: "pdf-gen" });
    }
  };

  const handleApplyFilters = () => {
    setTypeFilter(dialogFilters.type);
    setLocationFilter(dialogFilters.location);
    toast.success("Filters applied");
  };

  const handleResetFilters = () => {
    const resetFilters = {
      type: "all",
      location: "all",
      priceRange: "any",
      agent: "all",
    };
    setDialogFilters(resetFilters);
    setTypeFilter("all");
    setLocationFilter("all");
    toast.success("Filters reset");
  };

  // Mobile Card Component
  const MobileListingCard = ({ listing }: { listing: CompanyListing }) => (
    <Card 
      className="overflow-hidden shadow-card cursor-pointer"
      onClick={() => navigate(`/company-listings/${listing.id}`)}
    >
      <div className="flex gap-3 p-3">
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={listing.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop"}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-primary">{formatPrice(listing.price, listing.currency)}</p>
          <h3 className="font-medium text-foreground text-sm line-clamp-1">{listing.title}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {listing.address || listing.city || "N/A"}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-0.5">
              <Bed className="h-3 w-3" />
              {listing.bedrooms || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Bath className="h-3 w-3" />
              {listing.bathrooms || 0}
            </span>
            <span className="flex items-center gap-0.5">
              <Ruler className="h-3 w-3" />
              {formatSize(listing.size, listing.size_unit)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            {listing.agent ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={listing.agent.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.agent.name}`} />
                  <AvatarFallback>{listing.agent.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{listing.agent.name.split(' ')[0]}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              {listing.views}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 px-3 pb-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-8 text-xs"
          onClick={(e) => { e.stopPropagation(); navigate(`/company-listings/${listing.id}`); }}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-8 text-xs"
          onClick={(e) => handleShare(e, listing)}
        >
          <Share2 className="h-3 w-3 mr-1" />
          Share
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          className="h-8 w-8"
          onClick={(e) => handleCopyLink(e, listing.id)}
        >
          <Link2 className="h-3 w-3" />
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          className="h-8 w-8"
          onClick={(e) => handleDownloadPDF(e, listing)}
        >
          <FileText className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );

  const content = (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile Search & Filter Bar */}
      {isMobile && (
        <MobileSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search properties..."
          onFilterClick={() => {
            setDialogFilters({
              type: typeFilter,
              location: locationFilter,
              priceRange: "any",
              agent: "all",
            });
            setIsFilterOpen(true);
          }}
        />
      )}
      {/* Page Header - Hidden on mobile */}
      {!isMobile && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Company Properties</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Browse all properties from your company</p>
          </div>
        </div>
      )}

      {/* Info Banner - Hidden on mobile */}
      <Card className="bg-primary/5 border-primary/20 hidden sm:block">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">View Only Access</p>
            <p className="text-xs text-muted-foreground">
              You can view and share company properties but cannot edit them.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <StatCard
          title="Total Properties"
          value={stats.total.toString()}
          icon={Building2}
          iconColor="bg-primary/10 text-primary"
          compact
        />
        <StatCard
          title="Agents"
          value={stats.uniqueAgents.toString()}
          icon={Users}
          iconColor="bg-warning/10 text-warning"
          compact
        />
      </div>

      {/* Filters Bar - Desktop Only */}
      <Card className="hidden lg:block p-3 sm:p-4 shadow-card">
        <div className="flex flex-col gap-3">
          {/* Search Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Filter Button */}
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 flex-shrink-0 lg:hidden"
              onClick={() => {
                setDialogFilters({
                  type: typeFilter,
                  location: locationFilter,
                  priceRange: "any",
                  agent: "all",
                });
                setIsFilterOpen(true);
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Desktop Filters Row - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="penthouse">Penthouse</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="dubai">Dubai</SelectItem>
                <SelectItem value="abu dhabi">Abu Dhabi</SelectItem>
                <SelectItem value="sharjah">Sharjah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {filteredListings.length} properties
        </Badge>
      </div>

      {/* Listings Grid */}
      {isMobile ? (
        <div className="space-y-3">
          {filteredListings.map((listing) => (
            <MobileListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredListings.map((listing) => (
            <Card 
              key={listing.id} 
              className="overflow-hidden shadow-card card-hover-enhanced group cursor-pointer bg-card border-border/50 hover:border-primary/20"
              onClick={() => navigate(`/company-listings/${listing.id}`)}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted image-overlay shine-effect">
                <img
                  src={listing.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop"}
                  alt={listing.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <Badge className="absolute top-3 left-3 bg-emerald-100 text-emerald-700 border-emerald-200">
                  {mapStatus(listing.status)}
                </Badge>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => handleShare(e, listing)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-bold text-primary">{formatPrice(listing.price, listing.currency)}</p>
                    <h3 className="font-semibold text-foreground line-clamp-1">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {listing.address || listing.city || "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {listing.bedrooms || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {listing.bathrooms || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Ruler className="h-4 w-4" />
                      {formatSize(listing.size, listing.size_unit)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    {listing.agent ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={listing.agent.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.agent.name}`} />
                          <AvatarFallback>{listing.agent.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{listing.agent.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      {listing.views} views
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={(e) => { e.stopPropagation(); navigate(`/company-listings/${listing.id}`); }}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={(e) => handleShare(e, listing)}
                    >
                      <Share2 className="h-3 w-3" />
                      Share
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleCopyLink(e, listing.id)}
                    >
                      <Link2 className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleDownloadPDF(e, listing)}
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No properties found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or add some listings
          </p>
        </div>
      )}
    </div>
  );

  // Show skeleton while loading
  if (isLoading) {
    return <ListingsPageSkeleton isMobile={isMobile} />;
  }

  // Wrap with PullToRefresh on mobile
  if (isMobile) {
    return (
      <>
        <PullToRefresh onRefresh={handleRefresh} className="h-full -m-3 p-3">
          {content}
        </PullToRefresh>
        <CompanyListingsFiltersDialog
          open={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          filters={dialogFilters}
          onFiltersChange={setDialogFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
      </>
    );
  }

  return (
    <>
      {content}
      <CompanyListingsFiltersDialog
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={dialogFilters}
        onFiltersChange={setDialogFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </>
  );
}
