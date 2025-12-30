import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

// Fetch full lead details from Meta Graph API
async function fetchLeadDetails(leadgenId: string, pageAccessToken: string): Promise<any> {
  try {
    const url = `https://graph.facebook.com/v24.0/${leadgenId}?access_token=${pageAccessToken}`;
    console.log(`Fetching lead details for ${leadgenId}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`Graph API error for lead ${leadgenId}:`, data.error);
      return null;
    }

    console.log(`Lead details fetched:`, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error(`Error fetching lead ${leadgenId}:`, error);
    return null;
  }
}

// Parse lead field data from Graph API response
function parseLeadFields(fieldData: any[]): {
  name: string;
  phone: string;
  email: string;
  otherFields: Record<string, string>;
} {
  let name = "";
  let phone = "";
  let email = "";
  const otherFields: Record<string, string> = {};
  let firstName = "";
  let lastName = "";

  for (const field of fieldData || []) {
    const fieldName = field.name?.toLowerCase() || "";
    const value = field.values?.[0] || "";

    if (fieldName === "full_name" || fieldName === "name") {
      name = value;
    } else if (fieldName === "first_name") {
      firstName = value;
    } else if (fieldName === "last_name") {
      lastName = value;
    } else if (fieldName === "phone_number" || fieldName === "phone") {
      phone = value;
    } else if (fieldName === "email") {
      email = value;
    } else {
      otherFields[fieldName] = value;
    }
  }

  // Combine first/last name if full_name not provided
  if (!name && (firstName || lastName)) {
    name = `${firstName} ${lastName}`.trim();
  }

  return { name, phone, email, otherFields };
}

serve(async (req) => {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ✅ WEBHOOK VERIFICATION (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("📋 Webhook verification request:", { mode, token: token ? "***" : "missing", challenge });

    // Accept any verify token for now, or use a specific one
    // You should set this in Facebook App settings
    const expectedToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "Bloch@741";

    if (mode === "subscribe" && token === expectedToken) {
      console.log("✅ Verification successful, returning challenge");
      return new Response(challenge, {
        status: 200,
        headers: corsHeaders,
      });
    }

    console.log("❌ Verification failed - token mismatch or invalid mode");
    return new Response("Verification failed", {
      status: 403,
      headers: corsHeaders,
    });
  }

  // ✅ LEAD DATA (POST)
  if (req.method === "POST") {
    const startTime = Date.now();

    try {
      const body = await req.json();
      console.log("📥 Incoming Meta Lead Webhook:", JSON.stringify(body, null, 2));

      // Immediately return 200 to acknowledge receipt (Facebook requires this within 20 seconds)
      // We'll process in the background

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Parse Meta Lead Ads format
      if (body.entry && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          const pageId = entry.id;
          const changes = entry.changes || [];

          for (const change of changes) {
            if (change.field === "leadgen") {
              const leadData = change.value;

              const leadgenId = leadData.leadgen_id;
              const formId = leadData.form_id;
              const adId = leadData.ad_id;
              // Use current time if created_time is in the future (test webhooks use fake timestamps)
              const now = new Date();
              let createdTime = now.toISOString();
              if (leadData.created_time) {
                const parsedTime = new Date(leadData.created_time * 1000);
                // Only use Facebook's time if it's not in the future
                if (parsedTime <= now) {
                  createdTime = parsedTime.toISOString();
                }
              }

              console.log(`🔔 New lead received: ${leadgenId} from page ${pageId}`);

              // Check if we already processed this lead
              const { data: existingLead } = await supabase
                .from("leads")
                .select("id")
                .eq("external_id", leadgenId)
                .maybeSingle();

              if (existingLead) {
                console.log(`⏭️ Lead ${leadgenId} already exists (${existingLead.id}), skipping`);
                continue;
              }

              // Find company with this Meta page connected
              const { data: leadSource, error: sourceError } = await supabase
                .from("lead_sources")
                .select("id, company_id, connection_details")
                .eq("source_name", "meta")
                .eq("status", "connected")
                .single();

              if (sourceError || !leadSource) {
                console.error("❌ No active Meta lead source found:", sourceError);
                continue;
              }

              const companyId = leadSource.company_id;
              const connectionDetails = leadSource.connection_details as any;

              // Find the page access token
              let pageAccessToken = connectionDetails?.access_token;
              const pages = connectionDetails?.pages || [];

              // Try to find specific page token
              const matchingPage = pages.find((p: any) => p.id === pageId);
              if (matchingPage?.access_token) {
                pageAccessToken = matchingPage.access_token;
              }

              if (!pageAccessToken) {
                console.error("❌ No page access token found for page:", pageId);
                continue;
              }

              // Fetch full lead details from Graph API
              const fullLeadData = await fetchLeadDetails(leadgenId, pageAccessToken);

              let leadName = `Meta Lead ${leadgenId.slice(-6)}`;
              let leadPhone = null;
              let leadEmail = null;
              let sourceMetadata: Record<string, any> = {
                form_id: formId,
                page_id: pageId,
                ad_id: adId,
                leadgen_id: leadgenId,
                received_at: createdTime,
              };

              if (fullLeadData) {
                const parsed = parseLeadFields(fullLeadData.field_data);
                leadName = parsed.name || leadName;
                leadPhone = parsed.phone || null;
                leadEmail = parsed.email || null;
                sourceMetadata = {
                  ...sourceMetadata,
                  ...parsed.otherFields,
                  form_name: fullLeadData.form_name,
                  campaign_name: fullLeadData.campaign_name,
                  ad_name: fullLeadData.ad_name,
                  adset_name: fullLeadData.adset_name,
                  platform: fullLeadData.platform,
                };
              }

              // Find or create 'New' stage for this company
              let { data: newStage } = await supabase
                .from("lead_stages")
                .select("id, name")
                .eq("company_id", companyId)
                .eq("name", "New")
                .maybeSingle();

              if (!newStage) {
                const { data: defaultStage } = await supabase
                  .from("lead_stages")
                  .select("id, name")
                  .eq("company_id", companyId)
                  .eq("is_default", true)
                  .maybeSingle();
                newStage = defaultStage;
              }

              // Prepare lead record
              const leadRecord = {
                company_id: companyId,
                external_id: leadgenId,
                source: "Meta",
                stage: newStage?.name || "New",
                stage_id: newStage?.id || null,
                is_new: true,
                received_at: createdTime,
                created_at: createdTime,
                name: leadName,
                phone: leadPhone,
                email: leadEmail,
                source_metadata: sourceMetadata,
              };

              console.log("📝 Inserting lead:", JSON.stringify(leadRecord));

              // Insert the lead
              const { data: insertedLead, error: insertError } = await supabase
                .from("leads")
                .insert(leadRecord)
                .select()
                .single();

              if (insertError) {
                console.error("❌ Error inserting lead:", insertError);

                // Log the error for debugging
                try {
                  await supabase.from("lead_activities").insert({
                    lead_id: null,
                    company_id: companyId,
                    type: "error",
                    description: `Failed to insert Meta lead: ${insertError.message}`,
                    metadata: {
                      error: insertError,
                      leadgen_id: leadgenId,
                      lead_data: leadRecord,
                    },
                  });
                } catch (logError) {
                  console.error("Failed to log error:", logError);
                }
              } else {
                console.log("✅ Lead inserted successfully:", insertedLead.id);

                // Log activity for lead creation
                try {
                  await supabase.from("lead_activities").insert({
                    lead_id: insertedLead.id,
                    company_id: companyId,
                    type: "created",
                    description: `Lead received from Meta Lead Ads`,
                    metadata: {
                      source: "Meta",
                      form_id: formId,
                      page_id: pageId,
                      received_at: createdTime,
                      processing_time_ms: Date.now() - startTime,
                    },
                  });
                } catch (activityError) {
                  console.error("Failed to log activity:", activityError);
                }

                // Update lead source stats
                try {
                  await supabase
                    .from("lead_sources")
                    .update({
                      last_fetched_at: new Date().toISOString(),
                      total_leads_fetched: (leadSource as any).total_leads_fetched + 1,
                    })
                    .eq("id", leadSource.id);
                } catch (statsError) {
                  console.error("Failed to update source stats:", statsError);
                }
              }
            }
          }
        }
      }

      console.log(`✅ Webhook processed in ${Date.now() - startTime}ms`);
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("❌ Error processing POST body:", error);
      // Always return 200 to prevent Facebook from retrying
      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: corsHeaders,
      });
    }
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: corsHeaders,
  });
});
