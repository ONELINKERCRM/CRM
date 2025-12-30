import { useState, useCallback, useRef, useEffect } from "react";
import { MapPin, Loader2, Building2, Map, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLocationSearch, LocationResult } from "@/hooks/useLocationSearch";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  country?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export function LocationSearchInput({
  value,
  onChange,
  onBlur,
  country,
  placeholder = "City, community or building",
  label = "Property Location",
  required = false,
  error,
  className,
}: LocationSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { locations, isLoading, search, clearLocations } = useLocationSearch(country);

  // Debounced search
  const debouncedSearch = useDebouncedCallback((query: string) => {
    search(query);
  }, 300);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    if (newValue.length >= 2) {
      setIsOpen(true);
      debouncedSearch(newValue);
    } else {
      setIsOpen(false);
      clearLocations();
    }
  };

  const handleSelect = (location: LocationResult) => {
    setInputValue(location.full_location);
    onChange(location.full_location);
    setIsOpen(false);
    clearLocations();
  };

  const handleFocus = () => {
    if (inputValue.length >= 2 && locations.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      onBlur?.();
    }, 200);
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "building":
        return Building2;
      case "community":
        return Map;
      case "city":
        return Globe;
      default:
        return MapPin;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative space-y-2", className)}>
      {label && (
        <Label className={cn("text-sm font-medium", error ? "text-destructive" : "")}>
          {label} {required && "*"}
        </Label>
      )}
      
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "h-10 sm:h-11 text-sm pl-9 pr-8",
            error ? "border-destructive" : ""
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && <p className="text-xs sm:text-sm text-destructive">{error}</p>}

      {/* Dropdown */}
      {isOpen && locations.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
          {locations.map((location) => {
            const Icon = getLocationIcon(location.location_type);
            return (
              <button
                key={location.id}
                type="button"
                className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors flex items-start gap-3 border-b border-border/50 last:border-0"
                onClick={() => handleSelect(location)}
              >
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{location.full_location}</p>
                  {location.location_type !== "city" && (
                    <p className="text-xs text-muted-foreground">
                      {location.location_type === "building" ? "Building" : "Community"} • {location.city}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {isOpen && !isLoading && inputValue.length >= 2 && locations.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">No locations found</p>
          <p className="text-xs text-muted-foreground mt-1">You can type a custom location</p>
        </div>
      )}
    </div>
  );
}
