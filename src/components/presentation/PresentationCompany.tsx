import { PresentationCompany as CompanyType, PresentationSettings, themeColors } from './types';
import { MapPin, Phone, Mail, Globe } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface PresentationCompanyProps {
  company: CompanyType;
  settings: PresentationSettings;
  listingUrl?: string;
}

export const PresentationCompanySection = ({ company, settings, listingUrl }: PresentationCompanyProps) => {
  const colors = themeColors[settings.theme];
  const [qrCode, setQrCode] = useState<string>('');
  
  useEffect(() => {
    if (listingUrl) {
      QRCode.toDataURL(listingUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: settings.theme === 'dark' ? '#ffffff' : '#000000',
          light: '#00000000',
        },
      }).then(setQrCode);
    }
  }, [listingUrl, settings.theme]);

  return (
    <div 
      className="py-12 px-6 lg:px-12 print:py-8"
      style={{ 
        backgroundColor: settings.theme === 'luxury' 
          ? colors.primary 
          : settings.theme === 'dark' 
            ? colors.secondary 
            : 'white'
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Company Logo & Info */}
          <div className="flex-1 text-center lg:text-left">
            {company.logo ? (
              <img 
                src={company.logo} 
                alt={company.name}
                className="h-16 lg:h-20 object-contain mx-auto lg:mx-0 mb-4"
                style={{ 
                  filter: settings.theme === 'luxury' ? 'brightness(0) invert(1)' : 'none' 
                }}
              />
            ) : (
              <h3 
                className="text-3xl font-bold mb-4"
                style={{ 
                  color: settings.theme === 'luxury' ? colors.secondary : colors.text 
                }}
              >
                {company.name}
              </h3>
            )}
            
            {company.about && (
              <p 
                className="mb-6 max-w-lg"
                style={{ 
                  color: settings.theme === 'luxury' ? `${colors.secondary}CC` : colors.muted 
                }}
              >
                {company.about}
              </p>
            )}
            
            <div className="space-y-3">
              {company.address && (
                <div 
                  className="flex items-center gap-3 justify-center lg:justify-start"
                  style={{ 
                    color: settings.theme === 'luxury' ? colors.secondary : colors.text 
                  }}
                >
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <span>{company.address}</span>
                </div>
              )}
              {company.phone && (
                <div 
                  className="flex items-center gap-3 justify-center lg:justify-start"
                  style={{ 
                    color: settings.theme === 'luxury' ? colors.secondary : colors.text 
                  }}
                >
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.email && (
                <div 
                  className="flex items-center gap-3 justify-center lg:justify-start"
                  style={{ 
                    color: settings.theme === 'luxury' ? colors.secondary : colors.text 
                  }}
                >
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <span>{company.email}</span>
                </div>
              )}
              {company.website && (
                <div 
                  className="flex items-center gap-3 justify-center lg:justify-start"
                  style={{ 
                    color: settings.theme === 'luxury' ? colors.secondary : colors.text 
                  }}
                >
                  <Globe className="w-5 h-5 flex-shrink-0" />
                  <span>{company.website}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* QR Code */}
          {qrCode && (
            <div 
              className="text-center p-6 rounded-2xl"
              style={{ 
                backgroundColor: settings.theme === 'luxury' 
                  ? `${colors.secondary}15` 
                  : colors.secondary 
              }}
            >
              <img src={qrCode} alt="View Listing QR Code" className="w-32 h-32 mx-auto" />
              <p 
                className="text-sm mt-3 font-medium"
                style={{ 
                  color: settings.theme === 'luxury' ? colors.secondary : colors.muted 
                }}
              >
                Scan to view listing
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div 
          className="mt-8 pt-6 text-center text-sm"
          style={{ 
            borderTop: `1px solid ${settings.theme === 'luxury' ? `${colors.secondary}30` : `${colors.primary}15`}`,
            color: settings.theme === 'luxury' ? `${colors.secondary}80` : colors.muted
          }}
        >
          <p>© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
          {company.tagline && (
            <p className="mt-1 italic">{company.tagline}</p>
          )}
        </div>
      </div>
    </div>
  );
};
