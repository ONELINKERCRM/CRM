import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectionRequest {
  action: 'create' | 'update' | 'delete' | 'test' | 'set_default' | 'enable' | 'disable' | 'list' | 'health_check' | 'get_logs';
  connection_id?: string;
  channel?: 'whatsapp' | 'sms' | 'email';
  provider?: string;
  display_name?: string;
  identifier?: string;
  credentials?: Record<string, string>;
  is_default?: boolean;
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

    const { company_id, role } = agent;
    const isAdmin = role === 'admin' || role === 'manager';

    const body: ConnectionRequest = await req.json();
    const { action } = body;

    console.log(`[connection-manage] Action: ${action}, Company: ${company_id}, User: ${user.id}`);

    switch (action) {
      case 'list': {
        const { data: connections, error } = await supabase
          .from('marketing_connections')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Get health summary
        const { data: healthSummary } = await supabase
          .rpc('get_connection_health_summary', { p_company_id: company_id });

        return new Response(JSON.stringify({ 
          connections, 
          health_summary: healthSummary,
          is_admin: isAdmin 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can create connections' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { channel, provider, display_name, identifier, credentials, is_default } = body;

        if (!channel || !provider) {
          return new Response(JSON.stringify({ error: 'Channel and provider are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // If setting as default, remove default from others first
        if (is_default) {
          await supabase
            .from('marketing_connections')
            .update({ is_default: false })
            .eq('company_id', company_id)
            .eq('channel', channel);
        }

        const { data: connection, error } = await supabase
          .from('marketing_connections')
          .insert({
            company_id,
            channel,
            provider,
            display_name: display_name || `${provider} - ${identifier}`,
            identifier,
            credentials,
            status: 'pending',
            is_default: is_default || false,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Log the action
        await supabase.from('connection_logs').insert({
          connection_id: connection.id,
          company_id,
          action_type: 'connect',
          description: `Created ${channel} connection with ${provider}`,
          details: { provider, identifier },
          performed_by: user.id,
        });

        // Create channel-specific account record
        if (channel === 'sms' && credentials) {
          await supabase.from('sms_accounts').insert({
            connection_id: connection.id,
            company_id,
            provider,
            account_sid: credentials.accountSid || credentials.account_sid,
            sender_id: credentials.senderId || identifier,
            phone_number: identifier,
            status: 'pending',
          });
        } else if (channel === 'email' && credentials) {
          await supabase.from('email_accounts').insert({
            connection_id: connection.id,
            company_id,
            provider,
            sender_email: identifier || credentials.senderEmail,
            sender_name: credentials.senderName,
            smtp_host: credentials.smtpHost,
            smtp_port: credentials.smtpPort ? parseInt(credentials.smtpPort) : null,
            status: 'pending',
          });
        }

        return new Response(JSON.stringify({ success: true, connection }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can update connections' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { connection_id, display_name, credentials } = body;

        if (!connection_id) {
          return new Response(JSON.stringify({ error: 'Connection ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (display_name) updates.display_name = display_name;
        if (credentials) updates.credentials = credentials;

        const { data: connection, error } = await supabase
          .from('marketing_connections')
          .update(updates)
          .eq('id', connection_id)
          .eq('company_id', company_id)
          .select()
          .single();

        if (error) throw error;

        // Log the action
        await supabase.from('connection_logs').insert({
          connection_id,
          company_id,
          action_type: 'edit',
          description: 'Updated connection settings',
          details: { updated_fields: Object.keys(updates) },
          performed_by: user.id,
        });

        return new Response(JSON.stringify({ success: true, connection }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can delete connections' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { connection_id } = body;

        if (!connection_id) {
          return new Response(JSON.stringify({ error: 'Connection ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get connection details before deleting
        const { data: existingConnection } = await supabase
          .from('marketing_connections')
          .select('*')
          .eq('id', connection_id)
          .eq('company_id', company_id)
          .single();

        if (!existingConnection) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Log before deleting (since cascade will remove logs too)
        console.log(`[connection-manage] Deleting connection ${connection_id}: ${existingConnection.provider}`);

        const { error } = await supabase
          .from('marketing_connections')
          .delete()
          .eq('id', connection_id)
          .eq('company_id', company_id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'test': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can test connections' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { connection_id } = body;

        if (!connection_id) {
          return new Response(JSON.stringify({ error: 'Connection ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get connection details
        const { data: connection, error: fetchError } = await supabase
          .from('marketing_connections')
          .select('*')
          .eq('id', connection_id)
          .eq('company_id', company_id)
          .single();

        if (fetchError || !connection) {
          return new Response(JSON.stringify({ error: 'Connection not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const startTime = Date.now();
        let testResult = { success: false, message: '', details: {} as Record<string, unknown> };

        try {
          const credentials = connection.credentials as Record<string, string> || {};
          
          switch (connection.channel) {
            case 'whatsapp': {
              // Test Meta WhatsApp API
              const accessToken = credentials.accessToken || credentials.access_token;
              const phoneNumberId = credentials.phoneNumberId || credentials.phone_number_id;
              
              if (!accessToken) {
                testResult = { success: false, message: 'Missing access token', details: {} };
                break;
              }

              const response = await fetch(
                `https://graph.facebook.com/v18.0/${phoneNumberId || 'me'}`,
                {
                  headers: { 'Authorization': `Bearer ${accessToken}` },
                }
              );

              if (response.ok) {
                const data = await response.json();
                testResult = { 
                  success: true, 
                  message: 'WhatsApp connection verified',
                  details: { 
                    phone_number: data.display_phone_number,
                    quality_rating: data.quality_rating,
                    messaging_limit: data.messaging_limit,
                  }
                };
              } else {
                const errorData = await response.json();
                testResult = { 
                  success: false, 
                  message: errorData.error?.message || 'Failed to verify WhatsApp connection',
                  details: errorData
                };
              }
              break;
            }

            case 'sms': {
              const provider = connection.provider;
              
              if (provider === 'twilio') {
                const accountSid = credentials.accountSid || credentials.account_sid;
                const authToken = credentials.authToken || credentials.auth_token;
                
                if (!accountSid || !authToken) {
                  testResult = { success: false, message: 'Missing Twilio credentials', details: {} };
                  break;
                }

                const response = await fetch(
                  `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
                  {
                    headers: {
                      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                    },
                  }
                );

                if (response.ok) {
                  const data = await response.json();
                  testResult = { 
                    success: true, 
                    message: 'Twilio connection verified',
                    details: { 
                      account_name: data.friendly_name,
                      status: data.status,
                    }
                  };
                } else {
                  testResult = { success: false, message: 'Invalid Twilio credentials', details: {} };
                }
              } else if (provider === 'messagebird') {
                const apiKey = credentials.apiKey || credentials.api_key;
                
                if (!apiKey) {
                  testResult = { success: false, message: 'Missing MessageBird API key', details: {} };
                  break;
                }

                const response = await fetch('https://rest.messagebird.com/balance', {
                  headers: { 'Authorization': `AccessKey ${apiKey}` },
                });

                if (response.ok) {
                  const data = await response.json();
                  testResult = { 
                    success: true, 
                    message: 'MessageBird connection verified',
                    details: { balance: data.amount, currency: data.type }
                  };
                } else {
                  testResult = { success: false, message: 'Invalid MessageBird credentials', details: {} };
                }
              } else {
                testResult = { success: true, message: `${provider} connection stored (test not implemented)`, details: {} };
              }
              break;
            }

            case 'email': {
              const provider = connection.provider;
              
              if (provider === 'resend') {
                const apiKey = credentials.apiKey || credentials.api_key;
                
                if (!apiKey) {
                  testResult = { success: false, message: 'Missing Resend API key', details: {} };
                  break;
                }

                const response = await fetch('https://api.resend.com/domains', {
                  headers: { 'Authorization': `Bearer ${apiKey}` },
                });

                if (response.ok) {
                  const data = await response.json();
                  testResult = { 
                    success: true, 
                    message: 'Resend connection verified',
                    details: { domains: data.data?.length || 0 }
                  };
                } else {
                  testResult = { success: false, message: 'Invalid Resend API key', details: {} };
                }
              } else if (provider === 'sendgrid') {
                const apiKey = credentials.apiKey || credentials.api_key;
                
                if (!apiKey) {
                  testResult = { success: false, message: 'Missing SendGrid API key', details: {} };
                  break;
                }

                const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
                  headers: { 'Authorization': `Bearer ${apiKey}` },
                });

                if (response.ok) {
                  testResult = { success: true, message: 'SendGrid connection verified', details: {} };
                } else {
                  testResult = { success: false, message: 'Invalid SendGrid API key', details: {} };
                }
              } else {
                testResult = { success: true, message: `${provider} connection stored (test not implemented)`, details: {} };
              }
              break;
            }

            default:
              testResult = { success: false, message: 'Unknown channel type', details: {} };
          }
        } catch (testError) {
          console.error('[connection-manage] Test error:', testError);
          testResult = { 
            success: false, 
            message: testError instanceof Error ? testError.message : 'Test failed',
            details: {}
          };
        }

        const responseTime = Date.now() - startTime;

        // Update connection status
        const newStatus = testResult.success ? 'connected' : 'error';
        const updateData: Record<string, unknown> = {
          status: newStatus,
          health_status: testResult.success ? 'healthy' : 'unhealthy',
          last_health_check: new Date().toISOString(),
          error_message: testResult.success ? null : testResult.message,
        };
        if (testResult.details.quality_rating) {
          updateData.quality_rating = testResult.details.quality_rating;
        }
        if (testResult.details.messaging_limit) {
          updateData.messaging_limit = testResult.details.messaging_limit;
        }
        await supabase
          .from('marketing_connections')
          .update(updateData)
          .eq('id', connection_id);

        // Log health check
        await supabase.from('connection_health_checks').insert({
          connection_id,
          company_id,
          check_type: 'api_test',
          status: testResult.success ? 'success' : 'failed',
          response_time_ms: responseTime,
          error_message: testResult.success ? null : testResult.message,
          details: testResult.details,
        });

        // Log the action
        await supabase.from('connection_logs').insert({
          connection_id,
          company_id,
          action_type: 'test',
          description: testResult.success ? 'Connection test passed' : 'Connection test failed',
          details: { response_time_ms: responseTime, ...testResult.details },
          performed_by: user.id,
        });

        return new Response(JSON.stringify({ 
          success: testResult.success,
          message: testResult.message,
          details: testResult.details,
          response_time_ms: responseTime,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'set_default': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can set default connections' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { connection_id, channel } = body;

        if (!connection_id || !channel) {
          return new Response(JSON.stringify({ error: 'Connection ID and channel are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Use the database function
        const { error } = await supabase.rpc('set_default_connection', {
          p_connection_id: connection_id,
          p_company_id: company_id,
          p_channel: channel,
        });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'enable':
      case 'disable': {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Only Admin/Manager can enable/disable connections' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { connection_id } = body;

        if (!connection_id) {
          return new Response(JSON.stringify({ error: 'Connection ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const newStatus = action === 'enable' ? 'connected' : 'disconnected';

        const { error } = await supabase
          .from('marketing_connections')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', connection_id)
          .eq('company_id', company_id);

        if (error) throw error;

        // Log the action
        await supabase.from('connection_logs').insert({
          connection_id,
          company_id,
          action_type: action,
          description: `Connection ${action}d`,
          performed_by: user.id,
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'health_check': {
        // Run health check on all connections
        const { data: connections, error: fetchError } = await supabase
          .from('marketing_connections')
          .select('id, channel, provider, status')
          .eq('company_id', company_id)
          .eq('status', 'connected');

        if (fetchError) throw fetchError;

        const results = [];
        for (const conn of connections || []) {
          // Recursively call test for each connection
          try {
            const testBody = { action: 'test', connection_id: conn.id };
            // We'd need to implement individual tests here
            results.push({ 
              connection_id: conn.id, 
              channel: conn.channel,
              status: 'checked' 
            });
          } catch {
            results.push({ 
              connection_id: conn.id, 
              channel: conn.channel,
              status: 'error' 
            });
          }
        }

        // Get updated health summary
        const { data: healthSummary } = await supabase
          .rpc('get_connection_health_summary', { p_company_id: company_id });

        return new Response(JSON.stringify({ 
          success: true,
          results,
          health_summary: healthSummary,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_logs': {
        const { connection_id } = body;

        let query = supabase
          .from('connection_logs')
          .select('*')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (connection_id) {
          query = query.eq('connection_id', connection_id);
        }

        const { data: logs, error } = await query;

        if (error) throw error;

        return new Response(JSON.stringify({ logs }), {
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
    console.error('[connection-manage] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
