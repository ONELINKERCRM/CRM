import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PF_API_BASE = "https://api.propertyfinder.com/partner/v3";

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

interface ConnectionRequest {
  action: "connect" | "test" | "disconnect" | "sync_agents" | "health_check";
  portal_account_id?: string;
  company_id: string;
  credentials?: {
    api_key: string;
    api_secret: string;
  };
  account_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Verify admin/manager role
    const { data: agent } = await supabase
      .from("agents")
      .select("id, role, company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!agent || !["admin", "manager"].includes(agent.role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin or Manager role required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const body: ConnectionRequest = await req.json();
    const { action, portal_account_id, company_id, credentials, account_name } = body;

    if (agent.company_id !== company_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Company mismatch" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    console.log(`[pf-connection] Action: ${action}, Company: ${company_id}`);

    if (action === "connect") {
      return await handleConnect(supabase, company_id, credentials!, account_name!, agent.id);
    }

    if (action === "test") {
      return await handleTest(credentials!);
    }

    if (action === "disconnect") {
      return await handleDisconnect(supabase, portal_account_id!, company_id);
    }

    if (action === "sync_agents") {
      return await handleSyncAgents(supabase, portal_account_id!, company_id);
    }

    if (action === "health_check") {
      return await handleHealthCheck(supabase, portal_account_id!, company_id);
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("[pf-connection] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function handleTest(credentials: { api_key: string; api_secret: string }): Promise<Response> {
  try {
    const tokenResponse = await fetch(`${PF_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: credentials.api_key,
        client_secret: credentials.api_secret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[pf-connection] Test failed:", errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid API credentials. Please check your API Key and Secret." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    
    // Verify by fetching account info
    const accountResponse = await fetch(`${PF_API_BASE}/account`, {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });

    if (!accountResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify account" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const accountData = await accountResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Connection successful",
        account: {
          name: accountData.name || accountData.company_name,
          id: accountData.id,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-connection] Test error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to connect to Property Finder" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function handleConnect(
  supabase: AnySupabaseClient,
  companyId: string,
  credentials: { api_key: string; api_secret: string },
  accountName: string,
  agentId: string
): Promise<Response> {
  try {
    // First test the connection
    const tokenResponse = await fetch(`${PF_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: credentials.api_key,
        client_secret: credentials.api_secret,
      }),
    });

    if (!tokenResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid API credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Get or create Property Finder portal
    let { data: portal } = await supabase
      .from("portals")
      .select("id")
      .eq("name", "Property Finder")
      .single();

    if (!portal) {
      const { data: newPortal, error: portalError } = await supabase
        .from("portals")
        .insert({
          name: "Property Finder",
          display_name: "Property Finder",
          logo_url: "https://www.propertyfinder.ae/images/pf-logo.svg",
          base_url: "propertyfinder.ae",
          is_active: true,
        })
        .select("id")
        .single();

      if (portalError) throw portalError;
      portal = newPortal;
    }

    // Check for existing connection
    const { data: existingAccount } = await supabase
      .from("portal_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("portal_id", portal.id)
      .single();

    let accountId: string;

    if (existingAccount) {
      // Update existing
      const { error: updateError } = await supabase
        .from("portal_accounts")
        .update({
          account_name: accountName,
          api_key_encrypted: credentials.api_key,
          api_secret_encrypted: credentials.api_secret,
          access_token_encrypted: tokenData.access_token,
          token_expires_at: expiresAt,
          status: "connected",
          portal_type: "property_finder",
          last_health_check_at: new Date().toISOString(),
          last_error_message: null,
          error_message: null,
        })
        .eq("id", existingAccount.id);

      if (updateError) throw updateError;
      accountId = existingAccount.id;
    } else {
      // Create new
      const { data: newAccount, error: insertError } = await supabase
        .from("portal_accounts")
        .insert({
          company_id: companyId,
          portal_id: portal.id,
          account_name: accountName,
          api_key_encrypted: credentials.api_key,
          api_secret_encrypted: credentials.api_secret,
          access_token_encrypted: tokenData.access_token,
          token_expires_at: expiresAt,
          status: "connected",
          portal_type: "property_finder",
          credentials: {}, // Legacy field
          created_by: agentId,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      accountId = newAccount.id;
    }

    // Sync agents
    await syncAgentsFromPF(supabase, accountId, companyId, tokenData.access_token);

    return new Response(
      JSON.stringify({ 
        success: true, 
        portal_account_id: accountId,
        message: "Property Finder connected successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-connection] Connect error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to connect" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function handleDisconnect(
  supabase: AnySupabaseClient,
  portalAccountId: string,
  companyId: string
): Promise<Response> {
  try {
    // Remove agent mappings
    await supabase
      .from("pf_agent_mappings")
      .delete()
      .eq("portal_account_id", portalAccountId);

    // Update portal account status
    await supabase
      .from("portal_accounts")
      .update({
        status: "disconnected",
        access_token_encrypted: null,
        token_expires_at: null,
      })
      .eq("id", portalAccountId)
      .eq("company_id", companyId);

    return new Response(
      JSON.stringify({ success: true, message: "Disconnected from Property Finder" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-connection] Disconnect error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to disconnect" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function handleSyncAgents(
  supabase: AnySupabaseClient,
  portalAccountId: string,
  companyId: string
): Promise<Response> {
  try {
    const { data: account } = await supabase
      .from("portal_accounts")
      .select("access_token_encrypted, api_key_encrypted, api_secret_encrypted, token_expires_at")
      .eq("id", portalAccountId)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ success: false, error: "Portal account not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Refresh token if needed
    let accessToken = account.access_token_encrypted;
    if (!accessToken || (account.token_expires_at && new Date(account.token_expires_at) < new Date())) {
      const tokenResponse = await fetch(`${PF_API_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: account.api_key_encrypted,
          client_secret: account.api_secret_encrypted,
        }),
      });

      if (!tokenResponse.ok) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to refresh token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
    }

    const result = await syncAgentsFromPF(supabase, portalAccountId, companyId, accessToken);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${result.synced} agents`,
        agents: result.agents
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-connection] Sync agents error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to sync agents" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function syncAgentsFromPF(
  supabase: AnySupabaseClient,
  portalAccountId: string,
  companyId: string,
  accessToken: string
): Promise<{ synced: number; agents: Array<{ id: string; name: string; email: string }> }> {
  try {
    const agentsResponse = await fetch(`${PF_API_BASE}/agents`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!agentsResponse.ok) {
      console.error("[pf-connection] Failed to fetch agents");
      return { synced: 0, agents: [] };
    }

    const agentsData = await agentsResponse.json();
    const pfAgents = agentsData.data || agentsData.agents || [];

    // Get company agents
    const { data: companyAgents } = await supabase
      .from("agents")
      .select("id, email, name")
      .eq("company_id", companyId)
      .eq("status", "active");

    if (!companyAgents) return { synced: 0, agents: [] };

    const syncedAgents: Array<{ id: string; name: string; email: string }> = [];

    for (const pfAgent of pfAgents) {
      // Try to match by email
      const matchedAgent = companyAgents.find(
        a => a.email?.toLowerCase() === pfAgent.email?.toLowerCase()
      );

      if (matchedAgent) {
        // Upsert mapping
        await supabase
          .from("pf_agent_mappings")
          .upsert({
            company_id: companyId,
            agent_id: matchedAgent.id,
            portal_account_id: portalAccountId,
            portal_agent_id: pfAgent.id,
            agent_name: pfAgent.name,
            agent_email: pfAgent.email,
            agent_phone: pfAgent.phone,
            is_active: true,
          }, { onConflict: "company_id,agent_id,portal_account_id" });

        syncedAgents.push({
          id: matchedAgent.id,
          name: matchedAgent.name,
          email: matchedAgent.email,
        });
      }
    }

    return { synced: syncedAgents.length, agents: syncedAgents };

  } catch (error) {
    console.error("[pf-connection] Sync error:", error);
    return { synced: 0, agents: [] };
  }
}

async function handleHealthCheck(
  supabase: AnySupabaseClient,
  portalAccountId: string,
  companyId: string
): Promise<Response> {
  try {
    const { data: account } = await supabase
      .from("portal_accounts")
      .select("*")
      .eq("id", portalAccountId)
      .eq("company_id", companyId)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ success: false, error: "Portal account not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Try to get a fresh token
    const tokenResponse = await fetch(`${PF_API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: account.api_key_encrypted,
        client_secret: account.api_secret_encrypted,
      }),
    });

    const isHealthy = tokenResponse.ok;

    await supabase
      .from("portal_accounts")
      .update({
        status: isHealthy ? "connected" : "error",
        last_health_check_at: new Date().toISOString(),
        last_error_message: isHealthy ? null : "Health check failed",
      })
      .eq("id", portalAccountId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        healthy: isHealthy,
        status: isHealthy ? "connected" : "error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-connection] Health check error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Health check failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}
