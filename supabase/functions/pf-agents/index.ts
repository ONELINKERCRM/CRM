import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PF_API_BASE = "https://atlas.propertyfinder.com/v1";

interface AgentsRequest {
  action: "list" | "get" | "map" | "unmap";
  portal_account_id: string;
  company_id: string;
  // For list/search
  email?: string;
  status?: "active" | "inactive" | "pending";
  page?: number;
  per_page?: number;
  // For get
  pf_user_id?: number;
  // For map/unmap
  agent_id?: string;
  portal_agent_id?: string;
  portal_public_profile_id?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const body: AgentsRequest = await req.json();
    const { action, portal_account_id, company_id, email, status, page = 1, per_page = 50, pf_user_id, agent_id, portal_agent_id, portal_public_profile_id } = body;

    console.log(`[pf-agents] Action: ${action}, User: ${user.id}`);

    // Verify agent and company access - must be admin or manager
    const { data: agent } = await supabase
      .from("agents")
      .select("id, company_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!agent || agent.company_id !== company_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // For map/unmap actions, require admin/manager role
    if ((action === "map" || action === "unmap") && agent.role !== "admin" && agent.role !== "manager") {
      return new Response(
        JSON.stringify({ success: false, error: "Only admins and managers can manage agent mappings" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get portal account
    const { data: portalAccount, error: portalError } = await supabase
      .from("portal_accounts")
      .select("*")
      .eq("id", portal_account_id)
      .eq("company_id", company_id)
      .single();

    if (portalError || !portalAccount) {
      return new Response(
        JSON.stringify({ success: false, error: "Portal account not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (action === "map") {
      return await handleMapAgent(supabase, company_id, portal_account_id, agent_id!, portal_agent_id!, portal_public_profile_id);
    }

    if (action === "unmap") {
      return await handleUnmapAgent(supabase, company_id, portal_account_id, agent_id!);
    }

    // For list and get actions, need to call PF API
    const accessToken = await getAccessToken(supabase, portalAccount);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to get Property Finder access token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (action === "list") {
      return await handleListAgents(accessToken, email, status, page, per_page);
    }

    if (action === "get" && pf_user_id) {
      return await handleGetAgent(accessToken, pf_user_id);
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("[pf-agents] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function handleListAgents(
  accessToken: string,
  email?: string,
  status?: string,
  page: number = 1,
  perPage: number = 50
): Promise<Response> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("perPage", perPage.toString());
  
  if (email) params.set("email", email);
  if (status) params.set("status", status);

  try {
    const response = await fetch(`${PF_API_BASE}/users?${params.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[pf-agents] API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Property Finder API error: ${response.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
      );
    }

    const data = await response.json();
    const agents = (data.data || data || []).map(formatAgent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        agents,
        pagination: data.meta || data.pagination || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[pf-agents] List agents error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch agents" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function handleGetAgent(accessToken: string, pfUserId: number): Promise<Response> {
  try {
    const response = await fetch(`${PF_API_BASE}/users/${pfUserId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `User not found: ${response.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, agent: formatAgent(data) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[pf-agents] Get agent error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch agent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function handleMapAgent(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  portalAccountId: string,
  agentId: string,
  portalAgentId: string,
  portalPublicProfileId?: number
): Promise<Response> {
  // Get CRM agent details
  const { data: crmAgent } = await supabase
    .from("agents")
    .select("id, name, email")
    .eq("id", agentId)
    .single();

  if (!crmAgent) {
    return new Response(
      JSON.stringify({ success: false, error: "CRM agent not found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
    );
  }

  // Upsert the mapping
  const { data: mapping, error } = await supabase
    .from("pf_agent_mappings")
    .upsert({
      company_id: companyId,
      portal_account_id: portalAccountId,
      agent_id: agentId,
      portal_agent_id: portalAgentId,
      portal_public_profile_id: portalPublicProfileId || parseInt(portalAgentId),
      agent_email: crmAgent.email,
      agent_name: crmAgent.name,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { 
      onConflict: "portal_account_id,agent_id",
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (error) {
    console.error("[pf-agents] Map agent error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ success: true, mapping }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleUnmapAgent(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  portalAccountId: string,
  agentId: string
): Promise<Response> {
  const { error } = await supabase
    .from("pf_agent_mappings")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("portal_account_id", portalAccountId)
    .eq("agent_id", agentId);

  if (error) {
    console.error("[pf-agents] Unmap agent error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: "Agent unmapped successfully" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function formatAgent(agent: Record<string, unknown>): Record<string, unknown> {
  const publicProfile = agent.publicProfile as Record<string, unknown> | undefined;
  
  return {
    id: agent.id,
    email: agent.email,
    first_name: agent.firstName,
    last_name: agent.lastName,
    full_name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
    mobile: agent.mobile,
    status: agent.status,
    role_id: agent.roleId,
    public_profile: publicProfile ? {
      id: publicProfile.id,
      name: publicProfile.name,
      email: publicProfile.email,
      phone: publicProfile.phone,
      image_url: publicProfile.imageUrl,
    } : null,
    created_at: agent.createdAt,
  };
}

async function getAccessToken(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  portalAccount: Record<string, unknown>
): Promise<string | null> {
  const tokenExpiresAt = portalAccount.token_expires_at as string | null;
  const accessToken = portalAccount.access_token_encrypted as string | null;

  if (accessToken && tokenExpiresAt) {
    const expiryDate = new Date(tokenExpiresAt);
    const bufferTime = new Date(Date.now() + 5 * 60 * 1000);
    
    if (expiryDate > bufferTime) {
      return accessToken;
    }
  }

  const credentials = portalAccount.credentials as Record<string, string> | null;
  const apiKey = credentials?.api_key || portalAccount.api_key_encrypted as string;
  const apiSecret = credentials?.api_secret || portalAccount.api_secret_encrypted as string;

  if (!apiKey || !apiSecret) {
    console.error("[pf-agents] Missing API credentials");
    return null;
  }

  try {
    const tokenResponse = await fetch(`${PF_API_BASE}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ apiKey, apiSecret }),
    });

    if (!tokenResponse.ok) {
      console.error("[pf-agents] Token refresh failed:", tokenResponse.status);
      return null;
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.accessToken;
    const expiresIn = tokenData.expiresIn || 1800;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await supabase
      .from("portal_accounts")
      .update({
        access_token_encrypted: newAccessToken,
        token_expires_at: newExpiresAt,
        status: "connected",
        last_health_check_at: new Date().toISOString(),
      })
      .eq("id", portalAccount.id);

    return newAccessToken;
  } catch (error) {
    console.error("[pf-agents] Token refresh error:", error);
    return null;
  }
}
