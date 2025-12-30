import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-tiktok-signature',
}

interface LeadData {
  external_id?: string
  name: string
  phone?: string
  email?: string
  campaign_name?: string
  ad_set_name?: string
  ad_name?: string
  form_id?: string
  form_name?: string
  source_metadata?: Record<string, any>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const sourceType = url.searchParams.get('source') // meta, tiktok, linkedin, website, property_finder, bayut, dubizzle
  const companyId = url.searchParams.get('company_id')
  const verifyToken = url.searchParams.get('verify_token')

  // Meta webhook verification (GET request)
  if (req.method === 'GET' && sourceType === 'meta') {
    const hubMode = url.searchParams.get('hub.mode')
    const hubVerifyToken = url.searchParams.get('hub.verify_token')
    const hubChallenge = url.searchParams.get('hub.challenge')

    if (hubMode === 'subscribe' && hubVerifyToken === verifyToken) {
      console.log('Meta webhook verified successfully')
      return new Response(hubChallenge, { status: 200 })
    }
    return new Response('Verification failed', { status: 403 })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (!sourceType || !companyId) {
    return new Response(JSON.stringify({ error: 'Missing source or company_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const startTime = Date.now()
  let payload: any

  try {
    payload = await req.json()
  } catch (e) {
    console.error('Failed to parse JSON:', e)
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log(`Received ${sourceType} webhook for company ${companyId}:`, JSON.stringify(payload))

  // Get source configuration
  const { data: source, error: sourceError } = await supabase
    .from('lead_sources')
    .select('*')
    .eq('company_id', companyId)
    .eq('source_name', sourceType)
    .eq('status', 'connected')
    .single()

  if (sourceError || !source) {
    console.error('Source not found or not connected:', sourceError)
    return new Response(JSON.stringify({ error: 'Source not configured or not connected' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  let leads: LeadData[] = []
  let leadsCreated = 0
  let leadsSkipped = 0
  let leadsUpdated = 0

  try {
    // Parse leads based on source type
    switch (sourceType) {
      case 'meta':
        leads = parseMetaLeads(payload)
        break
      case 'tiktok':
        leads = parseTikTokLeads(payload)
        break
      case 'linkedin':
        leads = parseLinkedInLeads(payload)
        break
      case 'website':
        leads = parseWebsiteLeads(payload)
        break
      case 'property_finder':
        leads = parsePropertyFinderLeads(payload)
        break
      case 'bayut':
      case 'dubizzle':
        leads = parsePropertyPortalLeads(payload, sourceType)
        break
      default:
        leads = parseGenericLeads(payload)
    }

    // Process each lead
    for (const lead of leads) {
      const { data: result, error } = await supabase.rpc('insert_lead_from_source', {
        p_company_id: companyId,
        p_source_id: source.id,
        p_external_id: lead.external_id || null,
        p_name: lead.name || 'Unknown',
        p_phone: lead.phone || null,
        p_email: lead.email || null,
        p_source_metadata: lead.source_metadata || {},
        p_campaign_name: lead.campaign_name || null,
        p_ad_set_name: lead.ad_set_name || null,
        p_ad_name: lead.ad_name || null,
        p_form_id: lead.form_id || null,
        p_form_name: lead.form_name || null,
        p_duplicate_action: 'skip'
      })

      if (error) {
        console.error('Error inserting lead:', error)
        continue
      }

      if (result.action === 'created') leadsCreated++
      else if (result.action === 'skipped') leadsSkipped++
      else if (result.action === 'updated') leadsUpdated++
    }

    // Update webhook stats
    await supabase
      .from('lead_webhooks')
      .update({
        last_received_at: new Date().toISOString(),
        total_received: supabase.rpc('increment', { row_id: source.id })
      })
      .eq('source_id', source.id)

    // Log activity
    await supabase.rpc('log_lead_source_activity', {
      p_source_id: source.id,
      p_company_id: companyId,
      p_action: 'webhook_received',
      p_status: 'success',
      p_leads_processed: leads.length,
      p_leads_created: leadsCreated,
      p_leads_updated: leadsUpdated,
      p_leads_skipped: leadsSkipped,
      p_request_data: payload,
      p_duration_ms: Date.now() - startTime
    })

    return new Response(JSON.stringify({
      success: true,
      processed: leads.length,
      created: leadsCreated,
      skipped: leadsSkipped,
      updated: leadsUpdated
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook processing error:', error)

    // Log error
    await supabase.rpc('log_lead_source_activity', {
      p_source_id: source?.id,
      p_company_id: companyId,
      p_action: 'webhook_received',
      p_status: 'failed',
      p_error_message: errorMessage,
      p_request_data: payload,
      p_duration_ms: Date.now() - startTime
    })

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Meta (Facebook/Instagram) Lead Ads parser
function parseMetaLeads(payload: any): LeadData[] {
  const leads: LeadData[] = []
  
  if (payload.entry) {
    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field === 'leadgen') {
          const leadgenData = change.value
          const fieldData = leadgenData.field_data || []
          
          const lead: LeadData = {
            external_id: leadgenData.leadgen_id,
            name: '',
            phone: '',
            email: '',
            campaign_name: leadgenData.campaign_name,
            ad_set_name: leadgenData.adset_name,
            ad_name: leadgenData.ad_name,
            form_id: leadgenData.form_id,
            form_name: leadgenData.form_name,
            source_metadata: leadgenData
          }

          for (const field of fieldData) {
            const value = field.values?.[0] || ''
            switch (field.name?.toLowerCase()) {
              case 'full_name':
              case 'name':
                lead.name = value
                break
              case 'phone_number':
              case 'phone':
                lead.phone = value
                break
              case 'email':
                lead.email = value
                break
            }
          }

          if (!lead.name && fieldData.length > 0) {
            const firstName = fieldData.find((f: any) => f.name?.toLowerCase().includes('first'))?.values?.[0] || ''
            const lastName = fieldData.find((f: any) => f.name?.toLowerCase().includes('last'))?.values?.[0] || ''
            lead.name = `${firstName} ${lastName}`.trim()
          }

          leads.push(lead)
        }
      }
    }
  }

  return leads
}

// TikTok Lead Gen parser
function parseTikTokLeads(payload: any): LeadData[] {
  const leads: LeadData[] = []

  const leadData = payload.lead || payload
  
  if (Array.isArray(leadData)) {
    for (const item of leadData) {
      leads.push(parseSingleTikTokLead(item))
    }
  } else if (leadData) {
    leads.push(parseSingleTikTokLead(leadData))
  }

  return leads
}

function parseSingleTikTokLead(data: any): LeadData {
  const fieldData = data.user_info || data.form_data || {}
  
  return {
    external_id: data.lead_id || data.id,
    name: fieldData.name || fieldData.full_name || `${fieldData.first_name || ''} ${fieldData.last_name || ''}`.trim(),
    phone: fieldData.phone || fieldData.phone_number,
    email: fieldData.email,
    campaign_name: data.campaign_name,
    ad_set_name: data.adgroup_name,
    ad_name: data.ad_name,
    form_id: data.form_id,
    form_name: data.form_name,
    source_metadata: data
  }
}

// LinkedIn Lead Gen parser
function parseLinkedInLeads(payload: any): LeadData[] {
  const leads: LeadData[] = []

  const leadData = payload.lead || payload.response || payload
  
  if (Array.isArray(leadData)) {
    for (const item of leadData) {
      leads.push(parseSingleLinkedInLead(item))
    }
  } else if (leadData) {
    leads.push(parseSingleLinkedInLead(leadData))
  }

  return leads
}

function parseSingleLinkedInLead(data: any): LeadData {
  const formResponse = data.formResponse || data
  const answers = formResponse.answers || []

  const lead: LeadData = {
    external_id: data.id || formResponse.id,
    name: '',
    phone: '',
    email: '',
    campaign_name: data.campaign?.name,
    form_id: formResponse.form?.id,
    form_name: formResponse.form?.name,
    source_metadata: data
  }

  for (const answer of answers) {
    const questionId = answer.questionId?.toLowerCase() || ''
    const value = answer.answerDetails?.textQuestionAnswer?.answer || ''

    if (questionId.includes('name') || questionId.includes('fullname')) {
      lead.name = value
    } else if (questionId.includes('phone')) {
      lead.phone = value
    } else if (questionId.includes('email')) {
      lead.email = value
    }
  }

  return lead
}

// Website Form parser (generic)
function parseWebsiteLeads(payload: any): LeadData[] {
  return [{
    external_id: payload.submission_id || payload.id || `web_${Date.now()}`,
    name: payload.name || payload.full_name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
    phone: payload.phone || payload.phone_number || payload.tel,
    email: payload.email,
    campaign_name: payload.utm_campaign,
    form_id: payload.form_id,
    form_name: payload.form_name || payload.source,
    source_metadata: payload
  }]
}

// Property Finder parser
function parsePropertyFinderLeads(payload: any): LeadData[] {
  const leadInfo = payload.lead || payload.enquiry || payload

  return [{
    external_id: leadInfo.lead_id || leadInfo.enquiry_id || leadInfo.reference,
    name: leadInfo.name || leadInfo.contact_name || `${leadInfo.first_name || ''} ${leadInfo.last_name || ''}`.trim(),
    phone: leadInfo.phone || leadInfo.mobile || leadInfo.contact_phone,
    email: leadInfo.email || leadInfo.contact_email,
    campaign_name: leadInfo.property_reference,
    source_metadata: payload
  }]
}

// Bayut/Dubizzle parser
function parsePropertyPortalLeads(payload: any, portalName: string): LeadData[] {
  const leadInfo = payload.lead || payload.enquiry || payload

  return [{
    external_id: leadInfo.enquiry_id || leadInfo.lead_id || leadInfo.id,
    name: leadInfo.name || leadInfo.customer_name,
    phone: leadInfo.phone || leadInfo.mobile || leadInfo.customer_phone,
    email: leadInfo.email || leadInfo.customer_email,
    campaign_name: leadInfo.listing_id || leadInfo.property_id,
    source_metadata: { ...payload, portal: portalName }
  }]
}

// Generic parser
function parseGenericLeads(payload: any): LeadData[] {
  if (Array.isArray(payload)) {
    return payload.map(item => ({
      external_id: item.id || item.external_id,
      name: item.name || item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim(),
      phone: item.phone || item.phone_number || item.mobile,
      email: item.email,
      source_metadata: item
    }))
  }

  return [{
    external_id: payload.id || payload.external_id,
    name: payload.name || payload.full_name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
    phone: payload.phone || payload.phone_number || payload.mobile,
    email: payload.email,
    source_metadata: payload
  }]
}
