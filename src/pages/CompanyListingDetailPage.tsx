import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Share2,
  Heart,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Calendar,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  Facebook,
  Twitter,
  Mail,
  Link2,
  Building2,
  FileText,
  Phone,
  History,
  User,
  Loader2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { generatePropertyPDF } from "@/lib/generatePropertyPDF";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PublishToPFDialog } from "@/components/listings/PublishToPFDialog";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  rented: "bg-blue-100 text-blue-700 border-blue-200",
  sold: "bg-purple-100 text-purple-700 border-purple-200",
  off_market: "bg-gray-100 text-gray-700 border-gray-200",
};

interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  address: string | null;
  city: string | null;
  country: string | null;
  number_of_bedrooms: number | null;
  number_of_bathrooms: number | null;
  area_size: number | null;
  area_unit: string | null;
  property_type: string | null;
  listing_type: string | null;
  status: string;
  furnished: string | null;
  completion_status: string | null;
  permit_number: string | null;
  reference_number: string | null;
  images: string[] | null;
  amenities: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  agent: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  views: number;
  inquiries: number;
}

export default function CompanyListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        // Fetch listing with agent info
        const { data, error } = await supabase
          .from("listings")
          .select(`
            *,
            agents!listings_assigned_agent_id_fkey (
              id,
              name,
              email,
              phone,
              avatar_url,
              user_id
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        // Fetch profile name and avatar if agent has user_id
        let agentDisplayName = data.agents?.name || null;
        let agentAvatarUrl = data.agents?.avatar_url || null;
        if (data.agents?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, avatar_url")
            .eq("id", data.agents.user_id)
            .single();
          
          if (profile) {
            if (profile.first_name || profile.last_name) {
              agentDisplayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
            }
            if (profile.avatar_url) {
              agentAvatarUrl = profile.avatar_url;
            }
          }
        }

        // Fetch analytics
        const { data: analytics } = await supabase
          .from("listing_analytics")
          .select("views_count, inquiries_count")
          .eq("listing_id", id);

        const totalViews = analytics?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;
        const totalInquiries = analytics?.reduce((sum, a) => sum + (a.inquiries_count || 0), 0) || 0;

        setListing({
          ...data,
          images: Array.isArray(data.images) ? data.images as string[] : [],
          amenities: Array.isArray(data.amenities) ? data.amenities as string[] : [],
          tags: Array.isArray(data.tags) ? data.tags as string[] : [],
          agent: data.agents ? { 
            ...data.agents, 
            name: agentDisplayName || data.agents.name,
            avatar_url: agentAvatarUrl || data.agents.avatar_url
          } : null,
          views: totalViews,
          inquiries: totalInquiries,
        });
      } catch (err: any) {
        console.error("Error fetching listing:", err);
        toast.error("Failed to load listing");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const images = listing?.images?.length ? listing.images : [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop"
  ];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (!price) return "Price on Request";
    return `${currency} ${price.toLocaleString()}`;
  };

  const handleShare = (platform: string) => {
    if (!listing) return;
    
    const url = window.location.href;
    const title = listing.title;
    const priceStr = formatPrice(listing.price, listing.currency);
    const location = [listing.address, listing.city].filter(Boolean).join(", ");
    const message = `🏠 ${title}\n💰 ${priceStr}\n📍 ${location}\n🛏️ ${listing.number_of_bedrooms || 0} Beds | 🛁 ${listing.number_of_bathrooms || 0} Baths | 📐 ${listing.area_size || 0} ${listing.area_unit || 'sqft'}\n\nRef: ${listing.reference_number || listing.id.slice(0, 8)}\n${url}`;

    switch (platform) {
      case "copy":
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank");
        break;
      case "email":
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`, "_blank");
        break;
    }
  };

  const handleDownloadPDF = async () => {
    if (!listing) return;
    
    toast.loading("Generating PDF brochure...", { id: "pdf-gen" });
    try {
      await generatePropertyPDF({
        id: listing.id,
        title: listing.title,
        description: listing.description || "",
        price: formatPrice(listing.price, listing.currency),
        pricePerSqft: listing.price && listing.area_size 
          ? `${listing.currency} ${Math.round(listing.price / listing.area_size).toLocaleString()}` 
          : "",
        location: [listing.address, listing.city, listing.country].filter(Boolean).join(", "),
        bedrooms: listing.number_of_bedrooms || 0,
        bathrooms: listing.number_of_bathrooms || 0,
        size: `${listing.area_size || 0} ${listing.area_unit || 'sqft'}`,
        type: listing.property_type || "Property",
        status: listing.status,
        purpose: listing.listing_type === "rent" ? "For Rent" : "For Sale",
        furnishing: listing.furnished || "N/A",
        refNumber: listing.reference_number || listing.id.slice(0, 8),
        permitNumber: listing.permit_number || "",
        agent: listing.agent ? {
          name: listing.agent.name,
          phone: listing.agent.phone || "",
          email: listing.agent.email,
        } : undefined,
        amenities: listing.amenities || [],
        features: listing.tags || [],
        images: images,
      });
      toast.success("PDF generated successfully!", { id: "pdf-gen" });
    } catch (error) {
      toast.error("Failed to generate PDF", { id: "pdf-gen" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Listing not found</p>
        <Button onClick={() => navigate("/company-listings")}>
          Back to Listings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button variant="ghost" onClick={() => navigate("/company-listings")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Company Listings
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Share Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              <DropdownMenuItem onClick={() => handleShare("copy")}>
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare("facebook")}>
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare("twitter")}>
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare("email")}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setShowPublishDialog(true)}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            <Globe className="h-4 w-4 mr-2" />
            Publish to PF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-red-500 text-red-500")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <Card className="shadow-card overflow-hidden">
            <div className="relative">
              <div
                className="relative aspect-[16/10] cursor-pointer group"
                onClick={() => setIsGalleryOpen(true)}
              >
                <img
                  src={images[currentImageIndex]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white font-medium transition-opacity">
                    Click to view gallery
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </div>

              {images.length > 1 && (
                <div className="p-3 bg-secondary/30">
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={cn(
                          "flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all",
                          currentImageIndex === index
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-transparent hover:border-primary/50"
                        )}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Property Details */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      Ref: {listing.reference_number || listing.id.slice(0, 8)}
                    </Badge>
                    <Badge className={cn("border", statusStyles[listing.status] || statusStyles.draft)}>
                      {listing.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{listing.title}</CardTitle>
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {[listing.address, listing.city, listing.country].filter(Boolean).join(", ") || "Location not specified"}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(listing.price, listing.currency)}
                </p>
                {listing.price && listing.area_size && (
                  <p className="text-sm text-muted-foreground">
                    {listing.currency} {Math.round(listing.price / listing.area_size).toLocaleString()} per {listing.area_unit || 'sqft'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <Bed className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{listing.number_of_bedrooms || 0}</p>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <Bath className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{listing.number_of_bathrooms || 0}</p>
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <Ruler className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{listing.area_size || 0} {listing.area_unit || 'sqft'}</p>
                    <p className="text-xs text-muted-foreground">Area</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium capitalize">{listing.property_type || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">Type</p>
                  </div>
                </div>
              </div>

              <Separator />

              {listing.description && (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {listing.description}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              <div>
                <h3 className="font-semibold mb-3">Property Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose</span>
                    <span className="font-medium">{listing.listing_type === "rent" ? "For Rent" : "For Sale"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Furnishing</span>
                    <span className="font-medium capitalize">{listing.furnished || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium capitalize">{listing.completion_status || "N/A"}</span>
                  </div>
                  {listing.permit_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Permit No.</span>
                      <span className="font-medium">{listing.permit_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {listing.amenities && listing.amenities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {listing.amenities.map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="font-normal">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {listing.tags && listing.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.tags.map((feature) => (
                      <Badge key={feature} variant="outline" className="font-normal">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-secondary/30 rounded-lg">
                  <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{listing.views}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
                <div className="text-center p-3 bg-secondary/30 rounded-lg">
                  <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{listing.inquiries}</p>
                  <p className="text-xs text-muted-foreground">Inquiries</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Card */}
          {listing.agent && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Listed By
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={listing.agent.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.agent.name}`} />
                    <AvatarFallback>{listing.agent.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{listing.agent.name}</p>
                    <p className="text-sm text-muted-foreground">Listing Agent</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {listing.agent.phone && (
                    <Button variant="outline" className="w-full justify-start gap-2" asChild>
                      <a href={`tel:${listing.agent.phone}`}>
                        <Phone className="h-4 w-4" />
                        {listing.agent.phone}
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href={`mailto:${listing.agent.email}`}>
                      <Mail className="h-4 w-4" />
                      {listing.agent.email}
                    </a>
                  </Button>
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleShare("whatsapp")}
                  >
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp Agent
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created
                  </span>
                  <span className="font-medium">
                    {format(new Date(listing.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Updated
                  </span>
                  <span className="font-medium">
                    {format(new Date(listing.updated_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gallery Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black/95">
          <DialogHeader className="absolute top-4 left-4 right-4 z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">{listing.title}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setIsGalleryOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="relative aspect-[16/10]">
            <img
              src={images[currentImageIndex]}
              alt={`${listing.title} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={handlePrevImage}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={handleNextImage}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    currentImageIndex === index ? "bg-white w-6" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish to Property Finder Dialog */}
      <PublishToPFDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        listing={{
          id: listing.id,
          title: listing.title,
          reference_number: listing.reference_number || undefined,
        }}
        onSuccess={() => {
          // Optionally refresh listing data
        }}
      />

      {/* Mobile Bottom Actions */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-2 z-50">
          <Button 
            className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80" 
            onClick={() => setShowPublishDialog(true)}
          >
            <Globe className="h-4 w-4" />
            Publish
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={() => handleShare("whatsapp")}>
            <MessageSquare className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownloadPDF}>
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
