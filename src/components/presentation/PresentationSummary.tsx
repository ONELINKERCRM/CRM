import { PresentationListing, PresentationSettings, themeColors } from './types';
import { Bed, Bath, Maximize, Car, Sofa, Home, Hash } from 'lucide-react';

interface PresentationSummaryProps {
  listing: PresentationListing;
  settings: PresentationSettings;
}

export const PresentationSummary = ({ listing, settings }: PresentationSummaryProps) => {
  const colors = themeColors[settings.theme];
  
  const summaryItems = [
    { icon: Bed, label: 'Bedrooms', value: listing.bedrooms },
    { icon: Bath, label: 'Bathrooms', value: listing.bathrooms },
    { icon: Maximize, label: 'Size', value: `${listing.size.toLocaleString()} ${listing.sizeUnit}` },
    ...(listing.parking ? [{ icon: Car, label: 'Parking', value: listing.parking }] : []),
    ...(listing.furnishing ? [{ icon: Sofa, label: 'Furnishing', value: listing.furnishing }] : []),
    { icon: Home, label: 'Type', value: listing.propertyType },
    { icon: Hash, label: 'Reference', value: listing.referenceId },
  ];

  return (
    <div 
      className="py-12 px-6 lg:px-12 print:py-8"
      style={{ backgroundColor: settings.theme === 'dark' ? colors.secondary : 'white' }}
    >
      <div className="max-w-6xl mx-auto">
        <h2 
          className="text-2xl font-bold text-center mb-8"
          style={{ color: colors.text }}
        >
          Property Overview
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {summaryItems.map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center p-4 rounded-xl transition-shadow hover:shadow-md"
              style={{ 
                backgroundColor: settings.theme === 'dark' 
                  ? `${colors.primary}10` 
                  : colors.secondary 
              }}
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ 
                  backgroundColor: settings.theme === 'luxury' ? colors.primary : `${colors.primary}15`,
                  color: settings.theme === 'luxury' ? colors.secondary : colors.primary 
                }}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.muted }}>
                {item.label}
              </span>
              <span className="font-semibold text-center" style={{ color: colors.text }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
