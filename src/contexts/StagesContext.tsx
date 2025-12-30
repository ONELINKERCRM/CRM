import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type LeadStage = {
  id: string;
  name: string;
  color: string;
  category?: "initial" | "intermediate" | "final";
  leadCount?: number;
  position?: number;
  is_default?: boolean;
  is_won?: boolean;
  is_lost?: boolean;
};

// 15 distinct vibrant stage color options (no gray/neutral)
export const STAGE_COLOR_OPTIONS = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#EF4444", // Red
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#84CC16", // Lime
  "#A855F7", // Violet
  "#0EA5E9", // Sky
  "#22C55E", // Green
  "#E11D48", // Rose
];

type StagesContextType = {
  stages: LeadStage[];
  setStages: React.Dispatch<React.SetStateAction<LeadStage[]>>;
  addStage: (stage: Omit<LeadStage, 'id'>) => Promise<LeadStage | null>;
  updateStage: (id: string, updates: Partial<LeadStage>) => Promise<boolean>;
  deleteStage: (id: string) => Promise<boolean>;
  reorderStages: (newStages: LeadStage[]) => Promise<boolean>;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const fallbackStages: LeadStage[] = [
  { id: "uncontacted", name: "Uncontacted", color: "#6366F1", category: "initial", leadCount: 0, is_default: true },
  { id: "new", name: "New", color: "#3B82F6", category: "initial", leadCount: 0 },
  { id: "contacted", name: "Contacted", color: "#8B5CF6", category: "intermediate", leadCount: 0 },
  { id: "qualified", name: "Qualified", color: "#06B6D4", category: "intermediate", leadCount: 0 },
  { id: "meeting", name: "Meeting Scheduled", color: "#EC4899", category: "intermediate", leadCount: 0 },
  { id: "viewing", name: "Viewing Done", color: "#14B8A6", category: "intermediate", leadCount: 0 },
  { id: "proposal", name: "Proposal Sent", color: "#F59E0B", category: "intermediate", leadCount: 0 },
  { id: "negotiation", name: "Negotiation", color: "#F97316", category: "intermediate", leadCount: 0 },
  { id: "contract", name: "Contract Signed", color: "#84CC16", category: "intermediate", leadCount: 0 },
  { id: "won", name: "Won", color: "#10B981", category: "final", leadCount: 0, is_won: true },
  { id: "lost", name: "Lost", color: "#EF4444", category: "final", leadCount: 0, is_lost: true },
];

const StagesContext = createContext<StagesContextType | undefined>(undefined);

export function StagesProvider({ children }: { children: ReactNode }) {
  const [stages, setStages] = useState<LeadStage[]>(fallbackStages);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();

  // Fetch stages from database
  const fetchStages = async () => {
    if (!profile?.company_id) {
      setStages(fallbackStages);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("lead_stages")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("position", { ascending: true });

      if (error) {
        console.error("Error fetching stages:", error);
        setStages(fallbackStages);
      } else if (data && data.length > 0) {
        const mappedStages: LeadStage[] = data.map(stage => ({
          id: stage.id,
          name: stage.name,
          color: stage.color || "#3B82F6",
          category: stage.is_won ? "final" : stage.is_lost ? "final" : stage.is_default ? "initial" : "intermediate",
          position: stage.position,
          is_default: stage.is_default,
          is_won: stage.is_won,
          is_lost: stage.is_lost,
          leadCount: 0,
        }));
        setStages(mappedStages);
      } else {
        // No stages found - create defaults for this company
        if (profile.company_id) {
          await supabase.rpc('create_default_stages_for_company', { 
            p_company_id: profile.company_id 
          });
          // Refetch after creating defaults
          const { data: newData } = await supabase
            .from("lead_stages")
            .select("*")
            .eq("company_id", profile.company_id)
            .order("position", { ascending: true });
          
          if (newData && newData.length > 0) {
            const mappedStages: LeadStage[] = newData.map(stage => ({
              id: stage.id,
              name: stage.name,
              color: stage.color || "#3B82F6",
              category: stage.is_won ? "final" : stage.is_lost ? "final" : stage.is_default ? "initial" : "intermediate",
              position: stage.position,
              is_default: stage.is_default,
              is_won: stage.is_won,
              is_lost: stage.is_lost,
              leadCount: 0,
            }));
            setStages(mappedStages);
          } else {
            setStages(fallbackStages);
          }
        } else {
          setStages(fallbackStages);
        }
      }
    } catch (error) {
      console.error("Error fetching stages:", error);
      setStages(fallbackStages);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, [profile?.company_id]);

  const addStage = async (stage: Omit<LeadStage, 'id'>): Promise<LeadStage | null> => {
    if (!profile?.company_id) return null;
    
    const maxPosition = Math.max(...stages.map(s => s.position || 0), 0);
    
    const { data, error } = await supabase
      .from("lead_stages")
      .insert({
        company_id: profile.company_id,
        name: stage.name,
        color: stage.color,
        position: maxPosition + 1,
        is_default: stage.is_default || false,
        is_won: stage.is_won || false,
        is_lost: stage.is_lost || false,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error adding stage:", error);
      return null;
    }
    
    const newStage: LeadStage = {
      id: data.id,
      name: data.name,
      color: data.color || "#3B82F6",
      category: data.is_won ? "final" : data.is_lost ? "final" : data.is_default ? "initial" : "intermediate",
      position: data.position,
      is_default: data.is_default,
      is_won: data.is_won,
      is_lost: data.is_lost,
      leadCount: 0,
    };
    
    setStages((prev) => [...prev, newStage]);
    return newStage;
  };

  const updateStage = async (id: string, updates: Partial<LeadStage>): Promise<boolean> => {
    const { error } = await supabase
      .from("lead_stages")
      .update({
        name: updates.name,
        color: updates.color,
        position: updates.position,
        is_default: updates.is_default,
        is_won: updates.is_won,
        is_lost: updates.is_lost,
      })
      .eq("id", id);
    
    if (error) {
      console.error("Error updating stage:", error);
      return false;
    }
    
    setStages((prev) =>
      prev.map((stage) => (stage.id === id ? { ...stage, ...updates } : stage))
    );
    return true;
  };

  const deleteStage = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("lead_stages")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting stage:", error);
      return false;
    }
    
    setStages((prev) => prev.filter((stage) => stage.id !== id));
    return true;
  };

  const reorderStages = async (newStages: LeadStage[]): Promise<boolean> => {
    // Update positions in database
    const updates = newStages.map((stage, index) => ({
      id: stage.id,
      position: index + 1,
    }));
    
    for (const update of updates) {
      const { error } = await supabase
        .from("lead_stages")
        .update({ position: update.position })
        .eq("id", update.id);
      
      if (error) {
        console.error("Error reordering stages:", error);
        return false;
      }
    }
    
    setStages(newStages.map((stage, index) => ({ ...stage, position: index + 1 })));
    return true;
  };

  return (
    <StagesContext.Provider
      value={{ stages, setStages, addStage, updateStage, deleteStage, reorderStages, isLoading, refetch: fetchStages }}
    >
      {children}
    </StagesContext.Provider>
  );
}

export function useStages() {
  const context = useContext(StagesContext);
  if (!context) {
    throw new Error("useStages must be used within a StagesProvider");
  }
  return context;
}
