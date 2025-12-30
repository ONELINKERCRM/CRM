import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchConfig {
  portal_name: string;
  company_id: string;
  api_key?: string;
  partner_id?: string;
  agency_id?: string;
  date_from?: string;
  date_to?: string;
}

// Property Finder API fetch
async function fetchPropertyFinderLeads(config: FetchConfig): Promise<Record<string, unknown>[]> {
  const { api_key, partner_id, date_from, date_to } = config;
  
  if (!api_key || !partner_id) {
    throw new Error('Property Finder requires api_key and partner_id');
  }

  // Get auth token
  const tokenResponse = await fetch('https://api.propertyfinder.ae/v2/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: partner_id,
      client_secret: api_key,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Property Finder auth failed: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json() as Record<string, unknown>;
  const accessToken = tokenData.access_token as string;

  // Fetch leads
  const params = new URLSearchParams();
  if (date_from) params.append('from_date', date_from);
  if (date_to) params.append('to_date', date_to);
  params.append('limit', '100');

  const leadsResponse = await fetch(
    `https://api.propertyfinder.ae/v2/leads?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!leadsResponse.ok) {
    throw new Error(`Property Finder leads fetch failed: ${leadsResponse.status}`);
  }

  const leadsData = await leadsResponse.json() as Record<string, unknown>;
  return (leadsData.data || leadsData.leads || []) as Record<string, unknown>[];
}

// Bayut API fetch
async function fetchBayutLeads(config: FetchConfig): Promise<Record<string, unknown>[]> {
  const { api_key, agency_id, date_from, date_to } = config;
  
  if (!api_key || !agency_id) {
    throw new Error('Bayut requires api_key and agency_id');
  }

  const params = new URLSearchParams();
  if (date_from) params.append('start_date', date_from);
  if (date_to) params.append('end_date', date_to);
  params.append('per_page', '100');

  const response = await fetch(
    `https://api.bayut.com/api/v1/agencies/${agency_id}/leads?${params.toString()}`,
    {
      headers: {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Bayut leads fetch failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  return (data.data || data.leads || []) as Record<string, unknown>[];
}

// Dubizzle API fetch
async function fetchDubizzleLeads(config: FetchConfig): Promise<Record<string, unknown>[]> {
  const { api_key, agency_id, date_from, date_to } = config;
  
  if (!api_key || !agency_id) {
    throw new Error('Dubizzle requires api_key and agency_id');
  }

  const params = new URLSearchParams();
  if (date_from) params.append('from', date_from);
  if (date_to) params.append('to', date_to);
  params.append('limit', '100');

  const response = await fetch(
    `https://api.dubizzle.com/v2/agencies/${agency_id}/enquiries?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Dubizzle leads fetch failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  return (data.data || data.enquiries || []) as Record<string, unknown>[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as Record<string, unknown>;
    const portal_name = body.portal_name as string;
    const company_id = body.company_id as string;
    const source_id = body.source_id as string;
    const date_from = body.date_from as string | undefined;
    const date_to = body.date_to as string | undefined;
    const action = (body.action as string) || 'fetch';

    // Validate inputs
    const validPortals = ['Property Finder', 'Bayut', 'Dubizzle'];
    if (!validPortals.includes(portal_name)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid portal name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get source configuration
    const { data: sourceConfig, error: sourceError } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('id', source_id)
      .eq('company_id', company_id)
      .single();

    if (sourceError || !sourceConfig) {
      return new Response(
        JSON.stringify({ success: false, error: 'Source not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connectionDetails = (sourceConfig.connection_details || {}) as Record<string, unknown>;
    
    // Test connection action
    if (action === 'test') {
      try {
        const config: FetchConfig = {
          portal_name,
          company_id,
          api_key: connectionDetails.api_key as string | undefined,
          partner_id: connectionDetails.partner_id as string | undefined,
          agency_id: connectionDetails.agency_id as string | undefined,
        };

        // Try to fetch one lead to test
        let testResult: Record<string, unknown>[];
        switch (portal_name) {
          case 'Property Finder':
            testResult = await fetchPropertyFinderLeads({ ...config, date_from: new Date().toISOString().split('T')[0] });
            break;
          case 'Bayut':
            testResult = await fetchBayutLeads({ ...config, date_from: new Date().toISOString().split('T')[0] });
            break;
          case 'Dubizzle':
            testResult = await fetchDubizzleLeads({ ...config, date_from: new Date().toISOString().split('T')[0] });
            break;
          default:
            testResult = [];
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Connection successful',
            leads_available: Array.isArray(testResult) ? testResult.length : 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (testError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: testError instanceof Error ? testError.message : 'Connection test failed'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch leads
    const config: FetchConfig = {
      portal_name,
      company_id,
      api_key: connectionDetails.api_key as string | undefined,
      partner_id: connectionDetails.partner_id as string | undefined,
      agency_id: connectionDetails.agency_id as string | undefined,
      date_from,
      date_to,
    };

    let leads: Record<string, unknown>[] = [];
    
    switch (portal_name) {
      case 'Property Finder':
        leads = await fetchPropertyFinderLeads(config);
        break;
      case 'Bayut':
        leads = await fetchBayutLeads(config);
        break;
      case 'Dubizzle':
        leads = await fetchDubizzleLeads(config);
        break;
    }

    console.log(`Fetched ${leads.length} leads from ${portal_name}`);

    // Process each lead
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (const leadData of leads) {
      try {
        // Extract lead info based on portal format
        let portalLeadId: string;
        let name: string;
        let phone: string | null = null;
        let email: string | null = null;
        let message: string | null = null;
        let listingRef: string | null = null;

        if (portal_name === 'Property Finder') {
          portalLeadId = String(leadData.id ?? leadData.enquiry_id ?? Date.now());
          name = String(leadData.name ?? leadData.full_name ?? 'Unknown');
          phone = String(leadData.phone ?? leadData.mobile ?? '');
          email = String(leadData.email ?? '');
          message = String(leadData.message ?? '');
          listingRef = String(leadData.listing_id ?? leadData.property_id ?? '');
        } else if (portal_name === 'Bayut') {
          portalLeadId = String(leadData.id ?? leadData.leadId ?? Date.now());
          name = String(leadData.name ?? leadData.customerName ?? 'Unknown');
          phone = String(leadData.phone ?? leadData.phoneNumber ?? '');
          email = String(leadData.email ?? '');
          message = String(leadData.message ?? '');
          listingRef = String(leadData.listingId ?? leadData.property_reference ?? '');
        } else {
          portalLeadId = String(leadData.id ?? leadData.enquiryId ?? Date.now());
          name = String(leadData.name ?? leadData.senderName ?? 'Unknown');
          phone = String(leadData.phone ?? leadData.senderPhone ?? '');
          email = String(leadData.email ?? leadData.senderEmail ?? '');
          message = String(leadData.message ?? leadData.body ?? '');
          listingRef = String(leadData.adId ?? leadData.listing_ref ?? '');
        }

        // Process through database function
        const { data: result, error: rpcError } = await supabase.rpc('process_portal_lead', {
          p_company_id: company_id,
          p_portal_name: portal_name,
          p_portal_lead_id: portalLeadId,
          p_name: name,
          p_phone: phone || null,
          p_email: email || null,
          p_message: message || null,
          p_listing_ref: listingRef || null,
          p_raw_data: leadData,
        });

        if (rpcError) throw rpcError;

        const resultData = result as Record<string, unknown> | null;
        if (resultData?.success) {
          if (resultData.is_duplicate) {
            duplicateCount++;
          } else {
            successCount++;
          }
        } else {
          throw new Error(String(resultData?.error || 'Processing failed'));
        }
      } catch (leadError) {
        errorCount++;
        console.error('Lead processing error:', leadError);
        
        await supabase.from('portal_import_errors').insert({
          company_id,
          portal_name,
          lead_data: leadData,
          error_message: leadError instanceof Error ? leadError.message : 'Unknown error',
          error_type: 'processing_error',
        });
      }
    }

    // Update source stats
    const totalFetched = ((sourceConfig.total_leads_fetched as number) || 0) + successCount;
    await supabase
      .from('lead_sources')
      .update({
        last_sync_at: new Date().toISOString(),
        total_leads_fetched: totalFetched,
      })
      .eq('id', source_id);

    // Log the fetch
    await supabase.from('lead_source_logs').insert({
      company_id,
      source_name: portal_name.toLowerCase().replace(' ', '_'),
      event_type: 'manual_fetch',
      status: errorCount === leads.length ? 'error' : 'success',
      details: {
        total: leads.length,
        imported: successCount,
        duplicates: duplicateCount,
        errors: errorCount,
        processing_time_ms: Date.now() - startTime,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        portal: portal_name,
        fetched: leads.length,
        imported: successCount,
        duplicates: duplicateCount,
        errors: errorCount,
        processing_time_ms: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Portal fetch error:', error);
    
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
