import { useState } from "react";
import {
  X,
  ChevronRight,
  Check,
  ExternalLink,
  Phone,
  Link2,
  Smartphone,
  Building2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MetaConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (connection: WhatsAppConnection) => void;
}

export interface WhatsAppConnection {
  id: string;
  phoneNumber: string;
  displayName: string;
  type: "personal" | "business_app" | "business_api";
  status: "connected" | "pending" | "error";
  connectedAt: string;
}

type ConnectionType = "personal" | "business_app" | "business_api";
type Step = "select_type" | "instructions" | "connect" | "verify" | "success";

const connectionTypes = [
  {
    value: "personal" as ConnectionType,
    title: "WhatsApp App",
    description: "My number is logged into the personal WhatsApp mobile application",
    icon: Smartphone,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    value: "business_app" as ConnectionType,
    title: "WhatsApp Business App",
    description: "My number is logged into the WhatsApp Business mobile application",
    icon: Phone,
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  {
    value: "business_api" as ConnectionType,
    title: "WhatsApp Business API",
    description: "My number is registered on the WhatsApp Business Platform (also known as WhatsApp Business API)",
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
];

export function MetaConnectDialog({
  open,
  onOpenChange,
  onSuccess,
}: MetaConnectDialogProps) {
  const [step, setStep] = useState<Step>("select_type");
  const [selectedType, setSelectedType] = useState<ConnectionType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleTypeSelect = (type: ConnectionType) => {
    setSelectedType(type);
    setStep("instructions");
  };

  const handleMetaLogin = async () => {
    setIsConnecting(true);
    // Simulate Meta OAuth flow
    setTimeout(() => {
      setStep("verify");
      setIsConnecting(false);
    }, 2000);
  };

  const handleVerify = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter your WhatsApp phone number");
      return;
    }

    setIsConnecting(true);
    // Simulate verification
    setTimeout(() => {
      setStep("success");
      setIsConnecting(false);
    }, 1500);
  };

  const handleComplete = () => {
    const connection: WhatsAppConnection = {
      id: crypto.randomUUID(),
      phoneNumber: phoneNumber || "+971 50 123 4567",
      displayName: selectedType === "business_api" ? "Business API" : "WhatsApp Business",
      type: selectedType!,
      status: "connected",
      connectedAt: new Date().toISOString(),
    };
    onSuccess(connection);
    toast.success("WhatsApp Business connected successfully!");
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep("select_type");
    setSelectedType(null);
    setPhoneNumber("");
    setIsConnecting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "select_type" && "Connect your WhatsApp Business number"}
            {step === "instructions" && "Connect via Meta Business"}
            {step === "connect" && "Connecting to Meta..."}
            {step === "verify" && "Verify your phone number"}
            {step === "success" && "Connection Successful!"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step: Select Type */}
          {step === "select_type" && (
            <>
              <p className="text-sm text-muted-foreground">
                To set up your WhatsApp Campaign, you'll need a phone number logged into the{" "}
                <span className="font-semibold text-foreground">WhatsApp Business mobile app</span>.
              </p>
              <p className="text-sm text-muted-foreground">
                How are you currently using the phone number you wish to connect?
              </p>

              <div className="space-y-3 mt-4">
                {connectionTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleTypeSelect(type.value)}
                    className="w-full flex items-center justify-between p-4 border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", type.bgColor)}>
                        <type.icon className={cn("h-5 w-5", type.color)} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-primary">{type.title}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step: Instructions */}
          {step === "instructions" && (
            <>
              <p className="text-sm text-muted-foreground">
                Click on <span className="font-semibold text-foreground">'LOGIN WITH FACEBOOK'</span> to set up your WhatsApp Auto-Responder. This will only take a few minutes.
              </p>

              <p className="text-sm text-muted-foreground">
                Make sure to select <span className="font-semibold text-foreground">'Connect your existing WhatsApp Business App'</span> and enter your WhatsApp Business phone number when prompted by Facebook.
              </p>

              {/* Visual Guide */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex gap-1">
                    <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">∞</span>
                    </div>
                    <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-sm font-medium">Select your setup</p>
                  </div>
                  <p className="text-xs text-muted-foreground ml-7">
                    Choose how you would like to onboard with your CRM
                  </p>

                  <div className="ml-4 mt-4 p-4 border-2 border-primary rounded-xl bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Link2 className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Connect your existing WhatsApp Business App</p>
                        <p className="text-xs text-muted-foreground">
                          Share your WhatsApp Business account with CRM. You'll still have full access to your WhatsApp Business app and can continue using it.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleMetaLogin} 
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    LOGIN WITH FACEBOOK
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              <Button variant="link" className="w-full text-primary">
                <ExternalLink className="h-4 w-4 mr-2" />
                VIEW HELP GUIDE
              </Button>
            </>
          )}

          {/* Step: Verify */}
          {step === "verify" && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">Meta account connected</p>
                    <p className="text-sm text-green-700">Now verify your WhatsApp phone number</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>WhatsApp Phone Number</Label>
                  <Input
                    placeholder="+971 50 123 4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number registered with your WhatsApp Business account
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Verification Required</p>
                      <p className="text-blue-700">
                        You'll receive a verification code on your WhatsApp to confirm the connection.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("instructions")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleVerify} disabled={isConnecting} className="flex-1">
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Connect"
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <>
              <div className="text-center py-6">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  WhatsApp Connected Successfully!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your WhatsApp Business number has been connected and is ready to use for campaigns.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{phoneNumber || "+971 50 123 4567"}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedType === "business_api" ? "WhatsApp Business API" : "WhatsApp Business App"}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-green-100 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              </div>

              <Button onClick={handleComplete} className="w-full">
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
