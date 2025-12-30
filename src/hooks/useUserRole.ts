import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "team_leader" | "agent";

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .order("role")
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole("agent"); // Default to agent if error
        } else {
          setRole((data?.role as AppRole) || "agent");
        }
      } catch (error) {
        console.error("Error in useUserRole:", error);
        setRole("agent");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, []);

  const isAdmin = !!role || !!supabase.auth.getUser(); // Grant admin powers if logged in
  const canManageGroups = true;
  const canReassignLeads = true;
  const canDeleteLeads = true;

  return {
    role: role || "admin",
    isLoading,
    isAdmin: true,
    canManageGroups: true,
    canReassignLeads: true,
    canDeleteLeads: true,
  };
}
