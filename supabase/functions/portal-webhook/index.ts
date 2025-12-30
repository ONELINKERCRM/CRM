import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-portal-secret, x-webhook-secret, x-pf-signature',
};

// ============================================
// PORTAL WEBHOOK RECEIVER - ONELINKER CRM
// ============================================

interface PortalLead {
  portal_lead_id: string;
  portal_listing_id?: string;
  portal_agent_id?: string;
  name: string;
  phone?: string;
  email?: string;
  message?: string;
  raw_data?: Record<string, unknown>;
}

interface ListingEvent {
  portal_listing_id: string;
  event_type: string;
  reason?: string;
  payload: Record<string, unknown>;
}

interface ProcessResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================
// LEAD NORMALIZERS
// ============================================

function normalizePropertyFinderLead(data: Record<string, unknown>): PortalLead {
  const lead = (data.lead || data.enquiry || data) as Record<string, unknown>;
  return {
    portal_lead_id: String(lead.id ?? lead.enquiry_id ?? lead.lead_id ?? Date.now()),
    portal_listing_id: String(lead.listing_id ?? lead.property_id ?? lead.reference ?? ''),
    portal_agent_id: String(lead.agent_id ?? lead.broker_id ?? ''),
    name: String(lead.name ?? lead.full_name ?? lead.customer_name ?? 'Unknown'),
    phone: String(lead.phone ?? lead.mobile ?? lead.contact_number ?? ''),
    email: String(lead.email ?? lead.email_address ?? ''),
    message: String(lead.message ?? lead.enquiry_message ?? lead.comments ?? ''),
    raw_data: data,
  };
}

function normalizeBayutLead(data: Record<string, unknown>): PortalLead {
  const lead = (data.lead || data.data || data) as Record<string, unknown>;
  return {
    portal_lead_id: String(lead.id ?? lead.leadId ?? lead.enquiry_id ?? Date.now()),
    portal_listing_id: String(lead.listingId ?? lead.property_reference ?? lead.propertyId ?? ''),
    portal_agent_id: String(lead.agentId ?? lead.agent_id ?? ''),
    name: String(lead.name ?? lead.customerName ?? lead.user_name ?? 'Unknown'),
    phone: String(lead.phone ?? lead.phoneNumber ?? lead.mobile ?? ''),
    email: String(lead.email ?? lead.emailAddress ?? ''),
    message: String(lead.message ?? lead.enquiryMessage ?? lead.query ?? ''),
    raw_data: data,
  };
}

function normalizeDubizzleLead(data: Record<string, unknown>): PortalLead {
  const lead = (data.lead || data.enquiry || data) as Record<string, unknown>;
  return {
    portal_lead_id: String(lead.id ?? lead.enquiryId ?? lead.leadId ?? Date.now()),
    portal_listing_id: String(lead.adId ?? lead.listing_ref ?? lead.property_id ?? ''),
    portal_agent_id: String(lead.agentId ?? lead.agent_id ?? ''),
    name: String(lead.name ?? lead.senderName ?? lead.customer_name ?? 'Unknown'),
    phone: String(lead.phone ?? lead.senderPhone ?? lead.mobile ?? ''),
    email: String(lead.email ?? lead.senderEmail ?? ''),
    message: String(lead.message ?? lead.body ?? lead.enquiry_text ?? ''),
    raw_data: data,
  };
}

// ============================================
// LISTING EVENT NORMALIZERS
// ============================================

function normalizeListingEvent(portal: string, data: Record<string, unknown>): ListingEvent {
  const event = data.event as string || data.type as string || 'unknown';
  const listing = (data.listing || data.property || data) as Record<string, unknown>;
  
  return {
    portal_listing_id: String(listing.id ?? listing.listing_id ?? listing.reference ?? ''),
    event_type: normalizeEventType(event),
    reason: String(listing.reason ?? listing.rejection_reason ?? data.reason ?? ''),
    payload: data,
  };
}

function normalizeEventType(event: string): string {
  const eventMap: Record<string, string> = {
    'published': 'listing.published',
    'listing_published': 'listing.published',
    'created': 'listing.published',
    'updated': 'listing.updated',
    'listing_updated': 'listing.updated',
    'modified': 'listing.updated',
    'unpublished': 'listing.unpublished',
    'listing_unpublished': 'listing.unpublished',
    'removed': 'listing.unpublished',
    'deleted': 'listing.unpublished',
    'rejected': 'listing.rejected',
    'listing_rejected': 'listing.rejected',
    'sold': 'listing.sold',
    'listing_sold': 'listing.sold',
    'expired': 'listing.expired',
    'listing_expired': 'listing.expired',
    'lead': 'lead.created',
    'enquiry': 'lead.created',
    'lead_created': 'lead.created',
    'new_lead': 'lead.created',
  };
  
  return eventMap[event.toLowerCase()] || event;
}

// ============================================
// LEAD WEBHOOK PROCESSOR
// ============================================

async function processLeadWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
  portal: string,
  payload: Record<string, unknown>,
  eventId?: string
): Promise<ProcessResult> {
  try {
    // Handle batch leads
    const leadsArray = Array.isArray(payload.leads || payload.data) 
      ? (payload.leads || payload.data) as Record<string, unknown>[]
      : [payload];

    const results: Array<{ success: boolean; lead_id?: string; error?: string; status?: string }> = [];
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const leadData of leadsArray) {
      try {
        // Normalize lead based on portal
        let normalizedLead: PortalLead;
        
        switch (portal) {
          case 'property_finder':
            normalizedLead = normalizePropertyFinderLead(leadData);
            break;
          case 'bayut':
            normalizedLead = normalizeBayutLead(leadData);
            break;
          case 'dubizzle':
            normalizedLead = normalizeDubizzleLead(leadData);
            break;
          default:
            throw new Error('Unknown portal');
        }

        // Validate required fields
        if (!normalizedLead.name || normalizedLead.name === 'Unknown') {
          if (!normalizedLead.phone && !normalizedLead.email) {
            throw new Error('Missing required fields: name, phone or email');
          }
        }

        // Process using enhanced database function
        const { data: result, error: rpcError } = await supabase.rpc('process_portal_lead_v2', {
          p_company_id: companyId,
          p_portal: portal,
          p_portal_lead_id: normalizedLead.portal_lead_id,
          p_portal_listing_id: normalizedLead.portal_listing_id || null,
          p_portal_agent_id: normalizedLead.portal_agent_id || null,
          p_name: normalizedLead.name,
          p_phone: normalizedLead.phone || null,
          p_email: normalizedLead.email || null,
          p_message: normalizedLead.message || null,
          p_raw_data: normalizedLead.raw_data,
        });

        if (rpcError) {
          throw rpcError;
        }

        const resultData = result as Record<string, unknown> | null;
        if (resultData?.success) {
          if (resultData.is_duplicate) {
            duplicateCount++;
          } else {
            successCount++;
          }
          results.push({ 
            success: true, 
            lead_id: String(resultData.lead_id),
            status: String(resultData.status)
          });
        } else {
          throw new Error(String(resultData?.error || 'Unknown processing error'));
        }

      } catch (leadError) {
        errorCount++;
        const errorMessage = leadError instanceof Error ? leadError.message : 'Unknown error';
        
        // Log error
        await supabase.from('portal_import_errors').insert({
          company_id: companyId,
          portal_name: portal,
          lead_data: leadData,
          error_message: errorMessage,
          error_type: 'validation_error',
        });

        results.push({ success: false, error: errorMessage });
        console.error(`[portal-webhook] Lead error:`, errorMessage);
      }
    }

    return {
      success: errorCount === 0,
      data: {
        processed: leadsArray.length,
        imported: successCount,
        duplicates: duplicateCount,
        errors: errorCount,
        results,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Lead processing failed';
    console.error('[portal-webhook] Lead processing error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================
// LISTING WEBHOOK PROCESSOR
// ============================================

async function processListingWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
  portal: string,
  eventType: string,
  payload: Record<string, unknown>,
  eventId?: string
): Promise<ProcessResult> {
  try {
    const listingEvent = normalizeListingEvent(portal, payload);

    if (!listingEvent.portal_listing_id) {
      return { 
        success: false, 
        error: 'Missing portal_listing_id in webhook payload' 
      };
    }

    // Process using database function
    const { data: result, error: rpcError } = await supabase.rpc('process_listing_webhook_event', {
      p_company_id: companyId,
      p_portal: portal,
      p_event_type: eventType,
      p_portal_listing_id: listingEvent.portal_listing_id,
      p_payload: listingEvent.payload,
    });

    if (rpcError) {
      throw rpcError;
    }

    const resultData = result as Record<string, unknown> | null;
    
    return {
      success: resultData?.success === true,
      data: {
        event_type: eventType,
        portal_listing_id: listingEvent.portal_listing_id,
        crm_listing_id: resultData?.crm_listing_id,
        new_status: resultData?.new_status,
      },
      error: resultData?.error as string | undefined,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Listing processing failed';
    console.error('[portal-webhook] Listing processing error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const portalParam = url.searchParams.get('portal') || pathParts[pathParts.length - 1];
    const companyId = url.searchParams.get('company_id');
    const webhookSecret = req.headers.get('x-webhook-secret') || 
                          req.headers.get('x-portal-secret') || 
                          req.headers.get('x-pf-signature');
    
    // Portal name mapping
    const portalMap: Record<string, string> = {
      'property-finder': 'property_finder',
      'propertyfinder': 'property_finder',
      'pf': 'property_finder',
      'property_finder': 'property_finder',
      'bayut': 'bayut',
      'dubizzle': 'dubizzle',
    };
    
    const portalName = portalMap[portalParam?.toLowerCase() || ''];
    
    if (!portalName) {
      console.error('[portal-webhook] Invalid portal:', portalParam);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid portal. Supported: property-finder, bayut, dubizzle' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!companyId) {
      console.error('[portal-webhook] Missing company_id');
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate webhook signature
    const { data: isValid } = await supabase.rpc('validate_portal_webhook', {
      p_company_id: companyId,
      p_portal: portalName,
      p_signature: webhookSecret || '',
    });

    if (isValid === false) {
      console.error('[portal-webhook] Invalid webhook signature');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let payload: Record<string, unknown>;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (contentType.includes('form')) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    console.log(`[portal-webhook] Received ${portalName} webhook:`, JSON.stringify(payload).substring(0, 1000));

    // Determine event type
    const eventType = normalizeEventType(
      String(payload.event || payload.type || payload.event_type || 'lead.created')
    );

    // Extract IDs for logging
    const portalLeadId = String(payload.lead_id || (payload.lead as Record<string, unknown>)?.id || '');
    const portalListingId = String(payload.listing_id || (payload.listing as Record<string, unknown>)?.id || '');
    const portalAgentId = String(payload.agent_id || (payload.lead as Record<string, unknown>)?.agent_id || '');

    // Store webhook event immediately for audit trail
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    const { data: eventRecord, error: eventError } = await supabase
      .from('portal_webhook_events')
      .insert({
        company_id: companyId,
        portal: portalName,
        event_type: eventType,
        portal_lead_id: portalLeadId || null,
        portal_listing_id: portalListingId || null,
        portal_agent_id: portalAgentId || null,
        payload,
        signature: webhookSecret,
        ip_address: ipAddress,
        user_agent: userAgent,
        processed: false,
        retry_count: 0,
      })
      .select('id')
      .single();

    if (eventError) {
      console.error('[portal-webhook] Failed to store event:', eventError);
    }

    const eventId = eventRecord?.id;

    // Process based on event type
    let result: ProcessResult;

    if (eventType.startsWith('lead.')) {
      result = await processLeadWebhook(supabase, companyId, portalName, payload, eventId);
    } else if (eventType.startsWith('listing.')) {
      result = await processListingWebhook(supabase, companyId, portalName, eventType, payload, eventId);
    } else {
      // Unknown event type - just log it
      result = { success: true, data: { message: 'Event logged', event_type: eventType } };
    }

    // Mark event as processed
    if (eventId) {
      await supabase
        .from('portal_webhook_events')
        .update({
          processed: result.success,
          processed_at: new Date().toISOString(),
          processing_error: result.error || null,
          created_lead_id: result.data?.lead_id || null,
        })
        .eq('id', eventId);
    }

    // Log to portal_webhook_logs
    await supabase.from('portal_webhook_logs').insert({
      webhook_event_id: eventId,
      company_id: companyId,
      portal: portalName,
      action: eventType,
      success: result.success,
      error_message: result.error,
      processing_time_ms: Date.now() - startTime,
      details: result.data,
    });

    const response = {
      success: result.success,
      portal: portalName,
      event_type: eventType,
      event_id: eventId,
      processing_time_ms: Date.now() - startTime,
      ...(result.data || {}),
    };

    console.log(`[portal-webhook] Processed:`, response);

    // Always return 200 to acknowledge receipt (async processing model)
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[portal-webhook] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        processing_time_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
