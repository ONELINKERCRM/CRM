import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Json } from '@/integrations/supabase/types';

// Types
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
  joined_at: string;
  organization: Organization;
}

interface OrganizationContextType {
  // Current organization
  currentOrg: Organization | null;
  currentRole: OrgRole | null;
  
  // All user's organizations
  organizations: OrganizationMembership[];
  
  // Loading states
  isLoading: boolean;
  isLoadingOrgs: boolean;
  
  // Actions
  setCurrentOrg: (org: Organization | null) => void;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (data: CreateOrgData) => Promise<Organization>;
  updateOrganization: (orgId: string, data: Partial<Organization>) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  
  // Permission helpers
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canEdit: boolean;
}

interface CreateOrgData {
  name: string;
  slug?: string;
  industry?: string;
  size?: string;
  website?: string;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const ORG_STORAGE_KEY = 'current_organization_id';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [currentRole, setCurrentRole] = useState<OrgRole | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  // Fetch all organizations user belongs to
  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setIsLoadingOrgs(false);
      return;
    }

    setIsLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          is_active,
          joined_at,
          organization:organizations (
            id,
            name,
            slug,
            logo_url,
            website,
            industry,
            size,
            settings,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      // Transform the data to flatten organization
      const memberships: OrganizationMembership[] = (data || []).map((item: any) => ({
        id: item.id,
        organization_id: item.organization_id,
        user_id: item.user_id,
        role: item.role as OrgRole,
        is_active: item.is_active,
        joined_at: item.joined_at,
        organization: item.organization as Organization,
      }));

      setOrganizations(memberships);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    } finally {
      setIsLoadingOrgs(false);
    }
  }, [user]);

  // Set current organization with persistence
  const setCurrentOrg = useCallback((org: Organization | null) => {
    setCurrentOrgState(org);
    if (org) {
      localStorage.setItem(ORG_STORAGE_KEY, org.id);
      // Find and set role
      const membership = organizations.find(m => m.organization_id === org.id);
      setCurrentRole(membership?.role || null);
    } else {
      localStorage.removeItem(ORG_STORAGE_KEY);
      setCurrentRole(null);
    }
  }, [organizations]);

  // Switch to a different organization
  const switchOrganization = useCallback(async (orgId: string) => {
    const membership = organizations.find(m => m.organization_id === orgId);
    if (membership) {
      setCurrentOrgState(membership.organization);
      setCurrentRole(membership.role);
      localStorage.setItem(ORG_STORAGE_KEY, orgId);
    }
  }, [organizations]);

  // Create a new organization
  const createOrganization = useCallback(async (data: CreateOrgData): Promise<Organization> => {
    if (!user) throw new Error('Must be logged in to create organization');

    // Generate slug if not provided
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.name,
        slug,
        industry: data.industry,
        size: data.size,
        website: data.website,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString(),
      });

    if (memberError) throw memberError;

    // Create default settings
    await supabase
      .from('organization_settings')
      .insert({
        organization_id: org.id,
      });

    // Refresh organizations list
    await fetchOrganizations();

    return org;
  }, [user, fetchOrganizations]);

  // Update organization
  const updateOrganization = useCallback(async (orgId: string, data: Partial<Organization>) => {
    const { error } = await supabase
      .from('organizations')
      .update(data)
      .eq('id', orgId);

    if (error) throw error;

    // Update local state
    if (currentOrg?.id === orgId) {
      setCurrentOrgState(prev => prev ? { ...prev, ...data } : null);
    }

    await fetchOrganizations();
  }, [currentOrg, fetchOrganizations]);

  // Initialize: fetch orgs and restore last selected
  useEffect(() => {
    if (user) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrgState(null);
      setCurrentRole(null);
      setIsLoading(false);
      setIsLoadingOrgs(false);
    }
  }, [user, fetchOrganizations]);

  // Restore last selected org after orgs are loaded
  useEffect(() => {
    if (!isLoadingOrgs && organizations.length > 0 && !currentOrg) {
      const savedOrgId = localStorage.getItem(ORG_STORAGE_KEY);
      const savedMembership = savedOrgId 
        ? organizations.find(m => m.organization_id === savedOrgId)
        : null;

      if (savedMembership) {
        setCurrentOrgState(savedMembership.organization);
        setCurrentRole(savedMembership.role);
      } else {
        // Default to first organization
        const firstMembership = organizations[0];
        setCurrentOrgState(firstMembership.organization);
        setCurrentRole(firstMembership.role);
        localStorage.setItem(ORG_STORAGE_KEY, firstMembership.organization_id);
      }
      setIsLoading(false);
    } else if (!isLoadingOrgs && organizations.length === 0) {
      setIsLoading(false);
    }
  }, [isLoadingOrgs, organizations, currentOrg]);

  // Subscribe to organization_members changes for real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('org-membership-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchOrganizations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrganizations]);

  // Permission helpers
  const isOwner = currentRole === 'owner';
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  const canManageMembers = isAdmin;
  const canManageSettings = isAdmin;
  const canEdit = currentRole !== 'viewer';

  const value: OrganizationContextType = {
    currentOrg,
    currentRole,
    organizations,
    isLoading,
    isLoadingOrgs,
    setCurrentOrg,
    switchOrganization,
    createOrganization,
    updateOrganization,
    refreshOrganizations: fetchOrganizations,
    isOwner,
    isAdmin,
    canManageMembers,
    canManageSettings,
    canEdit,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
