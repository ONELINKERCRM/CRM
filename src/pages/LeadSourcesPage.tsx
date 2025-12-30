import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Link2,
  RefreshCw,
  ExternalLink,
  Loader2,
  Zap,
  Globe,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LeadSourcesPageSkeleton } from "@/components/ui/page-skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/ui/empty-state";
import { useLeadSources, LeadSource } from "@/hooks/useLeadSources";

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

// Only 8 specific lead sources with original logos
const SOURCE_DISPLAY_CONFIG: Record<string, { name: string; icon: string; color: string; logo?: string }> = {
  meta: {
    name: "Meta (Facebook / Instagram)",
    icon: "📘",
    color: "#1877F2",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/800px-Meta_Platforms_Inc._logo.svg.png"
  },
  tiktok: {
    name: "TikTok",
    icon: "🎵",
    color: "#000000",
    logo: "https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png"
  },
  linkedin: {
    name: "LinkedIn",
    icon: "💼",
    color: "#0A66C2",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
  },
  website: {
    name: "Website Forms",
    icon: "🌐",
    color: "#6366F1"
  },
  property_finder: {
    name: "Property Finder",
    icon: "🏠",
    color: "#E52B50"
  },
  bayut: {
    name: "Bayut",
    icon: "🏢",
    color: "#00A651"
  },
  dubizzle: {
    name: "Dubizzle",
    icon: "🔴",
    color: "#E53935"
  },
  google_sheets: {
    name: "Google Sheets",
    icon: "📊",
    color: "#34A853",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg"
  },
};

// OAuth sources - use OAuth flow
const OAUTH_SOURCES = ['meta', 'tiktok', 'linkedin', 'google_sheets'];

// API key sources - use credential inputs
const CONNECTION_FIELDS: Record<string, { key: string; label: string; placeholder: string; type: string }[]> = {
  meta: [], // OAuth - no manual fields
  tiktok: [], // OAuth - no manual fields (credentials configured by developer)
  linkedin: [], // OAuth - no manual fields
  google_sheets: [], // OAuth - no manual fields
  website: [], // Webhook only
  property_finder: [
    { key: "api_key", label: "API Key", placeholder: "Your Property Finder API key", type: "password" },
    { key: "partner_id", label: "Partner ID", placeholder: "Your Partner ID", type: "text" },
  ],
  bayut: [
    { key: "api_key", label: "API Key", placeholder: "Your Bayut API key", type: "password" },
    { key: "agency_id", label: "Agency ID", placeholder: "Your Agency ID", type: "text" },
  ],
  dubizzle: [
    { key: "api_key", label: "API Key", placeholder: "Your Dubizzle API key", type: "password" },
    { key: "agency_id", label: "Agency ID", placeholder: "Your Agency ID", type: "text" },
  ],
};

// OAuth configuration for each provider
const OAUTH_CONFIG: Record<string, { buttonText: string; buttonColor: string; icon: string }> = {
  meta: { buttonText: "Sign in with Facebook", buttonColor: "#1877F2", icon: "📘" },
  tiktok: { buttonText: "Sign in with TikTok", buttonColor: "#000000", icon: "🎵" },
  linkedin: { buttonText: "Sign in with LinkedIn", buttonColor: "#0A66C2", icon: "💼" },
  google_sheets: { buttonText: "Sign in with Google", buttonColor: "#4285F4", icon: "📊" },
};

export default function LeadSourcesPage() {
  const isMobile = useIsMobile();
  const {
    sources,
    isLoading,
    error,
    connectSource,
    disconnectSource,
    testConnection,
    fetchLeads,
    getMetaForms,
    getTikTokForms,
    getWebhookUrl,
    createWebhook,
    markWebsiteConnected
  } = useLeadSources();

  const [search, setSearch] = useState("");
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<LeadSource | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionFields, setConnectionFields] = useState<Record<string, string>>({});
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  // Meta forms dialog state
  const [showMetaFormsDialog, setShowMetaFormsDialog] = useState(false);
  const [metaFormsSource, setMetaFormsSource] = useState<LeadSource | null>(null);
  const [metaPages, setMetaPages] = useState<Array<{ id: string; name: string; access_token?: string }>>([]);
  const [metaForms, setMetaForms] = useState<Array<{ id: string; name: string; page_name: string; leads_count: number; status: string }>>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [selectAllForms, setSelectAllForms] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loadingForms, setLoadingForms] = useState(false);
  const [importing, setImporting] = useState(false);

  // TikTok forms dialog state
  const [showTikTokFormsDialog, setShowTikTokFormsDialog] = useState(false);
  const [tikTokFormsSource, setTikTokFormsSource] = useState<LeadSource | null>(null);
  const [tikTokForms, setTikTokForms] = useState<Array<{ id: string; name: string; status: string; leads_count: number }>>([]);
  const [selectedTikTokFormIds, setSelectedTikTokFormIds] = useState<Set<string>>(new Set());
  const [selectAllTikTokForms, setSelectAllTikTokForms] = useState(true);
  const [tikTokDateFrom, setTikTokDateFrom] = useState("");
  const [tikTokDateTo, setTikTokDateTo] = useState("");
  const [loadingTikTokForms, setLoadingTikTokForms] = useState(false);
  const [importingTikTok, setImportingTikTok] = useState(false);

  // Handle OAuth callback from redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const errorParam = urlParams.get('error');
    const source = urlParams.get('source');

    if (success === 'true' && source) {
      toast.success(`Successfully connected to ${SOURCE_DISPLAY_CONFIG[source]?.name || source}!`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorParam) {
      toast.error(`Connection failed: ${decodeURIComponent(errorParam)}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Filter sources to only show the 8 specific ones
  const displaySources = sources.filter(s => SOURCE_DISPLAY_CONFIG[s.source_name]);

  const filteredSources = displaySources.filter(source => {
    const config = SOURCE_DISPLAY_CONFIG[source.source_name];
    return config?.name.toLowerCase().includes(search.toLowerCase());
  });

  const connectedSources = displaySources.filter(s => s.status === "connected");
  const totalLeads = connectedSources.reduce((sum, s) => sum + (s.total_leads_fetched || 0), 0);

  // Show error state only for actual errors
  if (error) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="p-4 md:p-6 space-y-6"
      >
        <Card className="border-destructive">
          <CardContent className="p-8">
            <EmptyState
              icon={<AlertCircle className="h-12 w-12 text-destructive" />}
              title="Failed to Load"
              description={error}
              action={
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              }
            />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (isLoading) {
    return <LeadSourcesPageSkeleton isMobile={isMobile} />;
  }

  const handleConnect = (source: LeadSource) => {
    setSelectedSource(source);
    setConnectionFields({});

    if (source.source_name === "website") {
      // For website, show webhook URL directly
      const url = getWebhookUrl(source.id);
      if (!url) {
        createWebhook(source.id).then(() => {
          setWebhookUrl(getWebhookUrl(source.id));
        });
      } else {
        setWebhookUrl(url);
      }
      setShowWebhookDialog(true);
    } else {
      setConnectDialogOpen(true);
    }
  };

  const handleOAuthConnect = async (source: LeadSource) => {
    setConnecting(true);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const redirectUri = `${window.location.origin}/lead-sources`;

    try {
      if (source.source_name === 'meta') {
        // Call Meta OAuth edge function to get auth URL
        const response = await fetch(
          `${supabaseUrl}/functions/v1/meta-oauth?action=init&source_id=${source.id}&company_id=${source.company_id}&redirect_uri=${encodeURIComponent(redirectUri)}`
        );

        const data = await response.json();

        if (data.authUrl) {
          // Redirect to Meta OAuth
          window.location.href = data.authUrl;
          return;
        } else if (data.error) {
          toast.error(data.error);
        }
      } else if (source.source_name === 'tiktok') {
        // Call TikTok integration edge function to get auth URL
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(
          `${supabaseUrl}/functions/v1/tiktok-integration?action=authorize`,
          {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();

        if (data.auth_url) {
          // Redirect to TikTok OAuth
          window.location.href = data.auth_url;
          return;
        } else if (data.error) {
          toast.error(data.error || data.message || 'TikTok integration not configured. Please contact your administrator.');
        }
      } else {
        // For other OAuth sources (LinkedIn, Google Sheets) - show instructions
        toast.info(`OAuth for ${SOURCE_DISPLAY_CONFIG[source.source_name]?.name} requires additional setup. Please contact support.`, {
          duration: 5000
        });
      }
    } catch (error) {
      console.error('OAuth init error:', error);
      toast.error('Failed to initialize OAuth connection');
    }

    setConnecting(false);
    setConnectDialogOpen(false);
  };

  const handleConfirmConnect = async () => {
    if (!selectedSource) return;

    // For OAuth sources (Meta, TikTok, LinkedIn, Google Sheets), use OAuth flow directly
    if (OAUTH_SOURCES.includes(selectedSource.source_name)) {
      await handleOAuthConnect(selectedSource);
      return;
    }

    setConnecting(true);

    const result = await connectSource(selectedSource.id, connectionFields);

    setConnecting(false);
    if (result.success) {
      setConnectDialogOpen(false);
      setSelectedSource(null);
      setConnectionFields({});
    }
  };

  const handleTestConnection = async (source: LeadSource) => {
    setTesting(source.id);
    const result = await testConnection(source.id);
    setTesting(null);

    if (result.success) {
      toast.success(result.message || "Connection test successful");
    } else {
      toast.error(result.error || "Connection test failed");
    }
  };

  const handleSync = async (source: LeadSource) => {
    setSyncing(source.id);
    await fetchLeads(source.id);
    setSyncing(null);
  };

  const handleDisconnect = async (source: LeadSource) => {
    await disconnectSource(source.id);
  };

  const handleShowMetaForms = async (source: LeadSource) => {
    setMetaFormsSource(source);
    const pages = source.connection_details?.pages || [];
    setMetaPages(pages);
    setMetaForms([]);
    setSelectedFormIds(new Set());
    setSelectAllForms(true);
    setDateFrom("");
    setDateTo("");
    setShowMetaFormsDialog(true);

    // Fetch forms
    setLoadingForms(true);
    try {
      const forms = await getMetaForms(source.id);
      setMetaForms(forms);
      // Select all forms by default
      setSelectedFormIds(new Set(forms.map((f: any) => f.id)));
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
    setLoadingForms(false);
  };

  const handleImportMetaLeads = async () => {
    if (!metaFormsSource) return;
    setImporting(true);

    // Prepare filters
    const formIds = selectAllForms ? undefined : Array.from(selectedFormIds);

    await fetchLeads(metaFormsSource.id, {
      form_ids: formIds,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined
    });

    setImporting(false);
    setShowMetaFormsDialog(false);
    toast.success("Leads imported successfully!");
  };

  // TikTok Forms Handlers
  const handleShowTikTokForms = async (source: LeadSource) => {
    setTikTokFormsSource(source);
    setTikTokForms([]);
    setSelectedTikTokFormIds(new Set());
    setSelectAllTikTokForms(true);
    setTikTokDateFrom("");
    setTikTokDateTo("");
    setShowTikTokFormsDialog(true);

    // Fetch forms
    setLoadingTikTokForms(true);
    try {
      const forms = await getTikTokForms();
      setTikTokForms(forms);
      // Select all forms by default
      setSelectedTikTokFormIds(new Set(forms.map((f: any) => f.id)));
    } catch (error) {
      console.error('Error fetching TikTok forms:', error);
    }
    setLoadingTikTokForms(false);
  };

  const handleImportTikTokLeads = async () => {
    if (!tikTokFormsSource) return;
    setImportingTikTok(true);

    const formIds = selectAllTikTokForms ? undefined : Array.from(selectedTikTokFormIds);

    await fetchLeads(tikTokFormsSource.id, {
      form_ids: formIds,
      date_from: tikTokDateFrom || undefined,
      date_to: tikTokDateTo || undefined
    });

    setImportingTikTok(false);
    setShowTikTokFormsDialog(false);
    toast.success("TikTok leads imported successfully!");
  };

  const handleTikTokFormToggle = (formId: string) => {
    setSelectedTikTokFormIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(formId)) {
        newSet.delete(formId);
      } else {
        newSet.add(formId);
      }
      setSelectAllTikTokForms(newSet.size === tikTokForms.length);
      return newSet;
    });
  };

  const handleSelectAllTikTokForms = (checked: boolean) => {
    setSelectAllTikTokForms(checked);
    if (checked) {
      setSelectedTikTokFormIds(new Set(tikTokForms.map(f => f.id)));
    } else {
      setSelectedTikTokFormIds(new Set());
    }
  };

  const handleFormToggle = (formId: string) => {
    setSelectedFormIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(formId)) {
        newSet.delete(formId);
      } else {
        newSet.add(formId);
      }
      setSelectAllForms(newSet.size === metaForms.length);
      return newSet;
    });
  };

  const handleSelectAllForms = (checked: boolean) => {
    setSelectAllForms(checked);
    if (checked) {
      setSelectedFormIds(new Set(metaForms.map(f => f.id)));
    } else {
      setSelectedFormIds(new Set());
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500/10 text-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-500/10 text-red-600 gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Not Connected
          </Badge>
        );
    }
  };

  const getSourceDisplay = (source: LeadSource) => {
    return SOURCE_DISPLAY_CONFIG[source.source_name] || {
      name: source.display_name,
      icon: "📋",
      color: "#6B7280"
    };
  };

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Sources</h1>
          <p className="text-muted-foreground">Connect and manage your lead sources</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connectedSources.length}</p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLeads}</p>
                <p className="text-sm text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{displaySources.filter(s => s.status === "error").length}</p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredSources.map((source) => {
          const display = getSourceDisplay(source);
          return (
            <Card
              key={source.id}
              className={cn(
                "transition-all hover:shadow-md",
                source.status === "error" && "border-red-500/50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl overflow-hidden"
                      style={{ backgroundColor: `${display.color}15` }}
                    >
                      {display.logo ? (
                        <img
                          src={display.logo}
                          alt={display.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = display.icon;
                          }}
                        />
                      ) : (
                        display.icon
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{display.name}</h3>
                      {getStatusBadge(source.status)}
                    </div>
                  </div>
                </div>

                {source.status === "connected" && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>{source.total_leads_fetched || 0} leads</span>
                    {source.last_fetched_at && (
                      <span>Last sync: {new Date(source.last_fetched_at).toLocaleDateString()}</span>
                    )}
                  </div>
                )}

                {source.status === "error" && source.last_error && (
                  <p className="text-xs text-red-600 mb-4 truncate" title={source.last_error}>
                    {source.last_error}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {source.status === "connected" ? (
                    <>
                      {/* Show Import Leads for Meta */}
                      {source.source_name === 'meta' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleShowMetaForms(source)}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Import Leads
                        </Button>
                      )}
                      {/* Show Import Leads for TikTok */}
                      {source.source_name === 'tiktok' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleShowTikTokForms(source)}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Import Leads
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className={(source.source_name === 'meta' || source.source_name === 'tiktok') ? "" : "flex-1"}
                        onClick={() => handleSync(source)}
                        disabled={syncing === source.id}
                      >
                        {syncing === source.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Sync
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(source)}
                        disabled={testing === source.id}
                      >
                        {testing === source.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Test"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDisconnect(source)}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : source.status === "error" ? (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleConnect(source)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleConnect(source)}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSources.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Globe}
              title="No sources found"
              description={search ? "No sources match your search criteria." : "Connect your first lead source to start receiving leads automatically."}
            />
          </CardContent>
        </Card>
      )}

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedSource && (
                <>
                  <span className="text-2xl">{getSourceDisplay(selectedSource).icon}</span>
                  Connect to {getSourceDisplay(selectedSource).name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedSource && OAUTH_SOURCES.includes(selectedSource.source_name)
                ? "Click the button below to securely connect your account via OAuth."
                : "Enter your credentials to connect this lead source."}
            </DialogDescription>
          </DialogHeader>

          {selectedSource && (
            <div className="space-y-4 py-4">
              {/* OAuth Sources - Show OAuth Button Only */}
              {OAUTH_SOURCES.includes(selectedSource.source_name) ? (
                <div className="space-y-4">
                  <Button
                    className="w-full h-12 text-white font-medium"
                    style={{ backgroundColor: OAUTH_CONFIG[selectedSource.source_name]?.buttonColor }}
                    onClick={handleConfirmConnect}
                    disabled={connecting}
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <span className="mr-2 text-lg">{OAUTH_CONFIG[selectedSource.source_name]?.icon}</span>
                        {OAUTH_CONFIG[selectedSource.source_name]?.buttonText}
                      </>
                    )}
                  </Button>

                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm font-medium">We will request access to:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Read lead form submissions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Access contact information
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Sync leads automatically
                      </li>
                    </ul>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    You'll be redirected to {getSourceDisplay(selectedSource).name} to authorize access
                  </p>
                </div>
              ) : (
                /* API Key Sources - Show Form Fields */
                <>
                  {CONNECTION_FIELDS[selectedSource.source_name]?.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={field.key}
                          placeholder={field.placeholder}
                          value={connectionFields[field.key] || ""}
                          onChange={(e) => setConnectionFields(prev => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))}
                          rows={4}
                        />
                      ) : (
                        <div className="relative">
                          <Input
                            id={field.key}
                            type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                            placeholder={field.placeholder}
                            value={connectionFields[field.key] || ""}
                            onChange={(e) => setConnectionFields(prev => ({
                              ...prev,
                              [field.key]: e.target.value
                            }))}
                          />
                          {field.type === "password" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                              onClick={() => setShowPasswords(prev => ({
                                ...prev,
                                [field.key]: !prev[field.key]
                              }))}
                            >
                              {showPasswords[field.key] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm font-medium">We will request access to:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Read lead form submissions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Access contact information
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Sync leads automatically
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Only show footer buttons for non-OAuth, non-TikTok sources */}
          {selectedSource && !OAUTH_SOURCES.includes(selectedSource.source_name) && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmConnect} disabled={connecting}>
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Webhook URL Dialog for Website */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">🌐</span>
              Website Lead Capture
            </DialogTitle>
            <DialogDescription>
              Capture leads from any website in 2 minutes. Just copy & paste!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Simple Steps */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg bg-primary/10">
                <div className="text-2xl mb-1">1️⃣</div>
                <p className="text-xs font-medium">Copy Code</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <div className="text-2xl mb-1">2️⃣</div>
                <p className="text-xs font-medium">Paste in Site</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <div className="text-2xl mb-1">3️⃣</div>
                <p className="text-xs font-medium">Get Leads!</p>
              </div>
            </div>

            {/* Copy-paste ready code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Add this to your website</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-form-submit?company_id=${selectedSource?.company_id}`;
                    const script = `<script src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-form-submit?embed=true" data-endpoint="${endpoint}"></script>`;
                    navigator.clipboard.writeText(script);
                    toast.success("Code copied! Paste it before </body> tag");
                    if (selectedSource) {
                      await markWebsiteConnected(selectedSource.id);
                    }
                  }}
                  className="gap-1"
                >
                  <Copy className="h-3 w-3" />
                  Copy Code
                </Button>
              </div>
              <div className="p-3 rounded-lg bg-muted font-mono text-xs overflow-x-auto">
                <code className="text-primary break-all">
                  {`<script src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-form-submit?embed=true" data-endpoint="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-form-submit?company_id=${selectedSource?.company_id || 'YOUR_COMPANY_ID'}"></script>`}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this code before the {"</body>"} tag on your website. It will automatically capture all form submissions.
              </p>
            </div>

            {/* Alternative: Direct API */}
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Advanced: Direct API Integration
              </summary>
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label className="text-xs">API Endpoint (POST)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-form-submit?company_id=${selectedSource?.company_id || ''}`}
                      readOnly
                      className="font-mono text-xs h-8"
                    />
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-form-submit?company_id=${selectedSource?.company_id || ''}`);
                      toast.success("API endpoint copied!");
                    }} className="h-8 px-2">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Send POST request with JSON:</Label>
                  <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                    {`{
  "name": "Customer Name",
  "email": "email@example.com",
  "phone": "+971501234567"
}`}
                  </pre>
                </div>
              </div>
            </details>

            {/* Quick tips */}
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Works with any form!
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                HTML forms, WordPress, Webflow, React, or any website builder.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>
              Close
            </Button>
            <Button onClick={async () => {
              const endpoint = `https://zyqlwkkiyuqnhlvnuewk.supabase.co/functions/v1/website-form-submit?company_id=${selectedSource?.company_id}`;
              const script = `<script src="https://zyqlwkkiyuqnhlvnuewk.supabase.co/functions/v1/website-form-submit?embed=true" data-endpoint="${endpoint}"></script>`;
              navigator.clipboard.writeText(script);
              toast.success("Code copied to clipboard!");
              if (selectedSource) {
                await markWebsiteConnected(selectedSource.id);
              }
              setShowWebhookDialog(false);
            }}>
              <Copy className="h-4 w-4 mr-2" />
              Copy & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meta Forms/Import Dialog */}
      <Dialog open={showMetaFormsDialog} onOpenChange={setShowMetaFormsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">📘</span>
              Import Leads from Meta
            </DialogTitle>
            <DialogDescription>
              Select forms and date range to import leads from your connected Facebook/Instagram pages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Date Range (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Lead Forms Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Lead Forms</Label>
                {metaForms.length > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAllForms}
                      onChange={(e) => handleSelectAllForms(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Select All ({metaForms.length})
                  </label>
                )}
              </div>

              {loadingForms ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading forms...</span>
                </div>
              ) : metaForms.length > 0 ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto rounded-lg border p-2">
                  {metaForms.map((form) => (
                    <label
                      key={form.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedFormIds.has(form.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFormIds.has(form.id)}
                        onChange={() => handleFormToggle(form.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{form.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {form.page_name} • {form.leads_count || 0} leads
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          form.status === 'ACTIVE'
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {form.status || 'ACTIVE'}
                      </Badge>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-lg border border-dashed text-center">
                  <p className="text-sm text-muted-foreground">
                    {metaPages.length > 0
                      ? "No lead forms found on your connected pages."
                      : "No pages connected. Please connect your Facebook pages first."}
                  </p>
                </div>
              )}
            </div>

            {/* Connected Pages Summary */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Connected Pages:</span>
                <span className="font-medium">{metaPages.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Selected Forms:</span>
                <span className="font-medium">
                  {selectAllForms ? 'All' : selectedFormIds.size} of {metaForms.length}
                </span>
              </div>
              {metaFormsSource?.last_fetched_at && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Last Import:</span>
                  <span className="font-medium">
                    {new Date(metaFormsSource.last_fetched_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetaFormsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportMetaLeads}
              disabled={importing || (metaForms.length > 0 && selectedFormIds.size === 0)}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Import Leads
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TikTok Forms/Import Dialog */}
      <Dialog open={showTikTokFormsDialog} onOpenChange={setShowTikTokFormsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">🎵</span>
              Import Leads from TikTok
            </DialogTitle>
            <DialogDescription>
              Select forms and date range to import leads from your connected TikTok ads account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Date Range (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={tikTokDateFrom}
                    onChange={(e) => setTikTokDateFrom(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={tikTokDateTo}
                    onChange={(e) => setTikTokDateTo(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Lead Forms Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Instant Forms</Label>
                {tikTokForms.length > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAllTikTokForms}
                      onChange={(e) => handleSelectAllTikTokForms(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Select All ({tikTokForms.length})
                  </label>
                )}
              </div>

              {loadingTikTokForms ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading forms...</span>
                </div>
              ) : tikTokForms.length > 0 ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto rounded-lg border p-2">
                  {tikTokForms.map((form) => (
                    <label
                      key={form.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedTikTokFormIds.has(form.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTikTokFormIds.has(form.id)}
                        onChange={() => handleTikTokFormToggle(form.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{form.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {form.leads_count || 0} leads
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          form.status === 'ACTIVE'
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {form.status || 'ACTIVE'}
                      </Badge>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-lg border border-dashed text-center">
                  <p className="text-sm text-muted-foreground">
                    No instant forms found. Create lead generation forms in your TikTok Ads Manager.
                  </p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selected Forms:</span>
                <span className="font-medium">
                  {selectAllTikTokForms ? 'All' : selectedTikTokFormIds.size} of {tikTokForms.length}
                </span>
              </div>
              {tikTokFormsSource?.last_fetched_at && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Last Import:</span>
                  <span className="font-medium">
                    {new Date(tikTokFormsSource.last_fetched_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTikTokFormsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImportTikTokLeads}
              disabled={importingTikTok || (tikTokForms.length > 0 && selectedTikTokFormIds.size === 0)}
            >
              {importingTikTok ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Import Leads
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
