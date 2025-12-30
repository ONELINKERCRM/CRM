import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CompanySettings {
  id: string;
  company_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  new_lead_badge_color: string;
  new_lead_background_color: string;
  new_lead_animation: 'none' | 'fade' | 'glow';
}

const defaultSettings = {
  new_lead_badge_color: '#22c55e',
  new_lead_background_color: '#dcfce7',
  new_lead_animation: 'fade' as const,
};

export function useCompanySettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!profile?.company_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('company_settings')
      .select('id, company_id, logo_url, primary_color, secondary_color, new_lead_badge_color, new_lead_background_color, new_lead_animation')
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching company settings:', error);
    }

    if (data) {
      setSettings({
        id: data.id,
        company_id: data.company_id,
        logo_url: data.logo_url,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        new_lead_badge_color: data.new_lead_badge_color || defaultSettings.new_lead_badge_color,
        new_lead_background_color: data.new_lead_background_color || defaultSettings.new_lead_background_color,
        new_lead_animation: (data.new_lead_animation as 'none' | 'fade' | 'glow') || defaultSettings.new_lead_animation,
      });
    } else if (profile?.company_id) {
      // Return default settings if none exist
      setSettings({
        id: '',
        company_id: profile.company_id,
        logo_url: null,
        primary_color: null,
        secondary_color: null,
        ...defaultSettings,
      });
    }

    setIsLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<Pick<CompanySettings, 'new_lead_badge_color' | 'new_lead_background_color' | 'new_lead_animation'>>) => {
    if (!profile?.company_id) return { error: new Error('No company found') };

    setIsSaving(true);

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        company_id: profile.company_id,
        ...updates,
      }, { onConflict: 'company_id' });

    if (error) {
      toast.error('Failed to update settings');
      console.error('Error updating company settings:', error);
    } else {
      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Settings saved');
    }

    setIsSaving(false);
    return { error };
  };

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    refetch: fetchSettings,
  };
}
