import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportLeadsRequest {
    filters: {
        agent_id?: string;
        stage?: string;
        source?: string;
        date_from?: string;
        date_to?: string;
        budget_min?: number;
        budget_max?: number;
        country?: string;
        tags?: string[];
    };
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get the requester's user ID from the JWT
        const authHeader = req.headers.get("Authorization")!;
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            throw new Error("Unauthorized");
        }

        const { filters }: ExportLeadsRequest = await req.json();

        // 1. Check Rate Limit
        const { data: canExport, error: rateLimitError } = await supabase.rpc('check_export_rate_limit', {
            p_user_id: user.id
        });

        if (rateLimitError) throw rateLimitError;
        if (!canExport) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 3 exports per hour." }), {
                status: 429,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        // 2. Get User's Company info
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("company_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.company_id) {
            throw new Error("User has no associated company");
        }

        const { data: company, error: companyError } = await supabase
            .from("companies")
            .select("name, main_email")
            .eq("id", profile.company_id)
            .single();

        if (companyError || !company?.main_email) {
            throw new Error("Company has no verified main email address configured");
        }

        // 3. Query Leads with Filters
        let query = supabase
            .from("leads")
            .select(`
        *,
        agent:agents!assigned_agent_id (name),
        lead_stage:lead_stages!stage_id (name)
      `)
            .eq("company_id", profile.company_id);

        if (filters.agent_id && filters.agent_id !== 'all') {
            query = query.eq("assigned_agent_id", filters.agent_id);
        }
        if (filters.stage && filters.stage !== 'all') {
            query = query.eq("stage", filters.stage);
        }
        if (filters.source && filters.source !== 'all') {
            query = query.eq("source", filters.source);
        }
        if (filters.date_from) {
            query = query.gte("created_at", filters.date_from);
        }
        if (filters.date_to) {
            query = query.lte("created_at", filters.date_to);
        }
        if (filters.budget_min !== undefined) {
            query = query.gte("budget", filters.budget_min);
        }
        if (filters.budget_max !== undefined) {
            query = query.lte("budget", filters.budget_max);
        }
        // Nationality/Location filter if available in schema
        if (filters.country) {
            query = query.or(`location.ilike.%${filters.country}%,nationality.ilike.%${filters.country}%`);
        }

        const { data: leads, error: leadsError } = await query;

        if (leadsError) throw leadsError;

        // 4. Generate CSV
        const headers = [
            "ID", "Name", "Email", "Phone", "Status", "Stage", "Source",
            "Owner", "Budget", "Location", "Nationality", "Created At", "Updated At"
        ];

        const rows = (leads || []).map(l => [
            l.id,
            l.name,
            l.email || "",
            l.phone || "",
            l.status || "",
            l.lead_stage?.name || l.stage || "",
            l.source || "",
            l.agent?.name || "Unassigned",
            l.budget || "",
            l.location || "",
            l.nationality || "",
            l.created_at,
            l.updated_at
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        // 5. Send Email
        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
        const emailResponse = await resend.emails.send({
            from: "Onelinker CRM <exports@resend.dev>",
            to: [company.main_email],
            subject: `Lead Export: ${company.name} - ${new Date().toLocaleDateString()}`,
            html: `
        <h1>Lead Export Generated</h1>
        <p>A lead export was requested by ${user.email}.</p>
        <p>Attached is the CSV file containing ${rows.length} leads matching your criteria.</p>
        <br/>
        <p><strong>Filter Criteria:</strong> ${JSON.stringify(filters)}</p>
        <p>Sent to company main email as per security policy.</p>
      `,
            attachments: [
                {
                    filename: `leads_export_${new Date().toISOString().split('T')[0]}.csv`,
                    content: btoa(csvContent),
                },
            ],
        });

        // 6. Audit Log
        await supabase.from("export_logs").insert({
            user_id: user.id,
            company_id: profile.company_id,
            entity_type: "leads",
            filter_criteria: filters,
            record_count: rows.length,
            recipient_email: company.main_email,
            status: "completed"
        });

        return new Response(JSON.stringify({ success: true, count: rows.length }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });

    } catch (error: any) {
        console.error("Export error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
};

serve(handler);
