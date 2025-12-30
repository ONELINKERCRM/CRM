import { useState, useEffect } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  budget: string | null;
  stage: string | null;
  created_at: string;
}

interface PipelineStage {
  id: string;
  stage_name: string;
  stage_order: number;
  color: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface AddLeadToPipelineDialogProps {
  children?: React.ReactNode;
  pipelineId: string;
  stages: PipelineStage[];
  existingLeadIds: string[];
  onLeadsAdded?: () => void;
  defaultStageId?: string;
}

export function AddLeadToPipelineDialog({
  children,
  pipelineId,
  stages,
  existingLeadIds,
  onLeadsAdded,
  defaultStageId,
}: AddLeadToPipelineDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>(defaultStageId || "");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  // Fetch available leads when dialog opens
  useEffect(() => {
    if (open) {
      fetchLeads();
      fetchAgents();
      // Set default stage to first one if not provided
      if (stages.length > 0 && !selectedStageId) {
        setSelectedStageId(defaultStageId || stages[0].id);
      }
    }
  }, [open, stages, defaultStageId]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone, email, source, budget, stage, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from("agents")
        .select("id, name, email")
        .eq("company_id", profile.company_id)
        .eq("status", "active");

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  // Filter leads based on search and exclude already added leads
  const availableLeads = leads.filter(
    (lead) =>
      !existingLeadIds.includes(lead.id) &&
      (lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === availableLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(availableLeads.map((l) => l.id));
    }
  };

  const handleAddLeads = async () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select at least one lead");
      return;
    }

    if (!selectedStageId) {
      toast.error("Please select a stage");
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert all selected leads into pipeline
      const entries = selectedLeads.map((leadId) => ({
        pipeline_id: pipelineId,
        lead_id: leadId,
        current_stage_id: selectedStageId,
        assigned_agent_id: selectedAgentId || null,
        added_by: user?.id,
      }));

      const { error } = await supabase
        .from("lead_pipeline_entries")
        .insert(entries);

      if (error) throw error;

      // Create history records for each added lead
      const { data: insertedEntries } = await supabase
        .from("lead_pipeline_entries")
        .select("id")
        .in("lead_id", selectedLeads)
        .eq("pipeline_id", pipelineId);

      if (insertedEntries) {
        const historyRecords = insertedEntries.map((entry) => ({
          pipeline_entry_id: entry.id,
          new_stage_id: selectedStageId,
          new_agent_id: selectedAgentId || null,
          change_type: "added",
          changed_by: user?.id,
        }));

        await supabase.from("lead_pipeline_history").insert(historyRecords);
      }

      toast.success(`${selectedLeads.length} lead(s) added to pipeline`);
      setSelectedLeads([]);
      setOpen(false);
      onLeadsAdded?.();
    } catch (error: any) {
      console.error("Error adding leads to pipeline:", error);
      if (error.code === "23505") {
        toast.error("Some leads are already in this pipeline");
      } else {
        toast.error("Failed to add leads to pipeline");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        {children || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Lead
          </Button>
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add Leads to Pipeline
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Stage & Agent Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Initial Stage *</label>
              <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.stage_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Assign Agent</label>
            <Select value={selectedAgentId || "unassigned"} onValueChange={(val) => setSelectedAgentId(val === "unassigned" ? "" : val)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Select All */}
          {availableLeads.length > 0 && (
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    selectedLeads.length === availableLeads.length &&
                    availableLeads.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Select all ({availableLeads.length} available)
                </span>
              </div>
              {selectedLeads.length > 0 && (
                <Badge variant="secondary">
                  {selectedLeads.length} selected
                </Badge>
              )}
            </div>
          )}

          {/* Leads List */}
          <ScrollArea className="h-[280px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {leads.length === existingLeadIds.length
                    ? "All leads are already in this pipeline"
                    : "No leads found"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedLeads.includes(lead.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleLeadSelection(lead.id)}
                  >
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`}
                      />
                      <AvatarFallback>{lead.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{lead.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {lead.phone && <span>{lead.phone}</span>}
                        {lead.source && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            {lead.source}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {lead.budget && (
                      <span className="text-xs font-medium text-primary">
                        {lead.budget}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddLeads}
            disabled={selectedLeads.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Add {selectedLeads.length > 0 ? `${selectedLeads.length} Lead(s)` : "Leads"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
