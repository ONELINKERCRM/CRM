import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WebsiteForm {
  id: string;
  company_id: string;
  form_name: string;
  form_type: 'html' | 'embed' | 'webhook';
  status: 'active' | 'paused';
  success_redirect_url?: string;
  thank_you_message?: string;
  spam_protection?: {
    honeypot?: boolean;
    rate_limit?: number;
  };
  field_mapping?: Record<string, string>;
  auto_assign_rules?: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WebsiteFormField {
  id: string;
  form_id: string;
  field_name: string;
  field_label?: string;
  field_type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'hidden' | 'checkbox' | 'number' | 'date';
  is_required: boolean;
  mapped_to?: 'name' | 'email' | 'phone' | 'message' | 'custom';
  options?: unknown[];
  sort_order: number;
  created_at: string;
}

export interface WebsiteFormSubmission {
  id: string;
  company_id: string;
  form_id: string;
  submission_data: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  referrer_url?: string;
  page_url?: string;
  lead_id?: string;
  status: 'processed' | 'spam' | 'duplicate' | 'error' | 'pending';
  error_message?: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  company_id: string;
  key_name: string;
  api_key_prefix: string;
  permissions: Record<string, boolean>;
  status: 'active' | 'revoked';
  last_used_at?: string;
  expires_at?: string;
  created_by?: string;
  created_at: string;
}

export function useWebsiteForms() {
  const [forms, setForms] = useState<WebsiteForm[]>([]);
  const [submissions, setSubmissions] = useState<WebsiteFormSubmission[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Get company ID
  useEffect(() => {
    const getCompanyId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: agent } = await supabase
          .from('agents')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
        
        if (agent?.company_id) {
          setCompanyId(agent.company_id);
        }
      }
    };
    getCompanyId();
  }, []);

  // Fetch forms
  const fetchForms = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('website_forms')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms((data || []) as WebsiteForm[]);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to fetch forms');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Fetch submissions
  const fetchSubmissions = useCallback(async (formId?: string, limit = 100) => {
    if (!companyId) return;

    try {
      let query = supabase
        .from('website_form_submissions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (formId) {
        query = query.eq('form_id', formId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubmissions((data || []) as WebsiteFormSubmission[]);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  }, [companyId]);

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys((data || []) as ApiKey[]);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  }, [companyId]);

  // Create form
  const createForm = async (formData: Partial<WebsiteForm>) => {
    if (!companyId) return { success: false, error: 'No company ID' };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('website_forms')
        .insert({
          company_id: companyId,
          form_name: formData.form_name || 'New Form',
          form_type: formData.form_type || 'html',
          status: formData.status || 'active',
          success_redirect_url: formData.success_redirect_url,
          thank_you_message: formData.thank_you_message,
          spam_protection: formData.spam_protection || { honeypot: true, rate_limit: 10 },
          created_by: agent?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setForms(prev => [data as WebsiteForm, ...prev]);
      toast.success('Form created successfully');
      return { success: true, form: data };
    } catch (error) {
      console.error('Error creating form:', error);
      toast.error('Failed to create form');
      return { success: false, error };
    }
  };

  // Update form
  const updateForm = async (formId: string, updates: Partial<WebsiteForm>) => {
    try {
      // Convert to JSON-safe format
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.form_name !== undefined) updateData.form_name = updates.form_name;
      if (updates.form_type !== undefined) updateData.form_type = updates.form_type;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.success_redirect_url !== undefined) updateData.success_redirect_url = updates.success_redirect_url;
      if (updates.thank_you_message !== undefined) updateData.thank_you_message = updates.thank_you_message;
      if (updates.spam_protection !== undefined) updateData.spam_protection = JSON.parse(JSON.stringify(updates.spam_protection));
      if (updates.field_mapping !== undefined) updateData.field_mapping = JSON.parse(JSON.stringify(updates.field_mapping));
      if (updates.auto_assign_rules !== undefined) updateData.auto_assign_rules = JSON.parse(JSON.stringify(updates.auto_assign_rules));

      const { data, error } = await supabase
        .from('website_forms')
        .update(updateData)
        .eq('id', formId)
        .select()
        .single();

      if (error) throw error;

      setForms(prev => prev.map(f => f.id === formId ? data as WebsiteForm : f));
      toast.success('Form updated');
      return { success: true };
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error('Failed to update form');
      return { success: false, error };
    }
  };

  // Delete form
  const deleteForm = async (formId: string) => {
    try {
      const { error } = await supabase
        .from('website_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      setForms(prev => prev.filter(f => f.id !== formId));
      toast.success('Form deleted');
      return { success: true };
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
      return { success: false, error };
    }
  };

  // Create API key
  const createApiKey = async (keyName: string) => {
    if (!companyId) return { success: false, error: 'No company ID' };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      // Generate API key
      const { data: keyData } = await supabase.rpc('generate_api_key');
      const apiKey = keyData as string;
      const keyPrefix = apiKey.substring(0, 10);

      // Hash the key for storage (simplified - in production use proper hashing)
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: insertedKey, error } = await supabase
        .from('api_keys')
        .insert({
          company_id: companyId,
          key_name: keyName,
          api_key_hash: keyHash,
          api_key_prefix: keyPrefix,
          permissions: { forms: true },
          created_by: agent?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => [insertedKey as ApiKey, ...prev]);
      toast.success('API key created');
      
      // Return the actual key (only time it's visible)
      return { success: true, apiKey, keyRecord: insertedKey };
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
      return { success: false, error };
    }
  };

  // Revoke API key
  const revokeApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ status: 'revoked' })
        .eq('id', keyId);

      if (error) throw error;

      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: 'revoked' as const } : k));
      toast.success('API key revoked');
      return { success: true };
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast.error('Failed to revoke API key');
      return { success: false, error };
    }
  };

  // Get form endpoint URL
  const getFormEndpoint = (formId: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-form-submit?form_id=${formId}`;
  };

  // Get embed script
  const getEmbedScript = (formId: string) => {
    const endpoint = getFormEndpoint(formId);
    return `<script>
(function() {
  var form = document.querySelector('form[data-olcrm-form="${formId}"]');
  if (!form) return;
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    var formData = new FormData(form);
    var data = Object.fromEntries(formData.entries());
    data._page_url = window.location.href;
    data._referrer = document.referrer;
    
    // Add honeypot check
    if (form.querySelector('[name="_honeypot"]')?.value) return;
    
    fetch('${endpoint}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(res) { return res.json(); })
    .then(function(result) {
      if (result.success) {
        if (result.redirect_url) {
          window.location.href = result.redirect_url;
        } else {
          form.innerHTML = '<p>' + (result.message || 'Thank you!') + '</p>';
        }
      } else {
        alert(result.error || 'Submission failed');
      }
    })
    .catch(function(err) {
      console.error('Form error:', err);
      alert('Submission failed. Please try again.');
    });
  });
})();
</script>`;
  };

  // Get HTML form template
  const getHtmlFormTemplate = (formId: string) => {
    const endpoint = getFormEndpoint(formId);
    return `<form action="${endpoint}" method="POST" data-olcrm-form="${formId}">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Email Address" required />
  <input type="tel" name="phone" placeholder="Phone Number" />
  <textarea name="message" placeholder="Your Message"></textarea>
  
  <!-- Honeypot field - do not remove -->
  <input type="text" name="_honeypot" style="display:none" tabindex="-1" autocomplete="off" />
  
  <button type="submit">Submit</button>
</form>

<!-- Add the OneLinker embed script -->
${getEmbedScript(formId)}`;
  };

  // Initial fetch
  useEffect(() => {
    if (companyId) {
      fetchForms();
      fetchSubmissions();
      fetchApiKeys();
    }
  }, [companyId, fetchForms, fetchSubmissions, fetchApiKeys]);

  // Realtime subscription for submissions
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('website_form_submissions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'website_form_submissions',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          setSubmissions(prev => [payload.new as WebsiteFormSubmission, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return {
    forms,
    submissions,
    apiKeys,
    isLoading,
    companyId,
    fetchForms,
    fetchSubmissions,
    fetchApiKeys,
    createForm,
    updateForm,
    deleteForm,
    createApiKey,
    revokeApiKey,
    getFormEndpoint,
    getEmbedScript,
    getHtmlFormTemplate,
  };
}
