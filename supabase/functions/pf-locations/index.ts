import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PF_API_BASE = "https://atlas.propertyfinder.com/v1";

interface LocationsRequest {
  action: "search" | "get" | "list_children";
  portal_account_id: string;
  company_id: string;
  search?: string;
  location_id?: number;
  parent_id?: number;
  page?: number;
  per_page?: number;
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

    const body: LocationsRequest = await req.json();
    const { action, portal_account_id, company_id, search, location_id, parent_id, page = 1, per_page = 50 } = body;

    console.log(`[pf-locations] Action: ${action}, Search: ${search}, User: ${user.id}`);

    // Verify agent and company access
    const { data: agent } = await supabase
      .from("agents")
      .select("id, company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!agent || agent.company_id !== company_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
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

    // Get access token
    const accessToken = await getAccessToken(supabase, portalAccount);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to get Property Finder access token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let apiUrl = `${PF_API_BASE}/locations`;
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("perPage", per_page.toString());

    if (action === "search" && search) {
      params.set("search", search);
    } else if (action === "get" && location_id) {
      apiUrl = `${PF_API_BASE}/locations/${location_id}`;
    } else if (action === "list_children" && parent_id) {
      params.set("filter[parent]", parent_id.toString());
    }

    const fullUrl = action === "get" ? apiUrl : `${apiUrl}?${params.toString()}`;

    console.log(`[pf-locations] Calling: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[pf-locations] API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Property Finder API error: ${response.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
      );
    }

    const data = await response.json();

    // Format locations for easier use
    const locations = action === "get" 
      ? [formatLocation(data)]
      : (data.data || []).map(formatLocation);

    return new Response(
      JSON.stringify({ 
        success: true, 
        locations,
        pagination: data.meta || data.pagination || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-locations] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function formatLocation(loc: Record<string, unknown>): Record<string, unknown> {
  return {
    id: loc.id,
    name: loc.name,
    full_name: loc.fullName || loc.name,
    type: loc.type, // country, city, community, sub-community, building
    parent_id: loc.parentId,
    coordinates: loc.coordinates,
    path: loc.path || loc.breadcrumb,
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
    console.error("[pf-locations] Missing API credentials");
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
      console.error("[pf-locations] Token refresh failed:", tokenResponse.status);
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
    console.error("[pf-locations] Token refresh error:", error);
    return null;
  }
}
