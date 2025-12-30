import { PresentationListing, PresentationSettings, themeColors } from './types';
import { MapPin, Building2, GraduationCap, ShoppingBag, Train } from 'lucide-react';

interface PresentationMapProps {
  listing: PresentationListing;
  settings: PresentationSettings;
}

export const PresentationMap = ({ listing, settings }: PresentationMapProps) => {
  const colors = themeColors[settings.theme];
  
  // Auto-generate area overview based on location
  const generateAreaOverview = () => {
    const area = listing.area || listing.location.split(',')[0];
    return {
      title: `About ${area}`,
      description: `${area} is a prestigious neighborhood known for its excellent infrastructure, modern amenities, and convenient access to key destinations. The area offers a perfect blend of urban convenience and comfortable living.`,
      nearby: [
        { icon: GraduationCap, label: 'Schools & Education', items: ['International schools', 'Universities nearby'] },
        { icon: ShoppingBag, label: 'Shopping & Dining', items: ['Shopping malls', 'Restaurants & cafes'] },
        { icon: Train, label: 'Transportation', items: ['Metro station access', 'Major highways'] },
        { icon: Building2, label: 'Business Districts', items: ['Office buildings', 'Commercial centers'] },
      ]
    };
  };

  const areaOverview = generateAreaOverview();
  
  // Generate static map URL (using OpenStreetMap placeholder for demo)
  const mapUrl = listing.coordinates 
    ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+${colors.primary.replace('#', '')}(${listing.coordinates.lng},${listing.coordinates.lat})/${listing.coordinates.lng},${listing.coordinates.lat},14,0/600x400@2x?access_token=YOUR_TOKEN`
    : null;

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
          Location
        </h2>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Map Placeholder */}
          <div 
            className="rounded-2xl overflow-hidden aspect-[4/3] relative"
            style={{ 
              backgroundColor: settings.theme === 'dark' 
                ? `${colors.primary}10` 
                : colors.secondary 
            }}
          >
            {mapUrl ? (
              <img src={mapUrl} alt="Location map" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <MapPin className="w-8 h-8" style={{ color: colors.primary }} />
                </div>
                <p className="font-semibold text-lg mb-1" style={{ color: colors.text }}>
                  {listing.location}
                </p>
                {listing.city && (
                  <p style={{ color: colors.muted }}>
                    {listing.city}{listing.country ? `, ${listing.country}` : ''}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Area Overview */}
          <div className="space-y-6">
            <div>
              <h3 
                className="text-xl font-semibold mb-2"
                style={{ color: colors.text }}
              >
                {areaOverview.title}
              </h3>
              <p style={{ color: colors.muted }}>
                {areaOverview.description}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {areaOverview.nearby.map((category, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-xl"
                  style={{ 
                    backgroundColor: settings.theme === 'dark' 
                      ? `${colors.primary}10` 
                      : colors.secondary 
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <category.icon className="w-4 h-4" style={{ color: colors.primary }} />
                    <span className="font-medium text-sm" style={{ color: colors.text }}>
                      {category.label}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {category.items.map((item, i) => (
                      <li key={i} className="text-xs" style={{ color: colors.muted }}>
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
