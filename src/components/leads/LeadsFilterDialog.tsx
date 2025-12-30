import { X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useStages } from "@/contexts/StagesContext";
import { useGroups } from "@/contexts/GroupsContext";

interface LeadsFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterStage: string;
  onFilterStageChange: (value: string) => void;
  filterGroup: string;
  onFilterGroupChange: (value: string) => void;
  filterSource: string;
  onFilterSourceChange: (value: string) => void;
  filterAgent: string;
  onFilterAgentChange: (value: string) => void;
  onReset: () => void;
  availableAgents?: { id: string; name: string }[] | string[];
  availableSources?: string[];
}

export function LeadsFilterDialog({
  open,
  onOpenChange,
  filterStage,
  onFilterStageChange,
  filterGroup,
  onFilterGroupChange,
  filterSource,
  onFilterSourceChange,
  filterAgent,
  onFilterAgentChange,
  onReset,
  availableAgents = [],
  availableSources = ["Meta", "TikTok", "Website", "Referral", "Google Ads", "WhatsApp", "Cold Call", "Property Finder"],
}: LeadsFilterDialogProps) {
  const { stages } = useStages();
  const { groups } = useGroups();

  const handleApply = () => {
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between border-b pb-4">
          <DrawerTitle className="text-lg font-semibold">Filters</DrawerTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Stage Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Stage</label>
            <Select value={filterStage} onValueChange={onFilterStageChange}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.name}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Group</label>
            <Select value={filterGroup} onValueChange={onFilterGroupChange}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.name}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Source</label>
            <Select value={filterSource} onValueChange={onFilterSourceChange}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {availableSources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Assigned To</label>
            <Select value={filterAgent} onValueChange={onFilterAgentChange}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {availableAgents.map((agent) => {
                  const id = typeof agent === 'string' ? agent : agent.id;
                  const name = typeof agent === 'string' ? agent : agent.name;
                  return (
                    <SelectItem key={id} value={name}>{name}</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 border-t">
          <Button
            onClick={handleApply}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            Apply Filters
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
