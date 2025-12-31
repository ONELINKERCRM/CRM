import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that ensures the current user has a company assigned.
 * If the user doesn't have a company, one is automatically created for them.
 * This ensures all users have full access to all features.
 */
export function useAutoCompany() {
  const { user, profile, refreshProfile } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(profile?.company_id || null);
  const [isLoading, setIsLoading] = useState(!profile?.company_id);
  const [error, setError] = useState<string | null>(null);
  const isCreating = useRef(false);

  useEffect(() => {
    // If profile already has company_id, use it
    if (profile?.company_id) {
      setCompanyId(profile.company_id);
      setIsLoading(false);
      return;
    }

    // If no user, stop loading
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate creation attempts
    if (isCreating.current) {
      return;
    }

    let isMounted = true;

    async function ensureCompany() {
      isCreating.current = true;

      try {


        // Double-check profile in case context is stale
        const { data: freshProfile, error: profileError } = await supabase
          .from('profiles')
          .select('company_id, first_name')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('[useAutoCompany] Error fetching profile:', profileError);
          if (isMounted) {
            setError('Failed to load profile');
            setIsLoading(false);
          }
          isCreating.current = false;
          return;
        }

        if (freshProfile?.company_id) {

          if (isMounted) {
            setCompanyId(freshProfile.company_id);
            setIsLoading(false);
          }
          isCreating.current = false;
          return;
        }

        // Create a new company for the user

        const userName = freshProfile?.first_name || user.email?.split('@')[0] || 'User';
        let companyName = `${userName}'s Company`;

        // Try to create company, retry with timestamp if it fails (likely due to unique name)
        const createCompanyAttempt = async (name: string): Promise<{ data: any, error: any }> => {
          return await supabase
            .from('companies')
            .insert({
              name: name,
              country: 'AE',
              currency: 'AED',
              industry: 'brokerage',
              lead_sources: [],
              created_by: user.id,
            })
            .select('id')
            .single();
        };

        let { data: newCompany, error: createError } = await createCompanyAttempt(companyName);

        if (createError) {
          // If error might be due to duplicate name, try appending random string
          console.warn('[useAutoCompany] First creation attempt failed, retrying with unique name:', createError);
          const timestamp = new Date().getTime().toString().slice(-4);
          companyName = `${companyName} ${timestamp}`;
          const retry = await createCompanyAttempt(companyName);
          newCompany = retry.data;
          createError = retry.error;
        }

        if (createError) {
          console.error('[useAutoCompany] Error creating company:', createError);
          if (isMounted) {
            setError('Failed to create company');
            setIsLoading(false);
          }
          isCreating.current = false;
          return;
        }

        // Link company to profile and set user as admin
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            company_id: newCompany.id,
            onboarding_completed: true,
            role: 'admin'
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('[useAutoCompany] Error linking company:', updateError);
        } else {
          // Also insert into user_roles (the security source of truth)
          await supabase
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: 'admin'
            });

          // Refresh the auth context profile
          await refreshProfile?.();
        }


        if (isMounted) {
          setCompanyId(newCompany.id);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('[useAutoCompany] Unexpected error:', err);
        if (isMounted) {
          setError(err.message || 'Unexpected error');
          setIsLoading(false);
        }
      } finally {
        isCreating.current = false;
      }
    }

    ensureCompany();

    return () => {
      isMounted = false;
    };
  }, [user, profile?.company_id, refreshProfile]);

  return { companyId, isLoading, error };
}
