import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pf-signature, x-webhook-secret",
};

// Property Finder Webhook Event Types based on actual PF API
type PFEventType = 
  | "lead-created"
  | "lead.created"
  | "lead-updated"
  | "lead.updated"
  | "lead-assigned"
  | "lead.assigned"
  | "listing.published"
  | "listing.unpublished"
  | "listing.rejected"
  | "listing.expired"
  | "publicProfile.verification.approved"
  | "publicProfile.verification.rejected";

// Contact information structure
interface PFContact {
  type: "phone" | "email" | "whatsapp";
  value: string;
}

// Sender information
interface PFSender {
  name?: string;
  contacts?: PFContact[];
}

// PF Webhook Payload matching actual API
interface PFWebhookPayload {
  id: string; // Event ID like "lead-created-12345678"
  type: string; // Event type string
  timestamp: string;
  entity: {
    id: string;
    type: "lead" | "listing" | "publicProfile";
  };
  payload: {
    // Lead payload fields
    channel?: "whatsapp" | "email" | "call" | "sms";
    status?: string;
    entityType?: "listing" | "project" | "developer";
    publicProfile?: {
      id: number;
    };
    listing?: {
      id: string;
      reference: string;
    };
    project?: {
      id: string;
    };
    developer?: {
      id: string;
    };
    responseLink?: string;
    sender?: PFSender;
    message?: string;
    // Listing payload fields
    listingId?: number;
    reference?: string;
    rejectionReason?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get company_id from query params
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      console.error("[pf-webhook] No company_id provided in webhook URL");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing company_id parameter. Add ?company_id=YOUR_COMPANY_ID to webhook URL" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get webhook secret for validation (optional but recommended)
    const signature = req.headers.get("x-pf-signature") || req.headers.get("x-webhook-secret");
    
    // Get portal account to validate secret
    const { data: portalAccount } = await supabase
      .from("portal_accounts")
      .select("id, credentials")
      .eq("company_id", companyId)
      .eq("portal_type", "property_finder")
      .single();

    if (portalAccount && signature) {
      const credentials = portalAccount.credentials as Record<string, string> | null;
      const expectedSecret = credentials?.webhook_secret;
      
      if (expectedSecret && expectedSecret !== signature) {
        console.error("[pf-webhook] Invalid webhook signature");
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Invalid webhook signature" 
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse webhook payload
    const payload: PFWebhookPayload = await req.json();
    
    // Determine event type - handle both formats: "lead-created" and "lead.created"
    const eventType = payload.type?.replace("-", ".") || payload.id?.split("-").slice(0, 2).join(".") || "unknown";
    
    console.log(`[pf-webhook] Received event: ${eventType}, entity: ${payload.entity?.type}`, JSON.stringify(payload));

    // Log the webhook event
    await supabase.from("portal_webhook_events").insert({
      company_id: companyId,
      portal_name: "property_finder",
      event_type: eventType,
      event_data: payload.payload,
      status: "processing",
      received_at: new Date().toISOString(),
    });

    let result: { success: boolean; message?: string; lead_id?: string; duplicate?: boolean };

    // Route based on event type
    const normalizedEvent = eventType.replace("-", ".");
    
    if (normalizedEvent === "lead.created") {
      result = await handleLeadCreated(supabase, companyId, portalAccount?.id, payload);
    } else if (normalizedEvent === "lead.updated") {
      result = await handleLeadUpdated(supabase, companyId, payload);
    } else if (normalizedEvent === "lead.assigned") {
      result = await handleLeadAssigned(supabase, companyId, payload);
    } else if (normalizedEvent === "listing.published") {
      result = await handleListingPublished(supabase, companyId, payload);
    } else if (normalizedEvent === "listing.unpublished") {
      result = await handleListingUnpublished(supabase, companyId, payload);
    } else if (normalizedEvent === "listing.rejected") {
      result = await handleListingRejected(supabase, companyId, payload);
    } else if (normalizedEvent === "listing.expired") {
      result = await handleListingExpired(supabase, companyId, payload);
    } else {
      console.log(`[pf-webhook] Unhandled event type: ${eventType}`);
      result = { success: true, message: `Event ${eventType} acknowledged but not processed` };
    }

    // Update webhook event status
    await supabase.from("portal_webhook_logs").insert({
      company_id: companyId,
      portal_name: "property_finder",
      event_type: eventType,
      status: result.success ? "success" : "failed",
      request_payload: payload,
      response_payload: result,
      processing_time_ms: Date.now() - startTime,
    });

    const statusCode = result.duplicate ? 200 : (result.success ? 201 : 500);

    return new Response(JSON.stringify({
      ...result,
      processing_time_ms: Date.now() - startTime
    }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[pf-webhook] Error:", errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      processing_time_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleLeadCreated(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  portalAccountId: string | undefined,
  payload: PFWebhookPayload
): Promise<{ success: boolean; message?: string; lead_id?: string; duplicate?: boolean }> {
  const { payload: data, entity, id: webhookEventId } = payload;
  
  const pfLeadId = entity?.id || webhookEventId;
  const listing = data.listing;
  const sender = data.sender;
  
  // Extract contact info from sender.contacts array
  const contacts = sender?.contacts || [];
  const phoneContact = contacts.find(c => c.type === "phone" || c.type === "whatsapp");
  const emailContact = contacts.find(c => c.type === "email");
  
  const contactName = sender?.name;
  const contactPhone = phoneContact?.value;
  const contactEmail = emailContact?.value;

  console.log(`[pf-webhook] Processing lead: ${pfLeadId}, listing: ${listing?.id}, reference: ${listing?.reference}, channel: ${data.channel}`);

  // Check for duplicate lead
  if (pfLeadId) {
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .eq("pf_lead_id", pfLeadId)
      .single();

    if (existingLead) {
      console.log(`[pf-webhook] Duplicate lead: ${pfLeadId}`);
      return { success: true, lead_id: existingLead.id, duplicate: true };
    }
  }

  // Find listing by portal_listing_id or reference
  let listingData: Record<string, unknown> | null = null;
  let assignedAgentId: string | null = null;

  if (listing) {
    // Try to find by PF listing ID or reference
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
      .eq("company_id", companyId)
      .or(`pf_listing_id.eq.${listing.id},pf_reference.eq.${listing.reference}`)
      .single();

    if (publication) {
      // deno-lint-ignore no-explicit-any
      listingData = (publication as any).listings;
      assignedAgentId = listingData?.assigned_agent_id as string;
    }
  }

  // If no listing found via publication, try matching by public profile
  if (!listingData && data.publicProfile?.id) {
    // Try to find agent by PF public profile ID
    const { data: agentMapping } = await supabase
      .from("portal_agents")
      .select("agent_id")
      .eq("company_id", companyId)
      .eq("portal_agent_id", data.publicProfile.id.toString())
      .eq("portal_name", "property_finder")
      .single();

    if (agentMapping) {
      assignedAgentId = agentMapping.agent_id;
    }
  }

  if (!listingData && !assignedAgentId) {
    console.warn(`[pf-webhook] Listing not found for lead: ${pfLeadId}`);
    
    // Log as import error for manual review
    await supabase.from("portal_import_errors").insert({
      company_id: companyId,
      portal_name: "property_finder",
      lead_data: payload.payload,
      error_message: "Listing not found in CRM",
      error_type: "listing_not_found",
    });
  }

  // Get default stage
  const { data: defaultStage } = await supabase
    .from("lead_stages")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_default", true)
    .single();

  // Normalize phone number
  const normalizedPhone = normalizePhone(contactPhone);

  // Create the lead
  const { data: newLead, error: leadError } = await supabase
    .from("leads")
    .insert({
      company_id: companyId,
      name: contactName || "Property Finder Lead",
      email: contactEmail,
      phone: contactPhone,
      normalized_phone: normalizedPhone,
      message: data.message,
      source: "Property Finder",
      pf_lead_id: pfLeadId,
      portal_listing_id: listing?.id?.toString(),
      is_pf_lead: true,
      assigned_agent_id: assignedAgentId,
      assignment_source: assignedAgentId ? "listing_agent" : null,
      assignment_reason: assignedAgentId ? "Assigned to listing agent from Property Finder lead" : null,
      stage_id: defaultStage?.id,
      stage: "New",
      source_metadata: {
        portal: "property_finder",
        portal_lead_id: pfLeadId,
        portal_listing_id: listing?.id,
        portal_listing_reference: listing?.reference,
        listing_title: listingData?.title,
        response_link: data.responseLink,
        channel: data.channel,
        public_profile_id: data.publicProfile?.id,
        project_id: data.project?.id,
        developer_id: data.developer?.id,
        entity_type: data.entityType,
        received_at: new Date().toISOString(),
        webhook_event: payload.type,
        webhook_timestamp: payload.timestamp,
      },
      fetched_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (leadError) {
    console.error(`[pf-webhook] Failed to create lead:`, leadError);
    
    await supabase.from("portal_import_errors").insert({
      company_id: companyId,
      portal_name: "property_finder",
      lead_data: payload.payload,
      error_message: leadError.message,
      error_type: "insert_failed",
    });

    return { success: false, message: leadError.message };
  }

  // Create activity log
  const channelLabel = data.channel ? ` via ${data.channel}` : "";
  await supabase.from("lead_activities").insert({
    lead_id: newLead.id,
    company_id: companyId,
    type: "created",
    title: "Lead from Property Finder",
    description: listingData 
      ? `New inquiry${channelLabel} for "${listingData.title}" received from Property Finder`
      : `New inquiry${channelLabel} received from Property Finder`,
    agent_name: "Property Finder",
    agent_id: assignedAgentId,
  });

  // Create assignment notification if agent is assigned
  if (assignedAgentId) {
    await supabase.from("assignment_notifications").insert({
      company_id: companyId,
      agent_id: assignedAgentId,
      lead_id: newLead.id,
      notification_type: "assignment",
      title: "New Property Finder Lead",
      message: `You have a new inquiry${channelLabel} from ${contactName || 'a customer'}${listingData ? ` for "${listingData.title}"` : ''}`,
    });
  }

  console.log(`[pf-webhook] Lead created: ${newLead.id}`);
  return { success: true, lead_id: newLead.id };
}

async function handleLeadUpdated(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  payload: PFWebhookPayload
): Promise<{ success: boolean; message?: string; lead_id?: string }> {
  const { payload: data, entity } = payload;
  const pfLeadId = entity?.id;
  
  console.log(`[pf-webhook] Processing lead update: ${pfLeadId}`);

  // Find existing lead by PF lead ID
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, name, email, phone")
    .eq("company_id", companyId)
    .eq("pf_lead_id", pfLeadId)
    .single();

  if (!existingLead) {
    console.warn(`[pf-webhook] Lead not found for update: ${pfLeadId}`);
    return { success: false, message: "Lead not found" };
  }

  // Extract updated contact info
  const sender = data.sender;
  const contacts = sender?.contacts || [];
  const phoneContact = contacts.find(c => c.type === "phone" || c.type === "whatsapp");
  const emailContact = contacts.find(c => c.type === "email");

  // Build update object - only update fields that have new values
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (sender?.name && sender.name !== existingLead.name) {
    updates.name = sender.name;
  }
  if (emailContact?.value && emailContact.value !== existingLead.email) {
    updates.email = emailContact.value;
  }
  if (phoneContact?.value && phoneContact.value !== existingLead.phone) {
    updates.phone = phoneContact.value;
    updates.normalized_phone = normalizePhone(phoneContact.value);
  }

  // Update lead
  const { error: updateError } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", existingLead.id);

  if (updateError) {
    console.error(`[pf-webhook] Failed to update lead:`, updateError);
    return { success: false, message: updateError.message };
  }

  // Log the update activity
  await supabase.from("lead_activities").insert({
    lead_id: existingLead.id,
    company_id: companyId,
    type: "updated",
    title: "Lead Updated from Property Finder",
    description: "Lead information was updated via Property Finder webhook",
    agent_name: "Property Finder",
  });

  console.log(`[pf-webhook] Lead updated: ${existingLead.id}`);
  return { success: true, lead_id: existingLead.id };
}

async function handleLeadAssigned(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  payload: PFWebhookPayload
): Promise<{ success: boolean; message?: string; lead_id?: string }> {
  const { payload: data, entity } = payload;
  const pfLeadId = entity?.id;
  const publicProfileId = data.publicProfile?.id;
  
  console.log(`[pf-webhook] Processing lead assignment: ${pfLeadId}, publicProfile: ${publicProfileId}`);

  // Find existing lead by PF lead ID
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, assigned_agent_id")
    .eq("company_id", companyId)
    .eq("pf_lead_id", pfLeadId)
    .single();

  if (!existingLead) {
    console.warn(`[pf-webhook] Lead not found for assignment: ${pfLeadId}`);
    return { success: false, message: "Lead not found" };
  }

  // Find agent by PF public profile ID
  let newAgentId: string | null = null;
  
  if (publicProfileId) {
    const { data: agentMapping } = await supabase
      .from("portal_agents")
      .select("agent_id")
      .eq("company_id", companyId)
      .eq("portal_agent_id", publicProfileId.toString())
      .eq("portal_name", "property_finder")
      .single();

    if (agentMapping) {
      newAgentId = agentMapping.agent_id;
    }
  }

  if (!newAgentId) {
    console.warn(`[pf-webhook] No agent mapping found for publicProfile: ${publicProfileId}`);
    
    // Log for manual review
    await supabase.from("portal_import_errors").insert({
      company_id: companyId,
      portal_name: "property_finder",
      lead_data: payload.payload,
      error_message: `No agent mapping for Property Finder publicProfile ${publicProfileId}`,
      error_type: "agent_mapping_not_found",
    });
    
    return { success: true, message: "Lead assignment acknowledged but no agent mapping found" };
  }

  // Skip if same agent
  if (existingLead.assigned_agent_id === newAgentId) {
    console.log(`[pf-webhook] Lead already assigned to same agent`);
    return { success: true, lead_id: existingLead.id, message: "Already assigned to this agent" };
  }

  const previousAgentId = existingLead.assigned_agent_id;

  // Update lead assignment
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      assigned_agent_id: newAgentId,
      assignment_source: "property_finder",
      assignment_reason: "Reassigned via Property Finder webhook",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingLead.id);

  if (updateError) {
    console.error(`[pf-webhook] Failed to assign lead:`, updateError);
    return { success: false, message: updateError.message };
  }

  // Log the assignment activity
  await supabase.from("lead_activities").insert({
    lead_id: existingLead.id,
    company_id: companyId,
    type: "assigned",
    title: "Lead Reassigned from Property Finder",
    description: `Lead was reassigned via Property Finder`,
    agent_id: newAgentId,
    agent_name: "Property Finder",
  });

  // Create assignment notification for new agent
  await supabase.from("assignment_notifications").insert({
    company_id: companyId,
    agent_id: newAgentId,
    lead_id: existingLead.id,
    notification_type: "assignment",
    title: "Lead Assigned from Property Finder",
    message: "A lead has been assigned to you via Property Finder",
  });

  console.log(`[pf-webhook] Lead assigned: ${existingLead.id} -> agent ${newAgentId}`);
  return { success: true, lead_id: existingLead.id };
}

async function handleListingPublished(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  payload: PFWebhookPayload
): Promise<{ success: boolean; message?: string }> {
  const { payload: data, entity } = payload;
  const pfListingId = data.listingId || entity?.id;
  const reference = data.reference;

  console.log(`[pf-webhook] Listing published: ${pfListingId}, reference: ${reference}`);

  // Update the publication status
  const { error } = await supabase
    .from("portal_listing_publications")
    .update({
      status: "live",
      published_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      last_error_message: null,
      last_error_details: null,
    })
    .eq("company_id", companyId)
    .or(`pf_listing_id.eq.${pfListingId},pf_reference.eq.${reference}`);

  if (error) {
    console.error("[pf-webhook] Failed to update listing status:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Listing marked as published" };
}

async function handleListingUnpublished(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  payload: PFWebhookPayload
): Promise<{ success: boolean; message?: string }> {
  const { payload: data, entity } = payload;
  const pfListingId = data.listingId || entity?.id;
  const reference = data.reference;

  console.log(`[pf-webhook] Listing unpublished: ${pfListingId}`);

  const { error } = await supabase
    .from("portal_listing_publications")
    .update({
      status: "unpublished",
      unpublished_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .or(`pf_listing_id.eq.${pfListingId},pf_reference.eq.${reference}`);

  if (error) {
    console.error("[pf-webhook] Failed to update listing status:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Listing marked as unpublished" };
}

async function handleListingRejected(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  payload: PFWebhookPayload
): Promise<{ success: boolean; message?: string }> {
  const { payload: data, entity } = payload;
  const pfListingId = data.listingId || entity?.id;
  const reference = data.reference;
  const rejectionReason = data.rejectionReason || data.status;

  console.log(`[pf-webhook] Listing rejected: ${pfListingId}, reason: ${rejectionReason}`);

  const { error } = await supabase
    .from("portal_listing_publications")
    .update({
      status: "rejected",
      last_synced_at: new Date().toISOString(),
      last_error_message: rejectionReason || "Listing rejected by Property Finder",
      last_error_details: payload.payload,
    })
    .eq("company_id", companyId)
    .or(`pf_listing_id.eq.${pfListingId},pf_reference.eq.${reference}`);

  if (error) {
    console.error("[pf-webhook] Failed to update listing status:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Listing marked as rejected" };
}

async function handleListingExpired(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
  payload: PFWebhookPayload
): Promise<{ success: boolean; message?: string }> {
  const { payload: data, entity } = payload;
  const pfListingId = data.listingId || entity?.id;
  const reference = data.reference;

  console.log(`[pf-webhook] Listing expired: ${pfListingId}`);

  const { error } = await supabase
    .from("portal_listing_publications")
    .update({
      status: "expired",
      last_synced_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .or(`pf_listing_id.eq.${pfListingId},pf_reference.eq.${reference}`);

  if (error) {
    console.error("[pf-webhook] Failed to update listing status:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Listing marked as expired" };
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  
  let cleaned = phone.replace(/[^0-9+]/g, "");
  
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.substring(2);
  }
  
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  
  return cleaned.length >= 8 ? cleaned : null;
}
