import { useState, forwardRef, useRef, useEffect } from "react";
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
  X,
  Upload,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  MapPin,
  DollarSign,
  Home,
  Bed,
  Bath,
  Ruler,
  FileText,
  Globe,
  Check,
  Star,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { LocationSearchInput } from "./LocationSearchInput";

// Sortable Image Item Component
interface SortableImageProps {
  id: string;
  image: string;
  index: number;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
}

const SortableImageItem = forwardRef<HTMLDivElement, SortableImageProps>(
  function SortableImageItem({ id, image, index, isCover, onSetCover, onRemove }, _ref) {
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
          "relative group aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all",
          isDragging ? "opacity-50 scale-105 border-primary shadow-lg" : "border-transparent",
          isCover && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <img
          src={image}
          alt={`Property ${index + 1}`}
          className="w-full h-full object-cover"
        />
        {isCover && (
          <Badge className="absolute top-2 left-2 bg-primary gap-1">
            <Star className="h-3 w-3" />
            Cover
          </Badge>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            {!isCover && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetCover();
                }}
                title="Set as cover"
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs text-white/80">Drag to reorder</span>
        </div>
      </div>
    );
  }
);

interface ListingFormData {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  price: string;
  currency: string;
  priceType: string;
  location: string;
  area: string;
  city: string;
  bedrooms: string;
  bathrooms: string;
  size: string;
  sizeUnit: string;
  propertyType: string;
  listingType: string;
  status: string;
  furnishing: string;
  completionStatus: string;
  permitNumber: string;
  refNumber: string;
  amenities: string[];
  features: string[];
  images: string[];
  portals: { name: string; enabled: boolean; autoPublish: boolean }[];
  latitude: string;
  longitude: string;
  plotSize: string;
  view: string;
  occupancy: string;
  serviceCharges: string;
  cheques: string;
  videoUrl: string;
  tourUrl: string;
  ownershipType: string;
  developer: string;
  projectName: string;
  buildingName: string;
  floorNumber: string;
  parkingSpaces: string;
}

const currencies = [
  { value: "AED", label: "AED", symbol: "د.إ" },
  { value: "USD", label: "USD", symbol: "$" },
  { value: "QAR", label: "QAR", symbol: "ر.ق" },
  { value: "SAR", label: "SAR", symbol: "ر.س" },
  { value: "EUR", label: "EUR", symbol: "€" },
  { value: "GBP", label: "GBP", symbol: "£" },
];

const sizeUnits = [
  { value: "sqft", label: "sq ft" },
  { value: "sqm", label: "sq m" },
];

const listingStatuses = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "rented", label: "Rented" },
  { value: "reserved", label: "Reserved" },
  { value: "off_market", label: "Off Market" },
  { value: "draft", label: "Draft" },
];

const getDefaultFormData = (): ListingFormData => {
  const savedCurrency = localStorage.getItem('listing_preferred_currency') || 'AED';
  const savedSizeUnit = localStorage.getItem('listing_preferred_size_unit') || 'sqft';

  return {
    title: "",
    titleAr: "",
    description: "",
    descriptionAr: "",
    price: "",
    currency: savedCurrency,
    // Backend expects price_frequency: total|yearly|monthly|weekly|daily
    // For sale listings we default to total; for rent we will derive it at save-time if needed.
    priceType: "total",
    location: "",
    area: "",
    city: "Dubai",
    bedrooms: "",
    bathrooms: "",
    size: "",
    sizeUnit: savedSizeUnit,
    propertyType: "apartment",
    listingType: "sale",
    status: "active",
    furnishing: "unfurnished",
    completionStatus: "ready",
    permitNumber: "",
    refNumber: "",
    amenities: [],
    features: [],
    images: [],
    portals: [
      { name: "Property Finder", enabled: false, autoPublish: false },
      { name: "Bayut", enabled: false, autoPublish: false },
      { name: "Dubizzle", enabled: false, autoPublish: false },
      { name: "Website", enabled: true, autoPublish: true },
    ],
    latitude: "",
    longitude: "",
    plotSize: "",
    view: "",
    occupancy: "",
    serviceCharges: "",
    cheques: "1",
    videoUrl: "",
    tourUrl: "",
    ownershipType: "freehold",
    developer: "",
    projectName: "",
    buildingName: "",
    floorNumber: "",
    parkingSpaces: "",
  };
};

const amenitiesList = [
  "Swimming Pool",
  "Gym",
  "24/7 Security",
  "Covered Parking",
  "Children's Play Area",
  "BBQ Area",
  "Concierge Service",
  "Beach Access",
  "Spa",
  "Tennis Court",
  "Sauna",
  "Jacuzzi",
  "Garden",
  "Balcony",
  "Terrace",
  "Rooftop Access",
];

const featuresList = [
  "Sea View",
  "City View",
  "Garden View",
  "Pool View",
  "Balcony",
  "Built-in Wardrobes",
  "Central A/C",
  "Kitchen Appliances",
  "Pets Allowed",
  "Maid's Room",
  "Driver's Room",
  "Private Pool",
  "Private Garden",
  "Smart Home",
  "Study Room",
  "Storage Room",
];

const propertyTypes = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "penthouse", label: "Penthouse" },
  { value: "duplex", label: "Duplex" },
  { value: "studio", label: "Studio" },
  { value: "land", label: "Land" },
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse" },
];

// Cities list removed - now using searchable location input

interface AddEditListingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Partial<ListingFormData>;
  mode?: "add" | "edit";
  listingId?: string;
  onSave?: (data: ListingFormData) => void;
}

export function AddEditListingForm({
  open,
  onOpenChange,
  editData,
  mode = "add",
  listingId,
  onSave,
}: AddEditListingFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ListingFormData>(() => ({
    ...getDefaultFormData(),
    ...editData,
  }));
  const [activeTab, setActiveTab] = useState("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [draftId, setDraftId] = useState<string | null>(listingId || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Auto-save draft function
  const saveDraft = async (data: ListingFormData) => {
    // Only auto-save for new listings (mode === "add")
    if (mode !== "add") return;

    // Don't save if title is empty (minimum requirement for draft)
    if (!data.title || data.title.trim().length === 0) return;

    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const draftData = {
        title: data.title,
        title_ar: data.titleAr || null,
        description: data.description || null,
        description_ar: data.descriptionAr || null,
        price: data.price ? parseFloat(data.price) : null,
        currency: data.currency,
        rent_frequency: data.listingType === "rent" && data.priceType ? data.priceType : null,
        address: data.location || null,
        city: data.city || null,
        country: "UAE",
        number_of_bedrooms: data.bedrooms ? (data.bedrooms === "Studio" ? 0 : parseInt(data.bedrooms)) : null,
        number_of_bathrooms: data.bathrooms ? parseInt(data.bathrooms) : null,
        area_size: data.size ? parseFloat(data.size) : null,
        area_unit: data.sizeUnit,
        property_type: data.propertyType === "land" ? "land" : ["warehouse"].includes(data.propertyType) ? "industrial" : ["office", "retail"].includes(data.propertyType) ? "commercial" : "residential",
        listing_type: data.listingType,
        status: "draft", // Always save as draft
        furnished: data.furnishing || null,
        completion_status: data.completionStatus || null,
        permit_number: data.permitNumber || null,
        reference_number: data.refNumber || null,
        amenities: data.amenities,
        images: data.images,
        tags: data.features || [],
        company_id: agent?.company_id || null,
        created_by: agent?.id || null,
        assigned_agent_id: agent?.id || null,
      };

      if (draftId) {
        // Update existing draft
        const { error } = await supabase
          .from('listings')
          .update({
            ...draftData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draftId);

        if (error) throw error;
      } else {
        // Create new draft
        const { data: newDraft, error } = await supabase
          .from('listings')
          .insert(draftData)
          .select('id')
          .single();

        if (error) throw error;
        if (newDraft) {
          setDraftId(newDraft.id);
          console.log('Draft created with ID:', newDraft.id);
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      throw error;
    }
  };

  // Auto-save hook
  const { isSaving: isAutoSaving, lastSaved } = useAutoSave(
    formData,
    saveDraft,
    {
      enabled: open && mode === "add", // Only enable for new listings
      debounceMs: 3000, // Save after 3 seconds of inactivity
      intervalMs: 30000, // Also save every 30 seconds
      onSaveStart: () => {
        console.log('[AutoSave] Starting save...');
        setAutoSaveStatus('saving');
      },
      onSaveSuccess: () => {
        console.log('[AutoSave] Save successful!');
        setAutoSaveStatus('saved');
        toast.success('Draft saved', {
          description: 'Your listing has been auto-saved',
          duration: 2000,
        });
        setTimeout(() => {
          console.log('[AutoSave] Resetting status to idle');
          setAutoSaveStatus('idle');
        }, 3000); // Show "Saved as draft" for 3 seconds
      },
      onSaveError: (error) => {
        console.error('[AutoSave] Save failed:', error);
        setAutoSaveStatus('error');
      },
    }
  );

  // Track previous open state to detect when dialog just opened
  const prevOpenRef = useRef(open);

  // Sync form data only when dialog opens
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;

    if (justOpened) {
      if (mode === "edit" && editData) {
        setFormData({
          ...getDefaultFormData(),
          ...editData,
          // Ensure arrays are handled correctly if partial data is provided
          amenities: editData.amenities || [],
          features: editData.features || [],
          images: editData.images || [],
          portals: editData.portals || getDefaultFormData().portals,
          // Handle Studio (0) to "Studio" conversion
          bedrooms: editData.bedrooms === "0" ? "Studio" : editData.bedrooms,
        } as ListingFormData);
      } else if (mode === "add") {
        setFormData(getDefaultFormData());
        setErrors({});
        setTouched({});
        setActiveTab("details");
        setDraftId(null); // Reset draft ID for new listings
        setAutoSaveStatus('idle');
      }
    }

    prevOpenRef.current = open;
  }, [open, mode, editData]);

  // Debug: Log autoSaveStatus changes
  useEffect(() => {
    console.log('[AutoSave] Status changed to:', autoSaveStatus);
  }, [autoSaveStatus]);

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

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "title":
        if (!value.trim()) return "Property title is required";
        if (value.trim().length < 5) return "Title must be at least 5 characters";
        if (value.trim().length > 150) return "Title must be less than 150 characters";
        return "";
      case "price":
        if (!value.trim()) return "Price is required";
        if (isNaN(Number(value)) || Number(value) <= 0) return "Please enter a valid price";
        return "";
      case "location":
        if (!value.trim()) return "Location is required";
        if (value.trim().length < 3) return "Location must be at least 3 characters";
        return "";
      case "refNumber":
        if (!value.trim()) return "Reference number is required";
        return "";
      case "status":
        if (!value) return "Status is required";
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof ListingFormData] as string);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const updateField = <K extends keyof ListingFormData>(
    field: K,
    value: ListingFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (touched[field as string]) {
      const error = validateField(field as string, value as string);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const togglePortal = (portalName: string, field: "enabled" | "autoPublish") => {
    setFormData((prev) => ({
      ...prev,
      portals: prev.portals.map((p) =>
        p.name === portalName ? { ...p, [field]: !p[field] } : p
      ),
    }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises: Promise<string | null>[] = [];

    // Supported image formats
    const supportedFormats = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/gif',
      'image/bmp',
      'image/tiff'
    ];

    const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp', 'tiff', 'tif'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

      // Validate file type - check both MIME type and extension
      const isSupportedMimeType = supportedFormats.includes(file.type.toLowerCase());
      const isSupportedExtension = supportedExtensions.includes(fileExt);

      if (!isSupportedMimeType && !isSupportedExtension) {
        toast.error(`${file.name} is not a supported image format`);
        console.warn(`Rejected file: ${file.name}, type: ${file.type}, extension: ${fileExt}`);
        continue;
      }

      // Validate file size (50MB max for high-quality images)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 50MB)`);
        console.warn(`File too large: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        continue;
      }

      const uploadPromise = (async () => {
        try {
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `listings/${fileName}`;

          console.log(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${filePath}`);

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('property-media')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error for', file.name, ':', uploadError);
            toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
            return null;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('property-media')
            .getPublicUrl(filePath);

          console.log(`Successfully uploaded ${file.name}, URL: ${publicUrl}`);
          return publicUrl;
        } catch (err) {
          console.error('Unexpected error uploading', file.name, ':', err);
          toast.error(`Unexpected error uploading ${file.name}`);
          return null;
        }
      })();

      uploadPromises.push(uploadPromise);
    }

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);

      if (successfulUploads.length > 0) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...successfulUploads],
        }));
        toast.success(`${successfulUploads.length} image(s) uploaded successfully`);
      } else if (files.length > 0) {
        toast.error('No images were uploaded successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    toast.success("Image removed");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.images.findIndex((img) => img === active.id);
        const newIndex = prev.images.findIndex((img) => img === over.id);
        const newImages = arrayMove(prev.images, oldIndex, newIndex);
        return { ...prev, images: newImages };
      });
      toast.success("Image order updated");
    }
  };

  const setCoverImage = (index: number) => {
    setFormData((prev) => {
      const newImages = [...prev.images];
      const [selected] = newImages.splice(index, 1);
      newImages.unshift(selected);
      return { ...prev, images: newImages };
    });
    toast.success("Cover image updated");
  };

  const handleSubmit = async () => {
    // Validate all required fields
    const titleError = validateField("title", formData.title);
    const priceError = validateField("price", formData.price);
    const locationError = validateField("location", formData.location);
    const statusError = validateField("status", formData.status);

    const newErrors = {
      title: titleError,
      price: priceError,
      location: locationError,
      status: statusError,
    };

    setErrors(newErrors);
    setTouched({ title: true, price: true, location: true, status: true });

    const hasErrors = Object.values(newErrors).some((error) => error !== "");

    if (hasErrors) {
      // Switch to details tab if there are errors there
      if (titleError || priceError || locationError || statusError) {
        setActiveTab("details");
      }
      toast.error("Please fix the errors before saving");
      return;
    }

    setIsSubmitting(true);

    // Save preferences for future listings
    localStorage.setItem('listing_preferred_currency', formData.currency);
    localStorage.setItem('listing_preferred_size_unit', formData.sizeUnit);

    try {
      // Get user's agent record for company_id
      const { data: agent } = await supabase
        .from('agents')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const statusToDb = (status: string) => {
        if (status === "available") return "active";
        if (status === "off-market") return "off_market";
        return status;
      };

      const propertyTypeToDb = (type: string) => {
        if (type === "land") return "land";
        if (["warehouse"].includes(type)) return "industrial";
        if (["office", "retail"].includes(type)) return "commercial";
        // apartment / villa / townhouse / penthouse / duplex / studio
        return "residential";
      };

      const priceFrequencyToDb = (): string | null => {
        // rent_frequency is only valid for rental listings in the DB
        if (formData.listingType === "sale") return null;
        const allowed = new Set(["yearly", "monthly", "weekly", "daily"]);
        return allowed.has(formData.priceType) ? formData.priceType : "monthly";
      };

      const baseListingData = {
        title: formData.title,
        title_ar: formData.titleAr || null,
        description: formData.description || null,
        description_ar: formData.descriptionAr || null,
        price: formData.price ? parseFloat(formData.price) : null,
        currency: formData.currency,
        rent_frequency: priceFrequencyToDb(),
        address: formData.location || null,
        city: formData.city || null,
        country: "UAE",
        number_of_bedrooms: formData.bedrooms ? (formData.bedrooms === "Studio" ? 0 : parseInt(formData.bedrooms)) : null,
        number_of_bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        area_size: formData.size ? parseFloat(formData.size) : null,
        area_unit: formData.sizeUnit,
        property_type: propertyTypeToDb(formData.propertyType),
        listing_type: formData.listingType,
        status: statusToDb(formData.status),
        furnished: formData.furnishing || null,
        completion_status: formData.completionStatus || null,
        permit_number: formData.permitNumber || null,
        reference_number: formData.refNumber || null,
        amenities: formData.amenities,
        images: formData.images,
        tags: formData.features || [],
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        plot_size: formData.plotSize ? parseFloat(formData.plotSize) : null,
        view_type: formData.view || null,
        service_charge: formData.serviceCharges ? parseFloat(formData.serviceCharges) : null,
        ownership_type: formData.ownershipType || null,
        developer: formData.developer || null,
        project_name: formData.projectName || null,
        building_name: formData.buildingName || null,
        floor_number: formData.floorNumber ? parseInt(formData.floorNumber) : null,
        parking_spaces: formData.parkingSpaces ? parseInt(formData.parkingSpaces) : null,
        virtual_tour_url: formData.tourUrl || null,
        videos: formData.videoUrl ? [formData.videoUrl] : [],
      };

      let savedId = listingId || draftId; // Use draft ID if available
      let error;

      if (mode === "edit" || (mode === "add" && draftId)) {
        // Update existing listing or draft
        const idToUpdate = listingId || draftId;
        if (!idToUpdate) {
          toast.error("Error: Missing listing ID for update");
          setIsSubmitting(false);
          return;
        }

        const { error: updateError } = await supabase
          .from('listings')
          .update({
            ...baseListingData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', idToUpdate);

        error = updateError;
        savedId = idToUpdate;
      } else {
        // Create new listing (no draft exists)
        const { data: insertData, error: insertError } = await supabase
          .from('listings')
          .insert({
            ...baseListingData,
            company_id: agent?.company_id || null,
            created_by: agent?.id || null,
            assigned_agent_id: agent?.id || null,
          })
          .select('id')
          .single();

        error = insertError;
        if (insertData) savedId = insertData.id;
      }

      if (error) throw error;

      // Handle Portal Publications
      if (savedId) {
        const enabledPortals = formData.portals.filter(p => p.enabled && p.name !== "Website");

        if (enabledPortals.length > 0) {
          console.log(`[AddEditForm] Triggering publication for ${enabledPortals.length} portals...`);

          // Get portal IDs for the enabled portals
          const { data: portalsList } = await supabase
            .from('portals')
            .select('id, name');

          for (const p of enabledPortals) {
            const portalDb = portalsList?.find(pl => pl.name.toLowerCase().includes(p.name.toLowerCase()));
            if (portalDb) {
              // Trigger publication
              await supabase.functions.invoke("portal-publish", {
                body: {
                  action: "publish",
                  listing_id: savedId,
                  portal_id: portalDb.id,
                  agent_id: agent?.id || "",
                  company_id: agent?.company_id || "",
                },
              });
            }
          }
        }
      }

      toast.success(
        mode === "add" ? "Listing created successfully!" : "Listing updated successfully!",
        {
          description: formData.title,
        }
      );

      onSave?.(formData);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving listing:', error);
      toast.error("Failed to save listing", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMobile = useIsMobile();
  const { language, isRTL, t } = useLocalization();
  const [contentLang, setContentLang] = useState<'en' | 'ar'>('en');

  // Step completion checks
  const isDetailsComplete = formData.title.trim().length >= 5 && formData.price && formData.location.trim().length >= 3;
  const isMediaComplete = formData.images.length >= 1;
  const isAmenitiesComplete = formData.amenities.length >= 1 || formData.features.length >= 1;
  // Portals is complete only if user manually enabled a portal (not counting default Website)
  const isPortalsComplete = formData.portals.filter(p => p.name !== "Website").some(p => p.enabled);

  const steps = [
    { id: 'details', label: 'Details', icon: FileText, complete: isDetailsComplete },
    { id: 'media', label: 'Media', icon: ImageIcon, complete: isMediaComplete },
    { id: 'amenities', label: 'Amenities', icon: Home, complete: isAmenitiesComplete },
    { id: 'portals', label: 'Portals', icon: Globe, complete: isPortalsComplete },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === activeTab);

  const handleNextStep = () => {
    const tabs = ["details", "media", "amenities", "portals"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    const tabs = ["details", "media", "amenities", "portals"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="max-w-4xl max-h-[95vh] sm:max-h-[90vh] p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with navigation icons on mobile */}
        <ResponsiveDialogHeader className="px-3 py-1.5 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            {/* Close/Back button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              onClick={() => {
                if (currentStepIndex > 0) {
                  handlePrevStep();
                } else {
                  onOpenChange(false);
                }
              }}
            >
              {currentStepIndex > 0 ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            {/* Title */}
            <div className="flex flex-col items-center gap-0.5">
              <ResponsiveDialogTitle className="text-sm sm:text-base font-semibold">
                {mode === "add" ? "Add Listing" : "Edit Listing"}
              </ResponsiveDialogTitle>
              {/* Auto-save indicator */}
              {mode === "add" && formData.title && (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                  {autoSaveStatus === 'saving' && (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-muted-foreground">Saving...</span>
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      <span className="text-green-600">Saved as draft</span>
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      <X className="h-3 w-3 text-destructive" />
                      <span className="text-destructive">Save failed</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Next/Create button */}
            {activeTab !== "portals" ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary lg:w-auto lg:px-4"
                onClick={handleNextStep}
              >
                <ChevronRight className="h-5 w-5 lg:mr-1" />
                <span className="hidden lg:inline">Next</span>
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : mode === "add" ? "Create" : "Update"}
              </Button>
            )}
          </div>
          {/* Mini Progress Bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((steps.filter(s => s.complete).length) / steps.length) * 100}%` }}
            />
          </div>
        </ResponsiveDialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Step Progress Indicator */}
          <div className="px-3 sm:px-4 py-1.5 border-b bg-muted/30 sticky top-[40px] z-10">
            <div className="flex items-center justify-between max-w-sm mx-auto">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = step.id === activeTab;
                const isPast = index < currentStepIndex;

                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => setActiveTab(step.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-all",
                        isActive && "scale-105"
                      )}
                    >
                      <div className={cn(
                        "relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all border-2",
                        step.complete
                          ? "bg-green-500 border-green-500 text-white"
                          : isActive
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-muted border-border text-muted-foreground"
                      )}>
                        {step.complete ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <StepIcon className="h-3 w-3" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[9px] sm:text-[10px] font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "w-6 sm:w-10 h-0.5 mx-1 sm:mx-2 rounded-full transition-colors",
                        step.complete ? "bg-green-500" : "bg-border"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <ResponsiveDialogBody className={isMobile ? "flex-1 overflow-y-auto" : ""}>
            <ScrollArea className={isMobile ? "h-full" : "h-[calc(90vh-180px)]"}>
              {/* Details Tab */}
              <TabsContent value="details" className="p-2 sm:p-3 m-0 space-y-2">
                {/* Basic Information */}
                <Card className="shadow-none border">
                  <CardHeader className="pb-2 px-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium">{isRTL ? "المعلومات الأساسية" : "Basic Information"}</span>
                      </div>
                      {/* Language Toggle for Content */}
                      <div className="flex items-center bg-muted rounded-md p-0.5">
                        <button
                          type="button"
                          onClick={() => setContentLang('en')}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-medium rounded transition-all",
                            contentLang === 'en'
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => setContentLang('ar')}
                          className={cn(
                            "px-2.5 py-1 text-[11px] font-medium rounded transition-all",
                            contentLang === 'ar'
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          العربية
                        </button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-3 pt-0">
                    <div className="grid gap-4">
                      {/* English Content */}
                      {contentLang === 'en' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="title" className={cn("text-sm font-medium flex items-center gap-2", errors.title && touched.title ? "text-destructive" : "")}>
                              Property Title (English) *
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">EN</Badge>
                            </Label>
                            <Input
                              id="title"
                              placeholder="e.g., Luxury 3BR Apartment in Marina Gate"
                              value={formData.title}
                              onChange={(e) => updateField("title", e.target.value)}
                              onBlur={() => handleBlur("title")}
                              className={cn(
                                "h-9 sm:h-10 text-sm",
                                errors.title && touched.title ? "border-destructive focus-visible:ring-destructive" : ""
                              )}
                            />
                            {errors.title && touched.title && (
                              <p className="text-xs sm:text-sm text-destructive">{errors.title}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                              Description (English) (Optional)
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">EN</Badge>
                            </Label>
                            <Textarea
                              id="description"
                              placeholder="Describe the property in English..."
                              rows={4}
                              value={formData.description}
                              onChange={(e) => updateField("description", e.target.value)}
                              className="text-sm resize-none"
                            />
                          </div>
                        </>
                      )}

                      {/* Arabic Content */}
                      {contentLang === 'ar' && (
                        <>
                          <div className="space-y-2" dir="rtl">
                            <Label htmlFor="titleAr" className="text-sm font-medium flex items-center gap-2 justify-end">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600">AR</Badge>
                              عنوان العقار (بالعربية)
                            </Label>
                            <Input
                              id="titleAr"
                              placeholder="مثال: شقة فاخرة 3 غرف نوم في مارينا جيت"
                              value={formData.titleAr}
                              onChange={(e) => updateField("titleAr", e.target.value)}
                              className="h-9 sm:h-10 text-sm text-right"
                              dir="rtl"
                            />
                          </div>

                          <div className="space-y-2" dir="rtl">
                            <Label htmlFor="descriptionAr" className="text-sm font-medium flex items-center gap-2 justify-end">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600">AR</Badge>
                              الوصف (بالعربية)
                            </Label>
                            <Textarea
                              id="descriptionAr"
                              placeholder="وصف العقار بالعربية..."
                              rows={4}
                              value={formData.descriptionAr}
                              onChange={(e) => updateField("descriptionAr", e.target.value)}
                              className="text-sm resize-none text-right"
                              dir="rtl"
                            />
                          </div>
                        </>
                      )}

                      {/* Language completion indicator */}
                      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            formData.title ? "bg-green-500" : "bg-muted-foreground/30"
                          )} />
                          <span className="text-xs text-muted-foreground">English {formData.title ? "✓" : ""}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            formData.titleAr ? "bg-green-500" : "bg-amber-500/50"
                          )} />
                          <span className="text-xs text-muted-foreground">العربية {formData.titleAr ? "✓" : "(optional)"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="propertyType" className="text-sm font-medium">Property Type *</Label>
                        <Select
                          value={formData.propertyType}
                          onValueChange={(value) => updateField("propertyType", value)}
                        >
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {propertyTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="listingType" className="text-sm font-medium">Listing Type *</Label>
                        <Select
                          value={formData.listingType}
                          onValueChange={(value) => updateField("listingType", value)}
                        >
                          <SelectTrigger className="h-10 sm:h-11 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sale">For Sale</SelectItem>
                            <SelectItem value="rent">For Rent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="refNumber" className={cn("text-sm font-medium", errors.refNumber && touched.refNumber ? "text-destructive" : "")}>
                          Ref Number *
                        </Label>
                        <Input
                          id="refNumber"
                          placeholder="e.g. JB-1002"
                          value={formData.refNumber}
                          onChange={(e) => updateField("refNumber", e.target.value)}
                          onBlur={() => handleBlur("refNumber")}
                          className={cn("h-10 sm:h-11 text-sm", errors.refNumber && touched.refNumber ? "border-destructive focus-visible:ring-destructive" : "")}
                        />
                        {errors.refNumber && touched.refNumber && (
                          <p className="text-xs sm:text-sm text-destructive">{errors.refNumber}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status" className={cn("text-sm font-medium", errors.status && touched.status ? "text-destructive" : "")}>
                          Status *
                        </Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => {
                            updateField("status", value);
                            setTouched((prev) => ({ ...prev, status: true }));
                          }}
                        >
                          <SelectTrigger className={cn("h-10 sm:h-11 text-sm", errors.status && touched.status ? "border-destructive focus:ring-destructive" : "")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {listingStatuses.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.status && touched.status && (
                          <p className="text-xs sm:text-sm text-destructive">{errors.status}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="completionStatus" className="text-sm font-medium">Completion Status</Label>
                        <Select
                          value={formData.completionStatus || "ready"}
                          onValueChange={(value) => updateField("completionStatus", value)}
                        >
                          <SelectTrigger className="h-10 sm:h-11 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ready">Ready (Secondary)</SelectItem>
                            <SelectItem value="off_plan">Off-plan (Primary)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location & Pricing Card */}
                <Card className="shadow-none border">
                  <CardHeader className="pb-3 px-3 sm:px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <span className="font-medium">Location & Pricing</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-3 pt-0">
                    <div className="space-y-2">
                      <LocationSearchInput
                        value={formData.location}
                        onChange={(value) => updateField("location", value)}
                        onBlur={() => handleBlur("location")}
                        placeholder="City, community or building"
                        label="Property Location"
                        required
                        error={errors.location && touched.location ? errors.location : undefined}
                      />

                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Price with Currency Selector */}
                      <div className="space-y-2">
                        <Label htmlFor="price" className={cn("text-sm font-medium", errors.price && touched.price ? "text-destructive" : "")}>
                          Price *
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            value={formData.currency}
                            onValueChange={(value) => updateField("currency", value)}
                          >
                            <SelectTrigger className="h-10 sm:h-11 w-[90px] text-sm flex-shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {currencies.map((curr) => (
                                <SelectItem key={curr.value} value={curr.value}>
                                  {curr.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="relative flex-1">
                            <Input
                              id="price"
                              type="number"
                              placeholder="2,500,000"
                              value={formData.price}
                              onChange={(e) => updateField("price", e.target.value)}
                              onBlur={() => handleBlur("price")}
                              className={cn("h-10 sm:h-11 text-sm", errors.price && touched.price ? "border-destructive" : "")}
                            />
                          </div>
                        </div>
                        {errors.price && touched.price && (
                          <p className="text-xs sm:text-sm text-destructive">{errors.price}</p>
                        )}
                      </div>

                      {/* Size with Unit Selector */}
                      <div className="space-y-2">
                        <Label htmlFor="size" className="text-sm font-medium">Size</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="size"
                              type="number"
                              placeholder="2,100"
                              value={formData.size}
                              onChange={(e) => updateField("size", e.target.value)}
                              className="h-10 sm:h-11 text-sm pl-9"
                            />
                          </div>
                          <Select
                            value={formData.sizeUnit}
                            onValueChange={(value) => updateField("sizeUnit", value)}
                          >
                            <SelectTrigger className="h-10 sm:h-11 w-[80px] text-sm flex-shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {sizeUnits.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Property Details Card */}
                <Card className="shadow-none border">
                  <CardHeader className="pb-3 px-3 sm:px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Bed className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="font-medium">Property Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pt-0">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="bedrooms" className="text-sm font-medium">Beds</Label>
                        <Select
                          value={formData.bedrooms}
                          onValueChange={(value) => updateField("bedrooms", value)}
                        >
                          <SelectTrigger className="h-10 sm:h-11 text-sm">
                            <SelectValue placeholder="0" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Studio", "1", "2", "3", "4", "5", "6", "7+"].map((n) => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bathrooms" className="text-sm font-medium">Baths</Label>
                        <Select
                          value={formData.bathrooms}
                          onValueChange={(value) => updateField("bathrooms", value)}
                        >
                          <SelectTrigger className="h-10 sm:h-11 text-sm">
                            <SelectValue placeholder="0" />
                          </SelectTrigger>
                          <SelectContent>
                            {["1", "2", "3", "4", "5", "6", "7+"].map((n) => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="furnishing" className="text-sm font-medium">Furnishing</Label>
                        <Select
                          value={formData.furnishing}
                          onValueChange={(value) => updateField("furnishing", value)}
                        >
                          <SelectTrigger className="h-10 sm:h-11 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="furnished">Furnished</SelectItem>
                            <SelectItem value="semi-furnished">Semi</SelectItem>
                            <SelectItem value="unfurnished">Unfurnished</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Building Details Card */}
                <Card className="shadow-none border">
                  <CardHeader className="pb-3 px-3 sm:px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <span className="font-medium">Building & Project</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-3 sm:px-4 pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="developer" className="text-sm font-medium">Developer (Optional)</Label>
                        <Input
                          id="developer"
                          placeholder="e.g. Emaar"
                          value={formData.developer}
                          onChange={(e) => updateField("developer", e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="projectName" className="text-sm font-medium">Project Name (Optional)</Label>
                        <Input
                          id="projectName"
                          placeholder="e.g. Dubai Marina"
                          value={formData.projectName}
                          onChange={(e) => updateField("projectName", e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="buildingName" className="text-sm font-medium">Building Name (Optional)</Label>
                        <Input
                          id="buildingName"
                          placeholder="e.g. Marina Gate 1"
                          value={formData.buildingName}
                          onChange={(e) => updateField("buildingName", e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="floorNumber" className="text-sm font-medium">Floor (Optional)</Label>
                          <Input
                            id="floorNumber"
                            type="number"
                            placeholder="15"
                            value={formData.floorNumber}
                            onChange={(e) => updateField("floorNumber", e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parkingSpaces" className="text-sm font-medium">Parking (Optional)</Label>
                          <Input
                            id="parkingSpaces"
                            type="number"
                            placeholder="1"
                            value={formData.parkingSpaces}
                            onChange={(e) => updateField("parkingSpaces", e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>


              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="p-2.5 sm:p-4 m-0 space-y-3">
                <Card className="shadow-none border">
                  <CardHeader className="pb-2 px-3 sm:px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Property Images</CardTitle>
                      <Badge variant="secondary" className="text-xs">{formData.images.length} images</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 px-3 pt-0">
                    {/* Hidden File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/gif,image/bmp,image/tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp,.tiff,.tif"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    {/* Upload Area */}
                    <div
                      onClick={handleImageUpload}
                      className={cn(
                        "border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors",
                        isUploading && "pointer-events-none opacity-50"
                      )}
                    >
                      {isUploading ? (
                        <>
                          <div className="h-8 w-8 mx-auto mb-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs sm:text-sm font-medium">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs sm:text-sm font-medium">Tap to upload</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                            JPG, PNG, WEBP, HEIC up to 50MB
                          </p>
                        </>
                      )}
                    </div>

                    {/* Sortable Image Grid */}
                    {formData.images.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={formData.images}
                          strategy={rectSortingStrategy}
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {formData.images.map((image, index) => (
                              <SortableImageItem
                                key={image}
                                id={image}
                                image={image}
                                index={index}
                                isCover={index === 0}
                                onSetCover={() => setCoverImage(index)}
                                onRemove={() => removeImage(index)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}

                    {formData.images.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No images uploaded yet</p>
                      </div>
                    )}

                    {/* Tips */}
                    {formData.images.length > 0 && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-start gap-3">
                          <ImageIcon className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Image Tips</p>
                            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                              <li>• Drag images to reorder them</li>
                              <li>• Click the star icon to set a new cover image</li>
                              <li>• The first image will be displayed as the main cover</li>
                              <li>• Upload at least 5 images for better engagement</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Video & Virtual Tour Card */}
                <Card className="shadow-none border">
                  <CardHeader className="pb-3 px-3 sm:px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="font-medium">Video & Virtual Tour</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-3 sm:px-4 pt-0">
                    <div className="space-y-2">
                      <Label htmlFor="videoUrl" className="text-sm font-medium">Video URL (Optional)</Label>
                      <Input
                        id="videoUrl"
                        placeholder="https://youtu.be/..."
                        value={formData.videoUrl}
                        onChange={(e) => updateField("videoUrl", e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tourUrl" className="text-sm font-medium">Virtual Tour URL (Optional)</Label>
                      <Input
                        id="tourUrl"
                        placeholder="https://my.matterport.com/..."
                        value={formData.tourUrl}
                        onChange={(e) => updateField("tourUrl", e.target.value)}
                        className="h-10 text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Amenities Tab */}
              <TabsContent value="amenities" className="p-2.5 sm:p-4 m-0 space-y-3">
                <Card className="shadow-none border">
                  <CardHeader className="pb-2 px-3 sm:px-4">
                    <CardTitle className="text-sm font-medium">Amenities</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {amenitiesList.map((amenity) => (
                        <label
                          key={amenity}
                          className={cn(
                            "flex items-center gap-1.5 p-2 rounded-md border cursor-pointer transition-all",
                            formData.amenities.includes(amenity)
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={formData.amenities.includes(amenity)}
                            onCheckedChange={() => toggleAmenity(amenity)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-[11px] sm:text-xs">{amenity}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-none border">
                  <CardHeader className="pb-2 px-3 sm:px-4">
                    <CardTitle className="text-sm font-medium">Features</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {featuresList.map((feature) => (
                        <label
                          key={feature}
                          className={cn(
                            "flex items-center gap-1.5 p-2 rounded-md border cursor-pointer transition-all",
                            formData.features.includes(feature)
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={formData.features.includes(feature)}
                            onCheckedChange={() => toggleFeature(feature)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-[11px] sm:text-xs">{feature}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Portals Tab */}
              <TabsContent value="portals" className="p-2.5 sm:p-4 m-0 space-y-3">
                <Card className="shadow-none border">
                  <CardHeader className="pb-2 px-3 sm:px-4">
                    <CardTitle className="text-sm font-medium">Publish to Portals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 px-3 sm:px-4 pt-0">
                    {formData.portals.map((portal) => (
                      <div
                        key={portal.name}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-md border transition-all",
                          portal.enabled ? "bg-primary/5 border-primary/30" : ""
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-xs sm:text-sm">{portal.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {portal.enabled ? "Will publish" : "Off"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={portal.enabled}
                          onCheckedChange={() => togglePortal(portal.name, "enabled")}
                          className="scale-90"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </ResponsiveDialogBody>
        </Tabs>

      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
