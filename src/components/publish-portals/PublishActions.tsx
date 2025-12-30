import { useState } from "react";
import {
  Send,
  Save,
  Eye,
  Loader2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Portal, PortalCustomization } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface PublishActionsProps {
  selectedPortals: string[];
  portals: Portal[];
  customizations: Record<string, PortalCustomization>;
  listingId: string;
  companyId: string;
  onPublish: () => Promise<void>;
  onSaveDraft: () => void;
  onPreview: (portalId: string) => void;
}

interface PublishProgress {
  portalId: string;
  portalName: string;
  status: 'pending' | 'publishing' | 'success' | 'error';
  message?: string;
}

export function PublishActions({
  selectedPortals,
  portals,
  customizations,
  listingId,
  companyId,
  onPublish,
  onSaveDraft,
  onPreview,
}: PublishActionsProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<PublishProgress[]>([]);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const allValid = selectedPortals.every(
    (id) => customizations[id]?.isValid !== false
  );

  const totalValidationScore = selectedPortals.length > 0
    ? Math.round(
        selectedPortals.reduce(
          (sum, id) => sum + (customizations[id]?.validationScore || 0),
          0
        ) / selectedPortals.length
      )
    : 0;

  const handlePublish = async () => {
    setIsPublishing(true);
    setShowProgressDialog(true);

    // Initialize progress
    const initialProgress: PublishProgress[] = selectedPortals.map((id) => ({
      portalId: id,
      portalName: portals.find((p) => p.id === id)?.name || id,
      status: 'pending',
    }));
    setPublishProgress(initialProgress);

    // Publish to each portal using the edge function
    for (let i = 0; i < selectedPortals.length; i++) {
      const portalId = selectedPortals[i];
      const portal = portals.find((p) => p.id === portalId);
      const customization = customizations[portalId];
      
      // Set current portal to publishing
      setPublishProgress((prev) =>
        prev.map((p) =>
          p.portalId === portalId ? { ...p, status: 'publishing' } : p
        )
      );

      try {
        // Determine which edge function to call based on portal name
        const portalName = portal?.name?.toLowerCase() || '';
        let functionName = 'portal-publish'; // Default generic function
        
        if (portalName.includes('property finder')) {
          functionName = 'pf-publish';
        }

        // Get the actual portal_account.id for the API call
        const portalAccountId = portal?.accountId;
        if (!portalAccountId) {
          throw new Error('Portal is not connected. Please connect this portal first.');
        }

        // Call the edge function
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: {
            action: 'publish',
            listing_id: listingId,
            portal_account_id: portalAccountId, // Use the actual portal_accounts.id
            company_id: companyId,
            customizations: customization ? {
              title: customization.title,
              description: customization.description,
              price: customization.price,
              images: customization.selectedImages,
            } : undefined,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to publish');
        }

        if (data?.success) {
          setPublishProgress((prev) =>
            prev.map((p) =>
              p.portalId === portalId
                ? { ...p, status: 'success', message: data.message || 'Published successfully' }
                : p
            )
          );
        } else {
          throw new Error(data?.error || 'Publication failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect to portal API';
        setPublishProgress((prev) =>
          prev.map((p) =>
            p.portalId === portalId
              ? { ...p, status: 'error', message: errorMessage }
              : p
          )
        );
      }
    }

    await onPublish();
    setIsPublishing(false);
  };

  const successCount = publishProgress.filter((p) => p.status === 'success').length;
  const errorCount = publishProgress.filter((p) => p.status === 'error').length;
  const overallProgress = publishProgress.length > 0
    ? (publishProgress.filter((p) => p.status !== 'pending' && p.status !== 'publishing').length / publishProgress.length) * 100
    : 0;

  return (
    <>
      <Card className="sticky bottom-4 shadow-lg border-2">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs md:text-sm font-medium">
                  {selectedPortals.length} portal{selectedPortals.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Progress value={totalValidationScore} className="w-16 md:w-24 h-1.5" />
                  <span
                    className={cn(
                      "text-[10px] md:text-xs font-medium",
                      totalValidationScore >= 90
                        ? "text-emerald-600"
                        : totalValidationScore >= 70
                        ? "text-amber-600"
                        : "text-red-600"
                    )}
                  >
                    {totalValidationScore}% Ready
                  </span>
                </div>
              </div>
              {!allValid && (
                <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0.5 hidden sm:flex">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Issues
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs flex-1 sm:flex-none" onClick={onSaveDraft}>
                <Save className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Save </span>Draft
              </Button>
              {selectedPortals.length === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs hidden sm:flex"
                  onClick={() => onPreview(selectedPortals[0])}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Preview
                </Button>
              )}
              <Button
                onClick={handlePublish}
                size="sm"
                disabled={selectedPortals.length === 0 || isPublishing}
                className="h-8 text-xs flex-1 sm:flex-none sm:min-w-24"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    <span className="hidden sm:inline">Publishing...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Publish
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publishing Progress</DialogTitle>
            <DialogDescription>
              Publishing your listing to selected portals
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Progress value={overallProgress} className="h-2" />

            <div className="space-y-3">
              {publishProgress.map((progress) => (
                <div
                  key={progress.portalId}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    {progress.status === 'pending' && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {progress.status === 'publishing' && (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    )}
                    {progress.status === 'success' && (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {progress.status === 'error' && (
                      <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                        <X className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <span className="font-medium text-sm">{progress.portalName}</span>
                  </div>
                  {progress.message && (
                    <span
                      className={cn(
                        "text-xs",
                        progress.status === 'success'
                          ? "text-emerald-600"
                          : progress.status === 'error'
                          ? "text-red-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {progress.message}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {!isPublishing && publishProgress.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4 text-sm">
                  {successCount > 0 && (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      {successCount} successful
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-red-600 flex items-center gap-1">
                      <X className="h-4 w-4" />
                      {errorCount} failed
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProgressDialog(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
