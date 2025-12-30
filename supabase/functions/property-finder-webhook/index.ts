import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pf-signature, x-webhook-secret',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get company_id from query params
    const url = new URL(req.url);
    const companyId = url.searchParams.get('company_id');

    if (!companyId) {
      console.error('No company_id provided in webhook URL');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing company_id parameter. Add ?company_id=YOUR_COMPANY_ID to webhook URL' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional: Validate webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret') || req.headers.get('x-pf-signature');
    if (webhookSecret) {
      const { data: pfAccount } = await supabase
        .from('property_finder_accounts')
        .select('webhook_secret')
        .eq('company_id', companyId)
        .single();
      
      if (pfAccount?.webhook_secret && pfAccount.webhook_secret !== webhookSecret) {
        console.error('Invalid webhook secret');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid webhook signature' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Parse the webhook payload
    const payload = await req.json();
    console.log('Received Property Finder webhook:', JSON.stringify(payload));

    // Call the database function to process the webhook
    const { data: result, error: processError } = await supabase
      .rpc('process_pf_webhook', {
        p_company_id: companyId,
        p_payload: payload
      });

    if (processError) {
      console.error('Error processing webhook:', processError.message);
      
      // Log the error
      await supabase.from('property_finder_logs').insert({
        company_id: companyId,
        event_type: 'error',
        raw_payload: payload,
        status: 'failed',
        error_message: processError.message,
        processing_time_ms: Date.now() - startTime
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: processError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const processingTime = Date.now() - startTime;
    console.log(`Webhook processed in ${processingTime}ms:`, result);

    // Determine response status code
    const statusCode = result?.duplicate ? 200 : (result?.success ? 201 : 500);

    return new Response(JSON.stringify({
      ...result,
      processing_time_ms: processingTime
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      processing_time_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
