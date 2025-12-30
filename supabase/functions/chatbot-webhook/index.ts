import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  document?: { id: string; filename?: string };
}

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: IncomingMessage[];
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
          errors?: Array<{ code: number; message: string }>;
        }>;
      };
    }>;
  }>;
}

/**
 * WhatsApp Chatbot Webhook Handler
 * Processes incoming messages and routes them to active chatbots
 */
Deno.serve(async (req) => {
  // Handle webhook verification
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'onelinker_chatbot_webhook';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Chatbot webhook verified');
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

    const payload: WebhookPayload = await req.json();
    console.log('Chatbot webhook received:', JSON.stringify(payload).slice(0, 500));

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const { metadata, messages, statuses, contacts } = change.value;
          const phoneNumberId = metadata.phone_number_id;

          // Process status updates
          if (statuses) {
            for (const status of statuses) {
              await processStatusUpdate(supabase, status);
            }
          }

          // Process incoming messages
          if (messages) {
            for (const message of messages) {
              const contact = contacts?.find(c => c.wa_id === message.from);
              await processIncomingMessage(supabase, message, phoneNumberId, contact?.profile?.name);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chatbot webhook error:', error);
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processIncomingMessage(
  supabase: any,
  message: IncomingMessage,
  phoneNumberId: string,
  senderName?: string
) {
  const startTime = Date.now();
  const senderPhone = message.from;
  const messageContent = message.text?.body || `[${message.type}]`;

  console.log(`Processing message from ${senderPhone}: ${messageContent.slice(0, 100)}`);

  // Find company and active chatbot for this phone number
  const { data: phoneData } = await supabase
    .from('whatsapp_phone_numbers')
    .select('id, company_id, phone_number_id')
    .eq('phone_number_id', phoneNumberId)
    .single();

  if (!phoneData) {
    console.log('Phone number not found in system:', phoneNumberId);
    return;
  }

  const companyId = phoneData.company_id;

  // Find active chatbot for this phone number
  const { data: chatbot } = await supabase
    .from('chatbots')
    .select(`
      id, name, system_prompt, welcome_message, fallback_message,
      llm_provider, llm_model, max_tokens, temperature, auto_create_leads,
      qualification_questions, business_hours_only, business_hours
    `)
    .eq('whatsapp_phone_number_id', phoneData.id)
    .eq('status', 'active')
    .eq('is_active', true)
    .single();

  if (!chatbot) {
    console.log('No active chatbot found for phone number:', phoneNumberId);
    return;
  }

  // Check business hours if required
  if (chatbot.business_hours_only && chatbot.business_hours) {
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay();
    const hours = chatbot.business_hours;
    
    // Simple check - can be enhanced
    if (hours.start && hours.end) {
      if (currentHour < hours.start || currentHour >= hours.end) {
        console.log('Outside business hours, skipping');
        return;
      }
    }
  }

  // Find or create lead
  let leadId: string | null = null;
  
  // Check if lead exists
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id, opted_in_whatsapp')
    .eq('company_id', companyId)
    .or(`phone.eq.${senderPhone},normalized_phone.eq.${senderPhone.replace(/[^0-9]/g, '')}`)
    .single();

  if (existingLead) {
    leadId = existingLead.id;
    
    // Check opt-in
    if (existingLead.opted_in_whatsapp === false) {
      console.log('Lead has opted out of WhatsApp messages');
      return;
    }
  } else if (chatbot.auto_create_leads) {
    // Create new lead
    const { data: newLead } = await supabase.rpc('find_or_create_lead_from_phone', {
      p_company_id: companyId,
      p_phone_number: senderPhone,
      p_name: senderName || 'WhatsApp Lead',
      p_source: `WhatsApp Bot: ${chatbot.name}`
    });
    
    leadId = newLead;
    
    // Update analytics
    await supabase.rpc('update_chatbot_analytics', {
      p_chatbot_id: chatbot.id,
      p_company_id: companyId,
      p_field: 'new_leads_created'
    });
  }

  // Get or create session
  const sessionId = await supabase.rpc('get_or_create_chatbot_session', {
    p_company_id: companyId,
    p_chatbot_id: chatbot.id,
    p_phone_number: senderPhone,
    p_lead_id: leadId
  });

  // Check if this is first message in session
  const { data: sessionData } = await supabase
    .from('chatbot_sessions')
    .select('current_sequence_step, session_state')
    .eq('id', sessionId)
    .single();

  const isFirstMessage = sessionData?.current_sequence_step === 0;

  // Log inbound interaction
  await supabase.from('chatbot_interactions').insert({
    company_id: companyId,
    chatbot_id: chatbot.id,
    lead_id: leadId,
    phone_number: senderPhone,
    direction: 'inbound',
    message_type: message.type,
    message_content: messageContent,
    message_data: message,
    meta_message_id: message.id,
    status: 'delivered'
  });

  // Update analytics
  await supabase.rpc('update_chatbot_analytics', {
    p_chatbot_id: chatbot.id,
    p_company_id: companyId,
    p_field: 'messages_received'
  });

  // Match trigger
  const { data: trigger } = await supabase.rpc('match_chatbot_trigger', {
    p_chatbot_id: chatbot.id,
    p_message: messageContent,
    p_is_first_message: isFirstMessage
  });

  let responseMessage: string;

  if (trigger && trigger.length > 0) {
    const matchedTrigger = trigger[0];
    
    if (matchedTrigger.response_message_id) {
      // Get message from chatbot_messages
      const { data: messageData } = await supabase
        .from('chatbot_messages')
        .select('content')
        .eq('id', matchedTrigger.response_message_id)
        .single();
      
      responseMessage = messageData?.content?.text || chatbot.fallback_message;
    } else if (matchedTrigger.trigger_type === 'first_message') {
      responseMessage = chatbot.welcome_message || 'Hello! How can I help you?';
    } else {
      responseMessage = chatbot.fallback_message;
    }
  } else {
    // Use AI if configured
    if (chatbot.llm_provider && chatbot.system_prompt) {
      responseMessage = await generateAIResponse(chatbot, messageContent, sessionData?.session_state);
    } else {
      responseMessage = chatbot.fallback_message;
    }
  }

  // Send response
  const sendResult = await sendWhatsAppMessage(supabase, companyId, phoneNumberId, senderPhone, responseMessage);
  
  const responseTime = Date.now() - startTime;

  // Log outbound interaction
  await supabase.from('chatbot_interactions').insert({
    company_id: companyId,
    chatbot_id: chatbot.id,
    lead_id: leadId,
    phone_number: senderPhone,
    direction: 'outbound',
    message_type: 'text',
    message_content: responseMessage,
    meta_message_id: sendResult?.messageId,
    status: sendResult?.success ? 'sent' : 'failed',
    error_message: sendResult?.error,
    trigger_id: trigger?.[0]?.trigger_id,
    response_time_ms: responseTime
  });

  // Update analytics
  await supabase.rpc('update_chatbot_analytics', {
    p_chatbot_id: chatbot.id,
    p_company_id: companyId,
    p_field: sendResult?.success ? 'messages_sent' : 'messages_failed'
  });

  // Update session
  await supabase
    .from('chatbot_sessions')
    .update({
      current_sequence_step: (sessionData?.current_sequence_step || 0) + 1,
      last_message_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  // Update lead assignment stats
  if (leadId) {
    await supabase
      .from('lead_chatbot_assignment')
      .update({
        last_interaction_at: new Date().toISOString(),
        messages_received: supabase.rpc('increment_one'),
        messages_sent: supabase.rpc('increment_one')
      })
      .eq('chatbot_id', chatbot.id)
      .eq('lead_id', leadId);
  }

  console.log(`Processed message in ${responseTime}ms`);
}

async function generateAIResponse(chatbot: any, userMessage: string, sessionState: any): Promise<string> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  
  const provider = chatbot.llm_provider || 'openai';
  const model = chatbot.llm_model || 'gpt-4o-mini';
  
  try {
    if (provider === 'openai' && openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: chatbot.system_prompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: chatbot.max_tokens || 500,
          temperature: chatbot.temperature || 0.7
        })
      });

      const result = await response.json();
      return result.choices?.[0]?.message?.content || chatbot.fallback_message;
    }
    
    if (provider === 'anthropic' && anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'claude-3-haiku-20240307',
          max_tokens: chatbot.max_tokens || 500,
          system: chatbot.system_prompt,
          messages: [{ role: 'user', content: userMessage }]
        })
      });

      const result = await response.json();
      return result.content?.[0]?.text || chatbot.fallback_message;
    }
  } catch (error) {
    console.error('AI generation error:', error);
  }

  return chatbot.fallback_message;
}

async function sendWhatsAppMessage(
  supabase: any,
  companyId: string,
  phoneNumberId: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get access token
    const { data: phoneNumber } = await supabase
      .from('whatsapp_phone_numbers')
      .select(`
        whatsapp_business_account_id,
        whatsapp_business_accounts!whatsapp_business_account_id (
          access_token_encrypted
        )
      `)
      .eq('phone_number_id', phoneNumberId)
      .eq('company_id', companyId)
      .single();

    const accessToken = phoneNumber?.whatsapp_business_accounts?.access_token_encrypted;
    
    if (!accessToken) {
      return { success: false, error: 'No access token found' };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { preview_url: false, body: message }
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error?.message || 'Send failed' };
    }

    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function processStatusUpdate(supabase: any, status: any) {
  const messageId = status.id;
  const statusType = status.status;

  console.log(`Status update: ${messageId} -> ${statusType}`);

  // Update interaction status
  const updateData: any = { status: statusType };
  
  if (statusType === 'failed' && status.errors?.[0]) {
    updateData.error_message = status.errors[0].message;
  }

  await supabase
    .from('chatbot_interactions')
    .update(updateData)
    .eq('meta_message_id', messageId);

  // Update analytics
  if (statusType === 'delivered' || statusType === 'read') {
    const { data: interaction } = await supabase
      .from('chatbot_interactions')
      .select('chatbot_id, company_id')
      .eq('meta_message_id', messageId)
      .single();

    if (interaction) {
      const field = statusType === 'delivered' ? 'messages_delivered' : 'messages_read';
      await supabase.rpc('update_chatbot_analytics', {
        p_chatbot_id: interaction.chatbot_id,
        p_company_id: interaction.company_id,
        p_field: field
      });
    }
  }
}
