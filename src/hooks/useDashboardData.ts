import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoCompany } from '@/hooks/useAutoCompany';
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

interface LeadsTrendData {
  month: string;
  leads: number;
}

interface LeadsByStageData {
  name: string;
  value: number;
  color: string;
}

interface LeadsBySourceData {
  source: string;
  leads: number;
}

interface AgentPerformance {
  name: string;
  leads: number;
  closed: number;
  avatar: string;
  id: string;
}

interface RecentActivity {
  id: string;
  type: string;
  agent: string;
  lead: string;
  time: string;
  avatar: string;
}

interface DashboardMetrics {
  totalLeads: number;
  totalLeadsChange: number;
  newLeadsToday: number;
  activeListings: number;
  listingsChange: number;
  meetingsToday: number;
  meetingsUpcoming: number;
  conversionRate: number;
  conversionRateChange: number;
  followUpsDue: number;
  overdueFollowUps: number;
  callsToday: number;
  hotLeads: number;
}

interface DashboardData {
  metrics: DashboardMetrics;
  leadsTrend: LeadsTrendData[];
  leadsByStage: LeadsByStageData[];
  leadsBySource: LeadsBySourceData[];
  agentPerformance: AgentPerformance[];
  recentActivities: RecentActivity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const stageColors: Record<string, string> = {
  'New': '#3B82F6',
  'Contacted': '#8B5CF6',
  'Follow Up': '#F59E0B',
  'Meeting': '#06B6D4',
  'Qualified': '#10B981',
  'Proposal': '#EC4899',
  'Negotiation': '#F97316',
  'Won': '#22C55E',
  'Closed': '#10B981',
  'Lost': '#EF4444',
};

const defaultMetrics: DashboardMetrics = {
  totalLeads: 0,
  totalLeadsChange: 0,
  newLeadsToday: 0,
  activeListings: 0,
  listingsChange: 0,
  meetingsToday: 0,
  meetingsUpcoming: 0,
  conversionRate: 0,
  conversionRateChange: 0,
  followUpsDue: 0,
  overdueFollowUps: 0,
  callsToday: 0,
  hotLeads: 0,
};

export function useDashboardData(): DashboardData {
  const { refreshSession } = useAuth();
  const { companyId, isLoading: companyLoading } = useAutoCompany();
  const prevCompanyIdRef = useRef<string | null>(null);

  // #region agent log
  if (prevCompanyIdRef.current !== companyId) {
    fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useDashboardData.ts:100', message: 'companyId changed', data: { prevCompanyId: prevCompanyIdRef.current, newCompanyId: companyId, companyLoading }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'D' }) }).catch(() => { });
    prevCompanyIdRef.current = companyId;
  }
  // #endregion
  const [isLoading, setIsLoading] = useState(true);
  const retryCountRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [leadsTrend, setLeadsTrend] = useState<LeadsTrendData[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<LeadsByStageData[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<LeadsBySourceData[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const fetchDataRef = useRef<() => Promise<void>>();
  const subscriptionSetupCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useDashboardData.ts:114', message: 'fetchData entry', data: { companyId: !!companyId, companyLoading, isMounted: isMountedRef.current, retryCount: retryCountRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
    if (!companyId || companyLoading || !isMountedRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useDashboardData.ts:115', message: 'fetchData early return', data: { companyId: !!companyId, companyLoading, isMounted: isMountedRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      if (!companyLoading) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

      // Fetch all data in parallel with independent error handling
      const wrapQuery = (p: Promise<any>) => p.then(res => res).catch(err => ({ data: [], count: 0, error: err }));

      const [
        leadsResult,
        leadsLastMonthResult,
        leadsTodayResult,
        listingsResult,
        listingsLastWeekResult,
        activitiesResult,
        stagesResult,
        agentsResult,
        followUpsResult,
      ] = await Promise.all([
        wrapQuery(supabase
          .from('leads')
          .select('id, stage, source, created_at, lead_score, assigned_agent_id', { count: 'exact' })
          .eq('company_id', companyId)),
        wrapQuery(supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .gte('created_at', lastMonthStart)
          .lte('created_at', lastMonthEnd)),
        wrapQuery(supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd)),
        wrapQuery(supabase
          .from('properties')
          .select('id, status', { count: 'exact' })
          .eq('company_id', companyId)),
        wrapQuery(supabase
          .from('properties')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .lte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())),
        wrapQuery(supabase
          .from('lead_activities')
          .select('id, type, title, agent_name, lead_id, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10)),
        wrapQuery(supabase
          .from('lead_stages')
          .select('id, name, color, is_won, is_lost')
          .eq('company_id', companyId)),
        wrapQuery(supabase
          .from('agents')
          .select('id, name, avatar_url')
          .eq('company_id', companyId)
          .eq('status', 'active')),
        wrapQuery(supabase
          .from('lead_followups')
          .select('id, status, due_date')
          .eq('company_id', companyId)
          .eq('status', 'pending')),
      ]);

      if (!isMountedRef.current) return;

      // Calculate metrics
      const totalLeads = leadsResult.count || 0;
      const lastMonthLeads = leadsLastMonthResult.count || 0;
      const leadsChange = lastMonthLeads > 0
        ? ((totalLeads - lastMonthLeads) / lastMonthLeads * 100).toFixed(1)
        : 0;

      const newLeadsToday = leadsTodayResult.count || 0;

      const listings = listingsResult.data || [];
      const activeListings = listings.filter(l => l.status === 'active' || l.status === 'published').length;
      const listingsLastWeek = listingsLastWeekResult.count || 0;
      const listingsChange = activeListings - listingsLastWeek;

      const leads = leadsResult.data || [];
      const wonStages = (stagesResult.data || []).filter(s => s.is_won).map(s => s.name.toLowerCase());
      const wonLeads = leads.filter(l => wonStages.includes((l.stage || '').toLowerCase())).length;
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads * 100) : 0;

      const hotStages = ['meeting', 'proposal', 'negotiation', 'qualified'];
      const hotLeads = leads.filter(l =>
        (l.lead_score && l.lead_score >= 70) ||
        hotStages.includes((l.stage || '').toLowerCase())
      ).length;

      const followUps = followUpsResult.data || [];
      const followUpsDue = followUps.length;
      const overdueFollowUps = followUps.filter(f => new Date(f.due_date) < now).length;

      const activities = activitiesResult.data || [];
      const callsToday = activities.filter(a =>
        a.type === 'call' &&
        new Date(a.created_at) >= new Date(todayStart)
      ).length;

      const meetingsToday = activities.filter(a =>
        a.type === 'meeting' &&
        new Date(a.created_at) >= new Date(todayStart)
      ).length;

      // Batch state updates
      setMetrics({
        totalLeads,
        totalLeadsChange: Number(leadsChange),
        newLeadsToday,
        activeListings,
        listingsChange,
        meetingsToday,
        meetingsUpcoming: followUps.filter(f => new Date(f.due_date) > now).length,
        conversionRate: Number(conversionRate.toFixed(1)),
        conversionRateChange: 0,
        followUpsDue,
        overdueFollowUps,
        callsToday,
        hotLeads,
      });

      // Calculate leads by stage with database colors
      const stageCounts: Record<string, number> = {};
      leads.forEach(lead => {
        const stage = lead.stage || 'New';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });

      // Build color map from database stages
      const dbStageColors: Record<string, string> = {};
      (stagesResult.data || []).forEach(s => {
        dbStageColors[s.name] = s.color || '#3B82F6';
        dbStageColors[s.name.toLowerCase()] = s.color || '#3B82F6';
      });

      setLeadsByStage(Object.entries(stageCounts).map(([name, value]) => ({
        name,
        value,
        color: dbStageColors[name] || dbStageColors[name.toLowerCase()] || stageColors[name] || '#3B82F6',
      })));

      // Calculate leads by source
      const sourceCounts: Record<string, number> = {};
      leads.forEach(lead => {
        const source = lead.source || 'Direct';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      setLeadsBySource(
        Object.entries(sourceCounts)
          .map(([source, leads]) => ({ source, leads }))
          .sort((a, b) => b.leads - a.leads)
          .slice(0, 5)
      );

      // Calculate leads trend (last 6 months)
      const trendData: LeadsTrendData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const monthLeads = leads.filter(l => {
          const createdAt = new Date(l.created_at);
          return createdAt >= monthStart && createdAt <= monthEnd;
        }).length;

        trendData.push({
          month: format(monthDate, 'MMM'),
          leads: monthLeads,
        });
      }
      setLeadsTrend(trendData);

      // Agent performance
      const agents = agentsResult.data || [];
      const agentLeadCounts: Record<string, { leads: number; closed: number }> = {};

      leads.forEach(lead => {
        if (lead.assigned_agent_id) {
          if (!agentLeadCounts[lead.assigned_agent_id]) {
            agentLeadCounts[lead.assigned_agent_id] = { leads: 0, closed: 0 };
          }
          agentLeadCounts[lead.assigned_agent_id].leads++;
          if (wonStages.includes((lead.stage || '').toLowerCase())) {
            agentLeadCounts[lead.assigned_agent_id].closed++;
          }
        }
      });

      setAgentPerformance(
        agents
          .map(agent => ({
            id: agent.id,
            name: agent.name,
            leads: agentLeadCounts[agent.id]?.leads || 0,
            closed: agentLeadCounts[agent.id]?.closed || 0,
            avatar: agent.name.toLowerCase().replace(/\s+/g, ''),
          }))
          .sort((a, b) => b.leads - a.leads)
          .slice(0, 4)
      );

      // Recent activities
      setRecentActivities(
        activities.slice(0, 5).map(activity => ({
          id: activity.id,
          type: activity.type,
          agent: activity.agent_name,
          lead: activity.title || 'Unknown Lead',
          time: getTimeAgo(new Date(activity.created_at)),
          avatar: activity.agent_name.toLowerCase().replace(/\s+/g, ''),
        }))
      );

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);

      // Check if it's a JWT error
      const isJwtError = err?.message?.includes('JWT') ||
        err?.code === 'PGRST301' ||
        err?.code === 'PGRST303';

      if (isJwtError && retryCountRef.current < 2) {
        retryCountRef.current += 1;

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useDashboardData.ts:352', message: 'JWT error in fetchData, attempting refresh', data: { retryCount: retryCountRef.current, refreshSessionExists: !!refreshSession }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        const refreshed = await refreshSession();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useDashboardData.ts:355', message: 'Session refresh result in fetchData', data: { refreshed, retryCount: retryCountRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        if (refreshed) {
          // Retry fetch after session refresh
          setTimeout(() => fetchData(), 500);
          return;
        }
      }

      if (isMountedRef.current) {
        setError('Failed to load dashboard data');
        if (isJwtError) {
          toast.error('Session expired. Please refresh the page or log in again.');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [companyId, companyLoading, refreshSession]);

  // Keep ref updated with latest fetchData
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // Debounced refetch for real-time updates - stable reference to prevent subscription recreation
  const debouncedRefetch = useCallback(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useDashboardData.ts:389', message: 'debouncedRefetch called', data: { hasTimer: !!debounceTimerRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && fetchDataRef.current) {
        fetchDataRef.current();
      }
    }, 500);
  }, []); // Empty deps - stable reference, uses ref to call latest fetchData

  // Initial fetch - only re-run when companyId or companyLoading changes, not when refreshSession changes
  useEffect(() => {
    isMountedRef.current = true;
    if (companyId && !companyLoading) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [companyId, companyLoading, fetchData]); // Keep fetchData for JWT retry scenarios, but guard with companyId/companyLoading

  // Real-time subscriptions
  useEffect(() => {
    subscriptionSetupCountRef.current += 1;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useDashboardData.ts:424', message: 'Realtime subscription effect running', data: { companyId: !!companyId, companyIdValue: companyId, setupCount: subscriptionSetupCountRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
    if (!companyId) return;

    const leadsChannel = supabase
      .channel('dashboard-leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${companyId}` },
        debouncedRefetch
      )
      .subscribe();

    const activitiesChannel = supabase
      .channel('dashboard-activities-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_activities', filter: `company_id=eq.${companyId}` },
        debouncedRefetch
      )
      .subscribe();

    const followupsChannel = supabase
      .channel('dashboard-followups-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_followups', filter: `company_id=eq.${companyId}` },
        debouncedRefetch
      )
      .subscribe();

    const propertiesChannel = supabase
      .channel('dashboard-properties-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties', filter: `company_id=eq.${companyId}` },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useDashboardData.ts:468', message: 'Cleaning up realtime subscriptions', data: { companyId: !!companyId, companyIdValue: companyId, setupCount: subscriptionSetupCountRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(followupsChannel);
      supabase.removeChannel(propertiesChannel);
    };
  }, [companyId]); // Removed debouncedRefetch from deps - it's now stable

  return {
    metrics,
    leadsTrend,
    leadsByStage,
    leadsBySource,
    agentPerformance,
    recentActivities,
    isLoading,
    error,
    refetch: fetchData,
  };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
