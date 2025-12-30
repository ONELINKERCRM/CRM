import { WhatsAppConversation, WhatsAppMessage, QualificationQuestion, WhatsAppConfig, ChatbotSettings } from './types';

export const mockConversations: WhatsAppConversation[] = [
  {
    id: '1',
    leadName: 'Ahmed Al Maktoum',
    leadPhone: '+971501234567',
    leadEmail: 'ahmed@example.com',
    leadStage: 'Qualified',
    qualificationStatus: 'premium',
    status: 'active',
    unreadCount: 3,
    lastMessage: 'I am interested in Palm Jumeirah villas',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 5),
    assignedAgent: 'Sarah Ahmed',
    qualificationData: {
      name: 'Ahmed Al Maktoum',
      contactNumber: '+971501234567',
      propertyInterest: 'Villa in Palm Jumeirah',
      budgetRange: 'AED 15,000,000+',
    },
  },
  {
    id: '2',
    leadName: 'Fatima Hassan',
    leadPhone: '+971502345678',
    leadStage: 'New',
    qualificationStatus: 'pending',
    status: 'pending',
    unreadCount: 1,
    lastMessage: 'Hello, I saw your property listing',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '3',
    leadName: 'Mohammed Ali',
    leadPhone: '+971503456789',
    leadEmail: 'moh.ali@email.com',
    leadStage: 'Qualified',
    qualificationStatus: 'qualified',
    status: 'active',
    unreadCount: 0,
    lastMessage: 'Thank you, I will visit tomorrow',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
    assignedAgent: 'Ahmed Karim',
    qualificationData: {
      name: 'Mohammed Ali',
      contactNumber: '+971503456789',
      propertyInterest: 'Apartment in Downtown',
      budgetRange: 'AED 2,000,000 - 5,000,000',
    },
  },
  {
    id: '4',
    leadName: 'Sara Al Qassimi',
    leadPhone: '+971504567890',
    leadStage: 'In Progress',
    qualificationStatus: 'qualified',
    status: 'resolved',
    unreadCount: 0,
    lastMessage: 'Viewing scheduled for Saturday',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
    assignedAgent: 'Sarah Ahmed',
  },
];

export const mockMessages: Record<string, WhatsAppMessage[]> = {
  '1': [
    {
      id: 'm1',
      conversationId: '1',
      content: 'Hello! Welcome to OneLinker Real Estate. I am your virtual assistant. May I know your name?',
      sender: 'bot',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      status: 'read',
      isAiGenerated: true,
    },
    {
      id: 'm2',
      conversationId: '1',
      content: 'Hi, my name is Ahmed Al Maktoum',
      sender: 'lead',
      timestamp: new Date(Date.now() - 1000 * 60 * 55),
      status: 'read',
    },
    {
      id: 'm3',
      conversationId: '1',
      content: 'Nice to meet you, Ahmed! What type of property are you interested in?',
      sender: 'bot',
      timestamp: new Date(Date.now() - 1000 * 60 * 54),
      status: 'read',
      isAiGenerated: true,
    },
    {
      id: 'm4',
      conversationId: '1',
      content: 'I am interested in Palm Jumeirah villas',
      sender: 'lead',
      timestamp: new Date(Date.now() - 1000 * 60 * 50),
      status: 'read',
    },
    {
      id: 'm5',
      conversationId: '1',
      content: 'Excellent choice! Palm Jumeirah offers some of the most luxurious villas in Dubai. What is your budget range?',
      sender: 'bot',
      timestamp: new Date(Date.now() - 1000 * 60 * 49),
      status: 'read',
      isAiGenerated: true,
    },
    {
      id: 'm6',
      conversationId: '1',
      content: 'My budget is around AED 15 million or more',
      sender: 'lead',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      status: 'read',
    },
    {
      id: 'm7',
      conversationId: '1',
      content: 'That is a great budget for premium Palm Jumeirah properties. I am connecting you with our senior agent Sarah who specializes in luxury villas.',
      sender: 'bot',
      timestamp: new Date(Date.now() - 1000 * 60 * 44),
      status: 'read',
      isAiGenerated: true,
    },
    {
      id: 'm8',
      conversationId: '1',
      content: 'Hello Ahmed! This is Sarah from OneLinker. I have some exclusive listings that match your criteria. Would you like to schedule a viewing?',
      sender: 'agent',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: 'read',
    },
    {
      id: 'm9',
      conversationId: '1',
      content: 'Yes, I would like to see them this week',
      sender: 'lead',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: 'read',
    },
  ],
  '2': [
    {
      id: 'm1',
      conversationId: '2',
      content: 'Hello, I saw your property listing',
      sender: 'lead',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: 'read',
    },
    {
      id: 'm2',
      conversationId: '2',
      content: 'Hello! Welcome to OneLinker Real Estate. I am your virtual assistant. May I know your name?',
      sender: 'bot',
      timestamp: new Date(Date.now() - 1000 * 60 * 29),
      status: 'delivered',
      isAiGenerated: true,
    },
  ],
};

export const defaultQualificationQuestions: QualificationQuestion[] = [
  {
    id: 'q1',
    question: 'May I know your name?',
    questionAr: 'هل يمكنني معرفة اسمك؟',
    field: 'name',
    order: 1,
    isRequired: true,
  },
  {
    id: 'q2',
    question: 'What is your contact number?',
    questionAr: 'ما هو رقم التواصل الخاص بك؟',
    field: 'contactNumber',
    order: 2,
    isRequired: true,
  },
  {
    id: 'q3',
    question: 'What type of property are you interested in?',
    questionAr: 'ما نوع العقار الذي تهتم به؟',
    field: 'propertyInterest',
    order: 3,
    isRequired: true,
  },
  {
    id: 'q4',
    question: 'What is your budget range?',
    questionAr: 'ما هي ميزانيتك؟',
    field: 'budgetRange',
    order: 4,
    isRequired: true,
  },
];

export const mockWhatsAppConfig: WhatsAppConfig = {
  provider: 'twilio',
  apiKey: '',
  phoneNumber: '',
  token: '',
  status: 'disconnected',
};

export const mockChatbotSettings: ChatbotSettings = {
  isEnabled: true,
  welcomeMessage: 'Hello! Welcome to OneLinker Real Estate. I am your virtual assistant. How can I help you today?',
  welcomeMessageAr: 'مرحباً! أهلاً بك في ون لينكر العقارية. أنا مساعدك الافتراضي. كيف يمكنني مساعدتك اليوم؟',
  qualificationQuestions: defaultQualificationQuestions,
  premiumBudgetThreshold: 10000000,
  autoHandoverEnabled: true,
  autoHandoverAfterQualification: true,
  aiEnabled: true,
  aiModel: 'google/gemini-2.5-flash',
  aiPrompt: `You are a professional real estate assistant for OneLinker, a luxury real estate agency in the Middle East. 
Your role is to:
1. Warmly greet leads and qualify them by asking about their name, contact, property interest, and budget
2. Provide helpful information about properties
3. Schedule viewings when requested
4. Escalate to human agents for complex queries
Always be professional, friendly, and knowledgeable about Dubai/UAE real estate.`,
};
