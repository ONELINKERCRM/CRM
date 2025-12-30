import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Campaign Scheduler
 * Processes scheduled campaigns and triggers execution
 * Should be called periodically (every minute) via cron
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`Campaign scheduler running at ${now.toISOString()}`);

    // Find campaigns that are due to start
    const { data: dueCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, company_id, channel, scheduled_at, timezone')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now.toISOString())
      .limit(10);

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch campaigns' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${dueCampaigns?.length || 0} campaigns to process`);

    const results = [];

    for (const campaign of dueCampaigns || []) {
      try {
        console.log(`Starting scheduled campaign: ${campaign.name} (${campaign.id})`);

        // Update status to sending
        await supabase
          .from('campaigns')
          .update({ status: 'sending', started_at: now.toISOString() })
          .eq('id', campaign.id);

        // Log the start
        await supabase.from('campaign_logs').insert({
          campaign_id: campaign.id,
          company_id: campaign.company_id,
          action: 'Scheduled campaign started automatically',
          action_type: 'scheduled_start',
          details: { scheduled_at: campaign.scheduled_at, started_at: now.toISOString() }
        });

        // Trigger campaign execution
        const execResponse = await fetch(`${supabaseUrl}/functions/v1/campaign-execute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ campaign_id: campaign.id, action: 'process_batch' })
        });

        const execResult = await execResponse.json();
        results.push({ campaign_id: campaign.id, name: campaign.name, result: execResult });

      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('campaigns')
          .update({ status: 'failed' })
          .eq('id', campaign.id);

        await supabase.from('campaign_logs').insert({
          campaign_id: campaign.id,
          company_id: campaign.company_id,
          action: `Scheduler error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          action_type: 'scheduler_error'
        });

        results.push({ campaign_id: campaign.id, error: true });
      }
    }

    // Also check for campaigns in 'sending' status that need to continue processing
    const { data: inProgressCampaigns } = await supabase
      .from('campaigns')
      .select('id, company_id')
      .eq('status', 'sending')
      .limit(5);

    for (const campaign of inProgressCampaigns || []) {
      // Check if there are still queued recipients
      const { count } = await supabase
        .from('campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('delivery_status', 'queued');

      if (count && count > 0) {
        console.log(`Continuing campaign ${campaign.id} with ${count} remaining recipients`);
        
        await fetch(`${supabaseUrl}/functions/v1/campaign-execute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ campaign_id: campaign.id, action: 'process_batch' })
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: dueCampaigns?.length || 0,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(JSON.stringify({ error: 'Scheduler failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
