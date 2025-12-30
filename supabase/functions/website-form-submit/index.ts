import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Serve embed script
  if (url.pathname.endsWith('/embed.js') || url.searchParams.get('embed') === 'true') {
    const script = generateEmbedScript();
    return new Response(script, { 
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' } 
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get company_id from query params
    const companyId = url.searchParams.get('company_id');
    const sourceId = url.searchParams.get('source_id');
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse submission data
    let submissionData: Record<string, unknown>;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      submissionData = await req.json();
    } else if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
      const formData = await req.formData();
      submissionData = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    } else {
      const text = await req.text();
      try {
        submissionData = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        submissionData = Object.fromEntries(params.entries());
      }
    }

    // Check honeypot for spam
    if (submissionData._honeypot) {
      console.log('Spam detected via honeypot');
      return new Response(
        JSON.stringify({ success: true, message: 'Thank you!' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract metadata
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    const pageUrl = submissionData._page_url as string || req.headers.get('referer') || '';
    const referrer = submissionData._referrer as string || '';

    // Remove internal fields
    delete submissionData._honeypot;
    delete submissionData._page_url;
    delete submissionData._referrer;
    delete submissionData._timestamp;

    // Map common field names
    const name = (submissionData.name || submissionData.full_name || submissionData.fullName || 
                  `${submissionData.first_name || submissionData.firstName || ''} ${submissionData.last_name || submissionData.lastName || ''}`.trim() ||
                  'Website Lead') as string;
    const email = (submissionData.email || submissionData.Email || submissionData.EMAIL) as string | undefined;
    const phone = (submissionData.phone || submissionData.Phone || submissionData.PHONE || 
                   submissionData.mobile || submissionData.Mobile || submissionData.telephone) as string | undefined;

    console.log(`Processing website lead for company ${companyId}:`, {
      name,
      email: email ? 'provided' : 'none',
      phone: phone ? 'provided' : 'none',
      fields: Object.keys(submissionData),
    });

    // Get or create website lead source
    let leadSourceId = sourceId;
    if (!leadSourceId) {
      const { data: source } = await supabase
        .from('lead_sources')
        .select('id')
        .eq('company_id', companyId)
        .eq('source_name', 'website')
        .single();
      leadSourceId = source?.id;
    }

    // Get default stage
    const { data: defaultStage } = await supabase
      .from('lead_stages')
      .select('id')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    // Check for duplicates
    let existingLead = null;
    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('company_id', companyId)
        .ilike('normalized_phone', `%${normalizedPhone}`)
        .limit(1)
        .single();
      existingLead = data;
    }
    if (!existingLead && email) {
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('company_id', companyId)
        .ilike('email', email)
        .limit(1)
        .single();
      existingLead = data;
    }

    if (existingLead) {
      // Update existing lead with new activity
      await supabase
        .from('leads')
        .update({
          updated_at: new Date().toISOString(),
          source_metadata: {
            last_form_submission: new Date().toISOString(),
            page_url: pageUrl,
            form_data: submissionData,
          }
        })
        .eq('id', existingLead.id);

      // Log activity
      await supabase.from('lead_activities').insert({
        lead_id: existingLead.id,
        company_id: companyId,
        type: 'form_submission',
        title: 'Website Form Submitted',
        description: `Form submitted from ${pageUrl}`,
        agent_name: 'System',
      });

      console.log(`Updated existing lead: ${existingLead.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Thank you! We will contact you soon.',
          lead_id: existingLead.id,
          is_duplicate: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        company_id: companyId,
        name: name,
        email: email || null,
        phone: phone || null,
        normalized_phone: phone ? phone.replace(/\D/g, '') : null,
        source: 'Website',
        lead_source_id: leadSourceId || null,
        stage_id: defaultStage?.id || null,
        stage: 'New',
        source_metadata: {
          page_url: pageUrl,
          referrer: referrer,
          user_agent: userAgent,
          ip_address: ipAddress,
          form_data: submissionData,
          submitted_at: new Date().toISOString(),
        },
        mapped_fields: submissionData,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating lead:', insertError);
      throw insertError;
    }

    // Log activity
    await supabase.from('lead_activities').insert({
      lead_id: newLead.id,
      company_id: companyId,
      type: 'lead_created',
      title: 'Lead Created from Website',
      description: `New lead from ${pageUrl || 'website form'}`,
      agent_name: 'System',
    });

    // Update lead source stats
    if (leadSourceId) {
      await supabase
        .from('lead_sources')
        .update({ 
          total_leads_fetched: supabase.rpc('increment_counter', { row_id: leadSourceId }),
          last_fetched_at: new Date().toISOString(),
          status: 'connected',
        })
        .eq('id', leadSourceId);
    }

    console.log(`Created new lead: ${newLead.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thank you! We will contact you soon.',
        lead_id: newLead.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Form submission error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Something went wrong',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmbedScript(): string {
  return `
(function() {
  'use strict';
  
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var endpoint = currentScript.getAttribute('data-endpoint') || '';
  var formSelector = currentScript.getAttribute('data-form-selector') || 'form';
  var successMessage = currentScript.getAttribute('data-success-message') || 'Thank you! We will contact you soon.';
  
  if (!endpoint) {
    console.error('OneLinker: Missing data-endpoint attribute');
    return;
  }
  
  function init() {
    var forms = document.querySelectorAll(formSelector);
    
    forms.forEach(function(form) {
      if (form.hasAttribute('data-olcrm-processed')) return;
      form.setAttribute('data-olcrm-processed', 'true');
      
      // Add honeypot
      if (!form.querySelector('[name="_honeypot"]')) {
        var honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = '_honeypot';
        honeypot.style.cssText = 'position:absolute;left:-9999px;opacity:0;height:0;width:0;';
        honeypot.tabIndex = -1;
        honeypot.autocomplete = 'off';
        form.appendChild(honeypot);
      }
      
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var honeypotField = form.querySelector('[name="_honeypot"]');
        if (honeypotField && honeypotField.value) return;
        
        var formData = new FormData(form);
        var data = {};
        formData.forEach(function(value, key) {
          if (key !== '_honeypot') data[key] = value;
        });
        
        data._page_url = window.location.href;
        data._referrer = document.referrer;
        
        var submitBtn = form.querySelector('[type="submit"]');
        var originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Sending...';
        }
        
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(result) {
          if (result.success) {
            var msg = document.createElement('div');
            msg.style.cssText = 'padding:20px;background:#10B981;color:white;text-align:center;border-radius:8px;margin-top:10px;';
            msg.innerHTML = result.message || successMessage;
            form.style.display = 'none';
            form.parentNode.insertBefore(msg, form.nextSibling);
          } else {
            throw new Error(result.error || 'Something went wrong');
          }
        })
        .catch(function(err) {
          alert(err.message);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        });
      });
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  console.log('OneLinker CRM: Form capture ready');
})();
`;
}
