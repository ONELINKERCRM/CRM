import { PresentationListing, PresentationSettings, themeColors } from './types';
import { 
  Waves, Dumbbell, Home, Eye, Users, Wind, Car, Camera,
  Wifi, Shield, Building2, Trees, Utensils, Baby, Dog, Sparkles,
  Bath, Tv, WashingMachine, Refrigerator, Microwave, Coffee
} from 'lucide-react';

interface PresentationAmenitiesProps {
  listing: PresentationListing;
  settings: PresentationSettings;
}

const amenityIcons: Record<string, React.ElementType> = {
  'Swimming Pool': Waves,
  'Gym': Dumbbell,
  'Balcony': Home,
  'Sea View': Eye,
  'Maids Room': Users,
  'Central AC': Wind,
  'Parking': Car,
  'CCTV': Camera,
  'WiFi': Wifi,
  'Security': Shield,
  'Concierge': Building2,
  'Garden': Trees,
  'Kitchen Appliances': Utensils,
  'Kids Play Area': Baby,
  'Pets Allowed': Dog,
  'Spa': Sparkles,
  'Jacuzzi': Bath,
  'Smart Home': Tv,
  'Laundry': WashingMachine,
  'Built-in Wardrobes': Refrigerator,
  'Built-in Kitchen': Microwave,
  'Lobby': Coffee,
};

export const PresentationAmenities = ({ listing, settings }: PresentationAmenitiesProps) => {
  const colors = themeColors[settings.theme];
  
  if (!listing.amenities || listing.amenities.length === 0) return null;

  return (
    <div 
      className="py-12 px-6 lg:px-12 print:py-8"
      style={{ backgroundColor: settings.theme === 'dark' ? colors.secondary : 'white' }}
    >
      <div className="max-w-5xl mx-auto">
        <h2 
          className="text-2xl font-bold text-center mb-8"
          style={{ color: colors.text }}
        >
          Amenities & Features
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listing.amenities.map((amenity, index) => {
            const IconComponent = amenityIcons[amenity] || Home;
            
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: settings.theme === 'dark' 
                    ? `${colors.primary}10` 
                    : colors.secondary,
                  borderLeft: settings.theme === 'luxury' 
                    ? `3px solid ${colors.primary}` 
                    : 'none'
                }}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ 
                    backgroundColor: settings.theme === 'luxury' 
                      ? colors.primary 
                      : `${colors.primary}15`,
                    color: settings.theme === 'luxury' 
                      ? colors.secondary 
                      : colors.primary 
                  }}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <span 
                  className="font-medium text-sm"
                  style={{ color: colors.text }}
                >
                  {amenity}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
