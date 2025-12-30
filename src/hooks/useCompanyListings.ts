import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanyListing {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  address: string | null;
  city: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size: number | null;
  size_unit: string | null;
  property_type: string | null;
  listing_type: string | null;
  status: string;
  images: string[] | null;
  created_at: string;
  updated_at: string;
  reference_number: string | null;
  assigned_agent_id: string | null;
  company_id: string | null;
  // Joined data
  agent: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  // Computed for UI
  views: number;
  inquiries: number;
}

interface ListingStats {
  total: number;
  active: number;
  totalViews: number;
  totalInquiries: number;
  uniqueAgents: number;
}

export function useCompanyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<CompanyListing[]>([]);
  const [stats, setStats] = useState<ListingStats>({
    total: 0,
    active: 0,
    totalViews: 0,
    totalInquiries: 0,
    uniqueAgents: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchListingsRef = useRef<(() => Promise<void>) | null>(null);

  const fetchListings = useCallback(async () => {
    if (!user) {
      setListings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get user's company_id through agents table
      const { data: agent } = await supabase
        .from("agents")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!agent?.company_id) {
        setListings([]);
        setIsLoading(false);
        return;
      }

      // Fetch all listings for the company with agent info
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
        .eq("company_id", agent.company_id)
        .in("status", ["active", "published", "Active"]) // checking both cases to be safe
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Fetch analytics for all listings
      const listingIds = (data || []).map((l) => l.id);
      let analyticsMap: Record<string, { views: number; inquiries: number }> = {};

      if (listingIds.length > 0) {
        const { data: analytics } = await supabase
          .from("listing_analytics")
          .select("listing_id, views_count, inquiries_count")
          .in("listing_id", listingIds);

        if (analytics) {
          // Aggregate analytics per listing
          analytics.forEach((a) => {
            if (!analyticsMap[a.listing_id]) {
              analyticsMap[a.listing_id] = { views: 0, inquiries: 0 };
            }
            analyticsMap[a.listing_id].views += a.views_count || 0;
            analyticsMap[a.listing_id].inquiries += a.inquiries_count || 0;
          });
        }
      }

      // Transform data
      const transformed: CompanyListing[] = (data || []).map((item: any) => ({
        ...item,
        bedrooms: item.number_of_bedrooms,
        bathrooms: item.number_of_bathrooms,
        size: item.area_size ? `${item.area_size} ${item.area_unit || 'sqft'}` : "N/A",
        location: item.address || item.city || "Unknown Location",
        price: item.price ? `${item.currency || 'AED'} ${Number(item.price).toLocaleString()}` : "Price on request",
        refNumber: item.reference_number,
        agent: item.agents || null,
        views: analyticsMap[item.id]?.views || 0,
        inquiries: analyticsMap[item.id]?.inquiries || 0,
      }));

      setListings(transformed);

      // Calculate stats
      const uniqueAgentIds = new Set(
        transformed
          .filter((l) => l.assigned_agent_id)
          .map((l) => l.assigned_agent_id)
      );

      setStats({
        total: transformed.length,
        active: transformed.filter(
          (l) => l.status === "active" || l.status === "published"
        ).length,
        totalViews: transformed.reduce((sum, l) => sum + l.views, 0),
        totalInquiries: transformed.reduce((sum, l) => sum + l.inquiries, 0),
        uniqueAgents: uniqueAgentIds.size,
      });
    } catch (err: any) {
      console.error("Error fetching company listings:", err);
      setError(err.message);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Keep ref updated
  useEffect(() => {
    fetchListingsRef.current = fetchListings;
  }, [fetchListings]);

  useEffect(() => {
    fetchListings();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("company-listings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
        },
        (payload) => {
          console.log("Company listing change:", payload);
          // Refetch to get updated data with joins
          if (fetchListingsRef.current) {
            fetchListingsRef.current();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchListings]); // Added fetchListings for initial fetch, but use ref in callback

  const refetch = () => {
    fetchListings();
  };

  return { listings, stats, isLoading, error, refetch };
}
