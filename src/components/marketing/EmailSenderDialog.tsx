import { useState } from "react";
import {
  Check,
  ChevronRight,
  Loader2,
  Mail,
  Key,
  ExternalLink,
  Globe,
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

interface EmailSenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (connection: EmailConnection) => void;
}

export interface EmailConnection {
  id: string;
  provider: string;
  email: string;
  domain?: string;
  status: "connected" | "pending" | "error";
  connectedAt: string;
}

const emailProviders = [
  {
    id: "resend",
    name: "Resend",
    logo: "📧",
    description: "Modern email API for developers",
    popular: true,
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    logo: "📬",
    description: "Trusted email delivery platform",
    popular: true,
  },
  {
    id: "mailgun",
    name: "Mailgun",
    logo: "✉️",
    description: "Powerful transactional email API",
    popular: false,
  },
  {
    id: "ses",
    name: "Amazon SES",
    logo: "📨",
    description: "Scalable email service from AWS",
    popular: false,
  },
  {
    id: "smtp",
    name: "Custom SMTP",
    logo: "🔧",
    description: "Use your own SMTP server",
    popular: false,
  },
];

type Step = "select_provider" | "credentials" | "domain" | "success";

export function EmailSenderDialog({
  open,
  onOpenChange,
  onSuccess,
}: EmailSenderDialogProps) {
  const [step, setStep] = useState<Step>("select_provider");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [credentials, setCredentials] = useState({
    apiKey: "",
    senderEmail: "",
    senderName: "",
    domain: "",
  });

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setStep("credentials");
  };

  const handleCredentialsSubmit = async () => {
    if (!credentials.apiKey || !credentials.senderEmail || !credentials.senderName) {
      toast.error("Please fill in all required fields");
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
    const provider = emailProviders.find(p => p.id === selectedProvider);
    const connection: EmailConnection = {
      id: crypto.randomUUID(),
      provider: provider?.name || "Email Provider",
      email: credentials.senderEmail,
      domain: credentials.domain,
      status: "connected",
      connectedAt: new Date().toISOString(),
    };
    onSuccess(connection);
    toast.success("Email sender connected successfully!");
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep("select_provider");
    setSelectedProvider(null);
    setCredentials({ apiKey: "", senderEmail: "", senderName: "", domain: "" });
    setIsConnecting(false);
    onOpenChange(false);
  };

  const provider = emailProviders.find(p => p.id === selectedProvider);

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "select_provider" && "Connect Email Provider"}
            {step === "credentials" && `Connect to ${provider?.name}`}
            {step === "success" && "Email Provider Connected!"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step: Select Provider */}
          {step === "select_provider" && (
            <>
              <p className="text-sm text-muted-foreground">
                Select your email provider to send email campaigns to your leads.
              </p>

              <div className="space-y-3 mt-4">
                {emailProviders.map((provider) => (
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
                Enter your {provider?.name} credentials to connect your account.
              </p>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="Enter your API key"
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sender Email Address</Label>
                  <Input
                    type="email"
                    placeholder="noreply@yourcompany.com"
                    value={credentials.senderEmail}
                    onChange={(e) => setCredentials({ ...credentials, senderEmail: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input
                    placeholder="Your Company Name"
                    value={credentials.senderName}
                    onChange={(e) => setCredentials({ ...credentials, senderName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Domain (Optional)</Label>
                  <Input
                    placeholder="yourcompany.com"
                    value={credentials.domain}
                    onChange={(e) => setCredentials({ ...credentials, domain: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Verify your domain for better deliverability
                  </p>
                </div>

                <Button variant="link" className="px-0 text-primary">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  How to get {provider?.name} API key
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
                  Your email provider is now ready to send campaigns.
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{credentials.senderEmail}</p>
                    <p className="text-xs text-muted-foreground">{provider?.name} • {credentials.senderName}</p>
                  </div>
                  <Badge className="ml-auto bg-green-100 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              </div>

              {credentials.domain && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <Globe className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Domain Verification</p>
                      <p className="text-blue-700">
                        Add DNS records to verify {credentials.domain} for better deliverability.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
