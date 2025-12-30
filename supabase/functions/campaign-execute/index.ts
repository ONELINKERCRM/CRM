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
  recipient_email?: string;
}

interface MarketingConnection {
  id: string;
  channel: string;
  provider: string;
  identifier: string;
  credentials: {
    accessToken?: string;
    phoneNumberId?: string;
    businessId?: string;
    apiKey?: string;
    accountSid?: string;
    authToken?: string;
    domain?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
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

    // Get campaign with connection details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        marketing_connections!connection_id (
          id,
          channel,
          provider,
          identifier,
          credentials,
          status
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

    console.log('Campaign loaded:', { 
      id: campaign.id, 
      channel: campaign.channel,
      connection: campaign.marketing_connections?.provider 
    });

    // Handle different actions
    switch (action) {
      case 'start':
        return await startCampaign(supabase, campaign);
      case 'pause':
        return await pauseCampaign(supabase, campaign);
      case 'resume':
        return await resumeCampaign(supabase, campaign);
      case 'process_batch':
        return await processBatch(supabase, campaign);
      default:
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
  console.log(`Starting campaign ${campaign.id} on channel ${campaign.channel}`);

  await supabase
    .from('campaigns')
    .update({ status: 'sending', started_at: new Date().toISOString() })
    .eq('id', campaign.id);

  await logCampaignAction(supabase, campaign, 'Campaign started', 'started');

  return await processBatch(supabase, campaign);
}

async function pauseCampaign(supabase: any, campaign: any) {
  await supabase
    .from('campaigns')
    .update({ status: 'paused' })
    .eq('id', campaign.id);

  await logCampaignAction(supabase, campaign, 'Campaign paused', 'paused');

  return new Response(JSON.stringify({ success: true, message: 'Campaign paused' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function resumeCampaign(supabase: any, campaign: any) {
  await supabase
    .from('campaigns')
    .update({ status: 'sending' })
    .eq('id', campaign.id);

  await logCampaignAction(supabase, campaign, 'Campaign resumed', 'resumed');

  return await processBatch(supabase, campaign);
}

async function processBatch(supabase: any, campaign: any) {
  const batchSize = campaign.rate_limit_per_second || 50;
  const connection = campaign.marketing_connections as MarketingConnection | null;

  if (!connection) {
    console.error('No connection found for campaign');
    return new Response(JSON.stringify({ error: 'No connection configured' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get queued recipients with consent check
  const { data: recipients, error: recipientsError } = await supabase
    .from('campaign_recipients')
    .select(`
      id, phone_number, name, template_variables, recipient_email, lead_id, consent_checked,
      leads:lead_id (opted_in, opted_in_whatsapp, opted_in_sms, opted_in_email)
    `)
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
    // Campaign completed
    await supabase
      .from('campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaign.id);

    await logCampaignAction(supabase, campaign, 'Campaign completed', 'completed');

    return new Response(JSON.stringify({ success: true, message: 'Campaign completed', processed: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`Processing ${recipients.length} recipients for ${campaign.channel}`);

  // Route to appropriate channel handler
  let results: PromiseSettledResult<{ success: boolean; error?: string }>[];

  switch (campaign.channel) {
    case 'whatsapp':
      results = await processWhatsAppBatch(supabase, campaign, recipients, connection);
      break;
    case 'email':
      results = await processEmailBatch(supabase, campaign, recipients, connection);
      break;
    case 'sms':
      results = await processSMSBatch(supabase, campaign, recipients, connection);
      break;
    default:
      return new Response(JSON.stringify({ error: 'Unsupported channel' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
  }

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

  // Update campaign counts
  await supabase
    .from('campaigns')
    .update({ 
      sent_count: (campaign.sent_count || 0) + successCount,
      failed_count: (campaign.failed_count || 0) + failCount 
    })
    .eq('id', campaign.id);

  // Get remaining count
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

// ==================== WHATSAPP ====================
async function processWhatsAppBatch(
  supabase: any, 
  campaign: any, 
  recipients: CampaignRecipient[], 
  connection: MarketingConnection
) {
  const { provider, credentials } = connection;
  
  return await Promise.allSettled(
    recipients.map(recipient => 
      sendWhatsAppMessage(supabase, campaign, recipient, connection)
    )
  );
}

async function sendWhatsAppMessage(
  supabase: any,
  campaign: any,
  recipient: CampaignRecipient,
  connection: MarketingConnection
): Promise<{ success: boolean; error?: string }> {
  const { provider, credentials } = connection;
  
  try {
    await supabase
      .from('campaign_recipients')
      .update({ delivery_status: 'sending' })
      .eq('id', recipient.id);

    let result: { success: boolean; messageId?: string; error?: string };

    switch (provider) {
      case 'meta':
        result = await sendMetaWhatsApp(campaign, recipient, credentials);
        break;
      case 'twilio':
        result = await sendTwilioWhatsApp(campaign, recipient, credentials);
        break;
      case '360dialog':
        result = await send360DialogWhatsApp(campaign, recipient, credentials);
        break;
      default:
        result = { success: false, error: `Unsupported provider: ${provider}` };
    }

    if (result.success) {
      await supabase
        .from('campaign_recipients')
        .update({ 
          delivery_status: 'sent',
          meta_message_id: result.messageId,
          sent_at: new Date().toISOString()
        })
        .eq('id', recipient.id);

      await logCampaignAction(supabase, campaign, 'WhatsApp message sent', 'sent', recipient.id);
    } else {
      await supabase
        .from('campaign_recipients')
        .update({ 
          delivery_status: 'failed',
          error_message: result.error,
          failed_at: new Date().toISOString()
        })
        .eq('id', recipient.id);

      await logCampaignAction(supabase, campaign, `Failed: ${result.error}`, 'failed', recipient.id);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`WhatsApp send error for ${recipient.phone_number}:`, error);
    
    await supabase
      .from('campaign_recipients')
      .update({ delivery_status: 'failed', error_message: message, failed_at: new Date().toISOString() })
      .eq('id', recipient.id);

    return { success: false, error: message };
  }
}

async function sendMetaWhatsApp(campaign: any, recipient: CampaignRecipient, credentials: any) {
  const { accessToken, phoneNumberId } = credentials;
  
  if (!accessToken || !phoneNumberId) {
    return { success: false, error: 'Missing Meta WhatsApp credentials' };
  }

  const template = campaign.whatsapp_templates;
  const templateContent = campaign.template_content;

  let payload: any;

  if (template) {
    // Template message
    const components: any[] = [];
    const bodyParams = Object.values(recipient.template_variables || {}).map(value => ({
      type: 'text',
      text: String(value)
    }));

    if (bodyParams.length > 0) {
      components.push({ type: 'body', parameters: bodyParams });
    }

    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient.phone_number.replace(/[^0-9]/g, ''),
      type: 'template',
      template: {
        name: template.template_name,
        language: { code: template.language || 'en' },
        components: components.length > 0 ? components : undefined
      }
    };
  } else if (templateContent?.body) {
    // Custom text message
    let body = templateContent.body;
    // Replace variables
    body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');
    body = body.replace(/\{\{phone\}\}/gi, recipient.phone_number);
    
    for (const [key, value] of Object.entries(recipient.template_variables || {})) {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), String(value));
    }

    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient.phone_number.replace(/[^0-9]/g, ''),
      type: 'text',
      text: { preview_url: false, body }
    };
  } else {
    return { success: false, error: 'No template or content configured' };
  }

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
    return { success: false, error: result.error?.message || 'Meta API error' };
  }

  return { success: true, messageId: result.messages?.[0]?.id };
}

async function sendTwilioWhatsApp(campaign: any, recipient: CampaignRecipient, credentials: any) {
  const { accountSid, authToken, phoneNumber: fromNumber } = credentials;
  
  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Missing Twilio credentials' };
  }

  const templateContent = campaign.template_content;
  let body = templateContent?.body || 'Hello from our campaign!';
  
  // Replace variables
  body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');
  body = body.replace(/\{\{phone\}\}/gi, recipient.phone_number);

  const toNumber = `whatsapp:${recipient.phone_number.replace(/[^0-9+]/g, '')}`;
  const twilioFrom = `whatsapp:${fromNumber.replace(/[^0-9+]/g, '')}`;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioFrom,
        To: toNumber,
        Body: body,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result.message || 'Twilio API error' };
  }

  return { success: true, messageId: result.sid };
}

async function send360DialogWhatsApp(campaign: any, recipient: CampaignRecipient, credentials: any) {
  const { apiKey } = credentials;
  
  if (!apiKey) {
    return { success: false, error: 'Missing 360dialog API key' };
  }

  const templateContent = campaign.template_content;
  let body = templateContent?.body || 'Hello from our campaign!';
  
  body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');

  const response = await fetch('https://waba.360dialog.io/v1/messages', {
    method: 'POST',
    headers: {
      'D360-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: recipient.phone_number.replace(/[^0-9]/g, ''),
      type: 'text',
      text: { body }
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result.meta?.developer_message || '360dialog API error' };
  }

  return { success: true, messageId: result.messages?.[0]?.id };
}

// ==================== EMAIL ====================
async function processEmailBatch(
  supabase: any,
  campaign: any,
  recipients: CampaignRecipient[],
  connection: MarketingConnection
) {
  return await Promise.allSettled(
    recipients.map(recipient => 
      sendEmailMessage(supabase, campaign, recipient, connection)
    )
  );
}

async function sendEmailMessage(
  supabase: any,
  campaign: any,
  recipient: CampaignRecipient,
  connection: MarketingConnection
): Promise<{ success: boolean; error?: string }> {
  const { provider, credentials, identifier } = connection;
  
  try {
    await supabase
      .from('campaign_recipients')
      .update({ delivery_status: 'sending' })
      .eq('id', recipient.id);

    let result: { success: boolean; messageId?: string; error?: string };

    switch (provider) {
      case 'resend':
        result = await sendResendEmail(campaign, recipient, credentials, identifier);
        break;
      case 'sendgrid':
        result = await sendSendGridEmail(campaign, recipient, credentials, identifier);
        break;
      case 'mailgun':
        result = await sendMailgunEmail(campaign, recipient, credentials, identifier);
        break;
      default:
        result = { success: false, error: `Unsupported email provider: ${provider}` };
    }

    if (result.success) {
      await supabase
        .from('campaign_recipients')
        .update({ 
          delivery_status: 'sent',
          meta_message_id: result.messageId,
          sent_at: new Date().toISOString()
        })
        .eq('id', recipient.id);

      await logCampaignAction(supabase, campaign, 'Email sent', 'sent', recipient.id);
    } else {
      await supabase
        .from('campaign_recipients')
        .update({ 
          delivery_status: 'failed',
          error_message: result.error,
          failed_at: new Date().toISOString()
        })
        .eq('id', recipient.id);

      await logCampaignAction(supabase, campaign, `Email failed: ${result.error}`, 'failed', recipient.id);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Email send error:`, error);
    
    await supabase
      .from('campaign_recipients')
      .update({ delivery_status: 'failed', error_message: message, failed_at: new Date().toISOString() })
      .eq('id', recipient.id);

    return { success: false, error: message };
  }
}

async function sendResendEmail(campaign: any, recipient: CampaignRecipient, credentials: any, fromEmail: string) {
  const { apiKey } = credentials;
  
  if (!apiKey) {
    return { success: false, error: 'Missing Resend API key' };
  }

  const templateContent = campaign.template_content || {};
  let subject = templateContent.subject || campaign.name;
  let body = templateContent.body || templateContent.html || `<p>Hello ${recipient.name || 'there'}!</p>`;
  
  // Replace variables
  subject = subject.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');
  body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');

  const recipientEmail = recipient.recipient_email || recipient.template_variables?.email;
  
  if (!recipientEmail) {
    return { success: false, error: 'No recipient email' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipientEmail],
      subject,
      html: body,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result.message || 'Resend API error' };
  }

  return { success: true, messageId: result.id };
}

async function sendSendGridEmail(campaign: any, recipient: CampaignRecipient, credentials: any, fromEmail: string) {
  const { apiKey } = credentials;
  
  if (!apiKey) {
    return { success: false, error: 'Missing SendGrid API key' };
  }

  const templateContent = campaign.template_content || {};
  let subject = templateContent.subject || campaign.name;
  let body = templateContent.body || templateContent.html || `<p>Hello ${recipient.name || 'there'}!</p>`;
  
  subject = subject.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');
  body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');

  const recipientEmail = recipient.recipient_email || recipient.template_variables?.email;
  
  if (!recipientEmail) {
    return { success: false, error: 'No recipient email' };
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipientEmail }] }],
      from: { email: fromEmail },
      subject,
      content: [{ type: 'text/html', value: body }],
    }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    return { success: false, error: result.errors?.[0]?.message || 'SendGrid API error' };
  }

  return { success: true, messageId: response.headers.get('x-message-id') || undefined };
}

async function sendMailgunEmail(campaign: any, recipient: CampaignRecipient, credentials: any, fromEmail: string) {
  const { apiKey, domain } = credentials;
  
  if (!apiKey || !domain) {
    return { success: false, error: 'Missing Mailgun credentials' };
  }

  const templateContent = campaign.template_content || {};
  let subject = templateContent.subject || campaign.name;
  let body = templateContent.body || templateContent.html || `<p>Hello ${recipient.name || 'there'}!</p>`;
  
  subject = subject.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');
  body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');

  const recipientEmail = recipient.recipient_email || recipient.template_variables?.email;
  
  if (!recipientEmail) {
    return { success: false, error: 'No recipient email' };
  }

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`api:${apiKey}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html: body,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result.message || 'Mailgun API error' };
  }

  return { success: true, messageId: result.id };
}

// ==================== SMS ====================
async function processSMSBatch(
  supabase: any,
  campaign: any,
  recipients: CampaignRecipient[],
  connection: MarketingConnection
) {
  return await Promise.allSettled(
    recipients.map(recipient => 
      sendSMSMessage(supabase, campaign, recipient, connection)
    )
  );
}

async function sendSMSMessage(
  supabase: any,
  campaign: any,
  recipient: CampaignRecipient,
  connection: MarketingConnection
): Promise<{ success: boolean; error?: string }> {
  const { provider, credentials, identifier } = connection;
  
  try {
    await supabase
      .from('campaign_recipients')
      .update({ delivery_status: 'sending' })
      .eq('id', recipient.id);

    let result: { success: boolean; messageId?: string; error?: string };

    switch (provider) {
      case 'twilio':
        result = await sendTwilioSMS(campaign, recipient, credentials, identifier);
        break;
      case 'messagebird':
        result = await sendMessageBirdSMS(campaign, recipient, credentials, identifier);
        break;
      case 'vonage':
        result = await sendVonageSMS(campaign, recipient, credentials, identifier);
        break;
      default:
        result = { success: false, error: `Unsupported SMS provider: ${provider}` };
    }

    if (result.success) {
      await supabase
        .from('campaign_recipients')
        .update({ 
          delivery_status: 'sent',
          meta_message_id: result.messageId,
          sent_at: new Date().toISOString()
        })
        .eq('id', recipient.id);

      await logCampaignAction(supabase, campaign, 'SMS sent', 'sent', recipient.id);
    } else {
      await supabase
        .from('campaign_recipients')
        .update({ 
          delivery_status: 'failed',
          error_message: result.error,
          failed_at: new Date().toISOString()
        })
        .eq('id', recipient.id);

      await logCampaignAction(supabase, campaign, `SMS failed: ${result.error}`, 'failed', recipient.id);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`SMS send error:`, error);
    
    await supabase
      .from('campaign_recipients')
      .update({ delivery_status: 'failed', error_message: message, failed_at: new Date().toISOString() })
      .eq('id', recipient.id);

    return { success: false, error: message };
  }
}

async function sendTwilioSMS(campaign: any, recipient: CampaignRecipient, credentials: any, fromNumber: string) {
  const { accountSid, authToken } = credentials;
  
  if (!accountSid || !authToken) {
    return { success: false, error: 'Missing Twilio credentials' };
  }

  const templateContent = campaign.template_content || {};
  let body = templateContent.body || 'Hello from our campaign!';
  
  body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');
  body = body.replace(/\{\{phone\}\}/gi, recipient.phone_number);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: recipient.phone_number.replace(/[^0-9+]/g, ''),
        Body: body,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result.message || 'Twilio API error' };
  }

  return { success: true, messageId: result.sid };
}

async function sendMessageBirdSMS(campaign: any, recipient: CampaignRecipient, credentials: any, fromNumber: string) {
  const { apiKey } = credentials;
  
  if (!apiKey) {
    return { success: false, error: 'Missing MessageBird API key' };
  }

  const templateContent = campaign.template_content || {};
  let body = templateContent.body || 'Hello from our campaign!';
  
  body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');

  const response = await fetch('https://rest.messagebird.com/messages', {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      originator: fromNumber,
      recipients: [recipient.phone_number.replace(/[^0-9]/g, '')],
      body,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    return { success: false, error: result.errors?.[0]?.description || 'MessageBird API error' };
  }

  return { success: true, messageId: result.id };
}

async function sendVonageSMS(campaign: any, recipient: CampaignRecipient, credentials: any, fromNumber: string) {
  const { apiKey, apiSecret } = credentials;
  
  if (!apiKey || !apiSecret) {
    return { success: false, error: 'Missing Vonage credentials' };
  }

  const templateContent = campaign.template_content || {};
  let body = templateContent.body || 'Hello from our campaign!';
  
  body = body.replace(/\{\{name\}\}/gi, recipient.name || 'Customer');

  const response = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      api_secret: apiSecret,
      from: fromNumber,
      to: recipient.phone_number.replace(/[^0-9]/g, ''),
      text: body,
    }),
  });

  const result = await response.json();

  if (result.messages?.[0]?.status !== '0') {
    return { success: false, error: result.messages?.[0]?.['error-text'] || 'Vonage API error' };
  }

  return { success: true, messageId: result.messages?.[0]?.['message-id'] };
}

// ==================== HELPERS ====================
async function logCampaignAction(
  supabase: any, 
  campaign: any, 
  action: string, 
  actionType: string, 
  recipientId?: string
) {
  try {
    await supabase.from('campaign_logs').insert({
      campaign_id: campaign.id,
      company_id: campaign.company_id,
      action,
      action_type: actionType,
      recipient_id: recipientId,
      details: { timestamp: new Date().toISOString() }
    });
  } catch (e) {
    console.error('Failed to log campaign action:', e);
  }
}
