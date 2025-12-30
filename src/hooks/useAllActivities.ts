import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'voicenote' | 'stage' | 'followup' | 'attachment' | 'other';

export interface Activity {
  id: string;
  lead_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  agent_id: string | null;
  agent_name: string;
  duration: string | null;
  audio_url: string | null;
  attachments_count: number;
  attachments: any[];
  created_at: string;
  company_id: string;
  import_job_id: string | null;
  // For compatibility with UI
  subject: string;
  scheduled_at: string | null;
  owner_id: string | null;
  // Joined data
  lead?: {
    id: string;
    name: string;
    first_name: string;
    last_name: string | null;
  } | null;
}

export interface ActivityFilters {
  type?: ActivityType | ActivityType[];
  lead_id?: string;
  owner_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}

interface CreateActivityData {
  type: ActivityType;
  subject: string;
  description?: string;
  lead_id?: string;
  duration_minutes?: number;
  outcome?: string;
  scheduled_at?: string;
  completed_at?: string;
  owner_id?: string;
}

interface UseAllActivitiesOptions {
  filters?: ActivityFilters;
  page?: number;
  pageSize?: number;
}

export function useAllActivities(options: UseAllActivitiesOptions = {}) {
  const { filters, page = 1, pageSize = 50 } = options;
  const { user, profile } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Map<string, { id: string; name: string }>>(new Map());
  const [profiles, setProfiles] = useState<Map<string, { first_name: string | null; last_name: string | null }>>(new Map());
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = profile?.company_id;
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const fetchActivities = useCallback(async () => {
    if (!companyId || roleLoading) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query for lead_activities
      let query = supabase
        .from('lead_activities')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Role-based filtering - agents can only see activities for their leads
      if (!isAdminOrManager && user?.id) {
        // Get leads assigned to this agent first
        const { data: agentLeads } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', companyId)
          .eq('assigned_agent_id', user.id);
        
        const leadIds = agentLeads?.map(l => l.id) || [];
        if (leadIds.length > 0) {
          query = query.in('lead_id', leadIds);
        } else {
          // No leads assigned, show only activities created by this agent
          query = query.eq('agent_id', user.id);
        }
      }

      // Apply filters
      if (filters?.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        query = query.in('type', types);
      }

      if (filters?.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }

      if (filters?.owner_id) {
        query = query.eq('agent_id', filters.owner_id);
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;
      
      // Fetch leads for lead_ids
      const leadIds = [...new Set((data || []).map(a => a.lead_id).filter(Boolean))] as string[];
      if (leadIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', leadIds);
        
        const leadsMap = new Map<string, { id: string; name: string }>();
        leadsData?.forEach(l => {
          leadsMap.set(l.id, { id: l.id, name: l.name });
        });
        setLeads(leadsMap);
      }

      // Fetch profiles for agent_ids
      const agentIds = [...new Set((data || []).map(a => a.agent_id).filter(Boolean))] as string[];
      if (agentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', agentIds);
        
        const profilesMap = new Map<string, { first_name: string | null; last_name: string | null }>();
        profilesData?.forEach(p => {
          profilesMap.set(p.id, { first_name: p.first_name, last_name: p.last_name });
        });
        setProfiles(profilesMap);
      }
      
      // Map to Activity interface with compatibility fields
      const mappedActivities = (data || []).map(a => {
        const leadData = leads.get(a.lead_id);
        return {
          ...a,
          type: mapActivityType(a.type),
          // Compatibility mappings
          subject: a.title,
          scheduled_at: a.created_at,
          owner_id: a.agent_id,
          lead: leadData ? {
            id: leadData.id,
            name: leadData.name,
            first_name: leadData.name?.split(' ')[0] || leadData.name || '',
            last_name: leadData.name?.split(' ').slice(1).join(' ') || null,
          } : null,
        };
      }) as Activity[];
      
      setActivities(mappedActivities);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, filters, page, pageSize, isAdminOrManager, user?.id, roleLoading, leads]);

  const createActivity = useCallback(async (data: CreateActivityData): Promise<Activity> => {
    if (!companyId) throw new Error('No company selected');

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        title: data.subject,
        description: data.description,
        type: data.type,
        lead_id: data.lead_id,
        agent_id: data.owner_id || user?.id,
        agent_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Agent',
        company_id: companyId,
        attachments: [],
        attachments_count: 0,
      })
      .select('*')
      .single();

    if (error) throw error;
    
    // Refetch to get updated list
    fetchActivities();
    
    return {
      ...activity,
      type: mapActivityType(activity.type),
      subject: activity.title,
      scheduled_at: activity.created_at,
      owner_id: activity.agent_id,
      lead: null,
    } as Activity;
  }, [companyId, user, profile, fetchActivities]);

  const updateActivity = useCallback(async (activityId: string, data: Partial<CreateActivityData>) => {
    if (!isAdminOrManager) throw new Error('Permission denied');

    const updateData: Record<string, any> = {};
    if (data.subject) updateData.title = data.subject;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type) updateData.type = data.type;
    if (data.lead_id) updateData.lead_id = data.lead_id;
    if (data.owner_id) updateData.agent_id = data.owner_id;

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .update(updateData)
      .eq('id', activityId)
      .select('*')
      .single();

    if (error) throw error;
    
    // Refetch to get updated list
    fetchActivities();
    
    return {
      ...activity,
      type: mapActivityType(activity.type),
      subject: activity.title,
      scheduled_at: activity.created_at,
      owner_id: activity.agent_id,
      lead: null,
    } as Activity;
  }, [isAdminOrManager, fetchActivities]);

  const deleteActivity = useCallback(async (activityId: string) => {
    if (!isAdminOrManager) throw new Error('Permission denied');

    const { error } = await supabase
      .from('lead_activities')
      .delete()
      .eq('id', activityId);

    if (error) throw error;
    
    // Refetch to get updated list
    fetchActivities();
  }, [isAdminOrManager, fetchActivities]);

  // Real-time subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('lead-activities-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_activities',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          // Refetch on any change
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Stats
  const stats = useMemo(() => ({
    total: totalCount,
    calls: activities.filter(a => a.type === 'call').length,
    emails: activities.filter(a => a.type === 'email').length,
    meetings: activities.filter(a => a.type === 'meeting').length,
    notes: activities.filter(a => a.type === 'note').length,
  }), [activities, totalCount]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Helper to get profile by id
  const getProfile = useCallback((id: string | null) => {
    if (!id) return null;
    return profiles.get(id) || null;
  }, [profiles]);

  return {
    activities,
    stats,
    totalCount,
    totalPages,
    isLoading,
    error,
    isAdminOrManager,
    createActivity,
    updateActivity,
    deleteActivity,
    refetch: fetchActivities,
    getProfile,
  };
}

// Map database activity types to our ActivityType
function mapActivityType(dbType: string): ActivityType {
  const typeMap: Record<string, ActivityType> = {
    'call': 'call',
    'email': 'email',
    'meeting': 'meeting',
    'note': 'note',
    'voicenote': 'voicenote',
    'stage': 'stage',
    'followup': 'followup',
    'attachment': 'attachment',
  };
  return typeMap[dbType] || 'other';
}
