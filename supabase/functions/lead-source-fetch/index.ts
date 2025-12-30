import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PF_API_BASE = 'https://atlas.propertyfinder.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const startTime = Date.now()

  try {
    const { source_id, company_id, action } = await req.json()

    if (!source_id || !company_id) {
      return new Response(JSON.stringify({ error: 'Missing source_id or company_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get source configuration
    const { data: source, error: sourceError } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('id', source_id)
      .eq('company_id', company_id)
      .single()

    if (sourceError || !source) {
      return new Response(JSON.stringify({ error: 'Source not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle test connection
    if (action === 'test') {
      const testResult = await testConnection(source, company_id)
      
      // Try to log activity
      try {
        await supabase.rpc('log_lead_source_activity', {
          p_source_id: source_id,
          p_company_id: company_id,
          p_action: 'connection_test',
          p_status: testResult.success ? 'success' : 'failed',
          p_error_message: testResult.error || null,
          p_duration_ms: Date.now() - startTime
        })
      } catch (logError) {
        console.log('Activity logging not available:', logError)
      }

      if (testResult.success) {
        await supabase
          .from('lead_sources')
          .update({ status: 'connected', last_error: null })
          .eq('id', source_id)
      } else {
        await supabase
          .from('lead_sources')
          .update({ status: 'error', last_error: testResult.error })
          .eq('id', source_id)
      }

      return new Response(JSON.stringify(testResult), {
        status: testResult.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle manual fetch
    if (action === 'fetch') {
      const fetchResult = await fetchLeads(source, supabase)

      // Try to log activity
      try {
        await supabase.rpc('log_lead_source_activity', {
          p_source_id: source_id,
          p_company_id: company_id,
          p_action: 'fetch',
          p_status: fetchResult.success ? 'success' : 'failed',
          p_leads_processed: fetchResult.processed || 0,
          p_leads_created: fetchResult.created || 0,
          p_leads_skipped: fetchResult.skipped || 0,
          p_error_message: fetchResult.error || null,
          p_duration_ms: Date.now() - startTime
        })
      } catch (logError) {
        console.log('Activity logging not available:', logError)
      }

      if (fetchResult.success) {
        await supabase
          .from('lead_sources')
          .update({ 
            last_fetched_at: new Date().toISOString(),
            last_error: null 
          })
          .eq('id', source_id)
      }

      return new Response(JSON.stringify(fetchResult), {
        status: fetchResult.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Lead source fetch error:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Get Property Finder OAuth token
async function getPropertyFinderToken(apiKey: string, apiSecret: string): Promise<{ token: string | null; error?: string }> {
  try {
    console.log('Getting Property Finder token...')
    const response = await fetch(`${PF_API_BASE}/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiKey: apiKey,
        apiSecret: apiSecret
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token error response:', errorText)
      if (response.status === 401) {
        return { token: null, error: 'Invalid API Key or Secret. Please check your credentials in PF Expert dashboard.' }
      }
      if (response.status === 429) {
        return { token: null, error: 'Rate limit exceeded. Please try again later.' }
      }
      return { token: null, error: `Authentication failed: ${response.status} ${response.statusText}` }
    }

    const data = await response.json()
    console.log('Token obtained successfully')
    return { token: data.accessToken }
  } catch (error) {
    console.error('Token fetch error:', error)
    return { token: null, error: `Failed to authenticate: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

async function testConnection(source: any, companyId: string): Promise<{ success: boolean; error?: string; message?: string; webhook_url?: string }> {
  const connectionDetails = source.connection_details || {}
  const sourceName = source.source_name

  try {
    switch (sourceName) {
      case 'meta':
        return await testMetaConnection(connectionDetails)
      case 'tiktok':
        return await testTikTokConnection(connectionDetails)
      case 'property_finder':
        return await testPropertyFinderConnection(connectionDetails, companyId)
      case 'bayut':
      case 'dubizzle':
        return await testPropertyPortalConnection(connectionDetails, sourceName, companyId)
      case 'google_sheets':
        return await testGoogleSheetsConnection(connectionDetails)
      case 'website':
        return { success: true, message: 'Website webhook is ready to receive leads' }
      case 'linkedin':
        return await testLinkedInConnection(connectionDetails)
      default:
        return { success: true, message: 'Connection configured' }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

async function testMetaConnection(details: any): Promise<{ success: boolean; error?: string; message?: string }> {
  const { access_token, page_id } = details
  if (!access_token) {
    return { success: false, error: 'Missing access token' }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${access_token}`
    )
    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message }
    }

    return { success: true, message: `Connected to Meta as ${data.name || data.id}` }
  } catch (error) {
    return { success: false, error: 'Failed to connect to Meta API' }
  }
}

async function testTikTokConnection(details: any): Promise<{ success: boolean; error?: string; message?: string }> {
  const { access_token } = details
  if (!access_token) {
    return { success: false, error: 'Missing access token' }
  }

  return { success: true, message: 'TikTok connection configured' }
}

async function testPropertyFinderConnection(details: any, companyId: string): Promise<{ success: boolean; error?: string; message?: string; webhook_url?: string }> {
  // Support both api_secret and partner_id as field names
  const api_key = details.api_key
  const api_secret = details.api_secret || details.partner_id
  
  if (!api_key || !api_secret) {
    return { 
      success: false, 
      error: 'Missing API Key or API Secret. Get these from PF Expert → Developer Resources → API Credentials (type: API Integration).' 
    }
  }

  // Test authentication by getting a token
  const tokenResult = await getPropertyFinderToken(api_key, api_secret)
  
  if (!tokenResult.token) {
    return { 
      success: false, 
      error: tokenResult.error || 'Failed to authenticate with Property Finder' 
    }
  }

  // Test the token by fetching leads endpoint
  try {
    const response = await fetch(`${PF_API_BASE}/v1/leads?perPage=1`, {
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Token invalid or insufficient permissions to access leads.' }
      }
      return { success: false, error: `API test failed: ${response.status} ${response.statusText}` }
    }

    const webhookUrl = `https://zyqlwkkiyuqnhlvnuewk.supabase.co/functions/v1/property-finder-webhook?company_id=${companyId}`
    
    return { 
      success: true, 
      message: `Property Finder connected! You can now fetch leads. Also configure webhook in PF Expert for real-time leads.`,
      webhook_url: webhookUrl
    }
  } catch (error) {
    return { success: false, error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

async function testPropertyPortalConnection(details: any, portal: string, companyId: string): Promise<{ success: boolean; error?: string; message?: string; webhook_url?: string }> {
  const { api_key, agency_id } = details
  if (!api_key) {
    return { success: false, error: 'Missing API key' }
  }

  const webhookUrl = `https://zyqlwkkiyuqnhlvnuewk.supabase.co/functions/v1/lead-source-webhook?source=${portal}&company_id=${companyId}`

  return { 
    success: true, 
    message: `${portal} connection configured. Webhook URL: ${webhookUrl}`,
    webhook_url: webhookUrl
  }
}

async function testGoogleSheetsConnection(details: any): Promise<{ success: boolean; error?: string; message?: string }> {
  const { spreadsheet_id } = details
  if (!spreadsheet_id) {
    return { success: false, error: 'Missing spreadsheet ID' }
  }

  return { success: true, message: 'Google Sheets connection configured' }
}

async function testLinkedInConnection(details: any): Promise<{ success: boolean; error?: string; message?: string }> {
  const { access_token } = details
  if (!access_token) {
    return { success: false, error: 'Missing access token' }
  }

  return { success: true, message: 'LinkedIn connection configured' }
}

async function fetchLeads(source: any, supabase: any): Promise<{ success: boolean; processed?: number; created?: number; skipped?: number; error?: string; message?: string }> {
  const connectionDetails = source.connection_details || {}
  const sourceName = source.source_name

  try {
    let leads: any[] = []

    switch (sourceName) {
      case 'meta':
        leads = await fetchMetaLeads(connectionDetails)
        break
      case 'property_finder':
        leads = await fetchPropertyFinderLeads(connectionDetails, source.company_id)
        break
      case 'google_sheets':
        leads = await fetchGoogleSheetsLeads(connectionDetails)
        break
      case 'bayut':
      case 'dubizzle':
        // These portals use webhooks primarily
        return { 
          success: true, 
          processed: 0, 
          created: 0, 
          skipped: 0,
          message: `${sourceName} sends leads via webhook. Configure webhook URL in your portal dashboard.`
        }
      default:
        return { success: true, processed: 0, created: 0, skipped: 0 }
    }

    if (!Array.isArray(leads)) {
      return { success: false, error: 'Invalid leads data received' }
    }

    let created = 0
    let skipped = 0

    for (const lead of leads) {
      try {
        // Use database function for Property Finder leads (handles duplicates + auto-assignment)
        if (sourceName === 'property_finder' && lead.external_id) {
          const payload = {
            lead_id: lead.external_id,
            listing_id: lead.listing_id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            message: lead.message,
            ...lead.source_metadata
          }
          
          const { data: result, error: rpcError } = await supabase.rpc('process_pf_webhook', {
            p_company_id: source.company_id,
            p_payload: payload
          })
          
          if (rpcError) {
            console.error('RPC error:', rpcError)
            skipped++
          } else if (result?.success) {
            if (result.duplicate) {
              skipped++
            } else {
              created++
            }
          } else {
            console.error('Processing failed:', result?.error)
            skipped++
          }
        } else {
          // Fallback for other sources
          const { data: existing } = await supabase
            .from('leads')
            .select('id')
            .eq('company_id', source.company_id)
            .or(`pf_lead_id.eq.${lead.external_id || 'none'},phone.eq.${lead.phone || 'no-phone'}`)
            .limit(1)
            .single()

          if (existing) { skipped++; continue }

          const { data: defaultStage } = await supabase
            .from('lead_stages')
            .select('id')
            .eq('company_id', source.company_id)
            .eq('is_default', true)
            .limit(1)
            .single()

          const { error: insertError } = await supabase.from('leads').insert({
            company_id: source.company_id,
            source: sourceName,
            name: lead.name || 'Unknown',
            phone: lead.phone || null,
            email: lead.email || null,
            requirements: lead.message || null,
            source_metadata: lead.source_metadata || {},
            pf_lead_id: lead.external_id || null,
            portal_listing_id: lead.listing_id || null,
            is_pf_lead: false,
            stage_id: defaultStage?.id || null,
          })
          
          if (!insertError) { created++ } else { console.error('Insert error:', insertError); skipped++ }
        }
      } catch (insertError) {
        console.error('Error processing lead:', insertError)
        skipped++
      }
    }

    return { 
      success: true, 
      processed: leads.length, 
      created, 
      skipped,
      message: created > 0 ? `Successfully imported ${created} new leads` : 'No new leads to import'
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Fetch leads error:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

async function fetchMetaLeads(details: any): Promise<any[]> {
  const { access_token, page_id, form_id } = details
  if (!access_token || !page_id) return []

  try {
    const url = form_id 
      ? `https://graph.facebook.com/v18.0/${form_id}/leads?access_token=${access_token}`
      : `https://graph.facebook.com/v18.0/${page_id}/leadgen_forms?access_token=${access_token}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.error) throw new Error(data.error.message)

    return (data.data || []).map((item: any) => ({
      external_id: item.id,
      name: item.field_data?.find((f: any) => f.name === 'full_name')?.values?.[0] || '',
      phone: item.field_data?.find((f: any) => f.name === 'phone_number')?.values?.[0] || '',
      email: item.field_data?.find((f: any) => f.name === 'email')?.values?.[0] || '',
      source_metadata: item
    }))
  } catch (error) {
    console.error('Meta fetch error:', error)
    return []
  }
}

async function fetchPropertyFinderLeads(details: any, companyId: string): Promise<any[]> {
  // Support both api_secret and partner_id as field names
  const api_key = details.api_key
  const api_secret = details.api_secret || details.partner_id
  if (!api_key || !api_secret) {
    console.error('Missing Property Finder credentials')
    return []
  }

  try {
    // Get OAuth token
    const tokenResult = await getPropertyFinderToken(api_key, api_secret)
    if (!tokenResult.token) {
      console.error('Failed to get PF token:', tokenResult.error)
      throw new Error(tokenResult.error || 'Authentication failed')
    }

    // Calculate date range - use last 30 days to stay well within API limits
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const createdAtFrom = thirtyDaysAgo.toISOString()
    
    console.log(`Fetching PF leads from ${createdAtFrom}`)
    
    let allLeads: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= 20) { // Max 20 pages (1000 leads)
      const url = new URL(`${PF_API_BASE}/v1/leads`)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('perPage', '50')
      url.searchParams.set('createdAtFrom', createdAtFrom)
      url.searchParams.set('orderBy', 'createdAt')
      url.searchParams.set('orderDirection', 'desc')

      console.log(`Fetching PF leads page ${page}: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${tokenResult.token}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`PF API error ${response.status}:`, errorText)
        throw new Error(`Property Finder API error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`PF response page ${page}:`, JSON.stringify(data).substring(0, 500))

      const results = data.results || data.data || []
      
      if (results.length === 0) {
        hasMore = false
        break
      }

      // Map leads to our format
      for (const lead of results) {
        const senderName = lead.sender?.name || ''
        const senderContacts = lead.sender?.contacts || []
        const phone = senderContacts.find((c: any) => c.type === 'phone')?.value || ''
        const email = senderContacts.find((c: any) => c.type === 'email')?.value || ''

        allLeads.push({
          external_id: lead.id,
          name: senderName || 'Unknown',
          phone: phone,
          email: email,
          listing_id: lead.listing?.id || lead.listing?.reference || null,
          message: lead.enrichment?.message || '',
          source_metadata: lead
        })
      }

      // Check pagination
      const pagination = data.pagination
      if (pagination && pagination.page < pagination.totalPages) {
        page++
      } else {
        hasMore = false
      }
    }

    console.log(`Total PF leads fetched: ${allLeads.length}`)
    return allLeads
  } catch (error) {
    console.error('Property Finder fetch error:', error)
    throw error
  }
}

async function fetchGoogleSheetsLeads(details: any): Promise<any[]> {
  // Google Sheets API fetch would be implemented here
  return []
}
