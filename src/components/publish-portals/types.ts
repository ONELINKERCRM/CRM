export interface Portal {
  id: string;
  accountId: string | null; // The portal_accounts.id for API calls
  name: string;
  logo: string;
  connected: boolean;
  requirements: string[];
  lastPublished?: string;
  publishStatus?: 'published' | 'pending' | 'failed' | 'draft';
  country?: string | null;
}

export interface PortalCustomization {
  portalId: string;
  title: string;
  description: string;
  selectedImages: number[];
  price: string;
  propertyType: string;
  amenities: string[];
  agentId: string;
  seoKeywords: string[];
  customFields: Record<string, string>;
  isValid: boolean;
  validationScore: number;
  errors: string[];
  // Extended fields for full editing
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: string;
  purpose?: 'Sale' | 'Rent';
  rentFrequency?: 'Yearly' | 'Monthly' | 'Weekly' | 'Daily';
  completionStatus?: 'Ready' | 'Off-plan';
  developer?: string;
  projectName?: string;
  buildingName?: string;
  completionDate?: string;
  furnishing?: string;
  permitNumber?: string;
  floorNumber?: number;
  parkingSpaces?: number;
  features?: string[];
  tags?: string[];
  // Mapping critical fields
  latitude?: number;
  longitude?: number;
  plotSize?: string;
  view?: string;
  occupancy?: string;
  serviceCharges?: number;
  cheques?: number;
  videoUrl?: string;
  tourUrl?: string;
  ownershipType?: string;
}

export interface ListingSummary {
  id: string;
  title: string;
  refNumber: string;
  location: string;
  rawAddress?: string | null;
  rawCity?: string | null;
  rawCountry?: string | null;
  price: string;
  rawPrice?: number | null;
  rawCurrency?: string;
  bedrooms: number;
  bathrooms: number;
  size: string;
  rawSize?: number | null;
  rawSizeUnit?: string | null;
  type: string;
  purpose: 'Sale' | 'Rent';
  rentFrequency?: 'Yearly' | 'Monthly' | 'Weekly' | 'Daily';
  completionStatus?: 'Ready' | 'Off-plan';
  developer?: string;
  projectName?: string;
  buildingName?: string;
  completionDate?: string;
  status: 'Draft' | 'Ready' | 'Published';
  images: string[];
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  description?: string;
  amenities?: string[];
  features?: string[];
  furnishing?: string;
  permitNumber?: string;
  floorNumber?: number;
  parkingSpaces?: number;
  tags?: string[];
  // Mapping critical fields
  latitude?: number;
  longitude?: number;
  plotSize?: string;
  view?: string;
  occupancy?: string;
  serviceCharges?: number;
  cheques?: number;
  videoUrl?: string;
  tourUrl?: string;
  ownershipType?: string;
}

export interface PublishActivity {
  id: string;
  portalId: string;
  portalName: string;
  action: 'published' | 'unpublished' | 'updated' | 'failed' | 'pending';
  timestamp: string;
  details?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
}

export interface PortalAgent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  source: "local" | "property_finder" | "bayut" | "dubizzle";
  portalAgentId?: string;
  brn?: string;
  languages?: string[];
  specializations?: string[];
}
