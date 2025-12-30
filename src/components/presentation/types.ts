export interface PresentationListing {
  id: string;
  title: string;
  description: string;
  price: number;
  priceType: 'sale' | 'rent';
  location: string;
  area?: string;
  city?: string;
  country?: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  sizeUnit: string;
  parking?: number;
  furnishing?: string;
  propertyType: string;
  referenceId: string;
  images: string[];
  floorPlans?: string[];
  amenities: string[];
  features?: string[];
  coordinates?: { lat: number; lng: number };
  permitNumber?: string;
}

export interface PresentationAgent {
  id: string;
  name: string;
  designation?: string;
  phone: string;
  email: string;
  whatsapp?: string;
  photo?: string;
}

export interface PresentationCompany {
  name: string;
  logo?: string;
  tagline?: string;
  about?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface PresentationSettings {
  theme: 'classic' | 'luxury' | 'minimal' | 'dark';
  coverStyle: 'full' | 'half';
  sections: {
    cover: boolean;
    summary: boolean;
    description: boolean;
    gallery: boolean;
    amenities: boolean;
    floorPlan: boolean;
    map: boolean;
    agent: boolean;
    company: boolean;
  };
}

export const defaultSettings: PresentationSettings = {
  theme: 'classic',
  coverStyle: 'full',
  sections: {
    cover: true,
    summary: true,
    description: true,
    gallery: true,
    amenities: true,
    floorPlan: true,
    map: true,
    agent: true,
    company: true,
  },
};

export const themeColors = {
  classic: {
    primary: 'hsl(222, 47%, 31%)',
    secondary: 'hsl(222, 47%, 95%)',
    accent: 'hsl(199, 89%, 48%)',
    text: 'hsl(222, 47%, 11%)',
    muted: 'hsl(215, 16%, 47%)',
  },
  luxury: {
    primary: 'hsl(43, 74%, 49%)',
    secondary: 'hsl(43, 30%, 96%)',
    accent: 'hsl(43, 74%, 39%)',
    text: 'hsl(0, 0%, 13%)',
    muted: 'hsl(0, 0%, 40%)',
  },
  minimal: {
    primary: 'hsl(0, 0%, 9%)',
    secondary: 'hsl(0, 0%, 98%)',
    accent: 'hsl(0, 0%, 45%)',
    text: 'hsl(0, 0%, 9%)',
    muted: 'hsl(0, 0%, 55%)',
  },
  dark: {
    primary: 'hsl(0, 0%, 98%)',
    secondary: 'hsl(224, 71%, 4%)',
    accent: 'hsl(199, 89%, 48%)',
    text: 'hsl(0, 0%, 98%)',
    muted: 'hsl(215, 16%, 65%)',
  },
};
