import { useState, useEffect } from 'react';
import {
  MessageCircle, BarChart3, Settings2, ArrowLeft, Bell, BellDot,
  Bot, Brain, Rocket, FileText, Sparkles, FlaskConical
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppInbox } from '@/components/whatsapp-chatbot/WhatsAppInbox';
import { WhatsAppThread } from '@/components/whatsapp-chatbot/WhatsAppThread';
import { WhatsAppSettings } from '@/components/whatsapp-chatbot/WhatsAppSettings';
import { WhatsAppAnalytics } from '@/components/whatsapp-chatbot/WhatsAppAnalytics';
import { ChatbotFlowBuilder } from '@/components/whatsapp-chatbot/ChatbotFlowBuilder';
import { AITrainingPanel } from '@/components/whatsapp-chatbot/AITrainingPanel';
import { DeploymentControls } from '@/components/whatsapp-chatbot/DeploymentControls';
import { TemplatesLibrary } from '@/components/whatsapp-chatbot/TemplatesLibrary';
import { ChatbotManager } from '@/components/whatsapp-chatbot/ChatbotManager';
import { ChatbotTester } from '@/components/whatsapp-chatbot/ChatbotTester';
import { mockConversations, mockMessages } from '@/components/whatsapp-chatbot/mockData';
import { WhatsAppConversation, WhatsAppMessage } from '@/components/whatsapp-chatbot/types';
import { useWhatsAppInbox } from '@/hooks/useWhatsAppInbox';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { WhatsAppChatbotPageSkeleton } from '@/components/ui/page-skeletons';

export default function WhatsAppChatbotPage() {
  const { isRTL } = useLanguageSafe();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bots' | 'test' | 'inbox' | 'templates' | 'flow' | 'training' | 'deploy' | 'analytics' | 'settings'>('bots');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);
  const { conversations: realConversations, messages: realMessages, isLoading: isInboxLoading, fetchMessages, sendMessage } = useWhatsAppInbox();
  // Fallback to mock data if no real data (for demo purposes) - In production remove this
  const conversations = realConversations.length > 0 ? realConversations : mockConversations;
  const messages = realMessages; // We'll manage messages via the hook

  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);

  // We don't need local state for messages anymore as the hook manages it, 
  // but we might need to merging mock messages if we are in demo mode.
  // For production readiness, we should rely on the hook.

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleSelectConversation = (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    if (isMobile) {
      setShowMobileThread(true);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    if (realConversations.length > 0) {
      await sendMessage(selectedConversation.id, content);
    } else {
      // Mock send for demo
      toast.success(isRTL ? 'تم إرسال الرسالة (تجريبي)' : 'Message sent (Demo)');
    }
  };

  const handleBackToList = () => {
    setShowMobileThread(false);
  };

  if (isLoading) {
    return <WhatsAppChatbotPageSkeleton isMobile={isMobile} />;
  }

  // Mobile Tabs Component
  const MobileTabBar = () => (
    <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-card/50 overflow-x-auto scrollbar-hide">
      <Button variant={activeTab === 'bots' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('bots')}>
        <Sparkles className="h-4 w-4" />
        {isRTL ? 'الروبوتات' : 'Bots'}
      </Button>
      <Button variant={activeTab === 'test' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('test')}>
        <FlaskConical className="h-4 w-4" />
        {isRTL ? 'اختبار' : 'Test'}
      </Button>
      <Button variant={activeTab === 'inbox' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('inbox')}>
        <MessageCircle className="h-4 w-4" />
        {isRTL ? 'الوارد' : 'Inbox'}
        {totalUnread > 0 && <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[10px]">{totalUnread}</Badge>}
      </Button>
      <Button variant={activeTab === 'templates' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('templates')}>
        <FileText className="h-4 w-4" />
        {isRTL ? 'القوالب' : 'Templates'}
      </Button>
      <Button variant={activeTab === 'flow' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('flow')}>
        <Bot className="h-4 w-4" />
        {isRTL ? 'التدفق' : 'Flow'}
      </Button>
      <Button variant={activeTab === 'training' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('training')}>
        <Brain className="h-4 w-4" />
        {isRTL ? 'التدريب' : 'Training'}
      </Button>
      <Button variant={activeTab === 'deploy' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('deploy')}>
        <Rocket className="h-4 w-4" />
        {isRTL ? 'النشر' : 'Deploy'}
      </Button>
      <Button variant={activeTab === 'analytics' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('analytics')}>
        <BarChart3 className="h-4 w-4" />
        {isRTL ? 'التحليلات' : 'Analytics'}
      </Button>
      <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 shrink-0" onClick={() => setActiveTab('settings')}>
        <Settings2 className="h-4 w-4" />
        {isRTL ? 'الإعدادات' : 'Settings'}
      </Button>
    </div>
  );

  // Mobile view
  if (isMobile) {
    // Show message thread when selected on mobile
    if (showMobileThread && selectedConversation) {
      return (
        <div className="h-[calc(100dvh-130px)] flex flex-col">
          <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-card/50">
            <Button variant="ghost" size="icon" onClick={handleBackToList}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-medium">{selectedConversation.leadName}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <WhatsAppThread
              conversation={selectedConversation}
              messages={messages[selectedConversation.id] || []}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="h-[calc(100dvh-130px)] flex flex-col">
        <MobileTabBar />
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'bots' && <ChatbotManager />}
          {activeTab === 'test' && <ChatbotTester />}
          {activeTab === 'inbox' && (
            <WhatsAppInbox conversations={conversations} selectedId={selectedConversation?.id} onSelect={handleSelectConversation} />
          )}
          {activeTab === 'templates' && <TemplatesLibrary />}
          {activeTab === 'flow' && <ChatbotFlowBuilder />}
          {activeTab === 'training' && <AITrainingPanel />}
          {activeTab === 'deploy' && <DeploymentControls />}
          {activeTab === 'analytics' && <WhatsAppAnalytics />}
          {activeTab === 'settings' && <WhatsAppSettings />}
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isRTL ? 'بوت WhatsApp' : 'WhatsApp Chatbot'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'إدارة المحادثات وتأهيل العملاء' : 'Manage conversations and qualify leads'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          {totalUnread > 0 ? <BellDot className="h-4 w-4 text-destructive" /> : <Bell className="h-4 w-4" />}
          {isRTL ? 'الإشعارات' : 'Notifications'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-180px)] sm:h-[calc(100vh-140px)] lg:h-[calc(100vh-120px)] min-h-[500px]">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
          <TabsList className="bg-muted/50 w-fit overflow-x-auto shrink-0 touch-pan-x">
            <TabsTrigger value="bots" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {isRTL ? 'الروبوتات' : 'Bots'}
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              {isRTL ? 'اختبار' : 'Test'}
            </TabsTrigger>
            <TabsTrigger value="inbox" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {isRTL ? 'الوارد' : 'Inbox'}
              {totalUnread > 0 && <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">{totalUnread}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              {isRTL ? 'القوالب' : 'Templates'}
            </TabsTrigger>
            <TabsTrigger value="flow" className="gap-2">
              <Bot className="h-4 w-4" />
              {isRTL ? 'التدفق' : 'Flow'}
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-2">
              <Brain className="h-4 w-4" />
              {isRTL ? 'التدريب' : 'Training'}
            </TabsTrigger>
            <TabsTrigger value="deploy" className="gap-2">
              <Rocket className="h-4 w-4" />
              {isRTL ? 'النشر' : 'Deploy'}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {isRTL ? 'التحليلات' : 'Analytics'}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="h-4 w-4" />
              {isRTL ? 'الإعدادات' : 'Settings'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bots" className="flex-1 m-0 mt-4 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl p-4">
            <ChatbotManager />
          </TabsContent>

          <TabsContent value="test" className="flex-1 m-0 mt-4 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl p-4">
            <ChatbotTester />
          </TabsContent>

          <TabsContent value="inbox" className="flex-1 min-h-0 m-0 mt-4 overflow-hidden outline-none data-[state=inactive]:hidden">
            <div className="h-full grid grid-cols-12 gap-0 rounded-xl overflow-hidden border border-border/50 bg-card/30 backdrop-blur-xl">
              {/* Conversation List */}
              <div className="hidden lg:block lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
                <WhatsAppInbox
                  conversations={conversations}
                  selectedId={selectedConversation?.id}
                  onSelect={handleSelectConversation}
                />
              </div>

              {/* Message Thread */}
              <div className="col-span-12 lg:col-span-8 xl:col-span-9 h-full overflow-hidden border-l border-border/50">
                {!selectedConversation && (
                  <div className="lg:hidden h-full">
                    <WhatsAppInbox
                      conversations={conversations}
                      selectedId={selectedConversation?.id}
                      onSelect={(conv) => {
                        handleSelectConversation(conv);
                        // Force desktop thread view logic if needed, but here we just rely on state
                      }}
                    />
                  </div>
                )}
                {selectedConversation ? (
                  <div className="h-full flex flex-col">
                    <div className="lg:hidden p-2 border-b flex items-center">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>
                    <WhatsAppThread
                      conversation={selectedConversation}
                      messages={messages[selectedConversation.id] || []}
                      onSendMessage={handleSendMessage}
                    />
                  </div>
                ) : (
                  <div className="hidden lg:flex h-full flex-col items-center justify-center text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <MessageCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">
                      {isRTL ? 'اختر محادثة' : 'Select a conversation'}
                    </h3>
                    <p className="text-sm">
                      {isRTL ? 'اختر محادثة من القائمة للبدء' : 'Choose a conversation from the list to start'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="flex-1 m-0 mt-4 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl">
            <TemplatesLibrary />
          </TabsContent>

          <TabsContent value="flow" className="flex-1 m-0 mt-4 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl">
            <ChatbotFlowBuilder />
          </TabsContent>

          <TabsContent value="training" className="flex-1 m-0 mt-4 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl">
            <AITrainingPanel />
          </TabsContent>

          <TabsContent value="deploy" className="flex-1 m-0 mt-4 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl">
            <DeploymentControls />
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 m-0 mt-4 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl">
            <WhatsAppAnalytics />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 m-0 mt-4 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl">
            <WhatsAppSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
