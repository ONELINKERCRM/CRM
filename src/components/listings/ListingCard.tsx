import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Edit2,
  Copy,
  Trash2,
  MapPin,
  Bed,
  Bath,
  Ruler,
  MoreHorizontal,
  Cloud,
  Share2,
  FileText,
  Link2,
  MessageSquare,
  ImageOff,
  Presentation,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AddEditListingForm } from "./AddEditListingForm";
import { useLocalization } from "@/contexts/LocalizationContext";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

function LazyImage({ src, alt, className }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-full">
      {/* Skeleton placeholder */}
      {!isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
          <ImageOff className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}

      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          className,
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

export interface Listing {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  price: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  size: string;
  type: string;
  status: "Active" | "Draft" | "Pending" | "Rented" | "Sold";
  agent: { name: string; avatar: string };
  views: number;
  inquiries: number;
  image: string;
  refNumber?: string;
  portals?: string[];
  // Extended details
  latitude?: number;
  longitude?: number;
  plotSize?: number;
  view?: string;
  ownershipType?: string;
  serviceCharges?: number;
  developer?: string;
  projectName?: string;
  buildingName?: string;
  floorNumber?: number;
  parkingSpaces?: number;
  virtualTourUrl?: string;
  videoUrl?: string;
}

const statusStyles = {
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Draft: "bg-gray-100 text-gray-700 border-gray-200",
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Rented: "bg-blue-100 text-blue-700 border-blue-200",
  Sold: "bg-purple-100 text-purple-700 border-purple-200",
};

const portalColors: Record<string, string> = {
  "Property Finder": "bg-red-100 text-red-700",
  "Bayut": "bg-blue-100 text-blue-700",
  "Dubizzle": "bg-orange-100 text-orange-700",
  "Website": "bg-emerald-100 text-emerald-700",
};

interface ListingCardProps {
  listing: Listing;
  viewOnly?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showAgent?: boolean;
  onUpdateListing?: (id: string, data: Partial<Listing>) => void;
  isSelectionMode?: boolean;
  onLongPressStart?: (id: string) => void;
  onLongPressEnd?: () => void;
  onCardClick?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ListingCard({
  listing,
  viewOnly = false,
  selectable = false,
  selected = false,
  onSelect,
  showAgent = true,
  onUpdateListing,
  isSelectionMode = false,
  onLongPressStart,
  onLongPressEnd,
  onCardClick,
  onDuplicate,
  onDelete,
}: ListingCardProps) {
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { language, isRTL, formatCurrency } = useLocalization();

  // Get localized title
  const displayTitle = language === 'ar' && listing.titleAr ? listing.titleAr : listing.title;

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = `🏠 ${listing.title}\n💰 ${listing.price}\n📍 ${listing.location}\n🛏️ ${listing.bedrooms} Beds | 🛁 ${listing.bathrooms} Baths | 📐 ${listing.size}\n\nRef: ${listing.refNumber || listing.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/listings/${listing.id}`);
    toast.success("Link copied to clipboard!");
  };

  const handleDownloadPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("Generating PDF...", { description: "Your download will start shortly" });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(listing.id);
    } else {
      navigate(`/listings/${listing.id}`);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-card card-hover-enhanced group cursor-pointer relative bg-card border-border/50 hover:border-primary/20 select-none",
        isSelectionMode && selected && "bg-primary/5 border-primary/30"
      )}
      onClick={handleCardClick}
      onTouchStart={() => onLongPressStart?.(listing.id)}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressEnd}
      onMouseDown={() => onLongPressStart?.(listing.id)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
    >
      {/* Selectable Checkbox - Show on hover, or if selected/mode active */}
      {selectable && (
        <div
          className={cn(
            "absolute top-3 left-3 z-10 transition-opacity duration-200",
            isSelectionMode || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect?.(listing.id)}
            className="h-5 w-5 bg-background/90 border-2"
          />
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted image-overlay shine-effect">
        <LazyImage
          src={listing.image}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <Badge
          className={cn(
            "absolute top-3 border",
            selectable ? "left-10" : "left-3",
            statusStyles[listing.status]
          )}
        >
          {listing.status}
        </Badge>

        {/* Portal Badges */}
        {listing.portals && listing.portals.length > 0 && (
          <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap max-w-[80%]">
            {listing.portals.slice(0, 3).map((portal) => (
              <Badge
                key={portal}
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0.5", portalColors[portal])}
              >
                {portal.split(" ")[0]}
              </Badge>
            ))}
            {listing.portals.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                +{listing.portals.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions Menu */}
        <div
          className="absolute top-3 right-3 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/listings/${listing.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              {!viewOnly && (
                <>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/listings/${listing.id}/publish`)}>
                    <Cloud className="h-4 w-4 mr-2" />
                    Publish to Portals
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/listings/${listing.id}/presentation`)}>
                    <Presentation className="h-4 w-4 mr-2" />
                    Create Presentation
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleCopyLink}>
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleWhatsAppShare}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Share on WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              {!viewOnly && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(listing.id); }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(listing.id); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <CardContent className={cn("p-4", isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
        <div className="space-y-3">
          <div>
            <p className="text-lg font-bold text-primary">{listing.price}</p>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground line-clamp-1">{displayTitle}</h3>
              {listing.titleAr && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 bg-amber-500/10 border-amber-500/30">
                  <Globe className="h-2.5 w-2.5" />
                </Badge>
              )}
            </div>
            <p className={cn("text-sm text-muted-foreground flex items-center gap-1 mt-1", isRTL && "flex-row-reverse justify-end")}>
              <MapPin className="h-3 w-3" />
              {listing.location}
            </p>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {listing.bedrooms === 0 ? "Studio" : listing.bedrooms}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {listing.bathrooms}
            </span>
            <span className="flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {listing.size}
            </span>
          </div>

          {/* Reference Number */}
          {listing.refNumber && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium">Ref:</span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{listing.refNumber}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            {showAgent && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.agent.avatar}`} />
                  <AvatarFallback>{listing.agent.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{listing.agent.name}</span>
              </div>
            )}
            <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", !showAgent && "w-full justify-between")}>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {listing.views}
              </span>
              <span>{listing.inquiries} inquiries</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <AddEditListingForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        listingId={listing.id}
        editData={{
          title: listing.title,
          price: listing.price.replace(/[^0-9]/g, ""),
          location: listing.location,
          bedrooms: String(listing.bedrooms),
          bathrooms: String(listing.bathrooms),
          size: listing.size.replace(/[^0-9]/g, ""),
          latitude: listing.latitude?.toString(),
          longitude: listing.longitude?.toString(),
          plotSize: listing.plotSize?.toString(),
          view: listing.view,
          ownershipType: listing.ownershipType,
          serviceCharges: listing.serviceCharges?.toString(),
          developer: listing.developer,
          projectName: listing.projectName,
          buildingName: listing.buildingName,
          floorNumber: listing.floorNumber?.toString(),
          parkingSpaces: listing.parkingSpaces?.toString(),
          tourUrl: listing.virtualTourUrl,
          videoUrl: listing.videoUrl,
          propertyType: listing.type.toLowerCase(),
          status: listing.status.toLowerCase(),
          images: [listing.image],
        }}
        onSave={(data) => {
          const numericPrice = Number(data.price || 0);
          const formattedPrice = numericPrice
            ? `AED ${numericPrice.toLocaleString()}`
            : listing.price;

          const listingStatusMap: Record<string, Listing["status"]> = {
            available: "Active",
            sold: "Sold",
            rented: "Rented",
            reserved: "Pending",
            "off-market": "Draft",
            draft: "Draft",
            active: "Active",
          };

          onUpdateListing?.(listing.id, {
            title: data.title,
            price: formattedPrice,
            location: data.location,
            bedrooms: Number(data.bedrooms) || listing.bedrooms,
            bathrooms: Number(data.bathrooms) || listing.bathrooms,
            size: data.size ? `${data.size} sqft` : listing.size,
            type:
              data.propertyType && data.propertyType.length > 0
                ? data.propertyType.charAt(0).toUpperCase() + data.propertyType.slice(1)
                : listing.type,
            status: listingStatusMap[data.status] ?? listing.status,
            image: data.images[0] || listing.image,
          });
        }}
      />
    </Card>
  );
}

// Mobile Card Component - Compact horizontal layout
export function ListingCardMobile({
  listing,
  viewOnly = false,
  selectable = false,
  selected = false,
  onSelect,
  showAgent = true,
  onUpdateListing,
  isSelectionMode = false,
  onLongPressStart,
  onLongPressEnd,
  onCardClick,
  onDuplicate,
  onDelete,
}: ListingCardProps) {
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { language, isRTL } = useLocalization();

  // Get localized title
  const displayTitle = language === 'ar' && listing.titleAr ? listing.titleAr : listing.title;

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = `🏠 ${displayTitle}\n💰 ${listing.price}\n📍 ${listing.location}\n🛏️ ${listing.bedrooms} Beds | 🛁 ${listing.bathrooms} Baths | 📐 ${listing.size}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/listings/${listing.id}`);
    toast.success("Link copied!");
  };

  const handleDownloadPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("Generating PDF...");
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(listing.id);
    } else {
      navigate(`/listings/${listing.id}`);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-card active:bg-muted/30 smooth select-none",
        isSelectionMode && selected && "bg-primary/5 border-primary/30"
      )}
      onClick={handleCardClick}
      onTouchStart={() => onLongPressStart?.(listing.id)}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressEnd}
      onMouseDown={() => onLongPressStart?.(listing.id)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
    >
      <div className="flex">
        {/* Image */}
        <div className="relative w-28 h-24 flex-shrink-0 bg-muted">
          {selectable && (isSelectionMode || selected) && (
            <div
              className="absolute top-1.5 left-1.5 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={() => onSelect?.(listing.id)}
                className="h-4 w-4 bg-background/90"
              />
            </div>
          )}
          <LazyImage
            src={listing.image}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          <Badge
            className={cn(
              "absolute bottom-1.5 text-[9px] px-1.5 py-0 border",
              isSelectionMode ? "left-7" : "left-1.5",
              statusStyles[listing.status]
            )}
          >
            {listing.status}
          </Badge>
        </div>

        {/* Content */}
        <div className={cn("flex-1 p-2.5 min-w-0 flex flex-col justify-between", isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
          <div>
            <div className={cn("flex items-start justify-between gap-1", isRTL && "flex-row-reverse")}>
              <p className="text-sm font-bold text-primary">{listing.price}</p>
              {listing.portals && listing.portals.length > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 flex-shrink-0">
                  {listing.portals.length} portals
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-foreground text-xs line-clamp-1 mt-0.5">{displayTitle}</h3>
            <p className={cn("text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5", isRTL && "flex-row-reverse justify-end")}>
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">{listing.location}</span>
            </p>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Bed className="h-3 w-3" />
                {listing.bedrooms === 0 ? "S" : listing.bedrooms}
              </span>
              <span className="flex items-center gap-0.5">
                <Bath className="h-3 w-3" />
                {listing.bathrooms}
              </span>
              <span className="flex items-center gap-0.5">
                <Ruler className="h-3 w-3" />
                {listing.size}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleWhatsAppShare}
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => navigate(`/listings/${listing.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    {!viewOnly && (
                      <>
                        <DropdownMenuItem onClick={handleEdit}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/listings/${listing.id}/publish`)}>
                          <Cloud className="h-4 w-4 mr-2" />
                          Publish
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={handleDownloadPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Link2 className="h-4 w-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(listing.id); }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); onDelete?.(listing.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <AddEditListingForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        listingId={listing.id}
        editData={{
          title: listing.title,
          price: (listing.price || "").replace(/[^0-9.]/g, ""),
          location: listing.location,
          latitude: listing.latitude?.toString(),
          longitude: listing.longitude?.toString(),
          plotSize: listing.plotSize?.toString(),
          view: listing.view,
          ownershipType: listing.ownershipType,
          serviceCharges: listing.serviceCharges?.toString(),
          developer: listing.developer,
          projectName: listing.projectName,
          buildingName: listing.buildingName,
          floorNumber: listing.floorNumber?.toString(),
          parkingSpaces: listing.parkingSpaces?.toString(),
          tourUrl: listing.virtualTourUrl,
          videoUrl: listing.videoUrl,
          bedrooms: String(listing.bedrooms),
          bathrooms: String(listing.bathrooms),
          size: (listing.size || "").replace(/[^0-9.]/g, ""),
          propertyType: (listing.type || "").toLowerCase(),
          status: (listing.status || "").toLowerCase(),
          images: listing.image ? [listing.image] : [],
        }}
        onSave={(data) => {
          const numericPrice = Number(data.price || 0);
          const formattedPrice = numericPrice
            ? `AED ${numericPrice.toLocaleString()}`
            : listing.price;

          const listingStatusMap: Record<string, "Active" | "Draft" | "Pending" | "Rented" | "Sold"> = {
            available: "Active",
            sold: "Sold",
            rented: "Rented",
            reserved: "Pending",
            "off-market": "Draft",
            draft: "Draft",
            active: "Active",
          };

          onUpdateListing?.(listing.id, {
            title: data.title,
            price: formattedPrice,
            location: data.location,
            bedrooms: Number(data.bedrooms) || listing.bedrooms,
            bathrooms: Number(data.bathrooms) || listing.bathrooms,
            size: data.size ? `${data.size} sqft` : listing.size,
            type:
              data.propertyType && data.propertyType.length > 0
                ? data.propertyType.charAt(0).toUpperCase() + data.propertyType.slice(1)
                : listing.type,
            status: listingStatusMap[data.status] ?? listing.status,
            image: data.images[0] || listing.image,
          });
        }}
      />
    </Card>
  );
}

// Row/List View Component - Beautiful horizontal layout for desktop
export function ListingRowItem({
  listing,
  viewOnly = false,
  selectable = false,
  selected = false,
  onSelect,
  showAgent = true,
  onUpdateListing,
  isSelectionMode = false,
  onLongPressStart,
  onLongPressEnd,
  onCardClick,
  onDuplicate,
  onDelete,
}: ListingCardProps) {
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { language, isRTL } = useLocalization();

  const displayTitle = language === 'ar' && listing.titleAr ? listing.titleAr : listing.title;

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = `🏠 ${displayTitle}\n💰 ${listing.price}\n📍 ${listing.location}\n🛏️ ${listing.bedrooms} Beds | 🛁 ${listing.bathrooms} Baths | 📐 ${listing.size}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/listings/${listing.id}`);
    toast.success("Link copied!");
  };

  const handleDownloadPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success("Generating PDF...");
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(listing.id);
    } else {
      navigate(`/listings/${listing.id}`);
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-card hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/50 hover:border-primary/20 select-none",
        isSelectionMode && selected && "bg-primary/5 border-primary/30"
      )}
      onClick={handleCardClick}
      onTouchStart={() => onLongPressStart?.(listing.id)}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressEnd}
      onMouseDown={() => onLongPressStart?.(listing.id)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
    >
      <div className="flex items-center gap-4 p-3">
        {/* Checkbox - always show for list view if selectable to allow easy selection */}
        {selectable && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect?.(listing.id)}
              className="h-5 w-5 border-2"
            />
          </div>
        )}

        {/* Image */}
        <div className="relative w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          <LazyImage
            src={listing.image}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <Badge
            className={cn(
              "absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 border",
              statusStyles[listing.status]
            )}
          >
            {listing.status}
          </Badge>
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-6">
          {/* Title & Location */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-primary text-base">{listing.price}</p>
              {listing.titleAr && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 bg-amber-500/10 border-amber-500/30">
                  <Globe className="h-2.5 w-2.5" />
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground text-sm line-clamp-1 mt-0.5">{displayTitle}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{listing.location}</span>
            </p>
          </div>

          {/* Property Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {listing.refNumber && (
              <div className="hidden xl:flex items-center gap-1 text-xs text-muted-foreground mr-2">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{listing.refNumber}</span>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Bed className="h-4 w-4" />
                  {listing.bedrooms === 0 ? "Studio" : listing.bedrooms}
                </span>
              </TooltipTrigger>
              <TooltipContent>Bedrooms</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Bath className="h-4 w-4" />
                  {listing.bathrooms}
                </span>
              </TooltipTrigger>
              <TooltipContent>Bathrooms</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Ruler className="h-4 w-4" />
                  {listing.size}
                </span>
              </TooltipTrigger>
              <TooltipContent>Size</TooltipContent>
            </Tooltip>
          </div>

          {/* Portals */}
          <div className="flex items-center gap-1">
            {listing.portals && listing.portals.length > 0 ? (
              <>
                {listing.portals.slice(0, 2).map((portal) => (
                  <Badge
                    key={portal}
                    variant="secondary"
                    className={cn("text-[10px] px-1.5 py-0.5", portalColors[portal])}
                  >
                    {portal.split(" ")[0]}
                  </Badge>
                ))}
                {listing.portals.length > 2 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                    +{listing.portals.length - 2}
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                Not published
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {listing.views.toLocaleString()}
            </span>
            <span className="text-muted-foreground/50">|</span>
            <span>{listing.inquiries} inquiries</span>
          </div>

          {/* Agent & Actions */}
          <div className="flex items-center gap-3">
            {showAgent && (
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.agent.avatar}`} />
                  <AvatarFallback>{listing.agent.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{listing.agent.name}</span>
              </div>
            )}

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleWhatsAppShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/listings/${listing.id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {!viewOnly && (
                    <>
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/listings/${listing.id}/publish`)}>
                        <Cloud className="h-4 w-4 mr-2" />
                        Publish to Portals
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleDownloadPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  {!viewOnly && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(listing.id); }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); onDelete?.(listing.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <AddEditListingForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        listingId={listing.id}
        editData={{
          title: listing.title,
          price: (listing.price || "").replace(/[^0-9.]/g, ""),
          location: listing.location,
          latitude: listing.latitude?.toString(),
          longitude: listing.longitude?.toString(),
          plotSize: listing.plotSize?.toString(),
          view: listing.view,
          ownershipType: listing.ownershipType,
          serviceCharges: listing.serviceCharges?.toString(),
          developer: listing.developer,
          projectName: listing.projectName,
          buildingName: listing.buildingName,
          floorNumber: listing.floorNumber?.toString(),
          parkingSpaces: listing.parkingSpaces?.toString(),
          tourUrl: listing.virtualTourUrl,
          videoUrl: listing.videoUrl,
          bedrooms: String(listing.bedrooms),
          bathrooms: String(listing.bathrooms),
          size: (listing.size || "").replace(/[^0-9.]/g, ""),
          propertyType: (listing.type || "").toLowerCase(),
          status: (listing.status || "").toLowerCase(),
          images: listing.image ? [listing.image] : [],
        }}
        onSave={(data) => {
          const numericPrice = Number(data.price || 0);
          const formattedPrice = numericPrice
            ? `AED ${numericPrice.toLocaleString()}`
            : listing.price;

          const listingStatusMap: Record<string, "Active" | "Draft" | "Pending" | "Rented" | "Sold"> = {
            available: "Active",
            sold: "Sold",
            rented: "Rented",
            reserved: "Pending",
            "off-market": "Draft",
            draft: "Draft",
            active: "Active",
          };

          onUpdateListing?.(listing.id, {
            title: data.title,
            price: formattedPrice,
            location: data.location,
            bedrooms: Number(data.bedrooms) || listing.bedrooms,
            bathrooms: Number(data.bathrooms) || listing.bathrooms,
            size: data.size ? `${data.size} sqft` : listing.size,
            type:
              data.propertyType && data.propertyType.length > 0
                ? data.propertyType.charAt(0).toUpperCase() + data.propertyType.slice(1)
                : listing.type,
            status: listingStatusMap[data.status] ?? listing.status,
            image: data.images[0] || listing.image,
          });
        }}
      />
    </Card>
  );
}
