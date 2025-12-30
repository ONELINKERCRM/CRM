import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization, OrgRole } from '@/contexts/OrganizationContext';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface InviteMemberData {
  email: string;
  role: OrgRole;
}

export function useOrganizationMembers() {
  const { currentOrg, isAdmin } = useOrganization();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all members of current organization
  const fetchMembers = useCallback(async () => {
    if (!currentOrg) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          is_active,
          invited_by,
          invited_at,
          joined_at,
          created_at,
          profile:profiles (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedMembers: OrganizationMember[] = (data || []).map((item: any) => ({
        id: item.id,
        organization_id: item.organization_id,
        user_id: item.user_id,
        role: item.role as OrgRole,
        is_active: item.is_active,
        invited_by: item.invited_by,
        invited_at: item.invited_at,
        joined_at: item.joined_at,
        created_at: item.created_at,
        profile: item.profile,
      }));

      setMembers(transformedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  // Update member role
  const updateMemberRole = useCallback(async (memberId: string, newRole: OrgRole) => {
    if (!isAdmin) {
      throw new Error('Only admins can update member roles');
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) throw error;

    // Update local state
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, role: newRole } : m
    ));
  }, [isAdmin]);

  // Deactivate member (soft remove)
  const deactivateMember = useCallback(async (memberId: string) => {
    if (!isAdmin) {
      throw new Error('Only admins can remove members');
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ is_active: false })
      .eq('id', memberId);

    if (error) throw error;

    // Update local state
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }, [isAdmin]);

  // Remove member permanently
  const removeMember = useCallback(async (memberId: string) => {
    if (!isAdmin) {
      throw new Error('Only admins can remove members');
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    // Update local state
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }, [isAdmin]);

  // Reactivate member
  const reactivateMember = useCallback(async (memberId: string) => {
    if (!isAdmin) {
      throw new Error('Only admins can reactivate members');
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ is_active: true })
      .eq('id', memberId);

    if (error) throw error;

    await fetchMembers();
  }, [isAdmin, fetchMembers]);

  // Get active members count
  const activeCount = members.filter(m => m.is_active).length;

  // Get members by role
  const getMembersByRole = useCallback((role: OrgRole) => {
    return members.filter(m => m.role === role && m.is_active);
  }, [members]);

  // Initial fetch
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Real-time subscription
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('org-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg, fetchMembers]);

  return {
    members,
    activeMembers: members.filter(m => m.is_active),
    isLoading,
    error,
    activeCount,
    updateMemberRole,
    deactivateMember,
    removeMember,
    reactivateMember,
    getMembersByRole,
    refetch: fetchMembers,
  };
}
