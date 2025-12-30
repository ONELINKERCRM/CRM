import { useState } from "react";
import {
  X,
  Plus,
  Check,
  Clock,
  AlertCircle,
  XCircle,
  Phone,
  Edit2,
  Trash2,
  Copy,
  Eye,
  FileText,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Image,
  Video,
  File,
  Link2,
  ExternalLink,
  RefreshCw,
  CloudDownload,
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WhatsAppTemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (template: WhatsAppTemplate) => void;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: "marketing" | "utility" | "authentication";
  language: string;
  status: "approved" | "pending" | "rejected";
  header?: {
    type: "text" | "image" | "video" | "document";
    content: string;
  };
  body: string;
  footer?: string;
  buttons?: {
    type: "quick_reply" | "url" | "phone";
    text: string;
    value?: string;
  }[];
  variables: string[];
  createdAt: string;
  lastUsed?: string;
}

const sampleTemplates: WhatsAppTemplate[] = [
  {
    id: "1",
    name: "property_inquiry_followup",
    category: "marketing",
    language: "English",
    status: "approved",
    header: { type: "text", content: "Property Update 🏠" },
    body: "Hi {{1}},\n\nThank you for your interest in {{2}}. I wanted to follow up and see if you have any questions about this property.\n\nThe asking price is {{3}} and it features {{4}}.\n\nWould you like to schedule a viewing?",
    footer: "Reply STOP to unsubscribe",
    buttons: [
      { type: "quick_reply", text: "Schedule Viewing" },
      { type: "quick_reply", text: "More Details" },
      { type: "phone", text: "Call Agent", value: "+971501234567" },
    ],
    variables: ["client_name", "property_name", "price", "features"],
    createdAt: "2024-01-15",
    lastUsed: "2024-01-20",
  },
  {
    id: "2",
    name: "new_listing_alert",
    category: "marketing",
    language: "English",
    status: "approved",
    header: { type: "image", content: "property_image.jpg" },
    body: "🔔 New Listing Alert!\n\nHi {{1}},\n\nA new property matching your preferences is now available:\n\n📍 {{2}}\n💰 {{3}}\n🛏️ {{4}} Bedrooms\n📐 {{5}} sqft\n\nDon't miss out!",
    footer: "Powered by Your CRM",
    buttons: [
      { type: "url", text: "View Listing", value: "https://example.com/listing" },
      { type: "quick_reply", text: "Not Interested" },
    ],
    variables: ["client_name", "location", "price", "bedrooms", "size"],
    createdAt: "2024-01-10",
    lastUsed: "2024-01-19",
  },
  {
    id: "3",
    name: "viewing_reminder",
    category: "utility",
    language: "English",
    status: "approved",
    body: "Hi {{1}},\n\nThis is a reminder for your property viewing tomorrow:\n\n📍 {{2}}\n📅 {{3}}\n⏰ {{4}}\n\nPlease confirm your attendance by replying YES or NO.",
    buttons: [
      { type: "quick_reply", text: "YES, I'll be there" },
      { type: "quick_reply", text: "NO, reschedule" },
    ],
    variables: ["client_name", "property_address", "date", "time"],
    createdAt: "2024-01-08",
  },
  {
    id: "4",
    name: "price_reduction_alert",
    category: "marketing",
    language: "English",
    status: "pending",
    header: { type: "text", content: "🔥 Price Drop Alert!" },
    body: "Great news {{1}}!\n\nThe property you viewed at {{2}} has been reduced from {{3}} to {{4}}.\n\nThis is a {{5}} discount! Act fast before it's gone.",
    footer: "Reply STOP to unsubscribe",
    buttons: [
      { type: "quick_reply", text: "I'm Interested!" },
      { type: "url", text: "View Property", value: "https://example.com" },
    ],
    variables: ["client_name", "property_address", "old_price", "new_price", "discount_percentage"],
    createdAt: "2024-01-18",
  },
  {
    id: "5",
    name: "document_request",
    category: "utility",
    language: "English",
    status: "rejected",
    body: "Hi {{1}},\n\nTo proceed with your property purchase, we require the following documents:\n\n{{2}}\n\nPlease upload them at your earliest convenience.",
    buttons: [
      { type: "url", text: "Upload Documents", value: "https://example.com/upload" },
    ],
    variables: ["client_name", "document_list"],
    createdAt: "2024-01-12",
  },
];

const categories = [
  { value: "marketing", label: "Marketing", description: "Promotional messages and offers" },
  { value: "utility", label: "Utility", description: "Transactional and service messages" },
  { value: "authentication", label: "Authentication", description: "OTP and verification codes" },
];

const headerTypes = [
  { value: "none", label: "None", icon: X },
  { value: "text", label: "Text", icon: FileText },
  { value: "image", label: "Image", icon: Image },
  { value: "video", label: "Video", icon: Video },
  { value: "document", label: "Document", icon: File },
];

const buttonTypes = [
  { value: "quick_reply", label: "Quick Reply", icon: MessageSquare },
  { value: "url", label: "URL", icon: Link2 },
  { value: "phone", label: "Phone", icon: Phone },
];

export function WhatsAppTemplateManager({
  open,
  onOpenChange,
  onSelectTemplate,
}: WhatsAppTemplateManagerProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "create">("templates");
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(sampleTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Create form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "marketing" as WhatsAppTemplate["category"],
    language: "English",
    headerType: "none",
    headerContent: "",
    body: "",
    footer: "",
    buttons: [] as WhatsAppTemplate["buttons"],
  });

  const getStatusBadge = (status: WhatsAppTemplate["status"]) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
    }
  };

  const getCategoryBadge = (category: WhatsAppTemplate["category"]) => {
    switch (category) {
      case "marketing":
        return <Badge variant="outline" className="text-primary border-primary">Marketing</Badge>;
      case "utility":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Utility</Badge>;
      case "authentication":
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Authentication</Badge>;
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\d+)\}\}/g);
    return matches ? matches.map((m, i) => `variable_${i + 1}`) : [];
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.body) {
      toast.error("Please fill in required fields");
      return;
    }

    const template: WhatsAppTemplate = {
      id: crypto.randomUUID(),
      name: newTemplate.name.toLowerCase().replace(/\s+/g, "_"),
      category: newTemplate.category,
      language: newTemplate.language,
      status: "pending",
      header: newTemplate.headerType !== "none" ? {
        type: newTemplate.headerType as any,
        content: newTemplate.headerContent,
      } : undefined,
      body: newTemplate.body,
      footer: newTemplate.footer || undefined,
      buttons: newTemplate.buttons,
      variables: extractVariables(newTemplate.body),
      createdAt: new Date().toISOString().split("T")[0],
    };

    setTemplates([template, ...templates]);
    toast.success("Template submitted for approval");
    setActiveTab("templates");
    setNewTemplate({
      name: "",
      category: "marketing",
      language: "English",
      headerType: "none",
      headerContent: "",
      body: "",
      footer: "",
      buttons: [],
    });
  };

  const handleAddButton = () => {
    if ((newTemplate.buttons?.length || 0) >= 3) {
      toast.error("Maximum 3 buttons allowed");
      return;
    }
    setNewTemplate({
      ...newTemplate,
      buttons: [...(newTemplate.buttons || []), { type: "quick_reply", text: "" }],
    });
  };

  const handleRemoveButton = (index: number) => {
    setNewTemplate({
      ...newTemplate,
      buttons: newTemplate.buttons?.filter((_, i) => i !== index),
    });
  };

  const handleUpdateButton = (index: number, field: string, value: string) => {
    const updated = [...(newTemplate.buttons || [])];
    updated[index] = { ...updated[index], [field]: value };
    setNewTemplate({ ...newTemplate, buttons: updated });
  };

  const filteredTemplates = templates.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    if (template.status !== "approved") {
      toast.error("Only approved templates can be used");
      return;
    }
    onSelectTemplate?.(template);
    onOpenChange(false);
  };

  const handleSyncFromMeta = async () => {
    setIsSyncing(true);
    
    // Simulate API call to Meta Business Manager
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    // Simulated synced templates from Meta
    const syncedTemplates: WhatsAppTemplate[] = [
      {
        id: `meta-${crypto.randomUUID()}`,
        name: "welcome_message",
        category: "marketing",
        language: "English",
        status: "approved",
        header: { type: "text", content: "Welcome to Our Agency! 🏡" },
        body: "Hi {{1}},\n\nThank you for choosing us for your property search.\n\nOur team is ready to help you find your dream home in {{2}}.\n\nYour dedicated agent is {{3}}.",
        footer: "Powered by Meta Business",
        buttons: [
          { type: "quick_reply", text: "Start Search" },
          { type: "url", text: "View Listings", value: "https://example.com/listings" },
        ],
        variables: ["client_name", "city", "agent_name"],
        createdAt: new Date().toISOString().split("T")[0],
      },
      {
        id: `meta-${crypto.randomUUID()}`,
        name: "open_house_invitation",
        category: "marketing",
        language: "English",
        status: "approved",
        header: { type: "image", content: "open_house_banner.jpg" },
        body: "🏠 Open House This Weekend!\n\nDear {{1}},\n\nYou're invited to an exclusive open house at:\n\n📍 {{2}}\n📅 {{3}}\n⏰ {{4}}\n\nRefreshments will be served. RSVP now!",
        footer: "Synced from Meta",
        buttons: [
          { type: "quick_reply", text: "I'll Be There!" },
          { type: "quick_reply", text: "Send Details" },
        ],
        variables: ["client_name", "property_address", "date", "time"],
        createdAt: new Date().toISOString().split("T")[0],
      },
      {
        id: `meta-${crypto.randomUUID()}`,
        name: "mortgage_calculator",
        category: "utility",
        language: "English",
        status: "approved",
        body: "Hi {{1}},\n\nBased on your inquiry for {{2}}, here's a quick mortgage estimate:\n\n💰 Property Price: {{3}}\n📊 Monthly Payment: {{4}}\n📈 Interest Rate: {{5}}\n\nWould you like to speak with our mortgage advisor?",
        buttons: [
          { type: "quick_reply", text: "Yes, Call Me" },
          { type: "quick_reply", text: "More Options" },
        ],
        variables: ["client_name", "property_name", "price", "monthly_payment", "interest_rate"],
        createdAt: new Date().toISOString().split("T")[0],
      },
    ];
    
    // Merge with existing, avoiding duplicates by name
    const existingNames = new Set(templates.map((t) => t.name));
    const newTemplates = syncedTemplates.filter((t) => !existingNames.has(t.name));
    
    if (newTemplates.length > 0) {
      setTemplates([...newTemplates, ...templates]);
      toast.success(`Synced ${newTemplates.length} new templates from Meta`);
    } else {
      toast.info("All templates are already synced");
    }
    
    setLastSyncTime(new Date().toLocaleTimeString());
    setIsSyncing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            WhatsApp Message Templates
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Templates Library</TabsTrigger>
              <TabsTrigger value="create">Create New Template</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="max-h-[calc(90vh-180px)]">
            {/* Templates Library */}
            <TabsContent value="templates" className="p-6 pt-4 m-0">
              {/* Sync from Meta Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <CloudDownload className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Sync from Meta Business Manager</h4>
                      <p className="text-sm text-muted-foreground">
                        Import your approved WhatsApp templates directly from Meta
                        {lastSyncTime && <span className="ml-2">• Last synced: {lastSyncTime}</span>}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleSyncFromMeta}
                    disabled={isSyncing}
                    className="gap-2"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync Templates
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="utility">Utility</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Template Cards */}
              <div className="grid gap-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "border rounded-xl p-4 hover:border-primary/50 transition-colors",
                      selectedTemplate?.id === template.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-foreground">{template.name}</h3>
                          {getStatusBadge(template.status)}
                          {getCategoryBadge(template.category)}
                        </div>

                        {/* Template Preview */}
                        <div className="bg-muted/50 rounded-lg p-3 mb-3">
                          {template.header && (
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              {template.header.type === "text" ? template.header.content : `[${template.header.type.toUpperCase()}]`}
                            </p>
                          )}
                          <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">
                            {template.body}
                          </p>
                          {template.footer && (
                            <p className="text-xs text-muted-foreground mt-2 italic">{template.footer}</p>
                          )}
                          {template.buttons && template.buttons.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {template.buttons.map((btn, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {btn.type === "phone" && <Phone className="h-3 w-3 mr-1" />}
                                  {btn.type === "url" && <ExternalLink className="h-3 w-3 mr-1" />}
                                  {btn.text}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{template.language}</span>
                          <span>•</span>
                          <span>{template.variables.length} variables</span>
                          <span>•</span>
                          <span>Created: {template.createdAt}</span>
                          {template.lastUsed && (
                            <>
                              <span>•</span>
                              <span>Last used: {template.lastUsed}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {onSelectTemplate && (
                          <Button
                            size="sm"
                            onClick={() => handleSelectTemplate(template)}
                            disabled={template.status !== "approved"}
                          >
                            Use Template
                          </Button>
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No templates found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Create Template */}
            <TabsContent value="create" className="p-6 pt-4 m-0">
              <div className="space-y-6">
                {/* Template Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Template Name *</Label>
                    <Input
                      placeholder="e.g., property_inquiry_followup"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Use lowercase with underscores</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={newTemplate.language}
                      onValueChange={(v) => setNewTemplate({ ...newTemplate, language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Arabic">Arabic</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-3">
                  <Label>Category *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setNewTemplate({ ...newTemplate, category: cat.value as any })}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all",
                          newTemplate.category === cat.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <p className="font-medium text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Header */}
                <div className="space-y-3">
                  <Label>Header (Optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {headerTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant={newTemplate.headerType === type.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewTemplate({ ...newTemplate, headerType: type.value })}
                      >
                        <type.icon className="h-4 w-4 mr-2" />
                        {type.label}
                      </Button>
                    ))}
                  </div>
                  {newTemplate.headerType === "text" && (
                    <Input
                      placeholder="Header text (e.g., 'Property Update 🏠')"
                      value={newTemplate.headerContent}
                      onChange={(e) => setNewTemplate({ ...newTemplate, headerContent: e.target.value })}
                    />
                  )}
                  {(newTemplate.headerType === "image" || newTemplate.headerType === "video" || newTemplate.headerType === "document") && (
                    <div className="border-2 border-dashed rounded-xl p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Upload {newTemplate.headerType} or provide URL at send time
                      </p>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Body Message *</Label>
                    <Button variant="ghost" size="sm">
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Generate
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Write your message here. Use {{1}}, {{2}}, etc. for variables..."
                    value={newTemplate.body}
                    onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{{1}}"}, {"{{2}}"}, etc. for dynamic content. Max 1024 characters.
                  </p>
                </div>

                {/* Footer */}
                <div className="space-y-2">
                  <Label>Footer (Optional)</Label>
                  <Input
                    placeholder="e.g., 'Reply STOP to unsubscribe'"
                    value={newTemplate.footer}
                    onChange={(e) => setNewTemplate({ ...newTemplate, footer: e.target.value })}
                  />
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Buttons (Optional)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddButton}
                      disabled={(newTemplate.buttons?.length || 0) >= 3}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Button
                    </Button>
                  </div>
                  {newTemplate.buttons?.map((btn, index) => (
                    <div key={index} className="flex gap-3 items-start p-4 border rounded-xl bg-muted/50">
                      <Select
                        value={btn.type}
                        onValueChange={(v) => handleUpdateButton(index, "type", v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {buttonTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <span className="flex items-center gap-2">
                                <type.icon className="h-3 w-3" />
                                {type.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Button text"
                        value={btn.text}
                        onChange={(e) => handleUpdateButton(index, "text", e.target.value)}
                        className="flex-1"
                      />
                      {(btn.type === "url" || btn.type === "phone") && (
                        <Input
                          placeholder={btn.type === "url" ? "https://..." : "+1234567890"}
                          value={btn.value || ""}
                          onChange={(e) => handleUpdateButton(index, "value", e.target.value)}
                          className="flex-1"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveButton(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Maximum 3 buttons. Quick replies are for user responses, URL opens a link, Phone initiates a call.
                  </p>
                </div>

                {/* Preview */}
                <div className="space-y-3">
                  <Label>Preview</Label>
                  <div className="max-w-sm mx-auto">
                    <div className="bg-[#075E54] rounded-t-xl p-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white/20" />
                      <span className="text-white font-medium">WhatsApp Preview</span>
                    </div>
                    <div className="bg-[#ECE5DD] p-4 rounded-b-xl min-h-[200px]">
                      <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%]">
                        {newTemplate.headerType === "text" && newTemplate.headerContent && (
                          <p className="font-semibold text-sm mb-1">{newTemplate.headerContent}</p>
                        )}
                        {(newTemplate.headerType === "image" || newTemplate.headerType === "video") && (
                          <div className="bg-muted rounded h-32 mb-2 flex items-center justify-center">
                            <Image className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">
                          {newTemplate.body || "Your message will appear here..."}
                        </p>
                        {newTemplate.footer && (
                          <p className="text-xs text-muted-foreground mt-2">{newTemplate.footer}</p>
                        )}
                        {newTemplate.buttons && newTemplate.buttons.length > 0 && (
                          <div className="border-t mt-2 pt-2 space-y-1">
                            {newTemplate.buttons.map((btn, i) => (
                              <button
                                key={i}
                                className="w-full text-center text-sm text-[#075E54] font-medium py-1"
                              >
                                {btn.text || "Button"}
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground text-right mt-1">12:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Template Approval Required</p>
                      <p className="text-blue-700 mt-1">
                        All templates must be approved by Meta before they can be used for campaigns. 
                        Approval typically takes 24-48 hours. Marketing templates require opt-in consent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === "create" && (
            <Button onClick={handleCreateTemplate}>
              <Check className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
