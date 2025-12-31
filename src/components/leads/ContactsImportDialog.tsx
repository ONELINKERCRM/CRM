import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Contact,
  Check,
  Loader2,
  Phone,
  Smartphone,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContactsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (leads: ContactLead[]) => void;
}

interface ContactLead {
  name: string;
  phone: string;
  email?: string;
}

interface DeviceContact {
  name: string[];
  tel?: string[];
  email?: string[];
}

interface NavigatorWithContacts extends Navigator {
  contacts: {
    select(properties: string[], options?: { multiple?: boolean }): Promise<DeviceContact[]>;
  };
}

const isContactPickerSupported = () => "contacts" in navigator && "ContactsManager" in window;

export function ContactsImportDialog({ open, onOpenChange, onImport }: ContactsImportDialogProps) {
  const [contacts, setContacts] = useState<ContactLead[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasPickedContacts, setHasPickedContacts] = useState(false);

  const resetState = () => {
    setContacts([]);
    setSelectedContacts(new Set());
    setIsLoading(false);
    setIsImporting(false);
    setHasPickedContacts(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handlePickContacts = async () => {
    if (!isContactPickerSupported()) {
      toast.error("Not supported on this browser");
      return;
    }

    setIsLoading(true);
    try {
      const navigatorWithContacts = navigator as unknown as NavigatorWithContacts;
      const pickedContacts: DeviceContact[] = await navigatorWithContacts.contacts.select(["name", "tel", "email"], { multiple: true });

      if (pickedContacts?.length > 0) {
        const mappedContacts: ContactLead[] = pickedContacts
          .filter(contact => contact.name?.[0] || contact.tel?.[0])
          .map(contact => ({
            name: contact.name?.[0] || "Unknown",
            phone: contact.tel?.[0] || "",
            email: contact.email?.[0],
          }));

        setContacts(mappedContacts);
        setSelectedContacts(new Set(mappedContacts.map((_, i) => i)));
        setHasPickedContacts(true);
        toast.success(`Found ${mappedContacts.length} contacts`);
      }
    } catch (error: unknown) {
      if ((error as Error).name !== "InvalidStateError") {
        toast.error("Failed to access contacts");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContact = (index: number) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedContacts.size === contacts.length) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(contacts.map((_, i) => i)));
  };

  const handleImport = async () => {
    setIsImporting(true);
    const selectedLeads = contacts.filter((_, i) => selectedContacts.has(i));
    await new Promise(resolve => setTimeout(resolve, 800));
    onImport?.(selectedLeads);
    toast.success(`Imported ${selectedLeads.length} contacts!`);
    handleClose();
  };

  const supported = isContactPickerSupported();

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-[380px]">
        <ResponsiveDialogHeader className="pb-2">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
            <Contact className="h-4 w-4 text-primary" />
            Import Contacts
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          {!hasPickedContacts ? (
            <div className="py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>

              {supported ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select contacts from your device
                  </p>
                  <Button onClick={handlePickContacts} disabled={isLoading} size="sm">
                    {isLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Loading...</>
                    ) : (
                      <><Smartphone className="h-3.5 w-3.5 mr-1.5" /> Open Contacts</>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium mb-2">Not Supported</p>
                  <div className="bg-muted/50 rounded-lg p-3 text-left text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="font-medium">Requirements:</span>
                    </div>
                    <p>• Chrome on Android</p>
                    <p>• HTTPS connection</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Try Excel Import instead
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedContacts.size === contacts.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-xs">{selectedContacts.size}/{contacts.length} selected</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handlePickContacts}>
                  Add more
                </Button>
              </div>

              <ScrollArea className="h-[220px]">
                <div className="space-y-1.5 pr-2">
                  {contacts.map((contact, index) => (
                    <Card
                      key={index}
                      className={cn(
                        "p-2 cursor-pointer transition-colors",
                        selectedContacts.has(index) && "bg-primary/5 border-primary/30"
                      )}
                      onClick={() => toggleContact(index)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedContacts.has(index)}
                          onCheckedChange={() => toggleContact(index)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />
                            {contact.phone}
                          </p>
                        </div>
                        {selectedContacts.has(index) && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={resetState}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1" onClick={handleImport} disabled={selectedContacts.size === 0 || isImporting}>
                  {isImporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <><Check className="h-3.5 w-3.5 mr-1" /> Import {selectedContacts.size}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
