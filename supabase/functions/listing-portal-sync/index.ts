import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PortalConfig {
  name: string;
  apiEndpoint: string;
  authType: 'api_key' | 'oauth' | 'basic';
}

const PORTAL_CONFIGS: Record<string, PortalConfig> = {
  property_finder: {
    name: 'Property Finder',
    apiEndpoint: 'https://api.propertyfinder.ae',
    authType: 'api_key',
  },
  bayut: {
    name: 'Bayut',
    apiEndpoint: 'https://api.bayut.com',
    authType: 'api_key',
  },
  dubizzle: {
    name: 'Dubizzle',
    apiEndpoint: 'https://api.dubizzle.com',
    authType: 'api_key',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, listing_portal_id, listing_id, portal_name } = await req.json();

    console.log(`[listing-portal-sync] Action: ${action}, Portal: ${portal_name}`);

    if (action === 'sync') {
      // Get pending portal entries
      const { data: pendingPortals, error: fetchError } = await supabase
        .from('listing_portals')
        .select(`
          *,
          listings (*)
        `)
        .eq('publish_status', 'pending')
        .lt('retry_count', 3);

      if (fetchError) throw fetchError;

      const results = [];

      for (const portalEntry of pendingPortals || []) {
        try {
          // Get connection credentials
          const { data: connection } = await supabase
            .from('marketing_connections')
            .select('*')
            .eq('company_id', portalEntry.company_id)
            .eq('provider', portalEntry.portal_name)
            .eq('status', 'connected')
            .single();

          if (!connection) {
            // No valid connection, mark as failed
            await supabase
              .from('listing_portals')
              .update({
                publish_status: 'failed',
                error_message: 'No connected account found for this portal',
                updated_at: new Date().toISOString(),
              })
              .eq('id', portalEntry.id);

            results.push({ id: portalEntry.id, status: 'failed', error: 'No connection' });
            continue;
          }

          // Prepare listing data for portal
          const listing = portalEntry.listings;
          const customizations = portalEntry.customizations || {};

          const portalData = {
            reference: listing.reference_number,
            title: customizations.title || listing.title,
            description: customizations.description || listing.description,
            price: customizations.price || listing.price,
            currency: listing.currency,
            property_type: listing.property_type,
            offering_type: listing.listing_type === 'rent' ? 'RR' : 'RS',
            city: listing.city,
            community: listing.address,
            bedrooms: listing.number_of_bedrooms,
            bathrooms: listing.number_of_bathrooms,
            size: listing.area_size,
            size_unit: listing.area_unit,
            furnished: listing.furnished,
            images: customizations.images || listing.images,
            agent_id: listing.assigned_agent_id,
            permit_number: listing.permit_number,
          };

          // Simulate API call to portal (in production, make actual API call)
          console.log(`[listing-portal-sync] Publishing to ${portalEntry.portal_name}:`, portalData.reference);

          // Mark as published (in production, check actual response)
          const portalListingId = `${portalEntry.portal_name.toUpperCase()}-${Date.now()}`;

          await supabase
            .from('listing_portals')
            .update({
              publish_status: 'published',
              portal_listing_id: portalListingId,
              portal_url: `https://${portalEntry.portal_name}.com/listing/${portalListingId}`,
              last_sync_at: new Date().toISOString(),
              sync_status: 'synced',
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', portalEntry.id);

          // Update analytics
          await supabase
            .from('listing_analytics')
            .upsert({
              listing_id: listing.id,
              company_id: portalEntry.company_id,
              portal_name: portalEntry.portal_name,
              date: new Date().toISOString().split('T')[0],
              views_count: 0,
              clicks_count: 0,
              inquiries_count: 0,
            }, {
              onConflict: 'listing_id,portal_name,date',
            });

          results.push({ id: portalEntry.id, status: 'published', portal_listing_id: portalListingId });

        } catch (portalError) {
          console.error(`[listing-portal-sync] Error publishing to ${portalEntry.portal_name}:`, portalError);

          // Increment retry count
          await supabase
            .from('listing_portals')
            .update({
              retry_count: portalEntry.retry_count + 1,
              error_message: portalError instanceof Error ? portalError.message : 'Unknown error',
              next_retry_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
              sync_status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', portalEntry.id);

          results.push({ id: portalEntry.id, status: 'error', error: portalError });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'webhook') {
      // Handle incoming webhooks from portals (analytics updates, status changes)
      const { portal, event_type, data } = await req.json();

      console.log(`[listing-portal-sync] Webhook from ${portal}: ${event_type}`);

      if (event_type === 'view') {
        // Update view count
        await supabase.rpc('increment_listing_view', {
          p_listing_id: data.listing_id,
          p_portal_name: portal,
        });
      } else if (event_type === 'inquiry') {
        // Create inquiry record
        await supabase.from('listing_inquiries').insert({
          listing_id: data.listing_id,
          company_id: data.company_id,
          portal_name: portal,
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message,
          external_id: data.external_id,
        });

        // Update inquiry count
        await supabase
          .from('listing_analytics')
          .upsert({
            listing_id: data.listing_id,
            company_id: data.company_id,
            portal_name: portal,
            date: new Date().toISOString().split('T')[0],
            inquiries_count: 1,
          }, {
            onConflict: 'listing_id,portal_name,date',
          });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[listing-portal-sync] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
