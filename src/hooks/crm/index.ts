// Organization hooks
export { useOrganization } from '@/contexts/OrganizationContext';
export type { Organization, OrganizationMembership, OrgRole } from '@/contexts/OrganizationContext';

export { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
export type { OrganizationMember } from '@/hooks/useOrganizationMembers';

// CRM entity hooks
export { useContacts } from '@/hooks/useContacts';
export type { Contact } from '@/hooks/useContacts';

export { useAccounts } from '@/hooks/useAccounts';
export type { Account } from '@/hooks/useAccounts';

export { useDeals } from '@/hooks/useDeals';
export type { Deal, DealStatus } from '@/hooks/useDeals';

export { useCrmLeads } from '@/hooks/useCrmLeads';
export type { CrmLead } from '@/hooks/useCrmLeads';

export { usePipelines } from '@/hooks/usePipelines';
export type { Pipeline, PipelineStage } from '@/hooks/usePipelines';

export { useTasks } from '@/hooks/useTasks';
export type { Task, TaskStatus, TaskPriority } from '@/hooks/useTasks';

export { useActivities } from '@/hooks/useActivities';
export type { Activity, ActivityType } from '@/hooks/useActivities';
