import { useState } from "react";
import {
  Mail,
  MessageSquare,
  Phone,
  Layers,
  Calendar,
  Clock,
  Users,
  Upload,
  Send,
  Save,
  Eye,
  Smartphone,
  Monitor,
  ChevronRight,
  Sparkles,
  FileText,
  X,
  Link2,
  Check,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Campaign } from "./CampaignCard";
import { MetaConnectDialog, WhatsAppConnection } from "./MetaConnectDialog";
import { SMSProviderDialog, SMSConnection } from "./SMSProviderDialog";
import { EmailSenderDialog, EmailConnection } from "./EmailSenderDialog";
import { WhatsAppTemplateManager, WhatsAppTemplate } from "./WhatsAppTemplateManager";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign | null;
  onSave: (campaign: Partial<Campaign>) => void;
}

const campaignTypes = [
  { value: "email", label: "Email", icon: Mail, description: "Send rich HTML emails" },
  { value: "sms", label: "SMS", icon: MessageSquare, description: "Short text messages" },
  { value: "whatsapp", label: "WhatsApp", icon: Phone, description: "WhatsApp messages" },
  { value: "multi-channel", label: "Multi-channel", icon: Layers, description: "Combine multiple channels" },
];

const segments = [
  "All Leads",
  "New Leads (Last 7 days)",
  "Hot Leads",
  "Cold Leads",
  "Property Finder Leads",
  "Website Inquiries",
  "Follow-up Required",
  "Meeting Scheduled",
];

const dynamicFields = [
  { label: "Client Name", value: "{{client_name}}" },
  { label: "Property Name", value: "{{property_name}}" },
  { label: "Agent Name", value: "{{agent_name}}" },
  { label: "Agent Phone", value: "{{agent_phone}}" },
  { label: "Agent Email", value: "{{agent_email}}" },
  { label: "Company Name", value: "{{company_name}}" },
];

const emailTemplates = [
  { id: "1", name: "Property Listing Announcement", type: "email" },
  { id: "2", name: "Follow-up Template", type: "email" },
  { id: "3", name: "Open House Invitation", type: "email" },
  { id: "4", name: "Price Reduction Alert", type: "email" },
];

export function CreateCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSave,
}: CreateCampaignDialogProps) {
  const isEditing = !!campaign;
  const [step, setStep] = useState(1);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  
  // Connection dialogs
  const [showMetaConnect, setShowMetaConnect] = useState(false);
  const [showSMSConnect, setShowSMSConnect] = useState(false);
  const [showEmailConnect, setShowEmailConnect] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  
  // Selected WhatsApp template
  const [selectedWhatsAppTemplate, setSelectedWhatsAppTemplate] = useState<WhatsAppTemplate | null>(null);
  
  // Connected accounts
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([]);
  const [smsConnections, setSmsConnections] = useState<SMSConnection[]>([]);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([
    // Sample pre-connected email
    {
      id: "1",
      provider: "Resend",
      email: "marketing@yourcompany.com",
      domain: "yourcompany.com",
      status: "connected",
      connectedAt: new Date().toISOString(),
    },
  ]);
  
  // Selected senders
  const [selectedWhatsapp, setSelectedWhatsapp] = useState<string | null>(null);
  const [selectedSMS, setSelectedSMS] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string>("1");

  const [formData, setFormData] = useState({
    name: campaign?.name || "",
    type: campaign?.type || "email",
    targetAudience: campaign?.targetAudience || "",
    schedule: "now" as "now" | "later" | "recurring",
    scheduledDate: undefined as Date | undefined,
    scheduledTime: "09:00",
    recurringFrequency: "weekly",
    emailSubject: "",
    emailBody: "",
    smsBody: "",
    whatsappBody: "",
    attachPdf: false,
    selectedTemplate: "",
  });

  const handleSave = (isDraft: boolean) => {
    onSave({
      name: formData.name,
      type: formData.type as Campaign["type"],
      targetAudience: formData.targetAudience,
      status: isDraft ? "draft" : formData.schedule === "now" ? "active" : "scheduled",
      startDate: formData.scheduledDate?.toISOString() || new Date().toISOString(),
      leadsCount: Math.floor(Math.random() * 500) + 100,
    });
    onOpenChange(false);
    setStep(1);
  };

  const insertDynamicField = (field: string) => {
    if (formData.type === "email" || formData.type === "multi-channel") {
      setFormData({ ...formData, emailBody: formData.emailBody + field });
    } else if (formData.type === "sms") {
      setFormData({ ...formData, smsBody: formData.smsBody + field });
    } else if (formData.type === "whatsapp") {
      setFormData({ ...formData, whatsappBody: formData.whatsappBody + field });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-xl">
            {isEditing ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="p-6">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide">
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium smooth shrink-0",
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : step > s
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-xs">
                    {s}
                  </span>
                  {s === 1 && "Details"}
                  {s === 2 && "Message"}
                  {s === 3 && "Sender"}
                  {s === 4 && "Review"}
                </button>
              ))}
            </div>

            {/* Step 1: Campaign Details */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="Enter campaign name..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Campaign Type */}
                <div className="space-y-3">
                  <Label>Campaign Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {campaignTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFormData({ ...formData, type: type.value as "email" | "sms" | "whatsapp" | "multi-channel" })}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left smooth",
                          formData.type === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <type.icon className={cn(
                          "h-6 w-6 mb-2",
                          formData.type === type.value ? "text-primary" : "text-muted-foreground"
                        )} />
                        <p className="font-medium text-foreground">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select
                    value={formData.targetAudience}
                    onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target segment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((segment) => (
                        <SelectItem key={segment} value={segment}>
                          {segment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Upload className="h-4 w-4 mr-2" />
                    Import from CSV/Excel
                  </Button>
                </div>

                {/* Schedule */}
                <div className="space-y-3">
                  <Label>Schedule</Label>
                  <div className="flex gap-3">
                    {[
                      { value: "now", label: "Send Now", icon: Send },
                      { value: "later", label: "Schedule Later", icon: Calendar },
                      { value: "recurring", label: "Recurring", icon: Clock },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, schedule: option.value as any })}
                        className={cn(
                          "flex-1 p-3 rounded-lg border-2 flex items-center gap-2 smooth",
                          formData.schedule === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <option.icon className={cn(
                          "h-4 w-4",
                          formData.schedule === option.value ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>

                  {formData.schedule === "later" && (
                    <div className="flex gap-3 mt-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-start">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formData.scheduledDate
                              ? format(formData.scheduledDate, "PPP")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={formData.scheduledDate}
                            onSelect={(date) => setFormData({ ...formData, scheduledDate: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Select
                        value={formData.scheduledTime}
                        onValueChange={(value) => setFormData({ ...formData, scheduledTime: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={`${i.toString().padStart(2, "0")}:00`}>
                              {`${i.toString().padStart(2, "0")}:00`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.schedule === "recurring" && (
                    <Select
                      value={formData.recurringFrequency}
                      onValueChange={(value) => setFormData({ ...formData, recurringFrequency: value })}
                    >
                      <SelectTrigger className="mt-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Message Builder */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Templates */}
                <div className="space-y-2">
                  <Label>Use Template</Label>
                  <Select
                    value={formData.selectedTemplate}
                    onValueChange={(value) => setFormData({ ...formData, selectedTemplate: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {template.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic Fields */}
                <div className="space-y-2">
                  <Label>Dynamic Fields</Label>
                  <div className="flex flex-wrap gap-2">
                    {dynamicFields.map((field) => (
                      <Badge
                        key={field.value}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 smooth"
                        onClick={() => insertDynamicField(field.value)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {field.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Email Builder */}
                {(formData.type === "email" || formData.type === "multi-channel") && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <Label className="text-base">Email Content</Label>
                    </div>
                    <Input
                      placeholder="Email Subject"
                      value={formData.emailSubject}
                      onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                    />
                    <Textarea
                      placeholder="Write your email content here... Use dynamic fields above to personalize."
                      value={formData.emailBody}
                      onChange={(e) => setFormData({ ...formData, emailBody: e.target.value })}
                      className="min-h-[200px]"
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.attachPdf}
                        onCheckedChange={(checked) => setFormData({ ...formData, attachPdf: checked })}
                      />
                      <Label>Attach Property PDF/Brochure</Label>
                    </div>
                  </div>
                )}

                {/* SMS Builder */}
                {(formData.type === "sms" || formData.type === "multi-channel") && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-info" />
                      <Label className="text-base">SMS Content</Label>
                    </div>
                    <Textarea
                      placeholder="Write your SMS message... (160 characters recommended)"
                      value={formData.smsBody}
                      onChange={(e) => setFormData({ ...formData, smsBody: e.target.value })}
                      className="min-h-[100px]"
                      maxLength={320}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.smsBody.length}/320 characters
                    </p>
                  </div>
                )}

                {/* WhatsApp Builder */}
                {(formData.type === "whatsapp" || formData.type === "multi-channel") && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-success" />
                        <Label className="text-base">WhatsApp Content</Label>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowTemplateManager(true)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                    </div>

                    {selectedWhatsAppTemplate ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  Approved Template
                                </Badge>
                                <span className="text-sm font-medium">{selectedWhatsAppTemplate.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                                {selectedWhatsAppTemplate.body}
                              </p>
                              {selectedWhatsAppTemplate.buttons && selectedWhatsAppTemplate.buttons.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {selectedWhatsAppTemplate.buttons.map((btn, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {btn.text}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedWhatsAppTemplate(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Variable mapping */}
                        {selectedWhatsAppTemplate.variables.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Map Variables</Label>
                            <div className="grid gap-2">
                              {selectedWhatsAppTemplate.variables.map((v, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <Badge variant="outline" className="shrink-0">{`{{${i + 1}}}`}</Badge>
                                  <Select>
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder={`Select value for ${v}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="client_name">Client Name</SelectItem>
                                      <SelectItem value="property_name">Property Name</SelectItem>
                                      <SelectItem value="agent_name">Agent Name</SelectItem>
                                      <SelectItem value="price">Price</SelectItem>
                                      <SelectItem value="location">Location</SelectItem>
                                      <SelectItem value="custom">Custom Value</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <div className="flex gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium text-amber-800">Template Required for Business API</p>
                              <p className="text-amber-700 mt-1">
                                WhatsApp Business API requires pre-approved message templates. 
                                Select a template or create custom content for personal/business app.
                              </p>
                            </div>
                          </div>
                        </div>
                        <Textarea
                          placeholder="Or write your custom WhatsApp message here (for personal/business app only)..."
                          value={formData.whatsappBody}
                          onChange={(e) => setFormData({ ...formData, whatsappBody: e.target.value })}
                          className="min-h-[150px]"
                        />
                      </>
                    )}
                  </div>
                )}

                {/* Test Send */}
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Input placeholder="Test email or phone number" className="flex-1" />
                  <Button variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Sender Selection */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    {formData.type === "whatsapp" && "WhatsApp Business Number"}
                    {formData.type === "sms" && "SMS Sender"}
                    {formData.type === "email" && "Email Sender"}
                    {formData.type === "multi-channel" && "Sender Configuration"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.type === "whatsapp" && "Select or connect your WhatsApp Business number to send messages"}
                    {formData.type === "sms" && "Select or connect your SMS provider to send text messages"}
                    {formData.type === "email" && "Select or connect your email sender address"}
                    {formData.type === "multi-channel" && "Configure senders for each channel"}
                  </p>
                </div>

                {/* WhatsApp Sender */}
                {(formData.type === "whatsapp" || formData.type === "multi-channel") && (
                  <div className="space-y-3">
                    {formData.type === "multi-channel" && (
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        WhatsApp
                      </Label>
                    )}
                    <div className="grid gap-3">
                      {whatsappConnections.length === 0 ? (
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/50 border-dashed">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium">No WhatsApp number connected</p>
                              <p className="text-xs text-muted-foreground">Connect via Meta Business to send campaigns</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        whatsappConnections.map((conn) => (
                          <div 
                            key={conn.id}
                            onClick={() => setSelectedWhatsapp(conn.id)}
                            className={cn(
                              "flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/50 transition-colors cursor-pointer",
                              selectedWhatsapp === conn.id && "border-primary bg-primary/5"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Phone className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium">{conn.phoneNumber}</p>
                                <p className="text-xs text-muted-foreground">{conn.displayName} • Connected via Meta</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedWhatsapp === conn.id ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  Selected
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        onClick={() => setShowMetaConnect(true)}
                      >
                        <Plus className="h-4 w-4" />
                        {whatsappConnections.length === 0 ? "Connect WhatsApp via Meta" : "Connect another WhatsApp number"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* SMS Sender */}
                {(formData.type === "sms" || formData.type === "multi-channel") && (
                  <div className="space-y-3">
                    {formData.type === "multi-channel" && (
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        SMS
                      </Label>
                    )}
                    <div className="grid gap-3">
                      {smsConnections.length === 0 ? (
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/50 border-dashed">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium">No SMS provider connected</p>
                              <p className="text-xs text-muted-foreground">Connect Twilio, MessageBird, or other providers</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        smsConnections.map((conn) => (
                          <div 
                            key={conn.id}
                            onClick={() => setSelectedSMS(conn.id)}
                            className={cn(
                              "flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/50 transition-colors cursor-pointer",
                              selectedSMS === conn.id && "border-primary bg-primary/5"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{conn.phoneNumber}</p>
                                <p className="text-xs text-muted-foreground">{conn.provider}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedSMS === conn.id ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  Selected
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  Connected
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowSMSConnect(true)}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        {smsConnections.length === 0 ? "Connect SMS Provider" : "Connect another provider"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Email Sender */}
                {(formData.type === "email" || formData.type === "multi-channel") && (
                  <div className="space-y-3">
                    {formData.type === "multi-channel" && (
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email
                      </Label>
                    )}
                    <div className="grid gap-3">
                      {emailConnections.length === 0 ? (
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/50 border-dashed">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium">No email sender connected</p>
                              <p className="text-xs text-muted-foreground">Connect Resend, SendGrid, or other providers</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        emailConnections.map((conn) => (
                          <div 
                            key={conn.id}
                            onClick={() => setSelectedEmail(conn.id)}
                            className={cn(
                              "flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/50 transition-colors cursor-pointer",
                              selectedEmail === conn.id && "border-primary bg-primary/5"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center",
                                selectedEmail === conn.id ? "bg-primary/10" : "bg-muted"
                              )}>
                                <Mail className={cn(
                                  "h-5 w-5",
                                  selectedEmail === conn.id ? "text-primary" : "text-muted-foreground"
                                )} />
                              </div>
                              <div>
                                <p className="font-medium">{conn.email}</p>
                                <p className="text-xs text-muted-foreground">{conn.provider} • {conn.domain ? "Verified domain" : "Pending verification"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedEmail === conn.id ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  Selected
                                </Badge>
                              ) : (
                                <Badge variant="outline">Select</Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        onClick={() => setShowEmailConnect(true)}
                      >
                        <Plus className="h-4 w-4" />
                        {emailConnections.length === 0 ? "Connect Email Provider" : "Add another email sender"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sender Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Sender Configuration</p>
                      <p className="text-blue-700 mt-1">
                        Make sure your sender is properly verified to ensure high deliverability rates. 
                        For WhatsApp, use approved message templates to avoid blocks.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Preview Toggle */}
                <div className="flex items-center justify-between">
                  <Label>Preview Mode</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={previewMode === "desktop" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewMode("desktop")}
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Desktop
                    </Button>
                    <Button
                      variant={previewMode === "mobile" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewMode("mobile")}
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Mobile
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                <div className={cn(
                  "border border-border rounded-xl p-6 bg-muted/50 mx-auto smooth",
                  previewMode === "mobile" ? "max-w-[375px]" : "w-full"
                )}>
                  <div className="bg-card rounded-lg p-4 shadow-sm">
                    <p className="font-semibold text-foreground mb-2">
                      {formData.emailSubject || "Email Subject Preview"}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {formData.emailBody || formData.smsBody || formData.whatsappBody || "Your message content will appear here..."}
                    </p>
                  </div>
                </div>

                {/* Campaign Summary */}
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-foreground">Campaign Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{formData.name || "Untitled Campaign"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{formData.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target Audience</p>
                      <p className="font-medium">{formData.targetAudience || "Not selected"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Schedule</p>
                      <p className="font-medium capitalize">{formData.schedule}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sender</p>
                      <p className="font-medium">
                        {formData.type === "email" && "marketing@yourcompany.com"}
                        {formData.type === "whatsapp" && "+971 50 123 4567"}
                        {formData.type === "sms" && "Not connected"}
                        {formData.type === "multi-channel" && "Multiple senders"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
          >
            {step > 1 ? "Back" : "Cancel"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(true)}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => handleSave(false)}>
                <Send className="h-4 w-4 mr-2" />
                {formData.schedule === "now" ? "Send Now" : "Schedule Campaign"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Connection Dialogs */}
      <MetaConnectDialog
        open={showMetaConnect}
        onOpenChange={setShowMetaConnect}
        onSuccess={(conn) => {
          setWhatsappConnections([...whatsappConnections, conn]);
          setSelectedWhatsapp(conn.id);
        }}
      />
      <SMSProviderDialog
        open={showSMSConnect}
        onOpenChange={setShowSMSConnect}
        onSuccess={(conn) => {
          setSmsConnections([...smsConnections, conn]);
          setSelectedSMS(conn.id);
        }}
      />
      <EmailSenderDialog
        open={showEmailConnect}
        onOpenChange={setShowEmailConnect}
        onSuccess={(conn) => {
          setEmailConnections([...emailConnections, conn]);
          setSelectedEmail(conn.id);
        }}
      />
      <WhatsAppTemplateManager
        open={showTemplateManager}
        onOpenChange={setShowTemplateManager}
        onSelectTemplate={(template) => {
          setSelectedWhatsAppTemplate(template);
          setFormData({ ...formData, whatsappBody: template.body });
        }}
      />
    </Dialog>
  );
}
