import { useState } from "react";
import { X, ExternalLink, Bed, Bath, Maximize, MapPin, Phone, Mail, User, Monitor, Smartphone, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Portal, PortalCustomization, ListingSummary, Agent } from "./types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PortalPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portal: Portal;
  customization: PortalCustomization;
  listing: ListingSummary;
  agent?: Agent;
}

const portalStyles: Record<string, { bg: string; accent: string; accentBg: string; font: string }> = {
  "property-finder": { bg: "bg-white", accent: "text-[#e4002b]", accentBg: "bg-[#e4002b]", font: "font-sans" },
  "bayut": { bg: "bg-gray-50", accent: "text-[#0a9e49]", accentBg: "bg-[#0a9e49]", font: "font-sans" },
  "dubizzle": { bg: "bg-white", accent: "text-[#dd0000]", accentBg: "bg-[#dd0000]", font: "font-sans" },
  "saakin": { bg: "bg-white", accent: "text-blue-600", accentBg: "bg-blue-600", font: "font-sans" },
  "weqaya": { bg: "bg-white", accent: "text-emerald-600", accentBg: "bg-emerald-600", font: "font-sans" },
  "google-business": { bg: "bg-white", accent: "text-[#4285f4]", accentBg: "bg-[#4285f4]", font: "font-sans" },
  "wordpress": { bg: "bg-white", accent: "text-[#21759b]", accentBg: "bg-[#21759b]", font: "font-serif" },
  "xml-feed": { bg: "bg-gray-100", accent: "text-gray-800", accentBg: "bg-gray-800", font: "font-mono" },
};

export function PortalPreviewModal({
  open,
  onOpenChange,
  portal,
  customization,
  listing,
  agent,
}: PortalPreviewModalProps) {
  const isMobile = useIsMobile();
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(isMobile ? "mobile" : "desktop");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const style = portalStyles[portal.id] || portalStyles["property-finder"];
  const selectedImages = customization.selectedImages.map((i) => listing.images[i]).filter(Boolean);
  const allImages = selectedImages.length > 0 ? selectedImages : listing.images;
  const mainImage = allImages[currentImageIndex] || allImages[0];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const isMobilePreview = previewMode === "mobile";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden flex flex-col",
        isMobile
          ? "max-w-full w-full h-[100dvh] max-h-[100dvh] rounded-none"
          : "max-w-5xl max-h-[90vh]"
      )}>
        {/* Header */}
        <DialogHeader className="p-3 sm:p-4 pb-2 sm:pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <span className="truncate">Preview on {portal.name}</span>
            </DialogTitle>

            {/* Preview Mode Toggle - Only show on tablet/desktop */}
            {!isMobile && (
              <ToggleGroup type="single" value={previewMode} onValueChange={(v) => v && setPreviewMode(v as "desktop" | "mobile")}>
                <ToggleGroupItem value="desktop" aria-label="Desktop view" className="h-8 px-3 gap-1.5">
                  <Monitor className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Desktop</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="mobile" aria-label="Mobile view" className="h-8 px-3 gap-1.5">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Mobile</span>
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </div>
        </DialogHeader>

        {/* Preview Container */}
        <div className={cn(
          "flex-1 overflow-hidden flex items-start justify-center p-2 sm:p-4",
          !isMobile && "bg-muted/50"
        )}>
          <div className={cn(
            "h-full transition-all duration-300",
            isMobile
              ? "w-full"
              : isMobilePreview
                ? "w-[375px] border rounded-2xl shadow-xl overflow-hidden"
                : "w-full max-w-3xl border rounded-lg shadow-lg overflow-hidden"
          )}>
            <ScrollArea className="h-full">
              {/* Portal-styled preview container */}
              <div className={cn(style.bg, style.font, "min-h-full")}>
                {/* Portal Header */}
                <div className={cn(
                  "flex items-center justify-between border-b sticky top-0 z-10",
                  style.bg,
                  isMobilePreview ? "p-2.5" : "p-3 sm:p-4"
                )}>
                  <div className={cn("font-bold", style.accent, isMobilePreview ? "text-sm" : "text-base sm:text-lg")}>
                    {portal.name}
                  </div>
                  <Badge variant="secondary" className={cn(isMobilePreview ? "text-[9px] px-1.5" : "text-xs")}>
                    Preview
                  </Badge>
                </div>

                <div className={cn(isMobilePreview ? "p-2.5" : "p-3 sm:p-4")}>
                  {/* Main Image with Navigation */}
                  <div className={cn(
                    "relative rounded-lg overflow-hidden mb-3 bg-muted group",
                    isMobilePreview ? "aspect-[4/3]" : "aspect-video"
                  )}>
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={customization.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No image selected
                      </div>
                    )}

                    {/* Purpose Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge className={cn(style.accentBg, "text-white", isMobilePreview ? "text-[10px] px-1.5 py-0" : "text-xs")}>
                        {(customization.purpose || listing.purpose) === "Sale" ? "For Sale" : "For Rent"}
                      </Badge>
                    </div>

                    {/* Image Navigation */}
                    {allImages.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className={cn(
                            "absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                            isMobilePreview ? "h-7 w-7" : "h-8 w-8"
                          )}
                          onClick={handlePrevImage}
                        >
                          <ChevronLeft className={cn(isMobilePreview ? "h-4 w-4" : "h-5 w-5")} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                            isMobilePreview ? "h-7 w-7" : "h-8 w-8"
                          )}
                          onClick={handleNextImage}
                        >
                          <ChevronRight className={cn(isMobilePreview ? "h-4 w-4" : "h-5 w-5")} />
                        </Button>
                      </>
                    )}

                    {/* Image Counter */}
                    <div className={cn(
                      "absolute bottom-2 right-2 bg-black/70 text-white rounded-full",
                      isMobilePreview ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
                    )}>
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </div>

                  {/* Image Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
                      {allImages.slice(0, isMobilePreview ? 4 : 6).map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={cn(
                            "flex-shrink-0 rounded overflow-hidden border-2 transition-all",
                            currentImageIndex === idx ? "border-primary" : "border-transparent hover:border-primary/50",
                            isMobilePreview ? "w-14 h-10" : "w-20 h-14"
                          )}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                      {allImages.length > (isMobilePreview ? 4 : 6) && (
                        <div className={cn(
                          "flex-shrink-0 rounded bg-muted flex items-center justify-center font-medium",
                          isMobilePreview ? "w-14 h-10 text-[10px]" : "w-20 h-14 text-xs"
                        )}>
                          +{allImages.length - (isMobilePreview ? 4 : 6)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title & Location */}
                  <div className="mb-3">
                    <h1 className={cn(
                      "font-bold mb-1 leading-tight",
                      isMobilePreview ? "text-base" : "text-lg sm:text-xl"
                    )}>
                      {customization.title || listing.title}
                    </h1>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className={cn(isMobilePreview ? "h-3 w-3" : "h-4 w-4")} />
                      <span className={cn(isMobilePreview ? "text-xs" : "text-sm")}>
                        {customization.location || listing.location}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <p className={cn(
                    "font-bold mb-4",
                    style.accent,
                    isMobilePreview ? "text-lg" : "text-xl sm:text-2xl"
                  )}>
                    {customization.price || listing.price}
                  </p>

                  {/* Property Details Grid */}
                  <div className={cn(
                    "grid gap-2 sm:gap-3 p-2.5 sm:p-4 bg-muted/50 rounded-lg mb-4",
                    isMobilePreview ? "grid-cols-2" : "grid-cols-4"
                  )}>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Bed className={cn("text-muted-foreground", isMobilePreview ? "h-3.5 w-3.5" : "h-4 w-4")} />
                        <span className={cn("font-semibold", isMobilePreview ? "text-sm" : "text-base")}>
                          {customization.bedrooms ?? listing.bedrooms}
                        </span>
                      </div>
                      <p className={cn("text-muted-foreground", isMobilePreview ? "text-[10px]" : "text-xs")}>Beds</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Bath className={cn("text-muted-foreground", isMobilePreview ? "h-3.5 w-3.5" : "h-4 w-4")} />
                        <span className={cn("font-semibold", isMobilePreview ? "text-sm" : "text-base")}>
                          {customization.bathrooms ?? listing.bathrooms}
                        </span>
                      </div>
                      <p className={cn("text-muted-foreground", isMobilePreview ? "text-[10px]" : "text-xs")}>Baths</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Maximize className={cn("text-muted-foreground", isMobilePreview ? "h-3.5 w-3.5" : "h-4 w-4")} />
                        <span className={cn("font-semibold", isMobilePreview ? "text-xs" : "text-sm")}>
                          {customization.size || listing.size}
                        </span>
                      </div>
                      <p className={cn("text-muted-foreground", isMobilePreview ? "text-[10px]" : "text-xs")}>Size</p>
                    </div>
                    <div className="text-center">
                      <div className={cn("font-semibold mb-0.5", isMobilePreview ? "text-xs" : "text-sm")}>
                        {customization.propertyType || listing.type}
                      </div>
                      <p className={cn("text-muted-foreground", isMobilePreview ? "text-[10px]" : "text-xs")}>Type</p>
                    </div>
                  </div>

                  {/* Extra Details */}
                  {(customization.furnishing || customization.permitNumber || customization.developer || customization.projectName || customization.floorNumber || customization.parkingSpaces) && (
                    <div className={cn(
                      "flex flex-wrap gap-2 mb-4",
                      isMobilePreview ? "text-xs" : "text-sm"
                    )}>
                      {customization.furnishing && (
                        <Badge variant="outline" className={cn(isMobilePreview ? "text-[10px]" : "text-xs")}>
                          {customization.furnishing}
                        </Badge>
                      )}
                      {customization.developer && (
                        <Badge variant="outline" className={cn(isMobilePreview ? "text-[10px]" : "text-xs")}>
                          Dev: {customization.developer}
                        </Badge>
                      )}
                      {customization.projectName && (
                        <Badge variant="outline" className={cn(isMobilePreview ? "text-[10px]" : "text-xs")}>
                          Project: {customization.projectName}
                        </Badge>
                      )}
                      {customization.floorNumber !== undefined && (
                        <Badge variant="outline" className={cn(isMobilePreview ? "text-[10px]" : "text-xs")}>
                          Floor: {customization.floorNumber}
                        </Badge>
                      )}
                      {customization.parkingSpaces !== undefined && (
                        <Badge variant="outline" className={cn(isMobilePreview ? "text-[10px]" : "text-xs")}>
                          Parking: {customization.parkingSpaces}
                        </Badge>
                      )}
                      {portal.country === 'UAE' && (customization.permitNumber || listing.permitNumber) && (
                        <Badge variant="outline" className={cn(isMobilePreview ? "text-[10px]" : "text-xs")}>
                          Permit: {customization.permitNumber || listing.permitNumber}
                        </Badge>
                      )}
                      {(customization.tags || []).map(tag => (
                        <Badge key={tag} variant="secondary" className={cn("bg-primary/10 text-primary border-none", isMobilePreview ? "text-[10px]" : "text-xs")}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <div className="mb-4">
                    <h3 className={cn("font-semibold mb-2", isMobilePreview ? "text-sm" : "text-base")}>Description</h3>
                    <p className={cn(
                      "text-muted-foreground leading-relaxed",
                      isMobilePreview ? "text-xs" : "text-sm"
                    )}>
                      {customization.description || listing.description || "No description provided."}
                    </p>
                  </div>

                  <Separator className="my-3 sm:my-4" />

                  {/* Features */}
                  {(customization.features || []).length > 0 && (
                    <div className="mb-4">
                      <h3 className={cn("font-semibold mb-2", isMobilePreview ? "text-sm" : "text-base")}>Features</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {(customization.features || []).map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className={cn(isMobilePreview ? "text-[10px]" : "text-xs")}>
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amenities */}
                  {customization.amenities.length > 0 && (
                    <div className="mb-4">
                      <h3 className={cn("font-semibold mb-2", isMobilePreview ? "text-sm" : "text-base")}>Amenities</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {customization.amenities.map((amenity, idx) => (
                          <Badge key={idx} variant="outline" className={cn(isMobilePreview ? "text-[10px]" : "text-xs")}>
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="my-3 sm:my-4" />

                  {/* Agent Card */}
                  <div className={cn(
                    "bg-muted/30 rounded-lg",
                    isMobilePreview ? "p-2.5" : "p-3 sm:p-4"
                  )}>
                    <h3 className={cn("font-semibold mb-2", isMobilePreview ? "text-xs" : "text-sm")}>Listed by</h3>
                    <div className={cn(
                      "flex items-center gap-3",
                      isMobilePreview && "flex-wrap"
                    )}>
                      <div className={cn(
                        "rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0",
                        isMobilePreview ? "w-10 h-10" : "w-12 h-12"
                      )}>
                        <User className={cn("text-primary", isMobilePreview ? "h-5 w-5" : "h-6 w-6")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium truncate", isMobilePreview ? "text-sm" : "text-base")}>
                          {agent?.name || listing.agentName}
                        </p>
                        <div className={cn(
                          "flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground mt-0.5",
                          isMobilePreview ? "text-[10px]" : "text-xs sm:text-sm"
                        )}>
                          {agent?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{agent.phone}</span>
                            </span>
                          )}
                          {agent?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{agent.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size={isMobilePreview ? "sm" : "default"}
                        className={cn(style.accentBg, "text-white", isMobilePreview ? "text-xs h-8" : "")}
                      >
                        Contact
                      </Button>
                    </div>
                  </div>

                  {/* Reference & Permit */}
                  <div className={cn(
                    "flex items-center justify-between mt-3 pt-3 border-t text-muted-foreground",
                    isMobilePreview ? "text-[10px]" : "text-xs"
                  )}>
                    <span>Ref: {listing.refNumber}</span>
                    {portal.country === 'UAE' && (customization.permitNumber || listing.permitNumber) && (
                      <span>Permit: {customization.permitNumber || listing.permitNumber}</span>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={cn(
          "border-t bg-muted/30 flex items-center justify-between gap-2 flex-shrink-0",
          isMobile ? "p-3" : "p-4"
        )}>
          <p className={cn("text-muted-foreground hidden sm:block", isMobile ? "text-xs" : "text-sm")}>
            Preview of {portal.name}
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className={cn("flex-1 sm:flex-none", isMobile && "text-sm")}>
              Close
            </Button>
            <Button className={cn("gap-2 flex-1 sm:flex-none", isMobile && "text-sm")}>
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Open on {portal.name}</span>
              <span className="sm:hidden">Open</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}