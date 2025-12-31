import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AssignmentConfig {
    id: string;
    company_id: string;
    assignment_method: "manual" | "round_robin" | "rules";
    round_robin_index: number;
    enabled_agent_ids: string[];
    agent_leads_per_round: Record<string, number>;
    created_at: string;
    updated_at: string;
}

export interface AssignmentRule {
    id: string;
    company_id: string;
    name: string;
    priority: number;
    enabled: boolean;
    conditions: {
        source?: string;
        budget_min?: number;
        budget_max?: number;
        location?: string;
        property_type?: string;
    };
    assign_to_agent_id: string | null;
    created_at: string;
    updated_at: string;
}

export function useAssignmentConfig() {
    const { profile } = useAuth();
    const [config, setConfig] = useState<AssignmentConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = useCallback(async () => {
        if (!profile?.company_id) {
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("lead_assignment_config")
                .select("*")
                .eq("company_id", profile.company_id)
                .single();

            if (error) {
                // If no config exists, create default one
                if (error.code === "PGRST116") {
                    const { data: newConfig, error: createError } = await supabase
                        .from("lead_assignment_config")
                        .insert({
                            company_id: profile.company_id,
                            assignment_method: "manual",
                            enabled_agent_ids: [],
                            agent_leads_per_round: {},
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    setConfig(newConfig);
                } else {
                    throw error;
                }
            } else {
                setConfig(data);
            }
        } catch (err: any) {
            console.error("Error fetching assignment config:", err);
            setError(err.message);
            toast.error("Failed to load assignment configuration");
        } finally {
            setIsLoading(false);
        }
    }, [profile?.company_id]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const updateConfig = async (
        updates: Partial<Omit<AssignmentConfig, "id" | "company_id" | "created_at" | "updated_at">>
    ) => {
        if (!profile?.company_id) {
            toast.error("No company found");
            return false;
        }

        // If no config exists, create it first
        if (!config) {

            try {
                const { data: newConfig, error: createError } = await supabase
                    .from("lead_assignment_config")
                    .insert({
                        company_id: profile.company_id,
                        assignment_method: "manual",
                        enabled_agent_ids: [],
                        agent_leads_per_round: {},
                        ...updates, // Apply the updates to the new config
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error("Error creating config:", createError);
                    toast.error(`Failed to create configuration: ${createError.message}`);
                    return false;
                }

                setConfig(newConfig);
                toast.success("Assignment configuration created and updated");
                return true;
            } catch (err: any) {
                console.error("Exception creating config:", err);
                toast.error(`Failed to create configuration: ${err.message}`);
                return false;
            }
        }

        // Update existing config
        try {

            const { data, error } = await supabase
                .from("lead_assignment_config")
                .update(updates)
                .eq("company_id", profile.company_id)
                .select()
                .single();

            if (error) {
                console.error("Error updating config:", error);
                toast.error(`Failed to update: ${error.message}`);
                return false;
            }


            setConfig(data);
            toast.success("Assignment configuration updated");
            return true;
        } catch (err: any) {
            console.error("Exception updating config:", err);
            toast.error(`Failed to update: ${err.message}`);
            return false;
        }
    };

    const updateAssignmentMethod = async (method: "manual" | "round_robin" | "rules") => {

        return updateConfig({ assignment_method: method });
    };

    const updateEnabledAgents = async (agentIds: string[], leadsPerRound: Record<string, number>) => {

        return updateConfig({
            enabled_agent_ids: agentIds,
            agent_leads_per_round: leadsPerRound,
        });
    };

    return {
        config,
        isLoading,
        error,
        refetch: fetchConfig,
        updateConfig,
        updateAssignmentMethod,
        updateEnabledAgents,
    };
}

export function useAssignmentRules() {
    const { profile } = useAuth();
    const [rules, setRules] = useState<AssignmentRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRules = useCallback(async () => {
        if (!profile?.company_id) {
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("lead_assignment_rules")
                .select("*")
                .eq("company_id", profile.company_id)
                .order("priority", { ascending: false });

            if (error) throw error;
            setRules(data || []);
        } catch (err: any) {
            console.error("Error fetching assignment rules:", err);
            toast.error("Failed to load assignment rules");
        } finally {
            setIsLoading(false);
        }
    }, [profile?.company_id]);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const createRule = async (rule: Omit<AssignmentRule, "id" | "company_id" | "created_at" | "updated_at">) => {
        if (!profile?.company_id) return false;

        try {
            const { error } = await supabase.from("lead_assignment_rules").insert({
                ...rule,
                company_id: profile.company_id,
            });

            if (error) throw error;

            toast.success("Assignment rule created");
            await fetchRules();
            return true;
        } catch (err: any) {
            console.error("Error creating rule:", err);
            toast.error("Failed to create rule");
            return false;
        }
    };

    const updateRule = async (id: string, updates: Partial<AssignmentRule>) => {
        try {
            const { error } = await supabase
                .from("lead_assignment_rules")
                .update(updates)
                .eq("id", id);

            if (error) throw error;

            toast.success("Assignment rule updated");
            await fetchRules();
            return true;
        } catch (err: any) {
            console.error("Error updating rule:", err);
            toast.error("Failed to update rule");
            return false;
        }
    };

    const deleteRule = async (id: string) => {
        try {
            const { error } = await supabase
                .from("lead_assignment_rules")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("Assignment rule deleted");
            await fetchRules();
            return true;
        } catch (err: any) {
            console.error("Error deleting rule:", err);
            toast.error("Failed to delete rule");
            return false;
        }
    };

    return {
        rules,
        isLoading,
        refetch: fetchRules,
        createRule,
        updateRule,
        deleteRule,
    };
}
