import { useState, useCallback } from 'react';
import { useSubscriptionSafe } from '@/contexts/SubscriptionContext';
import { PlanType } from '@/hooks/useSubscription';

export type FeatureAction = 
  | 'send_campaigns'
  | 'activate_chatbots'
  | 'add_users'
  | 'leads_limit'
  | 'listings_limit'
  | 'team_management'
  | 'advanced_assignment'
  | 'custom_roles'
  | 'automations';

interface EnforcementResult {
  allowed: boolean;
  requiredPlan?: PlanType;
  feature?: FeatureAction;
}

export function usePlanEnforcement() {
  const subscription = useSubscriptionSafe();
  const [upgradeModalState, setUpgradeModalState] = useState<{
    open: boolean;
    feature?: FeatureAction;
    requiredPlan?: PlanType;
  }>({ open: false });

  const checkFeature = useCallback((feature: FeatureAction): EnforcementResult => {
    if (!subscription) {
      return { allowed: true };
    }

    const { 
      canSendCampaign, 
      canActivateChatbot, 
      canAddUser, 
      canAddLead, 
      canAddListing,
      canManageTeam,
      canUseAdvancedAssignment,
      canUseCustomRoles,
      canUseAutomations,
      getRequiredPlanForFeature 
    } = subscription;

    switch (feature) {
      case 'send_campaigns':
        return {
          allowed: canSendCampaign(),
          requiredPlan: canSendCampaign() ? undefined : getRequiredPlanForFeature('send_campaigns'),
          feature,
        };
      case 'activate_chatbots':
        return {
          allowed: canActivateChatbot(),
          requiredPlan: canActivateChatbot() ? undefined : getRequiredPlanForFeature('activate_chatbots'),
          feature,
        };
      case 'add_users':
        return {
          allowed: canAddUser(),
          requiredPlan: canAddUser() ? undefined : 'starter',
          feature,
        };
      case 'leads_limit':
        return {
          allowed: canAddLead(),
          requiredPlan: canAddLead() ? undefined : 'starter',
          feature,
        };
      case 'listings_limit':
        return {
          allowed: canAddListing(),
          requiredPlan: canAddListing() ? undefined : 'starter',
          feature,
        };
      case 'team_management':
        return {
          allowed: canManageTeam(),
          requiredPlan: canManageTeam() ? undefined : getRequiredPlanForFeature('team_management'),
          feature,
        };
      case 'advanced_assignment':
        return {
          allowed: canUseAdvancedAssignment(),
          requiredPlan: canUseAdvancedAssignment() ? undefined : getRequiredPlanForFeature('advanced_assignment'),
          feature,
        };
      case 'custom_roles':
        return {
          allowed: canUseCustomRoles(),
          requiredPlan: canUseCustomRoles() ? undefined : getRequiredPlanForFeature('custom_roles'),
          feature,
        };
      case 'automations':
        return {
          allowed: canUseAutomations(),
          requiredPlan: canUseAutomations() ? undefined : getRequiredPlanForFeature('automations'),
          feature,
        };
      default:
        return { allowed: true };
    }
  }, [subscription]);

  const enforceFeature = useCallback((feature: FeatureAction): boolean => {
    const result = checkFeature(feature);
    
    if (!result.allowed) {
      setUpgradeModalState({
        open: true,
        feature: result.feature,
        requiredPlan: result.requiredPlan,
      });
      return false;
    }
    
    return true;
  }, [checkFeature]);

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalState({ open: false });
  }, []);

  return {
    checkFeature,
    enforceFeature,
    upgradeModalState,
    closeUpgradeModal,
  };
}
