import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CompanyListingsFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    type: string;
    location: string;
    priceRange: string;
    agent: string;
  };
  onFiltersChange: (filters: CompanyListingsFiltersDialogProps["filters"]) => void;
  onApply: () => void;
  onReset: () => void;
}

export function CompanyListingsFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApply,
  onReset,
}: CompanyListingsFiltersDialogProps) {
  const updateFilter = (key: keyof typeof filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleApply = () => {
    onApply();
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Filters</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Property Type</label>
            <Select value={filters.type} onValueChange={(v) => updateFilter("type", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="penthouse">Penthouse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Location</label>
            <Select value={filters.location} onValueChange={(v) => updateFilter("location", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="marina">Dubai Marina</SelectItem>
                <SelectItem value="downtown">Downtown</SelectItem>
                <SelectItem value="palm">Palm Jumeirah</SelectItem>
                <SelectItem value="jbr">JBR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Price Range</label>
            <Select value={filters.priceRange} onValueChange={(v) => updateFilter("priceRange", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="0-1m">Under 1M</SelectItem>
                <SelectItem value="1m-3m">1M - 3M</SelectItem>
                <SelectItem value="3m-5m">3M - 5M</SelectItem>
                <SelectItem value="5m+">5M+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Agent</label>
            <Select value={filters.agent} onValueChange={(v) => updateFilter("agent", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="sarah">Sarah M.</SelectItem>
                <SelectItem value="mike">Mike R.</SelectItem>
                <SelectItem value="emma">Emma K.</SelectItem>
                <SelectItem value="james">James L.</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            Reset
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
