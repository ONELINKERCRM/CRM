import { useState } from 'react';
import { Search, Pin, Archive, Filter, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Conversation, Channel } from './types';
import { ChannelBadge } from './ChannelBadge';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  onPin?: (id: string) => void;
  onArchive?: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onPin,
  onArchive,
}: ConversationListProps) {
  const { isRTL } = useLanguageSafe();
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread'>('all');

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.leadName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase()) ||
      c.leadPhone?.includes(search) ||
      c.leadEmail?.toLowerCase().includes(search.toLowerCase());
    const matchesChannel = channelFilter === 'all' || c.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'unread' && c.unreadCount > 0);
    return matchesSearch && matchesChannel && matchesStatus;
  });

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const regularConversations = filteredConversations.filter((c) => !c.isPinned);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-border/50">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground text-sm md:text-base">
              {isRTL ? 'المحادثات' : 'Inbox'}
            </h2>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-4 md:h-5 min-w-[16px] md:min-w-[20px] px-1 md:px-1.5 text-[10px] md:text-xs">
                {totalUnread}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
            <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-2 md:mb-3">
          <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'بحث في المحادثات...' : 'Search conversations...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 md:pl-9 h-8 md:h-9 text-sm bg-background/50"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 md:gap-2">
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as Channel | 'all')}>
            <SelectTrigger className="h-7 md:h-8 text-[10px] md:text-xs flex-1">
              <SelectValue placeholder={isRTL ? 'القناة' : 'Channel'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="messenger">Messenger</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'unread')}>
            <SelectTrigger className="h-7 md:h-8 text-[10px] md:text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="unread">{isRTL ? 'غير مقروء' : 'Unread'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {/* Pinned */}
        {pinnedConversations.length > 0 && (
          <div className="p-1.5 md:p-2">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] md:text-xs text-muted-foreground">
              <Pin className="h-2.5 w-2.5 md:h-3 md:w-3" />
              <span>{isRTL ? 'مثبت' : 'Pinned'}</span>
            </div>
            {pinnedConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onSelect={() => onSelect(conversation)}
                isRTL={isRTL}
              />
            ))}
          </div>
        )}

        {/* Regular */}
        <div className="p-1.5 md:p-2">
          {pinnedConversations.length > 0 && regularConversations.length > 0 && (
            <div className="px-2 py-1 text-[10px] md:text-xs text-muted-foreground">
              {isRTL ? 'المحادثات' : 'Conversations'}
            </div>
          )}
          {regularConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedId === conversation.id}
              onSelect={() => onSelect(conversation)}
              isRTL={isRTL}
            />
          ))}
        </div>

        {filteredConversations.length === 0 && (
          <div className="p-6 md:p-8 text-center text-muted-foreground">
            <p className="text-xs md:text-sm">{isRTL ? 'لا توجد محادثات' : 'No conversations found'}</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  isRTL: boolean;
}

function ConversationItem({ conversation, isSelected, onSelect, isRTL }: ConversationItemProps) {
  const initials = conversation.leadName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = formatDistanceToNow(conversation.lastMessageTime, {
    addSuffix: false,
    locale: isRTL ? ar : undefined,
  });

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg md:rounded-xl cursor-pointer transition-all active:scale-[0.98]',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/10 border border-primary/20',
        conversation.unreadCount > 0 && 'bg-primary/5'
      )}
    >
      <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-[10px] md:text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5 md:gap-2 mb-0.5">
          <span className={cn(
            'font-medium text-xs md:text-sm truncate',
            conversation.unreadCount > 0 && 'text-foreground'
          )}>
            {conversation.leadName}
          </span>
          <span className="text-[9px] md:text-[10px] text-muted-foreground shrink-0">
            {timeAgo}
          </span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 mb-1">
          <ChannelBadge channel={conversation.channel} size="sm" />
          {conversation.leadStage && (
            <Badge variant="outline" className="h-3.5 md:h-4 text-[8px] md:text-[10px] px-1 md:px-1.5 bg-background/50 hidden sm:flex">
              {conversation.leadStage}
            </Badge>
          )}
        </div>

        <p className={cn(
          'text-[10px] md:text-xs truncate',
          conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}>
          {conversation.lastMessage}
        </p>
      </div>

      {conversation.unreadCount > 0 && (
        <Badge className="h-4 md:h-5 min-w-[16px] md:min-w-[20px] px-1 md:px-1.5 text-[9px] md:text-[10px] bg-primary shrink-0">
          {conversation.unreadCount}
        </Badge>
      )}
    </div>
  );
}
