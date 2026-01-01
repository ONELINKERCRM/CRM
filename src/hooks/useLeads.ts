import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
export interface Lead {
  id: string;
  company_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: string | null;
  stage_id: string | null;
  budget: string | null;
  requirements: string | null;
  location: string | null;
  assigned_agent_id: string | null;
  lead_group_id: string | null;
  tags: string[] | null;
  lead_score: number | null;
  gender: string | null;
  nationality: string | null;
  language: string | null;
  preferred_contact_time: string | null;
  purpose: string | null;
  property_type: string | null;
  bedrooms: string | null;
  furnished: string | null;
  move_in_date: string | null;
  form_data: Json | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
  // New fields for Meta lead tracking
  received_at: string | null;
  is_new: boolean | null;
  agent?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  lead_group?: {
    id: string;
    name: string;
    color: string;
  } | null;
  lead_stage?: {
    id: string;
    name: string;
    color: string;
    position: number;
    is_default: boolean;
    is_won: boolean;
    is_lost: boolean;
  } | null;
}

export function useLeads() {
  const { refreshSession, user, profile, isLoading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);

  const fetchLeads = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useLeads.ts:66', message: 'fetchLeads entry', data: { retryCount: retryCountRef.current, refreshSessionExists: !!refreshSession }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    setIsLoading(true);
    setError(null);

    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Don't fetch if no user or profile
    if (!user || !profile?.company_id) {
      setIsLoading(false);
      setLeads([]);
      return;
    }

    // Fetch all leads - override Supabase's default 1000 row limit
    const { data, error: fetchError } = await supabase
      .from("leads")
      .select(`
        *,
        agent:agents!assigned_agent_id (
          id,
          name,
          avatar_url
        ),
        lead_group:lead_groups!lead_group_id (
          id,
          name,
          color
        ),
        lead_stage:lead_stages!stage_id (
          id,
          name,
          color,
          position,
          is_default,
          is_won,
          is_lost
        )
      `)
      // Temporarily removed company_id filter due to schema issues
      // .eq('company_id', profile.company_id)
      .order("created_at", { ascending: false })
      .limit(10000); // Explicitly set higher limit to get all leads

    if (fetchError) {
      // Check if it's a JWT error
      const isJwtError = fetchError.message?.includes('JWT') ||
        fetchError.code === 'PGRST301' ||
        fetchError.code === 'PGRST303';

      if (isJwtError && retryCountRef.current < 2) {
        retryCountRef.current += 1;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useLeads.ts:104', message: 'JWT error detected, attempting refresh', data: { retryCount: retryCountRef.current, refreshSessionExists: !!refreshSession }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
        const refreshed = await refreshSession();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useLeads.ts:107', message: 'Session refresh result', data: { refreshed, retryCount: retryCountRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
        if (refreshed) {
          setTimeout(() => fetchLeads(), 500);
          return;
        }
      }

      setError(fetchError.message);
      setLeads([]);
    } else {
      retryCountRef.current = 0;
      setLeads((data as Lead[]) || []);
    }
    setIsLoading(false);
  }, [refreshSession, user, profile, authLoading]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useLeads.ts:122', message: 'useEffect entry - fetchLeads called', data: { refreshSessionExists: !!refreshSession, retryCount: retryCountRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    fetchLeads();

    // Subscribe to real-time changes with unique channel name
    const channelName = `leads-realtime-${Date.now()}`;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/64664f1c-2aa5-4d5b-a8e0-b4c2f83d09ac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useLeads.ts:127', message: 'Creating realtime channel', data: { channelName }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        async (payload) => {


          try {
            // Fetch the full lead with agent relation
            const { data, error } = await supabase
              .from("leads")
              .select(`
                *,
                agent:agents!assigned_agent_id (
                  id,
                  name,
                  avatar_url
                ),
                lead_group:lead_groups!lead_group_id (
                  id,
                  name,
                  color
                ),
                lead_stage:lead_stages!stage_id (
                  id,
                  name,
                  color,
                  position,
                  is_default,
                  is_won,
                  is_lost
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching new lead details:', error);
              // Still try to add with basic payload data
              const basicLead = payload.new as Lead;
              setLeads((prev) => {
                if (prev.some(lead => lead.id === basicLead.id)) {
                  return prev;
                }
                return [basicLead, ...prev];
              });
              toast.success(`New lead: ${basicLead.name || 'Unknown'}`, {
                description: `Source: ${basicLead.source || 'Direct'} • ${basicLead.phone || basicLead.email || 'No contact'}`,
                duration: 5000,
              });
              return;
            }

            if (data) {

              setLeads((prev) => {
                // Check if lead already exists to avoid duplicates
                if (prev.some(lead => lead.id === data.id)) {

                  return prev;
                }

                return [data as Lead, ...prev];
              });

              // Show notification for new lead
              toast.success(`New lead: ${data.name || 'Unknown'}`, {
                description: `Source: ${data.source || 'Direct'} • ${data.phone || data.email || 'No contact'}`,
                duration: 5000,
              });
            }
          } catch (err) {
            console.error('Exception in realtime lead handler:', err);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        async (payload) => {

          const { data } = await supabase
            .from("leads")
            .select(`
              *,
              agent:agents!assigned_agent_id (
                id,
                name,
                avatar_url
              ),
              lead_group:lead_groups!lead_group_id (
                id,
                name,
                color
              ),
              lead_stage:lead_stages!stage_id (
                id,
                name,
                color,
                position,
                is_default,
                is_won,
                is_lost
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setLeads((prev) =>
              prev.map((lead) => lead.id === data.id ? data as Lead : lead)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {

          setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
        }
      )
      .subscribe((status) => {

      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  const refetch = () => {
    fetchLeads();
  };

  // Function to sync leads from Property Finder
  const syncPropertyFinderLeads = async (companyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-property-finder-leads', {
        body: { company_id: companyId },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error syncing Property Finder leads:', err);
      throw err;
    }
  };

  return { leads, isLoading, error, refetch, setLeads, syncPropertyFinderLeads };
}
