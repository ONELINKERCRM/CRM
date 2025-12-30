import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  ArrowLeft, Download, Share2, Settings, MessageCircle, Mail, Link2, Loader2, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  PresentationListing, 
  PresentationAgent, 
  PresentationCompany, 
  PresentationSettings,
  defaultSettings 
} from '@/components/presentation/types';
import { PresentationCover } from '@/components/presentation/PresentationCover';
import { PresentationSummary } from '@/components/presentation/PresentationSummary';
import { PresentationDescription } from '@/components/presentation/PresentationDescription';
import { PresentationGallery } from '@/components/presentation/PresentationGallery';
import { PresentationAmenities } from '@/components/presentation/PresentationAmenities';
import { PresentationFloorPlan } from '@/components/presentation/PresentationFloorPlan';
import { PresentationMap } from '@/components/presentation/PresentationMap';
import { PresentationAgentSection } from '@/components/presentation/PresentationAgent';
import { PresentationCompanySection } from '@/components/presentation/PresentationCompany';
import { PresentationSettingsPanel } from '@/components/presentation/PresentationSettingsPanel';
import { generatePresentationPDF } from '@/lib/generatePresentationPDF';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data - would come from API in real app
const mockListing: PresentationListing = {
  id: '1',
  title: 'Luxury 3BR Apartment in Downtown Dubai',
  description: `Experience the epitome of luxury living in this stunning 3-bedroom apartment located in the heart of Downtown Dubai. This meticulously designed residence offers breathtaking views of the iconic Burj Khalifa and Dubai Fountain.

The apartment features a spacious open-plan living area with floor-to-ceiling windows that flood the space with natural light. The fully equipped modern kitchen comes with premium appliances and elegant finishes. Each bedroom is generously sized with built-in wardrobes, and the master suite includes a lavish en-suite bathroom.

Residents enjoy exclusive access to world-class amenities including an infinity pool, state-of-the-art gym, spa facilities, and 24-hour concierge service. The prime location offers easy access to Dubai Mall, fine dining restaurants, and the vibrant Downtown lifestyle.`,
  price: 3500000,
  priceType: 'sale',
  location: 'Downtown Dubai, Dubai',
  area: 'Downtown Dubai',
  city: 'Dubai',
  country: 'UAE',
  bedrooms: 3,
  bathrooms: 4,
  size: 2450,
  sizeUnit: 'sqft',
  parking: 2,
  furnishing: 'Furnished',
  propertyType: 'Apartment',
  referenceId: 'LX-2024-0892',
  images: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
  ],
  floorPlans: [
    'https://images.unsplash.com/photo-1628745277895-1dab09c5e5c0?w=800'
  ],
  amenities: [
    'Swimming Pool', 'Gym', 'Balcony', 'Sea View', 'Maids Room', 
    'Central AC', 'Parking', 'CCTV', 'Concierge', 'Spa'
  ],
  features: [
    '3 spacious bedrooms with built-in wardrobes',
    '4 modern bathrooms including master en-suite',
    '2,450 sqft of premium living space',
    'Direct Burj Khalifa and Fountain views',
    'Private parking for 2 vehicles',
    'Walking distance to Dubai Mall'
  ],
  coordinates: { lat: 25.1972, lng: 55.2744 },
  permitNumber: 'DLD-2024-892654'
};

const mockAgent: PresentationAgent = {
  id: '1',
  name: 'Sarah Johnson',
  designation: 'Senior Property Consultant',
  phone: '+971 50 123 4567',
  email: 'sarah.johnson@agency.com',
  whatsapp: '971501234567',
  photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200'
};

const mockCompany: PresentationCompany = {
  name: 'Premium Properties',
  logo: undefined,
  tagline: 'Your Dream Home Awaits',
  about: 'Leading real estate agency in the UAE with over 15 years of experience in luxury properties. We specialize in premium residential and commercial real estate across Dubai and the GCC region.',
  address: 'Business Bay, Dubai, UAE',
  phone: '+971 4 123 4567',
  email: 'info@premiumproperties.ae',
  website: 'www.premiumproperties.ae'
};

export default function ListingPresentationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const presentationRef = useRef<HTMLDivElement>(null);
  
  const [settings, setSettings] = useState<PresentationSettings>(defaultSettings);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // In a real app, fetch listing, agent, and company data based on id
  const listing = mockListing;
  const agent = mockAgent;
  const company = mockCompany;

  const presentationUrl = `${window.location.origin}/listings/${id}/presentation`;

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generatePresentationPDF(listing, agent, company, settings);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = (platform: 'whatsapp' | 'email' | 'copy') => {
    const message = `Check out this property: ${listing.title}\n${presentationUrl}`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(listing.title)}&body=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(presentationUrl);
        setLinkCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setLinkCopied(false), 2000);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b print:hidden">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Settings */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Presentation Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <PresentationSettingsPanel 
                    settings={settings} 
                    onSettingsChange={setSettings} 
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Share */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('email')}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                  {linkCopied ? (
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Download PDF */}
            <Button size="sm" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Presentation Content */}
      <div ref={presentationRef} className="pt-16 print:pt-0">
        {settings.sections.cover && (
          <PresentationCover 
            listing={listing} 
            agent={agent} 
            company={company}
            settings={settings} 
          />
        )}
        
        {settings.sections.summary && (
          <PresentationSummary listing={listing} settings={settings} />
        )}
        
        {settings.sections.description && (
          <PresentationDescription listing={listing} settings={settings} />
        )}
        
        {settings.sections.gallery && listing.images.length > 0 && (
          <PresentationGallery listing={listing} settings={settings} />
        )}
        
        {settings.sections.amenities && listing.amenities.length > 0 && (
          <PresentationAmenities listing={listing} settings={settings} />
        )}
        
        {settings.sections.floorPlan && listing.floorPlans && listing.floorPlans.length > 0 && (
          <PresentationFloorPlan listing={listing} settings={settings} />
        )}
        
        {settings.sections.map && (
          <PresentationMap listing={listing} settings={settings} />
        )}
        
        {settings.sections.agent && (
          <PresentationAgentSection 
            agent={agent} 
            settings={settings}
            companyTagline={company.tagline}
          />
        )}
        
        {settings.sections.company && (
          <PresentationCompanySection 
            company={company} 
            settings={settings}
            listingUrl={presentationUrl}
          />
        )}
      </div>

      {/* Mobile Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t sm:hidden print:hidden">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => handleShare('whatsapp')}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button 
            className="flex-1"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
