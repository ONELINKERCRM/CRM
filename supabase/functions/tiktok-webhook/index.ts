import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const companyId = url.searchParams.get('company_id')
  const secret = url.searchParams.get('secret')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Validate webhook
  if (!companyId) {
    console.error('Missing company_id')
    return new Response(JSON.stringify({ error: 'Missing company_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify webhook secret
  const { data: webhook } = await supabase
    .from('tiktok_webhooks')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .single()

  if (!webhook || webhook.secret_key !== secret) {
    console.error('Invalid webhook secret for company:', companyId)
    return new Response(JSON.stringify({ error: 'Invalid webhook secret' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload = await req.json()
    console.log('TikTok webhook received:', JSON.stringify(payload).substring(0, 500))

    // Store raw webhook event
    const { data: event, error: eventError } = await supabase
      .from('tiktok_webhook_events')
      .insert({
        company_id: companyId,
        event_type: payload.event || 'lead',
        payload,
        status: 'pending'
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error storing webhook event:', eventError)
    }

    // Update webhook stats
    await supabase
      .from('tiktok_webhooks')
      .update({
        events_received: (webhook.events_received || 0) + 1,
        last_event_at: new Date().toISOString()
      })
      .eq('id', webhook.id)

    // Process lead data
    const leads = parseTikTokLeads(payload)
    
    let leadsCreated = 0
    let leadsSkipped = 0

    for (const lead of leads) {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('company_id', companyId)
        .eq('external_id', lead.external_id)
        .single()

      if (existing) {
        leadsSkipped++
        continue
      }

      // Also check by phone
      if (lead.phone) {
        const { data: phoneMatch } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', companyId)
          .eq('normalized_phone', normalizePhone(lead.phone))
          .single()

        if (phoneMatch) {
          leadsSkipped++
          continue
        }
      }

      // Insert lead
      const { error: insertError } = await supabase.from('leads').insert({
        company_id: companyId,
        external_id: lead.external_id,
        name: lead.name || 'TikTok Lead',
        email: lead.email || null,
        phone: lead.phone || null,
        source: 'TikTok',
        stage: 'Uncontacted',
        source_metadata: lead.source_metadata,
        mapped_fields: lead.fields,
        fetched_at: new Date().toISOString(),
        is_opted_in: true
      })

      if (!insertError) {
        leadsCreated++
      } else {
        console.error('Error inserting lead:', insertError)
      }
    }

    // Update event status
    if (event) {
      await supabase
        .from('tiktok_webhook_events')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('id', event.id)
    }

    // Log activity
    await supabase.from('lead_source_logs').insert({
      company_id: companyId,
      action: 'webhook',
      status: 'success',
      leads_processed: leads.length,
      leads_created: leadsCreated,
      leads_skipped: leadsSkipped,
      request_data: { event_type: payload.event }
    })

    return new Response(JSON.stringify({
      success: true,
      processed: leads.length,
      created: leadsCreated,
      skipped: leadsSkipped
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('TikTok webhook error:', error)

    // Log error
    await supabase.from('lead_source_logs').insert({
      company_id: companyId,
      action: 'webhook',
      status: 'failed',
      error_message: errorMessage
    })

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Parse TikTok lead webhook payload
function parseTikTokLeads(payload: any): any[] {
  const leads: any[] = []

  // TikTok Lead Gen webhook format
  if (payload.data?.leads) {
    for (const lead of payload.data.leads) {
      const fields: Record<string, string> = {}
      
      // Parse field data
      for (const field of (lead.field_data || [])) {
        fields[field.name] = field.values?.[0] || ''
      }

      leads.push({
        external_id: lead.lead_id || lead.id,
        name: fields.full_name || fields.name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim() || 'TikTok Lead',
        email: fields.email || null,
        phone: fields.phone_number || fields.phone || null,
        fields,
        source_metadata: {
          platform: 'tiktok',
          form_id: lead.form_id,
          form_name: lead.form_name,
          ad_id: lead.ad_id,
          ad_name: lead.ad_name,
          campaign_id: lead.campaign_id,
          campaign_name: lead.campaign_name,
          adgroup_id: lead.adgroup_id,
          adgroup_name: lead.adgroup_name,
          created_time: lead.create_time,
          raw_data: lead
        }
      })
    }
  }
  // Alternative payload format
  else if (payload.leads || payload.lead) {
    const leadArray = payload.leads || [payload.lead]
    
    for (const lead of leadArray) {
      leads.push({
        external_id: lead.lead_id || lead.id || crypto.randomUUID(),
        name: lead.name || lead.full_name || 'TikTok Lead',
        email: lead.email || null,
        phone: lead.phone || lead.phone_number || null,
        fields: lead,
        source_metadata: {
          platform: 'tiktok',
          raw_data: lead
        }
      })
    }
  }
  // Generic format - try to extract lead info
  else if (payload) {
    leads.push({
      external_id: payload.lead_id || payload.id || crypto.randomUUID(),
      name: payload.name || payload.full_name || 'TikTok Lead',
      email: payload.email || null,
      phone: payload.phone || payload.phone_number || null,
      fields: payload,
      source_metadata: {
        platform: 'tiktok',
        raw_data: payload
      }
    })
  }

  return leads
}

// Normalize phone number
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  
  // Remove all non-numeric characters except + at start
  let cleaned = phone.replace(/[^0-9]/g, '')
  
  // Remove leading 00
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2)
  }
  
  // Ensure minimum length
  if (cleaned.length < 7) return null
  
  return '+' + cleaned
}