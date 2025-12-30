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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2, AlertCircle, Key, Link, Settings, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PortalWithAccount } from "@/hooks/usePortalAccounts";

interface PortalConnectDialogProps {
  portal: PortalWithAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    credentials: Record<string, string>,
    settings: { autoPublish: boolean; syncSchedule: "realtime" | "hourly" | "daily" }
  ) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function PortalConnectDialog({
  portal,
  open,
  onOpenChange,
  onSave,
  onDisconnect,
}: PortalConnectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);
  const [syncSchedule, setSyncSchedule] = useState<"realtime" | "hourly" | "daily">("hourly");

  // Reset form when portal changes
  useEffect(() => {
    if (portal) {
      setAutoPublish(portal.auto_publish);
      setSyncSchedule(portal.sync_schedule);
      setApiKey("");
      setApiSecret("");
      setWebhookUrl("");
      setUsername("");
      setPassword("");
      setTestResult(null);
    }
  }, [portal]);

  if (!portal) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if credentials are provided
    let hasCredentials = false;
    switch (portal.integration_type) {
      case "api_key":
        hasCredentials = apiKey.length > 0;
        break;
      case "api_key_secret":
        hasCredentials = apiKey.length > 0 && apiSecret.length > 0;
        break;
      case "webhook":
        hasCredentials = webhookUrl.length > 0;
        break;
      case "credentials":
        hasCredentials = username.length > 0 && password.length > 0;
        break;
      case "oauth2":
        hasCredentials = true; // OAuth would handle differently
        break;
    }

    const success = hasCredentials;
    setTestResult(success ? "success" : "error");
    setIsTesting(false);

    if (success) {
      toast.success("Connection successful!", { description: `${portal.name} is ready to use` });
    } else {
      toast.error("Connection failed", { description: "Please provide valid credentials" });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const credentials: Record<string, string> = {};

      switch (portal.integration_type) {
        case "api_key":
          if (apiKey) credentials.api_key = apiKey;
          break;
        case "api_key_secret":
          if (apiKey) credentials.api_key = apiKey;
          if (apiSecret) credentials.api_secret = apiSecret;
          break;
        case "webhook":
          if (webhookUrl) credentials.webhook_url = webhookUrl;
          if (apiKey) credentials.api_key = apiKey;
          break;
        case "credentials":
          if (username) credentials.username = username;
          if (password) credentials.password = password;
          break;
        case "oauth2":
          // OAuth handled differently
          break;
      }

      await onSave(credentials, { autoPublish, syncSchedule });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect();
    } finally {
      setIsLoading(false);
    }
  };

  const renderConnectionFields = () => {
    switch (portal.integration_type) {
      case "api_key":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={portal.connected ? "Active (Enter new key to update)" : "Enter your API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can find your API key in your {portal.name} account settings
              </p>
            </div>
          </div>
        );

      case "api_key_secret":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={portal.connected ? "Active (Enter new key to update)" : "Enter your API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder={portal.connected ? "Active (Enter new secret to update)" : "Enter your API secret"}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
              />
            </div>
          </div>
        );

      case "oauth2":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Click the button below to authorize with {portal.name}
              </p>
              <Button variant="outline" onClick={() => toast.info("Redirecting to " + portal.name + " auth...")}>
                <Link className="h-4 w-4 mr-2" />
                Authorize with {portal.name}
              </Button>
            </div>
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                placeholder={portal.connected ? "Active (Enter new URL to update)" : "https://your-website.com/api/listings"}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={portal.connected ? "Active (Enter new key to update)" : "Enter API key if required"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>
        );

      case "credentials":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username / Email</Label>
              <Input
                id="username"
                placeholder={portal.connected ? "Active (Enter new username to update)" : "Enter your username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={portal.connected ? "Active (Enter new password to update)" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {portal.logo_url ? (
              <img src={portal.logo_url} alt={portal.name} className="w-10 h-10 rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle>{portal.display_name || portal.name}</DialogTitle>
              <DialogDescription>
                {portal.country ? `${portal.country} property portal` : "Property portal integration"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="connection" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connection">
              <Key className="h-4 w-4 mr-2" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4 mt-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <span className="text-sm font-medium">Status</span>
              <Badge
                variant="outline"
                className={cn(
                  portal.connected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                {portal.connected ? "Connected" : "Not Connected"}
              </Badge>
            </div>

            {/* Integration Type Badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Integration Type:</span>
              <Badge variant="secondary" className="capitalize">
                {portal.integration_type.replace(/_/g, " + ")}
              </Badge>
            </div>

            <Separator />

            {/* Connection Fields */}
            {renderConnectionFields()}

            {/* Test Connection */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex-1"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              {testResult === "success" && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Success</span>
                </div>
              )}
              {testResult === "error" && (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Failed</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {/* Auto-Publish */}
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <p className="text-sm font-medium">Auto-Publish</p>
                <p className="text-xs text-muted-foreground">
                  Automatically publish new listings
                </p>
              </div>
              <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
            </div>

            {/* Sync Schedule */}
            <div className="space-y-2">
              <Label>Sync Schedule</Label>
              <Select value={syncSchedule} onValueChange={(v) => setSyncSchedule(v as typeof syncSchedule)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often to sync listings with {portal.name}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 gap-2">
          {portal.connected && (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              Disconnect
            </Button>
          )}
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              portal.connected ? "Save Changes" : "Connect Portal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
