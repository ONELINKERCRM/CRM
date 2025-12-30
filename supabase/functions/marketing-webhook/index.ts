import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Universal Marketing Webhook Handler
 * Handles delivery status updates from multiple providers:
 * - Meta (WhatsApp Business API)
 * - Twilio (SMS & WhatsApp)
 * - SendGrid (Email)
 * - MessageBird (SMS)
 * - Resend (Email)
 */
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider') || 'meta';

  // Handle Meta webhook verification
  if (req.method === 'GET' && provider === 'meta') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'onelinker_webhook';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Meta webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log(`Webhook from ${provider}:`, JSON.stringify(payload).slice(0, 500));

    let updates: WebhookUpdate[] = [];

    switch (provider) {
      case 'meta':
        updates = parseMetaWebhook(payload);
        break;
      case 'twilio':
        updates = parseTwilioWebhook(payload);
        break;
      case 'sendgrid':
        updates = parseSendGridWebhook(payload);
        break;
      case 'messagebird':
        updates = parseMessageBirdWebhook(payload);
        break;
      case 'resend':
        updates = parseResendWebhook(payload);
        break;
      default:
        console.log(`Unknown provider: ${provider}`);
    }

    // Process all updates
    for (const update of updates) {
      await processStatusUpdate(supabase, update, provider);
    }

    // Store raw webhook for debugging
    if (updates.length > 0) {
      const firstUpdate = updates[0];
      await supabase.from('marketing_webhooks').insert({
        company_id: firstUpdate.companyId || '00000000-0000-0000-0000-000000000000',
        provider,
        event_type: firstUpdate.status,
        message_id: firstUpdate.messageId,
        payload,
        status: 'processed',
        processed: true,
        processed_at: new Date().toISOString()
      }).then(result => {
        if (result.error) console.log('Webhook log error:', result.error);
      });
    }

    return new Response(JSON.stringify({ success: true, processed: updates.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface WebhookUpdate {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'clicked' | 'opened';
  timestamp: Date;
  errorMessage?: string;
  errorCode?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  companyId?: string;
}

// ==================== PARSERS ====================

function parseMetaWebhook(payload: any): WebhookUpdate[] {
  const updates: WebhookUpdate[] = [];
  
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages' && change.value?.statuses) {
        for (const status of change.value.statuses) {
          updates.push({
            messageId: status.id,
            status: mapMetaStatus(status.status),
            timestamp: new Date(parseInt(status.timestamp) * 1000),
            errorMessage: status.errors?.[0]?.message,
            errorCode: status.errors?.[0]?.code?.toString(),
            recipientPhone: status.recipient_id
          });
        }
      }
    }
  }
  
  return updates;
}

function mapMetaStatus(status: string): WebhookUpdate['status'] {
  switch (status) {
    case 'sent': return 'sent';
    case 'delivered': return 'delivered';
    case 'read': return 'read';
    case 'failed': return 'failed';
    default: return 'sent';
  }
}

function parseTwilioWebhook(payload: any): WebhookUpdate[] {
  // Twilio sends form-urlencoded data, but we receive it as JSON from our middleware
  const status = payload.MessageStatus || payload.SmsStatus;
  const messageSid = payload.MessageSid || payload.SmsSid;
  
  if (!messageSid) return [];
  
  return [{
    messageId: messageSid,
    status: mapTwilioStatus(status),
    timestamp: new Date(),
    errorMessage: payload.ErrorMessage,
    errorCode: payload.ErrorCode,
    recipientPhone: payload.To
  }];
}

function mapTwilioStatus(status: string): WebhookUpdate['status'] {
  switch (status?.toLowerCase()) {
    case 'queued':
    case 'sending':
    case 'sent': return 'sent';
    case 'delivered': return 'delivered';
    case 'read': return 'read';
    case 'failed':
    case 'undelivered': return 'failed';
    default: return 'sent';
  }
}

function parseSendGridWebhook(payload: any): WebhookUpdate[] {
  // SendGrid sends an array of events
  const events = Array.isArray(payload) ? payload : [payload];
  
  return events.map(event => ({
    messageId: event.sg_message_id || event['smtp-id'] || '',
    status: mapSendGridStatus(event.event),
    timestamp: new Date(event.timestamp * 1000),
    errorMessage: event.reason,
    recipientEmail: event.email
  })).filter(u => u.messageId);
}

function mapSendGridStatus(event: string): WebhookUpdate['status'] {
  switch (event?.toLowerCase()) {
    case 'processed':
    case 'deferred': return 'sent';
    case 'delivered': return 'delivered';
    case 'open': return 'opened';
    case 'click': return 'clicked';
    case 'bounce':
    case 'dropped': return 'bounced';
    case 'spamreport':
    case 'unsubscribe': return 'failed';
    default: return 'sent';
  }
}

function parseMessageBirdWebhook(payload: any): WebhookUpdate[] {
  if (!payload.id) return [];
  
  return [{
    messageId: payload.id,
    status: mapMessageBirdStatus(payload.status),
    timestamp: new Date(payload.statusDatetime || Date.now()),
    errorMessage: payload.statusErrorCode ? `Error: ${payload.statusErrorCode}` : undefined,
    recipientPhone: payload.recipient
  }];
}

function mapMessageBirdStatus(status: string): WebhookUpdate['status'] {
  switch (status?.toLowerCase()) {
    case 'sent':
    case 'buffered': return 'sent';
    case 'delivered': return 'delivered';
    case 'expired':
    case 'delivery_failed': return 'failed';
    default: return 'sent';
  }
}

function parseResendWebhook(payload: any): WebhookUpdate[] {
  if (!payload.data?.email_id) return [];
  
  return [{
    messageId: payload.data.email_id,
    status: mapResendStatus(payload.type),
    timestamp: new Date(payload.created_at || Date.now()),
    errorMessage: payload.data.error?.message,
    recipientEmail: payload.data.to?.[0]
  }];
}

function mapResendStatus(type: string): WebhookUpdate['status'] {
  switch (type) {
    case 'email.sent': return 'sent';
    case 'email.delivered': return 'delivered';
    case 'email.opened': return 'opened';
    case 'email.clicked': return 'clicked';
    case 'email.bounced': return 'bounced';
    case 'email.complained': return 'failed';
    default: return 'sent';
  }
}

// ==================== PROCESSOR ====================

async function processStatusUpdate(supabase: any, update: WebhookUpdate, provider: string) {
  console.log(`Processing ${provider} status: ${update.messageId} -> ${update.status}`);

  // Find recipient by message ID
  const { data: recipient, error } = await supabase
    .from('campaign_recipients')
    .select('id, campaign_id, company_id, delivery_status')
    .eq('meta_message_id', update.messageId)
    .single();

  if (error || !recipient) {
    console.log(`Recipient not found for ${update.messageId}`);
    return;
  }

  // Don't downgrade status (e.g., don't change 'read' back to 'delivered')
  const statusOrder = ['queued', 'sending', 'sent', 'delivered', 'opened', 'read', 'clicked'];
  const currentIndex = statusOrder.indexOf(recipient.delivery_status);
  const newIndex = statusOrder.indexOf(update.status);
  
  if (update.status !== 'failed' && update.status !== 'bounced' && newIndex <= currentIndex) {
    console.log(`Skipping status downgrade: ${recipient.delivery_status} -> ${update.status}`);
    return;
  }

  // Build update data
  const updateData: Record<string, any> = {
    delivery_status: update.status === 'opened' ? 'read' : update.status,
    updated_at: new Date().toISOString()
  };

  switch (update.status) {
    case 'sent':
      updateData.sent_at = update.timestamp.toISOString();
      break;
    case 'delivered':
      updateData.delivered_at = update.timestamp.toISOString();
      break;
    case 'read':
    case 'opened':
      updateData.read_at = update.timestamp.toISOString();
      break;
    case 'clicked':
      updateData.read_at = updateData.read_at || update.timestamp.toISOString();
      break;
    case 'failed':
    case 'bounced':
      updateData.failed_at = update.timestamp.toISOString();
      updateData.error_message = update.errorMessage;
      updateData.error_code = update.errorCode;
      break;
  }

  // Update recipient
  await supabase
    .from('campaign_recipients')
    .update(updateData)
    .eq('id', recipient.id);

  // Update campaign counters
  const counterField = getCounterField(update.status);
  if (counterField) {
    await supabase.rpc('increment', {
      row_id: recipient.campaign_id,
      table_name: 'campaigns',
      field_name: counterField
    }).catch(() => {
      // Fallback: manual increment
      supabase
        .from('campaigns')
        .select(counterField)
        .eq('id', recipient.campaign_id)
        .single()
        .then(({ data }: any) => {
          if (data) {
            supabase
              .from('campaigns')
              .update({ [counterField]: (data[counterField] || 0) + 1 })
              .eq('id', recipient.campaign_id);
          }
        });
    });
  }

  // Log the update
  await supabase.from('campaign_logs').insert({
    campaign_id: recipient.campaign_id,
    company_id: recipient.company_id,
    action: `${provider}: ${update.status}`,
    action_type: update.status,
    recipient_id: recipient.id,
    details: { 
      message_id: update.messageId,
      error: update.errorMessage,
      provider
    }
  });

  console.log(`Updated recipient ${recipient.id} to ${update.status}`);
}

function getCounterField(status: string): string | null {
  switch (status) {
    case 'delivered': return 'delivered_count';
    case 'read':
    case 'opened': return 'opened_count';
    case 'clicked': return 'clicked_count';
    case 'failed':
    case 'bounced': return 'failed_count';
    default: return null;
  }
}
