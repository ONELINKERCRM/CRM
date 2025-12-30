import { useState } from "react";
import {
  Check,
  ChevronRight,
  Loader2,
  MessageSquare,
  Key,
  ExternalLink,
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

interface SMSProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (connection: SMSConnection) => void;
}

export interface SMSConnection {
  id: string;
  provider: string;
  phoneNumber: string;
  status: "connected" | "pending" | "error";
  connectedAt: string;
}

const smsProviders = [
  {
    id: "twilio",
    name: "Twilio",
    logo: "📱",
    description: "Global SMS delivery with high reliability",
    popular: true,
  },
  {
    id: "messagebird",
    name: "MessageBird",
    logo: "🐦",
    description: "Enterprise-grade messaging platform",
    popular: false,
  },
  {
    id: "vonage",
    name: "Vonage (Nexmo)",
    logo: "📞",
    description: "Global cloud communications",
    popular: false,
  },
  {
    id: "plivo",
    name: "Plivo",
    logo: "💬",
    description: "Cloud communications platform",
    popular: false,
  },
];

type Step = "select_provider" | "credentials" | "verify" | "success";

export function SMSProviderDialog({
  open,
  onOpenChange,
  onSuccess,
}: SMSProviderDialogProps) {
  const [step, setStep] = useState<Step>("select_provider");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [credentials, setCredentials] = useState({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
  });

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setStep("credentials");
  };

  const handleCredentialsSubmit = async () => {
    if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsConnecting(true);
    // Simulate API verification
    setTimeout(() => {
      setStep("success");
      setIsConnecting(false);
    }, 2000);
  };

  const handleComplete = () => {
    const provider = smsProviders.find(p => p.id === selectedProvider);
    const connection: SMSConnection = {
      id: crypto.randomUUID(),
      provider: provider?.name || "SMS Provider",
      phoneNumber: credentials.phoneNumber,
      status: "connected",
      connectedAt: new Date().toISOString(),
    };
    onSuccess(connection);
    toast.success("SMS provider connected successfully!");
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep("select_provider");
    setSelectedProvider(null);
    setCredentials({ accountSid: "", authToken: "", phoneNumber: "" });
    setIsConnecting(false);
    onOpenChange(false);
  };

  const provider = smsProviders.find(p => p.id === selectedProvider);

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "select_provider" && "Connect SMS Provider"}
            {step === "credentials" && `Connect to ${provider?.name}`}
            {step === "success" && "SMS Provider Connected!"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step: Select Provider */}
          {step === "select_provider" && (
            <>
              <p className="text-sm text-muted-foreground">
                Select your SMS provider to send text message campaigns to your leads.
              </p>

              <div className="space-y-3 mt-4">
                {smsProviders.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderSelect(provider.id)}
                    className="w-full flex items-center justify-between p-4 border rounded-xl hover:border-primary/50 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xl">
                        {provider.logo}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{provider.name}</p>
                          {provider.popular && (
                            <Badge variant="secondary" className="text-xs">Popular</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{provider.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step: Credentials */}
          {step === "credentials" && (
            <>
              <p className="text-sm text-muted-foreground">
                Enter your {provider?.name} API credentials to connect your account.
              </p>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Account SID / API Key</Label>
                  <Input
                    placeholder="Enter your account SID"
                    value={credentials.accountSid}
                    onChange={(e) => setCredentials({ ...credentials, accountSid: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Auth Token / API Secret</Label>
                  <Input
                    type="password"
                    placeholder="Enter your auth token"
                    value={credentials.authToken}
                    onChange={(e) => setCredentials({ ...credentials, authToken: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sender Phone Number</Label>
                  <Input
                    placeholder="+1 234 567 8900"
                    value={credentials.phoneNumber}
                    onChange={(e) => setCredentials({ ...credentials, phoneNumber: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The phone number to send SMS from (must be verified in {provider?.name})
                  </p>
                </div>

                <Button variant="link" className="px-0 text-primary">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  How to get {provider?.name} credentials
                </Button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("select_provider")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleCredentialsSubmit} disabled={isConnecting} className="flex-1">
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Connect
                    </>
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
                  {provider?.name} Connected!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your SMS provider is now ready to send campaigns.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{credentials.phoneNumber}</p>
                    <p className="text-xs text-muted-foreground">{provider?.name}</p>
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
