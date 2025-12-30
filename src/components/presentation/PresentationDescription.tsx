import { PresentationListing, PresentationSettings, themeColors } from './types';
import { CheckCircle2 } from 'lucide-react';

interface PresentationDescriptionProps {
  listing: PresentationListing;
  settings: PresentationSettings;
}

export const PresentationDescription = ({ listing, settings }: PresentationDescriptionProps) => {
  const colors = themeColors[settings.theme];
  
  // Auto-generate highlights from listing data
  const generateHighlights = () => {
    const highlights: string[] = [];
    
    if (listing.bedrooms) highlights.push(`${listing.bedrooms} spacious bedroom${listing.bedrooms > 1 ? 's' : ''}`);
    if (listing.bathrooms) highlights.push(`${listing.bathrooms} modern bathroom${listing.bathrooms > 1 ? 's' : ''}`);
    if (listing.size) highlights.push(`${listing.size.toLocaleString()} ${listing.sizeUnit} of living space`);
    if (listing.parking) highlights.push(`${listing.parking} dedicated parking space${listing.parking > 1 ? 's' : ''}`);
    if (listing.furnishing) highlights.push(`${listing.furnishing} property`);
    if (listing.amenities?.includes('Swimming Pool')) highlights.push('Access to swimming pool');
    if (listing.amenities?.includes('Gym')) highlights.push('Fully equipped gym');
    if (listing.amenities?.includes('Sea View')) highlights.push('Stunning sea views');
    if (listing.amenities?.includes('Balcony')) highlights.push('Private balcony');
    if (listing.area) highlights.push(`Prime location in ${listing.area}`);
    
    return highlights.slice(0, 6);
  };

  const highlights = listing.features?.length ? listing.features : generateHighlights();

  return (
    <div 
      className="py-12 px-6 lg:px-12 print:py-8"
      style={{ backgroundColor: settings.theme === 'dark' ? colors.secondary : 'white' }}
    >
      <div className="max-w-4xl mx-auto">
        <h2 
          className="text-2xl font-bold mb-6"
          style={{ color: colors.text }}
        >
          Property Description
        </h2>
        
        {/* Main Description */}
        <div 
          className="prose prose-lg max-w-none mb-8"
          style={{ color: colors.text }}
        >
          <p className="text-lg leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>
        </div>
        
        {/* Highlights */}
        {highlights.length > 0 && (
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              backgroundColor: settings.theme === 'dark' 
                ? `${colors.primary}10` 
                : colors.secondary 
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: colors.text }}
            >
              Property Highlights
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 
                    className="w-5 h-5 mt-0.5 flex-shrink-0" 
                    style={{ color: settings.theme === 'luxury' ? colors.primary : colors.accent }}
                  />
                  <span style={{ color: colors.text }}>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
