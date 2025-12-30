import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PortalAccount {
  id: string;
  company_id: string;
  portal_id: string;
  account_name: string;
  credentials: Record<string, unknown>;
  status: "connected" | "disconnected" | "error";
  auto_publish: boolean;
  sync_schedule: "realtime" | "hourly" | "daily";
  last_sync_at: string | null;
  last_error_message: string | null;
  listings_count: number;
  created_at: string;
  updated_at: string;
  portal?: {
    id: string;
    name: string;
    display_name: string | null;
    logo_url: string | null;
    base_url: string | null;
    country: string | null;
  };
}

export interface PortalWithAccount {
  id: string;
  name: string;
  display_name: string | null;
  logo_url: string | null;
  base_url: string | null;
  country: string | null;
  is_active: boolean;
  // Account connection info
  connected: boolean;
  account_id: string | null;
  status: "connected" | "disconnected" | "error";
  auto_publish: boolean;
  sync_schedule: "realtime" | "hourly" | "daily";
  last_sync_at: string | null;
  last_error_message: string | null;
  listings_count: number;
  integration_type: "api_key" | "api_key_secret" | "oauth2" | "webhook" | "credentials";
}

export function usePortalAccounts() {
  const [portals, setPortals] = useState<PortalWithAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortalsWithAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get company ID from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPortals([]);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      const companyId = profile?.company_id;

      // Fetch all active portals
      const { data: portalsData, error: portalsError } = await supabase
        .from("portals")
        .select("id, name, display_name, logo_url, base_url, country, is_active")
        .eq("is_active", true)
        .order("name");

      if (portalsError) throw portalsError;

      // Fetch portal accounts for the company
      let accountsData: Record<string, unknown>[] = [];
      if (companyId) {
        const { data: accounts } = await supabase
          .from("portal_accounts")
          .select("*")
          .eq("company_id", companyId);
        accountsData = accounts || [];
      }

      // Count active publications per portal
      let publicationsCount: Record<string, number> = {};
      if (companyId) {
        const { data: publications } = await supabase
          .from("portal_listing_publications")
          .select("portal_id")
          .eq("company_id", companyId)
          .eq("is_deleted", false)
          .in("status", ["live", "approved", "queued"]);

        if (publications) {
          publicationsCount = publications.reduce((acc, pub) => {
            acc[pub.portal_id] = (acc[pub.portal_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // Merge portals with their account info
      const mergedPortals: PortalWithAccount[] = (portalsData || []).map((portal) => {
        const account = accountsData.find((a) => a.portal_id === portal.id) as Record<string, unknown> | undefined;
        const isConnected = account?.status === "connected";

        // Determine integration type based on portal name (can be enhanced with portal_rules)
        let integrationType: PortalWithAccount["integration_type"] = "api_key";
        const portalName = portal.name.toLowerCase();
        if (portalName.includes("property finder") || portalName.includes("booking") || portalName.includes("bayut") || portalName.includes("dubizzle")) {
          integrationType = "api_key_secret";
        } else if (portalName.includes("airbnb")) {
          integrationType = "oauth2";
        } else if (portalName.includes("website") || portalName.includes("wordpress")) {
          integrationType = "webhook";
        } else if (portalName.includes("qatar")) {
          integrationType = "credentials";
        }

        return {
          id: portal.id,
          name: portal.name,
          display_name: portal.display_name,
          logo_url: portal.logo_url,
          base_url: portal.base_url,
          country: portal.country,
          is_active: portal.is_active,
          connected: isConnected,
          account_id: account?.id as string | null,
          status: (account?.status as PortalWithAccount["status"]) || "disconnected",
          auto_publish: (account?.auto_publish as boolean) ?? false,
          sync_schedule: (account?.sync_schedule as PortalWithAccount["sync_schedule"]) || "daily",
          last_sync_at: account?.last_sync_at as string | null,
          last_error_message: account?.last_error_message as string | null,
          listings_count: publicationsCount[portal.id] || 0,
          integration_type: integrationType,
        };
      });

      setPortals(mergedPortals);
    } catch (err: unknown) {
      console.error("Error fetching portal accounts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortalsWithAccounts();
  }, [fetchPortalsWithAccounts]);

  const connectPortal = async (
    portalId: string,
    credentials: Record<string, string>,
    settings: { autoPublish: boolean; syncSchedule: "realtime" | "hourly" | "daily" }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      // Check if account already exists
      const { data: existing } = await supabase
        .from("portal_accounts")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("portal_id", portalId)
        .single();

      if (existing) {
        // Update existing account
        const updateData: any = {
          status: "connected",
          auto_publish: settings.autoPublish,
          sync_schedule: settings.syncSchedule,
          updated_at: new Date().toISOString(),
        };

        // Only update credentials if provided
        if (credentials && Object.keys(credentials).length > 0) {
          updateData.credentials = credentials;
        }

        const { error } = await supabase
          .from("portal_accounts")
          .update(updateData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new account
        if (!credentials || Object.keys(credentials).length === 0) {
          throw new Error("Credentials required for new connection");
        }

        const { error } = await supabase
          .from("portal_accounts")
          .insert({
            company_id: profile.company_id,
            portal_id: portalId,
            account_name: "Default",
            credentials,
            status: "connected",
            auto_publish: settings.autoPublish,
            sync_schedule: settings.syncSchedule,
          });

        if (error) throw error;
      }

      await fetchPortalsWithAccounts();
      toast.success("Portal connected successfully");
    } catch (err: unknown) {
      console.error("Error connecting portal:", err);
      const message = err instanceof Error ? err.message : "Failed to connect portal";
      toast.error(message);
      throw err;
    }
  };

  const disconnectPortal = async (portalId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      const { error } = await supabase
        .from("portal_accounts")
        .update({
          status: "disconnected",
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", profile.company_id)
        .eq("portal_id", portalId);

      if (error) throw error;

      await fetchPortalsWithAccounts();
      toast.success("Portal disconnected");
    } catch (err: unknown) {
      console.error("Error disconnecting portal:", err);
      const message = err instanceof Error ? err.message : "Failed to disconnect portal";
      toast.error(message);
      throw err;
    }
  };

  const updatePortalSettings = async (
    portalId: string,
    settings: { autoPublish?: boolean; syncSchedule?: "realtime" | "hourly" | "daily" }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      const { error } = await supabase
        .from("portal_accounts")
        .update({
          ...(settings.autoPublish !== undefined && { auto_publish: settings.autoPublish }),
          ...(settings.syncSchedule && { sync_schedule: settings.syncSchedule }),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", profile.company_id)
        .eq("portal_id", portalId);

      if (error) throw error;

      await fetchPortalsWithAccounts();
    } catch (err: unknown) {
      console.error("Error updating portal settings:", err);
      const message = err instanceof Error ? err.message : "Failed to update settings";
      toast.error(message);
      throw err;
    }
  };

  const syncPortal = async (portalId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("No company found");

      // Update last sync time
      await supabase
        .from("portal_accounts")
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", profile.company_id)
        .eq("portal_id", portalId);

      await fetchPortalsWithAccounts();
      toast.success("Sync completed successfully");
    } catch (err: unknown) {
      console.error("Error syncing portal:", err);
      const message = err instanceof Error ? err.message : "Failed to sync";
      toast.error(message);
      throw err;
    }
  };

  return {
    portals,
    isLoading,
    error,
    refetch: fetchPortalsWithAccounts,
    connectPortal,
    disconnectPortal,
    updatePortalSettings,
    syncPortal,
  };
}
