import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Chatbot Management Edge Function
 * Handles chatbot deployment, message processing, and lead assignment
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    switch (action) {
      case 'deploy':
        return await deployChatbot(supabase, params);
      case 'pause':
        return await pauseChatbot(supabase, params);
      case 'activate':
        return await activateChatbot(supabase, params);
      case 'deactivate':
        return await deactivateChatbot(supabase, params);
      case 'test_message':
        return await testChatbotMessage(supabase, params);
      case 'assign_leads':
        return await assignLeadsToChatbot(supabase, params);
      case 'unassign_leads':
        return await unassignLeadsFromChatbot(supabase, params);
      case 'get_stats':
        return await getChatbotStats(supabase, params);
      case 'get_interactions':
        return await getChatbotInteractions(supabase, params);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Chatbot management error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function deployChatbot(supabase: any, params: any) {
  const { chatbot_id, company_id, whatsapp_phone_number_id, user_id } = params;

  if (!chatbot_id || !whatsapp_phone_number_id) {
    return new Response(JSON.stringify({ error: 'chatbot_id and whatsapp_phone_number_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate WhatsApp phone number exists and is connected
  const { data: phoneNumber, error: phoneError } = await supabase
    .from('whatsapp_phone_numbers')
    .select('id, phone_number, status, whatsapp_business_account_id')
    .eq('id', whatsapp_phone_number_id)
    .eq('company_id', company_id)
    .single();

  if (phoneError || !phoneNumber) {
    return new Response(JSON.stringify({ error: 'WhatsApp number not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (phoneNumber.status !== 'connected') {
    return new Response(JSON.stringify({ error: 'WhatsApp number is not connected' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if another chatbot is already deployed to this number
  const { data: existingBot } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('whatsapp_phone_number_id', whatsapp_phone_number_id)
    .eq('status', 'active')
    .neq('id', chatbot_id)
    .single();

  if (existingBot) {
    return new Response(JSON.stringify({ 
      error: `Another chatbot "${existingBot.name}" is already deployed to this number` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Deploy chatbot
  const { error: updateError } = await supabase
    .from('chatbots')
    .update({
      whatsapp_phone_number_id,
      status: 'active',
      is_active: true,
      deployed_at: new Date().toISOString()
    })
    .eq('id', chatbot_id);

  if (updateError) {
    console.error('Deploy error:', updateError);
    return new Response(JSON.stringify({ error: 'Failed to deploy chatbot' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log the deployment
  await supabase.rpc('log_chatbot_action', {
    p_company_id: company_id,
    p_chatbot_id: chatbot_id,
    p_action_type: 'deploy',
    p_description: `Chatbot deployed to WhatsApp number ${phoneNumber.phone_number}`,
    p_details: { phone_number_id: whatsapp_phone_number_id },
    p_performed_by: user_id
  });

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Chatbot deployed successfully',
    phone_number: phoneNumber.phone_number
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function pauseChatbot(supabase: any, params: any) {
  const { chatbot_id, company_id, user_id } = params;

  await supabase
    .from('chatbots')
    .update({ status: 'paused' })
    .eq('id', chatbot_id);

  await supabase.rpc('log_chatbot_action', {
    p_company_id: company_id,
    p_chatbot_id: chatbot_id,
    p_action_type: 'pause',
    p_description: 'Chatbot paused',
    p_performed_by: user_id
  });

  return new Response(JSON.stringify({ success: true, message: 'Chatbot paused' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function activateChatbot(supabase: any, params: any) {
  const { chatbot_id, company_id, user_id } = params;

  // Check if phone number is still assigned
  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('whatsapp_phone_number_id')
    .eq('id', chatbot_id)
    .single();

  if (!chatbot?.whatsapp_phone_number_id) {
    return new Response(JSON.stringify({ error: 'No WhatsApp number assigned. Deploy the chatbot first.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await supabase
    .from('chatbots')
    .update({ status: 'active', is_active: true })
    .eq('id', chatbot_id);

  await supabase.rpc('log_chatbot_action', {
    p_company_id: company_id,
    p_chatbot_id: chatbot_id,
    p_action_type: 'activate',
    p_description: 'Chatbot activated',
    p_performed_by: user_id
  });

  return new Response(JSON.stringify({ success: true, message: 'Chatbot activated' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function deactivateChatbot(supabase: any, params: any) {
  const { chatbot_id, company_id, user_id } = params;

  await supabase
    .from('chatbots')
    .update({ 
      status: 'inactive', 
      is_active: false,
      whatsapp_phone_number_id: null 
    })
    .eq('id', chatbot_id);

  // End all active sessions
  await supabase
    .from('chatbot_sessions')
    .delete()
    .eq('chatbot_id', chatbot_id);

  await supabase.rpc('log_chatbot_action', {
    p_company_id: company_id,
    p_chatbot_id: chatbot_id,
    p_action_type: 'deactivate',
    p_description: 'Chatbot deactivated and undeployed',
    p_performed_by: user_id
  });

  return new Response(JSON.stringify({ success: true, message: 'Chatbot deactivated' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function testChatbotMessage(supabase: any, params: any) {
  const { chatbot_id, test_phone, message } = params;

  // Get chatbot config
  const { data: chatbot, error } = await supabase
    .from('chatbots')
    .select(`
      *,
      whatsapp_phone_numbers!whatsapp_phone_number_id (
        phone_number_id
      ),
      whatsapp_business_accounts:whatsapp_phone_numbers!whatsapp_phone_number_id (
        whatsapp_business_account_id (
          access_token_encrypted
        )
      )
    `)
    .eq('id', chatbot_id)
    .single();

  if (error || !chatbot) {
    return new Response(JSON.stringify({ error: 'Chatbot not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Send test message via Meta API
  const phoneNumberId = chatbot.whatsapp_phone_numbers?.phone_number_id;
  const accessToken = chatbot.whatsapp_business_accounts?.whatsapp_business_account_id?.access_token_encrypted;

  if (!phoneNumberId || !accessToken) {
    return new Response(JSON.stringify({ error: 'WhatsApp configuration incomplete' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
        to: test_phone.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { preview_url: false, body: message }
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ error: result.error?.message || 'Failed to send test message' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message_id: result.messages?.[0]?.id 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function assignLeadsToChatbot(supabase: any, params: any) {
  const { chatbot_id, company_id, lead_ids, user_id } = params;

  if (!lead_ids || lead_ids.length === 0) {
    return new Response(JSON.stringify({ error: 'No leads specified' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const assignments = lead_ids.map((lead_id: string) => ({
    company_id,
    chatbot_id,
    lead_id,
    assigned_by: user_id,
    status: 'active'
  }));

  const { error: insertError } = await supabase
    .from('lead_chatbot_assignment')
    .upsert(assignments, { onConflict: 'chatbot_id,lead_id' });

  if (insertError) {
    console.error('Assignment error:', insertError);
    return new Response(JSON.stringify({ error: 'Failed to assign leads' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await supabase.rpc('log_chatbot_action', {
    p_company_id: company_id,
    p_chatbot_id: chatbot_id,
    p_action_type: 'assign_lead',
    p_description: `Assigned ${lead_ids.length} leads to chatbot`,
    p_details: { lead_ids },
    p_performed_by: user_id
  });

  return new Response(JSON.stringify({ 
    success: true, 
    assigned: lead_ids.length 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function unassignLeadsFromChatbot(supabase: any, params: any) {
  const { chatbot_id, company_id, lead_ids, user_id } = params;

  await supabase
    .from('lead_chatbot_assignment')
    .delete()
    .eq('chatbot_id', chatbot_id)
    .in('lead_id', lead_ids);

  await supabase.rpc('log_chatbot_action', {
    p_company_id: company_id,
    p_chatbot_id: chatbot_id,
    p_action_type: 'unassign_lead',
    p_description: `Unassigned ${lead_ids.length} leads from chatbot`,
    p_details: { lead_ids },
    p_performed_by: user_id
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getChatbotStats(supabase: any, params: any) {
  const { chatbot_id, date_from, date_to } = params;

  const from = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = date_to || new Date().toISOString().split('T')[0];

  const { data: analytics } = await supabase
    .from('chatbot_analytics')
    .select('*')
    .eq('chatbot_id', chatbot_id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  const totals = (analytics || []).reduce((acc: any, day: any) => ({
    messages_sent: acc.messages_sent + (day.messages_sent || 0),
    messages_received: acc.messages_received + (day.messages_received || 0),
    messages_delivered: acc.messages_delivered + (day.messages_delivered || 0),
    messages_read: acc.messages_read + (day.messages_read || 0),
    messages_failed: acc.messages_failed + (day.messages_failed || 0),
    unique_leads: acc.unique_leads + (day.unique_leads || 0),
    new_leads_created: acc.new_leads_created + (day.new_leads_created || 0),
  }), {
    messages_sent: 0,
    messages_received: 0,
    messages_delivered: 0,
    messages_read: 0,
    messages_failed: 0,
    unique_leads: 0,
    new_leads_created: 0,
  });

  // Get active assignments count
  const { count: activeAssignments } = await supabase
    .from('lead_chatbot_assignment')
    .select('id', { count: 'exact', head: true })
    .eq('chatbot_id', chatbot_id)
    .eq('status', 'active');

  return new Response(JSON.stringify({
    totals,
    daily: analytics || [],
    active_assignments: activeAssignments || 0,
    delivery_rate: totals.messages_sent > 0 
      ? ((totals.messages_delivered / totals.messages_sent) * 100).toFixed(2) 
      : 0,
    read_rate: totals.messages_delivered > 0 
      ? ((totals.messages_read / totals.messages_delivered) * 100).toFixed(2) 
      : 0
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getChatbotInteractions(supabase: any, params: any) {
  const { chatbot_id, lead_id, limit = 50, offset = 0 } = params;

  let query = supabase
    .from('chatbot_interactions')
    .select(`
      *,
      leads:lead_id (id, name, phone, email)
    `)
    .eq('chatbot_id', chatbot_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (lead_id) {
    query = query.eq('lead_id', lead_id);
  }

  const { data: interactions, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch interactions' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(interactions || []), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
