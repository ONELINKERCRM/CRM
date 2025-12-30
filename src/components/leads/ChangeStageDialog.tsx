import { useState, forwardRef } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStages, LeadStage } from "@/contexts/StagesContext";

interface ChangeStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeadIds: string[];
  onStageChange: (stageId: string, stageName: string) => void;
}

export const ChangeStageDialog = forwardRef<HTMLDivElement, ChangeStageDialogProps>(
  function ChangeStageDialog({ open, onOpenChange, selectedLeadIds, onStageChange }, ref) {
    const { stages } = useStages();
    const [selectedStage, setSelectedStage] = useState<LeadStage | null>(null);
    const [changing, setChanging] = useState(false);

    const handleChangeStage = async () => {
      if (!selectedStage) return;
      
      setChanging(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      onStageChange(selectedStage.id, selectedStage.name);
      setChanging(false);
      setSelectedStage(null);
      onOpenChange(false);
    };

    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <ChevronRight className="h-5 w-5" />
              Change Stage
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Select a new stage for {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? "s" : ""}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody>
            <ScrollArea className="h-[300px] rounded-md border">
              {stages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <ChevronRight className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No stages available</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => setSelectedStage(stage)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        selectedStage?.id === stage.id
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{stage.name}</span>
                      </div>
                      {selectedStage?.id === stage.id && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none h-11 sm:h-9">
              Cancel
            </Button>
            <Button
              onClick={handleChangeStage}
              disabled={!selectedStage || changing}
              className="flex-1 sm:flex-none h-11 sm:h-9"
            >
              {changing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Move to {selectedStage?.name || "Stage"}
                </>
              )}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }
);