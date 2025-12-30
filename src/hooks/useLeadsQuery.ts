import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Lead } from "./useLeads";

interface LeadsFilters {
    search?: string;
    status?: string;
    source?: string;
    assignedTo?: string;
    tags?: string[];
}

// Query keys factory for better organization
export const leadsKeys = {
    all: ["leads"] as const,
    lists: () => [...leadsKeys.all, "list"] as const,
    list: (filters: LeadsFilters) => [...leadsKeys.lists(), filters] as const,
    details: () => [...leadsKeys.all, "detail"] as const,
    detail: (id: string) => [...leadsKeys.details(), id] as const,
};

// Fetch leads with filters
export function useLeads(filters: LeadsFilters = {}) {
    return useQuery({
        queryKey: leadsKeys.list(filters),
        queryFn: async () => {
            let query = supabase.from("leads").select("*");

            // Apply filters
            if (filters.search) {
                query = query.or(
                    `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
                );
            }
            if (filters.status) {
                query = query.eq("status", filters.status);
            }
            if (filters.source) {
                query = query.eq("source", filters.source);
            }
            if (filters.assignedTo) {
                query = query.eq("assigned_to", filters.assignedTo);
            }

            query = query.order("created_at", { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            return data as Lead[];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

// Fetch single lead
export function useLead(id: string | undefined) {
    return useQuery({
        queryKey: leadsKeys.detail(id || ""),
        queryFn: async () => {
            if (!id) throw new Error("Lead ID is required");

            const { data, error } = await supabase
                .from("leads")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            return data as Lead;
        },
        enabled: !!id,
    });
}

// Update lead mutation
export function useUpdateLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
            const { data, error } = await supabase
                .from("leads")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
            queryClient.invalidateQueries({ queryKey: leadsKeys.detail(data.id) });
            toast.success("Lead updated successfully");
        },
        onError: (error: Error) => {
            toast.error(`Failed to update lead: ${error.message}`);
        },
    });
}

// Create lead mutation
export function useCreateLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newLead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
            const { data, error } = await supabase
                .from("leads")
                .insert([newLead])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
            toast.success("Lead created successfully");
        },
        onError: (error: Error) => {
            toast.error(`Failed to create lead: ${error.message}`);
        },
    });
}

// Delete lead mutation
export function useDeleteLead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("leads").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
            toast.success("Lead deleted successfully");
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete lead: ${error.message}`);
        },
    });
}
