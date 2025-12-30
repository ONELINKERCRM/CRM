import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export interface LocationResult {
  id: string;
  full_location: string;
  city: string;
  community: string | null;
  building: string | null;
  location_type: "city" | "community" | "building";
  country: string;
}

interface UseLocationSearchResult {
  locations: LocationResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearLocations: () => void;
}

export function useLocationSearch(country?: string): UseLocationSearchResult {
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setLocations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("location-search", {
        body: {
          query: query.trim(),
          country,
          limit: 15,
        },
      });

      if (fnError) throw fnError;

      setLocations(data?.locations || []);
    } catch (err) {
      console.error("Location search error:", err);
      setError(err instanceof Error ? err.message : "Failed to search locations");
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, [country]);

  const clearLocations = useCallback(() => {
    setLocations([]);
  }, []);

  return {
    locations,
    isLoading,
    error,
    search,
    clearLocations,
  };
}
