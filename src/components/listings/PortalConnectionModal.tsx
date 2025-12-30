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
import { Check, Loader2, AlertCircle, Key, Link, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Portal {
  id: string;
  name: string;
  logo: string;
  description: string;
  connected: boolean;
  status: "connected" | "disconnected" | "error";
  lastSync: string | null;
  listingsCount: number;
  integrationType: "api_key" | "api_key_secret" | "oauth2" | "webhook" | "credentials";
  autoPublish: boolean;
  syncSchedule: "realtime" | "hourly" | "daily";
}

interface PortalConnectionModalProps {
  portal: Portal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (portal: Portal) => void;
}

export function PortalConnectionModal({
  portal,
  open,
  onOpenChange,
  onSave,
}: PortalConnectionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  
  // Form state
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [autoPublish, setAutoPublish] = useState(portal?.autoPublish || false);
  const [syncSchedule, setSyncSchedule] = useState<string>(portal?.syncSchedule || "hourly");
  const [autoUnpublish, setAutoUnpublish] = useState(false);

  if (!portal) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.3; // 70% success rate for demo
    setTestResult(success ? "success" : "error");
    setIsTesting(false);
    
    if (success) {
      toast.success("Connection successful!", { description: `${portal.name} is ready to use` });
    } else {
      toast.error("Connection failed", { description: "Please check your credentials" });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    onSave({
      ...portal,
      connected: true,
      status: "connected",
      autoPublish,
      syncSchedule: syncSchedule as Portal["syncSchedule"],
      lastSync: "Just now",
    });
    
    setIsLoading(false);
    onOpenChange(false);
    toast.success(`${portal.name} connected successfully!`);
  };

  const handleDisconnect = () => {
    onSave({
      ...portal,
      connected: false,
      status: "disconnected",
      lastSync: null,
      listingsCount: 0,
    });
    onOpenChange(false);
    toast.success(`${portal.name} disconnected`);
  };

  const renderConnectionFields = () => {
    switch (portal.integrationType) {
      case "api_key":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
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
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder="Enter your API secret"
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
              <Button variant="outline">
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
                placeholder="https://api.portal.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter API key if required"
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
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
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
            <span className="text-3xl">{portal.logo}</span>
            <div>
              <DialogTitle>{portal.name}</DialogTitle>
              <DialogDescription>{portal.description}</DialogDescription>
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
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                )}
              >
                {portal.connected ? "Connected" : "Not Connected"}
              </Badge>
            </div>

            {/* Integration Type Badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Integration Type:</span>
              <Badge variant="secondary" className="capitalize">
                {portal.integrationType.replace("_", " + ")}
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

            {/* Auto-Unpublish */}
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <p className="text-sm font-medium">Auto-Unpublish Inactive</p>
                <p className="text-xs text-muted-foreground">
                  Remove listings when marked as sold/rented
                </p>
              </div>
              <Switch checked={autoUnpublish} onCheckedChange={setAutoUnpublish} />
            </div>

            {/* Sync Schedule */}
            <div className="space-y-2">
              <Label>Sync Schedule</Label>
              <Select value={syncSchedule} onValueChange={setSyncSchedule}>
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
            <Button variant="outline" onClick={handleDisconnect} className="text-destructive">
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
              "Save Connection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}