import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PortalAgent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  source: "local" | "property_finder" | "bayut" | "dubizzle";
  portalAgentId?: string; // The agent ID on the portal side
  brn?: string; // Broker Registration Number
  languages?: string[];
  specializations?: string[];
}

interface PortalAgentsResponse {
  agents: PortalAgent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePortalAgents(portalId?: string): PortalAgentsResponse {
  const [agents, setAgents] = useState<PortalAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get company ID and portal account
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAgents([]);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      const companyId = profile?.company_id;
      if (!companyId) {
        setAgents([]);
        setIsLoading(false);
        return;
      }

      // First, fetch local agents
      const { data: localAgents } = await supabase
        .from("agents")
        .select("id, name, email, phone, avatar_url")
        .eq("company_id", companyId)
        .eq("status", "active");

      const mappedLocalAgents: PortalAgent[] = (localAgents || []).map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone || undefined,
        avatar: a.avatar_url || undefined,
        source: "local" as const,
      }));

      // If a portal is selected, try to fetch portal-specific agents
      if (portalId) {
        // Get portal info
        const { data: portal } = await supabase
          .from("portals")
          .select("name")
          .eq("id", portalId)
          .single();

        const portalName = portal?.name?.toLowerCase() || "";

        // Get portal account credentials
        const { data: account } = await supabase
          .from("portal_accounts")
          .select("credentials, status")
          .eq("company_id", companyId)
          .eq("portal_id", portalId)
          .eq("status", "connected")
          .single();

        if (account?.credentials) {
          // Call edge function to fetch portal agents
          const { data: portalAgentsData, error: fetchError } = await supabase.functions.invoke(
            "portal-agents-fetch",
            {
              body: {
                portal_id: portalId,
                portal_name: portalName,
                credentials: account.credentials,
                company_id: companyId,
              },
            }
          );

          if (!fetchError && portalAgentsData?.agents) {
            const portalAgents: PortalAgent[] = portalAgentsData.agents.map((a: Record<string, unknown>) => ({
              id: `portal_${a.id || a.agent_id}`,
              name: a.name || a.full_name || "Unknown Agent",
              email: a.email || "",
              phone: a.phone || a.mobile || undefined,
              avatar: a.avatar || a.photo_url || undefined,
              source: (portalName.includes("property") ? "property_finder" : 
                       portalName.includes("bayut") ? "bayut" : 
                       portalName.includes("dubizzle") ? "dubizzle" : "property_finder") as PortalAgent["source"],
              portalAgentId: String(a.id || a.agent_id),
              brn: a.brn || a.broker_registration_number || undefined,
              languages: a.languages || [],
              specializations: a.specializations || [],
            }));

            // Combine and deduplicate (prioritize portal agents by email)
            const allAgents = [...mappedLocalAgents];
            const localEmails = new Set(mappedLocalAgents.map(a => a.email.toLowerCase()));
            
            for (const portalAgent of portalAgents) {
              if (!localEmails.has(portalAgent.email.toLowerCase())) {
                allAgents.push(portalAgent);
              }
            }

            setAgents(allAgents);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fallback to local agents only
      setAgents(mappedLocalAgents);
    } catch (err) {
      console.error("Error fetching portal agents:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch agents");
    } finally {
      setIsLoading(false);
    }
  }, [portalId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    refetch: fetchAgents,
  };
}
