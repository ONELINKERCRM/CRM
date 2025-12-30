// Marketing Hub Types

export type CampaignChannel = 'whatsapp' | 'email' | 'sms';
export type CampaignType = 'broadcast' | 'drip' | 'trigger' | 'lead-nurturing' | 'property-promotion' | 'event';
export type CampaignStep = 'channel' | 'connection' | 'type' | 'template' | 'audience' | 'schedule' | 'review';
export type AudienceSelectionMethod = 'manual' | 'select_all' | 'excel_import';

export interface WhatsAppConnection {
  id: string;
  phoneNumber: string;
  displayName: string;
  provider: 'meta' | 'twilio' | '360dialog' | 'vonage';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
}

export interface EmailConnection {
  id: string;
  email: string;
  provider: 'resend' | 'sendgrid' | 'mailgun';
  status: 'connected' | 'disconnected' | 'error';
}

export interface SMSConnection {
  id: string;
  phoneNumber: string;
  provider: 'twilio' | 'messagebird' | 'vonage';
  status: 'connected' | 'disconnected' | 'error';
}

export interface CampaignTemplate {
  id: string;
  name: string;
  channel: CampaignChannel;
  content: string;
  variables: string[];
  createdAt: Date;
}

export interface LeadFilter {
  stages?: string[];
  sources?: string[];
  agents?: string[];
  dateRange?: { from: Date; to: Date };
}

export interface ImportedLead {
  name?: string;
  phone: string;
  email?: string;
  source?: string;
}

export interface ColumnMapping {
  name?: string;
  phone: string;
  email?: string;
}

export interface CampaignDraft {
  channel?: CampaignChannel;
  connectionId?: string;
  type?: CampaignType;
  templateId?: string;
  customContent?: string;
  audience?: LeadFilter;
  selectedLeads?: string[];
  audienceMethod?: AudienceSelectionMethod;
  importedLeads?: ImportedLead[];
  scheduledAt?: Date;
  sendNow?: boolean;
  timezone?: string;
}

// WhatsApp Bot Types
export type BotStep = 'connect' | 'flow' | 'train' | 'deploy' | 'monitor';
export type BotStatus = 'idle' | 'active' | 'paused' | 'error';

export interface QualificationQuestion {
  id: string;
  question: string;
  questionAr: string;
  type: 'text' | 'phone' | 'select' | 'number';
  options?: { value: string; label: string; labelAr: string }[];
  fieldMapping: string;
  required: boolean;
  order: number;
}

export interface ConditionalRule {
  id: string;
  field: string;
  condition: 'equals' | 'contains' | 'greater' | 'less';
  value: string;
  action: 'tag' | 'priority' | 'assign';
  actionValue: string;
}

export interface BotConfiguration {
  id: string;
  name: string;
  connectionId: string;
  questions: QualificationQuestion[];
  conditionalRules: ConditionalRule[];
  welcomeMessage: string;
  welcomeMessageAr: string;
  completionMessage: string;
  completionMessageAr: string;
  aiEnabled: boolean;
  aiPrompt?: string;
  status: BotStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BotAnalytics {
  totalLeads: number;
  qualifiedLeads: number;
  premiumLeads: number;
  avgResponseTime: string;
  conversionRate: number;
  dailyStats: { date: string; leads: number; qualified: number }[];
}
