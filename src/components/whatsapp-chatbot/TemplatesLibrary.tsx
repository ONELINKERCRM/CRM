import { useState } from 'react';
import { 
  Search, Plus, Edit, Trash2, Copy, Check, Star, StarOff,
  Filter, LayoutGrid, List, ChevronDown, MessageCircle,
  Home, DollarSign, Calendar, MapPin, FileText, Phone,
  Sparkles, Eye, ExternalLink, RefreshCw, Clock, Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  content: string;
  contentAr: string;
  variables: string[];
  status: 'approved' | 'pending' | 'rejected';
  isFavorite: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const categories = [
  { id: 'greeting', label: 'Greetings', labelAr: 'التحيات', icon: MessageCircle, color: 'text-green-500' },
  { id: 'property', label: 'Property Info', labelAr: 'معلومات العقار', icon: Home, color: 'text-blue-500' },
  { id: 'pricing', label: 'Pricing', labelAr: 'التسعير', icon: DollarSign, color: 'text-amber-500' },
  { id: 'viewing', label: 'Viewings', labelAr: 'المعاينات', icon: Calendar, color: 'text-purple-500' },
  { id: 'location', label: 'Location', labelAr: 'الموقع', icon: MapPin, color: 'text-red-500' },
  { id: 'documents', label: 'Documents', labelAr: 'المستندات', icon: FileText, color: 'text-cyan-500' },
  { id: 'followup', label: 'Follow-up', labelAr: 'المتابعة', icon: Phone, color: 'text-pink-500' },
];

const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'Welcome Message',
    nameAr: 'رسالة الترحيب',
    category: 'greeting',
    content: 'Hello {{name}}! 👋 Thank you for reaching out to OneLinker Properties. I\'m {{agent_name}}, and I\'ll be assisting you today. How can I help you find your perfect property?',
    contentAr: 'مرحباً {{name}}! 👋 شكراً لتواصلك مع OneLinker Properties. أنا {{agent_name}}، وسأساعدك اليوم. كيف يمكنني مساعدتك في العثور على العقار المثالي؟',
    variables: ['name', 'agent_name'],
    status: 'approved',
    isFavorite: true,
    usageCount: 245,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: '2',
    name: 'Property Details',
    nameAr: 'تفاصيل العقار',
    category: 'property',
    content: 'Here are the details for {{property_name}}:\n\n🏠 Type: {{property_type}}\n📍 Location: {{location}}\n🛏️ Bedrooms: {{bedrooms}}\n🚿 Bathrooms: {{bathrooms}}\n📐 Size: {{size}} sq ft\n💰 Price: {{price}} AED\n\nWould you like to schedule a viewing?',
    contentAr: 'إليك تفاصيل {{property_name}}:\n\n🏠 النوع: {{property_type}}\n📍 الموقع: {{location}}\n🛏️ غرف النوم: {{bedrooms}}\n🚿 الحمامات: {{bathrooms}}\n📐 المساحة: {{size}} قدم مربع\n💰 السعر: {{price}} درهم\n\nهل ترغب في جدولة معاينة؟',
    variables: ['property_name', 'property_type', 'location', 'bedrooms', 'bathrooms', 'size', 'price'],
    status: 'approved',
    isFavorite: true,
    usageCount: 189,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-03-18'),
  },
  {
    id: '3',
    name: 'Viewing Confirmation',
    nameAr: 'تأكيد المعاينة',
    category: 'viewing',
    content: 'Your viewing is confirmed! ✅\n\n📅 Date: {{date}}\n⏰ Time: {{time}}\n📍 Property: {{property_name}}\n📍 Address: {{address}}\n\nI\'ll meet you there. Please bring a valid ID. See you soon! 🏠',
    contentAr: 'تم تأكيد موعد المعاينة! ✅\n\n📅 التاريخ: {{date}}\n⏰ الوقت: {{time}}\n📍 العقار: {{property_name}}\n📍 العنوان: {{address}}\n\nسأقابلك هناك. يرجى إحضار هوية صالحة. أراك قريباً! 🏠',
    variables: ['date', 'time', 'property_name', 'address'],
    status: 'approved',
    isFavorite: false,
    usageCount: 156,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-15'),
  },
  {
    id: '4',
    name: 'Price Negotiation',
    nameAr: 'التفاوض على السعر',
    category: 'pricing',
    content: 'Thank you for your offer of {{offer_amount}} AED for {{property_name}}.\n\nI\'ve discussed with the owner, and they\'re willing to negotiate. The best price we can offer is {{final_price}} AED.\n\nThis is a competitive price for this area. Would you like to proceed?',
    contentAr: 'شكراً لعرضك بقيمة {{offer_amount}} درهم لـ {{property_name}}.\n\nلقد ناقشت الأمر مع المالك، وهو مستعد للتفاوض. أفضل سعر يمكننا تقديمه هو {{final_price}} درهم.\n\nهذا سعر تنافسي لهذه المنطقة. هل ترغب في المتابعة؟',
    variables: ['offer_amount', 'property_name', 'final_price'],
    status: 'approved',
    isFavorite: false,
    usageCount: 87,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: '5',
    name: 'Location Benefits',
    nameAr: 'مميزات الموقع',
    category: 'location',
    content: '{{property_name}} is located in {{area}}, one of the most sought-after areas in Dubai! 🌟\n\nNearby amenities:\n🛒 Mall: {{distance_mall}} mins\n🏫 School: {{distance_school}} mins\n🚇 Metro: {{distance_metro}} mins\n🏖️ Beach: {{distance_beach}} mins\n\nWould you like more details about the community?',
    contentAr: '{{property_name}} يقع في {{area}}، واحدة من أكثر المناطق طلباً في دبي! 🌟\n\nالمرافق القريبة:\n🛒 المول: {{distance_mall}} دقائق\n🏫 المدرسة: {{distance_school}} دقائق\n🚇 المترو: {{distance_metro}} دقائق\n🏖️ الشاطئ: {{distance_beach}} دقائق\n\nهل ترغب في مزيد من التفاصيل عن المجتمع؟',
    variables: ['property_name', 'area', 'distance_mall', 'distance_school', 'distance_metro', 'distance_beach'],
    status: 'approved',
    isFavorite: true,
    usageCount: 134,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-03-05'),
  },
  {
    id: '6',
    name: 'Document Request',
    nameAr: 'طلب المستندات',
    category: 'documents',
    content: 'To proceed with the {{process_type}}, please provide the following documents:\n\n📄 Valid Passport Copy\n📄 Emirates ID (front & back)\n📄 Visa Copy\n📄 Salary Certificate / Bank Statement\n\nYou can send them here on WhatsApp or email to {{email}}. Let me know if you have any questions!',
    contentAr: 'للمضي قدماً في {{process_type}}، يرجى تقديم المستندات التالية:\n\n📄 نسخة جواز السفر الصالح\n📄 الهوية الإماراتية (أمام وخلف)\n📄 نسخة التأشيرة\n📄 شهادة الراتب / كشف حساب بنكي\n\nيمكنك إرسالها هنا على واتساب أو البريد الإلكتروني إلى {{email}}. أخبرني إذا كان لديك أي أسئلة!',
    variables: ['process_type', 'email'],
    status: 'approved',
    isFavorite: false,
    usageCount: 98,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: '7',
    name: 'Follow-up Message',
    nameAr: 'رسالة المتابعة',
    category: 'followup',
    content: 'Hi {{name}}! 👋\n\nJust following up on our conversation about {{property_name}}. Have you had a chance to consider the property?\n\nI wanted to let you know that there\'s been increased interest in this listing. Would you like to schedule another viewing or discuss any concerns?\n\nLooking forward to hearing from you! 🏠',
    contentAr: 'مرحباً {{name}}! 👋\n\nأتابع معك بخصوص محادثتنا حول {{property_name}}. هل أتيحت لك الفرصة للتفكير في العقار؟\n\nأردت أن أعلمك أن هناك اهتماماً متزايداً بهذا العقار. هل ترغب في جدولة معاينة أخرى أو مناقشة أي استفسارات؟\n\nأتطلع لسماع ردك! 🏠',
    variables: ['name', 'property_name'],
    status: 'approved',
    isFavorite: true,
    usageCount: 167,
    createdAt: new Date('2024-02-25'),
    updatedAt: new Date('2024-03-12'),
  },
  {
    id: '8',
    name: 'New Listing Alert',
    nameAr: 'تنبيه قائمة جديدة',
    category: 'property',
    content: '🚨 New Listing Alert!\n\nBased on your preferences, I found a perfect match:\n\n🏠 {{property_name}}\n📍 {{location}}\n🛏️ {{bedrooms}} BR | {{bathrooms}} Bath\n💰 {{price}} AED\n\nThis just hit the market! Want to be first to view it?',
    contentAr: '🚨 تنبيه قائمة جديدة!\n\nبناءً على تفضيلاتك، وجدت خياراً مثالياً:\n\n🏠 {{property_name}}\n📍 {{location}}\n🛏️ {{bedrooms}} غرف | {{bathrooms}} حمام\n💰 {{price}} درهم\n\nهذا العقار جديد في السوق! هل ترغب في أن تكون أول من يشاهده؟',
    variables: ['property_name', 'location', 'bedrooms', 'bathrooms', 'price'],
    status: 'pending',
    isFavorite: false,
    usageCount: 0,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-20'),
  },
];

const emptyTemplate: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> = {
  name: '',
  nameAr: '',
  category: 'greeting',
  content: '',
  contentAr: '',
  variables: [],
  status: 'pending',
  isFavorite: false,
};

export function TemplatesLibrary() {
  const { isRTL } = useLanguageSafe();
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState(emptyTemplate);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.nameAr.includes(search) ||
      t.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesFavorites = !showFavoritesOnly || t.isFavorite;
    return matchesSearch && matchesCategory && matchesStatus && matchesFavorites;
  });

  const handleCopy = (template: Template) => {
    navigator.clipboard.writeText(isRTL ? template.contentAr : template.content);
    setCopiedId(template.id);
    toast.success(isRTL ? 'تم نسخ القالب' : 'Template copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleFavorite = (id: string) => {
    setTemplates(templates.map(t => 
      t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
    ));
  };

  const handleCreate = () => {
    const template: Template = {
      ...newTemplate,
      id: `t_${Date.now()}`,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTemplates([template, ...templates]);
    setNewTemplate(emptyTemplate);
    setIsCreateOpen(false);
    toast.success(isRTL ? 'تم إنشاء القالب' : 'Template created');
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;
    setTemplates(templates.map(t => 
      t.id === editingTemplate.id ? { ...editingTemplate, updatedAt: new Date() } : t
    ));
    setIsEditOpen(false);
    setEditingTemplate(null);
    toast.success(isRTL ? 'تم تحديث القالب' : 'Template updated');
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success(isRTL ? 'تم حذف القالب' : 'Template deleted');
  };

  const handleSyncFromMeta = () => {
    setIsSyncing(true);
    setTimeout(() => {
      toast.success(isRTL ? 'تمت مزامنة القوالب من Meta' : 'Templates synced from Meta');
      setIsSyncing(false);
    }, 2000);
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  };

  const getStatusBadge = (status: Template['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId) || categories[0];
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            {isRTL ? 'مكتبة القوالب' : 'Templates Library'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRTL ? `${templates.length} قالب متاح` : `${templates.length} templates available`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSyncFromMeta} disabled={isSyncing} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline">{isRTL ? 'مزامنة Meta' : 'Sync Meta'}</span>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {isRTL ? 'قالب جديد' : 'New Template'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isRTL ? 'إنشاء قالب جديد' : 'Create New Template'}</DialogTitle>
                <DialogDescription>
                  {isRTL ? 'أنشئ قالب رسالة جديد للردود السريعة' : 'Create a new message template for quick responses'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{isRTL ? 'الاسم (English)' : 'Name (English)'}</Label>
                    <Input
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      placeholder="e.g., Welcome Message"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isRTL ? 'الاسم (العربية)' : 'Name (Arabic)'}</Label>
                    <Input
                      value={newTemplate.nameAr}
                      onChange={(e) => setNewTemplate({ ...newTemplate, nameAr: e.target.value })}
                      placeholder="مثال: رسالة الترحيب"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الفئة' : 'Category'}</Label>
                  <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <cat.icon className={cn("h-4 w-4", cat.color)} />
                            {isRTL ? cat.labelAr : cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'المحتوى (English)' : 'Content (English)'}</Label>
                  <Textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ 
                      ...newTemplate, 
                      content: e.target.value,
                      variables: extractVariables(e.target.value)
                    })}
                    placeholder="Use {{variable}} for dynamic content"
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'المحتوى (العربية)' : 'Content (Arabic)'}</Label>
                  <Textarea
                    value={newTemplate.contentAr}
                    onChange={(e) => setNewTemplate({ ...newTemplate, contentAr: e.target.value })}
                    placeholder="استخدم {{variable}} للمحتوى الديناميكي"
                    rows={5}
                    dir="rtl"
                  />
                </div>
                {newTemplate.variables.length > 0 && (
                  <div className="space-y-2">
                    <Label>{isRTL ? 'المتغيرات المكتشفة' : 'Detected Variables'}</Label>
                    <div className="flex flex-wrap gap-1">
                      {newTemplate.variables.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button onClick={handleCreate} disabled={!newTemplate.name || !newTemplate.content}>
                  {isRTL ? 'إنشاء' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'بحث في القوالب...' : 'Search templates...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder={isRTL ? 'الفئة' : 'Category'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All Categories'}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {isRTL ? cat.labelAr : cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="approved">{isRTL ? 'موافق' : 'Approved'}</SelectItem>
                  <SelectItem value="pending">{isRTL ? 'معلق' : 'Pending'}</SelectItem>
                  <SelectItem value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showFavoritesOnly ? 'secondary' : 'outline'}
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-amber-500 text-amber-500")} />
              </Button>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid/List */}
      <div className={cn(
        viewMode === 'grid' 
          ? "grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "space-y-3"
      )}>
        {filteredTemplates.map((template) => {
          const categoryInfo = getCategoryInfo(template.category);
          return (
            <Card 
              key={template.id} 
              className={cn(
                "bg-card/50 backdrop-blur-sm transition-all hover:shadow-md group",
                viewMode === 'list' && "flex flex-col md:flex-row"
              )}
            >
              <CardContent className={cn(
                "p-4",
                viewMode === 'list' && "flex-1 flex flex-col md:flex-row gap-4"
              )}>
                <div className={cn("flex-1", viewMode === 'list' && "md:flex md:gap-4")}>
                  {/* Header */}
                  <div className={cn("flex items-start justify-between gap-2 mb-3", viewMode === 'list' && "md:w-48 md:shrink-0 md:mb-0")}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-muted", categoryInfo.color)}>
                        <categoryInfo.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm truncate">
                          {isRTL ? template.nameAr : template.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          {isRTL ? categoryInfo.labelAr : categoryInfo.label}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleToggleFavorite(template.id)}
                    >
                      {template.isFavorite ? (
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>

                  {/* Content Preview */}
                  <div className={cn("mb-3", viewMode === 'list' && "flex-1 md:mb-0")}>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                      {isRTL ? template.contentAr : template.content}
                    </p>
                  </div>

                  {/* Variables & Status */}
                  <div className={cn("flex items-center justify-between gap-2 flex-wrap", viewMode === 'list' && "md:w-48 md:shrink-0 md:flex-col md:items-end")}>
                    <div className="flex items-center gap-1 flex-wrap">
                      {getStatusBadge(template.status)}
                      <Badge variant="outline" className="text-[10px]">
                        {template.usageCount} {isRTL ? 'استخدام' : 'uses'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(template)}
                      >
                        {copiedId === template.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{isRTL ? 'حذف القالب؟' : 'Delete Template?'}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {isRTL ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.'}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-destructive text-destructive-foreground">
                              {isRTL ? 'حذف' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-foreground mb-1">
            {isRTL ? 'لا توجد قوالب' : 'No templates found'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRTL ? 'جرب تغيير الفلاتر أو إنشاء قالب جديد' : 'Try adjusting filters or create a new template'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تعديل القالب' : 'Edit Template'}</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isRTL ? 'الاسم (English)' : 'Name (English)'}</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الاسم (العربية)' : 'Name (Arabic)'}</Label>
                  <Input
                    value={editingTemplate.nameAr}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, nameAr: e.target.value })}
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'الفئة' : 'Category'}</Label>
                <Select value={editingTemplate.category} onValueChange={(v) => setEditingTemplate({ ...editingTemplate, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <cat.icon className={cn("h-4 w-4", cat.color)} />
                          {isRTL ? cat.labelAr : cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'المحتوى (English)' : 'Content (English)'}</Label>
                <Textarea
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({ 
                    ...editingTemplate, 
                    content: e.target.value,
                    variables: extractVariables(e.target.value)
                  })}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'المحتوى (العربية)' : 'Content (Arabic)'}</Label>
                <Textarea
                  value={editingTemplate.contentAr}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, contentAr: e.target.value })}
                  rows={5}
                  dir="rtl"
                />
              </div>
              {editingTemplate.variables.length > 0 && (
                <div className="space-y-2">
                  <Label>{isRTL ? 'المتغيرات' : 'Variables'}</Label>
                  <div className="flex flex-wrap gap-1">
                    {editingTemplate.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveEdit}>
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
