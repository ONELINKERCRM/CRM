import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EntityType = 'contact' | 'account' | 'lead' | 'deal' | 'task' | 'activity';

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  related_to_type: EntityType | null;
  related_to_id: string | null;
  contact_id: string | null;
  account_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  reminder_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface CreateTaskData {
  title: string;
  description?: string;
  related_to_type?: EntityType;
  related_to_id?: string;
  contact_id?: string;
  account_id?: string;
  deal_id?: string;
  lead_id?: string;
  priority?: TaskPriority;
  due_date?: string;
  reminder_at?: string;
  assigned_to?: string;
}

interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigned_to?: string;
  due_before?: string;
  due_after?: string;
}

export function useTasks(filters?: TaskFilters) {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!currentOrg) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      // Apply filters
      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.in('status', statuses);
      }

      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
        query = query.in('priority', priorities);
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.due_before) {
        query = query.lte('due_date', filters.due_before);
      }

      if (filters?.due_after) {
        query = query.gte('due_date', filters.due_after);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTasks((data || []) as Task[]);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, filters]);

  const createTask = useCallback(async (data: CreateTaskData): Promise<Task> => {
    if (!currentOrg) throw new Error('No organization selected');

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        ...data,
        organization_id: currentOrg.id,
        status: 'pending',
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    await fetchTasks();
    return task;
  }, [currentOrg, user, fetchTasks]);

  const updateTask = useCallback(async (taskId: string, data: Partial<CreateTaskData & { status: TaskStatus }>) => {
    const updateData: Record<string, unknown> = { ...data };
    
    // Set completed_at when status changes to completed
    if (data.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (data.status) {
      updateData.completed_at = null;
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    await fetchTasks();
    return task;
  }, [fetchTasks]);

  const completeTask = useCallback(async (taskId: string) => {
    return updateTask(taskId, { status: 'completed' });
  }, [updateTask]);

  const deleteTask = useCallback(async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  // Task stats
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(t => 
    t.due_date && 
    new Date(t.due_date) < new Date() && 
    t.status !== 'completed' && 
    t.status !== 'cancelled'
  );
  const myTasks = tasks.filter(t => t.assigned_to === user?.id);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time subscription
  useEffect(() => {
    if (!currentOrg) return;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg, fetchTasks]);

  return {
    tasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    myTasks,
    isLoading,
    error,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    refetch: fetchTasks,
  };
}
