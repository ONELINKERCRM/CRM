import React, { createContext, useContext, ReactNode } from 'react';
import { useSubscription, PlanFeatures, PricingPlan, SubscriptionUsage, PlanType } from '@/hooks/useSubscription';

interface SubscriptionContextType {
  planFeatures: PlanFeatures | null;
  allPlans: PricingPlan[];
  usage: SubscriptionUsage;
  isLoading: boolean;
  canAddLead: () => boolean;
  canAddListing: () => boolean;
  canAddUser: () => boolean;
  canSendCampaign: () => boolean;
  canActivateChatbot: () => boolean;
  canUseAutomations: () => boolean;
  canManageTeam: () => boolean;
  canUseAdvancedAssignment: () => boolean;
  canUseCustomRoles: () => boolean;
  isFreePlan: () => boolean;
  getRequiredPlanForFeature: (feature: string) => PlanType;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscription = useSubscription();

  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}

// Safe version that doesn't throw
export function useSubscriptionSafe() {
  const context = useContext(SubscriptionContext);
  return context;
}
