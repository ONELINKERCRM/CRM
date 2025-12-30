export type Channel = 'whatsapp' | 'messenger' | 'sms' | 'email' | 'telegram' | 'instagram';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  sender: 'lead' | 'agent';
  channel: Channel;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: Attachment[];
  isInternal?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'video' | 'document';
  url: string;
  size?: number;
}

export interface Conversation {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  leadEmail?: string;
  leadStage?: string;
  leadAvatar?: string;
  channel: Channel;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'open' | 'pending' | 'archived';
  isPinned?: boolean;
  assignedAgent?: string;
  assignedAgentId?: string;
}

export interface ChannelConfig {
  id: string;
  channel: Channel;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  accountName?: string;
  lastSync?: Date;
}

export const channelConfig: Record<Channel, { color: string; bgColor: string; icon: string; label: string }> = {
  whatsapp: { color: 'text-green-600', bgColor: 'bg-green-500/10', icon: 'MessageCircle', label: 'WhatsApp' },
  messenger: { color: 'text-blue-600', bgColor: 'bg-blue-500/10', icon: 'MessageCircle', label: 'Messenger' },
  sms: { color: 'text-purple-600', bgColor: 'bg-purple-500/10', icon: 'Smartphone', label: 'SMS' },
  email: { color: 'text-gray-600', bgColor: 'bg-gray-500/10', icon: 'Mail', label: 'Email' },
  telegram: { color: 'text-sky-600', bgColor: 'bg-sky-500/10', icon: 'Send', label: 'Telegram' },
  instagram: { color: 'text-pink-600', bgColor: 'bg-pink-500/10', icon: 'Camera', label: 'Instagram' },
};
