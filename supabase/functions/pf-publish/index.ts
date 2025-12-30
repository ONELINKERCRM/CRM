import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// Property Finder Atlas API Base URL
const PF_API_BASE = "https://atlas.propertyfinder.com/v1";

interface PublishRequest {
  action: "publish" | "update" | "unpublish" | "validate" | "refresh_token" | "get_publish_price";
  listing_id: string;
  portal_account_id: string;
  company_id: string;
  customizations?: {
    title?: Record<string, string>;
    description?: Record<string, string>;
    price?: number;
    images?: string[];
  };
}

// Property Finder Atlas API Listing Payload (per official docs)
interface PFListingPayload {
  reference: string;
  publicProfileId: number;
  locationId: number;
  category: "residential" | "commercial";
  offeringType: "sale" | "rent";
  propertyType: string;
  title: { primary: string; secondary?: string };
  description: { primary: string; secondary?: string };
  price: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  plotSize?: number;
  furnished?: "furnished" | "unfurnished" | "semi-furnished";
  media?: {
    images?: Array<{ original: { url: string }; title?: string }>;
    videos?: Array<{ url: string; title?: string }>;
    floorPlans?: Array<{ url: string; title?: string }>;
  };
  amenities?: string[];
  compliance?: {
    permitNumber?: string;
    listingAdvertisementNumber?: string;
    issuingClientLicenseNumber?: string;
  };
  geoPoints?: { lat: number; lng: number };
  rentalPeriod?: "yearly" | "monthly" | "weekly" | "daily";
  parking?: number;
  completionStatus?: "ready" | "off-plan";
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

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const body: PublishRequest = await req.json();
    const { action, listing_id, portal_account_id, company_id, customizations } = body;

    console.log(`[pf-publish] Action: ${action}, Listing: ${listing_id}, User: ${user.id}`);

    // Get agent info and verify permissions
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, role, company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ success: false, error: "Agent not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Verify company match
    if (agent.company_id !== company_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Company mismatch" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .eq("company_id", company_id)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ success: false, error: "Listing not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Permission check: Agent can only publish their own listings unless admin/manager
    const isAdminOrManager = agent.role === "admin" || agent.role === "manager";
    const isOwnListing = listing.assigned_agent_id === agent.id;

    if (!isAdminOrManager && !isOwnListing) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "You can only publish your own listings. Contact an admin to publish this listing." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get portal account with credentials
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

    if (portalAccount.status !== "connected") {
      return new Response(
        JSON.stringify({ success: false, error: "Portal account is not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get agent mapping for the assigned agent
    let { data: agentMapping } = await supabase
      .from("pf_agent_mappings")
      .select("*")
      .eq("portal_account_id", portal_account_id)
      .eq("agent_id", listing.assigned_agent_id)
      .eq("is_active", true)
      .single();

    // If no mapping exists, try to auto-map by fetching PF agents and matching by email
    if (!agentMapping && action !== "validate") {
      console.log("[pf-publish] No agent mapping found, attempting auto-map...");
      agentMapping = await attemptAutoMap(supabase, portalAccount, listing.assigned_agent_id, company_id, portal_account_id);
    }

    if (action === "validate") {
      const validation = validateListing(listing, agentMapping);
      return new Response(
        JSON.stringify({ success: true, validation }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agentMapping) {
      const { data: crmAgent } = await supabase
        .from("agents")
        .select("email, name")
        .eq("id", listing.assigned_agent_id)
        .single();
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Agent "${crmAgent?.name || 'Unknown'}" (${crmAgent?.email || 'no email'}) is not mapped to Property Finder. The agent's email must match a Property Finder user, or manually map the agent in Portal Settings.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get or refresh access token
    const accessToken = await getAccessToken(supabase, portalAccount);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to get Property Finder access token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (action === "get_publish_price") {
      return await handleGetPublishPrice(supabase, listing, portalAccount, accessToken);
    }

    if (action === "publish") {
      return await handlePublish(
        supabase, listing, portalAccount, agentMapping, 
        accessToken, company_id, agent.id, customizations
      );
    }

    if (action === "update") {
      return await handleUpdate(
        supabase, listing, portalAccount, agentMapping,
        accessToken, company_id, agent.id, customizations
      );
    }

    if (action === "unpublish") {
      return await handleUnpublish(
        supabase, listing, portalAccount, accessToken, company_id, agent.id
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("[pf-publish] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function attemptAutoMap(
  supabase: AnySupabaseClient,
  portalAccount: Record<string, unknown>,
  assignedAgentId: string,
  companyId: string,
  portalAccountId: string
): Promise<Record<string, unknown> | null> {
  const { data: crmAgent } = await supabase
    .from("agents")
    .select("email, name")
    .eq("id", assignedAgentId)
    .single();

  if (!crmAgent?.email) return null;

  const tempToken = await getAccessToken(supabase, portalAccount);
  if (!tempToken) return null;

  try {
    // Fetch agents from Property Finder using email filter
    const usersResponse = await fetch(`${PF_API_BASE}/users?email=${encodeURIComponent(crmAgent.email)}&status=active`, {
      method: "GET",
      headers: { 
        "Authorization": `Bearer ${tempToken}`,
        "Accept": "application/json",
      },
    });
    
    if (!usersResponse.ok) {
      console.log("[pf-publish] Failed to fetch PF users for auto-map");
      return null;
    }
    
    const usersData = await usersResponse.json();
    const pfAgents = usersData.data || usersData || [];
    
    // Find matching PF agent by email (case-insensitive)
    const matchingPfAgent = pfAgents.find((pf: Record<string, unknown>) => 
      (pf.email as string)?.toLowerCase() === crmAgent.email.toLowerCase()
    );

    if (!matchingPfAgent) {
      console.log(`[pf-publish] No matching PF agent found for email: ${crmAgent.email}`);
      return null;
    }

    console.log(`[pf-publish] Auto-mapping agent ${crmAgent.email} to PF agent ${matchingPfAgent.id}`);
    
    // Get publicProfileId from the PF user
    const publicProfileId = matchingPfAgent.publicProfile?.id || matchingPfAgent.id;

    const { data: newMapping, error: createError } = await supabase
      .from("pf_agent_mappings")
      .insert({
        company_id: companyId,
        portal_account_id: portalAccountId,
        agent_id: assignedAgentId,
        portal_agent_id: String(matchingPfAgent.id),
        portal_public_profile_id: publicProfileId,
        agent_email: crmAgent.email,
        agent_name: crmAgent.name,
        is_active: true,
      })
      .select()
      .single();

    if (!createError && newMapping) {
      console.log("[pf-publish] Agent auto-mapped successfully");
      return newMapping;
    }
    console.error("[pf-publish] Failed to create auto-mapping:", createError);
    return null;
  } catch (err) {
    console.error("[pf-publish] Error during auto-map:", err);
    return null;
  }
}

function validateListing(
  listing: Record<string, unknown>,
  agentMapping: Record<string, unknown> | null
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields per Property Finder Atlas API
  if (!listing.title || (listing.title as string).trim() === "") {
    errors.push("Title is required");
  }
  if (!listing.description || (listing.description as string).trim() === "") {
    errors.push("Description is required");
  }
  if (!listing.price || (listing.price as number) <= 0) {
    errors.push("Price is required and must be greater than 0");
  }
  if (!listing.property_type) {
    errors.push("Property type is required");
  }
  if (!listing.listing_type) {
    errors.push("Listing type (sale/rent) is required");
  }

  // Images validation
  const images = (listing.images as string[]) || [];
  if (images.length < 1) {
    errors.push("At least 1 image is required");
  }
  if (images.length < 5) {
    warnings.push("Property Finder recommends at least 5 images for better visibility");
  }
  if (images.length > 50) {
    errors.push("Maximum 50 images allowed");
  }

  // Description length
  const description = listing.description as string || "";
  if (description.length < 100) {
    warnings.push("Description should be at least 100 characters for better SEO");
  }
  if (description.length > 10000) {
    errors.push("Description must be less than 10,000 characters");
  }

  // Permit/RERA number (required for Dubai)
  if (!listing.permit_number) {
    warnings.push("Permit/RERA number is recommended for UAE properties (required for Dubai)");
  }

  // Location validation
  if (!listing.pf_location_id && !listing.location_id) {
    warnings.push("Property Finder location ID not set. Will attempt to match by address.");
  }

  // Agent mapping
  if (!agentMapping) {
    errors.push("Assigned agent is not mapped to Property Finder");
  } else if (!agentMapping.portal_public_profile_id) {
    warnings.push("Agent's Property Finder Public Profile ID not set - will use agent ID");
  }

  return { valid: errors.length === 0, errors, warnings };
}

async function getAccessToken(
  supabase: AnySupabaseClient,
  portalAccount: Record<string, unknown>
): Promise<string | null> {
  const tokenExpiresAt = portalAccount.token_expires_at as string | null;
  const accessToken = portalAccount.access_token_encrypted as string | null;

  // Check if token is still valid (with 5 minute buffer)
  if (accessToken && tokenExpiresAt) {
    const expiryDate = new Date(tokenExpiresAt);
    const bufferTime = new Date(Date.now() + 5 * 60 * 1000);
    
    if (expiryDate > bufferTime) {
      console.log("[pf-publish] Using cached access token");
      return accessToken;
    }
  }

  // Get credentials from the credentials JSON field or individual fields
  const credentials = portalAccount.credentials as Record<string, string> | null;
  const apiKey = credentials?.api_key || portalAccount.api_key_encrypted as string;
  const apiSecret = credentials?.api_secret || portalAccount.api_secret_encrypted as string;

  if (!apiKey || !apiSecret) {
    console.error("[pf-publish] Missing API credentials in portal account");
    return null;
  }

  try {
    console.log("[pf-publish] Fetching new access token from Property Finder Atlas API...");
    
    const tokenResponse = await fetch(`${PF_API_BASE}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        apiKey,
        apiSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[pf-publish] Token refresh failed:", tokenResponse.status, errorData);
      
      await supabase
        .from("portal_accounts")
        .update({
          status: "error",
          last_error_message: `Token refresh failed: ${tokenResponse.status}`,
        })
        .eq("id", portalAccount.id);
      
      return null;
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.accessToken;
    const expiresIn = tokenData.expiresIn || 1800; // Default 30 minutes per PF docs
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log(`[pf-publish] Got new access token, expires in ${expiresIn} seconds`);

    // Update portal account with new token
    await supabase
      .from("portal_accounts")
      .update({
        access_token_encrypted: newAccessToken,
        token_expires_at: newExpiresAt,
        status: "connected",
        last_error_message: null,
        last_health_check_at: new Date().toISOString(),
      })
      .eq("id", portalAccount.id);

    return newAccessToken;
  } catch (error) {
    console.error("[pf-publish] Token refresh error:", error);
    return null;
  }
}

async function handleGetPublishPrice(
  supabase: AnySupabaseClient,
  listing: Record<string, unknown>,
  portalAccount: Record<string, unknown>,
  accessToken: string
): Promise<Response> {
  // Get existing publication to find PF listing ID
  const { data: publication } = await supabase
    .from("portal_listing_publications")
    .select("pf_listing_id")
    .eq("listing_id", listing.id)
    .eq("portal_account_id", portalAccount.id)
    .single();

  if (!publication?.pf_listing_id) {
    return new Response(
      JSON.stringify({ success: false, error: "Listing must be created first before getting publish price" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  try {
    const response = await fetch(`${PF_API_BASE}/listings/${publication.pf_listing_id}/publish/prices`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Failed to get publish price" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, prices: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[pf-publish] Get publish price error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to get publish price" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function handlePublish(
  supabase: AnySupabaseClient,
  listing: Record<string, unknown>,
  portalAccount: Record<string, unknown>,
  agentMapping: Record<string, unknown>,
  accessToken: string,
  companyId: string,
  agentId: string,
  customizations?: Record<string, unknown>
): Promise<Response> {
  const validation = validateListing(listing, agentMapping);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ success: false, error: "Validation failed", validation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  // Build Property Finder Atlas API payload
  const pfPayload = buildPFPayload(listing, agentMapping, customizations);
  
  try {
    // Step 1: Create listing in draft mode
    console.log("[pf-publish] Creating listing in draft mode...");
    const createResponse = await fetch(`${PF_API_BASE}/listings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(pfPayload),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      console.error("[pf-publish] Create listing failed:", createData);
      
      await logPublishAction(supabase, companyId, listing.id as string, portalAccount.id as string, 
        "create", false, null, pfPayload, createData, createData.message || createData.detail || "Create failed");

      await updatePublicationStatus(supabase, listing.id as string, portalAccount.id as string, 
        portalAccount.portal_id as string, companyId, agentId, "rejected", createData.message || "Create failed", createData);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: createData.message || createData.detail || "Failed to create listing",
          details: createData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const pfListingId = createData.id;
    console.log(`[pf-publish] Listing created with ID: ${pfListingId}, now publishing...`);

    // Step 2: Publish the listing
    const publishResponse = await fetch(`${PF_API_BASE}/listings/${pfListingId}/publish`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    const publishData = await publishResponse.json().catch(() => ({}));

    await logPublishAction(supabase, companyId, listing.id as string, portalAccount.id as string,
      "publish", publishResponse.ok, pfListingId, pfPayload, { create: createData, publish: publishData });

    if (!publishResponse.ok) {
      console.error("[pf-publish] Publish failed:", publishData);
      
      await updatePublicationStatus(supabase, listing.id as string, portalAccount.id as string,
        portalAccount.portal_id as string, companyId, agentId, "draft", 
        `Listing created but publish failed: ${publishData.message || publishData.detail}`, publishData, pfListingId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Listing created (ID: ${pfListingId}) but publish failed: ${publishData.message || publishData.detail}`,
          pf_listing_id: pfListingId,
          status: "draft"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Note: Per PF docs, 200 OK only confirms request received. 
    // Listing status should be verified via webhook or GET /listings/{id}
    await updatePublicationStatus(supabase, listing.id as string, portalAccount.id as string,
      portalAccount.portal_id as string, companyId, agentId, "publishing", null, null, pfListingId,
      createData.reference || listing.reference_number as string);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pf_listing_id: pfListingId,
        reference: createData.reference,
        message: "Listing submitted for publishing. Status will be confirmed via webhook.",
        note: "Per Property Finder API: 200 OK confirms request received. Subscribe to webhooks for publish confirmation."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-publish] API call error:", error);
    
    await logPublishAction(supabase, companyId, listing.id as string, portalAccount.id as string,
      "publish", false, null, pfPayload, null, error instanceof Error ? error.message : "Network error");

    return new Response(
      JSON.stringify({ success: false, error: "Failed to connect to Property Finder API" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function handleUpdate(
  supabase: AnySupabaseClient,
  listing: Record<string, unknown>,
  portalAccount: Record<string, unknown>,
  agentMapping: Record<string, unknown>,
  accessToken: string,
  companyId: string,
  agentId: string,
  customizations?: Record<string, unknown>
): Promise<Response> {
  // Get existing publication
  const { data: publication } = await supabase
    .from("portal_listing_publications")
    .select("pf_listing_id")
    .eq("listing_id", listing.id)
    .eq("portal_account_id", portalAccount.id)
    .single();

  if (!publication?.pf_listing_id) {
    return new Response(
      JSON.stringify({ success: false, error: "Listing not published yet. Please publish first." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  const pfPayload = buildPFPayload(listing, agentMapping, customizations);

  try {
    const response = await fetch(`${PF_API_BASE}/listings/${publication.pf_listing_id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(pfPayload),
    });

    const responseData = await response.json();

    await logPublishAction(supabase, companyId, listing.id as string, portalAccount.id as string,
      "update", response.ok, publication.pf_listing_id, pfPayload, responseData,
      response.ok ? null : (responseData.message || "Update failed"));

    if (!response.ok) {
      await supabase
        .from("portal_listing_publications")
        .update({
          last_error_message: responseData.message || "Update failed",
          last_error_details: responseData,
        })
        .eq("listing_id", listing.id)
        .eq("portal_account_id", portalAccount.id);

      return new Response(
        JSON.stringify({ success: false, error: responseData.message || "Update failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    await supabase
      .from("portal_listing_publications")
      .update({
        last_synced_at: new Date().toISOString(),
        last_error_message: null,
        last_error_details: null,
      })
      .eq("listing_id", listing.id)
      .eq("portal_account_id", portalAccount.id);

    return new Response(
      JSON.stringify({ success: true, message: "Listing updated on Property Finder" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-publish] Update error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to update listing" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function handleUnpublish(
  supabase: AnySupabaseClient,
  listing: Record<string, unknown>,
  portalAccount: Record<string, unknown>,
  accessToken: string,
  companyId: string,
  _agentId: string
): Promise<Response> {
  const { data: publication } = await supabase
    .from("portal_listing_publications")
    .select("pf_listing_id")
    .eq("listing_id", listing.id)
    .eq("portal_account_id", portalAccount.id)
    .single();

  if (!publication?.pf_listing_id) {
    return new Response(
      JSON.stringify({ success: false, error: "Listing not found on Property Finder" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  try {
    // Per PF docs 2025-07-21: Use POST /v1/listings/{id}/unpublish instead of DELETE
    const response = await fetch(`${PF_API_BASE}/listings/${publication.pf_listing_id}/unpublish`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    const responseData = await response.json().catch(() => ({}));

    await logPublishAction(supabase, companyId, listing.id as string, portalAccount.id as string,
      "unpublish", response.ok || response.status === 404, publication.pf_listing_id);

    if (!response.ok && response.status !== 404) {
      return new Response(
        JSON.stringify({ success: false, error: responseData.message || "Unpublish failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    await supabase
      .from("portal_listing_publications")
      .update({
        status: "unpublished",
        unpublished_at: new Date().toISOString(),
      })
      .eq("listing_id", listing.id)
      .eq("portal_account_id", portalAccount.id);

    return new Response(
      JSON.stringify({ success: true, message: "Listing unpublished from Property Finder" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-publish] Unpublish error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to unpublish listing" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

async function logPublishAction(
  supabase: AnySupabaseClient,
  companyId: string,
  listingId: string,
  portalAccountId: string,
  action: string,
  success: boolean,
  portalListingId?: string | null,
  requestPayload?: unknown,
  responsePayload?: unknown,
  errorMessage?: string | null
): Promise<void> {
  try {
    await supabase.from("portal_publish_logs").insert({
      company_id: companyId,
      listing_id: listingId,
      portal_account_id: portalAccountId,
      action,
      success,
      portal_listing_id: portalListingId,
      request_payload: requestPayload,
      response_payload: responsePayload,
      error_message: errorMessage,
    });
  } catch (e) {
    console.error("[pf-publish] Failed to log action:", e);
  }
}

async function updatePublicationStatus(
  supabase: AnySupabaseClient,
  listingId: string,
  portalAccountId: string,
  portalId: string,
  companyId: string,
  agentId: string,
  status: string,
  errorMessage?: string | null,
  errorDetails?: unknown,
  pfListingId?: string,
  pfReference?: string
): Promise<void> {
  try {
    await supabase
      .from("portal_listing_publications")
      .upsert({
        listing_id: listingId,
        portal_account_id: portalAccountId,
        portal_id: portalId,
        company_id: companyId,
        agent_id: agentId,
        status,
        pf_listing_id: pfListingId,
        pf_reference: pfReference,
        portal_listing_id: pfListingId,
        last_error_message: errorMessage,
        last_error_details: errorDetails,
        last_synced_at: new Date().toISOString(),
        ...(status === "live" ? { published_at: new Date().toISOString() } : {}),
      }, { onConflict: "listing_id,portal_id" });
  } catch (e) {
    console.error("[pf-publish] Failed to update publication status:", e);
  }
}

function buildPFPayload(
  listing: Record<string, unknown>,
  agentMapping: Record<string, unknown>,
  customizations?: Record<string, unknown>
): PFListingPayload {
  const images = (listing.images as string[]) || [];
  const videos = (listing.videos as string[]) || [];
  const amenitiesRaw = (listing.amenities as unknown[]) || [];

  // Map listing type to Property Finder offering type
  const offeringType = (listing.listing_type as string)?.toLowerCase() === "rent" ? "rent" : "sale";

  // Get property type
  const propertyType = mapPropertyType(listing.property_type as string);

  // Get category based on property type
  const category = getCategory(listing.property_type as string);

  // Handle title - support both custom objects and strings
  let title: { primary: string; secondary?: string };
  if (customizations?.title && typeof customizations.title === "object") {
    const customTitle = customizations.title as Record<string, string>;
    title = { primary: customTitle.en || customTitle.primary || listing.title as string || "" };
    if (customTitle.ar || customTitle.secondary) {
      title.secondary = customTitle.ar || customTitle.secondary;
    }
  } else {
    title = { primary: (customizations?.title as string) || (listing.title as string) || "" };
  }

  // Handle description
  let description: { primary: string; secondary?: string };
  if (customizations?.description && typeof customizations.description === "object") {
    const customDesc = customizations.description as Record<string, string>;
    description = { primary: customDesc.en || customDesc.primary || listing.description as string || "" };
    if (customDesc.ar || customDesc.secondary) {
      description.secondary = customDesc.ar || customDesc.secondary;
    }
  } else {
    description = { primary: (customizations?.description as string) || (listing.description as string) || "" };
  }

  // Get publicProfileId from agent mapping
  const publicProfileId = parseInt(agentMapping.portal_public_profile_id as string) || 
                          parseInt(agentMapping.portal_agent_id as string);

  // Get location ID - prefer pf_location_id if set
  const locationId = listing.pf_location_id as number || listing.location_id as number || 0;

  // Normalize amenities to PF format
  const allowedAmenities = getAllowedPfAmenities(category);
  const normalizedAmenities = amenitiesRaw
    .map((a) => {
      if (typeof a === "string") return a;
      if (a && typeof a === "object" && "name" in a && typeof (a as Record<string, unknown>).name === "string") {
        return (a as Record<string, unknown>).name as string;
      }
      return "";
    })
    .map(normalizeAmenitySlug)
    .filter(Boolean)
    .filter((slug, idx, arr) => arr.indexOf(slug) === idx)
    .filter((slug) => allowedAmenities.has(slug));

  const payload: PFListingPayload = {
    reference: (listing.reference_number as string) || (listing.id as string),
    publicProfileId,
    locationId,
    category,
    offeringType,
    propertyType,
    title,
    description,
    price: (customizations?.price as number) || (listing.price as number),
    currency: (listing.currency as string) || "AED",
    bedrooms: listing.number_of_bedrooms as number,
    bathrooms: listing.number_of_bathrooms as number,
    size: listing.area_size as number,
    furnished: mapFurnished(listing.furnished as string),
    parking: listing.parking_spaces as number,
  };

  // Add media
  if (images.length > 0) {
    payload.media = {
      images: images.map((url, index) => ({
        original: { url },
        title: `Photo ${index + 1}`,
      })),
    };
  }
  if (videos.length > 0) {
    if (!payload.media) payload.media = {};
    payload.media.videos = videos.map((url, index) => ({
      url,
      title: `Video ${index + 1}`,
    }));
  }

  // Add amenities if any valid ones
  if (normalizedAmenities.length > 0) {
    payload.amenities = normalizedAmenities;
  }

  // Add compliance info (required for Dubai)
  if (listing.permit_number || listing.rera_number || listing.company_license) {
    payload.compliance = {};
    if (listing.permit_number || listing.rera_number) {
      payload.compliance.listingAdvertisementNumber = (listing.rera_number as string) || (listing.permit_number as string);
    }
    if (listing.company_license) {
      payload.compliance.issuingClientLicenseNumber = listing.company_license as string;
    }
  }

  // Add geo coordinates if available
  if (listing.latitude && listing.longitude) {
    payload.geoPoints = {
      lat: listing.latitude as number,
      lng: listing.longitude as number,
    };
  }

  // Add rental period for rent listings
  if (offeringType === "rent") {
    payload.rentalPeriod = (listing.rental_period as "yearly" | "monthly" | "weekly" | "daily") || "yearly";
  }

  // Add plot size for land
  if (listing.plot_size) {
    payload.plotSize = listing.plot_size as number;
  }

  // Add completion status
  if (listing.completion_status) {
    payload.completionStatus = listing.completion_status as "ready" | "off-plan";
  }

  return payload;
}

function getCategory(propertyType: string): "residential" | "commercial" {
  const commercialTypes = [
    "office", "shop", "warehouse", "factory", "showroom", "retail",
    "labor-camp", "staff-accommodation", "business-center", "co-working-space",
    "commercial-building", "commercial-floor", "commercial-plot"
  ];
  return commercialTypes.includes(propertyType?.toLowerCase()) ? "commercial" : "residential";
}

function mapFurnished(furnished: string): "furnished" | "unfurnished" | "semi-furnished" | undefined {
  if (!furnished) return undefined;
  const lower = furnished.toLowerCase();
  if (lower === "furnished" || lower === "yes") return "furnished";
  if (lower === "unfurnished" || lower === "no") return "unfurnished";
  if (lower.includes("semi") || lower.includes("partial")) return "semi-furnished";
  return undefined;
}

function getAllowedPfAmenities(category: "residential" | "commercial"): Set<string> {
  // Per Property Finder API docs - different amenities allowed per category
  if (category === "commercial") {
    return new Set([
      "shared-gym", "covered-parking", "networked", "shared-pool",
      "dining-in-building", "conference-room", "lobby-in-building", "vastu-compliant"
    ]);
  }
  // Residential
  return new Set([
    "central-ac", "built-in-wardrobes", "kitchen-appliances", "security",
    "concierge", "maid-service", "balcony", "private-gym", "shared-gym",
    "private-jacuzzi", "shared-spa", "covered-parking", "maids-room",
    "study", "childrens-play-area", "pets-allowed", "barbecue-area",
    "shared-pool", "childrens-pool", "private-garden", "private-pool",
    "view-of-water", "view-of-landmark", "walk-in-closet", "lobby-in-building"
  ]);
}

function normalizeAmenitySlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapPropertyType(type: string): string {
  // Property Finder uses slug-style property types
  const typeMap: Record<string, string> = {
    apartment: "apartment",
    villa: "villa",
    townhouse: "townhouse",
    penthouse: "penthouse",
    duplex: "duplex",
    "hotel apartment": "hotel-apartment",
    "residential plot": "land",
    "residential floor": "full-floor",
    office: "office-space",
    shop: "shop",
    warehouse: "warehouse",
    "labor camp": "labor-camp",
    factory: "factory",
    showroom: "show-room",
    retail: "retail",
    "commercial building": "whole-building",
    "commercial floor": "full-floor",
    "commercial plot": "land",
    land: "land",
    bungalow: "bungalow",
    compound: "compound",
    farm: "farm",
  };

  return typeMap[type?.toLowerCase()] || "apartment";
}
