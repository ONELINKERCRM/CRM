import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type LeadGroup = {
  id: string;
  name: string;
  color: string;
  leadCount?: number;
};

// 15 distinct vibrant group color options (no gray/neutral)
export const GROUP_COLOR_OPTIONS = [
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#84CC16", // Lime
  "#A855F7", // Violet
  "#0EA5E9", // Sky
  "#22C55E", // Green
  "#E11D48", // Rose
];

type GroupsContextType = {
  groups: LeadGroup[];
  setGroups: React.Dispatch<React.SetStateAction<LeadGroup[]>>;
  addGroup: (group: LeadGroup) => void;
  updateGroup: (id: string, updates: Partial<LeadGroup>) => void;
  deleteGroup: (id: string) => void;
  reorderGroups: (newGroups: LeadGroup[]) => void;
  isLoading: boolean;
};

const fallbackGroups: LeadGroup[] = [
  { id: "vip", name: "VIP", color: "#F59E0B", leadCount: 0 },
  { id: "hot", name: "Hot Leads", color: "#EF4444", leadCount: 0 },
  { id: "cold", name: "Cold Leads", color: "#3B82F6", leadCount: 0 },
  { id: "investor", name: "Investors", color: "#8B5CF6", leadCount: 0 },
  { id: "first-time", name: "First Time Buyers", color: "#06B6D4", leadCount: 0 },
  { id: "cash", name: "Cash Buyers", color: "#10B981", leadCount: 0 },
  { id: "followup", name: "Follow Up Required", color: "#EC4899", leadCount: 0 },
];

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<LeadGroup[]>(fallbackGroups);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();

  // Fetch groups from database
  useEffect(() => {
    const fetchGroups = async () => {
      if (!profile?.company_id) {
        setGroups(fallbackGroups);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("lead_groups")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching groups:", error);
          setGroups(fallbackGroups);
        } else if (data && data.length > 0) {
          const mappedGroups: LeadGroup[] = data.map(group => ({
            id: group.id,
            name: group.name,
            color: group.color || "#3B82F6",
            leadCount: 0,
          }));
          setGroups(mappedGroups);
        } else {
          setGroups(fallbackGroups);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
        setGroups(fallbackGroups);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [profile?.company_id]);

  const addGroup = (group: LeadGroup) => {
    setGroups((prev) => [...prev, group]);
  };

  const updateGroup = (id: string, updates: Partial<LeadGroup>) => {
    setGroups((prev) =>
      prev.map((group) => (group.id === id ? { ...group, ...updates } : group))
    );
  };

  const deleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((group) => group.id !== id));
  };

  const reorderGroups = (newGroups: LeadGroup[]) => {
    setGroups(newGroups);
  };

  return (
    <GroupsContext.Provider
      value={{ groups, setGroups, addGroup, updateGroup, deleteGroup, reorderGroups, isLoading }}
    >
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupsContext);
  if (!context) {
    throw new Error("useGroups must be used within a GroupsProvider");
  }
  return context;
}
