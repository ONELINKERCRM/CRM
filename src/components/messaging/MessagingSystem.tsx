import { useState } from 'react';
import { 
  Inbox, BarChart3, Settings2, MessageCircle,
  ArrowLeft, Bell, BellDot
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { MessagingAnalytics } from './MessagingAnalytics';
import { ChannelIntegrations } from './ChannelIntegrations';
import { mockConversations, mockMessages } from './mockData';
import { Conversation, Message } from './types';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function MessagingSystem() {
  const { isRTL } = useLanguageSafe();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'inbox' | 'analytics' | 'integrations'>('inbox');
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Mark as read
    setConversations(conversations.map(c => 
      c.id === conversation.id ? { ...c, unreadCount: 0 } : c
    ));
    if (isMobile) {
      setShowMobileThread(true);
    }
  };

  const handleSendMessage = (content: string) => {
    if (!selectedConversation) return;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      conversationId: selectedConversation.id,
      content,
      sender: 'agent',
      channel: selectedConversation.channel,
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages({
      ...messages,
      [selectedConversation.id]: [
        ...(messages[selectedConversation.id] || []),
        newMessage,
      ],
    });

    // Update conversation last message
    setConversations(conversations.map(c => 
      c.id === selectedConversation.id 
        ? { ...c, lastMessage: content, lastMessageTime: new Date() }
        : c
    ));

    toast.success(isRTL ? 'تم إرسال الرسالة' : 'Message sent');
  };

  const handleBackToList = () => {
    setShowMobileThread(false);
  };

  // Mobile Tabs Component
  const MobileTabBar = () => (
    <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-card/50 overflow-x-auto">
      <Button
        variant={activeTab === 'inbox' ? 'secondary' : 'ghost'}
        size="sm"
        className="gap-1.5 shrink-0"
        onClick={() => setActiveTab('inbox')}
      >
        <Inbox className="h-4 w-4" />
        {isRTL ? 'الوارد' : 'Inbox'}
        {totalUnread > 0 && (
          <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[10px]">
            {totalUnread}
          </Badge>
        )}
      </Button>
      <Button
        variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
        size="sm"
        className="gap-1.5 shrink-0"
        onClick={() => setActiveTab('analytics')}
      >
        <BarChart3 className="h-4 w-4" />
        {isRTL ? 'التحليلات' : 'Analytics'}
      </Button>
      <Button
        variant={activeTab === 'integrations' ? 'secondary' : 'ghost'}
        size="sm"
        className="gap-1.5 shrink-0"
        onClick={() => setActiveTab('integrations')}
      >
        <Settings2 className="h-4 w-4" />
        {isRTL ? 'القنوات' : 'Channels'}
      </Button>
    </div>
  );

  // Mobile view
  if (isMobile) {
    // Show message thread when selected on mobile
    if (showMobileThread && selectedConversation) {
      return (
        <div className="h-[calc(100vh-10rem)] flex flex-col">
          <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-card/50">
            <Button variant="ghost" size="icon" onClick={handleBackToList}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-medium">{selectedConversation.leadName}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <MessageThread
              conversation={selectedConversation}
              messages={messages[selectedConversation.id] || []}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-10rem)] flex flex-col">
        <MobileTabBar />
        <div className="flex-1 overflow-hidden">
          {activeTab === 'inbox' && (
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
            />
          )}
          {activeTab === 'analytics' && <MessagingAnalytics />}
          {activeTab === 'integrations' && <ChannelIntegrations />}
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="h-[calc(100vh-12rem)]">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-4 w-4" />
              {isRTL ? 'صندوق الوارد' : 'Inbox'}
              {totalUnread > 0 && (
                <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                  {totalUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {isRTL ? 'التحليلات' : 'Analytics'}
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Settings2 className="h-4 w-4" />
              {isRTL ? 'القنوات' : 'Channels'}
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" className="gap-2">
            {totalUnread > 0 ? <BellDot className="h-4 w-4 text-destructive" /> : <Bell className="h-4 w-4" />}
            {isRTL ? 'الإشعارات' : 'Notifications'}
          </Button>
        </div>

        <TabsContent value="inbox" className="flex-1 m-0 overflow-hidden">
          <div className="h-full grid grid-cols-12 gap-0 rounded-xl overflow-hidden border border-border/50 bg-card/30 backdrop-blur-xl">
            {/* Conversation List */}
            <div className="col-span-4 xl:col-span-3 h-full overflow-hidden">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id}
                onSelect={handleSelectConversation}
              />
            </div>

            {/* Message Thread */}
            <div className="col-span-8 xl:col-span-9 h-full overflow-hidden border-l border-border/50">
              {selectedConversation ? (
                <MessageThread
                  conversation={selectedConversation}
                  messages={messages[selectedConversation.id] || []}
                  onSendMessage={handleSendMessage}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8" />
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

        <TabsContent value="analytics" className="flex-1 m-0 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl">
          <MessagingAnalytics />
        </TabsContent>

        <TabsContent value="integrations" className="flex-1 m-0 overflow-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-xl">
          <ChannelIntegrations />
        </TabsContent>
      </Tabs>
    </div>
  );
}
