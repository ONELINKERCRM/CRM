import { useState } from 'react';
import { 
  RefreshCw, Check, X, AlertCircle, Save,
  MessageCircle, ExternalLink, ShieldCheck, FileText, Clock, CheckCircle2, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhatsAppConnection } from '@/contexts/WhatsAppConnectionContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export function WhatsAppSettings() {
  const { isRTL } = useLanguageSafe();
  const { connections, activeConnection, addConnection, updateConnection, testConnection, isLoading } = useWhatsAppConnection();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    provider: activeConnection?.provider || 'meta',
    apiKey: activeConnection?.apiKey || '',
    phoneNumber: activeConnection?.phoneNumber || '',
    token: activeConnection?.token || '',
  });

  const handleTestConnection = async () => {
    if (activeConnection) {
      const success = await testConnection(activeConnection.id);
      if (success) {
        toast.success(isRTL ? 'تم الاتصال بنجاح' : 'Connected successfully');
      } else {
        toast.error(isRTL ? 'فشل الاتصال' : 'Connection failed');
      }
    } else if (formData.apiKey && formData.phoneNumber) {
      // Create new connection
      addConnection({
        phoneNumber: formData.phoneNumber,
        displayName: 'WhatsApp Business',
        provider: formData.provider as any,
        status: 'connected',
        apiKey: formData.apiKey,
        token: formData.token,
        lastSync: new Date(),
      });
      toast.success(isRTL ? 'تم الاتصال بنجاح' : 'Connected successfully');
    } else {
      toast.error(isRTL ? 'يرجى إدخال البيانات المطلوبة' : 'Please enter required fields');
    }
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    if (activeConnection) {
      updateConnection(activeConnection.id, {
        provider: formData.provider as any,
        apiKey: formData.apiKey,
        phoneNumber: formData.phoneNumber,
        token: formData.token,
      });
    }
    setTimeout(() => {
      toast.success(isRTL ? 'تم حفظ الإعدادات' : 'Settings saved');
      setIsSaving(false);
    }, 500);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <Check className="h-3 w-3 mr-1" />
            {isRTL ? 'متصل' : 'Connected'}
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            {isRTL ? 'خطأ' : 'Error'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <X className="h-3 w-3 mr-1" />
            {isRTL ? 'غير متصل' : 'Disconnected'}
          </Badge>
        );
    }
  };

  const isConnected = activeConnection?.status === 'connected';

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6 max-w-4xl mx-auto">
      {/* Hero Connect Button for Disconnected State */}
      {!isConnected && (
        <Card className="bg-gradient-to-br from-green-500/10 via-green-600/5 to-transparent border-green-500/20">
          <CardContent className="p-6 md:p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold">
                {isRTL ? 'ربط WhatsApp Business API' : 'Connect WhatsApp Business API'}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                {isRTL 
                  ? 'اربط رقم WhatsApp Business الخاص بك لإرسال الرسائل الآلية وتشغيل الشات بوت'
                  : 'Connect your WhatsApp Business number to send automated messages and run your chatbot'
                }
              </p>
            </div>
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700 text-white gap-2 px-8"
              onClick={() => window.open('https://business.facebook.com/settings/whatsapp-business-accounts', '_blank')}
            >
              <MessageCircle className="h-5 w-5" />
              {isRTL ? 'ربط WhatsApp الآن' : 'Connect WhatsApp Now'}
              <ExternalLink className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'سيتم توجيهك إلى Meta Business Suite' : 'You will be redirected to Meta Business Suite'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Meta Rules & Guidelines */}
      <Card className="bg-card/50 backdrop-blur-sm border-amber-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base md:text-lg text-amber-600">
              {isRTL ? 'قواعد Meta المهمة' : 'Important Meta Rules'}
            </CardTitle>
          </div>
          <CardDescription>
            {isRTL 
              ? 'يجب اتباع هذه القواعد لتجنب حظر حسابك'
              : 'You must follow these rules to avoid account suspension'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{isRTL ? 'قوالب معتمدة فقط' : 'Approved Templates Only'}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'استخدم قوالب معتمدة مسبقاً من Meta فقط'
                    : 'Only use pre-approved Meta templates'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{isRTL ? 'نافذة 24 ساعة' : '24-Hour Window'}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'الرد بحرية خلال 24 ساعة من آخر رسالة'
                    : 'Reply freely within 24 hours of last message'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{isRTL ? 'موافقة العميل' : 'Customer Consent'}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'الحصول على موافقة قبل الرسائل التسويقية'
                    : 'Get consent before marketing messages'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{isRTL ? 'رقم أعمال فقط' : 'Business Number Only'}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'استخدم رقم WhatsApp Business مُتحقق منه'
                    : 'Use a verified WhatsApp Business number'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => window.open('https://developers.facebook.com/docs/whatsapp/overview/getting-started', '_blank')}
          >
            <FileText className="h-4 w-4" />
            {isRTL ? 'قراءة سياسات Meta الكاملة' : 'Read Full Meta Policies'}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base md:text-lg">
                {isRTL ? 'تكوين API' : 'API Configuration'}
              </CardTitle>
              <CardDescription>
                {isRTL ? 'أدخل بيانات اعتماد WhatsApp Business API' : 'Enter your WhatsApp Business API credentials'}
              </CardDescription>
            </div>
            {getStatusBadge(activeConnection?.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show connected numbers if any */}
          {connections.length > 0 && (
            <div className="space-y-2 mb-4">
              <Label>{isRTL ? 'الأرقام المتصلة' : 'Connected Numbers'}</Label>
              <div className="flex flex-wrap gap-2">
                {connections.map(conn => (
                  <Badge 
                    key={conn.id} 
                    variant={conn.status === 'connected' ? 'default' : 'outline'}
                    className="gap-1"
                  >
                    {conn.status === 'connected' && <Check className="h-3 w-3" />}
                    {conn.phoneNumber} ({conn.provider})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{isRTL ? 'المزود' : 'Provider'}</Label>
            <Select value={formData.provider} onValueChange={(v) => setFormData({ ...formData, provider: v as 'meta' | 'twilio' | '360dialog' | 'vonage' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meta">Official WhatsApp Cloud API (Recommended)</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="360dialog">360Dialog</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isRTL ? 'مفتاح API' : 'API Key / Access Token'}</Label>
            <Input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="EAAxxxxxxx..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{isRTL ? 'معرف رقم الهاتف' : 'Phone Number ID'}</Label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="1234567890..."
              />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'معرف حساب الأعمال' : 'Business Account ID'}</Label>
              <Input
                type="password"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="1234567890..."
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRTL ? 'اختبار الاتصال' : 'Test Connection'}
            </Button>
            <Button onClick={handleSaveSettings} disabled={isSaving} className="flex-1 bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              {isRTL ? 'حفظ التكوين' : 'Save Configuration'}
            </Button>
          </div>

          {isConnected && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <Check className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">
                  {isRTL ? 'متصل بنجاح' : 'Successfully Connected'}
                </p>
                <p className="text-xs text-green-600/80">
                  {isRTL ? 'آخر مزامنة: ' : 'Last sync: '}
                  {activeConnection?.lastSync?.toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-700 hover:text-green-800 hover:bg-green-500/10"
                onClick={() => window.open('https://business.facebook.com/settings/whatsapp-business-accounts', '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
