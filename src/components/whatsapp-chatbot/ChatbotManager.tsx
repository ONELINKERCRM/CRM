import { useState } from 'react';
import { Plus, Bot, Settings2, Trash2, Power, PowerOff, Sparkles, Key, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { Slider } from '@/components/ui/slider';
import { useChatbots, LLM_PROVIDERS, ChatbotInput, LLMProvider } from '@/hooks/useChatbots';
import { useWhatsAppConnection } from '@/contexts/WhatsAppConnectionContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function ChatbotManager() {
  const { isRTL } = useLanguageSafe();
  const { chatbots, isLoading, createChatbot, updateChatbot, deleteChatbot, toggleChatbot } = useChatbots();
  const { connections: whatsappConnections } = useWhatsAppConnection();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBot, setEditingBot] = useState<string | null>(null);
  const [formData, setFormData] = useState<ChatbotInput>({
    name: '',
    description: '',
    llm_provider: 'lovable',
    llm_model: 'google/gemini-2.5-flash',
    system_prompt: 'You are a helpful real estate assistant. Help users find properties and answer their questions professionally.',
    welcome_message: 'Hello! How can I help you today?',
    temperature: 0.7,
    max_tokens: 1000,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      llm_provider: 'lovable',
      llm_model: 'google/gemini-2.5-flash',
      system_prompt: 'You are a helpful real estate assistant. Help users find properties and answer their questions professionally.',
      welcome_message: 'Hello! How can I help you today?',
      temperature: 0.7,
      max_tokens: 1000,
    });
    setEditingBot(null);
  };

  const handleCreate = async () => {
    await createChatbot(formData);
    setShowCreateDialog(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (editingBot) {
      await updateChatbot(editingBot, formData);
      setShowCreateDialog(false);
      resetForm();
    }
  };

  const openEditDialog = (bot: typeof chatbots[0]) => {
    setFormData({
      name: bot.name,
      description: bot.description || '',
      whatsapp_connection_id: bot.whatsapp_connection_id || undefined,
      llm_provider: bot.llm_provider,
      llm_model: bot.llm_model,
      system_prompt: bot.system_prompt || '',
      welcome_message: bot.welcome_message || '',
      temperature: bot.temperature,
      max_tokens: bot.max_tokens,
      is_active: bot.is_active,
      auto_create_leads: bot.auto_create_leads,
    });
    setEditingBot(bot.id);
    setShowCreateDialog(true);
  };

  const selectedProvider = LLM_PROVIDERS[formData.llm_provider];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn("flex items-center justify-between gap-4 flex-wrap", isRTL && "flex-row-reverse")}>
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {isRTL ? 'روبوتات المحادثة' : 'Chatbots'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'إنشاء وإدارة روبوتات محادثة متعددة' : 'Create and manage multiple AI chatbots'}
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowCreateDialog(true); }}
          className="gap-2"
          disabled={whatsappConnections.length === 0}
        >
          <Plus className="h-4 w-4" />
          {isRTL ? 'إنشاء روبوت' : 'Create Chatbot'}
        </Button>
      </div>

      {whatsappConnections.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800">
          <MessageSquare className="h-5 w-5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              {isRTL ? 'مطلوب اتصال WhatsApp' : 'WhatsApp Connection Required'}
            </h4>
            <p className="text-xs text-amber-700/80">
              {isRTL
                ? 'يجب ربط حساب WhatsApp Business قبل إنشاء أي روبوت.'
                : 'You must connect a WhatsApp Business account before creating any chatbots.'}
            </p>
          </div>
          <Button variant="outline" size="sm" className="bg-white border-amber-200 hover:bg-amber-50 text-amber-900" onClick={() => window.location.href = '/connections'}>
            {isRTL ? 'الذهاب للربط' : 'Connect Now'}
          </Button>
        </div>
      )}

      {/* Chatbots Grid */}
      {chatbots.length === 0 ? (
        <div className="grid gap-6">
          <Card className="border-dashed border-2">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{isRTL ? 'لا توجد روبوتات' : 'No Chatbots Yet'}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {isRTL ? 'ابدأ بإنشاء روبوت جديد أو استخدم أحد القوالب الجاهزة' : 'Start by creating a new bot or use one of our ready-made templates'}
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="gap-2"
                disabled={whatsappConnections.length === 0}
              >
                <Plus className="h-4 w-4" />
                {isRTL ? 'إنشاء روبوت مخصص' : 'Create Custom Chatbot'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {isRTL ? 'قوالب مقترحة' : 'Suggested Templates'}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Lead Qualification', desc: 'Ask about budget, location, and preferences.', icon: Sparkles },
                { title: 'Customer Support', desc: 'Answer FAQs and forward complex issues.', icon: MessageSquare },
                { title: 'Appointment Booking', desc: 'Schedule calls or viewings automatically.', icon: Bot }
              ].map((tpl, i) => (
                <Card key={i} className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group" onClick={() => {
                  if (whatsappConnections.length > 0) {
                    setFormData({ ...formData, name: tpl.title, description: tpl.desc });
                    setShowCreateDialog(true);
                  }
                }}>
                  <CardHeader className="p-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                      <tpl.icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-medium">{tpl.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">{tpl.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chatbots.map(bot => (
            <Card key={bot.id} className={cn(
              "transition-all hover:shadow-md",
              !bot.is_active && "opacity-60"
            )}>
              <CardHeader className="pb-3">
                <div className={cn("flex items-start justify-between", isRTL && "flex-row-reverse")}>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      {bot.name}
                    </CardTitle>
                    {bot.description && (
                      <CardDescription className="mt-1">{bot.description}</CardDescription>
                    )}
                  </div>
                  <Switch
                    checked={bot.is_active}
                    onCheckedChange={() => toggleChatbot(bot.id)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {LLM_PROVIDERS[bot.llm_provider].name}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {bot.llm_model.split('/').pop()}
                  </Badge>
                  {bot.is_active ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                      <Power className="h-3 w-3" />
                      {isRTL ? 'نشط' : 'Active'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <PowerOff className="h-3 w-3" />
                      {isRTL ? 'متوقف' : 'Inactive'}
                    </Badge>
                  )}
                </div>

                {bot.whatsapp_connection_id && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    {whatsappConnections.find(c => c.id === bot.whatsapp_connection_id)?.displayName || 'WhatsApp Connected'}
                  </div>
                )}

                <div className={cn("flex items-center gap-2 pt-2", isRTL && "flex-row-reverse")}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(bot)}
                    className="flex-1 gap-1"
                  >
                    <Settings2 className="h-4 w-4" />
                    {isRTL ? 'إعدادات' : 'Settings'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{isRTL ? 'حذف الروبوت؟' : 'Delete Chatbot?'}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {isRTL
                            ? 'سيتم حذف هذا الروبوت نهائياً. لا يمكن التراجع عن هذا الإجراء.'
                            : 'This chatbot will be permanently deleted. This action cannot be undone.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteChatbot(bot.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {isRTL ? 'حذف' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {editingBot
                ? (isRTL ? 'تعديل الروبوت' : 'Edit Chatbot')
                : (isRTL ? 'إنشاء روبوت جديد' : 'Create New Chatbot')}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'اختر نموذج الذكاء الاصطناعي وخصص سلوك الروبوت'
                : 'Choose an AI model and customize the chatbot behavior'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'معلومات أساسية' : 'Basic Information'}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isRTL ? 'اسم الروبوت' : 'Chatbot Name'}</Label>
                  <Input
                    placeholder={isRTL ? 'مساعد المبيعات' : 'Sales Assistant'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'اتصال WhatsApp' : 'WhatsApp Connection'}</Label>
                  <Select
                    value={formData.whatsapp_connection_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, whatsapp_connection_id: value === 'none' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? 'اختر اتصال' : 'Select connection'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{isRTL ? 'بدون' : 'None'}</SelectItem>
                      {whatsappConnections.map(conn => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.displayName} ({conn.phoneNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'الوصف' : 'Description'}</Label>
                <Input
                  placeholder={isRTL ? 'روبوت لمساعدة العملاء' : 'A bot to help customers'}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* AI Model Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {isRTL ? 'إعدادات نموذج الذكاء الاصطناعي' : 'AI Model Configuration'}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isRTL ? 'مزود الذكاء الاصطناعي' : 'AI Provider'}</Label>
                  <Select
                    value={formData.llm_provider}
                    onValueChange={(value: LLMProvider) => {
                      const provider = LLM_PROVIDERS[value];
                      setFormData({
                        ...formData,
                        llm_provider: value,
                        llm_model: provider.models[0].id,
                        llm_api_key: provider.requiresApiKey ? '' : undefined,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LLM_PROVIDERS).map(([key, provider]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {provider.requiresApiKey && <Key className="h-3 w-3 text-muted-foreground" />}
                            <span>{provider.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? 'النموذج' : 'Model'}</Label>
                  <Select
                    value={formData.llm_model}
                    onValueChange={(value) => setFormData({ ...formData, llm_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProvider.models.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div>
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">- {model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedProvider.requiresApiKey && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    {isRTL ? 'مفتاح API' : 'API Key'}
                  </Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={formData.llm_api_key || ''}
                    onChange={(e) => setFormData({ ...formData, llm_api_key: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'مفتاح API الخاص بك لهذا المزود' : 'Your API key for this provider'}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isRTL ? 'درجة الحرارة' : 'Temperature'}: {formData.temperature}</Label>
                  <Slider
                    value={[formData.temperature || 0.7]}
                    onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'أقل = أكثر تركيزاً، أعلى = أكثر إبداعاً' : 'Lower = more focused, Higher = more creative'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الحد الأقصى للرموز' : 'Max Tokens'}</Label>
                  <Input
                    type="number"
                    value={formData.max_tokens || 1000}
                    onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 1000 })}
                    min={100}
                    max={4000}
                  />
                </div>
              </div>
            </div>

            {/* Behavior */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'سلوك الروبوت' : 'Chatbot Behavior'}
              </h3>

              <div className="space-y-2">
                <Label>{isRTL ? 'رسالة الترحيب' : 'Welcome Message'}</Label>
                <Input
                  placeholder={isRTL ? 'مرحباً! كيف يمكنني مساعدتك؟' : 'Hello! How can I help you?'}
                  value={formData.welcome_message || ''}
                  onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? 'تعليمات النظام' : 'System Prompt'}</Label>
                <Textarea
                  placeholder={isRTL ? 'أنت مساعد عقاري مفيد...' : 'You are a helpful real estate assistant...'}
                  value={formData.system_prompt || ''}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'تعليمات تحدد شخصية وسلوك الروبوت' : 'Instructions that define the chatbot personality and behavior'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={editingBot ? handleUpdate : handleCreate} disabled={!formData.name}>
              {editingBot
                ? (isRTL ? 'حفظ التغييرات' : 'Save Changes')
                : (isRTL ? 'إنشاء الروبوت' : 'Create Chatbot')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
