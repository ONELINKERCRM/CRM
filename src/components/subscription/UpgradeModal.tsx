import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Users, Rocket, Crown, ArrowRight } from 'lucide-react';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  requiredPlan?: 'starter' | 'growth' | 'business';
  title?: string;
  description?: string;
}

const planIcons = {
  starter: Users,
  growth: Rocket,
  business: Crown,
};

const planColors = {
  starter: 'bg-blue-500',
  growth: 'bg-purple-500',
  business: 'bg-amber-500',
};

export function UpgradeModal({ 
  open, 
  onOpenChange, 
  feature,
  requiredPlan = 'starter',
  title,
  description 
}: UpgradeModalProps) {
  const { allPlans, planFeatures } = useSubscriptionContext();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>(requiredPlan);
  const [isYearly, setIsYearly] = useState(false);

  const featureMessages: Record<string, { title: string; description: string }> = {
    send_campaigns: {
      title: isRTL ? 'أرسل حملاتك التسويقية' : 'Send Your Marketing Campaigns',
      description: isRTL 
        ? 'قم بالترقية لإرسال حملات البريد الإلكتروني والرسائل النصية وواتساب'
        : 'Upgrade to send email, SMS, and WhatsApp campaigns to your leads',
    },
    activate_chatbots: {
      title: isRTL ? 'فعّل روبوتات الدردشة' : 'Activate Your Chatbots',
      description: isRTL
        ? 'قم بالترقية لتفعيل الردود التلقائية على واتساب'
        : 'Upgrade to activate automated WhatsApp responses and lead qualification',
    },
    add_users: {
      title: isRTL ? 'أضف المزيد من المستخدمين' : 'Add More Users',
      description: isRTL
        ? 'وصلت إلى الحد الأقصى للمستخدمين. قم بالترقية لإضافة المزيد من أعضاء الفريق'
        : 'You\'ve reached your user limit. Upgrade to add more team members',
    },
    leads_limit: {
      title: isRTL ? 'أضف المزيد من العملاء المحتملين' : 'Add More Leads',
      description: isRTL
        ? 'وصلت إلى حد 150 عميل. قم بالترقية للحصول على عملاء غير محدودين'
        : 'You\'ve reached the 150 leads limit. Upgrade for unlimited leads',
    },
    listings_limit: {
      title: isRTL ? 'أضف المزيد من العقارات' : 'Add More Listings',
      description: isRTL
        ? 'وصلت إلى حد 20 عقار. قم بالترقية للحصول على عقارات غير محدودة'
        : 'You\'ve reached the 20 listings limit. Upgrade for unlimited listings',
    },
    team_management: {
      title: isRTL ? 'إدارة الفريق' : 'Team Management',
      description: isRTL
        ? 'قم بالترقية لإنشاء وإدارة الفرق'
        : 'Upgrade to create and manage teams',
    },
    advanced_assignment: {
      title: isRTL ? 'قواعد التوزيع المتقدمة' : 'Advanced Assignment Rules',
      description: isRTL
        ? 'قم بالترقية لاستخدام قواعد توزيع العملاء المتقدمة'
        : 'Upgrade to use advanced lead assignment rules and campaign-based routing',
    },
    custom_roles: {
      title: isRTL ? 'الأدوار المخصصة' : 'Custom Roles & Permissions',
      description: isRTL
        ? 'قم بالترقية لإنشاء أدوار وصلاحيات مخصصة'
        : 'Upgrade to create custom roles and granular permissions',
    },
  };

  const message = feature ? featureMessages[feature] : null;
  const displayTitle = title || message?.title || (isRTL ? 'ترقية خطتك' : 'Upgrade Your Plan');
  const displayDescription = description || message?.description || (isRTL ? 'اختر الخطة المناسبة لك' : 'Choose the plan that fits your needs');

  const upgradePlans = allPlans.filter(p => p.planType !== 'free');

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/billing', { state: { selectedPlan, isYearly } });
  };

  const PlanIcon = planIcons[selectedPlan as keyof typeof planIcons] || Zap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[600px]", isRTL && "rtl")}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-full", planColors[requiredPlan])}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-xl">{displayTitle}</DialogTitle>
          </div>
          <DialogDescription>{displayDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 p-2 bg-muted rounded-lg">
            <span className={cn("text-sm", !isYearly && "font-semibold text-primary")}>
              {isRTL ? 'شهري' : 'Monthly'}
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                isYearly ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                  isYearly ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
            <span className={cn("text-sm", isYearly && "font-semibold text-primary")}>
              {isRTL ? 'سنوي' : 'Yearly'}
              <Badge variant="secondary" className="ml-2 text-xs">
                {isRTL ? 'وفر 17%' : 'Save 17%'}
              </Badge>
            </span>
          </div>

          {/* Plan cards */}
          <div className="grid gap-3">
            {upgradePlans.map((plan) => {
              const Icon = planIcons[plan.planType as keyof typeof planIcons] || Zap;
              const isSelected = selectedPlan === plan.planType;
              const price = isYearly ? plan.priceYearly / 12 : plan.priceMonthly;
              const isCurrentMin = plan.planType === requiredPlan;

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.planType)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50",
                    isCurrentMin && !isSelected && "ring-2 ring-primary/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", planColors[plan.planType as keyof typeof planColors] || "bg-primary")}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        {isCurrentMin && (
                          <Badge variant="outline" className="text-xs">
                            {isRTL ? 'الحد الأدنى' : 'Minimum'}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {isRTL ? `حتى ${plan.userLimit} مستخدم` : `Up to ${plan.userLimit} users`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold">${Math.round(price)}</span>
                    <span className="text-muted-foreground">/{isRTL ? 'شهر' : 'mo'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected plan features */}
          {selectedPlan && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <span className="text-sm font-medium">
                {isRTL ? 'ما ستحصل عليه:' : 'What you\'ll get:'}
              </span>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {selectedPlan !== 'free' && (
                  <>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {isRTL ? 'عملاء غير محدودين' : 'Unlimited leads'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {isRTL ? 'عقارات غير محدودة' : 'Unlimited listings'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {isRTL ? 'إرسال الحملات' : 'Send campaigns'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {isRTL ? 'تفعيل روبوتات الدردشة' : 'Activate chatbots'}
                    </li>
                  </>
                )}
                {(selectedPlan === 'growth' || selectedPlan === 'business') && (
                  <>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {isRTL ? 'توزيع متقدم' : 'Advanced assignment'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {isRTL ? 'دعم أولوية' : 'Priority support'}
                    </li>
                  </>
                )}
                {selectedPlan === 'business' && (
                  <>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {isRTL ? 'أدوار مخصصة' : 'Custom roles'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {isRTL ? 'مدير حساب مخصص' : 'Dedicated manager'}
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}

          <Button onClick={handleUpgrade} className="w-full" size="lg">
            {isRTL ? 'ترقية الآن' : 'Upgrade Now'}
            <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-2 rotate-180" : "ml-2")} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
