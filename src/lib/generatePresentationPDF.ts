import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { 
  PresentationListing, 
  PresentationAgent, 
  PresentationCompany, 
  PresentationSettings,
  themeColors 
} from '@/components/presentation/types';

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const addImageToPDF = (
  doc: jsPDF,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) => {
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
  const width = img.width * ratio;
  const height = img.height * ratio;
  const offsetX = x + (maxWidth - width) / 2;
  const offsetY = y + (maxHeight - height) / 2;
  doc.addImage(img, 'JPEG', offsetX, offsetY, width, height);
  return { width, height, offsetX, offsetY };
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const hexToRgb = (hex: string): [number, number, number] => {
  // Handle HSL format
  if (hex.startsWith('hsl')) {
    return [26, 54, 93]; // Default blue for classic theme
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

export const generatePresentationPDF = async (
  listing: PresentationListing,
  agent: PresentationAgent,
  company: PresentationCompany,
  settings: PresentationSettings
): Promise<void> => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  
  const colors = themeColors[settings.theme];
  const primaryRgb = hexToRgb(colors.primary);

  let currentPage = 1;

  // Helper function to add new page
  const addNewPage = () => {
    doc.addPage();
    currentPage++;
  };

  // ==================== COVER PAGE ====================
  if (settings.sections.cover) {
    // Cover image
    try {
      const coverImg = await loadImage(listing.images[0]);
      doc.addImage(coverImg, 'JPEG', 0, 0, pageWidth, pageHeight * 0.6);
    } catch (e) {
      // Fallback gradient background
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, pageHeight * 0.6, 'F');
    }

    // Overlay gradient (semi-transparent dark bar)
    doc.setFillColor(50, 50, 50);
    doc.rect(0, pageHeight * 0.35, pageWidth, pageHeight * 0.25, 'F');

    // Company logo/name at top
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name, margin, 20);

    // Property type badge
    doc.setFillColor(...primaryRgb);
    doc.roundedRect(margin, pageHeight * 0.45, 40, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`For ${listing.priceType === 'sale' ? 'Sale' : 'Rent'}`, margin + 20, pageHeight * 0.45 + 5.5, { align: 'center' });

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(listing.title, contentWidth);
    doc.text(titleLines, margin, pageHeight * 0.52);

    // Location
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(listing.location, margin, pageHeight * 0.52 + titleLines.length * 10 + 5);

    // Price section at bottom
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, pageHeight * 0.65, contentWidth, 50, 3, 3, 'F');

    doc.setTextColor(...primaryRgb);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(formatPrice(listing.price) + (listing.priceType === 'rent' ? ' /year' : ''), margin + 10, pageHeight * 0.65 + 20);

    // Quick stats
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    const stats = `${listing.bedrooms} Beds  •  ${listing.bathrooms} Baths  •  ${listing.size.toLocaleString()} ${listing.sizeUnit}  •  ${listing.propertyType}`;
    doc.text(stats, margin + 10, pageHeight * 0.65 + 35);

    // Agent info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(agent.name, margin + 10, pageHeight * 0.85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(agent.phone + '  |  ' + agent.email, margin + 10, pageHeight * 0.85 + 6);

    // Reference
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text(`Ref: ${listing.referenceId}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // ==================== SUMMARY PAGE ====================
  if (settings.sections.summary || settings.sections.description) {
    addNewPage();

    let yPos = margin;

    if (settings.sections.summary) {
      doc.setTextColor(...primaryRgb);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Property Overview', margin, yPos);
      yPos += 15;

      // Stats boxes
      const stats = [
        { label: 'Bedrooms', value: listing.bedrooms.toString() },
        { label: 'Bathrooms', value: listing.bathrooms.toString() },
        { label: 'Size', value: `${listing.size.toLocaleString()} ${listing.sizeUnit}` },
        { label: 'Type', value: listing.propertyType },
      ];

      if (listing.parking) stats.push({ label: 'Parking', value: listing.parking.toString() });
      if (listing.furnishing) stats.push({ label: 'Furnishing', value: listing.furnishing });

      const boxWidth = (contentWidth - 15) / 3;
      const boxHeight = 25;

      stats.forEach((stat, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const x = margin + col * (boxWidth + 5);
        const y = yPos + row * (boxHeight + 5);

        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');

        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text(stat.label.toUpperCase(), x + boxWidth / 2, y + 8, { align: 'center' });

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.value, x + boxWidth / 2, y + 18, { align: 'center' });
      });

      yPos += Math.ceil(stats.length / 3) * (boxHeight + 5) + 15;
    }

    if (settings.sections.description) {
      doc.setTextColor(...primaryRgb);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Property Description', margin, yPos);
      yPos += 10;

      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(listing.description, contentWidth);
      doc.text(descLines.slice(0, 20), margin, yPos);
      yPos += descLines.slice(0, 20).length * 5 + 15;

      // Highlights
      if (listing.features && listing.features.length > 0) {
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(margin, yPos, contentWidth, 10 + listing.features.length * 7, 3, 3, 'F');

        doc.setTextColor(...primaryRgb);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Property Highlights', margin + 5, yPos + 8);

        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        listing.features.forEach((feature, index) => {
          doc.text('✓ ' + feature, margin + 8, yPos + 17 + index * 6);
        });
      }
    }
  }

  // ==================== GALLERY PAGE ====================
  if (settings.sections.gallery && listing.images.length > 1) {
    addNewPage();

    doc.setTextColor(...primaryRgb);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Photo Gallery', margin, margin);

    const galleryImages = listing.images.slice(1, 7);
    const imgWidth = (contentWidth - 5) / 2;
    const imgHeight = 55;
    const startY = margin + 15;

    for (let i = 0; i < galleryImages.length; i++) {
      try {
        const img = await loadImage(galleryImages[i]);
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = margin + col * (imgWidth + 5);
        const y = startY + row * (imgHeight + 5);
        
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(x, y, imgWidth, imgHeight, 2, 2, 'F');
        addImageToPDF(doc, img, x, y, imgWidth, imgHeight);
      } catch (e) {
        // Skip failed images
      }
    }
  }

  // ==================== AMENITIES PAGE ====================
  if (settings.sections.amenities && listing.amenities.length > 0) {
    addNewPage();

    doc.setTextColor(...primaryRgb);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Amenities & Features', margin, margin);

    const amenityWidth = (contentWidth - 10) / 3;
    const amenityHeight = 12;
    const startY = margin + 15;

    listing.amenities.forEach((amenity, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = margin + col * (amenityWidth + 5);
      const y = startY + row * (amenityHeight + 3);

      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x, y, amenityWidth, amenityHeight, 2, 2, 'F');

      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.text('✓ ' + amenity, x + 4, y + 7.5);
    });
  }

  // ==================== AGENT & COMPANY PAGE ====================
  if (settings.sections.agent || settings.sections.company) {
    addNewPage();

    let yPos = margin;

    if (settings.sections.agent) {
      doc.setTextColor(...primaryRgb);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Your Property Consultant', margin, yPos);
      yPos += 15;

      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, 'F');

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(agent.name, margin + 10, yPos + 12);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(agent.designation || 'Property Consultant', margin + 10, yPos + 20);

      doc.setTextColor(80, 80, 80);
      doc.setFontSize(9);
      doc.text(`📞 ${agent.phone}`, margin + 10, yPos + 30);
      doc.text(`✉️ ${agent.email}`, margin + 70, yPos + 30);

      // WhatsApp QR
      try {
        const qrDataUrl = await QRCode.toDataURL(`https://wa.me/${agent.whatsapp || agent.phone.replace(/\D/g, '')}`, {
          width: 80,
          margin: 0,
        });
        doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 30, yPos + 5, 25, 25);
        doc.setFontSize(7);
        doc.text('Scan to WhatsApp', pageWidth - margin - 17.5, yPos + 35, { align: 'center' });
      } catch (e) {}

      yPos += 55;
    }

    if (settings.sections.company) {
      doc.setTextColor(...primaryRgb);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('About Us', margin, yPos);
      yPos += 10;

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name, margin, yPos);
      yPos += 8;

      if (company.about) {
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const aboutLines = doc.splitTextToSize(company.about, contentWidth - 40);
        doc.text(aboutLines, margin, yPos);
        yPos += aboutLines.length * 4 + 10;
      }

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      if (company.address) doc.text(`📍 ${company.address}`, margin, yPos);
      if (company.phone) doc.text(`📞 ${company.phone}`, margin, yPos + 5);
      if (company.email) doc.text(`✉️ ${company.email}`, margin, yPos + 10);
      if (company.website) doc.text(`🌐 ${company.website}`, margin, yPos + 15);

      // Listing QR
      try {
        const listingUrl = `${window.location.origin}/listings/${listing.id}/presentation`;
        const qrDataUrl = await QRCode.toDataURL(listingUrl, {
          width: 100,
          margin: 0,
        });
        doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 35, yPos - 20, 30, 30);
        doc.setFontSize(7);
        doc.text('View Online', pageWidth - margin - 20, yPos + 15, { align: 'center' });
      } catch (e) {}
    }

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text(`© ${new Date().getFullYear()} ${company.name}. All rights reserved.`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    if (company.tagline) {
      doc.text(company.tagline, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }
  }

  // Save PDF
  const fileName = `${listing.title.replace(/[^a-z0-9]/gi, '_')}_Presentation.pdf`;
  doc.save(fileName);
};
