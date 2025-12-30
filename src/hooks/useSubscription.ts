import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlanType = 'free' | 'starter' | 'growth' | 'business';

export interface PlanFeatures {
  planType: PlanType;
  planName: string;
  userLimit: number;
  leadLimit: number | null;
  listingLimit: number | null;
  canSendCampaigns: boolean;
  canActivateChatbots: boolean;
  canUseAutomations: boolean;
  canManageTeam: boolean;
  canUseAdvancedAssignment: boolean;
  canUseCustomRoles: boolean;
  hasPrioritySupport: boolean;
  hasDedicatedManager: boolean;
  currentUserCount: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  planType: PlanType;
  priceMonthly: number;
  priceYearly: number;
  userLimit: number;
  leadLimit: number | null;
  listingLimit: number | null;
  canSendCampaigns: boolean;
  canActivateChatbots: boolean;
  canUseAutomations: boolean;
  canManageTeam: boolean;
  canUseAdvancedAssignment: boolean;
  canUseCustomRoles: boolean;
  hasPrioritySupport: boolean;
  hasDedicatedManager: boolean;
}

export interface SubscriptionUsage {
  leadsCount: number;
  listingsCount: number;
  usersCount: number;
}

export function useSubscription() {
  const { profile } = useAuth();
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);
  const [allPlans, setAllPlans] = useState<PricingPlan[]>([]);
  const [usage, setUsage] = useState<SubscriptionUsage>({ leadsCount: 0, listingsCount: 0, usersCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlanFeatures = useCallback(async () => {
    if (!profile?.company_id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_company_plan', { p_company_id: profile.company_id });

      if (error) throw error;

      if (data && data.length > 0) {
        const plan = data[0];
        setPlanFeatures({
          planType: plan.plan_type as PlanType,
          planName: plan.plan_name,
          userLimit: plan.user_limit,
          leadLimit: plan.lead_limit,
          listingLimit: plan.listing_limit,
          canSendCampaigns: plan.can_send_campaigns,
          canActivateChatbots: plan.can_activate_chatbots,
          canUseAutomations: plan.can_use_automations,
          canManageTeam: plan.can_manage_team,
          canUseAdvancedAssignment: plan.can_use_advanced_assignment,
          canUseCustomRoles: plan.can_use_custom_roles,
          hasPrioritySupport: plan.has_priority_support,
          hasDedicatedManager: plan.has_dedicated_manager,
          currentUserCount: plan.current_user_count,
        });
      }
    } catch (error) {
      console.error('Error fetching plan features:', error);
    }
  }, [profile?.company_id]);

  const fetchAllPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;

      if (data) {
        setAllPlans(data.map(plan => ({
          id: plan.id,
          name: plan.name,
          planType: plan.plan_type as PlanType,
          priceMonthly: Number(plan.price_monthly),
          priceYearly: Number(plan.price_yearly),
          userLimit: plan.user_limit,
          leadLimit: plan.lead_limit,
          listingLimit: plan.listing_limit,
          canSendCampaigns: plan.can_send_campaigns,
          canActivateChatbots: plan.can_activate_chatbots,
          canUseAutomations: plan.can_use_automations,
          canManageTeam: plan.can_manage_team,
          canUseAdvancedAssignment: plan.can_use_advanced_assignment,
          canUseCustomRoles: plan.can_use_custom_roles,
          hasPrioritySupport: plan.has_priority_support,
          hasDedicatedManager: plan.has_dedicated_manager,
        })));
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    if (!profile?.company_id) return;

    try {
      const [leadsResult, listingsResult, usersResult] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('company_id', profile.company_id),
        supabase.from('agents').select('id', { count: 'exact', head: true }).eq('company_id', profile.company_id).eq('status', 'active'),
      ]);

      setUsage({
        leadsCount: leadsResult.count || 0,
        listingsCount: listingsResult.count || 0,
        usersCount: usersResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPlanFeatures(), fetchAllPlans(), fetchUsage()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchPlanFeatures, fetchAllPlans, fetchUsage]);

  // Permission check functions
  const canAddLead = useCallback(() => {
    if (!planFeatures) return true;
    if (planFeatures.leadLimit === null) return true;
    return usage.leadsCount < planFeatures.leadLimit;
  }, [planFeatures, usage.leadsCount]);

  const canAddListing = useCallback(() => {
    if (!planFeatures) return true;
    if (planFeatures.listingLimit === null) return true;
    return usage.listingsCount < planFeatures.listingLimit;
  }, [planFeatures, usage.listingsCount]);

  const canAddUser = useCallback(() => {
    if (!planFeatures) return true;
    return planFeatures.currentUserCount < planFeatures.userLimit;
  }, [planFeatures]);

  const canSendCampaign = useCallback(() => {
    return planFeatures?.canSendCampaigns ?? false;
  }, [planFeatures]);

  const canActivateChatbot = useCallback(() => {
    return planFeatures?.canActivateChatbots ?? false;
  }, [planFeatures]);

  const canUseAutomations = useCallback(() => {
    return planFeatures?.canUseAutomations ?? false;
  }, [planFeatures]);

  const canManageTeam = useCallback(() => {
    return planFeatures?.canManageTeam ?? false;
  }, [planFeatures]);

  const canUseAdvancedAssignment = useCallback(() => {
    return planFeatures?.canUseAdvancedAssignment ?? false;
  }, [planFeatures]);

  const canUseCustomRoles = useCallback(() => {
    return planFeatures?.canUseCustomRoles ?? false;
  }, [planFeatures]);

  const isFreePlan = useCallback(() => {
    return planFeatures?.planType === 'free';
  }, [planFeatures]);

  const getRequiredPlanForFeature = useCallback((feature: string): PlanType => {
    switch (feature) {
      case 'send_campaigns':
      case 'activate_chatbots':
      case 'automations':
      case 'team_management':
        return 'starter';
      case 'advanced_assignment':
        return 'growth';
      case 'custom_roles':
        return 'business';
      default:
        return 'starter';
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    await Promise.all([fetchPlanFeatures(), fetchUsage()]);
  }, [fetchPlanFeatures, fetchUsage]);

  return {
    planFeatures,
    allPlans,
    usage,
    isLoading,
    // Permission checks
    canAddLead,
    canAddListing,
    canAddUser,
    canSendCampaign,
    canActivateChatbot,
    canUseAutomations,
    canManageTeam,
    canUseAdvancedAssignment,
    canUseCustomRoles,
    isFreePlan,
    getRequiredPlanForFeature,
    refreshSubscription,
  };
}
