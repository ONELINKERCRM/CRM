import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { allCountries } from '@/components/ui/country-select';

export type Company = {
  id: string;
  name: string;
  country: string;
  currency: string;
  industry: string;
  lead_sources: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// Re-export for backward compatibility
const countries = allCountries.map(c => ({ code: c.code, name: c.name }));

// Get unique currencies from all countries
const currencies = [...new Set(allCountries.map(c => c.currency))].sort();

const industries = [
  { id: 'brokerage', label: 'Real Estate Brokerage' },
  { id: 'developer', label: 'Developer' },
  { id: 'property-management', label: 'Property Management' },
  { id: 'holiday-homes', label: 'Holiday Homes / Short Stay' },
  { id: 'mortgage', label: 'Mortgage Brokerage' },
  { id: 'other', label: 'Other' },
];

export function useCompany() {
  const { profile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.company_id) {
      fetchCompany();
    } else {
      setIsLoading(false);
    }
  }, [profile?.company_id]);

  const fetchCompany = async () => {
    if (!profile?.company_id) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching company:', error);
    } else {
      setCompany(data);
    }
    setIsLoading(false);
  };

  const updateCompany = async (updates: Partial<Pick<Company, 'name' | 'country' | 'currency' | 'industry'>>) => {
    if (!company?.id) return { error: new Error('No company found') };

    setIsSaving(true);
    const { error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', company.id);

    if (error) {
      toast.error('Failed to update company settings');
      console.error('Error updating company:', error);
    } else {
      setCompany(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Company settings saved');
    }
    setIsSaving(false);
    return { error };
  };

  const createCompany = async (data: { name: string; country: string; currency: string; industry: string }) => {
    if (!profile?.id) return { error: new Error('No user found') };

    setIsSaving(true);
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: data.name,
        country: data.country,
        currency: data.currency,
        industry: data.industry,
        lead_sources: [],
        created_by: profile.id,
      })
      .select('*')
      .single();

    if (companyError) {
      toast.error('Failed to create company');
      console.error('Error creating company:', companyError);
      setIsSaving(false);
      return { error: companyError };
    }

    // Update profile with company_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        company_id: newCompany.id,
        onboarding_completed: true,
      })
      .eq('id', profile.id);

    if (profileError) {
      toast.error('Failed to link company to profile');
      console.error('Error updating profile:', profileError);
      setIsSaving(false);
      return { error: profileError };
    }

    setCompany(newCompany);
    toast.success('Company created successfully');
    setIsSaving(false);
    
    // Reload page to refresh auth context
    window.location.reload();
    return { error: null };
  };

  return {
    company,
    isLoading,
    isSaving,
    updateCompany,
    createCompany,
    refetch: fetchCompany,
    countries,
    currencies,
    industries,
  };
}