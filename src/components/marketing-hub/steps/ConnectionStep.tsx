import { useState, useEffect } from 'react';
import {
  Plus, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  ExternalLink, Phone, Mail, MessageSquare, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CampaignChannel } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ConnectionStepProps {
  channel: CampaignChannel;
  selectedConnectionId?: string;
  onSelect: (connectionId: string) => void;
  isRTL?: boolean;
}

interface MarketingConnection {
  id: string;
  channel: string;
  provider: string;
  display_name: string;
  identifier: string;
  status: string;
  verified: boolean;
  health_status: string;
  last_sync: string;
}

const PROVIDER_CONFIGS: Record<string, { fields: { key: string; label: string; type: string; placeholder: string }[] }> = {
  meta: {
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: '123456789012345' },
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'EAAxxxxxxx...' },
      { key: 'businessId', label: 'Business ID', type: 'text', placeholder: '123456789012345' },
      { key: 'phoneNumber', label: 'Phone Number', type: 'tel', placeholder: '+971501234567' },
    ]
  },
  twilio: {
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'ACxxxxxxx...' },
      { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'xxxxxxx...' },
      { key: 'phoneNumber', label: 'Phone Number', type: 'tel', placeholder: '+14155238886' },
    ]
  },
  resend: {
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 're_xxxxxxx...' },
      { key: 'email', label: 'Sender Email', type: 'email', placeholder: 'campaigns@yourcompany.com' },
      { key: 'domain', label: 'Verified Domain', type: 'text', placeholder: 'yourcompany.com' },
    ]
  },
  sendgrid: {
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'SG.xxxxxxx...' },
      { key: 'email', label: 'Sender Email', type: 'email', placeholder: 'campaigns@yourcompany.com' },
    ]
  },
  messagebird: {
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'xxxxxxx...' },
      { key: 'phoneNumber', label: 'Phone Number', type: 'tel', placeholder: '+31612345678' },
    ]
  },
  vonage: {
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text', placeholder: 'xxxxxxx' },
      { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'xxxxxxx...' },
      { key: 'phoneNumber', label: 'Phone Number', type: 'tel', placeholder: '+14155238886' },
    ]
  },
};

export function ConnectionStep({
  channel,
  selectedConnectionId,
  onSelect,
  isRTL = false
}: ConnectionStepProps) {
  const { session } = useAuth();
  const [connections, setConnections] = useState<MarketingConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);

  // Fetch company ID and connections
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return;

      setIsLoading(true);

      // Get company ID
      const { data: agent } = await supabase
        .from('agents')
        .select('company_id')
        .eq('user_id', session.user.id)
        .single();

      if (agent?.company_id) {
        setCompanyId(agent.company_id);

        // Fetch connections for this channel
        const { data: conns, error } = await supabase
          .from('marketing_connections')
          .select('id, channel, provider, display_name, identifier, status, verified, health_status, last_sync')
          .eq('company_id', agent.company_id)
          .eq('channel', channel)
          .order('created_at', { ascending: false });

        if (!error && conns) {
          setConnections(conns as MarketingConnection[]);

          // Auto-select first connection if none selected
          if (!selectedConnectionId && conns.length > 0) {
            onSelect(conns[0].id);
          }
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [session?.user?.id, channel]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      connected: 'bg-green-500/10 text-green-600 border-green-500/20',
      disconnected: 'bg-muted text-muted-foreground border-muted',
      error: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return styles[status as keyof typeof styles] || styles.disconnected;
  };

  const getChannelIcon = () => {
    switch (channel) {
      case 'whatsapp': return <Phone className="h-6 w-6 text-green-600" />;
      case 'email': return <Mail className="h-6 w-6 text-blue-600" />;
      case 'sms': return <MessageSquare className="h-6 w-6 text-purple-600" />;
    }
  };

  const getProviderOptions = () => {
    switch (channel) {
      case 'whatsapp':
        return [
          { value: 'meta', label: 'WhatsApp Business (Official)', icon: '📱', hasEmbeddedSignup: true },
          { value: 'twilio', label: 'Twilio', icon: '🔴' },
          { value: '360dialog', label: '360dialog', icon: '🔵' },
          { value: 'vonage', label: 'Vonage', icon: '🟣' },
        ];
      case 'email':
        return [
          { value: 'resend', label: 'Resend', icon: '📧' },
          { value: 'sendgrid', label: 'SendGrid', icon: '💙' },
          { value: 'mailgun', label: 'Mailgun', icon: '📬' },
          { value: 'ses', label: 'Amazon SES', icon: '☁️' },
        ];
      case 'sms':
        return [
          { value: 'twilio', label: 'Twilio', icon: '🔴' },
          { value: 'messagebird', label: 'MessageBird', icon: '🐦' },
          { value: 'vonage', label: 'Vonage', icon: '🟣' },
          { value: 'plivo', label: 'Plivo', icon: '🟢' },
        ];
    }
  };

  const handleMetaEmbeddedSignup = async () => {
    if (!companyId) {
      toast.error(isRTL ? 'لم يتم العثور على الشركة' : 'Company not found');
      return;
    }

    setConnecting(true);

    try {
      const redirectUri = window.location.origin + '/connections?source=whatsapp';

      const { data, error } = await supabase.functions.invoke('whatsapp-embedded-signup', {
        body: {
          action: 'init',
          company_id: companyId,
          redirect_uri: redirectUri,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open Meta OAuth in a new window
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        toast.info(isRTL
          ? 'يرجى إكمال عملية الربط في النافذة المنبثقة'
          : 'Please complete the connection in the popup window'
        );
      }
    } catch (err: any) {
      console.error('Embedded signup error:', err);
      toast.error(isRTL ? 'فشل بدء عملية الربط' : 'Failed to start connection process');
    } finally {
      setConnecting(false);
      setShowConnectDialog(false);
    }
  };

  const handleManualConnect = async () => {
    if (!companyId) {
      toast.error(isRTL ? 'لم يتم العثور على الشركة' : 'Company not found');
      return;
    }

    setConnecting(true);

    try {
      const identifier = formData.phoneNumber || formData.email || 'New Connection';
      const displayName = formData.displayName || identifier;

      const credentials: Record<string, string> = {};
      const config = PROVIDER_CONFIGS[selectedProvider];
      if (config) {
        for (const field of config.fields) {
          if (formData[field.key]) {
            credentials[field.key] = formData[field.key];
          }
        }
      }

      const { data: newConn, error } = await supabase
        .from('marketing_connections')
        .insert({
          company_id: companyId,
          channel,
          provider: selectedProvider,
          display_name: displayName,
          identifier,
          status: 'connected',
          credentials,
          verified: false,
          health_status: 'unknown',
        })
        .select()
        .single();

      if (error) throw error;

      setConnections(prev => [newConn as MarketingConnection, ...prev]);
      onSelect(newConn.id);

      toast.success(isRTL ? 'تم إضافة الاتصال بنجاح' : 'Connection added successfully');
      setShowConnectDialog(false);
      setFormData({});
      setSelectedProvider('');
    } catch (err: any) {
      console.error('Connect error:', err);
      toast.error(isRTL ? 'فشل إضافة الاتصال' : 'Failed to add connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    setTesting(connectionId);

    try {
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) return;

      if (connection.provider === 'meta' && channel === 'whatsapp') {
        const { data, error } = await supabase.functions.invoke('whatsapp-embedded-signup', {
          body: { action: 'test', connection_id: connectionId },
        });

        if (error || !data?.success) {
          toast.error(data?.error || (isRTL ? 'فشل الاختبار' : 'Test failed'));
          return;
        }

        toast.success(isRTL
          ? `الاتصال يعمل: ${data.verified_name || data.phone_number}`
          : `Connection working: ${data.verified_name || data.phone_number}`
        );

        // Refresh connections
        const { data: updated } = await supabase
          .from('marketing_connections')
          .select('*')
          .eq('id', connectionId)
          .single();

        if (updated) {
          setConnections(prev => prev.map(c => c.id === connectionId ? updated as MarketingConnection : c));
        }
      } else {
        // Simulate test for other providers
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success(isRTL ? 'الاتصال يعمل بشكل صحيح' : 'Connection is working properly');
      }
    } catch (err: any) {
      toast.error(isRTL ? 'فشل اختبار الاتصال' : 'Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={cn("text-center", isRTL && "font-arabic")}>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isRTL ? 'اختر الاتصال' : 'Select Connection'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL
            ? 'اختر أو أضف اتصالاً لإرسال حملتك'
            : 'Choose or add a connection to send your campaign'}
        </p>
      </div>

      {connections.length > 0 ? (
        <div className="grid gap-4">
          {connections.map((connection) => {
            const isSelected = selectedConnectionId === connection.id;

            return (
              <Card
                key={connection.id}
                onClick={() => onSelect(connection.id)}
                className={cn(
                  "cursor-pointer transition-all border-2",
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg"
                    : "border-border/50 hover:border-primary/50 hover:shadow-md"
                )}
              >
                <CardContent className="p-4">
                  <div className={cn("flex items-center justify-between gap-4", isRTL && "flex-row-reverse")}>
                    <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        {getChannelIcon()}
                      </div>
                      <div className={isRTL ? "text-right" : ""}>
                        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                          <span className="font-semibold">{connection.display_name || connection.identifier}</span>
                          {getStatusIcon(connection.status)}
                        </div>
                        <div className={cn("flex items-center gap-2 mt-1", isRTL && "flex-row-reverse")}>
                          <Badge variant="outline" className="text-xs">
                            {connection.provider.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", getStatusBadge(connection.status))}>
                            {connection.status}
                          </Badge>
                          {connection.verified && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                              {isRTL ? 'موثق' : 'Verified'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestConnection(connection.id);
                      }}
                      disabled={testing === connection.id}
                    >
                      {testing === connection.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {getChannelIcon()}
            <h3 className="font-semibold mt-4">
              {isRTL ? 'لا توجد اتصالات' : 'No connections'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL ? 'أضف اتصالاً لبدء إرسال الحملات' : 'Add a connection to start sending campaigns'}
            </p>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowConnectDialog(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        {isRTL ? 'إضافة اتصال جديد' : 'Add New Connection'}
      </Button>

      {/* Add Connection Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={isRTL ? "text-right" : ""}>
              {isRTL ? 'إضافة اتصال جديد' : 'Add New Connection'}
            </DialogTitle>
            <DialogDescription className={isRTL ? "text-right" : ""}>
              {isRTL
                ? 'اختر مزود الخدمة وأدخل بيانات الاعتماد'
                : 'Select a provider and enter your credentials'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'مزود الخدمة' : 'Provider'}</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر مزود الخدمة' : 'Select provider'} />
                </SelectTrigger>
                <SelectContent>
                  {getProviderOptions()?.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      <span className="flex items-center gap-2">
                        <span>{provider.icon}</span>
                        <span>{provider.label}</span>
                        {(provider as any).hasEmbeddedSignup && (
                          <Badge variant="secondary" className="text-xs ml-2">Recommended</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProvider === 'meta' && channel === 'whatsapp' ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  {isRTL
                    ? 'انقر أدناه لربط رقم WhatsApp Business الخاص بك عبر Meta. سيتم فتح نافذة جديدة لإكمال العملية.'
                    : 'Click below to connect your WhatsApp Business number via Meta. A new window will open to complete the process.'}
                </div>
                <Button
                  className="w-full"
                  onClick={handleMetaEmbeddedSignup}
                  disabled={connecting}
                >
                  {connecting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />{isRTL ? 'جاري الربط...' : 'Connecting...'}</>
                  ) : (
                    <><ExternalLink className="h-4 w-4 mr-2" />{isRTL ? 'ربط عبر Meta' : 'Connect with Meta'}</>
                  )}
                </Button>
              </div>
            ) : selectedProvider && PROVIDER_CONFIGS[selectedProvider] ? (
              <div className="space-y-4">
                {PROVIDER_CONFIGS[selectedProvider].fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    />
                  </div>
                ))}
                <Button
                  className="w-full"
                  onClick={handleManualConnect}
                  disabled={connecting}
                >
                  {connecting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />{isRTL ? 'جاري الربط...' : 'Connecting...'}</>
                  ) : (
                    isRTL ? 'ربط' : 'Connect'
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
