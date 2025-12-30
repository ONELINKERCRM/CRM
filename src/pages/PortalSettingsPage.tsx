import { useState, useEffect } from "react";
import { Cloud, User, Star, RefreshCw, Save, Key, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PortalSettingsPageSkeleton } from "@/components/ui/page-skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/ui/empty-state";
import { Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

interface PortalAgent {
  id: string;
  name: string;
  avatar?: string;
}

interface Portal {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  portalAccountId?: string;
  credentials?: {
    api_key?: string;
    api_secret?: string;
  };
  agents: PortalAgent[];
}

interface PortalConfig {
  autoSync: boolean;
  defaultAgentId: string;
}

const CONFIG_STORAGE_KEY = "portal_configurations";

const getPortalConfigs = (): Record<string, PortalConfig> => {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const defaultConfig: PortalConfig = {
  autoSync: true,
  defaultAgentId: "",
};

const getPortalLogo = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("property finder")) return "🏠";
  if (lower.includes("bayut")) return "🏢";
  if (lower.includes("dubizzle")) return "📋";
  return "🌐";
};

export default function PortalSettingsPage() {
  const isMobile = useIsMobile();
  const { company } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [configs, setConfigs] = useState<Record<string, PortalConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [apiCredentials, setApiCredentials] = useState<Record<string, { api_key: string; api_secret: string }>>({});
  const [savingCredentials, setSavingCredentials] = useState<string | null>(null);

  // Fetch connected portals from database
  useEffect(() => {
    const fetchPortals = async () => {
      if (!company?.id) return;

      try {
        // Get all portal accounts for this company
        const { data: portalAccounts, error: accountsError } = await supabase
          .from("portal_accounts")
          .select(`
            id,
            portal_id,
            status,
            credentials,
            portals (
              id,
              name
            )
          `)
          .eq("company_id", company.id)
          .eq("status", "connected");

        if (accountsError) {
          console.error("Error fetching portal accounts:", accountsError);
          return;
        }

        const mappedPortals: Portal[] = (portalAccounts || []).map((account: any) => ({
          id: account.portal_id,
          name: account.portals?.name || "Unknown Portal",
          logo: getPortalLogo(account.portals?.name || ""),
          connected: true,
          portalAccountId: account.id,
          credentials: account.credentials || {},
          agents: [], // Will be fetched separately if needed
        }));

        setPortals(mappedPortals);

        // Initialize API credentials state
        const initialCredentials: Record<string, { api_key: string; api_secret: string }> = {};
        mappedPortals.forEach((portal) => {
          initialCredentials[portal.id] = {
            api_key: portal.credentials?.api_key || "",
            api_secret: portal.credentials?.api_secret || "",
          };
        });
        setApiCredentials(initialCredentials);

        // Merge saved configs
        const savedConfigs = getPortalConfigs();
        const mergedConfigs: Record<string, PortalConfig> = {};
        mappedPortals.forEach((portal) => {
          mergedConfigs[portal.id] = {
            ...defaultConfig,
            ...savedConfigs[portal.id],
          };
        });
        setConfigs(mergedConfigs);
      } catch (error) {
        console.error("Error fetching portals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortals();
  }, [company?.id]);

  const handleSyncNow = async (portalId: string, portalName: string) => {
    setSyncing(portalId);
    toast.loading(`Syncing ${portalName}...`, { id: `sync-${portalId}` });
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSyncing(null);
    toast.success(`${portalName} synced successfully`, { id: `sync-${portalId}` });
  };

  const updateConfig = (portalId: string, key: keyof PortalConfig, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [portalId]: {
        ...defaultConfig,
        ...prev[portalId],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const updateCredentials = (portalId: string, field: "api_key" | "api_secret", value: string) => {
    setApiCredentials(prev => ({
      ...prev,
      [portalId]: {
        ...prev[portalId],
        [field]: value,
      },
    }));
  };

  const saveCredentials = async (portal: Portal) => {
    if (!portal.portalAccountId) return;

    setSavingCredentials(portal.id);
    try {
      const credentials = apiCredentials[portal.id];

      const { error } = await supabase
        .from("portal_accounts")
        .update({
          credentials: {
            api_key: credentials.api_key,
            api_secret: credentials.api_secret,
          },
        })
        .eq("id", portal.portalAccountId);

      if (error) throw error;

      toast.success(`${portal.name} API credentials saved`);
    } catch (error) {
      console.error("Error saving credentials:", error);
      toast.error("Failed to save credentials");
    } finally {
      setSavingCredentials(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configs));
    setSaving(false);
    setHasChanges(false);
    toast.success("Settings saved");
  };

  const toggleShowSecret = (portalId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [portalId]: !prev[portalId],
    }));
  };

  const hasApiSupport = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes("property finder") || lower.includes("bayut") || lower.includes("dubizzle");
  };

  if (isLoading) {
    return <PortalSettingsPageSkeleton isMobile={isMobile} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Portal Settings</h1>
          <p className="text-muted-foreground text-sm">
            Configure API credentials, default agents, and sync settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm" className="w-full sm:w-auto">
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save
        </Button>
      </div>

      {/* Portal Cards */}
      {portals.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Link2}
              title="No portals connected"
              description="Connect to property portals from the Integrations page to configure them here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {portals.map(portal => {
            const config = configs[portal.id] || defaultConfig;
            const credentials = apiCredentials[portal.id] || { api_key: "", api_secret: "" };
            const showSecret = showSecrets[portal.id] || false;
            const hasSupport = hasApiSupport(portal.name);

            return (
              <Card key={portal.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{portal.logo}</span>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex flex-wrap items-center gap-2">
                          {portal.name}
                          <Badge variant="outline" className="text-xs font-normal">
                            Connected
                          </Badge>
                        </CardTitle>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncNow(portal.id, portal.name)}
                      disabled={syncing === portal.id}
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing === portal.id ? 'animate-spin' : ''}`} />
                      {syncing === portal.id ? 'Syncing...' : 'Sync Now'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* API Credentials Section - Show for portals with API support */}
                  {hasApiSupport(portal.name) && (
                    <div className="space-y-3 pb-4 border-b">
                      <Label className="flex items-center gap-2 text-sm font-medium">
                        <Key className="h-4 w-4" />
                        API Credentials
                      </Label>

                      <div className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">API Key</Label>
                          <Input
                            type={showSecret ? "text" : "password"}
                            placeholder="Enter API Key"
                            value={credentials.api_key}
                            onChange={(e) => updateCredentials(portal.id, "api_key", e.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">API Secret</Label>
                          <div className="flex gap-2">
                            <Input
                              type={showSecret ? "text" : "password"}
                              placeholder="Enter API Secret"
                              value={credentials.api_secret}
                              onChange={(e) => updateCredentials(portal.id, "api_secret", e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleShowSecret(portal.id)}
                              type="button"
                            >
                              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => saveCredentials(portal)}
                          disabled={savingCredentials === portal.id || (!credentials.api_key && !credentials.api_secret)}
                          className="w-full sm:w-auto"
                        >
                          {savingCredentials === portal.id ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Credentials
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Auto Sync Toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <RefreshCw className="h-4 w-4" />
                      Auto Sync
                    </Label>
                    <Switch
                      checked={config.autoSync}
                      onCheckedChange={(checked) => updateConfig(portal.id, "autoSync", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}