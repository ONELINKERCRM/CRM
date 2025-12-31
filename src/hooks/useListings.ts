import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Listing {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  price: number | null;
  currency: string;
  price_frequency: string | null;
  location: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size: number | null;
  size_unit: string | null;
  property_type: string | null;
  listing_type: string | null;
  status: string;
  furnishing: string | null;
  completion_status: string | null;
  permit_number: string | null;
  ref_number: string | null;
  reference_number: string | null;
  amenities: string[] | null;
  features: string[] | null;
  tags: string[] | null;
  images: string[] | null;
  videos: string[] | null;
  documents: string[] | null;
  company_id: string | null;
  created_by: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
  // New fields
  latitude: number | null;
  longitude: number | null;
  plot_size: number | null;
  view_type: string | null;
  ownership_type: string | null;
  service_charge: number | null;
  developer: string | null;
  project_name: string | null;
  building_name: string | null;
  floor_number: number | null;
  parking_spaces: number | null;
  virtual_tour_url: string | null;
  // For UI compatibility
  image?: string;
  views?: number;
  inquiries?: number;
  portals?: string[];
  agent?: { name: string; avatar?: string };
  type?: string;
}

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchListingsRef = useRef<() => Promise<void>>();

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Fetch listings with agent info
    const { data, error: fetchError } = await supabase
      .from("listings")
      .select(`
        *,
        agents:assigned_agent_id (
          id,
          name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching listings:", fetchError);
      setError(fetchError.message);
      setListings([]);
    } else {
      // Transform DB data to UI format
      const transformed = (data || []).map((item: any) => ({
        ...item,
        // UI compatibility fields
        type: item.property_type || "Apartment",
        image: item.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
        views: 0,
        inquiries: 0,
        portals: [],
        bedrooms: item.number_of_bedrooms,
        bathrooms: item.number_of_bathrooms,
        size: item.area_size,
        size_unit: item.area_unit,
        agent: item.agents
          ? { name: item.agents.name, avatar: item.agents.avatar_url || "" }
          : { name: "Unassigned", avatar: "" },
      }));
      setListings(transformed);
    }
    setIsLoading(false);
  }, []);

  // Keep ref updated
  useEffect(() => {
    fetchListingsRef.current = fetchListings;
  }, [fetchListings]);

  useEffect(() => {
    fetchListings();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("listings-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "listings",
        },
        (payload) => {

          const newListing = {
            ...payload.new,
            type: payload.new.property_type || "Apartment",
            image: payload.new.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
            views: 0,
            inquiries: 0,
            portals: [],
            bedrooms: payload.new.number_of_bedrooms,
            bathrooms: payload.new.number_of_bathrooms,
            size: payload.new.area_size,
            size_unit: payload.new.area_unit,
            agent: { name: "Unassigned", avatar: "" },
          } as Listing;
          setListings((prev) => [newListing, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "listings",
        },
        (payload) => {

          setListings((prev) =>
            prev.map((listing) =>
              listing.id === payload.new.id
                ? {
                  ...payload.new,
                  type: payload.new.property_type || "Apartment",
                  image: payload.new.images?.[0] || listing.image,
                  views: listing.views,
                  inquiries: listing.inquiries,
                  portals: listing.portals,
                  agent: listing.agent,
                  bedrooms: payload.new.number_of_bedrooms,
                  bathrooms: payload.new.number_of_bathrooms,
                  size: payload.new.area_size,
                  size_unit: payload.new.area_unit,
                } as Listing
                : listing
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "listings",
        },
        (payload) => {

          setListings((prev) => prev.filter((listing) => listing.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchListings]);

  const refetch = () => {
    fetchListings();
  };

  return { listings, isLoading, error, refetch, setListings };
}
