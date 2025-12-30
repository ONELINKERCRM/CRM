import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task_completed' | 'stage_change' | 'other';
export type EntityType = 'contact' | 'account' | 'lead' | 'deal' | 'task' | 'activity';

export interface Activity {
  id: string;
  organization_id: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  related_to_type: EntityType | null;
  related_to_id: string | null;
  contact_id: string | null;
  account_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  duration_minutes: number | null;
  outcome: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface CreateActivityData {
  type: ActivityType;
  subject: string;
  description?: string;
  related_to_type?: EntityType;
  related_to_id?: string;
  contact_id?: string;
  account_id?: string;
  deal_id?: string;
  lead_id?: string;
  duration_minutes?: number;
  outcome?: string;
  scheduled_at?: string;
  completed_at?: string;
}

interface ActivityFilters {
  type?: ActivityType | ActivityType[];
  contact_id?: string;
  account_id?: string;
  deal_id?: string;
  lead_id?: string;
  from_date?: string;
  to_date?: string;
}

export function useActivities(filters?: ActivityFilters) {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!currentOrg) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('activities')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        query = query.in('type', types);
      }

      if (filters?.contact_id) {
        query = query.eq('contact_id', filters.contact_id);
      }

      if (filters?.account_id) {
        query = query.eq('account_id', filters.account_id);
      }

      if (filters?.deal_id) {
        query = query.eq('deal_id', filters.deal_id);
      }

      if (filters?.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setActivities((data || []) as Activity[]);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, filters]);

  const createActivity = useCallback(async (data: CreateActivityData): Promise<Activity> => {
    if (!currentOrg) throw new Error('No organization selected');

    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        ...data,
        organization_id: currentOrg.id,
        owner_id: user?.id,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    setActivities(prev => [activity, ...prev]);
    return activity;
  }, [currentOrg, user]);

  const updateActivity = useCallback(async (activityId: string, data: Partial<CreateActivityData>) => {
    const { data: activity, error } = await supabase
      .from('activities')
      .update(data)
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw error;

    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...activity } : a));
    return activity;
  }, []);

  const deleteActivity = useCallback(async (activityId: string) => {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) throw error;

    setActivities(prev => prev.filter(a => a.id !== activityId));
  }, []);

  // Log a call
  const logCall = useCallback(async (data: {
    subject: string;
    description?: string;
    duration_minutes?: number;
    outcome?: string;
    contact_id?: string;
    deal_id?: string;
  }) => {
    return createActivity({
      type: 'call',
      ...data,
      completed_at: new Date().toISOString(),
    });
  }, [createActivity]);

  // Log an email
  const logEmail = useCallback(async (data: {
    subject: string;
    description?: string;
    contact_id?: string;
    deal_id?: string;
  }) => {
    return createActivity({
      type: 'email',
      ...data,
      completed_at: new Date().toISOString(),
    });
  }, [createActivity]);

  // Log a meeting
  const logMeeting = useCallback(async (data: {
    subject: string;
    description?: string;
    duration_minutes?: number;
    outcome?: string;
    contact_id?: string;
    deal_id?: string;
    scheduled_at?: string;
  }) => {
    return createActivity({
      type: 'meeting',
      ...data,
    });
  }, [createActivity]);

  // Stats
  const callCount = activities.filter(a => a.type === 'call').length;
  const emailCount = activities.filter(a => a.type === 'email').length;
  const meetingCount = activities.filter(a => a.type === 'meeting').length;

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    callCount,
    emailCount,
    meetingCount,
    isLoading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    logCall,
    logEmail,
    logMeeting,
    refetch: fetchActivities,
  };
}
