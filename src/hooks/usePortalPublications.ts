import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PortalPublication {
  id: string;
  listing_id: string;
  portal_id: string;
  portal_account_id: string | null;
  company_id: string;
  agent_id: string;
  portal_listing_id: string | null;
  portal_url: string | null;
  portal_title: string;
  portal_description: string | null;
  portal_price: number | null;
  portal_currency: string;
  portal_images: string[];
  portal_metadata: Record<string, unknown>;
  status: string;
  last_error_message: string | null;
  validation_errors: string[];
  queued_at: string | null;
  sent_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  last_synced_at: string | null;
  unpublished_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  portal?: Portal;
  agent?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Portal {
  id: string;
  name: string;
  display_name: string | null;
  logo_url: string | null;
  base_url: string | null;
  is_active: boolean;
  country: string | null;
}

export interface PortalRules {
  id: string;
  portal_id: string;
  required_fields: string[];
  min_images: number;
  max_images: number;
  min_description_length: number | null;
  max_description_length: number | null;
  allowed_property_types: string[];
  allowed_purposes: string[];
}

export function usePortals() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortals = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: portalsData, error: portalsError } = await supabase
        .from("portals")
        .select("id, name, display_name, logo_url, base_url, is_active, country")
        .eq("is_active", true)
        .order("name");

      if (portalsError) throw portalsError;

      // Map database fields to Portal interface
      const mappedPortals: Portal[] = (portalsData || []).map((p) => ({
        id: p.id,
        name: p.name,
        display_name: p.display_name,
        logo_url: p.logo_url,
        base_url: p.base_url,
        is_active: p.is_active,
        country: p.country,
      }));

      setPortals(mappedPortals);
    } catch (err: unknown) {
      console.error("Error fetching portals:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortals();
  }, [fetchPortals]);

  return { portals, isLoading, error, refetch: fetchPortals };
}

export function useListingPublications(listingId: string | undefined) {
  const [publications, setPublications] = useState<PortalPublication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublications = useCallback(async () => {
    if (!listingId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("portal_listing_publications")
        .select(`
          *,
          portals (id, name, display_name, logo_url),
          agents (id, name, email)
        `)
        .eq("listing_id", listingId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const mapped: PortalPublication[] = (data || []).map((pub: Record<string, unknown>) => ({
        id: pub.id as string,
        listing_id: pub.listing_id as string,
        portal_id: pub.portal_id as string,
        portal_account_id: pub.portal_account_id as string | null,
        company_id: pub.company_id as string,
        agent_id: pub.agent_id as string,
        portal_listing_id: pub.portal_listing_id as string | null,
        portal_url: pub.portal_url as string | null,
        portal_title: pub.portal_title as string,
        portal_description: pub.portal_description as string | null,
        portal_price: pub.portal_price as number | null,
        portal_currency: (pub.portal_currency as string) || "AED",
        portal_images: (pub.portal_images as string[]) || [],
        portal_metadata: (pub.portal_metadata as Record<string, unknown>) || {},
        status: pub.status as string,
        last_error_message: pub.last_error_message as string | null,
        validation_errors: (pub.validation_errors as string[]) || [],
        queued_at: pub.queued_at as string | null,
        sent_at: pub.sent_at as string | null,
        published_at: pub.published_at as string | null,
        expires_at: pub.expires_at as string | null,
        last_synced_at: pub.last_synced_at as string | null,
        unpublished_at: pub.unpublished_at as string | null,
        created_at: pub.created_at as string,
        updated_at: pub.updated_at as string,
        is_deleted: pub.is_deleted as boolean,
        portal: pub.portals ? {
          id: (pub.portals as Record<string, unknown>).id as string,
          name: (pub.portals as Record<string, unknown>).name as string,
          display_name: (pub.portals as Record<string, unknown>).display_name as string | null,
          logo_url: (pub.portals as Record<string, unknown>).logo_url as string | null,
          base_url: null,
          is_active: true,
          country: null,
        } : undefined,
        agent: pub.agents ? {
          id: (pub.agents as Record<string, unknown>).id as string,
          name: (pub.agents as Record<string, unknown>).name as string,
          email: (pub.agents as Record<string, unknown>).email as string,
        } : undefined,
      }));

      setPublications(mapped);
    } catch (err: unknown) {
      console.error("Error fetching publications:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchPublications();

    // Subscribe to realtime updates
    if (listingId) {
      const channel = supabase
        .channel(`publications-${listingId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "portal_listing_publications",
            filter: `listing_id=eq.${listingId}`,
          },
          () => {
            fetchPublications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [listingId, fetchPublications]);

  return { publications, isLoading, error, refetch: fetchPublications };
}

export function usePublishToPortal() {
  const [isPublishing, setIsPublishing] = useState(false);

  const publishToPortal = async (params: {
    listingId: string;
    portalId: string;
    agentId: string;
    companyId: string;
    portalAccountId?: string;
    customizations?: {
      title?: string;
      description?: string;
      price?: number;
      currency?: string;
      images?: string[];
    };
  }) => {
    setIsPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-publish", {
        body: {
          action: "publish",
          listing_id: params.listingId,
          portal_id: params.portalId,
          agent_id: params.agentId,
          company_id: params.companyId,
          portal_account_id: params.portalAccountId,
          customizations: params.customizations,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to publish");
      }

      toast.success("Listing queued for publication");
      return data;
    } catch (err: unknown) {
      console.error("Error publishing to portal:", err);
      const message = err instanceof Error ? err.message : "Failed to publish listing";
      toast.error(message);
      throw err;
    } finally {
      setIsPublishing(false);
    }
  };

  const unpublishFromPortal = async (params: {
    listingId: string;
    portalId: string;
    companyId: string;
  }) => {
    setIsPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-publish", {
        body: {
          action: "unpublish",
          listing_id: params.listingId,
          portal_id: params.portalId,
          company_id: params.companyId,
          agent_id: "",
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to unpublish");
      }

      toast.success("Listing unpublished");
      return data;
    } catch (err: unknown) {
      console.error("Error unpublishing from portal:", err);
      const message = err instanceof Error ? err.message : "Failed to unpublish listing";
      toast.error(message);
      throw err;
    } finally {
      setIsPublishing(false);
    }
  };

  const validateForPortal = async (listingId: string, portalId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("portal-publish", {
        body: {
          action: "validate",
          listing_id: listingId,
          portal_id: portalId,
          agent_id: "",
          company_id: "",
        },
      });

      if (error) throw error;

      return data.validation;
    } catch (err: unknown) {
      console.error("Error validating listing:", err);
      const message = err instanceof Error ? err.message : "Validation error";
      return { valid: false, errors: [message] };
    }
  };

  return {
    isPublishing,
    publishToPortal,
    unpublishFromPortal,
    validateForPortal,
  };
}

export function usePublicationActivityLogs(publicationId: string | undefined) {
  const [logs, setLogs] = useState<Array<{
    id: string;
    action: string;
    old_status: string | null;
    new_status: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicationId) {
      setIsLoading(false);
      return;
    }

    const fetchLogs = async () => {
      const { data } = await supabase
        .from("publication_activity_logs")
        .select("*")
        .eq("publication_id", publicationId)
        .order("created_at", { ascending: false });

      setLogs((data || []).map((log: Record<string, unknown>) => ({
        id: log.id as string,
        action: log.action as string,
        old_status: log.old_status as string | null,
        new_status: log.new_status as string | null,
        details: log.details as Record<string, unknown> | null,
        created_at: log.created_at as string,
      })));
      setIsLoading(false);
    };

    fetchLogs();
  }, [publicationId]);

  return { logs, isLoading };
}
