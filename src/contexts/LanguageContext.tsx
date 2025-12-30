import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Navigation
  'nav.home': { en: 'Home', ar: 'الرئيسية' },
  'nav.features': { en: 'Features', ar: 'المميزات' },
  'nav.pricing': { en: 'Pricing', ar: 'الأسعار' },
  'nav.faq': { en: 'FAQs', ar: 'الأسئلة الشائعة' },
  'nav.blog': { en: 'Blog', ar: 'المدونة' },
  'nav.contact': { en: 'Contact', ar: 'تواصل معنا' },
  'nav.signin': { en: 'Sign In', ar: 'تسجيل الدخول' },
  'nav.getStarted': { en: 'Get Started', ar: 'ابدأ الآن' },
  
  // Hero
  'hero.tagline': { en: 'All Your Real Estate Leads. One Powerful CRM.', ar: 'جميع عملائك العقاريين. نظام CRM واحد قوي.' },
  'hero.subtitle': { en: "OneLinker CRM — The Middle East's First Mobile-First Real Estate CRM to manage leads, listings, marketing, teams & portals… all in one app.", ar: 'OneLinker CRM — أول نظام CRM عقاري متوافق مع الجوال في الشرق الأوسط لإدارة العملاء والعقارات والتسويق والفرق والبوابات... كل ذلك في تطبيق واحد.' },
  'hero.bookDemo': { en: 'Book Free Demo', ar: 'احجز عرض مجاني' },
  'hero.getStarted': { en: 'Get Started', ar: 'ابدأ الآن' },
  
  // Why OneLinker
  'why.title': { en: 'Why OneLinker CRM?', ar: 'لماذا OneLinker CRM؟' },
  'why.subtitle': { en: 'Built specifically for Middle East real estate professionals', ar: 'مصمم خصيصاً لمحترفي العقارات في الشرق الأوسط' },
  'why.faster.title': { en: 'Faster Lead Closing', ar: 'إغلاق أسرع للصفقات' },
  'why.faster.desc': { en: 'Close deals 3x faster with automated follow-ups and smart reminders', ar: 'أغلق الصفقات أسرع 3 مرات مع المتابعات التلقائية والتذكيرات الذكية' },
  'why.mobile.title': { en: 'Mobile-First Design', ar: 'تصميم الجوال أولاً' },
  'why.mobile.desc': { en: 'Manage your entire business from your phone, anywhere, anytime', ar: 'أدر عملك بالكامل من هاتفك، في أي مكان وزمان' },
  'why.ai.title': { en: 'AI-Powered Automation', ar: 'أتمتة بالذكاء الاصطناعي' },
  'why.ai.desc': { en: 'Let AI handle routine tasks while you focus on closing deals', ar: 'دع الذكاء الاصطناعي يتولى المهام الروتينية بينما تركز على إغلاق الصفقات' },
  'why.currency.title': { en: 'Multi-Currency Support', ar: 'دعم العملات المتعددة' },
  'why.currency.desc': { en: 'AED, QAR, SAR, USD — work seamlessly across GCC markets', ar: 'درهم، ريال قطري، ريال سعودي، دولار — اعمل بسلاسة عبر أسواق الخليج' },
  
  // Features
  'features.title': { en: 'Powerful Features', ar: 'مميزات قوية' },
  'features.subtitle': { en: 'Everything you need to dominate the real estate market', ar: 'كل ما تحتاجه للسيطرة على سوق العقارات' },
  'features.leads.title': { en: 'Lead Management', ar: 'إدارة العملاء' },
  'features.leads.desc': { en: 'Capture, track, and convert leads with intelligent pipeline management', ar: 'التقط وتتبع وحول العملاء مع إدارة ذكية للمراحل' },
  'features.sources.title': { en: 'Lead Source Integration', ar: 'تكامل مصادر العملاء' },
  'features.sources.desc': { en: 'Connect Meta, Google, TikTok ads and property portals instantly', ar: 'اتصل بإعلانات ميتا وجوجل وتيك توك والبوابات العقارية فوراً' },
  'features.listings.title': { en: 'Listings Management', ar: 'إدارة العقارات' },
  'features.listings.desc': { en: 'Manage your entire property portfolio from one dashboard', ar: 'أدر محفظتك العقارية بالكامل من لوحة تحكم واحدة' },
  'features.portals.title': { en: 'Portal Publishing', ar: 'النشر على البوابات' },
  'features.portals.desc': { en: 'One-click publish to 20+ property portals across the region', ar: 'نشر بنقرة واحدة على أكثر من 20 بوابة عقارية في المنطقة' },
  'features.teams.title': { en: 'Team Management', ar: 'إدارة الفريق' },
  'features.teams.desc': { en: 'Admin, managers, team leaders, and agents — all organized', ar: 'مدراء ومسؤولون وقادة فرق ووكلاء — الكل منظم' },
  'features.whatsapp.title': { en: 'WhatsApp Integration', ar: 'تكامل واتساب' },
  'features.whatsapp.desc': { en: 'Send templates, follow-ups, and communicate directly from CRM', ar: 'أرسل القوالب والمتابعات وتواصل مباشرة من النظام' },
  'features.chatbot.title': { en: 'AI WhatsApp Chatbot', ar: 'روبوت واتساب الذكي' },
  'features.chatbot.desc': { en: 'Qualify leads 24/7 with AI-powered WhatsApp chatbots that never sleep', ar: 'أهّل العملاء على مدار الساعة مع روبوتات واتساب الذكية' },
  'features.campaigns.title': { en: 'Marketing Campaigns', ar: 'الحملات التسويقية' },
  'features.campaigns.desc': { en: 'Create multi-channel campaigns via WhatsApp, SMS, and Email', ar: 'أنشئ حملات متعددة القنوات عبر واتساب والرسائل والبريد' },
  'features.sms.title': { en: 'SMS Marketing', ar: 'التسويق بالرسائل' },
  'features.sms.desc': { en: 'Bulk SMS campaigns with personalized templates and tracking', ar: 'حملات رسائل جماعية مع قوالب مخصصة وتتبع' },
  'features.email.title': { en: 'Email Campaigns', ar: 'حملات البريد' },
  'features.email.desc': { en: 'Beautiful drag-and-drop email builder with analytics', ar: 'منشئ بريد بالسحب والإفلات مع تحليلات' },
  'features.aiAssistant.title': { en: 'AI Lead Assistant', ar: 'مساعد العملاء الذكي' },
  'features.aiAssistant.desc': { en: 'AI suggests responses, qualifies leads, and writes follow-ups', ar: 'الذكاء الاصطناعي يقترح الردود ويؤهل العملاء ويكتب المتابعات' },
  'features.leadScoring.title': { en: 'Lead Scoring', ar: 'تقييم العملاء' },
  'features.leadScoring.desc': { en: 'Automatically score leads based on engagement and behavior', ar: 'تقييم تلقائي للعملاء بناءً على التفاعل والسلوك' },
  'features.automation.title': { en: 'Workflow Automation', ar: 'أتمتة سير العمل' },
  'features.automation.desc': { en: 'Automate repetitive tasks with powerful IF/THEN rules', ar: 'أتمت المهام المتكررة مع قواعد إذا/عندها القوية' },
  'features.followups.title': { en: 'Smart Follow-ups', ar: 'متابعات ذكية' },
  'features.followups.desc': { en: 'Never miss a follow-up with automated reminders and scheduling', ar: 'لا تفوت أي متابعة مع التذكيرات التلقائية والجدولة' },
  'features.landing.title': { en: 'Landing Page Builder', ar: 'منشئ صفحات الهبوط' },
  'features.landing.desc': { en: 'Create stunning landing pages without any coding', ar: 'أنشئ صفحات هبوط مذهلة بدون أي برمجة' },
  'features.analytics.title': { en: 'Analytics Dashboard', ar: 'لوحة التحليلات' },
  'features.analytics.desc': { en: 'Real-time insights into your sales performance and team metrics', ar: 'رؤى في الوقت الفعلي لأداء المبيعات ومقاييس الفريق' },
  'features.ai.title': { en: 'AI Follow-ups', ar: 'متابعات الذكاء الاصطناعي' },
  'features.ai.desc': { en: 'Smart AI-powered follow-up suggestions and voice notes', ar: 'اقتراحات متابعة ذكية بالذكاء الاصطناعي والملاحظات الصوتية' },
  'features.stages.title': { en: 'Custom Lead Stages', ar: 'مراحل عملاء مخصصة' },
  'features.stages.desc': { en: 'Create custom pipelines that match your sales process', ar: 'أنشئ مراحل مخصصة تتوافق مع عملية المبيعات الخاصة بك' },
  'features.assign.title': { en: 'Smart Assignment', ar: 'التعيين الذكي' },
  'features.assign.desc': { en: 'Round-robin, weighted, and rule-based lead assignment', ar: 'تعيين دوري وموزون وقائم على القواعد' },
  'features.pdf.title': { en: 'PDF Generator', ar: 'منشئ PDF' },
  'features.pdf.desc': { en: 'Generate professional listing brochures with one click', ar: 'أنشئ كتيبات عقارية احترافية بنقرة واحدة' },
  'features.presentation.title': { en: 'Presentation Generator', ar: 'منشئ العروض' },
  'features.presentation.desc': { en: 'Create stunning horizontal presentations for clients', ar: 'أنشئ عروض أفقية مذهلة للعملاء' },
  'features.mobile.title': { en: 'Mobile-First App', ar: 'تطبيق الجوال أولاً' },
  'features.mobile.desc': { en: 'Full CRM functionality on iOS and Android devices', ar: 'وظائف CRM كاملة على أجهزة iOS وأندرويد' },
  'features.security.title': { en: 'Enterprise Security', ar: 'أمان المؤسسات' },
  'features.security.desc': { en: 'Role-based access, data encryption, and audit logs', ar: 'وصول قائم على الأدوار وتشفير البيانات وسجلات التدقيق' },
  
  // Mobile App
  'mobile.title': { en: "Middle East's First Mobile-First Real Estate CRM", ar: 'أول نظام CRM عقاري متوافق مع الجوال في الشرق الأوسط' },
  'mobile.subtitle': { en: 'Your entire business in your pocket', ar: 'عملك بالكامل في جيبك' },
  'mobile.push': { en: 'Instant Push Notifications', ar: 'إشعارات فورية' },
  'mobile.calls': { en: 'One-Tap Lead Calls', ar: 'اتصال بنقرة واحدة' },
  'mobile.voice': { en: 'Voice Note Recording', ar: 'تسجيل الملاحظات الصوتية' },
  'mobile.followup': { en: 'Quick Follow-ups', ar: 'متابعات سريعة' },
  
  // Portals
  'portals.title': { en: 'Publish to 20+ Property Portals', ar: 'انشر على أكثر من 20 بوابة عقارية' },
  'portals.subtitle': { en: 'One-click publishing to all major property portals in the region', ar: 'نشر بنقرة واحدة على جميع البوابات العقارية الرئيسية في المنطقة' },
  
  // Integrations
  'integrations.title': { en: 'Seamless Integrations', ar: 'تكاملات سلسة' },
  'integrations.subtitle': { en: 'Connect with the tools you already use', ar: 'اتصل بالأدوات التي تستخدمها بالفعل' },
  
  // Pricing
  'pricing.title': { en: 'Simple, Transparent Pricing', ar: 'أسعار بسيطة وشفافة' },
  'pricing.subtitle': { en: 'Choose the plan that fits your business', ar: 'اختر الخطة التي تناسب عملك' },
  'pricing.monthly': { en: 'Monthly', ar: 'شهري' },
  'pricing.yearly': { en: 'Yearly', ar: 'سنوي' },
  'pricing.save': { en: 'Save 20%', ar: 'وفر 20%' },
  'pricing.starter': { en: 'Starter', ar: 'البداية' },
  'pricing.professional': { en: 'Professional', ar: 'احترافي' },
  'pricing.enterprise': { en: 'Enterprise', ar: 'المؤسسات' },
  'pricing.perMonth': { en: '/month', ar: '/شهر' },
  'pricing.perYear': { en: '/year', ar: '/سنة' },
  'pricing.getStarted': { en: 'Get Started', ar: 'ابدأ الآن' },
  'pricing.contactSales': { en: 'Contact Sales', ar: 'تواصل مع المبيعات' },
  'pricing.popular': { en: 'Most Popular', ar: 'الأكثر شعبية' },
  
  // FAQ
  'faq.title': { en: 'Frequently Asked Questions', ar: 'الأسئلة الشائعة' },
  'faq.subtitle': { en: 'Everything you need to know about OneLinker CRM', ar: 'كل ما تحتاج معرفته عن OneLinker CRM' },
  
  // Testimonials
  'testimonials.title': { en: 'Loved by Real Estate Professionals', ar: 'محبوب من محترفي العقارات' },
  'testimonials.subtitle': { en: 'See what our customers are saying', ar: 'شاهد ما يقوله عملاؤنا' },
  
  // Blog
  'blog.title': { en: 'Latest Insights', ar: 'أحدث المقالات' },
  'blog.subtitle': { en: 'Tips, trends, and strategies for real estate success', ar: 'نصائح واتجاهات واستراتيجيات للنجاح العقاري' },
  'blog.readMore': { en: 'Read More', ar: 'اقرأ المزيد' },
  
  // Contact
  'contact.title': { en: 'Get in Touch', ar: 'تواصل معنا' },
  'contact.subtitle': { en: "We'd love to hear from you", ar: 'يسعدنا سماع رأيك' },
  'contact.name': { en: 'Your Name', ar: 'اسمك' },
  'contact.email': { en: 'Email Address', ar: 'البريد الإلكتروني' },
  'contact.phone': { en: 'Phone Number', ar: 'رقم الهاتف' },
  'contact.company': { en: 'Company Name', ar: 'اسم الشركة' },
  'contact.message': { en: 'Your Message', ar: 'رسالتك' },
  'contact.send': { en: 'Send Message', ar: 'إرسال الرسالة' },
  
  // Footer
  'footer.product': { en: 'Product', ar: 'المنتج' },
  'footer.company': { en: 'Company', ar: 'الشركة' },
  'footer.resources': { en: 'Resources', ar: 'الموارد' },
  'footer.legal': { en: 'Legal', ar: 'قانوني' },
  'footer.about': { en: 'About Us', ar: 'من نحن' },
  'footer.careers': { en: 'Careers', ar: 'الوظائف' },
  'footer.press': { en: 'Press', ar: 'الصحافة' },
  'footer.privacy': { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
  'footer.terms': { en: 'Terms of Service', ar: 'شروط الخدمة' },
  'footer.help': { en: 'Help Center', ar: 'مركز المساعدة' },
  'footer.docs': { en: 'Documentation', ar: 'التوثيق' },
  'footer.api': { en: 'API Reference', ar: 'مرجع API' },
  'footer.rights': { en: 'All rights reserved.', ar: 'جميع الحقوق محفوظة.' },
  
  // Auth
  'auth.signin': { en: 'Sign In', ar: 'تسجيل الدخول' },
  'auth.signup': { en: 'Create Account', ar: 'إنشاء حساب' },
  'auth.forgot': { en: 'Forgot Password?', ar: 'نسيت كلمة المرور؟' },
  'auth.reset': { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور' },
  'auth.email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'auth.password': { en: 'Password', ar: 'كلمة المرور' },
  'auth.confirmPassword': { en: 'Confirm Password', ar: 'تأكيد كلمة المرور' },
  'auth.google': { en: 'Continue with Google', ar: 'المتابعة مع جوجل' },
  'auth.noAccount': { en: "Don't have an account?", ar: 'ليس لديك حساب؟' },
  'auth.hasAccount': { en: 'Already have an account?', ar: 'لديك حساب بالفعل؟' },
  'auth.backToLogin': { en: 'Back to Sign In', ar: 'العودة لتسجيل الدخول' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('onelinker-lang');
    return (saved as Language) || 'en';
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    localStorage.setItem('onelinker-lang', language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

// Safe hook that returns defaults when used outside LanguageProvider
export function useLanguageSafe() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en' as Language,
      setLanguage: () => {},
      isRTL: false,
      t: (key: string) => key,
    };
  }
  return context;
}
