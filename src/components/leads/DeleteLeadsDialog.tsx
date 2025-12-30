import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onSuccess: () => void;
}

export function DeleteLeadsDialog({
  open,
  onOpenChange,
  leadIds,
  onSuccess,
}: DeleteLeadsDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText.toLowerCase() === "delete";

  const handleDelete = async () => {
    if (!isConfirmed || leadIds.length === 0) return;

    setIsDeleting(true);
    try {
      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to delete leads");
        return;
      }

      // Fetch lead details before deletion for logging
      const { data: leadsToDelete, error: fetchError } = await supabase
        .from("leads")
        .select("*")
        .in("id", leadIds);

      if (fetchError) {
        console.error("Error fetching leads:", fetchError);
        toast.error("Failed to fetch lead details");
        return;
      }

      // Create activity logs for each deletion
      const activityLogs = (leadsToDelete || []).map(lead => ({
        lead_id: lead.id,
        type: "deleted",
        title: "Lead Deleted",
        description: `Lead "${lead.name}" was permanently deleted`,
        agent_name: "System",
        agent_id: user.id,
        company_id: lead.company_id,
      }));

      // Insert activity logs
      if (activityLogs.length > 0) {
        const { error: logError } = await supabase
          .from("lead_activities")
          .insert(activityLogs);

        if (logError) {
          console.error("Error logging deletions:", logError);
        }
      }

      // Delete leads
      const { error: deleteError } = await supabase
        .from("leads")
        .delete()
        .in("id", leadIds);

      if (deleteError) {
        console.error("Error deleting leads:", deleteError);
        toast.error("Failed to delete leads. You may not have permission.");
        return;
      }

      toast.success(`${leadIds.length} lead(s) deleted successfully`);
      setConfirmText("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {leadIds.length} Lead{leadIds.length > 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription className="text-sm">
            This action cannot be undone. This will permanently delete the selected
            lead{leadIds.length > 1 ? "s" : ""} and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">
              Warning: You are about to delete {leadIds.length} lead
              {leadIds.length > 1 ? "s" : ""} permanently.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">delete</span> to
              confirm
            </Label>
            <Input
              id="confirm"
              placeholder="Type 'delete' to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {leadIds.length} Lead{leadIds.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
