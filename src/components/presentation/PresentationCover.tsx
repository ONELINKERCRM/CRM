import { PresentationListing, PresentationAgent, PresentationCompany, PresentationSettings, themeColors } from './types';
import { MapPin, Phone, Mail, MessageCircle } from 'lucide-react';

interface PresentationCoverProps {
  listing: PresentationListing;
  agent: PresentationAgent;
  company: PresentationCompany;
  settings: PresentationSettings;
}

export const PresentationCover = ({ listing, agent, company, settings }: PresentationCoverProps) => {
  const colors = themeColors[settings.theme];
  const coverImage = listing.images[0] || '/placeholder.svg';
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (settings.coverStyle === 'half') {
    return (
      <div className="relative min-h-screen flex print:min-h-[100vh]">
        {/* Left side - Image */}
        <div className="w-1/2 relative">
          <img 
            src={coverImage} 
            alt={listing.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
        </div>
        
        {/* Right side - Content */}
        <div 
          className="w-1/2 flex flex-col justify-between p-8 lg:p-12"
          style={{ backgroundColor: colors.secondary }}
        >
          {/* Company Logo */}
          <div className="flex justify-end">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="h-12 object-contain" />
            ) : (
              <div className="text-xl font-bold" style={{ color: colors.primary }}>
                {company.name}
              </div>
            )}
          </div>
          
          {/* Main Content */}
          <div className="space-y-6">
            <div>
              <span 
                className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{ backgroundColor: colors.primary, color: colors.secondary }}
              >
                For {listing.priceType === 'sale' ? 'Sale' : 'Rent'}
              </span>
              <h1 
                className="text-3xl lg:text-4xl font-bold leading-tight mb-3"
                style={{ color: colors.text }}
              >
                {listing.title}
              </h1>
              <div className="flex items-center gap-2 text-lg" style={{ color: colors.muted }}>
                <MapPin className="w-5 h-5" />
                <span>{listing.location}</span>
              </div>
            </div>
            
            <div 
              className="text-4xl lg:text-5xl font-bold"
              style={{ color: colors.primary }}
            >
              {formatPrice(listing.price)}
              {listing.priceType === 'rent' && <span className="text-xl font-normal"> /year</span>}
            </div>
          </div>
          
          {/* Agent Info */}
          <div 
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ backgroundColor: `${colors.primary}10` }}
          >
            {agent.photo ? (
              <img src={agent.photo} alt={agent.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ backgroundColor: colors.primary, color: colors.secondary }}
              >
                {agent.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold" style={{ color: colors.text }}>{agent.name}</p>
              <p className="text-sm" style={{ color: colors.muted }}>{agent.designation || 'Property Consultant'}</p>
            </div>
            <div className="flex gap-2">
              <a 
                href={`tel:${agent.phone}`}
                className="p-2 rounded-full transition-colors"
                style={{ backgroundColor: colors.primary, color: colors.secondary }}
              >
                <Phone className="w-4 h-4" />
              </a>
              <a 
                href={`https://wa.me/${agent.whatsapp || agent.phone}`}
                className="p-2 rounded-full bg-green-500 text-white"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full cover style
  return (
    <div className="relative min-h-screen flex flex-col print:min-h-[100vh]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={coverImage} 
          alt={listing.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen p-6 lg:p-12">
        {/* Header */}
        <div className="flex justify-between items-start">
          {company.logo ? (
            <img src={company.logo} alt={company.name} className="h-10 lg:h-14 object-contain brightness-0 invert" />
          ) : (
            <div className="text-xl lg:text-2xl font-bold text-white">
              {company.name}
            </div>
          )}
          <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm text-white">
            For {listing.priceType === 'sale' ? 'Sale' : 'Rent'}
          </span>
        </div>
        
        {/* Main Content - Centered */}
        <div className="flex-1 flex flex-col justify-center items-center text-center py-12">
          <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-4 max-w-4xl">
            {listing.title}
          </h1>
          <div className="flex items-center gap-2 text-xl text-white/80 mb-8">
            <MapPin className="w-5 h-5" />
            <span>{listing.location}</span>
          </div>
          <div className="text-5xl lg:text-7xl font-bold text-white">
            {formatPrice(listing.price)}
            {listing.priceType === 'rent' && <span className="text-2xl lg:text-3xl font-normal"> /year</span>}
          </div>
        </div>
        
        {/* Footer - Agent Info */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 lg:p-6">
          <div className="flex items-center gap-4">
            {agent.photo ? (
              <img src={agent.photo} alt={agent.name} className="w-14 h-14 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold text-white">
                {agent.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-white text-lg">{agent.name}</p>
              <p className="text-white/70">{agent.designation || 'Property Consultant'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href={`tel:${agent.phone}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{agent.phone}</span>
            </a>
            <a 
              href={`mailto:${agent.email}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <Mail className="w-4 h-4" />
            </a>
            <a 
              href={`https://wa.me/${agent.whatsapp || agent.phone}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
