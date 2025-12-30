import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pf-signature",
};

interface PFLeadPayload {
  id: string;
  listing_id: string;
  listing_reference?: string;
  agent_id: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  created_at: string;
  source?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Property Finder sends webhook signature for verification
    const signature = req.headers.get("x-pf-signature");
    const body = await req.text();
    
    console.log(`[pf-lead-webhook] Received webhook, signature: ${signature ? "present" : "missing"}`);

    let payload: PFLeadPayload;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON payload" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`[pf-lead-webhook] Lead: ${payload.id}, Listing: ${payload.listing_id}, Agent: ${payload.agent_id}`);

    // Find the listing by portal_listing_id
    const { data: publication } = await supabase
      .from("portal_listing_publications")
      .select(`
        listing_id,
        company_id,
        portal_account_id,
        listings!inner(
          id,
          company_id,
          assigned_agent_id,
          title,
          reference_number
        )
      `)
      .or(`pf_listing_id.eq.${payload.listing_id},pf_reference.eq.${payload.listing_reference || ""}`)
      .single();

    if (!publication) {
      console.error(`[pf-lead-webhook] Listing not found: ${payload.listing_id}`);
      
      // Log the unmatched lead for manual review
      await supabase
        .from("portal_import_errors")
        .insert({
          company_id: "00000000-0000-0000-0000-000000000000", // Placeholder
          portal_name: "property_finder",
          lead_data: payload,
          error_message: "Listing not found in CRM",
          error_type: "listing_not_found",
        });

      return new Response(
        JSON.stringify({ success: false, error: "Listing not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // deno-lint-ignore no-explicit-any
    const listing = (publication as any).listings as Record<string, unknown>;
    const companyId = publication.company_id;

    // Find the agent by portal_agent_id mapping
    const { data: agentMapping } = await supabase
      .from("pf_agent_mappings")
      .select("agent_id")
      .eq("portal_account_id", publication.portal_account_id)
      .eq("portal_agent_id", payload.agent_id)
      .eq("is_active", true)
      .single();

    // Determine assigned agent: prefer mapping, fallback to listing agent
    const assignedAgentId = agentMapping?.agent_id || (listing.assigned_agent_id as string);

    if (!assignedAgentId) {
      console.error(`[pf-lead-webhook] No agent found for lead`);
      
      await supabase
        .from("portal_import_errors")
        .insert({
          company_id: companyId,
          portal_name: "property_finder",
          lead_data: payload,
          error_message: "No agent mapping found",
          error_type: "agent_not_found",
        });

      return new Response(
        JSON.stringify({ success: false, error: "Agent not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check for duplicate lead
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .eq("pf_lead_id", payload.id)
      .single();

    if (existingLead) {
      console.log(`[pf-lead-webhook] Duplicate lead: ${payload.id}`);
      return new Response(
        JSON.stringify({ success: true, lead_id: existingLead.id, duplicate: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(payload.phone);

    // Get default stage
    const { data: defaultStage } = await supabase
      .from("lead_stages")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_default", true)
      .single();

    // Create the lead with STRICT attribution
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        company_id: companyId,
        name: payload.name || "Property Finder Lead",
        email: payload.email,
        phone: payload.phone,
        normalized_phone: normalizedPhone,
        message: payload.message,
        source: "Property Finder",
        pf_lead_id: payload.id,
        portal_listing_id: payload.listing_id,
        is_pf_lead: true,
        assigned_agent_id: assignedAgentId,
        assignment_source: agentMapping ? "portal_mapping" : "listing_agent",
        assignment_reason: agentMapping 
          ? "Assigned via Property Finder agent mapping" 
          : "Assigned to listing agent",
        stage_id: defaultStage?.id,
        stage: "New",
        source_metadata: {
          portal: "property_finder",
          portal_lead_id: payload.id,
          portal_listing_id: payload.listing_id,
          portal_agent_id: payload.agent_id,
          listing_reference: listing.reference_number,
          listing_title: listing.title,
          received_at: new Date().toISOString(),
        },
        fetched_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (leadError) {
      console.error(`[pf-lead-webhook] Failed to create lead:`, leadError);
      
      await supabase
        .from("portal_import_errors")
        .insert({
          company_id: companyId,
          portal_name: "property_finder",
          lead_data: payload,
          error_message: leadError.message,
          error_type: "insert_failed",
        });

      return new Response(
        JSON.stringify({ success: false, error: "Failed to create lead" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Create activity log
    await supabase
      .from("lead_activities")
      .insert({
        lead_id: newLead.id,
        company_id: companyId,
        type: "created",
        title: "Lead from Property Finder",
        description: `New inquiry for "${listing.title}" received from Property Finder`,
        agent_name: "Property Finder",
        agent_id: assignedAgentId,
      });

    // Create assignment notification
    await supabase
      .from("assignment_notifications")
      .insert({
        company_id: companyId,
        agent_id: assignedAgentId,
        lead_id: newLead.id,
        notification_type: "assignment",
        title: "New Property Finder Lead",
        message: `You have a new inquiry from ${payload.name} for "${listing.title}"`,
      });

    console.log(`[pf-lead-webhook] Lead created: ${newLead.id}, assigned to: ${assignedAgentId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: newLead.id,
        assigned_agent_id: assignedAgentId,
        attribution: agentMapping ? "portal_mapping" : "listing_agent"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pf-lead-webhook] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^0-9+]/g, "");
  
  // Handle 00 prefix
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.substring(2);
  }
  
  // Ensure + prefix
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  
  return cleaned.length >= 8 ? cleaned : null;
}
