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

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user from auth header for protected routes
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    let companyId: string | null = null
    let userRole: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      
      if (user) {
        userId = user.id
        
        // Get user's company and role
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', userId)
          .single()
        
        companyId = profile?.company_id

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single()
        
        userRole = roleData?.role
      }
    }

    // ===========================================
    // ACTION: connect - Save TikTok credentials
    // ===========================================
    if (action === 'connect' && req.method === 'POST') {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check role - Admin/Manager only
      if (userRole !== 'admin' && userRole !== 'manager') {
        return new Response(JSON.stringify({ error: 'Forbidden - Admin/Manager only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { client_key, client_secret } = await req.json()

      // Upsert TikTok account
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .upsert({
          company_id: companyId,
          client_key: client_key || null,
          client_secret: client_secret || null,
          status: client_key && client_secret ? 'ready' : 'disconnected',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving TikTok credentials:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Log the action
      await supabase.from('lead_source_logs').insert({
        company_id: companyId,
        source_id: null,
        action: 'connect',
        status: 'success',
        request_data: { action: 'save_credentials', has_key: !!client_key, has_secret: !!client_secret }
      })

      return new Response(JSON.stringify({ 
        success: true, 
        status: data.status,
        message: client_key && client_secret ? 'Credentials saved. Ready to connect.' : 'Account created. Add credentials to continue.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ===========================================
    // ACTION: get-status - Get TikTok connection status
    // ===========================================
    if (action === 'get-status' && req.method === 'GET') {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data, error } = await supabase
        .from('tiktok_accounts')
        .select('id, status, advertiser_id, token_expires_at, created_at, updated_at')
        .eq('company_id', companyId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get webhook info
      const { data: webhook } = await supabase
        .from('tiktok_webhooks')
        .select('webhook_url, status, events_received, last_event_at')
        .eq('company_id', companyId)
        .single()

      return new Response(JSON.stringify({
        account: data || null,
        webhook: webhook || null,
        is_configured: !!data,
        is_ready: data?.status === 'ready' || data?.status === 'connected'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ===========================================
    // ACTION: authorize - Prepare OAuth redirect URL
    // ===========================================
    if (action === 'authorize' && req.method === 'GET') {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get TikTok account credentials
      const { data: account } = await supabase
        .from('tiktok_accounts')
        .select('client_key, client_secret')
        .eq('company_id', companyId)
        .single()

      if (!account?.client_key || !account?.client_secret) {
        return new Response(JSON.stringify({ 
          error: 'TikTok credentials not configured',
          message: 'Please add Client Key and Client Secret first'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Generate state for CSRF protection
      const state = crypto.randomUUID()
      
      // Store state for verification
      await supabase
        .from('tiktok_accounts')
        .update({ 
          oauth_state: state,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId)

      const redirectUri = `${SUPABASE_URL}/functions/v1/tiktok-integration?action=callback`
      
      // TikTok OAuth URL
      const authUrl = new URL('https://business-api.tiktok.com/portal/auth')
      authUrl.searchParams.set('app_id', account.client_key)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('rid', crypto.randomUUID())

      return new Response(JSON.stringify({
        auth_url: authUrl.toString(),
        redirect_uri: redirectUri
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ===========================================
    // ACTION: callback - Handle OAuth callback
    // ===========================================
    if (action === 'callback' && req.method === 'GET') {
      const auth_code = url.searchParams.get('auth_code')
      const state = url.searchParams.get('state')

      if (!auth_code || !state) {
        return new Response('Missing auth_code or state', { status: 400 })
      }

      // Find account by state
      const { data: account } = await supabase
        .from('tiktok_accounts')
        .select('*')
        .eq('oauth_state', state)
        .single()

      if (!account) {
        return new Response('Invalid state parameter', { status: 400 })
      }

      // Exchange auth code for access token
      const tokenResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: account.client_key,
          secret: account.client_secret,
          auth_code: auth_code
        })
      })

      const tokenData = await tokenResponse.json()

      if (tokenData.code !== 0) {
        console.error('TikTok OAuth error:', tokenData)
        
        await supabase.from('lead_source_logs').insert({
          company_id: account.company_id,
          action: 'oauth',
          status: 'failed',
          error_message: tokenData.message
        })

        return new Response(`OAuth failed: ${tokenData.message}`, { status: 400 })
      }

      const { access_token, advertiser_ids } = tokenData.data

      // Update account with tokens
      await supabase
        .from('tiktok_accounts')
        .update({
          access_token,
          advertiser_id: advertiser_ids?.[0] || null,
          status: 'connected',
          oauth_state: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id)

      // Log success
      await supabase.from('lead_source_logs').insert({
        company_id: account.company_id,
        action: 'oauth',
        status: 'success',
        response_data: { advertiser_ids }
      })

      // Redirect to app
      const appUrl = Deno.env.get('APP_URL') || 'https://lovable.dev'
      return Response.redirect(`${appUrl}/lead-sources?tiktok=connected`, 302)
    }

    // ===========================================
    // ACTION: test-connection - Validate setup
    // ===========================================
    if (action === 'test-connection' && req.method === 'POST') {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: account } = await supabase
        .from('tiktok_accounts')
        .select('*')
        .eq('company_id', companyId)
        .single()

      const checks: {
        account_exists: boolean;
        has_credentials: boolean;
        has_access_token: boolean;
        status: string;
        api_valid?: boolean;
      } = {
        account_exists: !!account,
        has_credentials: !!(account?.client_key && account?.client_secret),
        has_access_token: !!account?.access_token,
        status: account?.status || 'not_configured'
      }

      // If connected, verify with TikTok API
      if (account?.access_token && account?.advertiser_id) {
        try {
          const response = await fetch(
            `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${account.advertiser_id}"]`,
            {
              headers: {
                'Access-Token': account.access_token
              }
            }
          )
          const data = await response.json()
          checks.api_valid = data.code === 0
        } catch {
          checks.api_valid = false
        }
      }

      const isReady = checks.has_credentials
      const isConnected = checks.has_access_token && checks.api_valid === true

      return new Response(JSON.stringify({
        success: true,
        checks,
        is_ready: isReady,
        is_connected: isConnected,
        message: isConnected 
          ? 'TikTok connected successfully' 
          : isReady 
            ? 'Ready to connect - Credentials configured'
            : 'Add Client Key and Client Secret to continue'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ===========================================
    // ACTION: disconnect - Remove TikTok connection
    // ===========================================
    if (action === 'disconnect' && req.method === 'POST') {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (userRole !== 'admin' && userRole !== 'manager') {
        return new Response(JSON.stringify({ error: 'Forbidden - Admin/Manager only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await supabase
        .from('tiktok_accounts')
        .update({
          access_token: null,
          refresh_token: null,
          advertiser_id: null,
          token_expires_at: null,
          status: 'disconnected',
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId)

      await supabase.from('lead_source_logs').insert({
        company_id: companyId,
        action: 'disconnect',
        status: 'success'
      })

      return new Response(JSON.stringify({ success: true, message: 'TikTok disconnected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ===========================================
    // ACTION: get-webhook-url - Generate webhook URL
    // ===========================================
    if (action === 'get-webhook-url' && req.method === 'GET') {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check if webhook exists
      let { data: webhook } = await supabase
        .from('tiktok_webhooks')
        .select('*')
        .eq('company_id', companyId)
        .single()

      // Create if not exists
      if (!webhook) {
        const secretKey = crypto.randomUUID()
        const webhookUrl = `${SUPABASE_URL}/functions/v1/tiktok-webhook?company_id=${companyId}&secret=${secretKey}`

        const { data: newWebhook, error } = await supabase
          .from('tiktok_webhooks')
          .insert({
            company_id: companyId,
            webhook_url: webhookUrl,
            secret_key: secretKey,
            status: 'active'
          })
          .select()
          .single()

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        webhook = newWebhook
      }

      return new Response(JSON.stringify({
        webhook_url: webhook.webhook_url,
        secret_key: webhook.secret_key,
        status: webhook.status,
        events_received: webhook.events_received,
        last_event_at: webhook.last_event_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ===========================================
    // ACTION: get_forms - Get TikTok lead forms
    // ===========================================
    if (action === 'get_forms' && req.method === 'POST') {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: account } = await supabase
        .from('tiktok_accounts')
        .select('*')
        .eq('company_id', companyId)
        .single()

      if (!account?.access_token || !account?.advertiser_id) {
        return new Response(JSON.stringify({ 
          error: 'TikTok not connected',
          forms: [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      try {
        // Fetch instant forms from TikTok API
        const response = await fetch(
          `https://business-api.tiktok.com/open_api/v1.3/page/list/?advertiser_id=${account.advertiser_id}&page_type=INSTANT_FORM`,
          {
            headers: {
              'Access-Token': account.access_token
            }
          }
        )
        
        const data = await response.json()
        
        if (data.code !== 0) {
          console.error('TikTok API error:', data)
          return new Response(JSON.stringify({ 
            error: data.message,
            forms: [] 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const forms = (data.data?.list || []).map((form: any) => ({
          id: form.page_id,
          name: form.page_name || 'Unnamed Form',
          status: form.status || 'ACTIVE',
          leads_count: form.leads_count || 0,
          created_time: form.create_time
        }))

        // Update local forms cache
        for (const form of forms) {
          await supabase.from('tiktok_lead_forms').upsert({
            company_id: companyId,
            tiktok_account_id: account.id,
            advertiser_id: account.advertiser_id,
            form_id: form.id,
            form_name: form.name,
            status: form.status,
            leads_count: form.leads_count
          }, { onConflict: 'company_id,form_id' })
        }

        return new Response(JSON.stringify({ forms }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error: unknown) {
        console.error('Error fetching TikTok forms:', error)
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch forms',
          forms: [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ===========================================
    // ACTION: fetch_leads - Fetch leads from TikTok
    // ===========================================
    if (action === 'fetch_leads' && req.method === 'POST') {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { form_ids, date_from, date_to } = await req.json()

      const { data: account } = await supabase
        .from('tiktok_accounts')
        .select('*')
        .eq('company_id', companyId)
        .single()

      if (!account?.access_token || !account?.advertiser_id) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'TikTok not connected' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      try {
        let totalCreated = 0
        let totalSkipped = 0
        let totalFailed = 0

        // Build date filter
        const startDate = date_from ? new Date(date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const endDate = date_to ? new Date(date_to) : new Date()

        // Get forms to fetch from
        let formsToFetch: string[] = form_ids || []
        
        if (!formsToFetch.length) {
          // Fetch all forms if none specified
          const { data: localForms } = await supabase
            .from('tiktok_lead_forms')
            .select('form_id')
            .eq('company_id', companyId)
          
          formsToFetch = (localForms || []).map(f => f.form_id)
        }

        // Fetch leads for each form
        for (const formId of formsToFetch) {
          try {
            const response = await fetch(
              `https://business-api.tiktok.com/open_api/v1.3/page/lead/get/?advertiser_id=${account.advertiser_id}&page_id=${formId}&start_time=${Math.floor(startDate.getTime() / 1000)}&end_time=${Math.floor(endDate.getTime() / 1000)}`,
              {
                headers: {
                  'Access-Token': account.access_token
                }
              }
            )
            
            const data = await response.json()
            
            if (data.code !== 0) {
              console.error(`Error fetching leads for form ${formId}:`, data)
              continue
            }

            const leads = data.data?.list || []
            
            for (const lead of leads) {
              // Parse lead data
              const leadData: Record<string, string> = {}
              for (const field of (lead.user_info || [])) {
                leadData[field.field_key?.toLowerCase()] = field.field_value
              }

              const name = leadData.name || leadData.full_name || leadData.first_name || 'TikTok Lead'
              const phone = leadData.phone || leadData.phone_number || leadData.mobile || null
              const email = leadData.email || null

              // Check for duplicates
              const normalizedPhone = phone?.replace(/\D/g, '')
              
              const { data: existing } = await supabase
                .from('leads')
                .select('id')
                .eq('company_id', companyId)
                .or(`external_id.eq.tiktok_${lead.lead_id}${normalizedPhone ? `,phone.ilike.%${normalizedPhone.slice(-9)}%` : ''}`)
                .limit(1)
                .single()

              if (existing) {
                totalSkipped++
                continue
              }

              // Insert new lead
              const { error: insertError } = await supabase.from('leads').insert({
                company_id: companyId,
                name,
                phone,
                email,
                source: 'TikTok',
                stage: 'Uncontacted',
                external_id: `tiktok_${lead.lead_id}`,
                source_metadata: {
                  form_id: formId,
                  form_name: lead.page_name,
                  lead_id: lead.lead_id,
                  created_time: lead.create_time,
                  raw_data: leadData
                },
                fetched_at: new Date().toISOString()
              })

              if (insertError) {
                console.error('Error inserting lead:', insertError)
                totalFailed++
              } else {
                totalCreated++
              }
            }
          } catch (formError) {
            console.error(`Error processing form ${formId}:`, formError)
          }
        }

        // Log the fetch
        await supabase.from('lead_source_logs').insert({
          company_id: companyId,
          action: 'fetch',
          status: 'success',
          leads_processed: totalCreated + totalSkipped + totalFailed,
          leads_created: totalCreated,
          leads_skipped: totalSkipped
        })

        // Update lead source
        const { data: leadSource } = await supabase
          .from('lead_sources')
          .select('id, total_leads_fetched')
          .eq('company_id', companyId)
          .eq('source_name', 'tiktok')
          .single()

        if (leadSource) {
          await supabase
            .from('lead_sources')
            .update({
              last_fetched_at: new Date().toISOString(),
              total_leads_fetched: (leadSource.total_leads_fetched || 0) + totalCreated
            })
            .eq('id', leadSource.id)
        }

        return new Response(JSON.stringify({
          success: true,
          created: totalCreated,
          skipped: totalSkipped,
          failed: totalFailed,
          message: `Imported ${totalCreated} new leads`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (error: unknown) {
        console.error('Error fetching TikTok leads:', error)
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Failed to fetch leads' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('TikTok integration error:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})