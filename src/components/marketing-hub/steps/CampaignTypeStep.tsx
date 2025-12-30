import { Heart, Zap, Home, Calendar, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CampaignType } from '../types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TypeOption {
  id: CampaignType;
  icon: React.ElementType;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  tooltip: string;
  tooltipAr: string;
  color: string;
}

const types: TypeOption[] = [
  {
    id: 'lead-nurturing',
    icon: Heart,
    label: 'Lead Nurturing',
    labelAr: 'رعاية العملاء',
    description: 'Build relationships with potential customers',
    descriptionAr: 'بناء علاقات مع العملاء المحتملين',
    tooltip: 'Send personalized follow-up messages to keep leads engaged over time',
    tooltipAr: 'إرسال رسائل متابعة مخصصة للحفاظ على تفاعل العملاء',
    color: 'bg-pink-500/10 text-pink-600 border-pink-500/20 hover:bg-pink-500/20',
  },
  {
    id: 'drip',
    icon: Zap,
    label: 'Drip Campaign',
    labelAr: 'حملة متتابعة',
    description: 'Automated sequence of messages',
    descriptionAr: 'سلسلة رسائل آلية',
    tooltip: 'Schedule automated messages to be sent at specific intervals',
    tooltipAr: 'جدولة رسائل آلية لإرسالها على فترات محددة',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20',
  },
  {
    id: 'property-promotion',
    icon: Home,
    label: 'Property Promotion',
    labelAr: 'ترويج العقارات',
    description: 'Showcase your latest listings',
    descriptionAr: 'عرض أحدث عقاراتك',
    tooltip: 'Send property alerts, price drops, and new listing notifications',
    tooltipAr: 'إرسال تنبيهات العقارات وانخفاض الأسعار والعقارات الجديدة',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20',
  },
  {
    id: 'event',
    icon: Calendar,
    label: 'Event / Open House',
    labelAr: 'حدث / معاينة عقار',
    description: 'Invite leads to property viewings',
    descriptionAr: 'دعوة العملاء لمعاينة العقارات',
    tooltip: 'Create event invitations with RSVP tracking and reminders',
    tooltipAr: 'إنشاء دعوات للأحداث مع تتبع الحضور والتذكيرات',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
  },
];

interface CampaignTypeStepProps {
  selected?: CampaignType;
  onSelect: (type: CampaignType) => void;
  isRTL?: boolean;
}

export function CampaignTypeStep({ selected, onSelect, isRTL = false }: CampaignTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className={cn("text-center", isRTL && "font-arabic")}>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isRTL ? 'اختر نوع الحملة' : 'Select Campaign Type'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL 
            ? 'اختر نوع الحملة التي تريد إنشاءها'
            : 'Choose the type of campaign you want to create'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {types.map((type) => {
          const Icon = type.icon;
          const isSelected = selected === type.id;

          return (
            <Card
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={cn(
                "cursor-pointer transition-all border-2",
                isSelected 
                  ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg scale-[1.02]" 
                  : "border-border/50 hover:border-primary/50 hover:shadow-md",
                type.color
              )}
            >
              <CardContent className="p-5">
                <div className={cn("flex items-start gap-4", isRTL && "flex-row-reverse")}>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    "bg-background/50 backdrop-blur-sm"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className={cn("flex-1", isRTL && "text-right")}>
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse justify-end")}>
                      <h3 className={cn("font-bold", isRTL && "font-arabic")}>
                        {isRTL ? type.labelAr : type.label}
                      </h3>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground">
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side={isRTL ? "left" : "right"} className="max-w-xs">
                          {isRTL ? type.tooltipAr : type.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className={cn("text-sm opacity-80 mt-1", isRTL && "font-arabic")}>
                      {isRTL ? type.descriptionAr : type.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
