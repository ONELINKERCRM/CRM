import { PresentationAgent as AgentType, PresentationSettings, themeColors } from './types';
import { Phone, Mail, MessageCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface PresentationAgentProps {
  agent: AgentType;
  settings: PresentationSettings;
  companyTagline?: string;
}

export const PresentationAgentSection = ({ agent, settings, companyTagline }: PresentationAgentProps) => {
  const colors = themeColors[settings.theme];
  const [qrCode, setQrCode] = useState<string>('');
  
  const whatsappNumber = agent.whatsapp || agent.phone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  useEffect(() => {
    QRCode.toDataURL(whatsappUrl, {
      width: 120,
      margin: 1,
      color: {
        dark: settings.theme === 'dark' ? '#ffffff' : '#000000',
        light: '#00000000',
      },
    }).then(setQrCode);
  }, [whatsappUrl, settings.theme]);

  return (
    <div 
      className="py-12 px-6 lg:px-12 print:py-8"
      style={{ backgroundColor: settings.theme === 'dark' ? colors.secondary : colors.secondary }}
    >
      <div className="max-w-3xl mx-auto">
        <h2 
          className="text-2xl font-bold text-center mb-8"
          style={{ color: colors.text }}
        >
          Your Property Consultant
        </h2>
        
        <div 
          className="rounded-2xl p-6 lg:p-8 shadow-lg"
          style={{ 
            backgroundColor: settings.theme === 'dark' ? `${colors.primary}10` : 'white',
            border: settings.theme === 'luxury' ? `2px solid ${colors.primary}` : 'none'
          }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Agent Photo */}
            <div className="flex-shrink-0">
              {agent.photo ? (
                <img 
                  src={agent.photo} 
                  alt={agent.name}
                  className="w-32 h-32 rounded-full object-cover shadow-lg"
                  style={{ 
                    border: `4px solid ${settings.theme === 'luxury' ? colors.primary : colors.secondary}`
                  }}
                />
              ) : (
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold shadow-lg"
                  style={{ 
                    backgroundColor: colors.primary,
                    color: colors.secondary
                  }}
                >
                  {agent.name.charAt(0)}
                </div>
              )}
            </div>
            
            {/* Agent Info */}
            <div className="flex-1 text-center sm:text-left">
              <h3 
                className="text-2xl font-bold mb-1"
                style={{ color: colors.text }}
              >
                {agent.name}
              </h3>
              <p className="text-lg mb-4" style={{ color: colors.muted }}>
                {agent.designation || 'Property Consultant'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                <a 
                  href={`tel:${agent.phone}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium transition-colors"
                  style={{ 
                    backgroundColor: `${colors.primary}15`,
                    color: colors.primary
                  }}
                >
                  <Phone className="w-4 h-4" />
                  {agent.phone}
                </a>
                <a 
                  href={`mailto:${agent.email}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium transition-colors"
                  style={{ 
                    backgroundColor: `${colors.primary}15`,
                    color: colors.primary
                  }}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
                <a 
                  href={whatsappUrl}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </div>
            
            {/* QR Code */}
            <div className="flex-shrink-0 text-center">
              {qrCode && (
                <>
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-24 h-24 mx-auto" />
                  <p className="text-xs mt-2" style={{ color: colors.muted }}>
                    Scan to WhatsApp
                  </p>
                </>
              )}
            </div>
          </div>
          
          {companyTagline && (
            <div 
              className="mt-6 pt-6 text-center"
              style={{ borderTop: `1px solid ${colors.primary}20` }}
            >
              <p className="text-lg italic" style={{ color: colors.muted }}>
                "{companyTagline}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
