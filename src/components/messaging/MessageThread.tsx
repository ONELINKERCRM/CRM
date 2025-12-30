import { useState, useRef, useEffect } from 'react';
import { 
  Phone, Video, MoreVertical, Paperclip, Send, Smile, 
  User, Mail, Clock, Tag, ArrowLeftRight, Sparkles,
  Check, CheckCheck, Image, FileText, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Conversation, Message } from './types';
import { ChannelBadge } from './ChannelBadge';
import { quickReplies } from './mockData';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string, attachments?: File[]) => void;
  onTransfer?: () => void;
}

export function MessageThread({
  conversation,
  messages,
  onSendMessage,
  onTransfer,
}: MessageThreadProps) {
  const { isRTL } = useLanguageSafe();
  const [newMessage, setNewMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initials = conversation.leadName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (content: string) => {
    setNewMessage(content);
    textareaRef.current?.focus();
  };

  const handleAiSuggest = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      setNewMessage('Thank you for your interest! I would be happy to schedule a viewing at your convenience. We have availability this week on Tuesday and Thursday. Which day works better for you?');
      setIsAiLoading(false);
      toast.success(isRTL ? 'تم إنشاء الرد بالذكاء الاصطناعي' : 'AI response generated');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs md:text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{conversation.leadName}</h3>
              <ChannelBadge channel={conversation.channel} size="sm" />
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground truncate">
              {conversation.leadPhone && <span className="truncate">{conversation.leadPhone}</span>}
              {conversation.leadPhone && conversation.leadEmail && <span className="hidden sm:inline">•</span>}
              {conversation.leadEmail && <span className="hidden sm:inline truncate">{conversation.leadEmail}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9 hidden sm:flex">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem className="sm:hidden">
                <Video className="h-4 w-4 mr-2" />
                {isRTL ? 'مكالمة فيديو' : 'Video Call'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                {isRTL ? 'عرض ملف العميل' : 'View Lead Profile'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTransfer}>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                {isRTL ? 'تحويل المحادثة' : 'Transfer Conversation'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                {isRTL ? 'تغيير مرحلة العميل' : 'Change Lead Stage'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Lead Info Bar */}
      <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-muted/30 border-b border-border/30 overflow-x-auto scrollbar-hide">
        <Badge variant="outline" className="shrink-0 bg-background/50 text-[10px] md:text-xs h-5 md:h-6">
          <Tag className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
          {conversation.leadStage || 'New Lead'}
        </Badge>
        {conversation.assignedAgent && (
          <Badge variant="outline" className="shrink-0 bg-background/50 text-[10px] md:text-xs h-5 md:h-6 hidden sm:flex">
            <User className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
            {conversation.assignedAgent}
          </Badge>
        )}
        <Badge variant="outline" className="shrink-0 bg-background/50 text-[10px] md:text-xs h-5 md:h-6">
          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
          {format(conversation.lastMessageTime, 'MMM d, h:mm a')}
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-3 md:p-4">
        <div className="space-y-3 md:space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              isRTL={isRTL}
              showAvatar={index === 0 || messages[index - 1].sender !== message.sender}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="p-3 md:p-4 border-t border-border/50 bg-card/50">
        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-2 md:mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant="outline"
            size="sm"
            className="h-7 md:h-8 text-[10px] md:text-xs shrink-0 gap-1 md:gap-1.5 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:bg-primary/20"
            onClick={handleAiSuggest}
            disabled={isAiLoading}
          >
            <Sparkles className={cn('h-3 w-3', isAiLoading && 'animate-spin')} />
            {isRTL ? 'اقتراح AI' : 'AI Suggest'}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 md:h-8 text-[10px] md:text-xs shrink-0">
                <ChevronDown className="h-3 w-3 mr-1" />
                {isRTL ? 'ردود سريعة' : 'Quick Replies'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 md:w-80 p-2" align="start">
              <div className="space-y-1">
                {quickReplies.map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => handleQuickReply(reply.content)}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium">{reply.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{reply.content}</p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
              className="min-h-[60px] md:min-h-[80px] max-h-[150px] md:max-h-[200px] resize-none pr-16 md:pr-20 bg-background/50 text-sm"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-0.5 md:gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7">
                <Smile className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7">
                <Paperclip className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="h-9 md:h-10 px-3 md:px-4 bg-gradient-to-r from-primary to-primary/80"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isRTL: boolean;
  showAvatar: boolean;
}

function MessageBubble({ message, isRTL, showAvatar }: MessageBubbleProps) {
  const isAgent = message.sender === 'agent';
  const time = format(message.timestamp, 'h:mm a', { locale: isRTL ? ar : undefined });

  return (
    <div className={cn(
      'flex gap-2',
      isAgent ? 'justify-end' : 'justify-start'
    )}>
      {!isAgent && showAvatar && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-xs">L</AvatarFallback>
        </Avatar>
      )}
      {!isAgent && !showAvatar && <div className="w-8" />}

      <div className={cn(
        'max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-2.5',
        isAgent
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'bg-muted rounded-bl-md',
        message.isInternal && 'border-2 border-dashed border-yellow-500/50 bg-yellow-500/10'
      )}>
        {message.isInternal && (
          <p className="text-[10px] text-yellow-600 font-medium mb-1">
            {isRTL ? 'ملاحظة داخلية' : 'Internal Note'}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className={cn(
          'flex items-center gap-1.5 mt-1',
          isAgent ? 'justify-end' : 'justify-start'
        )}>
          <span className={cn(
            'text-[10px]',
            isAgent ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {time}
          </span>
          {isAgent && (
            message.status === 'read' ? (
              <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
            ) : message.status === 'delivered' ? (
              <CheckCheck className="h-3 w-3 text-primary-foreground/50" />
            ) : (
              <Check className="h-3 w-3 text-primary-foreground/50" />
            )
          )}
        </div>
      </div>

      {isAgent && showAvatar && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-xs">A</AvatarFallback>
        </Avatar>
      )}
      {isAgent && !showAvatar && <div className="w-8" />}
    </div>
  );
}
