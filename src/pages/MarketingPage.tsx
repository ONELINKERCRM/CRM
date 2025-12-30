import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Megaphone,
  Mail,
  MessageSquare,
  Smartphone,
  Layers,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  Send,
  Users,
  TrendingUp,
  MoreHorizontal,
  FileText,
  Sparkles,
  Eye,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignCard, Campaign } from "@/components/marketing/CampaignCard";
import { CreateCampaignDialog } from "@/components/marketing/CreateCampaignDialog";
import { CampaignDetailsDialog } from "@/components/marketing/CampaignDetailsDialog";
import { EmailTemplateBuilder } from "@/components/marketing/email-builder/EmailTemplateBuilder";
import { EmailTemplate } from "@/components/marketing/email-builder/types";
import { MarketingPageSkeleton } from "@/components/ui/page-skeletons";
import { useIsMobile } from "@/hooks/use-mobile";

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

// Mock campaigns
const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Spring Property Launch 2024",
    type: "email",
    status: "active",
    targetAudience: "Hot Leads",
    leadsCount: 1250,
    startDate: "2024-01-15",
    endDate: "2024-02-15",
    stats: { sent: 1250, delivered: 1180, opened: 456, clicked: 89, failed: 70 },
  },
  {
    id: "2",
    name: "Weekend Open House Reminder",
    type: "whatsapp",
    status: "scheduled",
    targetAudience: "Meeting Scheduled",
    leadsCount: 85,
    startDate: "2024-01-20",
    stats: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
  },
  {
    id: "3",
    name: "Price Drop Alert - Palm Jumeirah",
    type: "sms",
    status: "completed",
    targetAudience: "Property Finder Leads",
    leadsCount: 340,
    startDate: "2024-01-10",
    endDate: "2024-01-12",
    stats: { sent: 340, delivered: 332, opened: 298, clicked: 45, failed: 8 },
  },
  {
    id: "4",
    name: "New Year Exclusive Offers",
    type: "multi-channel",
    status: "paused",
    targetAudience: "All Leads",
    leadsCount: 2500,
    startDate: "2024-01-01",
    stats: { sent: 1500, delivered: 1420, opened: 650, clicked: 120, failed: 80 },
  },
  {
    id: "5",
    name: "Property Valuation Service",
    type: "email",
    status: "draft",
    targetAudience: "Cold Leads",
    leadsCount: 0,
    startDate: "2024-01-25",
  },
];

// Mock templates
const mockTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Welcome New Lead",
    subject: "Welcome to Our Real Estate Services!",
    category: "welcome",
    blocks: [
      { id: "b1", type: "header", content: { text: "Welcome!", fontSize: "24px", color: "#1a1a1a", alignment: "center", logoUrl: "" } },
      { id: "b2", type: "text", content: { text: "Thank you for your interest in our properties.", fontSize: "16px", color: "#333333", alignment: "left" } },
      { id: "b3", type: "button", content: { text: "Browse Properties", url: "#", backgroundColor: "#3b82f6", textColor: "#ffffff", alignment: "center", borderRadius: "6px" } },
    ],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Property Price Drop",
    subject: "Price Drop Alert: Properties You'll Love",
    category: "promotional",
    blocks: [
      { id: "b1", type: "header", content: { text: "Price Drop Alert!", fontSize: "28px", color: "#dc2626", alignment: "center", logoUrl: "" } },
      { id: "b2", type: "image", content: { src: "https://placehold.co/600x300/e2e8f0/64748b?text=Property", alt: "Property", width: "100%", alignment: "center", link: "" } },
    ],
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-12"),
  },
  {
    id: "3",
    name: "Monthly Newsletter",
    subject: "Your Monthly Real Estate Update",
    category: "newsletter",
    blocks: [
      { id: "b1", type: "header", content: { text: "Monthly Newsletter", fontSize: "24px", color: "#1a1a1a", alignment: "center", logoUrl: "" } },
      { id: "b2", type: "divider", content: { color: "#e2e8f0", thickness: "1px", style: "solid", margin: "20px" } },
    ],
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-18"),
  },
];

const segments = ["All Leads", "Hot Leads", "Cold Leads", "New Leads", "Property Finder Leads", "Meeting Scheduled"];

export default function MarketingPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockTemplates);
  const [activeTab, setActiveTab] = useState<"campaigns" | "templates">("campaigns");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Simulate initial data loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    totalSent: campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0),
    avgOpenRate: campaigns.length > 0
      ? Math.round(campaigns.reduce((sum, c) => {
          if (c.stats && c.stats.sent > 0) {
            return sum + (c.stats.opened / c.stats.sent) * 100;
          }
          return sum;
        }, 0) / campaigns.filter(c => c.stats && c.stats.sent > 0).length) || 0
      : 0,
  };

  // Campaign handlers
  const handleViewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDetailsDialogOpen(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setCreateDialogOpen(true);
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    const duplicated: Campaign = {
      ...campaign,
      id: Date.now().toString(),
      name: `${campaign.name} (Copy)`,
      status: "draft",
      stats: undefined,
    };
    setCampaigns([duplicated, ...campaigns]);
    toast({ title: "Campaign duplicated" });
  };

  const handleToggleStatus = (campaign: Campaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    setCampaigns(campaigns.map((c) =>
      c.id === campaign.id ? { ...c, status: newStatus } : c
    ));
    toast({ title: `Campaign ${newStatus}` });
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    setCampaigns(campaigns.filter((c) => c.id !== campaign.id));
    toast({ title: "Campaign deleted", variant: "destructive" });
  };

  const handleSaveCampaign = (campaignData: Partial<Campaign>) => {
    if (editingCampaign) {
      setCampaigns(campaigns.map((c) =>
        c.id === editingCampaign.id ? { ...c, ...campaignData } : c
      ));
      toast({ title: "Campaign updated" });
    } else {
      const newCampaign: Campaign = {
        id: Date.now().toString(),
        name: campaignData.name || "Untitled Campaign",
        type: campaignData.type || "email",
        status: campaignData.status || "draft",
        targetAudience: campaignData.targetAudience || "All Leads",
        leadsCount: campaignData.leadsCount || 0,
        startDate: campaignData.startDate || new Date().toISOString(),
      };
      setCampaigns([newCampaign, ...campaigns]);
      toast({ title: "Campaign created" });
    }
    setEditingCampaign(null);
  };

  // Template handlers
  const handleSaveTemplate = (templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTemplate) {
      setTemplates(templates.map(t =>
        t.id === editingTemplate.id
          ? { ...t, ...templateData, updatedAt: new Date() }
          : t
      ));
      toast({ title: "Template updated" });
    } else {
      const newTemplate: EmailTemplate = {
        id: Date.now().toString(),
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setTemplates([newTemplate, ...templates]);
      toast({ title: "Template created" });
    }
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateBuilderOpen(true);
  };

  const handleDuplicateTemplate = (template: EmailTemplate) => {
    const duplicated: EmailTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTemplates([duplicated, ...templates]);
    toast({ title: "Template duplicated" });
  };

  const handleDeleteTemplate = (template: EmailTemplate) => {
    setTemplates(templates.filter(t => t.id !== template.id));
    toast({ title: "Template deleted", variant: "destructive" });
  };

  const getCategoryBadge = (category: EmailTemplate['category']) => {
    const styles = {
      promotional: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      newsletter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      transactional: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      welcome: "bg-green-500/10 text-green-600 border-green-500/20",
    };
    return styles[category] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return <MarketingPageSkeleton isMobile={isMobile} />;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marketing Hub</h1>
            <p className="text-sm text-muted-foreground">Manage campaigns and templates</p>
          </div>
        </div>
        <Button onClick={() => activeTab === "campaigns" ? setCreateDialogOpen(true) : (setEditingTemplate(null), setTemplateBuilderOpen(true))}>
          <Plus className="h-4 w-4 mr-2" />
          {activeTab === "campaigns" ? "New Campaign" : "New Template"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalSent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Messages Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.avgOpenRate}%</p>
                <p className="text-xs text-muted-foreground">Avg Open Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search campaigns..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="multi-channel">Multi-channel</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                      <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results count */}
              <p className="text-sm text-muted-foreground">
                Showing {filteredCampaigns.length} of {campaigns.length} campaigns
              </p>

              {/* Campaigns Grid/List */}
              <div className={cn(
                viewMode === "grid"
                  ? "grid md:grid-cols-2 gap-4"
                  : "space-y-3"
              )}>
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onView={handleViewCampaign}
                    onEdit={handleEditCampaign}
                    onDuplicate={handleDuplicateCampaign}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDeleteCampaign}
                  />
                ))}
              </div>

              {filteredCampaigns.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No campaigns found</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {search ? "Try a different search" : "Create your first campaign"}
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Campaign
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* AI Suggestions Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-background rounded-lg border">
                    <h4 className="font-medium text-sm mb-1">Follow-up Hot Leads</h4>
                    <p className="text-xs text-muted-foreground mb-2">23 leads haven't been contacted in 7 days</p>
                    <Button size="sm" variant="outline" className="w-full">Create Campaign</Button>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <h4 className="font-medium text-sm mb-1">Best Send Time</h4>
                    <p className="text-xs text-muted-foreground mb-2">Tue-Thu, 10am-2pm gets 26% higher opens</p>
                    <Button size="sm" variant="outline" className="w-full">Schedule Now</Button>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <h4 className="font-medium text-sm mb-1">New Listing Alert</h4>
                    <p className="text-xs text-muted-foreground mb-2">45 leads match your new listings criteria</p>
                    <Button size="sm" variant="outline" className="w-full">Send Alert</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {templates.length} email templates
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="group hover:shadow-lg transition-all hover:border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <Badge variant="outline" className={cn("text-xs capitalize", getCategoryBadge(template.category))}>
                            {template.category}
                          </Badge>
                        </div>
                        <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {template.subject}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{template.blocks.length} blocks</span>
                      <span>Updated {template.updatedAt.toLocaleDateString()}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="h-3 w-3 mr-2" /> Edit Template
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Add New Template Card */}
              <Card
                className="border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center min-h-[200px]"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateBuilderOpen(true);
                }}
              >
                <div className="text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Create New Template</p>
                  <p className="text-sm text-muted-foreground mt-1">Drag & drop builder</p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

      </Tabs>

      {/* Dialogs */}
      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingCampaign(null);
        }}
        campaign={editingCampaign}
        onSave={handleSaveCampaign}
      />

      <CampaignDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        campaign={selectedCampaign}
      />

      <EmailTemplateBuilder
        open={templateBuilderOpen}
        onOpenChange={(open) => {
          setTemplateBuilderOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />
    </motion.div>
  );
}
