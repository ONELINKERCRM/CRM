import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  source_metadata: Json | null;
  mapped_fields: Json | null;
  campaign_name: string | null;
  ad_set_name: string | null;
  ad_name: string | null;
  form_id: string | null;
  form_name: string | null;
  external_id: string | null;
  fetched_at: string | null;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
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

export function useLead(leadId: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = async () => {
    if (!leadId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

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
      .eq("id", leadId)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      setLead(null);
    } else {
      setLead(data as Lead | null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const refetch = async () => {
    await fetchLead();
  };

  return { lead, isLoading, error, refetch };
}
