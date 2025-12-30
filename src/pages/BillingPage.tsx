import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  Building2,
  Download,
  Plus,
  Trash2,
  Shield,
  Users,
  BarChart3,
  Headphones,
  ArrowRight,
  Rocket,
  Gift,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BillingPageSkeleton } from "@/components/ui/page-skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useLanguageSafe } from "@/contexts/LanguageContext";
import { PlanType } from "@/hooks/useSubscription";

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

const planIcons: Record<PlanType, typeof Zap> = {
  free: Gift,
  starter: Users,
  growth: Rocket,
  business: Crown,
};

const planColors: Record<PlanType, string> = {
  free: "from-slate-500 to-slate-400",
  starter: "from-blue-500 to-blue-400",
  growth: "from-purple-500 to-purple-400",
  business: "from-amber-500 to-amber-400",
};

const invoices = [
  { id: "INV-001", date: "Dec 1, 2024", amount: 149.00, status: "Paid" },
  { id: "INV-002", date: "Nov 1, 2024", amount: 149.00, status: "Paid" },
  { id: "INV-003", date: "Oct 1, 2024", amount: 149.00, status: "Paid" },
];

export default function BillingPage() {
  const isMobile = useIsMobile();
  const { isRTL } = useLanguageSafe();
  const { planFeatures, allPlans, usage, isLoading } = useSubscriptionContext();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleUpgrade = (planType: string) => {
    toast.success(`Upgrading to ${planType} plan...`);
    // TODO: Integrate with Stripe
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    toast.success(`Downloading ${invoiceId}...`);
  };

  if (isLoading) {
    return <BillingPageSkeleton isMobile={isMobile} />;
  }

  const currentPlanType = planFeatures?.planType || 'free';
  const CurrentIcon = planIcons[currentPlanType];

  // Calculate usage percentages
  const userUsagePercent = planFeatures 
    ? Math.min(100, (planFeatures.currentUserCount / planFeatures.userLimit) * 100)
    : 0;
  const leadUsagePercent = planFeatures?.leadLimit 
    ? Math.min(100, (usage.leadsCount / planFeatures.leadLimit) * 100)
    : 100;
  const listingUsagePercent = planFeatures?.listingLimit 
    ? Math.min(100, (usage.listingsCount / planFeatures.listingLimit) * 100)
    : 100;

  return (
    <motion.div 
      className={cn("space-y-8", isRTL && "rtl")}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isRTL ? 'الفواتير والاشتراك' : 'Billing & Subscription'}
          </h1>
          <p className="text-muted-foreground">
            {isRTL ? 'إدارة اشتراكك وتفاصيل الدفع' : 'Manage your subscription and payment details'}
          </p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={billingCycle === "monthly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBillingCycle("monthly")}
          >
            {isRTL ? 'شهري' : 'Monthly'}
          </Button>
          <Button
            variant={billingCycle === "yearly" ? "default" : "ghost"}
            size="sm"
            onClick={() => setBillingCycle("yearly")}
            className="relative"
          >
            {isRTL ? 'سنوي' : 'Yearly'}
            <Badge className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0 bg-green-500">
              -17%
            </Badge>
          </Button>
        </div>
      </div>

      {/* Current Plan Overview */}
      <Card className="overflow-hidden">
        <div className={cn("bg-gradient-to-r p-6", planColors[currentPlanType], "bg-opacity-10")}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", planColors[currentPlanType])}>
                <CurrentIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{planFeatures?.planName || 'Free Forever'}</h2>
                  <Badge className="bg-primary/20 text-primary">
                    {isRTL ? 'الحالية' : 'Current'}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {currentPlanType === 'free' 
                    ? (isRTL ? 'مجاني للأبد' : 'Free Forever')
                    : `$${billingCycle === 'yearly' 
                        ? Math.round((allPlans.find(p => p.planType === currentPlanType)?.priceYearly || 0) / 12)
                        : allPlans.find(p => p.planType === currentPlanType)?.priceMonthly || 0
                      }/${isRTL ? 'شهر' : 'month'}`
                  }
                </p>
              </div>
            </div>
            {currentPlanType !== 'free' && (
              <div className="flex flex-wrap gap-3">
                <Button variant="outline">
                  {isRTL ? 'إدارة الاشتراك' : 'Manage Subscription'}
                </Button>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  {isRTL ? 'إلغاء الخطة' : 'Cancel Plan'}
                </Button>
              </div>
            )}
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isRTL ? 'أعضاء الفريق' : 'Team Members'}
                </span>
                <span className="font-medium">
                  {planFeatures?.currentUserCount || 1} / {planFeatures?.userLimit || 1}
                </span>
              </div>
              <Progress value={userUsagePercent} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isRTL ? 'العملاء المحتملين' : 'Leads'}
                </span>
                <span className="font-medium">
                  {usage.leadsCount} / {planFeatures?.leadLimit || '∞'}
                </span>
              </div>
              <Progress value={leadUsagePercent} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isRTL ? 'العقارات' : 'Listings'}
                </span>
                <span className="font-medium">
                  {usage.listingsCount} / {planFeatures?.listingLimit || '∞'}
                </span>
              </div>
              <Progress value={listingUsagePercent} className="h-2" />
            </div>
          </div>

          {/* Free plan limitations notice */}
          {currentPlanType === 'free' && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {isRTL ? 'أنت على الخطة المجانية' : 'You\'re on the Free plan'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isRTL 
                      ? 'قم بالترقية لإرسال الحملات، تفعيل روبوتات الدردشة، وإضافة أعضاء الفريق'
                      : 'Upgrade to send campaigns, activate chatbots, and add team members'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {isRTL ? 'الخطط المتاحة' : 'Available Plans'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allPlans.map((plan) => {
            const Icon = planIcons[plan.planType];
            const isCurrentPlan = plan.planType === currentPlanType;
            const price = billingCycle === "yearly" ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
            const isPopular = plan.planType === 'starter';
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative overflow-hidden transition-all hover:shadow-lg",
                  isPopular && "ring-2 ring-primary",
                  isCurrentPlan && "bg-primary/5"
                )}
              >
                {isPopular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground">
                      {isRTL ? 'الأكثر شعبية' : 'Most Popular'}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                    planColors[plan.planType]
                  )}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {isRTL ? `حتى ${plan.userLimit} مستخدم` : `Up to ${plan.userLimit} users`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    {plan.planType === 'free' ? (
                      <span className="text-4xl font-bold">{isRTL ? 'مجاني' : 'Free'}</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${price}</span>
                        <span className="text-muted-foreground">/{isRTL ? 'شهر' : 'mo'}</span>
                        {billingCycle === "yearly" && (
                          <p className="text-sm text-green-600 mt-1">
                            {isRTL 
                              ? `وفر $${(plan.priceMonthly * 12 - plan.priceYearly)}/سنة`
                              : `Save $${(plan.priceMonthly * 12 - plan.priceYearly)}/year`
                            }
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{plan.leadLimit ? `${plan.leadLimit} ${isRTL ? 'عميل' : 'leads'}` : (isRTL ? 'عملاء غير محدودين' : 'Unlimited leads')}</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{plan.listingLimit ? `${plan.listingLimit} ${isRTL ? 'عقار' : 'listings'}` : (isRTL ? 'عقارات غير محدودة' : 'Unlimited listings')}</span>
                    </li>
                    {plan.canSendCampaigns && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{isRTL ? 'إرسال الحملات' : 'Send campaigns'}</span>
                      </li>
                    )}
                    {plan.canActivateChatbots && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{isRTL ? 'تفعيل روبوتات الدردشة' : 'Activate chatbots'}</span>
                      </li>
                    )}
                    {plan.canManageTeam && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{isRTL ? 'إدارة الفريق' : 'Team management'}</span>
                      </li>
                    )}
                    {plan.hasPrioritySupport && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{isRTL ? 'دعم أولوية' : 'Priority support'}</span>
                      </li>
                    )}
                    {plan.canUseCustomRoles && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{isRTL ? 'أدوار مخصصة' : 'Custom roles'}</span>
                      </li>
                    )}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"}
                    disabled={isCurrentPlan || (plan.planType === 'free' && currentPlanType !== 'free')}
                    onClick={() => handleUpgrade(plan.planType)}
                  >
                    {isCurrentPlan 
                      ? (isRTL ? 'الخطة الحالية' : 'Current Plan')
                      : plan.planType === 'business' 
                        ? (isRTL ? 'تواصل معنا' : 'Contact Sales')
                        : plan.planType === 'free'
                          ? (isRTL ? 'تخفيض' : 'Downgrade')
                          : (isRTL ? 'ترقية' : 'Upgrade')
                    }
                    {!isCurrentPlan && plan.planType !== 'free' && <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-2 rotate-180" : "ml-2")} />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {currentPlanType !== 'free' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {isRTL ? 'طريقة الدفع' : 'Payment Method'}
              </CardTitle>
              <CardDescription>
                {isRTL ? 'إدارة معلومات الدفع' : 'Manage your payment information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-10 bg-gradient-to-r from-blue-600 to-blue-400 rounded-md flex items-center justify-center text-white text-xs font-bold shadow">
                    VISA
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/26</p>
                  </div>
                </div>
                <Badge variant="secondary">{isRTL ? 'افتراضي' : 'Default'}</Badge>
              </div>

              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {isRTL ? 'إضافة طريقة دفع' : 'Add Payment Method'}
              </Button>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {isRTL ? 'سجل الفواتير' : 'Billing History'}
              </CardTitle>
              <CardDescription>
                {isRTL ? 'عرض وتحميل الفواتير السابقة' : 'View and download past invoices'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{invoice.id}</p>
                        <p className="text-xs text-muted-foreground">{invoice.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">${invoice.amount.toFixed(2)}</p>
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                          {invoice.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'لماذا الترقية؟' : 'Why Upgrade?'}</CardTitle>
          <CardDescription>
            {isRTL ? 'افتح المزيد من الميزات مع خطة أعلى' : 'Unlock more features with a higher plan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium">{isRTL ? 'المزيد من المستخدمين' : 'More Team Members'}</h4>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'وسع فريقك بلا حدود' : 'Scale your team without limits'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">{isRTL ? 'حملات تسويقية' : 'Marketing Campaigns'}</h4>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'أرسل حملات واتساب وبريد' : 'Send WhatsApp & email campaigns'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium">{isRTL ? 'روبوتات الدردشة' : 'AI Chatbots'}</h4>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'تأهيل العملاء تلقائياً' : 'Automatically qualify leads'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Headphones className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-medium">{isRTL ? 'مدير حساب مخصص' : 'Dedicated Manager'}</h4>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'دعم شخصي للحساب' : 'Personal account support'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
