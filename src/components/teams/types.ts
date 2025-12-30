export type UserRole = 'admin' | 'manager' | 'team_leader' | 'agent';
export type UserStatus = 'invited' | 'active' | 'inactive' | 'on_leave';

export interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  teamId?: string;
  assignedLeads: number;
  assignedListings: number;
  performance: {
    leadsConverted: number;
    revenue: number;
    listingsPublished: number;
  };
  permissions: {
    leads: boolean;
    listings: boolean;
    marketing: boolean;
    reports: boolean;
    integrations: boolean;
  };
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  leaderId?: string;
  status: 'active' | 'inactive';
  agents: Agent[];
  assignedLeads: number;
  assignedListings: number;
  createdAt: Date;
}

export const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  team_leader: 'Team Leader',
  agent: 'Agent',
};

export const statusColors: Record<UserStatus, string> = {
  invited: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  on_leave: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};
