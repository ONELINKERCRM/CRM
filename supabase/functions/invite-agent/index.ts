import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteAgentRequest {
  name: string;
  email: string;
  phone?: string;
  role: string;
  team_id?: string;
  permissions: Record<string, boolean>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { name, email, phone, role, team_id, permissions }: InviteAgentRequest = await req.json();

    console.log("Inviting agent:", { name, email, role, team_id });

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create agent record with 'invited' status
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        name,
        email,
        phone,
        role,
        team_id,
        permissions,
        status: "invited",
        invitation_token: invitationToken,
        invitation_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (agentError) {
      console.error("Error creating agent:", agentError);
      throw new Error(agentError.message);
    }

    console.log("Agent created:", agent.id);

    // Get site URL for invitation link
    const siteUrl = Deno.env.get("SITE_URL") || `${supabaseUrl.replace('.supabase.co', '')}.lovable.app`;
    const inviteLink = `${siteUrl}/accept-invite?token=${invitationToken}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "CRM Team <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to join the team!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #2563eb; margin: 0; }
            .content { background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
            .button:hover { background: #1d4ed8; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to the Team!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>You've been invited to join our CRM platform as a <strong>${role.replace('_', ' ')}</strong>.</p>
              <p>Click the button below to set up your password and complete your registration:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" class="button">Accept Invitation</a>
              </p>
              <p style="font-size: 14px; color: #6b7280;">
                This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} CRM Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, agent, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in invite-agent function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
