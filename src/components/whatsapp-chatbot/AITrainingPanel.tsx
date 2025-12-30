import { useState } from 'react';
import { 
  Brain, Upload, FileText, Plus, Trash2, Save,
  Sparkles, RefreshCw, CheckCircle, AlertCircle, Zap,
  BookOpen, MessageSquare, HelpCircle, TestTube
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TrainingDocument {
  id: string;
  name: string;
  type: 'faq' | 'conversation' | 'knowledge' | 'rules';
  status: 'pending' | 'processing' | 'trained' | 'error';
  progress: number;
  addedAt: Date;
}

interface FAQItem {
  id: string;
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
  category: string;
}

const mockDocuments: TrainingDocument[] = [
  { id: '1', name: 'Real Estate FAQs.pdf', type: 'faq', status: 'trained', progress: 100, addedAt: new Date() },
  { id: '2', name: 'Property Types Guide.docx', type: 'knowledge', status: 'trained', progress: 100, addedAt: new Date() },
  { id: '3', name: 'Sample Conversations.json', type: 'conversation', status: 'processing', progress: 67, addedAt: new Date() },
];

const mockFAQs: FAQItem[] = [
  {
    id: '1',
    question: 'What areas do you cover?',
    questionAr: 'ما هي المناطق التي تغطونها؟',
    answer: 'We cover all major areas in Dubai including Downtown, Marina, Palm Jumeirah, Business Bay, and JBR.',
    answerAr: 'نغطي جميع المناطق الرئيسية في دبي بما في ذلك داون تاون ومارينا ونخلة جميرا والخليج التجاري وجي بي آر.',
    category: 'Coverage',
  },
  {
    id: '2',
    question: 'What is the buying process?',
    questionAr: 'ما هي عملية الشراء؟',
    answer: 'The buying process includes: 1) Property search 2) Viewing 3) Offer negotiation 4) MOU signing 5) NOC & Transfer',
    answerAr: 'تشمل عملية الشراء: 1) البحث عن العقار 2) المعاينة 3) التفاوض 4) توقيع مذكرة التفاهم 5) شهادة عدم ممانعة والنقل',
    category: 'Process',
  },
  {
    id: '3',
    question: 'Do you offer mortgage assistance?',
    questionAr: 'هل تقدمون مساعدة في الرهن العقاري؟',
    answer: 'Yes! We partner with major banks to offer competitive mortgage rates for residents and non-residents.',
    answerAr: 'نعم! نتعاون مع البنوك الكبرى لتقديم أسعار رهن عقاري تنافسية للمقيمين وغير المقيمين.',
    category: 'Finance',
  },
];

const defaultPrompt = `You are a professional real estate assistant for OneLinker Properties in the UAE. Your role is to:

1. Qualify leads by gathering: Name, Contact, Property Interest, Budget
2. Answer common questions about properties, buying/renting process, and locations
3. Be professional, friendly, and helpful in both English and Arabic
4. Mark leads as Premium if budget exceeds 5M AED
5. Escalate to human agents for complex queries or when requested

Always maintain a conversational tone and provide accurate property information.`;

export function AITrainingPanel() {
  const { isRTL } = useLanguageSafe();
  const [documents, setDocuments] = useState<TrainingDocument[]>(mockDocuments);
  const [faqs, setFAQs] = useState<FAQItem[]>(mockFAQs);
  const [systemPrompt, setSystemPrompt] = useState(defaultPrompt);
  const [aiModel, setAiModel] = useState('google/gemini-2.5-flash');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const handleFileUpload = () => {
    const newDoc: TrainingDocument = {
      id: `doc_${Date.now()}`,
      name: 'New Document.pdf',
      type: 'knowledge',
      status: 'pending',
      progress: 0,
      addedAt: new Date(),
    };
    setDocuments([...documents, newDoc]);
    toast.success(isRTL ? 'تم رفع المستند' : 'Document uploaded');
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter(d => d.id !== id));
    toast.success(isRTL ? 'تم حذف المستند' : 'Document removed');
  };

  const handleAddFAQ = () => {
    const newFAQ: FAQItem = {
      id: `faq_${Date.now()}`,
      question: '',
      questionAr: '',
      answer: '',
      answerAr: '',
      category: 'General',
    };
    setFAQs([...faqs, newFAQ]);
  };

  const handleUpdateFAQ = (id: string, updates: Partial<FAQItem>) => {
    setFAQs(faqs.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveFAQ = (id: string) => {
    setFAQs(faqs.filter(f => f.id !== id));
    toast.success(isRTL ? 'تم حذف السؤال' : 'FAQ removed');
  };

  const handleStartTraining = () => {
    setIsTraining(true);
    setTrainingProgress(0);
    
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          toast.success(isRTL ? 'اكتمل التدريب بنجاح!' : 'Training completed successfully!');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleTestAI = () => {
    if (!testInput.trim()) {
      toast.error(isRTL ? 'أدخل رسالة للاختبار' : 'Enter a message to test');
      return;
    }
    
    setIsTesting(true);
    setTimeout(() => {
      setTestOutput(`Based on your inquiry about "${testInput}", I can help you find the perfect property. We have excellent options in Downtown Dubai and Marina areas that match your requirements. Would you like to schedule a viewing?`);
      setIsTesting(false);
    }, 1500);
  };

  const getStatusBadge = (status: TrainingDocument['status']) => {
    switch (status) {
      case 'trained':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Trained</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6 max-w-4xl mx-auto">
      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-muted/50">
          <TabsTrigger value="prompt" className="gap-1.5 text-xs md:text-sm">
            <Brain className="h-4 w-4" />
            {isRTL ? 'النموذج' : 'Model'}
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5 text-xs md:text-sm">
            <BookOpen className="h-4 w-4" />
            {isRTL ? 'المعرفة' : 'Knowledge'}
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-1.5 text-xs md:text-sm">
            <HelpCircle className="h-4 w-4" />
            {isRTL ? 'الأسئلة الشائعة' : 'FAQs'}
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-1.5 text-xs md:text-sm">
            <TestTube className="h-4 w-4" />
            {isRTL ? 'اختبار' : 'Test'}
          </TabsTrigger>
        </TabsList>

        {/* AI Model & Prompt */}
        <TabsContent value="prompt" className="mt-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                {isRTL ? 'إعدادات النموذج' : 'Model Configuration'}
              </CardTitle>
              <CardDescription>
                {isRTL ? 'اختر النموذج وحدد سلوك AI' : 'Select model and define AI behavior'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'نموذج AI' : 'AI Model'}</Label>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        Gemini 2.5 Flash (Recommended)
                      </div>
                    </SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Gemini 2.5 Pro
                      </div>
                    </SelectItem>
                    <SelectItem value="openai/gpt-5-mini">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-green-500" />
                        GPT-5 Mini
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? 'تعليمات النظام' : 'System Prompt'}</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder="Define how the AI should behave..."
                />
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'يحدد هذا كيف يتصرف AI مع العملاء' : 'This defines how the AI interacts with leads'}
                </p>
              </div>

              <Button onClick={() => toast.success(isRTL ? 'تم حفظ الإعدادات' : 'Settings saved')} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base */}
        <TabsContent value="knowledge" className="mt-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg">
                    {isRTL ? 'قاعدة المعرفة' : 'Knowledge Base'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL ? 'ارفع المستندات لتدريب AI' : 'Upload documents to train AI'}
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleFileUpload} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  {isRTL ? 'رفع' : 'Upload'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{doc.name}</span>
                          {getStatusBadge(doc.status)}
                        </div>
                        {doc.status === 'processing' && (
                          <Progress value={doc.progress} className="h-1.5" />
                        )}
                        <Badge variant="outline" className="text-[10px] mt-1">{doc.type}</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => handleRemoveDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Training Progress */}
              {isTraining && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="h-5 w-5 text-primary animate-pulse" />
                    <span className="font-medium">{isRTL ? 'جاري التدريب...' : 'Training in progress...'}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{trainingProgress}%</span>
                  </div>
                  <Progress value={trainingProgress} className="h-2" />
                </div>
              )}

              <Button 
                onClick={handleStartTraining} 
                disabled={isTraining}
                className="w-full gap-2"
              >
                {isTraining ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isRTL ? 'بدء التدريب' : 'Start Training'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQs */}
        <TabsContent value="faqs" className="mt-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base md:text-lg">
                    {isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
                  </CardTitle>
                  <CardDescription>
                    {isRTL ? 'أضف أسئلة وأجوبة شائعة' : 'Add common questions and answers'}
                  </CardDescription>
                </div>
                <Button size="sm" onClick={handleAddFAQ} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  {isRTL ? 'إضافة' : 'Add'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <Card key={faq.id} className="p-4 bg-muted/20">
                      <div className="flex items-start gap-2 mb-3">
                        <Badge variant="outline" className="shrink-0">{faq.category}</Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive ml-auto shrink-0"
                          onClick={() => handleRemoveFAQ(faq.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Input
                            value={faq.question}
                            onChange={(e) => handleUpdateFAQ(faq.id, { question: e.target.value })}
                            placeholder="Question (English)"
                            className="text-sm"
                          />
                          <Textarea
                            value={faq.answer}
                            onChange={(e) => handleUpdateFAQ(faq.id, { answer: e.target.value })}
                            placeholder="Answer (English)"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Input
                            value={faq.questionAr}
                            onChange={(e) => handleUpdateFAQ(faq.id, { questionAr: e.target.value })}
                            placeholder="السؤال (العربية)"
                            dir="rtl"
                            className="text-sm"
                          />
                          <Textarea
                            value={faq.answerAr}
                            onChange={(e) => handleUpdateFAQ(faq.id, { answerAr: e.target.value })}
                            placeholder="الإجابة (العربية)"
                            rows={2}
                            dir="rtl"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              <Button onClick={() => toast.success(isRTL ? 'تم حفظ الأسئلة' : 'FAQs saved')} className="w-full mt-4">
                <Save className="h-4 w-4 mr-2" />
                {isRTL ? 'حفظ الأسئلة' : 'Save FAQs'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test AI */}
        <TabsContent value="test" className="mt-4 space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <TestTube className="h-5 w-5 text-green-500" />
                {isRTL ? 'اختبار AI' : 'Test AI'}
              </CardTitle>
              <CardDescription>
                {isRTL ? 'اختبر ردود AI قبل النشر' : 'Test AI responses before deployment'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'رسالة الاختبار' : 'Test Message'}</Label>
                <Textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder={isRTL ? 'أدخل رسالة لاختبار رد AI...' : 'Enter a message to test AI response...'}
                  rows={3}
                />
              </div>

              <Button onClick={handleTestAI} disabled={isTesting} className="w-full gap-2">
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isRTL ? 'اختبار الرد' : 'Test Response'}
              </Button>

              {testOutput && (
                <div className="p-4 bg-gradient-to-r from-green-500/5 to-green-500/10 rounded-xl border border-green-500/20">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">{isRTL ? 'رد AI' : 'AI Response'}</p>
                      <p className="text-sm">{testOutput}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
