import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  name?: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

interface ColumnMapping {
  phone: string;
  name?: string;
  email?: string;
  [key: string]: string | undefined;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      campaign_id, 
      company_id,
      import_type, // 'manual_selection' | 'select_all' | 'excel_import' | 'filter'
      lead_ids, // For manual selection
      filters, // For filter-based selection
      imported_data, // For Excel import
      column_mapping, // For Excel import column mapping
      template_variables_mapping // Map which columns go to which template variables
    } = await req.json();

    if (!campaign_id || !company_id || !import_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let recipients: any[] = [];
    const importErrors: any[] = [];
    const existingPhones = new Set<string>();

    // Get existing recipients for this campaign to check duplicates
    const { data: existingRecipients } = await supabase
      .from('campaign_recipients')
      .select('phone_number')
      .eq('campaign_id', campaign_id);

    existingRecipients?.forEach(r => existingPhones.add(normalizePhone(r.phone_number)));

    if (import_type === 'manual_selection' && lead_ids?.length > 0) {
      // Import from manual lead selection
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, phone, email, opted_in')
        .eq('company_id', company_id)
        .in('id', lead_ids);

      if (error) throw error;

      for (const lead of leads || []) {
        const result = validateAndPrepareRecipient(
          lead, 
          campaign_id, 
          company_id, 
          'manual_selection',
          existingPhones,
          template_variables_mapping
        );
        if (result.valid) {
          recipients.push(result.recipient);
          existingPhones.add(normalizePhone(lead.phone));
        } else {
          importErrors.push(result.error);
        }
      }
    } 
    else if (import_type === 'select_all') {
      // Import all opted-in leads
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, phone, email, opted_in')
        .eq('company_id', company_id)
        .eq('opted_in', true)
        .not('phone', 'is', null);

      if (error) throw error;

      for (const lead of leads || []) {
        const result = validateAndPrepareRecipient(
          lead, 
          campaign_id, 
          company_id, 
          'select_all',
          existingPhones,
          template_variables_mapping
        );
        if (result.valid) {
          recipients.push(result.recipient);
          existingPhones.add(normalizePhone(lead.phone));
        } else {
          importErrors.push(result.error);
        }
      }
    }
    else if (import_type === 'filter' && filters) {
      // Import based on filters
      let query = supabase
        .from('leads')
        .select('id, name, phone, email, opted_in, stage, source, tags, location')
        .eq('company_id', company_id)
        .eq('opted_in', true)
        .not('phone', 'is', null);

      // Apply filters
      if (filters.stages?.length > 0) {
        query = query.in('stage', filters.stages);
      }
      if (filters.sources?.length > 0) {
        query = query.in('source', filters.sources);
      }
      if (filters.locations?.length > 0) {
        query = query.in('location', filters.locations);
      }
      if (filters.tags?.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      for (const lead of leads || []) {
        const result = validateAndPrepareRecipient(
          lead, 
          campaign_id, 
          company_id, 
          'filter',
          existingPhones,
          template_variables_mapping
        );
        if (result.valid) {
          recipients.push(result.recipient);
          existingPhones.add(normalizePhone(lead.phone));
        } else {
          importErrors.push(result.error);
        }
      }
    }
    else if (import_type === 'excel_import' && imported_data?.length > 0) {
      const mapping = column_mapping as ColumnMapping;
      
      if (!mapping?.phone) {
        return new Response(JSON.stringify({ error: 'Phone column mapping is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (let i = 0; i < imported_data.length; i++) {
        const row = imported_data[i] as ImportRow;
        const phone = row[mapping.phone];
        const name = mapping.name ? row[mapping.name] : null;
        const email = mapping.email ? row[mapping.email] : null;

        // Build template variables from mapping
        const templateVars: Record<string, string> = {};
        if (template_variables_mapping) {
          for (const [varName, columnName] of Object.entries(template_variables_mapping)) {
            if (columnName && row[columnName as string]) {
              templateVars[varName] = String(row[columnName as string]);
            }
          }
        }

        const result = validateAndPrepareRecipientFromImport(
          { phone, name, email, row_number: i + 1, raw_data: row },
          campaign_id,
          company_id,
          existingPhones,
          templateVars
        );

        if (result.valid) {
          recipients.push(result.recipient);
          existingPhones.add(normalizePhone(phone));
        } else {
          importErrors.push(result.error);
        }
      }
    }

    // Insert recipients in batches
    if (recipients.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('campaign_recipients')
          .insert(batch);
        
        if (insertError) {
          console.error('Error inserting recipients batch:', insertError);
        }
      }
    }

    // Insert import errors
    if (importErrors.length > 0) {
      await supabase
        .from('campaign_import_errors')
        .insert(importErrors);
    }

    // Update campaign audience count
    await supabase
      .from('campaigns')
      .update({ 
        audience_count: recipients.length,
        total_recipients: recipients.length
      })
      .eq('id', campaign_id);

    // Log the import
    await supabase.rpc('log_campaign_action', {
      p_campaign_id: campaign_id,
      p_company_id: company_id,
      p_action: `Imported ${recipients.length} recipients via ${import_type}`,
      p_action_type: 'imported',
      p_details: { 
        import_type,
        total_imported: recipients.length,
        duplicates_skipped: importErrors.filter(e => e.error_type === 'duplicate').length,
        no_consent_skipped: importErrors.filter(e => e.error_type === 'no_consent').length,
        invalid_phone_skipped: importErrors.filter(e => e.error_type === 'invalid_phone').length,
        total_errors: importErrors.length
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      imported: recipients.length,
      errors: importErrors.length,
      error_details: importErrors.slice(0, 10) // Return first 10 errors for preview
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

function isValidPhone(phone: string | null | undefined): boolean {
  const normalized = normalizePhone(phone);
  return normalized.length >= 10 && normalized.length <= 15;
}

function validateAndPrepareRecipient(
  lead: any,
  campaignId: string,
  companyId: string,
  importedFrom: string,
  existingPhones: Set<string>,
  templateVariablesMapping?: Record<string, string>
): { valid: boolean; recipient?: any; error?: any } {
  const normalizedPhone = normalizePhone(lead.phone);

  // Check for valid phone
  if (!isValidPhone(lead.phone)) {
    return {
      valid: false,
      error: {
        campaign_id: campaignId,
        company_id: companyId,
        lead_data: { id: lead.id, phone: lead.phone, name: lead.name },
        error_type: 'invalid_phone',
        error_message: 'Invalid phone number format'
      }
    };
  }

  // Check for duplicates
  if (existingPhones.has(normalizedPhone)) {
    return {
      valid: false,
      error: {
        campaign_id: campaignId,
        company_id: companyId,
        lead_data: { id: lead.id, phone: lead.phone, name: lead.name },
        error_type: 'duplicate',
        error_message: 'Duplicate phone number'
      }
    };
  }

  // Check consent (only skip if explicitly false)
  if (lead.opted_in === false) {
    return {
      valid: false,
      error: {
        campaign_id: campaignId,
        company_id: companyId,
        lead_data: { id: lead.id, phone: lead.phone, name: lead.name },
        error_type: 'no_consent',
        error_message: 'Lead has not opted in'
      }
    };
  }

  // Build template variables
  const templateVariables: Record<string, string> = {
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || ''
  };

  return {
    valid: true,
    recipient: {
      campaign_id: campaignId,
      company_id: companyId,
      lead_id: lead.id,
      phone_number: lead.phone,
      name: lead.name,
      template_variables: templateVariables,
      delivery_status: 'queued',
      imported_from: importedFrom,
      is_duplicate: false,
      consent_checked: lead.opted_in !== false
    }
  };
}

function validateAndPrepareRecipientFromImport(
  data: { phone: string; name: string | null; email: string | null; row_number: number; raw_data: any },
  campaignId: string,
  companyId: string,
  existingPhones: Set<string>,
  templateVariables: Record<string, string>
): { valid: boolean; recipient?: any; error?: any } {
  const normalizedPhone = normalizePhone(data.phone);

  // Check for missing phone
  if (!data.phone) {
    return {
      valid: false,
      error: {
        campaign_id: campaignId,
        company_id: companyId,
        row_number: data.row_number,
        lead_data: data.raw_data,
        error_type: 'missing_phone',
        error_message: 'Missing phone number'
      }
    };
  }

  // Check for valid phone
  if (!isValidPhone(data.phone)) {
    return {
      valid: false,
      error: {
        campaign_id: campaignId,
        company_id: companyId,
        row_number: data.row_number,
        lead_data: data.raw_data,
        error_type: 'invalid_phone',
        error_message: 'Invalid phone number format'
      }
    };
  }

  // Check for duplicates
  if (existingPhones.has(normalizedPhone)) {
    return {
      valid: false,
      error: {
        campaign_id: campaignId,
        company_id: companyId,
        row_number: data.row_number,
        lead_data: data.raw_data,
        error_type: 'duplicate',
        error_message: 'Duplicate phone number'
      }
    };
  }

  return {
    valid: true,
    recipient: {
      campaign_id: campaignId,
      company_id: companyId,
      lead_id: null,
      phone_number: data.phone,
      name: data.name,
      template_variables: {
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        ...templateVariables
      },
      delivery_status: 'queued',
      imported_from: 'excel_import',
      is_duplicate: false,
      consent_checked: true
    }
  };
}
