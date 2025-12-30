import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { ListingSummaryCard } from "@/components/publish-portals/ListingSummary";
import { PortalSelection } from "@/components/publish-portals/PortalSelection";
import { PortalCustomizationPanel } from "@/components/publish-portals/PortalCustomizationPanel";
import { PublishActions } from "@/components/publish-portals/PublishActions";
import { ActivityLog } from "@/components/publish-portals/ActivityLog";
import { ValidationStatus } from "@/components/publish-portals/ValidationStatus";
import { PortalPreviewModal } from "@/components/publish-portals/PortalPreviewModal";
import { useListing } from "@/hooks/useListing";
import { supabase } from "@/integrations/supabase/client";
import {
  Portal,
  PortalCustomization,
  ListingSummary,
  PublishActivity,
  Agent,
  PortalAgent,
} from "@/components/publish-portals/types";
import { usePortalAccounts } from "@/hooks/usePortalAccounts";

// Default requirements for portals without specific rules
const defaultPortalRequirements: Record<string, string[]> = {
  'property finder': ["Minimum 5 photos", "Complete description", "Valid permit number"],
  'bayut': ["Minimum 3 photos", "Property type required", "Location coordinates"],
  'dubizzle': ["Cover image required", "Price in AED", "Contact details"],
  'default': ["Property details", "At least one photo", "Valid contact"],
};

function getPortalRequirements(portalName: string, country?: string | null): string[] {
  const key = portalName.toLowerCase();
  const reqs = [...defaultPortalRequirements.default];

  if (key.includes('property finder')) reqs.push("Minimum 5 photos");
  if (key.includes('bayut')) reqs.push("Location coordinates");

  if (country === 'UAE') {
    reqs.push("Valid permit number (Trakheesi)");
  }

  if (country === 'Qatar') {
    reqs.push("Location coordinates (recommended)");
  }

  // Custom logic for specific portals
  for (const [name, portalReqs] of Object.entries(defaultPortalRequirements)) {
    if (key.includes(name) && name !== 'default') {
      return [...new Set([...reqs, ...portalReqs])];
    }
  }

  return [...new Set(reqs)];
}

function formatLastSync(lastSync: string | null): string | undefined {
  if (!lastSync) return undefined;
  const date = new Date(lastSync);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const defaultAmenitiesList = [
  "Swimming Pool",
  "Gym",
  "24/7 Security",
  "Covered Parking",
  "Children's Play Area",
  "BBQ Area",
  "Concierge Service",
  "Beach Access",
  "Balcony",
  "Built-in Wardrobes",
  "Central A/C",
  "Pets Allowed",
  "Maid's Room",
  "Study",
  "Walk-in Closet",
  "Kitchen Appliances",
  "Private Garden",
  "Private Pool",
  "View of Water",
  "View of Landmark",
  "Shared Spa",
  "Steam Room",
  "Sauna",
  "Private Beach",
  "Smart Home",
  "Driver's Room",
  "Garden",
  "Private Terrace",
  "Rooftop Jacuzzi",
  "Valet Parking",
];

function getCurrencyForCountry(country?: string | null): string {
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
}

function createDefaultCustomization(
  portalId: string,
  listing: ListingSummary,
  country?: string | null
): PortalCustomization {
  // Auto-populate from listing data
  const hasDescription = !!listing.description && listing.description.length > 0;
  const listingAmenities = listing.amenities || [];
  const hasEnoughAmenities = listingAmenities.length >= 3;
  const hasEnoughImages = listing.images.length >= 3;

  const errors: string[] = [];
  if (!hasDescription) errors.push("Description is required");
  if (!hasEnoughAmenities) errors.push("Add at least 3 amenities");
  if (!hasEnoughImages) errors.push("Add at least 3 images");

  const portalCurrency = getCurrencyForCountry(country);
  const formattedPrice = listing.rawPrice
    ? formatPrice(listing.rawPrice, portalCurrency)
    : listing.price;

  let formattedLocation = listing.location;
  if (country && listing.rawCountry === country) {
    formattedLocation = [listing.rawAddress, listing.rawCity].filter(Boolean).join(", ");
    if (!formattedLocation) formattedLocation = listing.location;
  }

  // Country-specific initial validation
  if (country === 'UAE' && !listing.permitNumber) {
    errors.push("Permit Number is required for UAE portals");
  }

  const validationScore = Math.min(100, 100 - errors.length * 15);

  return {
    portalId,
    title: listing.title,
    description: listing.description || "",
    selectedImages: listing.images.map((_, i) => i),
    price: formattedPrice,
    propertyType: listing.type,
    amenities: listingAmenities,
    agentId: listing.agentId,
    seoKeywords: generateKeywords(listing),
    customFields: {},
    isValid: errors.length === 0,
    validationScore,
    errors,
    // Extended fields
    location: formattedLocation,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    size: listing.size,
    purpose: listing.purpose,
    furnishing: listing.furnishing,
    permitNumber: listing.permitNumber,
    features: listing.features || [],
    rentFrequency: listing.rentFrequency,
    completionStatus: listing.completionStatus,
    developer: listing.developer,
    projectName: listing.projectName,
    buildingName: listing.buildingName,
    completionDate: listing.completionDate,
    floorNumber: listing.floorNumber,
    parkingSpaces: listing.parkingSpaces,
    tags: listing.tags || [],
    latitude: listing.latitude,
    longitude: listing.longitude,
    plotSize: listing.plotSize,
    view: listing.view,
    occupancy: listing.occupancy,
    serviceCharges: listing.serviceCharges,
    cheques: listing.cheques,
    videoUrl: listing.videoUrl,
    tourUrl: listing.tourUrl,
    ownershipType: listing.ownershipType,
  };
}

function generateKeywords(listing: ListingSummary): string[] {
  const keywords: string[] = [];
  if (listing.type) keywords.push(listing.type.toLowerCase());
  if (listing.bedrooms) keywords.push(`${listing.bedrooms} bedroom`);
  if (listing.location) {
    const locationParts = listing.location.split(",");
    if (locationParts[0]) keywords.push(locationParts[0].trim().toLowerCase());
  }
  if (listing.purpose) keywords.push(`for ${listing.purpose.toLowerCase()}`);
  return keywords;
}

function formatPrice(price: number | null, currency: string): string {
  if (!price) return "Price on Request";
  return `${currency} ${price.toLocaleString()}`;
}

function formatSize(size: number | null, unit: string | null): string {
  if (!size) return "";
  return `${size.toLocaleString()} ${unit || "sqft"}`;
}

// Helper to get portal source key from portal name
function getPortalSourceKey(portalName: string): PortalAgent["source"] | null {
  const name = portalName.toLowerCase();
  if (name.includes("property finder")) return "property_finder";
  if (name.includes("bayut")) return "bayut";
  if (name.includes("dubizzle")) return "dubizzle";
  return null;
}

// Filter portal agents by specific portal
function filterAgentsByPortal(agents: PortalAgent[], portalName: string): PortalAgent[] {
  const sourceKey = getPortalSourceKey(portalName);
  if (!sourceKey) return agents;
  return agents.filter(a => a.source === sourceKey);
}

export default function PublishToPortalsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch listing from database
  const { listing: fetchedListing, isLoading, error } = useListing(id);

  // Fetch real portals from database
  const { portals: realPortals, isLoading: isLoadingPortals } = usePortalAccounts();

  // Map real portals to Portal type for components
  const portals: Portal[] = realPortals.map((p) => ({
    id: p.id,
    accountId: p.account_id,
    name: p.display_name || p.name,
    logo: p.logo_url || "",
    connected: p.connected,
    requirements: getPortalRequirements(p.name, p.country),
    lastPublished: formatLastSync(p.last_sync_at),
    publishStatus: p.listings_count > 0 ? 'published' as const : undefined,
    country: p.country,
  }));

  // Fetch agents for the company
  const [agents, setAgents] = useState<Agent[]>([]);
  const [portalAgents, setPortalAgents] = useState<PortalAgent[]>([]);
  const [isLoadingPortalAgents, setIsLoadingPortalAgents] = useState(false);
  const [activities, setActivities] = useState<PublishActivity[]>([]);
  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  const [customizations, setCustomizations] = useState<Record<string, PortalCustomization>>({});
  const [activeTab, setActiveTab] = useState("portals");
  const [previewPortal, setPreviewPortal] = useState<Portal | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    const fetchAgentsAndCompany = async () => {
      // Get user and company
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      }

      const { data } = await supabase
        .from("agents")
        .select("id, name, email, phone");
      if (data) {
        setAgents(data.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          phone: a.phone || undefined,
        })));
      }
    };
    fetchAgentsAndCompany();
  }, []);

  // Fetch portal agents when portals are selected
  useEffect(() => {
    const fetchPortalAgents = async () => {
      if (selectedPortals.length === 0) {
        setPortalAgents([]);
        return;
      }

      setIsLoadingPortalAgents(true);
      try {
        // Get profile to find company_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (!profile?.company_id) return;

        // Fetch connected portal accounts
        const { data: portalAccounts } = await supabase
          .from("portal_accounts")
          .select("id, portal_id, credentials, portals(id, name)")
          .eq("company_id", profile.company_id)
          .eq("status", "connected");

        if (!portalAccounts || portalAccounts.length === 0) {
          console.log("No connected portal accounts found");
          return;
        }

        // Call edge function for each connected portal
        const allPortalAgents: PortalAgent[] = [];

        for (const account of portalAccounts) {
          const portal = account.portals as { id: string; name: string } | null;
          if (!portal) continue;

          console.log("Fetching agents for portal:", portal.name);

          const { data, error } = await supabase.functions.invoke("portal-agents-fetch", {
            body: {
              portal_id: portal.id,
              portal_name: portal.name.toLowerCase(),
              credentials: account.credentials,
              company_id: profile.company_id,
            },
          });

          if (error) {
            console.error("Error fetching portal agents:", error);
            continue;
          }

          if (data?.agents) {
            console.log("Received agents from portal:", data.agents.length);
            allPortalAgents.push(...data.agents);
          }
        }

        setPortalAgents(allPortalAgents);
      } catch (err) {
        console.error("Error fetching portal agents:", err);
      } finally {
        setIsLoadingPortalAgents(false);
      }
    };

    fetchPortalAgents();
  }, [selectedPortals]);

  // Fetch publish activities for this listing
  useEffect(() => {
    const fetchActivities = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("listing_portals")
        .select("id, portal_name, publish_status, last_sync_at")
        .eq("listing_id", id)
        .order("last_sync_at", { ascending: false });

      if (data) {
        setActivities(data.map(p => ({
          id: p.id,
          portalId: p.portal_name.toLowerCase().replace(/\s+/g, '-'),
          portalName: p.portal_name,
          action: p.publish_status === 'published' ? 'published' : p.publish_status === 'failed' ? 'failed' : 'pending' as const,
          timestamp: p.last_sync_at ? new Date(p.last_sync_at).toLocaleString() : 'Not synced',
        })));
      }
    };
    fetchActivities();
  }, [id]);

  // Transform fetched listing to ListingSummary format
  const transformedListing: ListingSummary | null = fetchedListing ? {
    id: fetchedListing.id,
    title: fetchedListing.title,
    refNumber: fetchedListing.reference_number || "",
    location: [fetchedListing.address, fetchedListing.city, fetchedListing.country].filter(Boolean).join(", "),
    rawAddress: fetchedListing.address,
    rawCity: fetchedListing.city,
    rawCountry: fetchedListing.country,
    price: formatPrice(fetchedListing.price, fetchedListing.currency),
    rawPrice: fetchedListing.price,
    rawCurrency: fetchedListing.currency,
    bedrooms: fetchedListing.number_of_bedrooms || 0,
    bathrooms: fetchedListing.number_of_bathrooms || 0,
    size: formatSize(fetchedListing.area_size, fetchedListing.area_unit),
    rawSize: fetchedListing.area_size,
    rawSizeUnit: fetchedListing.area_unit,
    type: fetchedListing.property_type || "",
    purpose: (fetchedListing.listing_type === 'Rent' ? 'Rent' : 'Sale') as 'Sale' | 'Rent',
    status: (fetchedListing.status === 'Published' ? 'Published' : fetchedListing.status === 'Ready' ? 'Ready' : 'Draft') as 'Draft' | 'Ready' | 'Published',
    description: fetchedListing.description || "",
    amenities: fetchedListing.amenities || [],
    features: [],
    furnishing: fetchedListing.furnished || "",
    permitNumber: fetchedListing.permit_number || "",
    images: fetchedListing.images || [],
    agentId: fetchedListing.assigned_agent_id || "",
    agentName: fetchedListing.agent?.name || "Unassigned",
    agentAvatar: fetchedListing.agent?.avatar_url || undefined,
    rentFrequency: fetchedListing.rent_frequency as any,
    completionStatus: fetchedListing.completion_status as any,
    developer: fetchedListing.developer || "",
    projectName: fetchedListing.project_name || "",
    buildingName: fetchedListing.building_name || "",
    completionDate: fetchedListing.handover_date || "",
    floorNumber: fetchedListing.floor_number || undefined,
    parkingSpaces: fetchedListing.parking_spaces || undefined,
    tags: Array.isArray(fetchedListing.tags) ? fetchedListing.tags as string[] : [],
    latitude: fetchedListing.latitude || undefined,
    longitude: fetchedListing.longitude || undefined,
    plotSize: fetchedListing.plot_size?.toString() || undefined,
    view: fetchedListing.view_type || "",
    serviceCharges: fetchedListing.service_charge || undefined,
    videoUrl: Array.isArray(fetchedListing.videos) && fetchedListing.videos.length > 0 ? (typeof fetchedListing.videos[0] === 'string' ? fetchedListing.videos[0] : fetchedListing.videos[0].url) : "",
    tourUrl: fetchedListing.virtual_tour_url || "",
    ownershipType: fetchedListing.ownership_type || "",
  } : null;


  // Update listing when fetched data changes
  useEffect(() => {
    if (transformedListing) {
      setListing(transformedListing);
      setCustomizations({});
    }
  }, [fetchedListing]);

  // Initialize customizations for selected portals
  useEffect(() => {
    if (!listing) return;

    const newCustomizations: Record<string, PortalCustomization> = {};
    selectedPortals.forEach((portalId) => {
      const portal = portals.find(p => p.id === portalId);
      if (!customizations[portalId]) {
        newCustomizations[portalId] = createDefaultCustomization(portalId, listing, portal?.country);
      }
    });

    if (Object.keys(newCustomizations).length > 0) {
      setCustomizations((prev) => ({ ...prev, ...newCustomizations }));
    }
  }, [selectedPortals, listing]);

  // Auto-match portal agents when they are loaded
  useEffect(() => {
    if (portalAgents.length === 0 || !listing) return;

    setCustomizations(prev => {
      const next = { ...prev };
      let changed = false;

      Object.keys(next).forEach((portalId) => {
        const customization = next[portalId];
        const portal = portals.find(p => p.id === portalId);
        if (!portal) return;

        // If the current agentId is the internal listing agent ID, try to find a portal-specific match
        if (customization.agentId === listing.agentId) {
          const sourceKey = getPortalSourceKey(portal.name);
          const matchedAgent = portalAgents.find(pa =>
            (pa.source === sourceKey) &&
            (pa.name.toLowerCase().includes(listing.agentName.toLowerCase()) ||
              (pa.email && fetchedListing?.agent?.email && pa.email.toLowerCase() === fetchedListing.agent.email.toLowerCase()))
          );

          if (matchedAgent) {
            next[portalId] = { ...customization, agentId: matchedAgent.id };
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [portalAgents, listing, fetchedListing]);

  const handleTogglePortal = (portalId: string) => {
    setSelectedPortals((prev) =>
      prev.includes(portalId)
        ? prev.filter((id) => id !== portalId)
        : [...prev, portalId]
    );
  };

  const handleSelectAllPortals = () => {
    const connectedIds = portals.filter((p) => p.connected).map((p) => p.id);
    setSelectedPortals(connectedIds);
  };

  const handleDeselectAllPortals = () => {
    setSelectedPortals([]);
  };

  const handleUpdateCustomization = (portalId: string, updates: Partial<PortalCustomization>) => {
    setCustomizations((prev) => {
      const portal = portals.find(p => p.id === portalId);
      const current = prev[portalId] || createDefaultCustomization(portalId, listing, portal?.country);
      const updated = { ...current, ...updates };

      // Recalculate validation
      const errors: string[] = [];
      if (!updated.description) errors.push("Description is required");
      if (updated.selectedImages.length < 3) errors.push("Select at least 3 images");
      if (updated.amenities.length < 3) errors.push("Add at least 3 amenities");
      if (!updated.agentId) errors.push("Agent assignment required");
      if (!updated.completionStatus) errors.push("Completion Status is required");
      if (!updated.purpose) errors.push("Purpose is required");

      // Country-specific validation
      if (portal?.country === 'UAE') {
        if (!updated.permitNumber) {
          errors.push("Permit Number is required for UAE portals");
        }
        if (updated.completionStatus === 'Off-plan' && !updated.developer) {
          errors.push("Developer is required for Off-plan properties in UAE");
        }
        if (!updated.projectName) {
          errors.push("Project Name is recommended for UAE portals");
        }
      }

      updated.errors = errors;
      updated.isValid = errors.length === 0;
      updated.validationScore = Math.min(100, 100 - errors.length * 15);

      return { ...prev, [portalId]: updated };
    });
  };

  const handleImagesChange = (newImages: string[]) => {
    setListing((prev) => prev ? ({
      ...prev,
      images: newImages,
    }) : prev);
  };

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      setListing((prev) => prev ? ({
        ...prev,
        agentId: agent.id,
        agentName: agent.name,
        agentAvatar: agent.avatar,
      }) : prev);
    }
  };

  const handleListingChange = (updates: Partial<ListingSummary>) => {
    setListing((prev) => prev ? ({
      ...prev,
      ...updates,
    }) : prev);
  };

  const handlePublish = async () => {
    toast.success("Publishing complete!", {
      description: `Listing published to ${selectedPortals.length} portal(s)`,
    });
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved", {
      description: "Your portal settings have been saved",
    });
  };

  const handlePreview = (portalId: string) => {
    const portal = portals.find((p) => p.id === portalId);
    if (portal) {
      setPreviewPortal(portal);
      setShowPreviewModal(true);
    }
  };

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Listing not found</p>
        <Button variant="outline" onClick={() => navigate("/listings")} className="mt-4">
          Back to Listings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4 lg:space-y-6 pb-20 md:pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/listings/${id}`)} className="gap-1.5 h-8 px-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to Listing</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="flex items-center gap-1.5">
          <Globe className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <h1 className="text-sm md:text-base lg:text-xl font-semibold">Publish to Portals</h1>
        </div>
      </div>

      {/* Listing Summary */}
      <ListingSummaryCard
        listing={listing}
        agents={agents}
        portalAgents={portalAgents}
        isLoadingPortalAgents={isLoadingPortalAgents}
        selectedPortalName={selectedPortals[0] ? portals.find(p => p.id === selectedPortals[0])?.name : undefined}
        onAgentChange={(agentId, isPortalAgent, portalAgentData) => {
          if (isPortalAgent && portalAgentData) {
            setListing(prev => prev ? ({
              ...prev,
              agentId: portalAgentData.id,
              agentName: portalAgentData.name,
              agentAvatar: portalAgentData.avatar,
            }) : prev);
          } else {
            handleAgentChange(agentId);
          }
        }}
        onListingChange={(updates) => setListing(prev => prev ? ({ ...prev, ...updates }) : prev)}
      />

      <Separator />

      {/* Main Content */}
      {isMobile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="portals" className="text-xs">Portals</TabsTrigger>
            <TabsTrigger value="customize" className="text-xs">Customize</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="portals" className="mt-3">
            <PortalSelection
              portals={portals}
              selectedPortals={selectedPortals}
              onTogglePortal={handleTogglePortal}
              onSelectAll={handleSelectAllPortals}
              onDeselectAll={handleDeselectAllPortals}
            />
          </TabsContent>

          <TabsContent value="customize" className="mt-3 space-y-3">
            {selectedPortals.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Globe className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select portals to customize</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Connection Status Info */}
                {selectedPortals.some(id => ['bayut', 'dubizzle', 'property finder'].includes(id.toLowerCase())) && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-primary">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Publishing Method
                    </h4>

                    <div className="space-y-4">
                      {selectedPortals.map(portalId => {
                        const portal = portals.find(p => p.id === portalId);
                        if (!portal) return null;

                        const isFeedPortal = ['bayut', 'dubizzle'].includes(portal.name.toLowerCase());
                        const isApiPortal = portal.name.toLowerCase().includes('property finder');
                        const isConnected = portal.connected;

                        return (
                          <div key={portalId} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{portal.name}</span>
                              {isConnected ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                  <Zap className="h-3 w-3" /> Instant API Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  {isFeedPortal ? 'XML Feed Only' : 'API Setup Required'}
                                </Badge>
                              )}
                            </div>

                            {isFeedPortal && !isConnected && (
                              <div className="space-y-1">
                                <p className="text-[10px] md:text-xs text-muted-foreground">
                                  Share this URL with your account manager for background sync:
                                </p>
                                <div className="flex items-center gap-2">
                                  <code className="text-[10px] md:text-xs bg-muted p-1.5 rounded border flex-1 break-all select-all">
                                    {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feed-generator?company_id=${companyId}&portal=${portal.id}`}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/feed-generator?company_id=${companyId}&portal=${portal.id}`);
                                      toast.success("Feed URL copied");
                                    }}
                                  >
                                    Copy
                                  </Button>
                                </div>
                              </div>
                            )}

                            {!isConnected && (isApiPortal || isFeedPortal) && (
                              <p className="text-[10px] text-muted-foreground">
                                Tip: Go to <a href="/settings/portals" className="text-primary hover:underline">Portal Settings</a> to enter API keys for instant publishing.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedPortals.map((portalId) => {
                  const portal = portals.find((p) => p.id === portalId);
                  const customization = customizations[portalId];
                  if (!portal || !customization) return null;

                  return (
                    <PortalCustomizationPanel
                      key={portalId}
                      portal={portal}
                      customization={customization}
                      images={listing.images}
                      agents={agents}
                      portalAgents={filterAgentsByPortal(portalAgents, portal.name)}
                      isLoadingPortalAgents={isLoadingPortalAgents}
                      amenitiesList={defaultAmenitiesList}
                      listing={listing}
                      onUpdate={(updates) => handleUpdateCustomization(portalId, updates)}
                      onImagesChange={handleImagesChange}
                    />
                  );
                })
                }
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-3 space-y-3">
            <ValidationStatus
              customizations={customizations}
              selectedPortals={selectedPortals}
            />
            <ActivityLog activities={activities} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Portal Selection & Customization */}
          <div className="lg:col-span-3 space-y-6">
            <PortalSelection
              portals={portals}
              selectedPortals={selectedPortals}
              onTogglePortal={handleTogglePortal}
              onSelectAll={handleSelectAllPortals}
              onDeselectAll={handleDeselectAllPortals}
            />

            {selectedPortals.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Portal Customization</h3>
                  {selectedPortals.map((portalId) => {
                    const portal = portals.find((p) => p.id === portalId);
                    const customization = customizations[portalId];
                    if (!portal || !customization) return null;

                    return (
                      <PortalCustomizationPanel
                        key={portalId}
                        portal={portal}
                        customization={customization}
                        images={listing.images}
                        agents={agents}
                        portalAgents={filterAgentsByPortal(portalAgents, portal.name)}
                        isLoadingPortalAgents={isLoadingPortalAgents}
                        amenitiesList={defaultAmenitiesList}
                        listing={listing}
                        onUpdate={(updates) => handleUpdateCustomization(portalId, updates)}
                        onImagesChange={handleImagesChange}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right Column - Validation & Activity */}
          <div className="space-y-4">
            <ValidationStatus
              customizations={customizations}
              selectedPortals={selectedPortals}
            />
            <ActivityLog activities={activities} />
          </div>
        </div>
      )}

      {/* Publish Actions - Sticky Bottom */}
      <PublishActions
        selectedPortals={selectedPortals}
        portals={portals}
        customizations={customizations}
        listingId={id || ""}
        companyId={companyId || ""}
        onPublish={handlePublish}
        onSaveDraft={handleSaveDraft}
        onPreview={handlePreview}
      />

      {/* Portal Preview Modal */}
      {previewPortal && listing && (
        <PortalPreviewModal
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          portal={previewPortal}
          customization={customizations[previewPortal.id] || {
            portalId: previewPortal.id,
            title: listing.title,
            description: listing.description || "",
            selectedImages: listing.images.map((_, i) => i),
            price: listing.price,
            propertyType: listing.type,
            amenities: listing.amenities || [],
            agentId: listing.agentId || "",
            seoKeywords: [],
            customFields: {},
            isValid: true,
            validationScore: 100,
            errors: [],
          }}
          listing={listing}
          agent={agents.find(a => a.id === listing.agentId)}
        />
      )}
    </div>
  );
}
