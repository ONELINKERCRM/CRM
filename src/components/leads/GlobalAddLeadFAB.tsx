import { useState } from "react";
import { 
  Plus, 
  FileSpreadsheet, 
  Contact, 
  UserPlus,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import { ExcelImportDialog } from "@/components/leads/ExcelImportDialog";
import { ContactsImportDialog } from "@/components/leads/ContactsImportDialog";

interface GlobalAddLeadFABProps {
  className?: string;
}

export function GlobalAddLeadFAB({ className }: GlobalAddLeadFABProps) {
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isContactsImportOpen, setIsContactsImportOpen] = useState(false);

  const handleFabOption = (option: string) => {
    setIsFabOpen(false);
    switch (option) {
      case "manual":
        setIsAddLeadOpen(true);
        break;
      case "excel":
        setIsExcelImportOpen(true);
        break;
      case "contact":
        setIsContactsImportOpen(true);
        break;
    }
  };

  const handleExcelImport = (leads: Record<string, string>[]) => {
    console.log("Imported leads:", leads);
    // In a real app, this would add leads to the database
  };

  const handleContactsImport = (leads: { name: string; phone: string; email?: string }[]) => {
    console.log("Imported contacts:", leads);
    // In a real app, this would add leads to the database
  };

  return (
    <>
      {/* FAB Menu Overlay */}
      {isFabOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
          onClick={() => setIsFabOpen(false)}
        />
      )}
      
      {/* FAB Options */}
      <div className={cn(
        "fixed bottom-36 right-4 z-50 flex flex-col gap-2 transition-all duration-200",
        isFabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}>
        <button
          onClick={() => handleFabOption("excel")}
          className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border active:scale-95 transition-transform"
        >
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium">Import Excel</span>
        </button>
        <button
          onClick={() => handleFabOption("contact")}
          className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border active:scale-95 transition-transform"
        >
          <Contact className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">From Contacts</span>
        </button>
        <button
          onClick={() => handleFabOption("manual")}
          className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border active:scale-95 transition-transform"
        >
          <UserPlus className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Manual Add</span>
        </button>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsFabOpen(!isFabOpen)}
        className={cn(
          "fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-all duration-200",
          isFabOpen && "rotate-45",
          className
        )}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Dialogs */}
      <AddLeadDialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen} />
      
      <ExcelImportDialog 
        open={isExcelImportOpen} 
        onOpenChange={setIsExcelImportOpen}
        onImport={handleExcelImport}
      />
      
      <ContactsImportDialog 
        open={isContactsImportOpen} 
        onOpenChange={setIsContactsImportOpen}
        onImport={handleContactsImport}
      />
    </>
  );
}
