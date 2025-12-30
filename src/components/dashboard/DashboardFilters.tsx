import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, Users, Check, ChevronsUpDown, Megaphone, CircleDot, Bookmark, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface DashboardFiltersState {
  dateRange: { from: Date | undefined; to: Date | undefined };
  datePreset: string;
  agents: string[];
  sources: string[];
  statuses: string[];
}

interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onFiltersChange: (filters: DashboardFiltersState) => void;
}

const datePresets = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this-week" },
  { label: "Last Week", value: "last-week" },
  { label: "This Month", value: "this-month" },
  { label: "Last Month", value: "last-month" },
  { label: "Custom Range", value: "custom" },
];

const agents = [
  { id: "sarah", name: "Sarah M." },
  { id: "mike", name: "Mike R." },
  { id: "emma", name: "Emma K." },
  { id: "james", name: "James L." },
];

const sources = [
  { id: "facebook", name: "Facebook", color: "#1877F2" },
  { id: "google", name: "Google", color: "#4285F4" },
  { id: "website", name: "Website", color: "#10B981" },
  { id: "whatsapp", name: "WhatsApp", color: "#25D366" },
  { id: "referral", name: "Referral", color: "#8B5CF6" },
  { id: "property-finder", name: "Property Finder", color: "#E11D48" },
  { id: "bayut", name: "Bayut", color: "#F59E0B" },
];

const statuses = [
  { id: "new", name: "New", color: "#3B82F6" },
  { id: "contacted", name: "Contacted", color: "#8B5CF6" },
  { id: "follow-up", name: "Follow Up", color: "#F59E0B" },
  { id: "meeting", name: "Meeting", color: "#06B6D4" },
  { id: "closed", name: "Closed", color: "#10B981" },
  { id: "lost", name: "Lost", color: "#EF4444" },
];

interface FilterPreset {
  id: string;
  name: string;
  icon: "sparkles" | "bookmark";
  filters: Partial<DashboardFiltersState>;
}

const filterPresets: FilterPreset[] = [
  {
    id: "top-performers",
    name: "Top Performers",
    icon: "sparkles",
    filters: { agents: ["sarah", "mike"], datePreset: "this-month" },
  },
  {
    id: "social-leads",
    name: "Social Media Leads",
    icon: "sparkles",
    filters: { sources: ["facebook", "whatsapp"], datePreset: "this-week" },
  },
  {
    id: "hot-leads",
    name: "Hot Leads",
    icon: "sparkles",
    filters: { statuses: ["meeting", "follow-up"], datePreset: "this-week" },
  },
  {
    id: "new-this-week",
    name: "New This Week",
    icon: "bookmark",
    filters: { statuses: ["new"], datePreset: "this-week" },
  },
  {
    id: "closed-deals",
    name: "Closed Deals",
    icon: "bookmark",
    filters: { statuses: ["closed"], datePreset: "this-month" },
  },
];

export function DashboardFilters({ filters, onFiltersChange }: DashboardFiltersProps) {
  const [open, setOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [agentSelectOpen, setAgentSelectOpen] = useState(false);
  const [sourceSelectOpen, setSourceSelectOpen] = useState(false);
  const [statusSelectOpen, setStatusSelectOpen] = useState(false);

  const activeFilterCount = [
    filters.datePreset !== "this-month" ? 1 : 0,
    (filters.agents?.length ?? 0) > 0 ? 1 : 0,
    (filters.sources?.length ?? 0) > 0 ? 1 : 0,
    (filters.statuses?.length ?? 0) > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleDatePresetChange = (value: string) => {
    onFiltersChange({
      ...filters,
      datePreset: value,
      dateRange: value === "custom" ? filters.dateRange : { from: undefined, to: undefined },
    });
  };

  const handleAgentToggle = (agentId: string) => {
    const currentAgents = filters.agents ?? [];
    const newAgents = currentAgents.includes(agentId)
      ? currentAgents.filter((a) => a !== agentId)
      : [...currentAgents, agentId];
    onFiltersChange({ ...filters, agents: newAgents });
  };

  const handleSourceToggle = (sourceId: string) => {
    const currentSources = filters.sources ?? [];
    const newSources = currentSources.includes(sourceId)
      ? currentSources.filter((s) => s !== sourceId)
      : [...currentSources, sourceId];
    onFiltersChange({ ...filters, sources: newSources });
  };

  const handleStatusToggle = (statusId: string) => {
    const currentStatuses = filters.statuses ?? [];
    const newStatuses = currentStatuses.includes(statusId)
      ? currentStatuses.filter((s) => s !== statusId)
      : [...currentStatuses, statusId];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const handleReset = () => {
    onFiltersChange({
      dateRange: { from: undefined, to: undefined },
      datePreset: "this-month",
      agents: [],
      sources: [],
      statuses: [],
    });
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onFiltersChange({
      dateRange: { from: undefined, to: undefined },
      datePreset: preset.filters.datePreset ?? "this-month",
      agents: preset.filters.agents ?? [],
      sources: preset.filters.sources ?? [],
      statuses: preset.filters.statuses ?? [],
    });
  };

  const hasActiveFilters = activeFilterCount > 0;

  const selectedAgentNames = (filters.agents ?? [])
    .map((id) => agents.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const selectedSourceNames = (filters.sources ?? [])
    .map((id) => sources.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const selectedStatusNames = (filters.statuses ?? [])
    .map((id) => statuses.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-popover" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filters</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground">
                Reset
              </Button>
            )}
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> Date Range
            </label>
            <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger className="w-full h-9 bg-background">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {datePresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {filters.datePreset === "custom" && (
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full h-9 justify-start text-left font-normal bg-background">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "LLL dd")} - {format(filters.dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span className="text-muted-foreground">Pick dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange.from}
                    selected={filters.dateRange}
                    onSelect={(range) => {
                      onFiltersChange({
                        ...filters,
                        dateRange: { from: range?.from, to: range?.to },
                      });
                    }}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Agent Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Agent
            </label>
            <Popover open={agentSelectOpen} onOpenChange={setAgentSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={agentSelectOpen}
                  className="w-full h-9 justify-between bg-background font-normal"
                >
                  <span className="truncate">
                    {(filters.agents?.length ?? 0) > 0 ? selectedAgentNames : "Select agents..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
                <Command>
                  <CommandInput placeholder="Search agent..." />
                  <CommandList>
                    <CommandEmpty>No agent found.</CommandEmpty>
                    <CommandGroup>
                      {agents.map((agent) => (
                        <CommandItem
                          key={agent.id}
                          value={agent.name}
                          onSelect={() => handleAgentToggle(agent.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              (filters.agents ?? []).includes(agent.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {agent.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Source Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Megaphone className="h-3 w-3" /> Lead Source
            </label>
            <Popover open={sourceSelectOpen} onOpenChange={setSourceSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sourceSelectOpen}
                  className="w-full h-9 justify-between bg-background font-normal"
                >
                  <span className="truncate">
                    {(filters.sources?.length ?? 0) > 0 ? selectedSourceNames : "Select sources..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
                <Command>
                  <CommandInput placeholder="Search source..." />
                  <CommandList>
                    <CommandEmpty>No source found.</CommandEmpty>
                    <CommandGroup>
                      {sources.map((source) => (
                        <CommandItem
                          key={source.id}
                          value={source.name}
                          onSelect={() => handleSourceToggle(source.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              (filters.sources ?? []).includes(source.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: source.color }}
                          />
                          {source.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CircleDot className="h-3 w-3" /> Lead Status
            </label>
            <Popover open={statusSelectOpen} onOpenChange={setStatusSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={statusSelectOpen}
                  className="w-full h-9 justify-between bg-background font-normal"
                >
                  <span className="truncate">
                    {(filters.statuses?.length ?? 0) > 0 ? selectedStatusNames : "Select statuses..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
                <Command>
                  <CommandInput placeholder="Search status..." />
                  <CommandList>
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup>
                      {statuses.map((status) => (
                        <CommandItem
                          key={status.id}
                          value={status.name}
                          onSelect={() => handleStatusToggle(status.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              (filters.statuses ?? []).includes(status.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Apply Button */}
          <Separator className="my-3" />
          <Button 
            className="w-full" 
            onClick={() => {
              setOpen(false);
              toast.success("Filters applied", {
                description: `${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} active`,
              });
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
