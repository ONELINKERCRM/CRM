import { useState } from "react";
import { DollarSign, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { toast } from "sonner";

interface BulkEditListingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingIds: string[];
  onSave: (changes: { currency?: string; sizeUnit?: string }) => void;
}

const currencies = [
  { value: "AED", label: "AED", symbol: "د.إ" },
  { value: "USD", label: "USD", symbol: "$" },
  { value: "QAR", label: "QAR", symbol: "ر.ق" },
  { value: "SAR", label: "SAR", symbol: "ر.س" },
  { value: "EUR", label: "EUR", symbol: "€" },
  { value: "GBP", label: "GBP", symbol: "£" },
];

const sizeUnits = [
  { value: "sqft", label: "Square Feet (sq ft)" },
  { value: "sqm", label: "Square Meters (sq m)" },
];

export function BulkEditListingsDialog({
  open,
  onOpenChange,
  listingIds,
  onSave,
}: BulkEditListingsDialogProps) {
  const [updateCurrency, setUpdateCurrency] = useState(false);
  const [updateSizeUnit, setUpdateSizeUnit] = useState(false);
  const [currency, setCurrency] = useState("AED");
  const [sizeUnit, setSizeUnit] = useState("sqft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!updateCurrency && !updateSizeUnit) {
      toast.error("Please select at least one field to update");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const changes: { currency?: string; sizeUnit?: string } = {};
    if (updateCurrency) changes.currency = currency;
    if (updateSizeUnit) changes.sizeUnit = sizeUnit;
    
    onSave(changes);
    
    toast.success(`Updated ${listingIds.length} listing(s)`, {
      description: [
        updateCurrency && `Currency: ${currency}`,
        updateSizeUnit && `Size unit: ${sizeUnit === "sqft" ? "sq ft" : "sq m"}`,
      ]
        .filter(Boolean)
        .join(", "),
    });
    
    setIsSubmitting(false);
    onOpenChange(false);
    
    // Reset state
    setUpdateCurrency(false);
    setUpdateSizeUnit(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Bulk Edit {listingIds.length} Listing{listingIds.length !== 1 ? "s" : ""}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Select the fields you want to update for all selected listings.
          </p>

          {/* Currency Update */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="update-currency" className="font-medium">
                  Update Currency
                </Label>
              </div>
              <Switch
                id="update-currency"
                checked={updateCurrency}
                onCheckedChange={setUpdateCurrency}
              />
            </div>
            {updateCurrency && (
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{c.symbol}</span>
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Size Unit Update */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="update-size-unit" className="font-medium">
                  Update Size Unit
                </Label>
              </div>
              <Switch
                id="update-size-unit"
                checked={updateSizeUnit}
                onCheckedChange={setUpdateSizeUnit}
              />
            </div>
            {updateSizeUnit && (
              <Select value={sizeUnit} onValueChange={setSizeUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizeUnits.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || (!updateCurrency && !updateSizeUnit)}
          >
            {isSubmitting ? "Updating..." : "Update Listings"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
