import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ListingDetail {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  price: number | null;
  currency: string;
  address: string | null;
  city: string | null;
  country: string | null;
  number_of_bedrooms: number | null;
  number_of_bathrooms: number | null;
  area_size: number | null;
  area_unit: string | null;
  property_type: string | null;
  listing_type: string | null;
  status: string;
  furnished: string | null;
  completion_status: string | null;
  permit_number: string | null;
  reference_number: string | null;
  rent_frequency: string | null;
  developer: string | null;
  project_name: string | null;
  building_name: string | null;
  handover_date: string | null;
  floor_number: number | null;
  parking_spaces: number | null;
  latitude: number | null;
  longitude: number | null;
  plot_size: number | null;
  virtual_tour_url: string | null;
  view_type: string | null;
  ownership_type: string | null;
  service_charge: number | null;
  videos: any[];
  images: string[];
  amenities: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  assigned_agent_id: string | null;
  agent: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  views: number;
  inquiries: number;
  portals: Array<{
    portal_name: string;
    publish_status: string;
    last_sync_at: string | null;
  }>;
}

export function useListing(id: string | undefined) {
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch listing with agent info
      const { data, error: fetchError } = await supabase
        .from("listings")
        .select(`
          *,
          agents!listings_assigned_agent_id_fkey (
            id,
            name,
            email,
            phone,
            avatar_url,
            user_id
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Listing not found");
        setListing(null);
        setIsLoading(false);
        return;
      }

      // Fetch profile name and avatar if agent has user_id
      let agentDisplayName = data.agents?.name || null;
      let agentAvatarUrl = data.agents?.avatar_url || null;
      if (data.agents?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("id", data.agents.user_id)
          .single();

        if (profile) {
          if (profile.first_name || profile.last_name) {
            agentDisplayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
          }
          if (profile.avatar_url) {
            agentAvatarUrl = profile.avatar_url;
          }
        }
      }

      // Fetch analytics
      const { data: analytics } = await supabase
        .from("listing_analytics")
        .select("views_count, inquiries_count")
        .eq("listing_id", id);

      // Fetch portal statuses
      const { data: portals } = await supabase
        .from("listing_portals")
        .select("portal_name, publish_status, last_sync_at")
        .eq("listing_id", id);

      const totalViews = analytics?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;
      const totalInquiries = analytics?.reduce((sum, a) => sum + (a.inquiries_count || 0), 0) || 0;

      setListing({
        ...data,
        rent_frequency: data.rent_frequency || null,
        developer: data.developer || null,
        project_name: data.project_name || null,
        building_name: data.building_name || null,
        handover_date: data.handover_date || null,
        floor_number: data.floor_number || null,
        parking_spaces: data.parking_spaces || null,
        latitude: data.latitude,
        longitude: data.longitude,
        plot_size: data.plot_size,
        virtual_tour_url: data.virtual_tour_url,
        view_type: data.view_type,
        ownership_type: data.ownership_type,
        service_charge: data.service_charge,
        videos: Array.isArray(data.videos) ? data.videos : [],
        images: Array.isArray(data.images) ? data.images as string[] : [],
        amenities: Array.isArray(data.amenities) ? data.amenities as string[] : [],
        tags: Array.isArray(data.tags) ? data.tags as string[] : [],
        agent: data.agents ? {
          ...data.agents,
          name: agentDisplayName || data.agents.name,
          avatar_url: agentAvatarUrl || data.agents.avatar_url,
        } : null,
        views: totalViews,
        inquiries: totalInquiries,
        portals: portals || [],
      } as ListingDetail);
    } catch (err: any) {
      console.error("Error fetching listing:", err);
      setError(err.message);
      setListing(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  return { listing, isLoading, error, refetch: fetchListing };
}
