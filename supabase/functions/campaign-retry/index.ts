import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Campaign Retry Handler
 * Retries failed messages with exponential backoff
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaign_id, max_retries = 3 } = await req.json();

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get campaign info
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, company_id, channel, max_retries')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const effectiveMaxRetries = campaign.max_retries || max_retries;

    // Find failed recipients that can be retried
    const { data: failedRecipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('id, phone_number, recipient_email, retry_count, error_code')
      .eq('campaign_id', campaign_id)
      .eq('delivery_status', 'failed')
      .lt('retry_count', effectiveMaxRetries)
      .limit(100);

    if (recipientsError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch recipients' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!failedRecipients || failedRecipients.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No recipients to retry',
        retried: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Retrying ${failedRecipients.length} failed messages for campaign ${campaign_id}`);

    // Filter out non-retryable errors
    const nonRetryableErrors = ['invalid_phone', 'blocked', 'unsubscribed', 'spam'];
    const retryableRecipients = failedRecipients.filter(r => 
      !nonRetryableErrors.some(err => r.error_code?.toLowerCase().includes(err))
    );

    // Queue for retry
    const recipientIds = retryableRecipients.map(r => r.id);

    if (recipientIds.length > 0) {
      await supabase
        .from('campaign_recipients')
        .update({
          delivery_status: 'queued',
          retry_count: supabase.rpc('increment_retry'),
          error_message: null,
          error_code: null,
          failed_at: null,
          queued_at: new Date().toISOString()
        })
        .in('id', recipientIds);

      // Update using raw SQL increment
      for (const id of recipientIds) {
        await supabase
          .from('campaign_recipients')
          .update({ 
            delivery_status: 'queued',
            error_message: null,
            error_code: null,
            failed_at: null,
            queued_at: new Date().toISOString()
          })
          .eq('id', id);
        
        // Increment retry count separately
        const { data: recipient } = await supabase
          .from('campaign_recipients')
          .select('retry_count')
          .eq('id', id)
          .single();
        
        await supabase
          .from('campaign_recipients')
          .update({ retry_count: (recipient?.retry_count || 0) + 1 })
          .eq('id', id);
      }

      // Log the retry action
      await supabase.from('campaign_logs').insert({
        campaign_id,
        company_id: campaign.company_id,
        action: `Queued ${recipientIds.length} messages for retry`,
        action_type: 'retry',
        details: { 
          count: recipientIds.length,
          max_retries: effectiveMaxRetries,
          skipped: failedRecipients.length - retryableRecipients.length
        }
      });

      // Update campaign status to sending if it was completed
      await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign_id)
        .in('status', ['completed', 'failed']);

      // Trigger immediate processing
      await fetch(`${supabaseUrl}/functions/v1/campaign-execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ campaign_id, action: 'process_batch' })
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      retried: recipientIds.length,
      skipped: failedRecipients.length - retryableRecipients.length,
      max_retries: effectiveMaxRetries
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Retry error:', error);
    return new Response(JSON.stringify({ error: 'Retry failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
