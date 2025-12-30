import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Check,
  X,
  Clock,
  Settings2,
  AlertTriangle,
  ExternalLink,
  History,
  Zap,
  Shield,
  Globe,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { IntegrationsPageSkeleton } from "@/components/ui/page-skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/ui/empty-state";
import { Link2 } from "lucide-react";
import { usePortalAccounts, type PortalWithAccount } from "@/hooks/usePortalAccounts";
import { PortalConnectDialog } from "@/components/integrations/PortalConnectDialog";
import { formatDistanceToNow } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.3
};

// Portal emoji mapping
const portalEmojis: Record<string, string> = {
  "property finder": "🏠",
  "bayut": "🏡",
  "dubizzle": "📦",
  "saakin": "🌍",
  "website": "🌐",
  "wordpress": "🌐",
  "airbnb": "🏨",
  "booking": "🛏️",
  "qatar living": "🇶🇦",
  "default": "🔗",
};

const getPortalEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  for (const [key, emoji] of Object.entries(portalEmojis)) {
    if (lowerName.includes(key)) return emoji;
  }
  return portalEmojis.default;
};



export default function IntegrationsPage() {
  const { t } = useLocalization();
  const isMobile = useIsMobile();
  const { portals, isLoading, refetch, connectPortal, disconnectPortal, updatePortalSettings, syncPortal } = usePortalAccounts();
  const [selectedPortal, setSelectedPortal] = useState<PortalWithAccount | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncingPortals, setSyncingPortals] = useState<string[]>([]);

  const getStatusBadge = (status: PortalWithAccount["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
            <Check className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3 mr-1" />{t('error')}</Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
            <X className="h-3 w-3 mr-1" />
            Not Connected
          </Badge>
        );
    }
  };

  const getIntegrationTypeBadge = (type: PortalWithAccount["integration_type"]) => {
    const labels: Record<PortalWithAccount["integration_type"], string> = {
      api_key: "API Key",
      api_key_secret: "API Key + Secret",
      oauth2: "OAuth 2.0",
      webhook: "Webhook",
      credentials: "Username/Password",
    };
    return (
      <Badge variant="secondary" className="text-xs">
        {labels[type]}
      </Badge>
    );
  };

  const connectedCount = portals.filter((p) => p.connected).length;
  const totalListings = portals.reduce((sum, p) => sum + p.listings_count, 0);
  const autoSyncCount = portals.filter((p) => p.connected && p.auto_publish).length;
  const errorCount = portals.filter((p) => p.status === "error").length;

  const handleOpenModal = (portal: PortalWithAccount) => {
    setSelectedPortal(portal);
    setIsModalOpen(true);
  };

  const handleSavePortal = async (
    credentials: Record<string, string>,
    settings: { autoPublish: boolean; syncSchedule: "realtime" | "hourly" | "daily" }
  ) => {
    if (!selectedPortal) return;

    try {
      await connectPortal(selectedPortal.id, credentials, settings);
      setIsModalOpen(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleDisconnect = async () => {
    if (!selectedPortal) return;

    try {
      await disconnectPortal(selectedPortal.id);
      setIsModalOpen(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleSyncNow = async (portalId: string) => {
    const portal = portals.find(p => p.id === portalId);
    if (!portal?.connected) {
      toast.error(t('portal_not_connected') || "Portal not connected");
      return;
    }

    setSyncingPortals((prev) => [...prev, portalId]);

    try {
      await syncPortal(portalId);
    } finally {
      if (document.body.contains(document.getElementById('root'))) {
        setSyncingPortals((prev) => prev.filter((id) => id !== portalId));
      }
    }
  };

  const handleToggleAutoSync = async (portalId: string, enabled: boolean) => {
    try {
      await updatePortalSettings(portalId, { autoPublish: enabled });
      toast.success(enabled ? "Auto-sync enabled" : "Auto-sync disabled");
    } catch {
      // Error handled in hook
    }
  };

  if (isLoading) {
    return <IntegrationsPageSkeleton isMobile={isMobile} />;
  }

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portal Integrations</h1>
          <p className="text-muted-foreground">Connect and manage your property portal accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />{t('refresh')}</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connectedCount}</p>
                <p className="text-xs text-muted-foreground">Connected Portals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalListings}</p>
                <p className="text-xs text-muted-foreground">Published Listings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <RefreshCw className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{autoSyncCount}</p>
                <p className="text-xs text-muted-foreground">Auto-Sync Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{errorCount}</p>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Cards */}
      {portals.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Link2}
              title="No portals available"
              description="Property portal integrations will appear here. Contact your administrator to add portals."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {portals.map((portal) => (
            <Card key={portal.id} className={cn(
              "shadow-card transition-all hover:shadow-lg",
              portal.status === "error" && "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/30"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {portal.logo_url ? (
                      <img src={portal.logo_url} alt={portal.name} className="w-10 h-10 rounded-lg object-contain" />
                    ) : (
                      <div className="text-4xl">{getPortalEmoji(portal.name)}</div>
                    )}
                    <div>
                      <CardTitle className="text-base">{portal.display_name || portal.name}</CardTitle>
                      {getStatusBadge(portal.status)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {portal.country && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {portal.country}
                  </p>
                )}

                {/* Integration Type */}
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {getIntegrationTypeBadge(portal.integration_type)}
                </div>

                {portal.connected && (
                  <>
                    {/* Error Message */}
                    {portal.status === "error" && portal.last_error_message && (
                      <div className="flex items-start gap-2 p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-amber-700 dark:text-amber-300">
                          {portal.last_error_message}
                        </p>
                      </div>
                    )}

                    {/* Auto-sync toggle */}
                    <div className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Auto-sync</span>
                      </div>
                      <Switch
                        checked={portal.auto_publish}
                        onCheckedChange={(checked) => handleToggleAutoSync(portal.id, checked)}
                      />
                    </div>

                    {/* Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Listings</span>
                        <span className="font-medium">{portal.listings_count}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last sync
                        </span>
                        <span className="text-muted-foreground">
                          {portal.last_sync_at
                            ? formatDistanceToNow(new Date(portal.last_sync_at), { addSuffix: true })
                            : "Never"
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Sync Schedule</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {portal.sync_schedule}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSyncNow(portal.id)}
                          disabled={syncingPortals.includes(portal.id)}
                        >
                          <RefreshCw className={cn(
                            "h-4 w-4 mr-2",
                            syncingPortals.includes(portal.id) && "animate-spin"
                          )} />
                          {syncingPortals.includes(portal.id) ? "Syncing..." : "Sync Now"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(portal)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground">
                          <History className="h-4 w-4 mr-2" />
                          View Logs
                        </Button>
                        {portal.base_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => window.open(`https://${portal.base_url}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {!portal.connected && (
                  <Button className="w-full" onClick={() => handleOpenModal(portal)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect {portal.display_name || portal.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connection Modal */}
      <PortalConnectDialog
        portal={selectedPortal}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSavePortal}
        onDisconnect={handleDisconnect}
      />
    </motion.div>
  );
}
