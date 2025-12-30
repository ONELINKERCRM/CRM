import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Phone, Mail, MessageSquare, Plus, Check, X, AlertCircle, 
  RefreshCw, Trash2, Settings2, ExternalLink, Plug, Activity,
  Shield, Clock, Zap, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useWhatsAppConnection } from '@/contexts/WhatsAppConnectionContext';
import { useEmailConnection } from '@/contexts/EmailConnectionContext';
import { useSMSConnection } from '@/contexts/SMSConnectionContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { ConnectionsPageSkeleton } from '@/components/ui/page-skeletons';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.3
};

type ChannelType = 'whatsapp' | 'email' | 'sms';

interface ProviderConfig {
  value: string;
  label: string;
  icon: string;
  fields: { key: string; label: string; labelAr: string; type: string; placeholder: string; required: boolean }[];
  connectUrl?: string;
  instructions: string;
  instructionsAr: string;
}

const PROVIDER_CONFIGS: Record<ChannelType, ProviderConfig[]> = {
  whatsapp: [
    {
      value: 'meta',
      label: 'WhatsApp Cloud API (Official)',
      icon: '📱',
      fields: [], // No manual fields - OAuth handles everything
      connectUrl: '',
      instructions: 'Connect your WhatsApp Business number instantly via Meta. Click "Connect with Meta" to authorize.',
      instructionsAr: 'اربط رقم WhatsApp Business الخاص بك فوراً عبر Meta. انقر على "الاتصال عبر Meta" للمصادقة.',
    },
    {
      value: 'twilio',
      label: 'Twilio',
      icon: '🔴',
      fields: [
        { key: 'accountSid', label: 'Account SID', labelAr: 'معرف الحساب', type: 'text', placeholder: 'ACxxxxxxx...', required: true },
        { key: 'authToken', label: 'Auth Token', labelAr: 'رمز المصادقة', type: 'password', placeholder: 'xxxxxxx...', required: true },
        { key: 'phoneNumber', label: 'WhatsApp Number', labelAr: 'رقم WhatsApp', type: 'tel', placeholder: '+14155238886', required: true },
      ],
      connectUrl: 'https://console.twilio.com/',
      instructions: 'Get your Account SID and Auth Token from Twilio Console. Enable WhatsApp sandbox or connect your own number.',
      instructionsAr: 'احصل على معرف الحساب ورمز المصادقة من لوحة Twilio. فعّل بيئة WhatsApp التجريبية أو اربط رقمك الخاص.',
    },
    {
      value: '360dialog',
      label: '360dialog',
      icon: '🔵',
      fields: [
        { key: 'apiKey', label: 'API Key', labelAr: 'مفتاح API', type: 'password', placeholder: 'xxxxxxx...', required: true },
        { key: 'phoneNumber', label: 'Phone Number', labelAr: 'رقم الهاتف', type: 'tel', placeholder: '+971 50 123 4567', required: true },
      ],
      connectUrl: 'https://hub.360dialog.com/',
      instructions: 'Get your API key from 360dialog Hub after connecting your WhatsApp Business number.',
      instructionsAr: 'احصل على مفتاح API من 360dialog Hub بعد ربط رقم WhatsApp Business الخاص بك.',
    },
    {
      value: 'vonage',
      label: 'Vonage',
      icon: '🟣',
      fields: [
        { key: 'apiKey', label: 'API Key', labelAr: 'مفتاح API', type: 'text', placeholder: 'xxxxxxx', required: true },
        { key: 'apiSecret', label: 'API Secret', labelAr: 'سر API', type: 'password', placeholder: 'xxxxxxx...', required: true },
        { key: 'phoneNumber', label: 'Phone Number', labelAr: 'رقم الهاتف', type: 'tel', placeholder: '+971 50 123 4567', required: true },
      ],
      connectUrl: 'https://dashboard.nexmo.com/',
      instructions: 'Get your API credentials from Vonage Dashboard and configure WhatsApp in Messages API.',
      instructionsAr: 'احصل على بيانات API من لوحة Vonage وقم بتكوين WhatsApp في Messages API.',
    },
  ],
  email: [
    {
      value: 'resend',
      label: 'Resend',
      icon: '📧',
      fields: [
        { key: 'apiKey', label: 'API Key', labelAr: 'مفتاح API', type: 'password', placeholder: 're_xxxxxxx...', required: true },
        { key: 'email', label: 'Sender Email', labelAr: 'البريد المرسل', type: 'email', placeholder: 'campaigns@yourcompany.com', required: true },
        { key: 'domain', label: 'Verified Domain', labelAr: 'النطاق المُتحقق منه', type: 'text', placeholder: 'yourcompany.com', required: true },
      ],
      connectUrl: 'https://resend.com/api-keys',
      instructions: 'Create an API key at resend.com/api-keys and verify your domain at resend.com/domains.',
      instructionsAr: 'أنشئ مفتاح API في resend.com/api-keys وتحقق من نطاقك في resend.com/domains.',
    },
    {
      value: 'sendgrid',
      label: 'SendGrid',
      icon: '💙',
      fields: [
        { key: 'apiKey', label: 'API Key', labelAr: 'مفتاح API', type: 'password', placeholder: 'SG.xxxxxxx...', required: true },
        { key: 'email', label: 'Sender Email', labelAr: 'البريد المرسل', type: 'email', placeholder: 'campaigns@yourcompany.com', required: true },
      ],
      connectUrl: 'https://app.sendgrid.com/settings/api_keys',
      instructions: 'Generate an API key with Mail Send permissions and verify your sender identity.',
      instructionsAr: 'أنشئ مفتاح API مع صلاحيات إرسال البريد وتحقق من هوية المرسل.',
    },
    {
      value: 'mailgun',
      label: 'Mailgun',
      icon: '📬',
      fields: [
        { key: 'apiKey', label: 'API Key', labelAr: 'مفتاح API', type: 'password', placeholder: 'key-xxxxxxx...', required: true },
        { key: 'domain', label: 'Domain', labelAr: 'النطاق', type: 'text', placeholder: 'mg.yourcompany.com', required: true },
        { key: 'email', label: 'Sender Email', labelAr: 'البريد المرسل', type: 'email', placeholder: 'campaigns@mg.yourcompany.com', required: true },
      ],
      connectUrl: 'https://app.mailgun.com/app/account/security/api_keys',
      instructions: 'Get your API key from Mailgun and add your sending domain.',
      instructionsAr: 'احصل على مفتاح API من Mailgun وأضف نطاق الإرسال الخاص بك.',
    },
    {
      value: 'ses',
      label: 'Amazon SES',
      icon: '☁️',
      fields: [
        { key: 'accessKeyId', label: 'Access Key ID', labelAr: 'معرف مفتاح الوصول', type: 'text', placeholder: 'AKIAxxxxxxx...', required: true },
        { key: 'secretAccessKey', label: 'Secret Access Key', labelAr: 'مفتاح الوصول السري', type: 'password', placeholder: 'xxxxxxx...', required: true },
        { key: 'region', label: 'Region', labelAr: 'المنطقة', type: 'text', placeholder: 'us-east-1', required: true },
        { key: 'email', label: 'Verified Email', labelAr: 'البريد المُتحقق منه', type: 'email', placeholder: 'campaigns@yourcompany.com', required: true },
      ],
      connectUrl: 'https://console.aws.amazon.com/ses/',
      instructions: 'Create IAM credentials with SES permissions and verify your email/domain in SES console.',
      instructionsAr: 'أنشئ بيانات IAM مع صلاحيات SES وتحقق من بريدك/نطاقك في لوحة SES.',
    },
  ],
  sms: [
    {
      value: 'twilio',
      label: 'Twilio',
      icon: '🔴',
      fields: [
        { key: 'accountSid', label: 'Account SID', labelAr: 'معرف الحساب', type: 'text', placeholder: 'ACxxxxxxx...', required: true },
        { key: 'authToken', label: 'Auth Token', labelAr: 'رمز المصادقة', type: 'password', placeholder: 'xxxxxxx...', required: true },
        { key: 'phoneNumber', label: 'Phone Number', labelAr: 'رقم الهاتف', type: 'tel', placeholder: '+14155238886', required: true },
      ],
      connectUrl: 'https://console.twilio.com/',
      instructions: 'Get your Account SID and Auth Token from Twilio Console, then purchase or port a phone number.',
      instructionsAr: 'احصل على معرف الحساب ورمز المصادقة من لوحة Twilio، ثم اشترِ رقم هاتف أو انقله.',
    },
    {
      value: 'messagebird',
      label: 'MessageBird',
      icon: '🐦',
      fields: [
        { key: 'apiKey', label: 'API Key', labelAr: 'مفتاح API', type: 'password', placeholder: 'xxxxxxx...', required: true },
        { key: 'phoneNumber', label: 'Phone Number', labelAr: 'رقم الهاتف', type: 'tel', placeholder: '+31612345678', required: true },
      ],
      connectUrl: 'https://dashboard.messagebird.com/en/developers/access',
      instructions: 'Generate an API key and purchase a virtual mobile number from MessageBird.',
      instructionsAr: 'أنشئ مفتاح API واشترِ رقم هاتف افتراضي من MessageBird.',
    },
    {
      value: 'vonage',
      label: 'Vonage',
      icon: '🟣',
      fields: [
        { key: 'apiKey', label: 'API Key', labelAr: 'مفتاح API', type: 'text', placeholder: 'xxxxxxx', required: true },
        { key: 'apiSecret', label: 'API Secret', labelAr: 'سر API', type: 'password', placeholder: 'xxxxxxx...', required: true },
        { key: 'phoneNumber', label: 'Phone Number', labelAr: 'رقم الهاتف', type: 'tel', placeholder: '+14155238886', required: true },
      ],
      connectUrl: 'https://dashboard.nexmo.com/',
      instructions: 'Get your API credentials from Vonage Dashboard and purchase a virtual number.',
      instructionsAr: 'احصل على بيانات API من لوحة Vonage واشترِ رقماً افتراضياً.',
    },
    {
      value: 'plivo',
      label: 'Plivo',
      icon: '🟢',
      fields: [
        { key: 'authId', label: 'Auth ID', labelAr: 'معرف المصادقة', type: 'text', placeholder: 'MAxxxxxxx...', required: true },
        { key: 'authToken', label: 'Auth Token', labelAr: 'رمز المصادقة', type: 'password', placeholder: 'xxxxxxx...', required: true },
        { key: 'phoneNumber', label: 'Phone Number', labelAr: 'رقم الهاتف', type: 'tel', placeholder: '+14155238886', required: true },
      ],
      connectUrl: 'https://console.plivo.com/',
      instructions: 'Get your Auth ID and Token from Plivo Console and rent a phone number.',
      instructionsAr: 'احصل على معرف وورمز المصادقة من لوحة Plivo واستأجر رقم هاتف.',
    },
  ],
};

export default function ConnectionsPage() {
  const { isRTL } = useLanguageSafe();
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const whatsApp = useWhatsAppConnection();
  const email = useEmailConnection();
  const sms = useSMSConnection();
  const { checkAllConnections, getHealthSummary } = useConnectionHealth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ChannelType>('whatsapp');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [healthSummary, setHealthSummary] = useState(getHealthSummary());
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const connectionId = searchParams.get('connection_id');

    if (success === 'true' && connectionId) {
      toast.success(isRTL ? 'تم ربط WhatsApp بنجاح!' : 'WhatsApp connected successfully!');
      // Refresh connections
      whatsApp.connections; // Trigger refetch
      setSearchParams({});
    } else if (error) {
      toast.error(isRTL ? `فشل الاتصال: ${error}` : `Connection failed: ${error}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, isRTL]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setHealthSummary(getHealthSummary());
  }, [whatsApp.connections, email.connections, sms.connections, getHealthSummary]);

  if (isLoading) {
    return <ConnectionsPageSkeleton isMobile={isMobile} />;
  }

  const runHealthCheck = async () => {
    toast.info(isRTL ? 'جاري فحص الاتصالات...' : 'Checking connections...');
    await checkAllConnections();
    setHealthSummary(getHealthSummary());
    setLastHealthCheck(new Date());
    toast.success(isRTL ? 'تم فحص جميع الاتصالات' : 'All connections checked');
  };

  const resetForm = () => {
    setFormData({});
    setSelectedProvider('');
  };

  const getProviderConfig = (channel: ChannelType, provider: string) => {
    return PROVIDER_CONFIGS[channel].find(p => p.value === provider);
  };

  const getProviderOptions = (channel: ChannelType) => {
    return PROVIDER_CONFIGS[channel].map(p => ({
      value: p.value,
      label: p.label,
      icon: p.icon,
    }));
  };

  // WhatsApp Meta OAuth Connect
  const handleMetaOAuthConnect = async () => {
    if (!profile?.company_id) {
      toast.error(isRTL ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
      return;
    }

    setOauthLoading(true);
    try {
      const redirectUri = `${window.location.origin}/connections`;
      
      const { data, error } = await supabase.functions.invoke('whatsapp-embedded-signup', {
        body: {
          company_id: profile.company_id,
          redirect_uri: redirectUri,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Redirect to Meta OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      toast.error(isRTL ? 'فشل بدء الاتصال' : 'Failed to start connection');
      setOauthLoading(false);
    }
  };

  const handleAddConnection = async () => {
    const providerConfig = getProviderConfig(activeTab, selectedProvider);
    
    // For WhatsApp Meta, use OAuth
    if (activeTab === 'whatsapp' && selectedProvider === 'meta') {
      await handleMetaOAuthConnect();
      return;
    }

    // Validate required fields
    if (providerConfig) {
      const missingFields = providerConfig.fields.filter(
        field => field.required && !formData[field.key]
      );
      if (missingFields.length > 0) {
        toast.error(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
        return;
      }
    }

    setConnecting(true);
    
    try {
      // Use the connection-manage edge function for real persistence
      const { data, error } = await supabase.functions.invoke('connection-manage', {
        body: {
          action: 'create',
          channel: activeTab,
          provider: selectedProvider,
          display_name: formData.displayName || `${selectedProvider} - ${formData.phoneNumber || formData.email}`,
          identifier: formData.phoneNumber || formData.email,
          credentials: formData,
          is_default: false,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(isRTL ? 'تم إضافة الاتصال بنجاح' : 'Connection added successfully');
        // Refresh connections based on channel
        if (activeTab === 'whatsapp') {
          whatsApp.addConnection({
            phoneNumber: formData.phoneNumber || '+971 50 000 0000',
            displayName: formData.displayName || 'New WhatsApp Number',
            provider: selectedProvider as any,
            status: 'connected',
            apiKey: formData.accessToken || formData.apiKey || formData.authToken,
            token: formData.businessId,
            lastSync: new Date(),
          });
        } else if (activeTab === 'email') {
          email.addConnection({
            email: formData.email || 'new@company.com',
            displayName: formData.displayName || 'New Email Sender',
            provider: selectedProvider as any,
            status: 'connected',
            apiKey: formData.apiKey || formData.accessKeyId,
            lastSync: new Date(),
            verified: false,
          });
        } else if (activeTab === 'sms') {
          sms.addConnection({
            phoneNumber: formData.phoneNumber || '+971 50 000 0000',
            displayName: formData.displayName || 'New SMS Number',
            provider: selectedProvider as any,
            status: 'connected',
            accountSid: formData.accountSid || formData.authId || formData.apiKey,
            authToken: formData.authToken || formData.apiSecret,
            lastSync: new Date(),
          });
        }
      } else {
        throw new Error(data?.error || 'Failed to add connection');
      }
    } catch (error) {
      console.error('Add connection error:', error);
      toast.error(isRTL ? 'فشل إضافة الاتصال' : 'Failed to add connection');
    }
    
    setConnecting(false);
    setShowAddDialog(false);
    resetForm();
  };

  const handleTestConnection = async (channel: ChannelType, id: string) => {
    let success = false;
    if (channel === 'whatsapp') {
      success = await whatsApp.testConnection(id);
    } else if (channel === 'email') {
      success = await email.testConnection(id);
    } else if (channel === 'sms') {
      success = await sms.testConnection(id);
    }
    toast.success(success 
      ? (isRTL ? 'الاتصال يعمل بشكل صحيح' : 'Connection working properly')
      : (isRTL ? 'فشل الاتصال' : 'Connection failed')
    );
  };

  const handleRemoveConnection = (channel: ChannelType, id: string) => {
    if (channel === 'whatsapp') {
      whatsApp.removeConnection(id);
    } else if (channel === 'email') {
      email.removeConnection(id);
    } else if (channel === 'sms') {
      sms.removeConnection(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
            <Check className="h-3 w-3" />
            {isRTL ? 'متصل' : 'Connected'}
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
            <AlertCircle className="h-3 w-3" />
            {isRTL ? 'خطأ' : 'Error'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <X className="h-3 w-3" />
            {isRTL ? 'غير متصل' : 'Disconnected'}
          </Badge>
        );
    }
  };

  const ConnectionCard = ({ 
    channel, 
    id, 
    identifier, 
    displayName, 
    provider, 
    status, 
    lastSync,
    isLoading,
  }: { 
    channel: ChannelType;
    id: string;
    identifier: string;
    displayName: string;
    provider: string;
    status: string;
    lastSync?: Date;
    isLoading: boolean;
  }) => {
    const getIcon = () => {
      switch (channel) {
        case 'whatsapp': return <Phone className="h-5 w-5 text-green-600" />;
        case 'email': return <Mail className="h-5 w-5 text-blue-600" />;
        case 'sms': return <MessageSquare className="h-5 w-5 text-purple-600" />;
      }
    };

    return (
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className={cn("flex items-center justify-between gap-4", isRTL && "flex-row-reverse")}>
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                {getIcon()}
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="font-semibold">{displayName}</p>
                <p className="text-sm text-muted-foreground">{identifier}</p>
                <div className={cn("flex items-center gap-2 mt-1", isRTL && "flex-row-reverse")}>
                  <Badge variant="outline" className="text-xs">{provider.toUpperCase()}</Badge>
                  {getStatusBadge(status)}
                </div>
                {lastSync && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? 'آخر مزامنة: ' : 'Last sync: '}
                    {lastSync.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
              <Button
                variant="ghost"
                size="icon"
                disabled={isLoading}
                onClick={() => handleTestConnection(channel, id)}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{isRTL ? 'حذف الاتصال؟' : 'Remove Connection?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isRTL 
                        ? 'سيتم حذف هذا الاتصال نهائياً. لا يمكن التراجع عن هذا الإجراء.'
                        : 'This connection will be permanently removed. This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleRemoveConnection(channel, id)}
                      className="bg-destructive text-destructive-foreground"
                    >
                      {isRTL ? 'حذف' : 'Remove'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ channel }: { channel: ChannelType }) => {
    const getIcon = () => {
      switch (channel) {
        case 'whatsapp': return <Phone className="h-8 w-8 text-green-600" />;
        case 'email': return <Mail className="h-8 w-8 text-blue-600" />;
        case 'sms': return <MessageSquare className="h-8 w-8 text-purple-600" />;
      }
    };

    const getTitle = () => {
      switch (channel) {
        case 'whatsapp': return isRTL ? 'لا توجد أرقام WhatsApp' : 'No WhatsApp Numbers';
        case 'email': return isRTL ? 'لا توجد عناوين بريد' : 'No Email Senders';
        case 'sms': return isRTL ? 'لا توجد أرقام SMS' : 'No SMS Numbers';
      }
    };

    return (
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            {getIcon()}
          </div>
          <h3 className="font-semibold mb-2">{getTitle()}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {isRTL ? 'أضف اتصالاً لبدء إرسال الحملات' : 'Add a connection to start sending campaigns'}
          </p>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {isRTL ? 'إضافة اتصال' : 'Add Connection'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const totalConnections = whatsApp.connections.length + email.connections.length + sms.connections.length;
  const connectedCount = [
    ...whatsApp.connections.filter(c => c.status === 'connected'),
    ...email.connections.filter(c => c.status === 'connected'),
    ...sms.connections.filter(c => c.status === 'connected'),
  ].length;

  return (
    <motion.div 
      className="space-y-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between gap-3 flex-wrap", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div className={isRTL ? "text-right" : ""}>
            <h1 className="text-2xl font-bold">{isRTL ? 'إعدادات الاتصالات' : 'Connection Settings'}</h1>
            <p className="text-sm text-muted-foreground">
              {isRTL 
                ? `${connectedCount} من ${totalConnections} اتصال نشط`
                : `${connectedCount} of ${totalConnections} connections active`}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={runHealthCheck} className="gap-2">
          <Activity className="h-4 w-4" />
          {isRTL ? 'فحص الاتصالات' : 'Run Health Check'}
        </Button>
      </div>

      {/* Health Status Alert */}
      {healthSummary.failed > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{isRTL ? 'تحذير اتصالات' : 'Connection Warning'}</AlertTitle>
          <AlertDescription>
            {isRTL 
              ? `${healthSummary.failed} اتصال فاشل يحتاج إلى اهتمام`
              : `${healthSummary.failed} connection(s) failing and need attention`}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats with Health Monitoring */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardContent className="p-4 text-center">
            <Phone className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">{whatsApp.connections.length}</p>
            <p className="text-xs text-muted-foreground">WhatsApp</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Mail className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{email.connections.length}</p>
            <p className="text-xs text-muted-foreground">Email</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold">{sms.connections.length}</p>
            <p className="text-xs text-muted-foreground">SMS</p>
          </CardContent>
        </Card>
        <Card className={cn(
          "border",
          healthSummary.overallStatus === 'healthy' && "bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20",
          healthSummary.overallStatus === 'degraded' && "bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20",
          healthSummary.overallStatus === 'warning' && "bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20",
        )}>
          <CardContent className="p-4 text-center">
            {healthSummary.overallStatus === 'healthy' ? (
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
            ) : healthSummary.overallStatus === 'degraded' ? (
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-600" />
            )}
            <p className="text-2xl font-bold">{healthSummary.healthy}/{healthSummary.total}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'سليم' : 'Healthy'}</p>
            {lastHealthCheck && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {isRTL ? 'آخر فحص: ' : 'Last: '}{lastHealthCheck.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ChannelType)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="whatsapp" className="gap-2">
              <Phone className="h-4 w-4" />
              WhatsApp
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                {whatsApp.connections.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                {email.connections.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS
              <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                {sms.connections.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {isRTL ? 'إضافة اتصال' : 'Add Connection'}
          </Button>
        </div>

        <TabsContent value="whatsapp" className="mt-4 space-y-4">
          {whatsApp.connections.length > 0 ? (
            whatsApp.connections.map(conn => (
              <ConnectionCard
                key={conn.id}
                channel="whatsapp"
                id={conn.id}
                identifier={conn.phoneNumber}
                displayName={conn.displayName}
                provider={conn.provider}
                status={conn.status}
                lastSync={conn.lastSync}
                isLoading={whatsApp.isLoading}
              />
            ))
          ) : (
            <EmptyState channel="whatsapp" />
          )}
        </TabsContent>

        <TabsContent value="email" className="mt-4 space-y-4">
          {email.connections.length > 0 ? (
            email.connections.map(conn => (
              <ConnectionCard
                key={conn.id}
                channel="email"
                id={conn.id}
                identifier={conn.email}
                displayName={conn.displayName}
                provider={conn.provider}
                status={conn.status}
                lastSync={conn.lastSync}
                isLoading={email.isLoading}
              />
            ))
          ) : (
            <EmptyState channel="email" />
          )}
        </TabsContent>

        <TabsContent value="sms" className="mt-4 space-y-4">
          {sms.connections.length > 0 ? (
            sms.connections.map(conn => (
              <ConnectionCard
                key={conn.id}
                channel="sms"
                id={conn.id}
                identifier={conn.phoneNumber}
                displayName={conn.displayName}
                provider={conn.provider}
                status={conn.status}
                lastSync={conn.lastSync}
                isLoading={sms.isLoading}
              />
            ))
          ) : (
            <EmptyState channel="sms" />
          )}
        </TabsContent>
      </Tabs>

      {/* Add Connection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeTab === 'whatsapp' && <Phone className="h-5 w-5 text-green-600" />}
              {activeTab === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
              {activeTab === 'sms' && <MessageSquare className="h-5 w-5 text-purple-600" />}
              {isRTL ? 'إضافة اتصال جديد' : `Add ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Connection`}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? 'اختر مزود الخدمة وأدخل بيانات الاتصال' : 'Select a provider and enter connection details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'الاسم المعروض' : 'Display Name'}</Label>
              <Input 
                placeholder={isRTL ? 'مثال: المبيعات' : 'e.g., Sales Team'} 
                value={formData.displayName || ''}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? 'المزود' : 'Provider'}</Label>
              <Select value={selectedProvider} onValueChange={(value) => {
                setSelectedProvider(value);
                setFormData({ displayName: formData.displayName || '' });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر المزود' : 'Select provider'} />
                </SelectTrigger>
                <SelectContent>
                  {getProviderOptions(activeTab).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProvider && (() => {
              const providerConfig = getProviderConfig(activeTab, selectedProvider);
              if (!providerConfig) return null;

              // Special handling for WhatsApp Meta OAuth
              const isMetaOAuth = activeTab === 'whatsapp' && selectedProvider === 'meta';

              return (
                <>
                  {/* Provider Instructions */}
                  <Alert className={isMetaOAuth ? 'border-green-500/50 bg-green-500/5' : ''}>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>{isRTL ? 'تعليمات الاتصال' : 'Connection Instructions'}</AlertTitle>
                    <AlertDescription className="text-sm">
                      {isRTL ? providerConfig.instructionsAr : providerConfig.instructions}
                      {providerConfig.connectUrl && (
                        <Button 
                          variant="link" 
                          className="h-auto p-0 ml-2" 
                          onClick={() => window.open(providerConfig.connectUrl, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {isRTL ? 'فتح لوحة التحكم' : 'Open Dashboard'}
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>

                  {/* Meta OAuth Button */}
                  {isMetaOAuth && (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed border-green-500/30 bg-green-500/5">
                        <div className="flex items-center gap-2 text-green-600">
                          <Phone className="h-6 w-6" />
                          <span className="font-semibold">
                            {isRTL ? 'الاتصال عبر Meta Business' : 'Connect via Meta Business'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                          {isRTL 
                            ? 'اربط رقم WhatsApp Business الخاص بك بنقرة واحدة. سيتم إعادة توجيهك إلى Meta للمصادقة.'
                            : 'Connect your WhatsApp Business number with one click. You\'ll be redirected to Meta for authorization.'}
                        </p>
                        <Button 
                          size="lg"
                          className="bg-[#1877F2] hover:bg-[#166FE5] text-white gap-2 mt-2"
                          onClick={handleMetaOAuthConnect}
                          disabled={oauthLoading}
                        >
                          {oauthLoading ? (
                            <>
                              <RefreshCw className="h-5 w-5 animate-spin" />
                              {isRTL ? 'جاري التحويل...' : 'Redirecting...'}
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 36 36" className="h-5 w-5 fill-current">
                                <path d="M15 35.8C6.5 34.3 0 26.9 0 18 0 8.1 8.1 0 18 0s18 8.1 18 18c0 8.9-6.5 16.3-15 17.8l-1-.8h-4l-1 .8z"/>
                                <path fill="#fff" d="M25 23l.8-5H21v-3.5c0-1.4.5-2.5 2.7-2.5H26V7.4c-1.3-.2-2.7-.4-4-.4-4.1 0-7 2.5-7 7v4h-4.5v5H15v12.7c1 .2 2 .3 3 .3s2-.1 3-.3V23h4z"/>
                              </svg>
                              {isRTL ? 'الاتصال عبر Meta' : 'Connect with Meta'}
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {isRTL 
                          ? 'ستتم معالجة الرسائل عبر Meta Cloud API. تكاليف الرسائل يتحملها حسابك في Meta.'
                          : 'Messages will be processed via Meta Cloud API. Message costs are charged to your Meta account.'}
                      </p>
                    </div>
                  )}

                  {/* Dynamic Fields for non-OAuth providers */}
                  {!isMetaOAuth && providerConfig.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>{isRTL ? field.labelAr : field.label}</Label>
                      <Input 
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                      />
                    </div>
                  ))}
                </>
              );
            })()}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            {/* Hide connect button for Meta OAuth since we have a dedicated button */}
            {!(activeTab === 'whatsapp' && selectedProvider === 'meta') && (
              <Button 
                onClick={handleAddConnection} 
                disabled={!selectedProvider || connecting}
              >
                {connecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {isRTL ? 'جاري الاتصال...' : 'Connecting...'}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {isRTL ? 'اتصال' : 'Connect'}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
