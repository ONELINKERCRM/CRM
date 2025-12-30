export type MessageSender = 'lead' | 'agent' | 'bot';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type LeadQualificationStatus = 'pending' | 'qualified' | 'premium' | 'unqualified';
export type ConversationStatus = 'active' | 'pending' | 'resolved' | 'archived';

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  content: string;
  sender: MessageSender;
  timestamp: Date;
  status: MessageStatus;
  mediaUrl?: string;
  mediaType?: 'image' | 'pdf' | 'video' | 'audio';
  isAiGenerated?: boolean;
}

export interface WhatsAppConversation {
  id: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  leadStage: string;
  qualificationStatus: LeadQualificationStatus;
  status: ConversationStatus;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: Date;
  assignedAgent?: string;
  isPinned?: boolean;
  qualificationData?: {
    name?: string;
    contactNumber?: string;
    propertyInterest?: string;
    budgetRange?: string;
  };
}

export interface QualificationQuestion {
  id: string;
  question: string;
  questionAr: string;
  field: keyof WhatsAppConversation['qualificationData'];
  order: number;
  isRequired: boolean;
}

export interface WhatsAppConfig {
  provider: 'twilio' | '360dialog' | 'vonage' | 'official';
  apiKey: string;
  phoneNumber: string;
  token: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
}

export interface ChatbotSettings {
  isEnabled: boolean;
  welcomeMessage: string;
  welcomeMessageAr: string;
  qualificationQuestions: QualificationQuestion[];
  premiumBudgetThreshold: number;
  autoHandoverEnabled: boolean;
  autoHandoverAfterQualification: boolean;
  aiEnabled: boolean;
  aiModel: string;
  aiPrompt: string;
}
