import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadGroup {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeadGroups() {
  const [groups, setGroups] = useState<LeadGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_groups")
        .select("*")
        .order("name");

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error("Error fetching lead groups:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("lead_groups_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_groups" },
        () => fetchGroups()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGroups]);

  const addGroup = async (name: string, color: string): Promise<LeadGroup | null> => {
    try {
      // Get company_id from current user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        toast.error("No company found");
        return null;
      }

      const { data, error } = await supabase
        .from("lead_groups")
        .insert({
          name,
          color,
          company_id: profile.company_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("A group with this name already exists");
        } else {
          toast.error("Failed to create group");
        }
        return null;
      }

      // Immediately update local state for instant UI feedback
      setGroups(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast.success("Group created");
      return data;
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
      return null;
    }
  };

  const updateGroup = async (id: string, updates: Partial<Pick<LeadGroup, "name" | "color">>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("lead_groups")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast.success("Group updated");
      return true;
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group");
      return false;
    }
  };

  const deleteGroup = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("lead_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Group deleted");
      return true;
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
      return false;
    }
  };

  return {
    groups,
    isLoading,
    refetch: fetchGroups,
    addGroup,
    updateGroup,
    deleteGroup,
  };
}
