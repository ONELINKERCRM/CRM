import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'onelinker_whatsapp_webhook';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    } else {
      console.error('Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }
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
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Process webhook entries
    const entries = payload.entry || [];
    
    for (const entry of entries) {
      const changes = entry.changes || [];
      
      for (const change of changes) {
        if (change.field === 'messages') {
          const value = change.value;
          
          // Process message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await processStatusUpdate(supabase, status);
            }
          }
          
          // Process incoming messages (for future inbox features)
          if (value.messages) {
            for (const message of value.messages) {
              await processIncomingMessage(supabase, message, value.contacts);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processStatusUpdate(supabase: any, status: any) {
  const messageId = status.id;
  const statusType = status.status; // sent, delivered, read, failed
  const timestamp = status.timestamp;
  const recipientPhone = status.recipient_id;

  console.log(`Processing status update: ${messageId} -> ${statusType}`);

  // Find the recipient by meta_message_id
  const { data: recipient, error } = await supabase
    .from('campaign_recipients')
    .select('id, campaign_id, company_id')
    .eq('meta_message_id', messageId)
    .single();

  if (error || !recipient) {
    console.log(`Recipient not found for message ${messageId}`);
    return;
  }

  // Map Meta status to our status
  let deliveryStatus = statusType;
  const updateData: any = { updated_at: new Date().toISOString() };

  switch (statusType) {
    case 'sent':
      deliveryStatus = 'sent';
      updateData.sent_at = new Date(parseInt(timestamp) * 1000).toISOString();
      break;
    case 'delivered':
      deliveryStatus = 'delivered';
      updateData.delivered_at = new Date(parseInt(timestamp) * 1000).toISOString();
      break;
    case 'read':
      deliveryStatus = 'read';
      updateData.read_at = new Date(parseInt(timestamp) * 1000).toISOString();
      break;
    case 'failed':
      deliveryStatus = 'failed';
      updateData.failed_at = new Date(parseInt(timestamp) * 1000).toISOString();
      if (status.errors?.[0]) {
        updateData.error_message = status.errors[0].message;
        updateData.error_code = status.errors[0].code?.toString();
      }
      break;
  }

  updateData.delivery_status = deliveryStatus;

  // Update recipient status
  await supabase
    .from('campaign_recipients')
    .update(updateData)
    .eq('id', recipient.id);

  // Log the status update
  await supabase.rpc('log_campaign_action', {
    p_campaign_id: recipient.campaign_id,
    p_company_id: recipient.company_id,
    p_action: `Message ${deliveryStatus}`,
    p_action_type: deliveryStatus,
    p_details: { 
      message_id: messageId, 
      timestamp,
      phone: recipientPhone,
      errors: status.errors 
    },
    p_recipient_id: recipient.id,
  });

  // Update campaign counts based on status
  if (deliveryStatus === 'delivered') {
    await supabase.rpc('increment_campaign_count', {
      p_campaign_id: recipient.campaign_id,
      p_field: 'delivered_count'
    });
  } else if (deliveryStatus === 'read') {
    await supabase.rpc('increment_campaign_count', {
      p_campaign_id: recipient.campaign_id,
      p_field: 'opened_count'
    });
  } else if (deliveryStatus === 'failed') {
    await supabase.rpc('increment_campaign_count', {
      p_campaign_id: recipient.campaign_id,
      p_field: 'failed_count'
    });
  }

  console.log(`Updated recipient ${recipient.id} to status ${deliveryStatus}`);
}

async function processIncomingMessage(supabase: any, message: any, contacts: any[]) {
  console.log('Incoming message:', message);
  
  // This can be extended to handle incoming WhatsApp messages
  // For now, we just log them
  const from = message.from;
  const messageType = message.type;
  const timestamp = message.timestamp;
  const contact = contacts?.find((c: any) => c.wa_id === from);

  // Find lead by phone number
  const normalizedPhone = from.replace(/[^0-9]/g, '');
  const { data: lead } = await supabase
    .from('leads')
    .select('id, company_id')
    .or(`phone.eq.${normalizedPhone},normalized_phone.eq.${normalizedPhone}`)
    .single();

  if (lead) {
    // Log as lead activity
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      company_id: lead.company_id,
      type: 'whatsapp_received',
      title: 'WhatsApp Message Received',
      description: messageType === 'text' ? message.text?.body : `Received ${messageType} message`,
      agent_name: 'System',
      created_at: new Date(parseInt(timestamp) * 1000).toISOString()
    });
  }
}
