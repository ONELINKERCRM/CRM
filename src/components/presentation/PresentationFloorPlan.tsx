import { PresentationListing, PresentationSettings, themeColors } from './types';

interface PresentationFloorPlanProps {
  listing: PresentationListing;
  settings: PresentationSettings;
}

export const PresentationFloorPlan = ({ listing, settings }: PresentationFloorPlanProps) => {
  const colors = themeColors[settings.theme];
  
  if (!listing.floorPlans || listing.floorPlans.length === 0) return null;

  return (
    <div 
      className="py-12 px-6 lg:px-12 print:py-8 print:break-before-page"
      style={{ backgroundColor: settings.theme === 'dark' ? colors.secondary : colors.secondary }}
    >
      <div className="max-w-5xl mx-auto">
        <h2 
          className="text-2xl font-bold text-center mb-8"
          style={{ color: colors.text }}
        >
          Floor Plan{listing.floorPlans.length > 1 ? 's' : ''}
        </h2>
        
        <div className={`grid ${listing.floorPlans.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
          {listing.floorPlans.map((floorPlan, index) => (
            <div
              key={index}
              className="rounded-2xl overflow-hidden shadow-lg"
              style={{ backgroundColor: settings.theme === 'dark' ? `${colors.primary}10` : 'white' }}
            >
              <div 
                className="px-4 py-3 text-center font-medium"
                style={{ 
                  backgroundColor: settings.theme === 'luxury' ? colors.primary : `${colors.primary}10`,
                  color: settings.theme === 'luxury' ? colors.secondary : colors.text
                }}
              >
                {listing.floorPlans.length > 1 ? `Floor Plan ${index + 1}` : 'Floor Plan'}
              </div>
              <div className="p-4">
                <img 
                  src={floorPlan} 
                  alt={`Floor plan ${index + 1}`}
                  className="w-full h-auto max-h-[500px] object-contain mx-auto"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
