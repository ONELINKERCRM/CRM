import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Edit2,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Globe,
  Facebook,
  Twitter,
  Mail,
  Link2,
  Building2,
  FileText,
  Download,
  Phone,
  Cloud,
  StickyNote,
  CheckSquare,
  Zap,
  QrCode,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { generatePropertyPDF } from "@/lib/generatePropertyPDF";
import { AddEditListingForm } from "@/components/listings/AddEditListingForm";
import { useListing } from "@/hooks/useListing";
import { format } from "date-fns";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  rented: "bg-blue-100 text-blue-700 border-blue-200",
  sold: "bg-purple-100 text-purple-700 border-purple-200",
  off_market: "bg-gray-100 text-gray-700 border-gray-200",
};

const portalStatusStyles: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  draft: "bg-gray-100 text-gray-700",
};

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { listing, isLoading, refetch } = useListing(id);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Use listing images or fallback
  const images = listing?.images?.length
    ? listing.images
    : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop"];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
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

  const handlePublishToggle = () => {
    setIsPublished(!isPublished);
    toast.success(isPublished ? "Listing unpublished" : "Listing published", {
      description: isPublished
        ? "This listing is now hidden from public view"
        : "This listing is now visible to the public",
    });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      toast.success("Note added successfully");
      setNewNote("");
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
        <Button onClick={() => navigate("/listings")}>
          Back to Listings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/listings")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Listings</span>
        </Button>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
            variant="outline"
            size="sm"
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-red-500 text-red-500")} />
          </Button>

          <Button variant="outline" size="sm" onClick={() => navigate(`/listings/${id}/publish`)}>
            <Globe className="h-4 w-4 mr-2" />
            Publish to Portals
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Listing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Listing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Action Buttons */}
      {isMobile && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 gap-2 rounded-full"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0 gap-2 rounded-full">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare("copy")}>
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare("email")}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 gap-2 rounded-full"
            onClick={handleDownloadPDF}
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 gap-2 rounded-full"
            onClick={() => navigate(`/listings/${id}/publish`)}
          >
            <Globe className="h-4 w-4" />
            Publish
          </Button>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex-shrink-0 rounded-full",
              isFavorite && "bg-red-50 border-red-200 text-red-600"
            )}
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-red-500")} />
          </Button>
        </div>
      )}

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
                    <Badge className={cn("border capitalize", statusStyles[listing.status] || statusStyles.draft)}>
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
                        <Check className="h-3 w-3 mr-1" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Card className="shadow-card">
            <Tabs defaultValue="notes" className="w-full">
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="notes" className="text-xs sm:text-sm">
                    <StickyNote className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs sm:text-sm">
                    <CheckSquare className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Tasks</span>
                  </TabsTrigger>
                  <TabsTrigger value="automation" className="text-xs sm:text-sm">
                    <Zap className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Logs</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="notes" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                    />
                    <Button size="sm" onClick={handleAddNote}>Add Note</Button>
                  </div>
                  <Separator />
                  <div className="text-center py-4 text-muted-foreground">
                    <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes yet</p>
                  </div>
                </TabsContent>
                <TabsContent value="tasks" className="mt-0">
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks for this listing</p>
                    <Button variant="outline" size="sm" className="mt-2">Add Task</Button>
                  </div>
                </TabsContent>
                <TabsContent value="automation" className="mt-0">
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No automation logs</p>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Control */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Listing Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Published</span>
                </div>
                <Switch
                  checked={listing.status === "active"}
                  onCheckedChange={handlePublishToggle}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {listing.status === "active"
                  ? "This listing is visible on all connected portals and your website."
                  : "This listing is hidden from public view."}
              </p>
            </CardContent>
          </Card>

          {/* Portal Status */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Portal Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {listing.portals.length > 0 ? (
                listing.portals.map((portal) => (
                  <div key={portal.portal_name} className="flex items-center justify-between">
                    <span className="text-sm">{portal.portal_name}</span>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs capitalize", portalStatusStyles[portal.publish_status] || portalStatusStyles.draft)}
                    >
                      {portal.publish_status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Not published to any portals</p>
              )}
              <Button variant="outline" className="w-full mt-2" size="sm" onClick={() => navigate(`/listings/${id}/publish`)}>
                <Cloud className="h-4 w-4 mr-2" />
                Manage Portals
              </Button>
            </CardContent>
          </Card>

          {/* Agent Info */}
          {listing.agent && (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={listing.agent.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.agent.name}`} />
                    <AvatarFallback>{listing.agent.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{listing.agent.name}</p>
                    <p className="text-sm text-muted-foreground">Listing Agent</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {listing.agent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{listing.agent.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{listing.agent.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Views</span>
                </div>
                <span className="font-semibold">{listing.views.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Inquiries</span>
                </div>
                <span className="font-semibold">{listing.inquiries}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created
                </span>
                <span>{format(new Date(listing.created_at), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Updated
                </span>
                <span>{format(new Date(listing.updated_at), "MMM d, yyyy")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => handleShare("whatsapp")}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Share on WhatsApp
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <QrCode className="h-4 w-4 mr-2" />
                Generate QR Code
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 flex items-center gap-2 z-50">
          <Button className="flex-1" onClick={() => handleShare("whatsapp")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <FileText className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Gallery Dialog */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <DialogHeader className="absolute top-4 left-4 z-10">
            <DialogTitle className="text-white">{listing.title}</DialogTitle>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={() => setIsGalleryOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="relative aspect-[16/10]">
            <img
              src={images[currentImageIndex]}
              alt={listing.title}
              className="w-full h-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={handlePrevImage}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={handleNextImage}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1 rounded-full">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Listing Dialog */}
      <AddEditListingForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        listingId={listing.id}
        editData={{
          title: listing.title,
          description: listing.description || "",
          price: listing.price ? String(listing.price) : "",
          location: listing.address || "",
          city: listing.city || "",
          bedrooms: listing.number_of_bedrooms ? String(listing.number_of_bedrooms) : "",
          bathrooms: listing.number_of_bathrooms ? String(listing.number_of_bathrooms) : "",
          size: listing.area_size ? String(listing.area_size) : "",
          sizeUnit: listing.area_unit || "sqft",
          propertyType: listing.property_type || "apartment",
          listingType: listing.listing_type || "sale",
          furnishing: listing.furnished || "",
          completionStatus: listing.completion_status || "",
          permitNumber: listing.permit_number || "",
          amenities: listing.amenities || [],
          features: listing.tags || [],
          images: listing.images || [],
          currency: listing.currency || "AED",
        }}
        onSave={() => refetch()}
      />
    </div>
  );
}
