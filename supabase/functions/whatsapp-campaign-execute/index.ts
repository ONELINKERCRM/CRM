import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignRecipient {
  id: string;
  phone_number: string;
  name: string | null;
  template_variables: Record<string, string>;
}

interface WhatsAppTemplate {
  template_name: string;
  language: string;
  header_type: string | null;
  header_content: string | null;
  body: string;
  buttons_json: any[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { campaign_id, action } = await req.json();

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        whatsapp_phone_numbers!phone_number_id (
          phone_number_id,
          phone_number,
          whatsapp_business_accounts!whatsapp_business_account_id (
            access_token_encrypted,
            meta_business_id
          )
        ),
        whatsapp_templates!whatsapp_template_id (
          template_name,
          language,
          header_type,
          header_content,
          body,
          buttons_json
        )
      `)
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different actions
    if (action === 'start') {
      return await startCampaign(supabase, campaign);
    } else if (action === 'pause') {
      return await pauseCampaign(supabase, campaign);
    } else if (action === 'resume') {
      return await resumeCampaign(supabase, campaign);
    } else if (action === 'process_batch') {
      return await processBatch(supabase, campaign);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Campaign execution error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startCampaign(supabase: any, campaign: any) {
  console.log(`Starting campaign ${campaign.id}`);

  // Update campaign status to sending
  await supabase
    .from('campaigns')
    .update({ status: 'sending', started_at: new Date().toISOString() })
    .eq('id', campaign.id);

  // Log the action
  await supabase.rpc('log_campaign_action', {
    p_campaign_id: campaign.id,
    p_company_id: campaign.company_id,
    p_action: 'Campaign started',
    p_action_type: 'started',
    p_details: { started_at: new Date().toISOString() },
  });

  // Process the first batch
  const result = await processBatch(supabase, campaign);
  return result;
}

async function pauseCampaign(supabase: any, campaign: any) {
  await supabase
    .from('campaigns')
    .update({ status: 'paused' })
    .eq('id', campaign.id);

  await supabase.rpc('log_campaign_action', {
    p_campaign_id: campaign.id,
    p_company_id: campaign.company_id,
    p_action: 'Campaign paused',
    p_action_type: 'paused',
    p_details: { paused_at: new Date().toISOString() },
  });

  return new Response(JSON.stringify({ success: true, message: 'Campaign paused' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function resumeCampaign(supabase: any, campaign: any) {
  await supabase
    .from('campaigns')
    .update({ status: 'sending' })
    .eq('id', campaign.id);

  await supabase.rpc('log_campaign_action', {
    p_campaign_id: campaign.id,
    p_company_id: campaign.company_id,
    p_action: 'Campaign resumed',
    p_action_type: 'resumed',
    p_details: { resumed_at: new Date().toISOString() },
  });

  return await processBatch(supabase, campaign);
}

async function processBatch(supabase: any, campaign: any) {
  const batchSize = campaign.rate_limit_per_second || 80;
  
  // Get queued recipients
  const { data: recipients, error: recipientsError } = await supabase
    .from('campaign_recipients')
    .select('id, phone_number, name, template_variables')
    .eq('campaign_id', campaign.id)
    .eq('delivery_status', 'queued')
    .limit(batchSize);

  if (recipientsError) {
    console.error('Error fetching recipients:', recipientsError);
    return new Response(JSON.stringify({ error: 'Failed to fetch recipients' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!recipients || recipients.length === 0) {
    // No more recipients, mark campaign as completed
    await supabase
      .from('campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaign.id);

    await supabase.rpc('log_campaign_action', {
      p_campaign_id: campaign.id,
      p_company_id: campaign.company_id,
      p_action: 'Campaign completed',
      p_action_type: 'completed',
      p_details: { completed_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, message: 'Campaign completed', processed: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get Meta access token
  const phoneNumberData = campaign.whatsapp_phone_numbers;
  const accessToken = phoneNumberData?.whatsapp_business_accounts?.access_token_encrypted;
  const phoneNumberId = phoneNumberData?.phone_number_id;
  const template = campaign.whatsapp_templates as WhatsAppTemplate;

  if (!accessToken || !phoneNumberId || !template) {
    console.error('Missing required data for sending messages');
    return new Response(JSON.stringify({ error: 'Missing WhatsApp configuration' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Process each recipient
  const results = await Promise.allSettled(
    recipients.map((recipient: CampaignRecipient) => 
      sendWhatsAppMessage(supabase, campaign, recipient, template, phoneNumberId, accessToken)
    )
  );

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

  // Update campaign sent count
  await supabase
    .from('campaigns')
    .update({ sent_count: (campaign.sent_count || 0) + successCount })
    .eq('id', campaign.id);

  // Check if there are more recipients
  const { count: remainingCount } = await supabase
    .from('campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
    .eq('delivery_status', 'queued');

  return new Response(JSON.stringify({ 
    success: true, 
    processed: recipients.length,
    sent: successCount,
    failed: failCount,
    remaining: remainingCount || 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendWhatsAppMessage(
  supabase: any, 
  campaign: any, 
  recipient: CampaignRecipient, 
  template: WhatsAppTemplate,
  phoneNumberId: string,
  accessToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Mark as sending
    await supabase
      .from('campaign_recipients')
      .update({ delivery_status: 'sending' })
      .eq('id', recipient.id);

    // Build template components
    const components: any[] = [];
    
    // Add header component if exists
    if (template.header_type && template.header_type !== 'NONE' && template.header_content) {
      if (template.header_type === 'TEXT') {
        components.push({
          type: 'header',
          parameters: [{ type: 'text', text: template.header_content }]
        });
      }
    }

    // Add body parameters from template variables
    const bodyParams = Object.values(recipient.template_variables || {}).map(value => ({
      type: 'text',
      text: String(value)
    }));

    if (bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParams
      });
    }

    // Build the request payload
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient.phone_number.replace(/[^0-9]/g, ''),
      type: 'template',
      template: {
        name: template.template_name,
        language: { code: template.language },
        components: components.length > 0 ? components : undefined
      }
    };

    // Send message via Meta API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.error?.message || 'Failed to send message';
      const errorCode = result.error?.code?.toString() || 'unknown';
      
      // Update recipient status to failed
      await supabase
        .from('campaign_recipients')
        .update({ 
          delivery_status: 'failed',
          error_message: errorMessage,
          error_code: errorCode,
          failed_at: new Date().toISOString(),
          retry_count: (recipient as any).retry_count + 1
        })
        .eq('id', recipient.id);

      // Log the failure
      await supabase.rpc('log_campaign_action', {
        p_campaign_id: campaign.id,
        p_company_id: campaign.company_id,
        p_action: `Message failed: ${errorMessage}`,
        p_action_type: 'failed',
        p_details: { error: result.error, phone: recipient.phone_number },
        p_recipient_id: recipient.id,
      });

      return { success: false, error: errorMessage };
    }

    const messageId = result.messages?.[0]?.id;

    // Update recipient status to sent
    await supabase
      .from('campaign_recipients')
      .update({ 
        delivery_status: 'sent',
        meta_message_id: messageId,
        sent_at: new Date().toISOString()
      })
      .eq('id', recipient.id);

    // Log successful send
    await supabase.rpc('log_campaign_action', {
      p_campaign_id: campaign.id,
      p_company_id: campaign.company_id,
      p_action: 'Message sent',
      p_action_type: 'sent',
      p_details: { message_id: messageId, phone: recipient.phone_number },
      p_recipient_id: recipient.id,
    });

    return { success: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error sending to ${recipient.phone_number}:`, error);
    
    await supabase
      .from('campaign_recipients')
      .update({ 
        delivery_status: 'failed',
        error_message: message,
        failed_at: new Date().toISOString()
      })
      .eq('id', recipient.id);

    return { success: false, error: message };
  }
}
