import { useState } from 'react';
import {
  GripVertical, Plus, Trash2, ChevronDown, ChevronUp,
  MessageCircle, HelpCircle, Tag, DollarSign, Home,
  ArrowRight, Sparkles, Save, RotateCcw, Eye,
  AlertTriangle, CheckCircle, FileWarning
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FlowStep {
  id: string;
  type: 'welcome' | 'question' | 'condition' | 'action' | 'handover';
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  field?: string;
  conditions?: { field: string; operator: string; value: string; action: string }[];
  isEnabled: boolean;
  order: number;
}

const defaultSteps: FlowStep[] = [
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Welcome Message',
    titleAr: 'رسالة الترحيب',
    content: 'Hello! 👋 Welcome to OneLinker Properties. I\'m here to help you find your perfect property. May I know your name?',
    contentAr: 'مرحباً! 👋 أهلاً بك في OneLinker Properties. أنا هنا لمساعدتك في العثور على العقار المثالي. هل يمكنني معرفة اسمك؟',
    isEnabled: true,
    order: 1,
  },
  {
    id: 'name',
    type: 'question',
    title: 'Ask Name',
    titleAr: 'اسأل الاسم',
    content: 'What is your name?',
    contentAr: 'ما هو اسمك؟',
    field: 'name',
    isEnabled: true,
    order: 2,
  },
  {
    id: 'contact',
    type: 'question',
    title: 'Ask Contact',
    titleAr: 'اسأل رقم التواصل',
    content: 'Thank you, {{name}}! Can you share your contact number?',
    contentAr: 'شكراً لك، {{name}}! هل يمكنك مشاركة رقم التواصل الخاص بك؟',
    field: 'contactNumber',
    isEnabled: true,
    order: 3,
  },
  {
    id: 'property_interest',
    type: 'question',
    title: 'Ask Property Interest',
    titleAr: 'اسأل عن نوع العقار',
    content: 'What type of property are you interested in?\n\n1️⃣ Apartment\n2️⃣ Villa\n3️⃣ Townhouse\n4️⃣ Penthouse\n5️⃣ Commercial',
    contentAr: 'ما نوع العقار الذي تهتم به؟\n\n1️⃣ شقة\n2️⃣ فيلا\n3️⃣ تاون هاوس\n4️⃣ بنتهاوس\n5️⃣ تجاري',
    field: 'propertyInterest',
    isEnabled: true,
    order: 4,
  },
  {
    id: 'budget',
    type: 'question',
    title: 'Ask Budget',
    titleAr: 'اسأل عن الميزانية',
    content: 'What is your budget range?\n\n1️⃣ Under 1M AED\n2️⃣ 1M - 3M AED\n3️⃣ 3M - 5M AED\n4️⃣ 5M - 10M AED\n5️⃣ Above 10M AED',
    contentAr: 'ما هو نطاق ميزانيتك؟\n\n1️⃣ أقل من 1 مليون درهم\n2️⃣ 1 - 3 مليون درهم\n3️⃣ 3 - 5 مليون درهم\n4️⃣ 5 - 10 مليون درهم\n5️⃣ أكثر من 10 مليون درهم',
    field: 'budgetRange',
    isEnabled: true,
    order: 5,
  },
  {
    id: 'premium_check',
    type: 'condition',
    title: 'Check Premium Lead',
    titleAr: 'فحص العميل المميز',
    content: 'Conditional logic to identify premium leads',
    contentAr: 'منطق شرطي لتحديد العملاء المميزين',
    conditions: [
      { field: 'budgetRange', operator: 'contains', value: '5M', action: 'mark_premium' },
      { field: 'budgetRange', operator: 'contains', value: '10M', action: 'mark_premium' },
    ],
    isEnabled: true,
    order: 6,
  },
  {
    id: 'handover',
    type: 'handover',
    title: 'Agent Handover',
    titleAr: 'تسليم للوكيل',
    content: 'Thank you for sharing the details! One of our agents will contact you shortly. Is there anything else you\'d like to know?',
    contentAr: 'شكراً لمشاركة التفاصيل! سيتصل بك أحد وكلائنا قريباً. هل هناك أي شيء آخر تريد معرفته؟',
    isEnabled: true,
    order: 7,
  },
];

const stepTypeIcons: Record<FlowStep['type'], React.ReactNode> = {
  welcome: <MessageCircle className="h-4 w-4" />,
  question: <HelpCircle className="h-4 w-4" />,
  condition: <Tag className="h-4 w-4" />,
  action: <ArrowRight className="h-4 w-4" />,
  handover: <Sparkles className="h-4 w-4" />,
};

const stepTypeColors: Record<FlowStep['type'], string> = {
  welcome: 'bg-green-500/10 text-green-600 border-green-500/20',
  question: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  condition: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  action: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  handover: 'bg-primary/10 text-primary border-primary/20',
};

export function ChatbotFlowBuilder() {
  const { isRTL } = useLanguageSafe();
  const [steps, setSteps] = useState<FlowStep[]>(defaultSteps);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleStep = (id: string) => {
    setSteps(steps.map(s =>
      s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
    ));
  };

  const handleUpdateStep = (id: string, updates: Partial<FlowStep>) => {
    setSteps(steps.map(s =>
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const handleAddStep = (type: FlowStep['type']) => {
    const newStep: FlowStep = {
      id: `step_${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      titleAr: `خطوة ${type} جديدة`,
      content: '',
      contentAr: '',
      isEnabled: true,
      order: steps.length + 1,
    };
    setSteps([...steps, newStep]);
    toast.success(isRTL ? 'تمت إضافة الخطوة' : 'Step added');
  };

  const handleRemoveStep = (id: string) => {
    if (['welcome', 'handover'].includes(id)) {
      toast.error(isRTL ? 'لا يمكن حذف هذه الخطوة' : 'Cannot delete this step');
      return;
    }
    setSteps(steps.filter(s => s.id !== id));
    toast.success(isRTL ? 'تم حذف الخطوة' : 'Step removed');
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      toast.success(isRTL ? 'تم حفظ التدفق' : 'Flow saved successfully');
      setIsSaving(false);
    }, 1000);
  };

  const handleReset = () => {
    setSteps(defaultSteps);
    toast.success(isRTL ? 'تم إعادة تعيين التدفق' : 'Flow reset to default');
  };

  const validateFlow = () => {
    const errors: string[] = [];

    // Check 1: Start/Welcome Step
    if (!steps.find(s => s.type === 'welcome' && s.isEnabled)) {
      errors.push(isRTL ? 'يجب أن يكون هناك رسالة ترحيب مفعلة' : 'A valid Welcome Message step is required');
    }

    // Check 2: Content Validation
    steps.filter(s => s.isEnabled).forEach(step => {
      if (!step.content || step.content.trim() === '') {
        errors.push(isRTL
          ? `الخطوة "${step.titleAr}" لا تحتوي على رسالة`
          : `Step "${step.title}" has empty message content`);
      }

      if (step.type === 'question' && !step.field) {
        errors.push(isRTL
          ? `الخطوة "${step.titleAr}" تتطلب تحديد حقل للحفظ`
          : `Step "${step.title}" requires a field to save the answer`);
      }

      if (step.type === 'condition' && (!step.conditions || step.conditions.length === 0)) {
        errors.push(isRTL
          ? `الخطوة "${step.titleAr}" لا تحتوي على شروط`
          : `Step "${step.title}" has no conditions defined`);
      }
    });

    if (errors.length > 0) {
      toast.custom((t) => (
        <div className="bg-destructive text-destructive-foreground p-4 rounded-lg shadow-lg flex gap-3 border border-destructive/50">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">{isRTL ? 'تم العثور على أخطاء في التدفق:' : 'Validation Failed:'}</p>
            <ul className="list-disc pl-4 text-xs space-y-1 opacity-90">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto hover:bg-white/20" onClick={() => toast.dismiss(t)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ), { duration: 5000 });
      return false;
    }

    toast.success(
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>{isRTL ? 'التدفق سليم وجاهز للنشر' : 'Flow is valid and ready for deployment'}</span>
      </div>
    );
    return true;
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-foreground">
            {isRTL ? 'منشئ تدفق البوت' : 'Chatbot Flow Builder'}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            {isRTL ? 'أنشئ تدفق المحادثة للتأهيل' : 'Create conversation flow for lead qualification'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isRTL ? 'إعادة تعيين' : 'Reset'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={validateFlow} className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800">
            <FileWarning className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isRTL ? 'تحقق' : 'Validate'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isRTL ? 'معاينة' : 'Preview'}</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {isRTL ? 'حفظ' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Flow Steps */}
      <div className="space-y-3">
        {steps.sort((a, b) => a.order - b.order).map((step, index) => (
          <Card
            key={step.id}
            className={cn(
              "bg-card/50 backdrop-blur-sm transition-all",
              !step.isEnabled && "opacity-50"
            )}
          >
            <Accordion type="single" collapsible>
              <AccordionItem value={step.id} className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move shrink-0" />
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                      stepTypeColors[step.type]
                    )}>
                      {stepTypeIcons[step.type]}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {isRTL ? step.titleAr : step.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {step.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {isRTL ? step.contentAr : step.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={step.isEnabled}
                        onCheckedChange={() => handleToggleStep(step.id)}
                      />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs">{isRTL ? 'العنوان (English)' : 'Title (English)'}</Label>
                        <Input
                          value={step.title}
                          onChange={(e) => handleUpdateStep(step.id, { title: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{isRTL ? 'العنوان (العربية)' : 'Title (Arabic)'}</Label>
                        <Input
                          value={step.titleAr}
                          onChange={(e) => handleUpdateStep(step.id, { titleAr: e.target.value })}
                          className="h-9 text-sm"
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{isRTL ? 'الرسالة (English)' : 'Message (English)'}</Label>
                      <Textarea
                        value={step.content}
                        onChange={(e) => handleUpdateStep(step.id, { content: e.target.value })}
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{isRTL ? 'الرسالة (العربية)' : 'Message (Arabic)'}</Label>
                      <Textarea
                        value={step.contentAr}
                        onChange={(e) => handleUpdateStep(step.id, { contentAr: e.target.value })}
                        rows={3}
                        className="text-sm"
                        dir="rtl"
                      />
                    </div>

                    {step.type === 'question' && (
                      <div className="space-y-2">
                        <Label className="text-xs">{isRTL ? 'حفظ في الحقل' : 'Save to Field'}</Label>
                        <Select
                          value={step.field}
                          onValueChange={(v) => handleUpdateStep(step.id, { field: v })}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder={isRTL ? 'اختر حقل' : 'Select field'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="contactNumber">Contact Number</SelectItem>
                            <SelectItem value="propertyInterest">Property Interest</SelectItem>
                            <SelectItem value="budgetRange">Budget Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {step.type === 'condition' && step.conditions && (
                      <div className="space-y-2">
                        <Label className="text-xs">{isRTL ? 'الشروط' : 'Conditions'}</Label>
                        {step.conditions.map((condition, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-muted/50 p-2 rounded-lg">
                            <span className="font-medium">{condition.field}</span>
                            <Badge variant="outline" className="text-[10px]">{condition.operator}</Badge>
                            <span>{condition.value}</span>
                            <ArrowRight className="h-3 w-3" />
                            <Badge className={stepTypeColors.action}>{condition.action}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {!['welcome', 'handover'].includes(step.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveStep(step.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {isRTL ? 'حذف الخطوة' : 'Delete Step'}
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        ))}
      </div>

      {/* Add Step Buttons */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <p className="text-sm font-medium mb-3">{isRTL ? 'إضافة خطوة جديدة' : 'Add New Step'}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleAddStep('question')} className="gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            {isRTL ? 'سؤال' : 'Question'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddStep('condition')} className="gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {isRTL ? 'شرط' : 'Condition'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddStep('action')} className="gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" />
            {isRTL ? 'إجراء' : 'Action'}
          </Button>
        </div>
      </Card>

      {/* Live Preview */}
      {showPreview && (
        <Card className="bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {isRTL ? 'معاينة المحادثة' : 'Conversation Preview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-b from-green-500/5 to-transparent rounded-xl p-4 space-y-3 max-h-[300px] overflow-y-auto">
              {steps.filter(s => s.isEnabled).sort((a, b) => a.order - b.order).map((step) => (
                <div key={step.id} className="flex gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    step.type === 'handover' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-600'
                  )}>
                    {stepTypeIcons[step.type]}
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-[9px] mb-1">{step.type}</Badge>
                    <p className="text-sm bg-card/80 rounded-lg p-2.5 shadow-sm whitespace-pre-line">
                      {isRTL ? step.contentAr : step.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
