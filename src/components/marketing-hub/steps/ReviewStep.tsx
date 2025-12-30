import { 
  CheckCircle2, MessageCircle, Mail, Smartphone, Users,
  Clock, Send, FileText, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CampaignChannel, CampaignType, CampaignDraft } from '../types';
import { format } from 'date-fns';

interface ReviewStepProps {
  draft: CampaignDraft;
  isRTL?: boolean;
}

export function ReviewStep({ draft, isRTL = false }: ReviewStepProps) {
  const getChannelIcon = (channel?: CampaignChannel) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageCircle className="h-5 w-5 text-green-600" />;
      case 'email':
        return <Mail className="h-5 w-5 text-blue-600" />;
      case 'sms':
        return <Smartphone className="h-5 w-5 text-purple-600" />;
      default:
        return null;
    }
  };

  const getChannelLabel = (channel?: CampaignChannel) => {
    const labels = {
      whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
      email: { en: 'Email', ar: 'البريد الإلكتروني' },
      sms: { en: 'SMS', ar: 'رسائل نصية' },
    };
    return channel ? labels[channel][isRTL ? 'ar' : 'en'] : '';
  };

  const getTypeLabel = (type?: CampaignType) => {
    const labels = {
      'lead-nurturing': { en: 'Lead Nurturing', ar: 'رعاية العملاء' },
      'drip': { en: 'Drip Campaign', ar: 'حملة متتابعة' },
      'property-promotion': { en: 'Property Promotion', ar: 'ترويج العقارات' },
      'event': { en: 'Event / Open House', ar: 'حدث / معاينة عقار' },
    };
    return type ? labels[type][isRTL ? 'ar' : 'en'] : '';
  };

  const getAudienceCount = () => {
    if (draft.audienceMethod === 'excel_import') {
      return draft.importedLeads?.length || 0;
    }
    return draft.selectedLeads?.length || 0;
  };

  const hasWarnings = !draft.channel || !draft.connectionId || 
                     (!draft.templateId && !draft.customContent) || 
                     getAudienceCount() === 0;

  return (
    <div className="space-y-6">
      <div className={cn("text-center", isRTL && "font-arabic")}>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isRTL ? 'مراجعة الحملة' : 'Review Campaign'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL 
            ? 'راجع تفاصيل حملتك قبل الإرسال'
            : 'Review your campaign details before sending'}
        </p>
      </div>

      {hasWarnings && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm text-warning">
                {isRTL 
                  ? 'بعض المعلومات المطلوبة مفقودة. يرجى إكمال جميع الخطوات.'
                  : 'Some required information is missing. Please complete all steps.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {/* Channel & Connection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("text-sm font-medium flex items-center gap-2", isRTL && "flex-row-reverse")}>
              {getChannelIcon(draft.channel)}
              {isRTL ? 'القناة والاتصال' : 'Channel & Connection'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <div>
                <p className="font-semibold">{getChannelLabel(draft.channel)}</p>
                <p className="text-sm text-muted-foreground">
                  {draft.connectionId ? '+971 50 123 4567' : (isRTL ? 'غير محدد' : 'Not selected')}
                </p>
              </div>
              {draft.channel && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {isRTL ? 'متصل' : 'Connected'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("text-sm font-medium flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <FileText className="h-4 w-4" />
              {isRTL ? 'نوع الحملة' : 'Campaign Type'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-semibold">
              {draft.type ? getTypeLabel(draft.type) : (isRTL ? 'غير محدد' : 'Not selected')}
            </p>
          </CardContent>
        </Card>

        {/* Message Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("text-sm font-medium flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <MessageCircle className="h-4 w-4" />
              {isRTL ? 'معاينة الرسالة' : 'Message Preview'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {draft.customContent || draft.templateId ? (
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {draft.customContent || 'Hello {{lead_name}}! 👋\n\nThank you for your interest in our properties.\n\nBest regards,\n{{agent_name}}'}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {isRTL ? 'لم يتم تحديد قالب أو رسالة' : 'No template or message selected'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Audience */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("text-sm font-medium flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Users className="h-4 w-4" />
              {isRTL ? 'الجمهور' : 'Audience'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <div>
                <p className="font-semibold text-2xl text-primary">
                  {getAudienceCount()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'عميل سيستلم الحملة' : 'leads will receive this campaign'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("text-sm font-medium flex items-center gap-2", isRTL && "flex-row-reverse")}>
              {draft.sendNow ? <Send className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {isRTL ? 'الجدولة' : 'Schedule'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {draft.sendNow ? (
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Badge className="bg-success text-success-foreground">
                  {isRTL ? 'إرسال فوري' : 'Send Immediately'}
                </Badge>
              </div>
            ) : draft.scheduledAt ? (
              <div>
                <p className="font-semibold">
                  {format(draft.scheduledAt, "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(draft.scheduledAt, "h:mm a")}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {isRTL ? 'لم يتم تحديد الجدولة' : 'No schedule selected'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
