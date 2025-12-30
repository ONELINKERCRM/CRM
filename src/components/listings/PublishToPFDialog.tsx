import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Globe,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PublishToPFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    reference_number?: string;
    company_id?: string;
  };
  onSuccess?: () => void;
}

interface PortalAccount {
  id: string;
  account_name: string;
  status: string;
  portal_type: string;
}

interface PublicationStatus {
  id: string;
  status: string;
  pf_listing_id: string | null;
  portal_url: string | null;
  published_at: string | null;
  last_error_message: string | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function PublishToPFDialog({ open, onOpenChange, listing, onSuccess }: PublishToPFDialogProps) {
  const [step, setStep] = useState<"select" | "validate" | "publishing" | "result">("select");
  const [portalAccounts, setPortalAccounts] = useState<PortalAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [publication, setPublication] = useState<PublicationStatus | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string; pf_listing_id?: string } | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Fetch portal accounts on open
  useEffect(() => {
    if (open) {
      fetchPortalAccounts();
      fetchExistingPublication();
    } else {
      // Reset state when closed
      setStep("select");
      setValidation(null);
      setPublishResult(null);
    }
  }, [open, listing.id]);

  const fetchPortalAccounts = async () => {
    try {
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agent } = await supabase
        .from("agents")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!agent?.company_id) return;
      setCompanyId(agent.company_id);

      // Fetch Property Finder portal accounts
      const { data: accounts } = await supabase
        .from("portal_accounts")
        .select("id, account_name, status, portal_type")
        .eq("company_id", agent.company_id)
        .eq("status", "connected")
        .or("portal_type.eq.property_finder,account_name.ilike.%property%finder%");

      setPortalAccounts(accounts || []);
      if (accounts?.length === 1) {
        setSelectedAccount(accounts[0].id);
      }
    } catch (err) {
      console.error("Error fetching portal accounts:", err);
    }
  };

  const fetchExistingPublication = async () => {
    try {
      const { data } = await supabase
        .from("portal_listing_publications")
        .select("id, status, pf_listing_id, portal_url, published_at, last_error_message")
        .eq("listing_id", listing.id)
        .not("pf_listing_id", "is", null)
        .single();

      setPublication(data);
    } catch {
      // No existing publication
      setPublication(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedAccount || !companyId) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        return;
      }

      const response = await supabase.functions.invoke("pf-publish", {
        body: {
          action: "validate",
          listing_id: listing.id,
          portal_account_id: selectedAccount,
          company_id: companyId,
        },
      });

      if (response.error) {
        toast.error(response.error.message || "Validation failed");
        return;
      }

      setValidation(response.data.validation);
      setStep("validate");
    } catch (err: any) {
      toast.error(err.message || "Failed to validate listing");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedAccount || !companyId) return;

    setStep("publishing");
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        setStep("validate");
        return;
      }

      const action = publication?.pf_listing_id ? "update" : "publish";

      const response = await supabase.functions.invoke("pf-publish", {
        body: {
          action,
          listing_id: listing.id,
          portal_account_id: selectedAccount,
          company_id: companyId,
        },
      });

      if (response.error) {
        setPublishResult({
          success: false,
          message: response.error.message || "Publishing failed",
        });
      } else if (response.data?.success) {
        setPublishResult({
          success: true,
          message: response.data.message || "Listing published successfully!",
          pf_listing_id: response.data.pf_listing_id,
        });
        toast.success("Listing published to Property Finder!");
        onSuccess?.();
      } else {
        setPublishResult({
          success: false,
          message: response.data?.error || "Publishing failed",
        });
      }
      
      setStep("result");
    } catch (err: any) {
      setPublishResult({
        success: false,
        message: err.message || "Failed to publish listing",
      });
      setStep("result");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!selectedAccount || !companyId) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("pf-publish", {
        body: {
          action: "unpublish",
          listing_id: listing.id,
          portal_account_id: selectedAccount,
          company_id: companyId,
        },
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to unpublish");
      } else if (response.data?.success) {
        toast.success("Listing unpublished from Property Finder");
        setPublication(null);
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(response.data?.error || "Failed to unpublish");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to unpublish listing");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Publish to Property Finder
        </DialogTitle>
        <DialogDescription>
          Publish "{listing.title}" to Property Finder portal
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {publication && (
          <Alert className={cn(
            publication.status === "live" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : 
            publication.status === "rejected" ? "border-red-500 bg-red-50 dark:bg-red-950" : ""
          )}>
            <CheckCircle2 className={cn(
              "h-4 w-4",
              publication.status === "live" ? "text-emerald-600" : 
              publication.status === "rejected" ? "text-red-600" : "text-muted-foreground"
            )} />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-medium">
                  {publication.status === "live" ? "Published on Property Finder" : 
                   publication.status === "rejected" ? "Rejected by Property Finder" :
                   `Status: ${publication.status}`}
                </span>
                {publication.pf_listing_id && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (ID: {publication.pf_listing_id})
                  </span>
                )}
                {publication.last_error_message && (
                  <p className="text-sm text-red-600 mt-1">{publication.last_error_message}</p>
                )}
              </div>
              {publication.portal_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={publication.portal_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </a>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {portalAccounts.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No Property Finder account connected. Please configure your Property Finder API credentials in Portal Settings first.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Label>Property Finder Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {portalAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_name}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {account.status}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">Before publishing, ensure:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Listing has at least 1 image (5+ recommended)</li>
            <li>Description is at least 100 characters</li>
            <li>RERA/Permit number is set (required for Dubai)</li>
            <li>Assigned agent is mapped to Property Finder</li>
          </ul>
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        {publication?.status === "live" && (
          <Button 
            variant="destructive" 
            onClick={handleUnpublish}
            disabled={isLoading || !selectedAccount}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Unpublish
          </Button>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleValidate} 
          disabled={isLoading || !selectedAccount || portalAccounts.length === 0}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {publication?.pf_listing_id ? "Validate & Update" : "Validate & Publish"}
        </Button>
      </DialogFooter>
    </>
  );

  const renderValidateStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Validation Results</DialogTitle>
        <DialogDescription>
          Review the validation results before publishing
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {validation?.errors && validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Errors (must fix):</p>
              <ul className="list-disc list-inside space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation?.warnings && validation.warnings.length > 0 && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <p className="font-medium mb-2 text-amber-800 dark:text-amber-200">Warnings (recommended to fix):</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation?.valid && (
          <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-200">
              Listing is ready to be published to Property Finder!
            </AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => setStep("select")}>
          Back
        </Button>
        <Button 
          onClick={handlePublish} 
          disabled={!validation?.valid}
        >
          {publication?.pf_listing_id ? "Update on Property Finder" : "Publish to Property Finder"}
        </Button>
      </DialogFooter>
    </>
  );

  const renderPublishingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>Publishing to Property Finder</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {publication?.pf_listing_id ? "Updating listing..." : "Creating and publishing listing..."}
        </p>
        <p className="text-xs text-muted-foreground">
          This may take a few seconds
        </p>
      </div>
    </>
  );

  const renderResultStep = () => (
    <>
      <DialogHeader>
        <DialogTitle>
          {publishResult?.success ? "Published Successfully" : "Publishing Failed"}
        </DialogTitle>
      </DialogHeader>

      <div className="py-6">
        {publishResult?.success ? (
          <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-200">
              <p className="font-medium">{publishResult.message}</p>
              {publishResult.pf_listing_id && (
                <p className="text-sm mt-1">Property Finder ID: {publishResult.pf_listing_id}</p>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {publishResult?.message || "An error occurred while publishing"}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>
          Close
        </Button>
        {!publishResult?.success && (
          <Button variant="outline" onClick={() => setStep("select")}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {step === "select" && renderSelectStep()}
        {step === "validate" && renderValidateStep()}
        {step === "publishing" && renderPublishingStep()}
        {step === "result" && renderResultStep()}
      </DialogContent>
    </Dialog>
  );
}
