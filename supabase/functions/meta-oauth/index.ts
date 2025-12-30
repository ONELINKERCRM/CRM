import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_ID = Deno.env.get('META_APP_ID');
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const META_WEBHOOK_VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'onelinker_webhook_verify_2024';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // ============ WEBHOOK VERIFICATION (GET) ============
  // Meta sends GET request to verify webhook endpoint
  if (req.method === 'GET' && action === 'webhook') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('Webhook verification request:', { mode, token, challenge });

    if (mode === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    } else {
      console.error('Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }
  }

  // ============ WEBHOOK NOTIFICATIONS (POST) ============
  // Meta sends POST request when new leads come in
  if (req.method === 'POST' && action === 'webhook') {
    try {
      const body = await req.json();
      console.log('Webhook received:', JSON.stringify(body));

      // Acknowledge immediately (Meta requires fast response)
      const processWebhook = async () => {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Process leadgen entries
        if (body.object === 'page' && body.entry) {
          for (const entry of body.entry) {
            const pageId = entry.id;
            
            for (const change of (entry.changes || [])) {
              if (change.field === 'leadgen') {
                const leadgenId = change.value.leadgen_id;
                const formId = change.value.form_id;
                const adId = change.value.ad_id;
                const adgroupId = change.value.adgroup_id;
                const createdTime = change.value.created_time;

                console.log('Processing lead:', { leadgenId, formId, pageId });

                // Find the lead source connected to this page
                const { data: sources } = await supabase
                  .from('lead_sources')
                  .select('*')
                  .eq('source_name', 'meta')
                  .eq('status', 'connected');

                for (const source of (sources || [])) {
                  const { access_token, pages } = source.connection_details || {};
                  const connectedPage = pages?.find((p: any) => p.id === pageId);
                  
                  if (!connectedPage) continue;

                  const pageToken = connectedPage.access_token || access_token;

                  // Fetch the actual lead data from Meta
                  const leadResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${pageToken}`
                  );
                  const leadData = await leadResponse.json();

                  if (leadData.error) {
                    console.error('Error fetching lead:', leadData.error);
                    continue;
                  }

                  // Parse lead fields
                  const fieldData: Record<string, string> = {};
                  for (const field of (leadData.field_data || [])) {
                    fieldData[field.name] = field.values?.[0] || '';
                  }

                  // Check for duplicates
                  const { data: existing } = await supabase
                    .from('leads')
                    .select('id')
                    .eq('company_id', source.company_id)
                    .eq('external_id', leadgenId)
                    .single();

                  if (existing) {
                    console.log('Lead already exists:', leadgenId);
                    continue;
                  }

                  // Get form details for additional context
                  let formName = '';
                  try {
                    const formResponse = await fetch(
                      `https://graph.facebook.com/v18.0/${formId}?access_token=${pageToken}&fields=name`
                    );
                    const formData = await formResponse.json();
                    formName = formData.name || '';
                  } catch (e) {
                    console.error('Error fetching form name:', e);
                  }

                  // Insert lead into database
                  const { error: insertError } = await supabase.from('leads').insert({
                    company_id: source.company_id,
                    lead_source_id: source.id,
                    external_id: leadgenId,
                    name: fieldData.full_name || fieldData.name || `${fieldData.first_name || ''} ${fieldData.last_name || ''}`.trim() || 'New Lead',
                    email: fieldData.email || null,
                    phone: fieldData.phone_number || fieldData.phone || null,
                    source: 'Meta',
                    source_metadata: {
                      platform: 'meta',
                      page_id: pageId,
                      page_name: connectedPage.name,
                      form_id: formId,
                      form_name: formName,
                      ad_id: adId,
                      adgroup_id: adgroupId,
                      created_time: createdTime,
                      webhook: true,
                      raw_data: leadData
                    },
                    mapped_fields: fieldData,
                    fetched_at: new Date().toISOString(),
                    is_opted_in: true,
                    stage: 'new'
                  });

                  if (insertError) {
                    console.error('Error inserting lead:', insertError);
                  } else {
                    console.log('Lead created from webhook:', leadgenId);
                    
                    // Update source stats
                    await supabase
                      .from('lead_sources')
                      .update({
                        last_fetched_at: new Date().toISOString(),
                        total_leads_fetched: (source.total_leads_fetched || 0) + 1
                      })
                      .eq('id', source.id);

                    // Log the webhook lead
                    await supabase.from('lead_source_logs').insert({
                      source_id: source.id,
                      company_id: source.company_id,
                      action: 'webhook',
                      status: 'success',
                      leads_processed: 1,
                      leads_created: 1,
                      leads_updated: 0,
                      leads_skipped: 0
                    });
                  }
                  break; // Found the matching source, no need to continue
                }
              }
            }
          }
        }
      };

      // Process in background but respond immediately
      processWebhook().catch(console.error);

      return new Response('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
      console.error('Webhook error:', error);
      return new Response('EVENT_RECEIVED', { status: 200 }); // Always respond 200 to Meta
    }
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize OAuth - redirect user to Meta login
    if (action === 'init') {
      const sourceId = url.searchParams.get('source_id');
      const companyId = url.searchParams.get('company_id');
      const redirectUri = url.searchParams.get('redirect_uri');

      if (!sourceId || !companyId || !redirectUri) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store state for verification
      const state = btoa(JSON.stringify({ sourceId, companyId, redirectUri }));
      
      // Meta OAuth URL with required permissions for Lead Ads
      const scopes = [
        'leads_retrieval',
        'pages_read_engagement', 
        'pages_manage_metadata',
        'pages_show_list',
        'business_management'
      ].join(',');

      const callbackUrl = `${SUPABASE_URL}/functions/v1/meta-oauth?action=callback`;
      
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code`;

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle OAuth callback from Meta
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (error) {
        console.error('OAuth error:', error, errorDescription);
        const state = JSON.parse(atob(stateParam || ''));
        return Response.redirect(`${state.redirectUri}?error=${encodeURIComponent(errorDescription || error)}`);
      }

      if (!code || !stateParam) {
        return new Response('Missing code or state', { status: 400 });
      }

      const state = JSON.parse(atob(stateParam));
      const { sourceId, companyId, redirectUri } = state;

      const callbackUrl = `${SUPABASE_URL}/functions/v1/meta-oauth?action=callback`;

      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&code=${code}`
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Token exchange error:', tokenData.error);
        return Response.redirect(`${redirectUri}?error=${encodeURIComponent(tokenData.error.message)}`);
      }

      const { access_token, expires_in } = tokenData;

      // Get long-lived access token
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${access_token}`
      );

      const longLivedData = await longLivedResponse.json();
      const longLivedToken = longLivedData.access_token || access_token;
      const tokenExpiry = longLivedData.expires_in || expires_in || 5184000; // Default to 60 days if no expiry

      // Get user's pages with Lead Ads access
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
      );
      const pagesData = await pagesResponse.json();

      // Store connection in database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Safely calculate token expiry date
      let tokenExpiresAt: string;
      try {
        const expiryMs = typeof tokenExpiry === 'number' && tokenExpiry > 0 
          ? tokenExpiry * 1000 
          : 5184000000; // Default 60 days in ms
        tokenExpiresAt = new Date(Date.now() + expiryMs).toISOString();
      } catch {
        tokenExpiresAt = new Date(Date.now() + 5184000000).toISOString(); // Default 60 days
      }

      const connectionDetails = {
        access_token: longLivedToken,
        token_expires_at: tokenExpiresAt,
        pages: pagesData.data || [],
        connected_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('lead_sources')
        .update({
          connection_details: connectionDetails,
          connection_type: 'oauth',
          status: 'connected',
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceId)
        .eq('company_id', companyId);

      if (updateError) {
        console.error('Database update error:', updateError);
        return Response.redirect(`${redirectUri}?error=Failed to save connection`);
      }

      // Log the successful connection
      await supabase.from('lead_source_logs').insert({
        source_id: sourceId,
        company_id: companyId,
        action: 'oauth_connect',
        status: 'success',
        leads_processed: 0,
        leads_created: 0,
        leads_updated: 0,
        leads_skipped: 0
      });

      // Redirect back to app with success
      return Response.redirect(`${redirectUri}?success=true&source=meta`);
    }

    // Get forms from connected pages
    if (action === 'get_forms') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { source_id, company_id } = await req.json();
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: source, error: sourceError } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('id', source_id)
        .eq('company_id', company_id)
        .single();

      if (sourceError || !source) {
        return new Response(JSON.stringify({ error: 'Source not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { access_token, pages } = source.connection_details || {};

      if (!access_token) {
        return new Response(JSON.stringify({ error: 'Not connected' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const allForms: any[] = [];

      for (const page of (pages || [])) {
        const pageToken = page.access_token || access_token;
        
        try {
          const formsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}/leadgen_forms?access_token=${pageToken}&fields=id,name,status,leads_count,created_time`
          );
          const formsData = await formsResponse.json();

          if (formsData.data) {
            for (const form of formsData.data) {
              allForms.push({
                id: form.id,
                name: form.name,
                status: form.status,
                leads_count: form.leads_count || 0,
                created_time: form.created_time,
                page_id: page.id,
                page_name: page.name
              });
            }
          }
        } catch (e) {
          console.error(`Error fetching forms for page ${page.id}:`, e);
        }
      }

      return new Response(JSON.stringify({ forms: allForms }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch leads from Meta with form and date filtering
    if (action === 'fetch_leads') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { source_id, company_id, form_ids, date_from, date_to } = await req.json();

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Get source with connection details
      const { data: source, error: sourceError } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('id', source_id)
        .eq('company_id', company_id)
        .single();

      if (sourceError || !source) {
        return new Response(JSON.stringify({ error: 'Source not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { access_token, pages } = source.connection_details || {};

      if (!access_token) {
        return new Response(JSON.stringify({ error: 'Not connected' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let totalCreated = 0;
      let totalSkipped = 0;
      const selectedFormIds = form_ids && form_ids.length > 0 ? new Set(form_ids) : null;

      // Parse date filters
      const fromDate = date_from ? new Date(date_from) : null;
      const toDate = date_to ? new Date(date_to) : null;

      console.log('Fetching leads with filters:', { form_ids, date_from, date_to });

      // Fetch leads from each connected page
      for (const page of (pages || [])) {
        const pageToken = page.access_token || access_token;
        
        // Get leadgen forms for this page
        const formsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}/leadgen_forms?access_token=${pageToken}`
        );
        const formsData = await formsResponse.json();

        for (const form of (formsData.data || [])) {
          // Skip if not in selected forms (when filter is active)
          if (selectedFormIds && !selectedFormIds.has(form.id)) {
            continue;
          }

          // Build leads URL with date filtering
          let leadsUrl = `https://graph.facebook.com/v18.0/${form.id}/leads?access_token=${pageToken}&limit=500`;
          
          // Add date filters if provided
          if (fromDate) {
            leadsUrl += `&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${Math.floor(fromDate.getTime() / 1000)}}]`;
          }

          const leadsResponse = await fetch(leadsUrl);
          const leadsData = await leadsResponse.json();

          for (const lead of (leadsData.data || [])) {
            // Additional date filter check (client-side for safety)
            const leadCreatedTime = new Date(lead.created_time);
            if (fromDate && leadCreatedTime < fromDate) continue;
            if (toDate && leadCreatedTime > toDate) continue;

            // Parse lead data
            const fieldData: Record<string, string> = {};
            for (const field of (lead.field_data || [])) {
              fieldData[field.name] = field.values?.[0] || '';
            }

            // Check for duplicates
            const { data: existing } = await supabase
              .from('leads')
              .select('id')
              .eq('company_id', company_id)
              .eq('external_id', lead.id)
              .single();

            if (existing) {
              totalSkipped++;
              continue;
            }

            // Insert lead
            const { error: insertError } = await supabase.from('leads').insert({
              company_id,
              lead_source_id: source_id,
              external_id: lead.id,
              name: fieldData.full_name || fieldData.name || `${fieldData.first_name || ''} ${fieldData.last_name || ''}`.trim() || 'Unknown',
              email: fieldData.email || null,
              phone: fieldData.phone_number || fieldData.phone || null,
              source: 'Meta',
              source_metadata: {
                platform: 'meta',
                page_id: page.id,
                page_name: page.name,
                form_id: form.id,
                form_name: form.name,
                raw_data: lead
              },
              mapped_fields: fieldData,
              fetched_at: new Date().toISOString(),
              is_opted_in: true,
              stage: 'Uncontacted'
            });

            if (!insertError) {
              totalCreated++;
            }
          }
        }
      }

      // Update source stats
      await supabase
        .from('lead_sources')
        .update({
          last_fetched_at: new Date().toISOString(),
          total_leads_fetched: (source.total_leads_fetched || 0) + totalCreated
        })
        .eq('id', source_id);

      // Log the fetch
      await supabase.from('lead_source_logs').insert({
        source_id,
        company_id,
        action: 'fetch',
        status: 'success',
        leads_processed: totalCreated + totalSkipped,
        leads_created: totalCreated,
        leads_updated: 0,
        leads_skipped: totalSkipped
      });

      return new Response(JSON.stringify({ 
        success: true, 
        created: totalCreated, 
        skipped: totalSkipped 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Meta OAuth error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});