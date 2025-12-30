import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyFinderLead {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  message?: string;
  property_reference?: string;
  created_at?: string;
  updated_at?: string;
  type?: string;
  status?: string;
}

interface PropertyFinderResponse {
  data: PropertyFinderLead[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Property Finder API key (format: "username:password" for Basic Auth)
    const propertyFinderApiKey = Deno.env.get('PROPERTY_FINDER_API_KEY');
    if (!propertyFinderApiKey) {
      console.error('Property Finder API key not configured');
      return new Response(JSON.stringify({ error: 'Property Finder API key not configured. Please add your PF Expert API credentials (username:password format).' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get request body for company context
    const body = await req.json().catch(() => ({}));
    const { company_id, since, page = 1 } = body;

    if (!company_id) {
      console.error('Company ID is required');
      return new Response(JSON.stringify({ error: 'Company ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching Property Finder leads for company: ${company_id}`);

    // PF Expert API - correct endpoint for leads
    // Documentation: https://expert.propertyfinder.ae/documentation/leads/
    const pfApiUrl = `https://expert.propertyfinder.ae/api/v2/leads`;
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', '100');
    if (since) {
      queryParams.append('updated_at[gte]', since);
    }

    console.log(`Calling PF Expert API: ${pfApiUrl}?${queryParams.toString()}`);

    // PF Expert uses Basic Authentication
    const basicAuth = btoa(propertyFinderApiKey);
    
    const pfResponse = await fetch(`${pfApiUrl}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!pfResponse.ok) {
      const errorText = await pfResponse.text();
      console.error(`PF Expert API error: ${pfResponse.status} - ${errorText}`);
      
      // Provide helpful error messages
      let errorMessage = 'Failed to fetch from Property Finder';
      if (pfResponse.status === 401) {
        errorMessage = 'Invalid API credentials. Please check your PF Expert username:password in PROPERTY_FINDER_API_KEY secret.';
      } else if (pfResponse.status === 403) {
        errorMessage = 'Access denied. Your PF Expert account may not have API access enabled.';
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        status: pfResponse.status
      }), {
        status: pfResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pfData: PropertyFinderResponse = await pfResponse.json();
    const leads: PropertyFinderLead[] = pfData.data || [];

    console.log(`Received ${leads.length} leads from Property Finder`);

    // Transform and insert leads into Supabase
    const insertedLeads = [];
    const errors = [];

    for (const pfLead of leads) {
      const leadName = [pfLead.first_name, pfLead.last_name].filter(Boolean).join(' ') || 'Unknown Lead';
      const leadPhone = pfLead.mobile || pfLead.phone || null;
      
      const leadData = {
        name: leadName,
        email: pfLead.email || null,
        phone: leadPhone,
        source: 'Property Finder',
        stage: 'New',
        requirements: pfLead.message || null,
        company_id: company_id,
        form_data: {
          property_reference: pfLead.property_reference,
          pf_lead_id: pfLead.id,
          pf_status: pfLead.status,
          pf_type: pfLead.type,
          original_id: pfLead.id,
          synced_at: new Date().toISOString(),
        },
      };

      // Check if lead already exists (by phone or email + source)
      let existingLead = null;
      if (pfLead.phone) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .eq('phone', pfLead.phone)
          .eq('source', 'Property Finder')
          .eq('company_id', company_id)
          .maybeSingle();
        existingLead = data;
      } else if (pfLead.email) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .eq('email', pfLead.email)
          .eq('source', 'Property Finder')
          .eq('company_id', company_id)
          .maybeSingle();
        existingLead = data;
      }

      if (existingLead) {
        console.log(`Lead already exists: ${existingLead.id}`);
        continue;
      }

      // Insert new lead
      const { data: insertedLead, error: insertError } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting lead: ${insertError.message}`);
        errors.push({ lead: leadName, error: insertError.message });
      } else {
        console.log(`Inserted lead: ${insertedLead.id}`);
        insertedLeads.push(insertedLead);
      }
    }

    // Log the sync activity
    await supabase.from('integration_logs').insert({
      company_id: company_id,
      action: 'fetch_leads',
      status: errors.length > 0 ? 'partial' : 'success',
      records_processed: insertedLeads.length,
      response_data: {
        total_fetched: leads.length,
        inserted: insertedLeads.length,
        errors: errors.length,
      },
    });

    console.log(`Sync complete: ${insertedLeads.length} new leads, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      total_fetched: leads.length,
      inserted: insertedLeads.length,
      errors: errors,
      leads: insertedLeads,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Edge function error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
