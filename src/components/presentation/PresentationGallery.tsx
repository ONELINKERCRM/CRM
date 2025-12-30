import { PresentationListing, PresentationSettings, themeColors } from './types';

interface PresentationGalleryProps {
  listing: PresentationListing;
  settings: PresentationSettings;
}

export const PresentationGallery = ({ listing, settings }: PresentationGalleryProps) => {
  const colors = themeColors[settings.theme];
  const images = listing.images.slice(0, 30);
  
  if (images.length === 0) return null;

  // Create optimal grid layout based on number of images
  const getGridLayout = () => {
    if (images.length <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (images.length <= 4) return 'grid-cols-2';
    if (images.length <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  };

  return (
    <div 
      className="py-12 px-6 lg:px-12 print:py-8"
      style={{ backgroundColor: settings.theme === 'dark' ? colors.secondary : colors.secondary }}
    >
      <div className="max-w-6xl mx-auto">
        <h2 
          className="text-2xl font-bold text-center mb-8"
          style={{ color: colors.text }}
        >
          Photo Gallery
        </h2>
        
        <div className={`grid ${getGridLayout()} gap-3 lg:gap-4`}>
          {images.map((image, index) => (
            <div 
              key={index}
              className={`
                relative overflow-hidden rounded-xl
                ${index === 0 && images.length > 4 ? 'sm:col-span-2 sm:row-span-2' : ''}
                aspect-[4/3]
              `}
            >
              <img 
                src={image} 
                alt={`${listing.title} - Image ${index + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
        
        {listing.images.length > 30 && (
          <p className="text-center mt-4 text-sm" style={{ color: colors.muted }}>
            +{listing.images.length - 30} more images available
          </p>
        )}
      </div>
    </div>
  );
};
