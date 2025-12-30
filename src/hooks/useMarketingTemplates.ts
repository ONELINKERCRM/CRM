import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CampaignTemplate, CampaignChannel } from "@/components/marketing-hub/types";

interface UseMarketingTemplatesResult {
  templates: CampaignTemplate[];
  isLoading: boolean;
  error: string | null;
  createTemplate: (template: Omit<CampaignTemplate, "id" | "createdAt">) => Promise<CampaignTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  refetch: () => void;
}

export function useMarketingTemplates(channel?: CampaignChannel): UseMarketingTemplatesResult {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTemplates([]);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        setTemplates([]);
        return;
      }

      let query = supabase
        .from("marketing_templates")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (channel) {
        query = query.eq("channel", channel);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformedTemplates: CampaignTemplate[] = (data || []).map((t: any) => ({
        id: t.id,
        name: t.template_name,
        channel: t.channel as CampaignChannel,
        content: t.body || "",
        variables: Array.isArray(t.variables) ? t.variables : [],
        createdAt: new Date(t.created_at),
      }));

      setTemplates(transformedTemplates);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch templates");
    } finally {
      setIsLoading(false);
    }
  };

  const createTemplate = async (template: Omit<CampaignTemplate, "id" | "createdAt">): Promise<CampaignTemplate | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return null;

      // Extract variables from content using {{variable}} pattern
      const variableMatches = template.content.match(/\{\{(\w+)\}\}/g) || [];
      const variables = variableMatches.map(v => v.replace(/\{\{|\}\}/g, ''));

      const { data, error } = await supabase
        .from("marketing_templates")
        .insert({
          company_id: profile.company_id,
          template_name: template.name,
          channel: template.channel,
          body: template.content,
          variables,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newTemplate: CampaignTemplate = {
        id: data.id,
        name: data.template_name,
        channel: data.channel as CampaignChannel,
        content: data.body || "",
        variables: Array.isArray(data.variables) ? (data.variables as string[]) : [],
        createdAt: new Date(data.created_at),
      };

      setTemplates(prev => [newTemplate, ...prev]);
      return newTemplate;
    } catch (err) {
      console.error("Failed to create template:", err);
      return null;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("marketing_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err) {
      console.error("Failed to delete template:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [channel]);

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
}
