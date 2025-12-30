import { useState } from 'react';
import { Search, Filter, Pin, MessageCircle } from 'lucide-react';
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
import { WhatsAppConversation } from './types';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WhatsAppInboxProps {
  conversations: WhatsAppConversation[];
  selectedId?: string;
  onSelect: (conversation: WhatsAppConversation) => void;
}

export function WhatsAppInbox({
  conversations,
  selectedId,
  onSelect,
}: WhatsAppInboxProps) {
  const { isRTL } = useLanguageSafe();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [qualificationFilter, setQualificationFilter] = useState<string>('all');

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.leadName.toLowerCase().includes(search.toLowerCase()) ||
      c.leadPhone.includes(search) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesQualification = qualificationFilter === 'all' || c.qualificationStatus === qualificationFilter;
    return matchesSearch && matchesStatus && matchesQualification;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const getQualificationBadge = (status: WhatsAppConversation['qualificationStatus']) => {
    switch (status) {
      case 'premium':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] md:text-[10px]">Premium</Badge>;
      case 'qualified':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] md:text-[10px]">Qualified</Badge>;
      case 'unqualified':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[9px] md:text-[10px]">Unqualified</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] md:text-[10px]">Pending</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm md:text-base">
                {isRTL ? 'المحادثات' : 'Conversations'}
              </h2>
              {totalUnread > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {totalUnread} {isRTL ? 'غير مقروء' : 'unread'}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'بحث...' : 'Search leads...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-background/50"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-[10px] flex-1">
              <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
              <SelectItem value="pending">{isRTL ? 'معلق' : 'Pending'}</SelectItem>
              <SelectItem value="resolved">{isRTL ? 'محلول' : 'Resolved'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={qualificationFilter} onValueChange={setQualificationFilter}>
            <SelectTrigger className="h-7 text-[10px] flex-1">
              <SelectValue placeholder={isRTL ? 'التأهيل' : 'Qualification'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="premium">{isRTL ? 'متميز' : 'Premium'}</SelectItem>
              <SelectItem value="qualified">{isRTL ? 'مؤهل' : 'Qualified'}</SelectItem>
              <SelectItem value="pending">{isRTL ? 'معلق' : 'Pending'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 md:p-2 space-y-1">
          {filteredConversations.map((conversation) => {
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
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={cn(
                  'group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200',
                  'hover:bg-muted/60',
                  selectedId === conversation.id
                    ? 'bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border border-transparent hover:border-border/40',
                  conversation.unreadCount > 0 && 'bg-primary/5'
                )}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 shrink-0 border border-border/50 shadow-sm transition-transform group-hover:scale-105">
                    <AvatarFallback className={cn(
                      "text-xs font-semibold",
                      selectedId === conversation.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.isPinned && (
                    <div className="absolute -top-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border border-border">
                      <Pin className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                    </div>
                  )}
                  {conversation.status === 'active' && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className={cn(
                      'font-semibold text-sm truncate',
                      conversation.unreadCount > 0 ? 'text-foreground' : 'text-foreground/80'
                    )}>
                      {conversation.leadName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 shrink-0 font-medium">
                      {timeAgo}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5">
                    {getQualificationBadge(conversation.qualificationStatus)}
                    {conversation.assignedAgent && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal bg-muted/80 text-muted-foreground hidden sm:flex">
                        {conversation.assignedAgent}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      'text-xs truncate max-w-[140px] xl:max-w-[180px]',
                      conversation.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}>
                      {conversation.lastMessage || 'No messages yet'}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="flex items-center justify-center h-4.5 min-w-[18px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0 shadow-sm shadow-primary/20">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">{isRTL ? 'لا توجد محادثات' : 'No conversations found'}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
