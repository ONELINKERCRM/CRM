import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ListingRequest {
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'assign' | 'archive' | 'duplicate' | 'bulk_action' | 'get_analytics';
  listing_id?: string;
  listing_ids?: string[];
  data?: Record<string, unknown>;
  portal_names?: string[];
  agent_ids?: string[];
  bulk_action?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's company and role
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, company_id, role')
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { company_id, role, id: agent_id } = agent;
    const isAdmin = role === 'admin' || role === 'manager';

    const body: ListingRequest = await req.json();
    const { action } = body;

    console.log(`[listing-manage] Action: ${action}, Company: ${company_id}, User: ${user.id}`);

    switch (action) {
      case 'create': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can create listings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const listingData = {
          ...body.data,
          company_id,
          created_by: agent_id,
          status: body.data?.status || 'draft',
        };

        const { data: listing, error } = await supabase
          .from('listings')
          .insert(listingData)
          .select()
          .single();

        if (error) throw error;

        // Log the action
        await supabase.from('listing_audit_logs').insert({
          listing_id: listing.id,
          company_id,
          action_type: 'create',
          description: `Created listing: ${listing.title}`,
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true, listing }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        const { listing_id, data } = body;

        if (!listing_id) {
          return new Response(JSON.stringify({ error: 'Listing ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if user can edit this listing
        const { data: existingListing } = await supabase
          .from('listings')
          .select('*, assigned_agent_id')
          .eq('id', listing_id)
          .eq('company_id', company_id)
          .single();

        if (!existingListing) {
          return new Response(JSON.stringify({ error: 'Listing not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Agents can only edit their assigned listings
        if (!isAdmin && existingListing.assigned_agent_id !== agent_id) {
          return new Response(JSON.stringify({ error: 'You can only edit your assigned listings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: listing, error } = await supabase
          .from('listings')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', listing_id)
          .eq('company_id', company_id)
          .select()
          .single();

        if (error) throw error;

        // Log the action
        await supabase.from('listing_audit_logs').insert({
          listing_id,
          company_id,
          action_type: 'edit',
          description: `Updated listing: ${listing.title}`,
          changes: data,
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true, listing }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can delete listings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { listing_id } = body;

        // Get listing title for logging
        const { data: existingListing } = await supabase
          .from('listings')
          .select('title')
          .eq('id', listing_id)
          .single();

        const { error } = await supabase
          .from('listings')
          .delete()
          .eq('id', listing_id)
          .eq('company_id', company_id);

        if (error) throw error;

        // Log the action
        await supabase.from('listing_audit_logs').insert({
          listing_id,
          company_id,
          action_type: 'delete',
          description: `Deleted listing: ${existingListing?.title || listing_id}`,
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'publish': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can publish listings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { listing_id, portal_names, data: customizations } = body;

        if (!listing_id || !portal_names?.length) {
          return new Response(JSON.stringify({ error: 'Listing ID and portal names are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get listing details
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listing_id)
          .eq('company_id', company_id)
          .single();

        if (listingError || !listing) {
          return new Response(JSON.stringify({ error: 'Listing not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const results = [];

        for (const portal_name of portal_names) {
          // Check if already published to this portal
          const { data: existingPortal } = await supabase
            .from('listing_portals')
            .select('id')
            .eq('listing_id', listing_id)
            .eq('portal_name', portal_name)
            .single();

          if (existingPortal) {
            // Update existing
            const { data: portal, error } = await supabase
              .from('listing_portals')
              .update({
                customizations: customizations?.[portal_name] || {},
                publish_status: 'pending',
                publish_time: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingPortal.id)
              .select()
              .single();

            results.push({ portal_name, status: 'updated', portal });
          } else {
            // Create new portal entry
            const { data: portal, error } = await supabase
              .from('listing_portals')
              .insert({
                listing_id,
                company_id,
                portal_name,
                customizations: customizations?.[portal_name] || {},
                publish_status: 'pending',
                publish_time: new Date().toISOString(),
              })
              .select()
              .single();

            results.push({ portal_name, status: 'created', portal });
          }
        }

        // Update listing status
        await supabase
          .from('listings')
          .update({ 
            status: 'published', 
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('id', listing_id);

        // Log the action
        await supabase.from('listing_audit_logs').insert({
          listing_id,
          company_id,
          action_type: 'publish',
          description: `Published to: ${portal_names.join(', ')}`,
          changes: { portals: portal_names },
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'unpublish': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can unpublish listings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { listing_id, portal_names } = body;

        if (portal_names?.length) {
          // Unpublish from specific portals
          await supabase
            .from('listing_portals')
            .update({ 
              publish_status: 'unpublished',
              unpublish_time: new Date().toISOString(),
            })
            .eq('listing_id', listing_id)
            .in('portal_name', portal_names);
        } else {
          // Unpublish from all portals
          await supabase
            .from('listing_portals')
            .update({ 
              publish_status: 'unpublished',
              unpublish_time: new Date().toISOString(),
            })
            .eq('listing_id', listing_id);

          // Update listing status
          await supabase
            .from('listings')
            .update({ status: 'draft', updated_at: new Date().toISOString() })
            .eq('id', listing_id);
        }

        // Log the action
        await supabase.from('listing_audit_logs').insert({
          listing_id,
          company_id,
          action_type: 'unpublish',
          description: portal_names?.length 
            ? `Unpublished from: ${portal_names.join(', ')}`
            : 'Unpublished from all portals',
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'assign': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can assign listings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { listing_id, agent_ids } = body;

        if (!listing_id || !agent_ids?.length) {
          return new Response(JSON.stringify({ error: 'Listing ID and agent IDs are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: listing, error } = await supabase
          .from('listings')
          .update({
            assigned_agent_id: agent_ids[0], // Primary agent
            assigned_agents: agent_ids,
            updated_at: new Date().toISOString(),
          })
          .eq('id', listing_id)
          .eq('company_id', company_id)
          .select()
          .single();

        if (error) throw error;

        // Log the action
        await supabase.from('listing_audit_logs').insert({
          listing_id,
          company_id,
          action_type: 'assign',
          description: `Assigned to ${agent_ids.length} agent(s)`,
          changes: { agent_ids },
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true, listing }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'archive': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can archive listings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { listing_id } = body;

        const { data: listing, error } = await supabase
          .from('listings')
          .update({ 
            status: 'archived', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', listing_id)
          .eq('company_id', company_id)
          .select()
          .single();

        if (error) throw error;

        // Unpublish from all portals
        await supabase
          .from('listing_portals')
          .update({ publish_status: 'unpublished' })
          .eq('listing_id', listing_id);

        // Log the action
        await supabase.from('listing_audit_logs').insert({
          listing_id,
          company_id,
          action_type: 'archive',
          description: `Archived listing: ${listing.title}`,
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true, listing }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'duplicate': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can duplicate listings' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { listing_id } = body;

        // Get original listing
        const { data: original, error: fetchError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listing_id)
          .eq('company_id', company_id)
          .single();

        if (fetchError || !original) {
          return new Response(JSON.stringify({ error: 'Listing not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create duplicate
        const { id, reference_number, created_at, updated_at, published_at, ...listingData } = original;
        
        const { data: duplicate, error } = await supabase
          .from('listings')
          .insert({
            ...listingData,
            title: `${original.title} (Copy)`,
            status: 'draft',
            created_by: agent_id,
          })
          .select()
          .single();

        if (error) throw error;

        // Log the action
        await supabase.from('listing_audit_logs').insert({
          listing_id: duplicate.id,
          company_id,
          action_type: 'duplicate',
          description: `Duplicated from: ${original.reference_number}`,
          changes: { original_id: listing_id },
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true, listing: duplicate }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'bulk_action': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can perform bulk actions' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { listing_ids, bulk_action, data } = body;

        if (!listing_ids?.length || !bulk_action) {
          return new Response(JSON.stringify({ error: 'Listing IDs and bulk action are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

        switch (bulk_action) {
          case 'archive':
            updateData.status = 'archived';
            break;
          case 'publish':
            updateData.status = 'published';
            updateData.published_at = new Date().toISOString();
            break;
          case 'draft':
            updateData.status = 'draft';
            break;
          case 'assign':
            if (data?.agent_id) {
              updateData.assigned_agent_id = data.agent_id;
            }
            break;
          case 'delete':
            const { error: deleteError } = await supabase
              .from('listings')
              .delete()
              .in('id', listing_ids)
              .eq('company_id', company_id);

            if (deleteError) throw deleteError;

            return new Response(JSON.stringify({ success: true, affected: listing_ids.length }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          default:
            return new Response(JSON.stringify({ error: 'Invalid bulk action' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { error } = await supabase
          .from('listings')
          .update(updateData)
          .in('id', listing_ids)
          .eq('company_id', company_id);

        if (error) throw error;

        // Log the bulk action
        await supabase.from('listing_audit_logs').insert({
          company_id,
          action_type: bulk_action === 'archive' ? 'archive' : 'edit',
          description: `Bulk ${bulk_action}: ${listing_ids.length} listings`,
          changes: { listing_ids, action: bulk_action },
          performed_by: agent_id,
        });

        return new Response(JSON.stringify({ success: true, affected: listing_ids.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_analytics': {
        const { listing_id } = body;

        if (!listing_id) {
          return new Response(JSON.stringify({ error: 'Listing ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get analytics summary
        const { data: analytics } = await supabase
          .rpc('get_listing_analytics_summary', { p_listing_id: listing_id });

        // Get portal statuses
        const { data: portals } = await supabase
          .from('listing_portals')
          .select('*')
          .eq('listing_id', listing_id);

        // Get recent inquiries
        const { data: inquiries } = await supabase
          .from('listing_inquiries')
          .select('*')
          .eq('listing_id', listing_id)
          .order('created_at', { ascending: false })
          .limit(10);

        return new Response(JSON.stringify({ 
          analytics: analytics || {},
          portals: portals || [],
          inquiries: inquiries || [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[listing-manage] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
