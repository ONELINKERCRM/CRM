import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChatbots, LLM_PROVIDERS, Chatbot } from '@/hooks/useChatbots';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatbotTester() {
  const { isRTL } = useLanguageSafe();
  const { chatbots, isLoading } = useChatbots();
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBot = chatbots.find(b => b.id === selectedBotId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show welcome message when bot is selected
  useEffect(() => {
    if (selectedBot?.welcome_message && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: selectedBot.welcome_message,
        timestamp: new Date(),
      }]);
    }
  }, [selectedBot, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !selectedBot || isSending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      // Prepare messages for API
      const apiMessages = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: 'user', content: userMessage.content });

      console.log('Sending to chatbot-chat:', {
        provider: selectedBot.llm_provider,
        model: selectedBot.llm_model,
      });

      const { data, error } = await supabase.functions.invoke('chatbot-chat', {
        body: {
          messages: apiMessages,
          provider: selectedBot.llm_provider,
          model: selectedBot.llm_model,
          apiKey: selectedBot.llm_api_key_encrypted,
          systemPrompt: selectedBot.system_prompt,
          temperature: selectedBot.temperature,
          maxTokens: selectedBot.max_tokens,
          stream: false,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'No response received.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    if (selectedBot?.welcome_message) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: selectedBot.welcome_message,
        timestamp: new Date(),
      }]);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bot Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isRTL ? 'اختبار الروبوت' : 'Test Chatbot'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={selectedBotId}
              onValueChange={(value) => {
                setSelectedBotId(value);
                setMessages([]);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={isRTL ? 'اختر روبوت للاختبار' : 'Select a chatbot to test'} />
              </SelectTrigger>
              <SelectContent>
                {chatbots.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {isRTL ? 'لا توجد روبوتات' : 'No chatbots available'}
                  </div>
                ) : (
                  chatbots.map(bot => (
                    <SelectItem key={bot.id} value={bot.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        <span>{bot.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {LLM_PROVIDERS[bot.llm_provider]?.name || bot.llm_provider}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedBot && (
              <Button variant="outline" size="icon" onClick={clearChat} title="Clear chat">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {selectedBot && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                {selectedBot.llm_model.split('/').pop()}
              </Badge>
              <span>•</span>
              <span>Temp: {selectedBot.temperature}</span>
              <span>•</span>
              <span>Max tokens: {selectedBot.max_tokens}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Interface */}
      {selectedBot && (
        <Card className="flex flex-col h-[500px]">
          <CardHeader className="pb-2 border-b">
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{selectedBot.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedBot.is_active 
                    ? (isRTL ? 'متصل' : 'Online') 
                    : (isRTL ? 'غير متصل' : 'Offline')}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "flex-row-reverse" : "",
                    isRTL && "flex-row-reverse",
                    isRTL && message.role === 'user' && "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}>
                    {message.role === 'user' 
                      ? <User className="h-4 w-4" /> 
                      : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                    message.content.startsWith('Error:') && "bg-destructive/10 text-destructive"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={cn(
                      "text-xs mt-1 opacity-70",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isSending && (
                <div className={cn("flex gap-3", isRTL && "flex-row-reverse")}>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
                disabled={isSending}
                className={cn(isRTL && "text-right")}
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isSending}
                size="icon"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!selectedBot && chatbots.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isRTL ? 'اختر روبوت لبدء المحادثة' : 'Select a chatbot to start testing'}
            </p>
          </CardContent>
        </Card>
      )}

      {chatbots.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium mb-2">{isRTL ? 'لا توجد روبوتات' : 'No Chatbots Yet'}</p>
            <p className="text-muted-foreground text-sm">
              {isRTL ? 'أنشئ روبوت أولاً من تبويب الروبوتات' : 'Create a chatbot first from the Bots tab'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
