import { MessageCircle, Mail, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CampaignChannel } from '../types';

interface ChannelOption {
  id: CampaignChannel;
  icon: React.ElementType;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  color: string;
}

const channels: ChannelOption[] = [
  {
    id: 'whatsapp',
    icon: MessageCircle,
    label: 'WhatsApp',
    labelAr: 'واتساب',
    description: 'Send messages via WhatsApp Business API',
    descriptionAr: 'إرسال رسائل عبر WhatsApp Business API',
    color: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
  },
  {
    id: 'email',
    icon: Mail,
    label: 'Email',
    labelAr: 'البريد الإلكتروني',
    description: 'Send professional email campaigns',
    descriptionAr: 'إرسال حملات بريد إلكتروني احترافية',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
  },
  {
    id: 'sms',
    icon: Smartphone,
    label: 'SMS',
    labelAr: 'رسائل نصية',
    description: 'Send short text messages to leads',
    descriptionAr: 'إرسال رسائل نصية قصيرة للعملاء',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20',
  },
];

interface ChannelStepProps {
  selected?: CampaignChannel;
  onSelect: (channel: CampaignChannel) => void;
  isRTL?: boolean;
}

export function ChannelStep({ selected, onSelect, isRTL = false }: ChannelStepProps) {
  return (
    <div className="space-y-6">
      <div className={cn("text-center", isRTL && "font-arabic")}>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isRTL ? 'اختر قناة الحملة' : 'Select Campaign Channel'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL 
            ? 'اختر كيف تريد الوصول إلى جمهورك'
            : 'Choose how you want to reach your audience'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const isSelected = selected === channel.id;

          return (
            <Card
              key={channel.id}
              onClick={() => onSelect(channel.id)}
              className={cn(
                "cursor-pointer transition-all border-2 hover:shadow-lg",
                isSelected 
                  ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg scale-[1.02]" 
                  : "border-border/50 hover:border-primary/50",
                channel.color
              )}
            >
              <CardContent className="p-6 text-center">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
                  "bg-background/50 backdrop-blur-sm"
                )}>
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className={cn("text-lg font-bold mb-2", isRTL && "font-arabic")}>
                  {isRTL ? channel.labelAr : channel.label}
                </h3>
                <p className={cn("text-sm opacity-80", isRTL && "font-arabic")}>
                  {isRTL ? channel.descriptionAr : channel.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
