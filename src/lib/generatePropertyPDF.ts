import jsPDF from "jspdf";
import QRCode from "qrcode";

interface PropertyData {
  id: string;
  title: string;
  description: string;
  price: string;
  pricePerSqft?: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  size: string;
  type: string;
  status: string;
  purpose?: string;
  furnishing?: string;
  refNumber: string;
  permitNumber?: string;
  agent: {
    name: string;
    phone: string;
    email: string;
  };
  amenities?: string[];
  features?: string[];
  images: string[];
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const addImageToPDF = async (
  pdf: jsPDF,
  imageUrl: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): Promise<{ width: number; height: number }> => {
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(img, 0, 0);
    
    const aspectRatio = img.width / img.height;
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    pdf.addImage(dataUrl, "JPEG", x, y, width, height);
    
    return { width, height };
  } catch (error) {
    console.error("Error loading image:", error);
    return { width: 0, height: 0 };
  }
};

export const generatePropertyPDF = async (property: PropertyData): Promise<void> => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const textColor: [number, number, number] = [31, 41, 55];
  const mutedColor: [number, number, number] = [107, 114, 128];

  // Header with company branding
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, 25, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("RealCRM", margin, 15);
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Property Brochure", pageWidth - margin - 35, 15);

  yPos = 35;

  // Main Image
  if (property.images.length > 0) {
    const { height } = await addImageToPDF(
      pdf,
      property.images[0],
      margin,
      yPos,
      contentWidth,
      70
    );
    yPos += height > 0 ? height + 8 : 5;
  }

  // Status and Ref badges
  pdf.setFillColor(16, 185, 129);
  pdf.roundedRect(margin, yPos, 25, 7, 1, 1, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text(property.status, margin + 3, yPos + 5);

  pdf.setFillColor(229, 231, 235);
  pdf.roundedRect(margin + 28, yPos, 30, 7, 1, 1, "F");
  pdf.setTextColor(...mutedColor);
  pdf.text(`Ref: ${property.refNumber}`, margin + 31, yPos + 5);

  yPos += 15;

  // Property Title
  pdf.setTextColor(...textColor);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  const titleLines = pdf.splitTextToSize(property.title, contentWidth);
  pdf.text(titleLines, margin, yPos);
  yPos += titleLines.length * 7 + 3;

  // Location
  pdf.setTextColor(...mutedColor);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`📍 ${property.location}`, margin, yPos);
  yPos += 10;

  // Price
  pdf.setTextColor(...primaryColor);
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(property.price, margin, yPos);
  if (property.pricePerSqft) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...mutedColor);
    pdf.text(` (${property.pricePerSqft}/sqft)`, margin + pdf.getTextWidth(property.price) + 2, yPos);
  }
  yPos += 12;

  // Property Details Grid
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, yPos, contentWidth, 20, 2, 2, "F");

  const detailsY = yPos + 7;
  const colWidth = contentWidth / 4;
  
  pdf.setTextColor(...textColor);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  
  // Bedrooms
  pdf.text(`🛏️ ${property.bedrooms}`, margin + 8, detailsY);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...mutedColor);
  pdf.text("Bedrooms", margin + 8, detailsY + 7);

  // Bathrooms
  pdf.setTextColor(...textColor);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`🛁 ${property.bathrooms}`, margin + colWidth + 8, detailsY);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...mutedColor);
  pdf.text("Bathrooms", margin + colWidth + 8, detailsY + 7);

  // Size
  pdf.setTextColor(...textColor);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`📐 ${property.size}`, margin + colWidth * 2 + 8, detailsY);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...mutedColor);
  pdf.text("Area", margin + colWidth * 2 + 8, detailsY + 7);

  // Type
  pdf.setTextColor(...textColor);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`🏠 ${property.type}`, margin + colWidth * 3 + 8, detailsY);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...mutedColor);
  pdf.text("Type", margin + colWidth * 3 + 8, detailsY + 7);

  yPos += 28;

  // Description
  pdf.setTextColor(...textColor);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Description", margin, yPos);
  yPos += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...mutedColor);
  const descLines = pdf.splitTextToSize(property.description, contentWidth);
  pdf.text(descLines.slice(0, 5), margin, yPos);
  yPos += Math.min(descLines.length, 5) * 4.5 + 8;

  // Property Information
  if (property.purpose || property.furnishing || property.permitNumber) {
    pdf.setTextColor(...textColor);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Property Information", margin, yPos);
    yPos += 6;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    
    const infoItems = [
      property.purpose && { label: "Purpose", value: property.purpose },
      property.furnishing && { label: "Furnishing", value: property.furnishing },
      property.permitNumber && { label: "Permit No.", value: property.permitNumber },
    ].filter(Boolean);

    infoItems.forEach((item, index) => {
      if (item) {
        const xOffset = (index % 2) * (contentWidth / 2);
        pdf.setTextColor(...mutedColor);
        pdf.text(`${item.label}:`, margin + xOffset, yPos);
        pdf.setTextColor(...textColor);
        pdf.text(item.value, margin + xOffset + 25, yPos);
        if (index % 2 === 1 || index === infoItems.length - 1) {
          yPos += 5;
        }
      }
    });
    yPos += 5;
  }

  // Amenities
  if (property.amenities && property.amenities.length > 0) {
    pdf.setTextColor(...textColor);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Amenities", margin, yPos);
    yPos += 6;

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...mutedColor);
    
    const amenitiesPerRow = 4;
    const amenityWidth = contentWidth / amenitiesPerRow;
    property.amenities.slice(0, 8).forEach((amenity, index) => {
      const xOffset = (index % amenitiesPerRow) * amenityWidth;
      pdf.text(`• ${amenity}`, margin + xOffset, yPos);
      if ((index + 1) % amenitiesPerRow === 0) {
        yPos += 4;
      }
    });
    yPos += 8;
  }

  // Gallery Thumbnails
  if (property.images.length > 1) {
    const thumbWidth = (contentWidth - 8) / 4;
    const thumbHeight = 25;
    
    for (let i = 1; i < Math.min(property.images.length, 5); i++) {
      await addImageToPDF(
        pdf,
        property.images[i],
        margin + (i - 1) * (thumbWidth + 2),
        yPos,
        thumbWidth,
        thumbHeight
      );
    }
    yPos += thumbHeight + 10;
  }

  // Agent Contact Section (Bottom)
  const footerHeight = 40;
  const footerY = pageHeight - footerHeight - margin;
  
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, footerY, contentWidth - 45, footerHeight, 2, 2, "F");

  // Agent Info
  pdf.setTextColor(...textColor);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Contact Agent", margin + 5, footerY + 8);

  pdf.setFontSize(11);
  pdf.text(property.agent.name, margin + 5, footerY + 16);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...mutedColor);
  pdf.text(`📱 ${property.agent.phone}`, margin + 5, footerY + 24);
  pdf.text(`✉️ ${property.agent.email}`, margin + 5, footerY + 31);

  // QR Code
  const qrUrl = `${window.location.origin}/listings/${property.id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 120,
      margin: 1,
      color: { dark: "#1f2937", light: "#ffffff" },
    });
    pdf.addImage(qrDataUrl, "PNG", pageWidth - margin - 35, footerY + 2, 30, 30);
    
    pdf.setFontSize(7);
    pdf.setTextColor(...mutedColor);
    pdf.text("Scan to view listing", pageWidth - margin - 35, footerY + 35, { maxWidth: 30 });
  } catch (error) {
    console.error("QR code generation failed:", error);
  }

  // Footer line
  pdf.setDrawColor(...primaryColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

  // Footer text
  pdf.setFontSize(7);
  pdf.setTextColor(...mutedColor);
  const timestamp = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generated on ${timestamp}`, margin, pageHeight - 5);
  pdf.text("RealCRM | www.realcrm.com", pageWidth - margin - 35, pageHeight - 5);

  // Save PDF
  const fileName = `${property.title.replace(/[^a-zA-Z0-9]/g, "-")}-${property.refNumber}.pdf`;
  pdf.save(fileName);
};
