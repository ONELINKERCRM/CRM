import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_ID = Deno.env.get('META_APP_ID');
const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  let action = url.searchParams.get('action');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Parse body for POST requests
    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
        // Allow action to be specified in body if not in query params
        if (!action && body.action) {
          action = body.action as string;
        }
      } catch {
        // Body might be empty for some requests
      }
    }

    // Default action for POST without action specified is 'init'
    if (!action && req.method === 'POST') {
      action = 'init';
    }

    console.log(`[whatsapp-embedded-signup] Action: ${action}, Method: ${req.method}`);

    // Initialize embedded signup - get OAuth URL
    if (action === 'init') {
      const company_id = body.company_id as string;
      const redirect_uri = body.redirect_uri as string;

      if (!company_id || !redirect_uri) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const state = btoa(JSON.stringify({ company_id, redirect_uri }));
      
      // WhatsApp Business API scopes
      const scopes = [
        'whatsapp_business_management',
        'whatsapp_business_messaging',
        'business_management'
      ].join(',');

      const callbackUrl = `${SUPABASE_URL}/functions/v1/whatsapp-embedded-signup?action=callback`;
      
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code` +
        `&extras=${encodeURIComponent(JSON.stringify({ setup: { channel: 'whatsapp' } }))}`;

      console.log('Generated WhatsApp embedded signup URL');

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle OAuth callback
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        const state = JSON.parse(atob(stateParam || ''));
        return Response.redirect(`${state.redirect_uri}?error=${encodeURIComponent(error)}`);
      }

      if (!code || !stateParam) {
        return new Response('Missing code or state', { status: 400 });
      }

      const state = JSON.parse(atob(stateParam));
      const { company_id, redirect_uri } = state;

      const callbackUrl = `${SUPABASE_URL}/functions/v1/whatsapp-embedded-signup?action=callback`;

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
        return Response.redirect(`${redirect_uri}?error=${encodeURIComponent(tokenData.error.message)}`);
      }

      // Get long-lived token
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${tokenData.access_token}`
      );

      const longLivedData = await longLivedResponse.json();
      const accessToken = longLivedData.access_token || tokenData.access_token;

      // Get WhatsApp Business Accounts
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`
      );
      const wabaDebug = await wabaResponse.json();
      
      // Get the user's business accounts with WhatsApp
      const businessResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?access_token=${accessToken}`
      );
      const businessData = await businessResponse.json();

      // Get WhatsApp Business Account and Phone Numbers
      let wabaId = '';
      let phoneNumbers: any[] = [];

      for (const business of (businessData.data || [])) {
        const waResponse = await fetch(
          `https://graph.facebook.com/v18.0/${business.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`
        );
        const waData = await waResponse.json();

        if (waData.data && waData.data.length > 0) {
          wabaId = waData.data[0].id;
          
          // Get phone numbers for this WABA
          const phonesResponse = await fetch(
            `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${accessToken}`
          );
          const phonesData = await phonesResponse.json();
          phoneNumbers = phonesData.data || [];
          break;
        }
      }

      if (!wabaId || phoneNumbers.length === 0) {
        console.error('No WhatsApp Business Account or phone numbers found');
        return Response.redirect(`${redirect_uri}?error=${encodeURIComponent('No WhatsApp Business number found. Please complete the setup in Meta Business Suite first.')}`);
      }

      const phoneNumber = phoneNumbers[0];

      // Save the connection to marketing_connections
      const { data: connection, error: insertError } = await supabase
        .from('marketing_connections')
        .insert({
          company_id,
          channel: 'whatsapp',
          provider: 'meta',
          display_name: phoneNumber.verified_name || phoneNumber.display_phone_number,
          identifier: phoneNumber.display_phone_number,
          status: 'connected',
          verified: phoneNumber.quality_rating !== 'UNKNOWN',
          credentials: {
            accessToken,
            phoneNumberId: phoneNumber.id,
            businessId: wabaId,
            qualityRating: phoneNumber.quality_rating,
            verifiedName: phoneNumber.verified_name,
          },
          last_sync: new Date().toISOString(),
          health_status: 'healthy',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to save connection:', insertError);
        return Response.redirect(`${redirect_uri}?error=${encodeURIComponent('Failed to save connection')}`);
      }

      console.log('WhatsApp connection created:', connection.id);

      return Response.redirect(`${redirect_uri}?success=true&connection_id=${connection.id}`);
    }

    // Verify connection / test sending
    if (action === 'test') {
      const connection_id = body.connection_id as string;

      const { data: connection, error: connError } = await supabase
        .from('marketing_connections')
        .select('*')
        .eq('id', connection_id)
        .single();

      if (connError || !connection) {
        return new Response(JSON.stringify({ error: 'Connection not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { accessToken, phoneNumberId } = connection.credentials || {};

      if (!accessToken || !phoneNumberId) {
        return new Response(JSON.stringify({ success: false, error: 'Missing credentials' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify the phone number status
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${accessToken}&fields=verified_name,quality_rating,display_phone_number`
      );

      const result = await response.json();

      if (result.error) {
        await supabase
          .from('marketing_connections')
          .update({ 
            status: 'error', 
            health_status: 'unhealthy',
            last_health_check: new Date().toISOString() 
          })
          .eq('id', connection_id);

        return new Response(JSON.stringify({ success: false, error: result.error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update connection with latest info
      await supabase
        .from('marketing_connections')
        .update({ 
          status: 'connected',
          health_status: 'healthy',
          verified: true,
          last_health_check: new Date().toISOString(),
          last_sync: new Date().toISOString(),
          credentials: {
            ...connection.credentials,
            qualityRating: result.quality_rating,
            verifiedName: result.verified_name,
          }
        })
        .eq('id', connection_id);

      return new Response(JSON.stringify({ 
        success: true, 
        phone_number: result.display_phone_number,
        verified_name: result.verified_name,
        quality_rating: result.quality_rating 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get templates from the WABA
    if (action === 'get_templates') {
      const connection_id = body.connection_id as string;

      const { data: connection, error: connError } = await supabase
        .from('marketing_connections')
        .select('*')
        .eq('id', connection_id)
        .single();

      if (connError || !connection) {
        return new Response(JSON.stringify({ error: 'Connection not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { accessToken, businessId } = connection.credentials || {};

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${businessId}/message_templates?access_token=${accessToken}&fields=name,language,status,category,components`
      );

      const result = await response.json();

      if (result.error) {
        return new Response(JSON.stringify({ error: result.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Filter to only approved templates
      const templates = (result.data || []).filter((t: any) => t.status === 'APPROVED');

      return new Response(JSON.stringify({ templates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WhatsApp embedded signup error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
