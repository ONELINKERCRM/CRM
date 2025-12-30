import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Campaign Analytics & Reporting
 * Provides real-time analytics, exports, and insights
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, campaign_id, company_id, date_from, date_to } = await req.json();

    switch (action) {
      case 'campaign_stats':
        return await getCampaignStats(supabase, campaign_id);
      case 'company_overview':
        return await getCompanyOverview(supabase, company_id, date_from, date_to);
      case 'channel_breakdown':
        return await getChannelBreakdown(supabase, company_id, date_from, date_to);
      case 'export_recipients':
        return await exportRecipients(supabase, campaign_id);
      case 'delivery_timeline':
        return await getDeliveryTimeline(supabase, campaign_id);
      case 'audit_log':
        return await getAuditLog(supabase, campaign_id);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({ error: 'Analytics failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getCampaignStats(supabase: any, campaignId: string) {
  // Get campaign with analytics
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      id, name, channel, status, 
      sent_count, delivered_count, opened_count, clicked_count, failed_count, bounced_count,
      total_recipients, started_at, completed_at, scheduled_at,
      campaign_analytics (*)
    `)
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    return new Response(JSON.stringify({ error: 'Campaign not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get recipient status breakdown
  const { data: statusBreakdown } = await supabase
    .from('campaign_recipients')
    .select('delivery_status')
    .eq('campaign_id', campaignId);

  const breakdown: Record<string, number> = {};
  statusBreakdown?.forEach((r: any) => {
    breakdown[r.delivery_status] = (breakdown[r.delivery_status] || 0) + 1;
  });

  // Calculate rates
  const total = campaign.total_recipients || 0;
  const delivered = campaign.delivered_count || 0;
  const opened = campaign.opened_count || 0;
  const clicked = campaign.clicked_count || 0;
  const failed = campaign.failed_count || 0;

  const stats = {
    campaign,
    breakdown,
    rates: {
      delivery_rate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0,
      open_rate: delivered > 0 ? ((opened / delivered) * 100).toFixed(2) : 0,
      click_rate: opened > 0 ? ((clicked / opened) * 100).toFixed(2) : 0,
      failure_rate: total > 0 ? ((failed / total) * 100).toFixed(2) : 0,
    },
    summary: {
      total_recipients: total,
      queued: breakdown['queued'] || 0,
      sending: breakdown['sending'] || 0,
      sent: breakdown['sent'] || 0,
      delivered: breakdown['delivered'] || 0,
      read: breakdown['read'] || 0,
      failed: breakdown['failed'] || 0,
    }
  };

  return new Response(JSON.stringify(stats), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getCompanyOverview(supabase: any, companyId: string, dateFrom?: string, dateTo?: string) {
  const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = dateTo || new Date().toISOString();

  // Get campaign counts by status
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, status, channel, sent_count, delivered_count, failed_count')
    .eq('company_id', companyId)
    .gte('created_at', from)
    .lte('created_at', to);

  const overview = {
    total_campaigns: campaigns?.length || 0,
    campaigns_by_status: {} as Record<string, number>,
    campaigns_by_channel: {} as Record<string, number>,
    total_sent: 0,
    total_delivered: 0,
    total_failed: 0,
    overall_delivery_rate: 0,
  };

  campaigns?.forEach((c: any) => {
    overview.campaigns_by_status[c.status] = (overview.campaigns_by_status[c.status] || 0) + 1;
    overview.campaigns_by_channel[c.channel] = (overview.campaigns_by_channel[c.channel] || 0) + 1;
    overview.total_sent += c.sent_count || 0;
    overview.total_delivered += c.delivered_count || 0;
    overview.total_failed += c.failed_count || 0;
  });

  if (overview.total_sent > 0) {
    overview.overall_delivery_rate = (overview.total_delivered / overview.total_sent) * 100;
  }

  return new Response(JSON.stringify(overview), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getChannelBreakdown(supabase: any, companyId: string, dateFrom?: string, dateTo?: string) {
  const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = dateTo || new Date().toISOString();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('channel, sent_count, delivered_count, opened_count, clicked_count, failed_count')
    .eq('company_id', companyId)
    .gte('created_at', from)
    .lte('created_at', to);

  const channels: Record<string, any> = {
    whatsapp: { sent: 0, delivered: 0, read: 0, failed: 0, campaigns: 0 },
    sms: { sent: 0, delivered: 0, read: 0, failed: 0, campaigns: 0 },
    email: { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0, campaigns: 0 },
  };

  campaigns?.forEach((c: any) => {
    if (channels[c.channel]) {
      channels[c.channel].campaigns++;
      channels[c.channel].sent += c.sent_count || 0;
      channels[c.channel].delivered += c.delivered_count || 0;
      channels[c.channel].failed += c.failed_count || 0;
      if (c.channel === 'whatsapp') {
        channels[c.channel].read += c.opened_count || 0;
      } else if (c.channel === 'email') {
        channels[c.channel].opened += c.opened_count || 0;
        channels[c.channel].clicked += c.clicked_count || 0;
      }
    }
  });

  // Calculate rates per channel
  Object.keys(channels).forEach(ch => {
    const channel = channels[ch];
    channel.delivery_rate = channel.sent > 0 ? ((channel.delivered / channel.sent) * 100).toFixed(2) : 0;
    if (ch === 'email') {
      channel.open_rate = channel.delivered > 0 ? ((channel.opened / channel.delivered) * 100).toFixed(2) : 0;
      channel.click_rate = channel.opened > 0 ? ((channel.clicked / channel.opened) * 100).toFixed(2) : 0;
    } else if (ch === 'whatsapp') {
      channel.read_rate = channel.delivered > 0 ? ((channel.read / channel.delivered) * 100).toFixed(2) : 0;
    }
  });

  return new Response(JSON.stringify(channels), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function exportRecipients(supabase: any, campaignId: string) {
  const { data: recipients, error } = await supabase
    .from('campaign_recipients')
    .select(`
      phone_number, name, recipient_email, delivery_status,
      sent_at, delivered_at, read_at, failed_at,
      error_message, error_code, retry_count, imported_from
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Generate CSV
  const headers = ['Phone', 'Name', 'Email', 'Status', 'Sent At', 'Delivered At', 'Read At', 'Failed At', 'Error', 'Retries', 'Source'];
  const rows = recipients?.map((r: any) => [
    r.phone_number,
    r.name || '',
    r.recipient_email || '',
    r.delivery_status,
    r.sent_at || '',
    r.delivered_at || '',
    r.read_at || '',
    r.failed_at || '',
    r.error_message || '',
    r.retry_count || 0,
    r.imported_from
  ]) || [];

  const csv = [
    headers.join(','),
    ...rows.map((row: any) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return new Response(csv, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="campaign_${campaignId}_export.csv"`
    },
  });
}

async function getDeliveryTimeline(supabase: any, campaignId: string) {
  // Get hourly breakdown of deliveries
  const { data: recipients } = await supabase
    .from('campaign_recipients')
    .select('delivery_status, sent_at, delivered_at, read_at')
    .eq('campaign_id', campaignId)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: true });

  const timeline: Record<string, { sent: number; delivered: number; read: number }> = {};

  recipients?.forEach((r: any) => {
    if (r.sent_at) {
      const hour = new Date(r.sent_at).toISOString().slice(0, 13) + ':00:00Z';
      if (!timeline[hour]) {
        timeline[hour] = { sent: 0, delivered: 0, read: 0 };
      }
      timeline[hour].sent++;
      if (r.delivered_at) timeline[hour].delivered++;
      if (r.read_at) timeline[hour].read++;
    }
  });

  const sorted = Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, data]) => ({ hour, ...data }));

  return new Response(JSON.stringify(sorted), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getAuditLog(supabase: any, campaignId: string) {
  const { data: logs, error } = await supabase
    .from('campaign_logs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch audit log' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(logs), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
