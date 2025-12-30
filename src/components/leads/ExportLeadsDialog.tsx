import { useState, useMemo } from "react";
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogFooter,
    ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FileDown, ShieldCheck, Mail, Loader2, Info } from "lucide-react";
import { useStages } from "@/contexts/StagesContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

interface ExportLeadsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leads: Lead[];
    availableAgents: { id: string; name: string }[];
}

export function ExportLeadsDialog({
    open,
    onOpenChange,
    leads,
    availableAgents,
}: ExportLeadsDialogProps) {
    const { stages } = useStages();
    const [isExporting, setIsExporting] = useState(false);

    // Local Filter States
    const [filterAgentId, setFilterAgentId] = useState<string>("all");
    const [filterStage, setFilterStage] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [budgetMin, setBudgetMin] = useState("");
    const [budgetMax, setBudgetMax] = useState("");
    const [country, setCountry] = useState("");

    // Calculate preview count based on current local leads
    const previewCount = useMemo(() => {
        return leads.filter(lead => {
            if (filterAgentId !== "all" && lead.assigned_agent_id !== filterAgentId) return false;
            if (filterStage !== "all" && lead.stage !== filterStage) return false;

            if (dateFrom) {
                const leadDate = new Date(lead.created_at);
                if (leadDate < new Date(dateFrom)) return false;
            }
            if (dateTo) {
                const leadDate = new Date(lead.created_at);
                if (leadDate > new Date(dateTo)) return false;
            }

            const parseBudget = (val: any) => {
                if (!val) return null;
                const num = parseFloat(val.toString().replace(/[^0-9.]/g, ""));
                return isNaN(num) ? null : num;
            };

            const leadBudget = parseBudget(lead.budget);
            if (budgetMin && leadBudget !== null && leadBudget < parseFloat(budgetMin)) return false;
            if (budgetMax && leadBudget !== null && leadBudget > parseFloat(budgetMax)) return false;

            if (country) {
                const matchesLocation = lead.location?.toLowerCase().includes(country.toLowerCase());
                const matchesNationality = lead.nationality?.toLowerCase().includes(country.toLowerCase());
                if (!matchesLocation && !matchesNationality) return false;
            }

            return true;
        }).length;
    }, [leads, filterAgentId, filterStage, dateFrom, dateTo, budgetMin, budgetMax, country]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const { data, error } = await supabase.functions.invoke("export-leads", {
                body: {
                    filters: {
                        agent_id: filterAgentId === 'all' ? undefined : filterAgentId,
                        stage: filterStage === 'all' ? undefined : filterStage,
                        date_from: dateFrom || undefined,
                        date_to: dateTo || undefined,
                        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
                        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
                        country: country || undefined,
                    },
                },
            });

            if (error) throw error;

            toast.success("Export Initialized", {
                description: "Your filtered lead export is being generated and will be sent to your company’s main email shortly.",
                duration: 8000,
            });
            onOpenChange(false);
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error("Export Failed", {
                description: error.message || "Failed to trigger lead export.",
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                <ResponsiveDialogHeader className="px-4 py-3 border-b">
                    <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
                        <FileDown className="h-4 w-4 text-primary" />
                        Secure Lead Export
                    </ResponsiveDialogTitle>
                </ResponsiveDialogHeader>

                <ResponsiveDialogBody className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg flex gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Compliance & Security Policy</p>
                            <p className="text-[11px] text-blue-800/80 dark:text-blue-200/80 leading-snug">
                                Exports are sent exclusively to the company's verified main email address. Personal downloads are disabled to protect data integrity.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Assigned Agent</Label>
                            <Select value={filterAgentId} onValueChange={setFilterAgentId}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="All Agents" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                    <SelectItem value="all">All Agents</SelectItem>
                                    {availableAgents.map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Lead Stage</Label>
                            <Select value={filterStage} onValueChange={setFilterStage}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="All Stages" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                    <SelectItem value="all">All Stages</SelectItem>
                                    {stages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Created From</Label>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Created To</Label>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Min Budget</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={budgetMin}
                                onChange={(e) => setBudgetMin(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Max Budget</Label>
                            <Input
                                type="number"
                                placeholder="Any"
                                value={budgetMax}
                                onChange={(e) => setBudgetMax(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs">Country / Location</Label>
                            <Input
                                placeholder="e.g. UAE, Dubai"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Info className="h-3.5 w-3.5" />
                            <span>Exporting {previewCount} leads...</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-[10px] font-medium border">
                            <Mail className="h-3 w-3" />
                            <span className="hidden sm:inline">Recipient: Company Main Email</span>
                            <span className="sm:hidden">Company Email</span>
                        </div>
                    </div>
                </ResponsiveDialogBody>

                <ResponsiveDialogFooter className="p-3 border-t bg-muted/20 gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isExporting}
                        className="h-9 text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting || previewCount === 0}
                        className="min-w-[120px] h-9 text-sm"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                                Confirm Export
                            </>
                        )}
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
}
