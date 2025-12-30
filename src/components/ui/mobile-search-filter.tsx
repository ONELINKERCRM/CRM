import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MobileSearchFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  onFilterClick: () => void;
  className?: string;
}

export function MobileSearchFilter({
  searchQuery,
  onSearchChange,
  placeholder = "Search...",
  onFilterClick,
  className,
}: MobileSearchFilterProps) {
  return (
    <div
      data-no-pull
      className={cn("flex items-center gap-2 px-4 py-3 relative", className)}
      style={{ pointerEvents: "auto" }}
    >
      {/* Search Input */}
      <div className="relative flex-1" data-no-pull>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          data-no-pull
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 h-12 rounded-2xl bg-muted/50 border-0 text-base placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
      </div>

      {/* Filter Button */}
      <button
        data-no-pull
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFilterClick();
        }}
        className="flex items-center gap-2 h-12 px-5 rounded-2xl bg-muted/50 text-foreground font-medium text-base active:scale-95 transition-transform cursor-pointer z-50 relative"
        style={{ pointerEvents: "auto", touchAction: "manipulation" }}
      >
        <SlidersHorizontal className="h-5 w-5" />
        <span>Filter</span>
      </button>
    </div>
  );
}
