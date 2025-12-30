import { useState } from 'react';
import { 
  Plus, FileText, Eye, Pencil, Copy, Trash2, 
  Sparkles, Variable 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CampaignChannel, CampaignTemplate } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Mock templates
const mockTemplates: CampaignTemplate[] = [
  {
    id: 't1',
    name: 'Welcome Message',
    channel: 'whatsapp',
    content: 'Hello {{lead_name}}! 👋\n\nThank you for your interest in our properties. How can we help you find your dream home today?\n\nBest regards,\n{{agent_name}}',
    variables: ['lead_name', 'agent_name'],
    createdAt: new Date(),
  },
  {
    id: 't2',
    name: 'Property Alert',
    channel: 'whatsapp',
    content: '🏠 New Property Alert!\n\nHi {{lead_name}},\n\nA new property matching your criteria is now available:\n\n📍 {{property_location}}\n💰 {{property_price}}\n🛏 {{bedrooms}} Bedrooms\n\nWould you like to schedule a viewing?',
    variables: ['lead_name', 'property_location', 'property_price', 'bedrooms'],
    createdAt: new Date(),
  },
  {
    id: 't3',
    name: 'Follow-up Message',
    channel: 'whatsapp',
    content: 'Hi {{lead_name}},\n\nI hope you\'re doing well! I wanted to follow up on our previous conversation about properties in {{area}}.\n\nDo you have any questions or would you like to see more options?\n\nBest,\n{{agent_name}}',
    variables: ['lead_name', 'area', 'agent_name'],
    createdAt: new Date(),
  },
];

const availableVariables = [
  { key: 'lead_name', label: 'Lead Name', labelAr: 'اسم العميل' },
  { key: 'agent_name', label: 'Agent Name', labelAr: 'اسم الوكيل' },
  { key: 'property_location', label: 'Property Location', labelAr: 'موقع العقار' },
  { key: 'property_price', label: 'Property Price', labelAr: 'سعر العقار' },
  { key: 'bedrooms', label: 'Bedrooms', labelAr: 'غرف النوم' },
  { key: 'area', label: 'Area', labelAr: 'المنطقة' },
  { key: 'company_name', label: 'Company Name', labelAr: 'اسم الشركة' },
];

interface TemplateStepProps {
  channel: CampaignChannel;
  selectedTemplateId?: string;
  customContent?: string;
  onSelectTemplate: (templateId: string) => void;
  onCustomContent: (content: string) => void;
  isRTL?: boolean;
}

export function TemplateStep({ 
  channel,
  selectedTemplateId,
  customContent,
  onSelectTemplate,
  onCustomContent,
  isRTL = false 
}: TemplateStepProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CampaignTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const templates = mockTemplates.filter(t => t.channel === channel);

  const handlePreview = (template: CampaignTemplate) => {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  };

  const insertVariable = (variable: string) => {
    const newContent = (useCustom ? customContent : newTemplateContent) + `{{${variable}}}`;
    if (useCustom) {
      onCustomContent(newContent);
    } else {
      setNewTemplateContent(newContent);
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName || !newTemplateContent) {
      toast.error(isRTL ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }
    toast.success(isRTL ? 'تم إنشاء القالب' : 'Template created');
    setShowCreateDialog(false);
    setNewTemplateName('');
    setNewTemplateContent('');
  };

  return (
    <div className="space-y-6">
      <div className={cn("text-center", isRTL && "font-arabic")}>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isRTL ? 'اختر أو أنشئ قالباً' : 'Select or Create Template'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL 
            ? 'اختر قالباً موجوداً أو أنشئ واحداً جديداً'
            : 'Choose an existing template or create a new one'}
        </p>
      </div>

      {/* Template Selection */}
      <div className="grid gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id && !useCustom;

          return (
            <Card
              key={template.id}
              onClick={() => {
                setUseCustom(false);
                onSelectTemplate(template.id);
              }}
              className={cn(
                "cursor-pointer transition-all border-2",
                isSelected 
                  ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg" 
                  : "border-border/50 hover:border-primary/50 hover:shadow-md"
              )}
            >
              <CardContent className="p-4">
                <div className={cn("flex items-start justify-between gap-4", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex items-start gap-3 flex-1", isRTL && "flex-row-reverse")}>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className={cn("flex-1", isRTL && "text-right")}>
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {template.content.substring(0, 100)}...
                      </p>
                      <div className={cn("flex items-center gap-2 mt-2 flex-wrap", isRTL && "flex-row-reverse")}>
                        {template.variables.map(v => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(template);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Custom Message Option */}
        <Card
          onClick={() => setUseCustom(true)}
          className={cn(
            "cursor-pointer transition-all border-2 border-dashed",
            useCustom 
              ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg" 
              : "border-muted-foreground/20 hover:border-primary/50"
          )}
        >
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <h4 className="font-semibold">
                  {isRTL ? 'رسالة مخصصة' : 'Custom Message'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'اكتب رسالتك الخاصة' : 'Write your own message'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Message Editor */}
      {useCustom && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-4">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <Label>{isRTL ? 'رسالتك' : 'Your Message'}</Label>
              <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                <Button variant="ghost" size="sm">
                  <Sparkles className="h-4 w-4 mr-1" />
                  {isRTL ? 'توليد بالذكاء الاصطناعي' : 'AI Generate'}
                </Button>
              </div>
            </div>
            <Textarea
              value={customContent}
              onChange={(e) => onCustomContent(e.target.value)}
              placeholder={isRTL ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
              className="min-h-[150px]"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {isRTL ? 'إدراج متغير:' : 'Insert Variable:'}
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableVariables.map(v => (
                  <Button
                    key={v.key}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => insertVariable(v.key)}
                  >
                    <Variable className="h-3 w-3 mr-1" />
                    {isRTL ? v.labelAr : v.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        {isRTL ? 'إنشاء قالب جديد' : 'Create New Template'}
      </Button>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
            {previewTemplate?.content}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'إنشاء قالب جديد' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'اسم القالب' : 'Template Name'}</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder={isRTL ? 'مثال: رسالة ترحيب' : 'e.g., Welcome Message'}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{isRTL ? 'المحتوى' : 'Content'}</Label>
                <Button variant="ghost" size="sm">
                  <Sparkles className="h-4 w-4 mr-1" />
                  {isRTL ? 'توليد' : 'Generate'}
                </Button>
              </div>
              <Textarea
                value={newTemplateContent}
                onChange={(e) => setNewTemplateContent(e.target.value)}
                placeholder={isRTL ? 'اكتب محتوى القالب...' : 'Write template content...'}
                className="min-h-[150px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {isRTL ? 'المتغيرات المتاحة:' : 'Available Variables:'}
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableVariables.map(v => (
                  <Button
                    key={v.key}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setNewTemplateContent(prev => prev + `{{${v.key}}}`)}
                  >
                    {`{{${v.key}}}`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateTemplate}>
              {isRTL ? 'إنشاء' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
