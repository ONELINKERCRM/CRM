import { useState, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  AlertCircle,
  X,
  GripVertical,
  Plus,
  Trash2,
  Star,
  Upload,
  Eye,
  Loader2,
  Search,
  ChevronsUpDown,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Portal, PortalCustomization, Agent, ListingSummary, PortalAgent } from "./types";
import { toast } from "sonner";
import { PortalPreviewModal } from "./PortalPreviewModal";
import { supabase } from "@/integrations/supabase/client";

// Sortable Image Item
interface SortableImageProps {
  id: string;
  image: string;
  index: number;
  isCover: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSetCover: () => void;
  onRemove: () => void;
}

function SortableImageItem({
  id,
  image,
  index,
  isCover,
  isSelected,
  onToggle,
  onSetCover,
  onRemove,
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden cursor-pointer group border-2 transition-all",
        isDragging && "opacity-50 scale-105 shadow-lg",
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent hover:border-primary/50",
        isCover && "ring-2 ring-amber-500 ring-offset-2"
      )}
      onClick={onToggle}
    >
      <img
        src={image}
        alt={`Image ${index + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Cover Badge */}
      {isCover && (
        <Badge className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-amber-500">
          <Star className="h-3 w-3 mr-0.5" />
          Cover
        </Badge>
      )}

      {/* Selection Indicator */}
      {isSelected && !isCover && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
          <Check className="h-6 w-6 text-primary-foreground bg-primary rounded-full p-1" />
        </div>
      )}

      {/* Hover Actions */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          {!isCover && (
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onSetCover();
              }}
              title="Set as cover"
            >
              <Star className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-[10px] text-white/80">Drag to reorder</span>
      </div>
    </div>
  );
}

interface PortalCustomizationPanelProps {
  portal: Portal;
  customization: PortalCustomization;
  images: string[];
  agents: Agent[];
  portalAgents?: PortalAgent[];
  isLoadingPortalAgents?: boolean;
  amenitiesList: string[];
  listing: ListingSummary;
  onUpdate: (updates: Partial<PortalCustomization>) => void;
  onImagesChange?: (newImages: string[]) => void;
}

const propertyTypes = [
  "Apartment",
  "Villa",
  "Townhouse",
  "Penthouse",
  "Duplex",
  "Studio",
  "Land",
  "Commercial",
  "Office",
  "Retail",
  "Warehouse",
];

const featuresList = [
  "Sea View",
  "City View",
  "Balcony",
  "Terrace",
  "Garden",
  "Private Pool",
  "Built-in Wardrobes",
  "Walk-in Closet",
  "Central A/C",
  "Kitchen Appliances",
  "Smart Home",
  "Private Elevator",
  "Pets Allowed",
  "Study Room",
  "Maid's Room",
  "Driver's Room",
  "Private Garage",
  "Laundry Room",
];

const tagsList = [
  "Hot Deal",
  "Investment Opportunity",
  "Exclusive",
  "New Launch",
  "Sea View",
  "Luxury",
  "Modern",
  "Spacious",
  "Prime Location",
  "Fully Furnished",
  "High ROI",
  "Family Friendly",
];

const countryLocations: Record<string, string[]> = {
  'Qatar': [
    "West Bay, Doha",
    "The Pearl-Qatar, Doha",
    "Lusail City, Doha",
    "Musheireb, Doha",
    "Al Waab, Doha",
    "Al Sadd, Doha",
    "Madinat Khalifa, Doha",
    "Abu Hamour, Doha",
    "Al Rayyan",
    "Al Wakrah",
    "Al Khor",
    "Ain Khaled, Doha",
    "Dafna, Doha",
    "Msheireb Downtown Doha"
  ],
  'UAE': [
    "Dubai Marina, Dubai",
    "Downtown Dubai, Dubai",
    "Palm Jumeirah, Dubai",
    "Jumeirah Village Circle (JVC), Dubai",
    "Business Bay, Dubai",
    "Dubai Hills Estate, Dubai",
    "Jumeirah Lake Towers (JLT), Dubai",
    "Arabian Ranches, Dubai",
    "Yas Island, Abu Dhabi",
    "Saadiyat Island, Abu Dhabi",
    "Al Reem Island, Abu Dhabi",
    "Dubai South, Dubai",
    "Mohammed Bin Rashid City, Dubai",
    "Al Barsha, Dubai"
  ],
  'Saudi Arabia': [
    "Riyadh",
    "Jeddah",
    "Dammam",
    "Al Khobar",
    "Mecca",
    "Medina",
    "Abha",
    "Tabuk",
    "Buraidah",
    "Al Jubail"
  ],
};

export function PortalCustomizationPanel({
  portal,
  customization,
  images,
  agents,
  portalAgents = [],
  isLoadingPortalAgents = false,
  amenitiesList,
  listing,
  onUpdate,
  onImagesChange,
}: PortalCustomizationPanelProps) {
  const getCurrency = (country?: string | null) => {
    if (!country) return 'AED';
    const map: Record<string, string> = {
      'UAE': 'AED',
      'Qatar': 'QAR',
      'Saudi Arabia': 'SAR',
      'Oman': 'OMR',
      'Bahrain': 'BHD',
      'Kuwait': 'KWD',
      'Egypt': 'EGP',
      'Lebanon': 'LBP'
    };
    return map[country] || 'AED';
  };

  const currency = getCurrency(portal.country);
  const locationPlaceholder = portal.country === 'Qatar' ? "e.g. West Bay, Doha" :
    portal.country === 'UAE' ? "e.g. Dubai Marina, Dubai" :
      "Enter location";

  const [isOpen, setIsOpen] = useState(true);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [localImages, setLocalImages] = useState<string[]>(images);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const locations = useMemo(() => {
    if (!portal.country) return [];
    return countryLocations[portal.country] || [];
  }, [portal.country]);

  const filteredLocations = useMemo(() => {
    if (!locationSearch) return locations;
    return locations.filter(l =>
      l.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [locations, locationSearch]);

  const currentAgent = agents.find(a => a.id === customization.agentId);
  const selectedPortalAgent = portalAgents.find(a => a.id === customization.agentId);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true);
    toast.loading("Generating optimized description...", { id: "gen-desc" });

    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const optimizedDescription = `Discover this exceptional property perfect for ${portal.name}. Featuring modern design, premium finishes, and an ideal location. This property offers everything you need for comfortable living with easy access to amenities and transport links.`;

    onUpdate({ description: optimizedDescription });
    setIsGeneratingDescription(false);
    toast.success("Description generated!", { id: "gen-desc" });
  };

  const toggleImage = (index: number) => {
    const newSelected = customization.selectedImages.includes(index)
      ? customization.selectedImages.filter((i) => i !== index)
      : [...customization.selectedImages, index];
    onUpdate({ selectedImages: newSelected });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localImages.findIndex((img) => img === active.id);
      const newIndex = localImages.findIndex((img) => img === over.id);
      const newImages = arrayMove(localImages, oldIndex, newIndex);
      setLocalImages(newImages);
      onImagesChange?.(newImages);

      // Update selected images indices
      const newSelectedImages = customization.selectedImages.map((selectedIdx) => {
        if (selectedIdx === oldIndex) return newIndex;
        if (oldIndex < newIndex) {
          if (selectedIdx > oldIndex && selectedIdx <= newIndex) return selectedIdx - 1;
        } else {
          if (selectedIdx >= newIndex && selectedIdx < oldIndex) return selectedIdx + 1;
        }
        return selectedIdx;
      });
      onUpdate({ selectedImages: newSelectedImages });
      toast.success("Image order updated");
    }
  };

  const setCoverImage = (index: number) => {
    // Move image to first position in selected images
    const newSelected = [index, ...customization.selectedImages.filter((i) => i !== index)];
    onUpdate({ selectedImages: newSelected });
    toast.success("Cover image set");
  };

  const handleAddImages = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    toast.loading(`Uploading ${files.length} image(s)...`, { id: "upload-images" });

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `listings/${fileName}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('property-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('property-media')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        const updatedImages = [...localImages, ...uploadedUrls];
        setLocalImages(updatedImages);
        onImagesChange?.(updatedImages);

        // Auto-select new images
        const newIndices = uploadedUrls.map((_, idx) => localImages.length + idx);
        onUpdate({ selectedImages: [...customization.selectedImages, ...newIndices] });

        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`, { id: "upload-images" });
      } else {
        toast.error("Failed to upload images", { id: "upload-images" });
      }
    } catch (err) {
      console.error("Error uploading images:", err);
      toast.error("Failed to upload images", { id: "upload-images" });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = localImages.filter((_, i) => i !== index);
    setLocalImages(newImages);
    onImagesChange?.(newImages);

    // Update selected images
    const newSelected = customization.selectedImages
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));
    onUpdate({ selectedImages: newSelected });
    toast.success("Image removed");
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = customization.amenities.includes(amenity)
      ? customization.amenities.filter((a) => a !== amenity)
      : [...customization.amenities, amenity];
    onUpdate({ amenities: newAmenities });
  };

  const addKeyword = (keyword: string) => {
    if (keyword && !customization.seoKeywords.includes(keyword)) {
      onUpdate({ seoKeywords: [...customization.seoKeywords, keyword] });
    }
  };

  const removeKeyword = (keyword: string) => {
    onUpdate({
      seoKeywords: customization.seoKeywords.filter((k) => k !== keyword),
    });
  };

  const validationColor = customization.validationScore >= 90
    ? "text-emerald-600"
    : customization.validationScore >= 70
      ? "text-amber-600"
      : "text-red-600";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("transition-all", isOpen && "ring-1 ring-primary/20")}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold">
                    {portal.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm sm:text-base truncate">{portal.name}</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {customization.selectedImages.length} images
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPreview(true);
                  }}
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
                <div className="hidden sm:flex items-center gap-2">
                  <Progress
                    value={customization.validationScore}
                    className="w-16 sm:w-20 h-2"
                  />
                  <span className={cn("text-xs sm:text-sm font-medium", validationColor)}>
                    {customization.validationScore}%
                  </span>
                </div>
                {customization.isValid ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0">
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                    <span className="hidden sm:inline">Valid</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0">
                    <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                    <span className="hidden sm:inline">Issues</span>
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 sm:space-y-4 pt-0 px-3 sm:px-6">
            {/* Validation Errors */}
            {customization.errors.length > 0 && (
              <div className="p-2 sm:p-3 bg-destructive/10 rounded-lg space-y-1">
                <p className="text-xs sm:text-sm font-medium text-destructive">Missing Requirements:</p>
                {customization.errors.map((error, i) => (
                  <p key={i} className="text-xs sm:text-sm text-destructive flex items-center gap-1.5">
                    <X className="h-3 w-3 shrink-0" />
                    {error}
                  </p>
                ))}
              </div>
            )}

            {/* Basic Info Section - Collapsible on mobile */}
            <Collapsible defaultOpen className="border rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 sm:p-3 hover:bg-secondary/30 transition-colors">
                <span className="text-xs sm:text-sm font-medium">Basic Information</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 space-y-3">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor={`title-${portal.id}`} className="text-xs sm:text-sm">Listing Title</Label>
                  <Input
                    id={`title-${portal.id}`}
                    value={customization.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="Enter listing title"
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`desc-${portal.id}`} className="text-xs sm:text-sm">Description</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription}
                      className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                    >
                      <Sparkles className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">{isGeneratingDescription ? "Generating..." : "Auto-Generate"}</span>
                    </Button>
                  </div>
                  <Textarea
                    id={`desc-${portal.id}`}
                    value={customization.description}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    placeholder="Enter listing description"
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {customization.description.length} characters
                  </p>
                </div>

                {/* Price & Property Type */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`price-${portal.id}`} className="text-xs sm:text-sm">Price</Label>
                    <Input
                      id={`price-${portal.id}`}
                      value={customization.price}
                      onChange={(e) => onUpdate({ price: e.target.value })}
                      placeholder={`${currency} 2,500,000`}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Property Type</Label>
                    <Select
                      value={customization.propertyType}
                      onValueChange={(value) => onUpdate({ propertyType: value })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type} value={type} className="text-sm">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <Label htmlFor={`location-${portal.id}`} className="text-xs sm:text-sm">Location</Label>
                  <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Input
                          id={`location-${portal.id}`}
                          value={customization.location || ""}
                          onChange={(e) => {
                            onUpdate({ location: e.target.value });
                            setLocationSearch(e.target.value);
                            if (!locationOpen) setLocationOpen(true);
                          }}
                          onFocus={() => {
                            setLocationSearch(customization.location || "");
                            setLocationOpen(true);
                          }}
                          placeholder={locationPlaceholder}
                          className="h-9 sm:h-10 text-sm pr-9"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Search className="h-4 w-4" />
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command shouldFilter={false}>
                        <CommandList>
                          <CommandEmpty>No locations found.</CommandEmpty>
                          <CommandGroup heading="Suggestions">
                            {filteredLocations.map((loc) => (
                              <CommandItem
                                key={loc}
                                value={loc}
                                onSelect={() => {
                                  onUpdate({ location: loc });
                                  setLocationOpen(false);
                                }}
                                className="text-sm"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    customization.location === loc ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {loc}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Property Status & Details */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {customization.purpose === 'Rent' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Rent Frequency</Label>
                        <Select
                          value={customization.rentFrequency || "Yearly"}
                          onValueChange={(value) => onUpdate({ rentFrequency: value as any })}
                        >
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yearly" className="text-sm">Yearly</SelectItem>
                            <SelectItem value="Monthly" className="text-sm">Monthly</SelectItem>
                            <SelectItem value="Weekly" className="text-sm">Weekly</SelectItem>
                            <SelectItem value="Daily" className="text-sm">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm">Number of Cheques</Label>
                        <Select
                          value={customization.cheques?.toString() || ""}
                          onValueChange={(value) => onUpdate({ cheques: parseInt(value) })}
                        >
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 4, 6, 12].map(num => (
                              <SelectItem key={num} value={num.toString()} className="text-sm">{num} Cheques</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Completion Status</Label>
                    <Select
                      value={customization.completionStatus || "Ready"}
                      onValueChange={(value) => onUpdate({ completionStatus: value as any })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ready" className="text-sm">Ready</SelectItem>
                        <SelectItem value="Off-plan" className="text-sm">Off-plan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`developer-${portal.id}`} className="text-xs sm:text-sm">Developer (Optional)</Label>
                    <Input
                      id={`developer-${portal.id}`}
                      value={customization.developer || ""}
                      onChange={(e) => onUpdate({ developer: e.target.value })}
                      placeholder="e.g. Emaar"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`project-${portal.id}`} className="text-xs sm:text-sm">Project (Optional)</Label>
                    <Input
                      id={`project-${portal.id}`}
                      value={customization.projectName || ""}
                      onChange={(e) => onUpdate({ projectName: e.target.value })}
                      placeholder="e.g. Dubai Marina"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`building-${portal.id}`} className="text-xs sm:text-sm">Building Name (Optional)</Label>
                  <Input
                    id={`building-${portal.id}`}
                    value={customization.buildingName || ""}
                    onChange={(e) => onUpdate({ buildingName: e.target.value })}
                    placeholder="e.g. Marina Gate"
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>

                {portal.country === 'UAE' && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`permit-${portal.id}`} className="text-xs sm:text-sm">Permit Number</Label>
                    <Input
                      id={`permit-${portal.id}`}
                      value={customization.permitNumber || ""}
                      onChange={(e) => onUpdate({ permitNumber: e.target.value })}
                      placeholder="e.g. 7123456789"
                      className="h-9 sm:h-10 text-sm border-amber-200 focus-visible:ring-amber-500"
                    />
                  </div>
                )}

                {/* Floor and Parking */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`floor-${portal.id}`} className="text-xs sm:text-sm">Floor Number (Optional)</Label>
                    <Input
                      id={`floor-${portal.id}`}
                      type="number"
                      value={customization.floorNumber || ""}
                      onChange={(e) => onUpdate({ floorNumber: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 15"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`parking-${portal.id}`} className="text-xs sm:text-sm">Parking Spaces (Optional)</Label>
                    <Input
                      id={`parking-${portal.id}`}
                      type="number"
                      value={customization.parkingSpaces || ""}
                      onChange={(e) => onUpdate({ parkingSpaces: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 1"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Bedrooms, Bathrooms, Size */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`beds-${portal.id}`} className="text-xs sm:text-sm">Beds</Label>
                    <Input
                      id={`beds-${portal.id}`}
                      type="number"
                      value={customization.bedrooms || ""}
                      onChange={(e) => onUpdate({ bedrooms: parseInt(e.target.value) || 0 })}
                      placeholder="3"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`baths-${portal.id}`} className="text-xs sm:text-sm">Baths</Label>
                    <Input
                      id={`baths-${portal.id}`}
                      type="number"
                      value={customization.bathrooms || ""}
                      onChange={(e) => onUpdate({ bathrooms: parseInt(e.target.value) || 0 })}
                      placeholder="2"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`size-${portal.id}`} className="text-xs sm:text-sm">Size</Label>
                    <Input
                      id={`size-${portal.id}`}
                      value={customization.size || ""}
                      onChange={(e) => onUpdate({ size: e.target.value })}
                      placeholder="1,500 sqft"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Purpose & Furnishing */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Purpose</Label>
                    <Select
                      value={customization.purpose || "Sale"}
                      onValueChange={(value) => onUpdate({ purpose: value as 'Sale' | 'Rent' })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sale" className="text-sm">For Sale</SelectItem>
                        <SelectItem value="Rent" className="text-sm">For Rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Furnishing (Optional)</Label>
                    <Select
                      value={customization.furnishing || ""}
                      onValueChange={(value) => onUpdate({ furnishing: value })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Furnished" className="text-sm">Furnished</SelectItem>
                        <SelectItem value="Semi-Furnished" className="text-sm">Semi-Furnished</SelectItem>
                        <SelectItem value="Unfurnished" className="text-sm">Unfurnished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Country-Specific: UAE Permit Number */}
                {portal.country === 'UAE' && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`permit-${portal.id}`} className="text-xs sm:text-sm">
                      Permit Number (Trakheesi)
                    </Label>
                    <Input
                      id={`permit-${portal.id}`}
                      value={customization.permitNumber || ""}
                      onChange={(e) => onUpdate({ permitNumber: e.target.value })}
                      placeholder="Enter permit number"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                )}

                {/* Qatar-Specific fields could go here if any */}
                {portal.country === 'Qatar' && (
                  <div className="text-[10px] text-muted-foreground italic px-1">
                    No permit number required for Qatar portals.
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
            \
            {/* Advanced Mapping & Media */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-xs sm:text-sm font-medium">Advanced Mapping & Media</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4 px-1 pb-2">
                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`lat-${portal.id}`} className="text-xs sm:text-sm">Latitude</Label>
                    <Input
                      id={`lat-${portal.id}`}
                      type="number"
                      step="any"
                      value={customization.latitude || ""}
                      onChange={(e) => onUpdate({ latitude: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 25.2048"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`long-${portal.id}`} className="text-xs sm:text-sm">Longitude</Label>
                    <Input
                      id={`long-${portal.id}`}
                      type="number"
                      step="any"
                      value={customization.longitude || ""}
                      onChange={(e) => onUpdate({ longitude: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 55.2708"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Plot Size & View */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`plot-${portal.id}`} className="text-xs sm:text-sm">Plot Size (Optional)</Label>
                    <Input
                      id={`plot-${portal.id}`}
                      value={customization.plotSize || ""}
                      onChange={(e) => onUpdate({ plotSize: e.target.value })}
                      placeholder="e.g. 6,000 sqft"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`view-${portal.id}`} className="text-xs sm:text-sm">Property View (Optional)</Label>
                    <Input
                      id={`view-${portal.id}`}
                      value={customization.view || ""}
                      onChange={(e) => onUpdate({ view: e.target.value })}
                      placeholder="e.g. Full Marina View"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Occupancy & Service Charges */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">Occupancy</Label>
                    <Select
                      value={customization.occupancy || ""}
                      onValueChange={(value) => onUpdate({ occupancy: value })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vacant" className="text-sm">Vacant</SelectItem>
                        <SelectItem value="Tenanted" className="text-sm">Tenanted</SelectItem>
                        <SelectItem value="Owner Occupied" className="text-sm">Owner Occupied</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`service-${portal.id}`} className="text-xs sm:text-sm">Service Charges (AED/yr)</Label>
                    <Input
                      id={`service-${portal.id}`}
                      type="number"
                      value={customization.serviceCharges || ""}
                      onChange={(e) => onUpdate({ serviceCharges: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 25000"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Ownership Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">Ownership Type (Optional)</Label>
                  <Select
                    value={customization.ownershipType || ""}
                    onValueChange={(value) => onUpdate({ ownershipType: value })}
                  >
                    <SelectTrigger className="h-9 sm:h-10 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Freehold" className="text-sm">Freehold</SelectItem>
                      <SelectItem value="Leasehold" className="text-sm">Leasehold</SelectItem>
                      <SelectItem value="Commonhold" className="text-sm">Commonhold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Media Links */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`video-${portal.id}`} className="text-xs sm:text-sm">Video URL (YouTube/Vimeo)</Label>
                    <Input
                      id={`video-${portal.id}`}
                      value={customization.videoUrl || ""}
                      onChange={(e) => onUpdate({ videoUrl: e.target.value })}
                      placeholder="https://youtu.be/..."
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`tour-${portal.id}`} className="text-xs sm:text-sm">360 Virtual Tour URL</Label>
                    <Input
                      id={`tour-${portal.id}`}
                      value={customization.tourUrl || ""}
                      onChange={(e) => onUpdate({ tourUrl: e.target.value })}
                      placeholder="https://my.matterport.com/..."
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Features Section - NEW */}
            <Collapsible className="border rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 sm:p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium">Features (Optional)</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {(customization.features || []).length}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {featuresList.map((feature) => (
                    <Badge
                      key={feature}
                      variant={(customization.features || []).includes(feature) ? "default" : "outline"}
                      className="cursor-pointer transition-all text-[10px] sm:text-xs px-2 py-0.5"
                      onClick={() => {
                        const currentFeatures = customization.features || [];
                        const newFeatures = currentFeatures.includes(feature)
                          ? currentFeatures.filter((f) => f !== feature)
                          : [...currentFeatures, feature];
                        onUpdate({ features: newFeatures });
                      }}
                    >
                      {(customization.features || []).includes(feature) && (
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tags Section - NEW */}
            <Collapsible className="border rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 sm:p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium">Optional Tags</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {(customization.tags || []).length}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {tagsList.map((tag) => (
                    <Badge
                      key={tag}
                      variant={(customization.tags || []).includes(tag) ? "default" : "outline"}
                      className="cursor-pointer transition-all text-[10px] sm:text-xs px-2 py-0.5"
                      onClick={() => {
                        const currentTags = customization.tags || [];
                        const newTags = currentTags.includes(tag)
                          ? currentTags.filter((t) => t !== tag)
                          : [...currentTags, tag];
                        onUpdate({ tags: newTags });
                      }}
                    >
                      {(customization.tags || []).includes(tag) && (
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Images Section - Collapsible on mobile */}
            <Collapsible defaultOpen className="border rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 sm:p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium">Images</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {customization.selectedImages.length} selected
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Drag to reorder. First = cover.
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddImages}
                      disabled={isUploading}
                      className="h-7 text-xs px-2"
                    >
                      {isUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin sm:mr-1" />
                      ) : (
                        <Plus className="h-3 w-3 sm:mr-1" />
                      )}
                      <span className="hidden sm:inline">{isUploading ? "Uploading..." : "Add"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdate({ selectedImages: localImages.map((_, i) => i) })}
                      className="h-7 text-xs px-2"
                    >
                      All
                    </Button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localImages}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2">
                      {localImages.map((img, index) => (
                        <SortableImageItem
                          key={img}
                          id={img}
                          image={img}
                          index={index}
                          isCover={customization.selectedImages[0] === index}
                          isSelected={customization.selectedImages.includes(index)}
                          onToggle={() => toggleImage(index)}
                          onSetCover={() => setCoverImage(index)}
                          onRemove={() => removeImage(index)}
                        />
                      ))}

                      {/* Add Image Placeholder */}
                      <div
                        className={cn(
                          "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center cursor-pointer bg-muted/30",
                          isUploading && "opacity-50 pointer-events-none"
                        )}
                        onClick={handleAddImages}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground mb-0.5" />
                            <span className="text-[9px] text-muted-foreground">Add</span>
                          </>
                        )}
                      </div>
                    </div>
                  </SortableContext>
                </DndContext>
              </CollapsibleContent>
            </Collapsible>

            {/* Agent Section - Collapsible on mobile */}
            <Collapsible defaultOpen className="border rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 sm:p-3 hover:bg-secondary/30 transition-colors">
                <span className="text-xs sm:text-sm font-medium">Agent Assignment</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
                {isLoadingPortalAgents ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                    <span className="text-xs text-muted-foreground">Loading portal agents...</span>
                  </div>
                ) : portalAgents.length > 0 ? (
                  <Popover open={agentSearchOpen} onOpenChange={setAgentSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={agentSearchOpen}
                        className="w-full h-9 sm:h-10 justify-between text-sm font-normal"
                      >
                        {selectedPortalAgent ? (
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">{selectedPortalAgent.name}</span>
                            {selectedPortalAgent.brn && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                BRN: {selectedPortalAgent.brn}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select agent...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search agents..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No agent found.</CommandEmpty>
                          <CommandGroup>
                            {portalAgents.map((agent) => (
                              <CommandItem
                                key={agent.id}
                                value={`${agent.name} ${agent.email || ''} ${agent.brn || ''}`}
                                onSelect={() => {
                                  onUpdate({ agentId: agent.id });
                                  setAgentSearchOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    customization.agentId === agent.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate">{agent.name}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    {agent.email && <span className="truncate">{agent.email}</span>}
                                    {agent.brn && <span className="shrink-0">BRN: {agent.brn}</span>}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="text-center py-3 text-muted-foreground">
                    <p className="text-xs">No agents available for this portal</p>
                    <p className="text-[10px] mt-1">Connect your portal account to fetch agents</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Amenities Section - Collapsible on mobile */}
            <Collapsible className="border rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 sm:p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium">Amenities</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {customization.amenities.length}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {amenitiesList.map((amenity) => (
                    <Badge
                      key={amenity}
                      variant={customization.amenities.includes(amenity) ? "default" : "outline"}
                      className="cursor-pointer transition-all text-[10px] sm:text-xs px-2 py-0.5"
                      onClick={() => toggleAmenity(amenity)}
                    >
                      {customization.amenities.includes(amenity) && (
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* SEO Keywords Section - Collapsible on mobile */}
            <Collapsible className="border rounded-lg">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 sm:p-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium">SEO Keywords</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {customization.seoKeywords.length}
                  </Badge>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 space-y-2">
                {customization.seoKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customization.seoKeywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="gap-1 text-[10px] sm:text-xs px-2 py-0.5">
                        {keyword}
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="hover:text-destructive"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5 sm:gap-2">
                  <Input
                    placeholder="Add keyword"
                    className="h-8 sm:h-9 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addKeyword(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-xs px-2 sm:px-3"
                    onClick={() => {
                      const suggestions = ["luxury", "modern", "spacious", "prime location"];
                      suggestions.forEach(addKeyword);
                    }}
                  >
                    <Sparkles className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Suggest</span>
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Preview Modal */}
      <PortalPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        portal={portal}
        customization={customization}
        listing={listing}
        agent={currentAgent}
      />
    </Collapsible >
  );
}
