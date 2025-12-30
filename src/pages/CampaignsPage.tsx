import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Megaphone, Send, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { CampaignsPageSkeleton } from '@/components/ui/page-skeletons';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { CampaignStepIndicator } from '@/components/marketing-hub/CampaignStepIndicator';
import { ChannelStep } from '@/components/marketing-hub/steps/ChannelStep';
import { ConnectionStep } from '@/components/marketing-hub/steps/ConnectionStep';
import { CampaignTypeStep } from '@/components/marketing-hub/steps/CampaignTypeStep';
import { TemplateStep } from '@/components/marketing-hub/steps/TemplateStep';
import { AudienceStep } from '@/components/marketing-hub/steps/AudienceStep';
import { ScheduleStep } from '@/components/marketing-hub/steps/ScheduleStep';
import { ReviewStep } from '@/components/marketing-hub/steps/ReviewStep';
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  CampaignStep, CampaignChannel, CampaignType, CampaignDraft, LeadFilter, AudienceSelectionMethod, ImportedLead
} from '@/components/marketing-hub/types';

const stepOrder: CampaignStep[] = ['channel', 'connection', 'type', 'template', 'audience', 'schedule', 'review'];

export default function CampaignsPage() {
  const { t } = useLocalization();

  const { isRTL } = useLanguageSafe();
  const { session } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<CampaignStep>('channel');
  const [completedSteps, setCompletedSteps] = useState<CampaignStep[]>([]);
  const [draft, setDraft] = useState<CampaignDraft>({ sendNow: true, channel: 'whatsapp' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Fetch company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!session?.user?.id) return;

      const { data: agent } = await supabase
        .from('agents')
        .select('company_id')
        .eq('user_id', session.user.id)
        .single();

      if (agent?.company_id) {
        setCompanyId(agent.company_id);
      }
    };

    fetchCompanyId();
  }, [session?.user?.id]);

  if (isLoading) {
    return <CampaignsPageSkeleton isMobile={isMobile} />;
  }

  const currentIndex = stepOrder.indexOf(currentStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === stepOrder.length - 1;

  const getAudienceCount = () => {
    if (draft.audienceMethod === 'excel_import') {
      return draft.importedLeads?.length || 0;
    }
    return draft.selectedLeads?.length || 0;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'channel': return !!draft.channel;
      case 'connection': return !!draft.connectionId;
      case 'type': return !!draft.type;
      case 'template': return !!(draft.templateId || draft.customContent);
      case 'audience': return getAudienceCount() > 0;
      case 'schedule': return draft.sendNow || !!draft.scheduledAt;
      case 'review': return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      if (currentStep === 'connection') {
        toast.error(isRTL ? 'يرجى اختيار وسيلة اتصال' : 'Please select a connection');
        return;
      }
      if (currentStep === 'audience') {
        toast.error(isRTL ? 'يرجى اختيار الجمهور' : 'Please select audience');
        return;
      }
      toast.error(isRTL ? 'يرجى إكمال هذه الخطوة' : 'Please complete this step');
      return;
    }
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error(isRTL ? 'لم يتم العثور على الشركة' : 'Company not found');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the campaign
      const campaignData = {
        company_id: companyId,
        channel: draft.channel || 'whatsapp',
        campaign_type: draft.type === 'lead-nurturing' ? 'broadcast' :
          draft.type === 'drip' ? 'drip' :
            draft.type === 'property-promotion' ? 'broadcast' : 'broadcast',
        name: `Campaign ${new Date().toLocaleDateString()}`,
        connection_id: draft.connectionId,
        template_content: draft.customContent ? { body: draft.customContent } : null,
        template_id: draft.templateId,
        status: draft.sendNow ? 'sending' : 'scheduled',
        scheduled_at: draft.scheduledAt?.toISOString() || null,
        timezone: draft.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        total_recipients: getAudienceCount(),
        audience_type: draft.audienceMethod || 'manual',
      };

      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) {
        console.error('Campaign creation error:', campaignError);
        throw new Error(campaignError.message);
      }

      console.log('Campaign created:', campaign);

      // 2. Add recipients based on audience method
      let allRecipients: any[] = [];

      if (draft.audienceMethod === 'excel_import' && draft.importedLeads) {
        // Excel imported leads
        allRecipients = draft.importedLeads.map(lead => ({
          campaign_id: campaign.id,
          company_id: companyId,
          phone_number: lead.phone,
          name: lead.name || null,
          imported_from: 'excel_import',
          delivery_status: 'queued',
        }));
      } else if (draft.selectedLeads && draft.selectedLeads.length > 0) {
        // Manually selected leads from CRM
        // Fetch leads in batches if needed, but for now fetch id/phone/name
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, phone')
          .in('id', draft.selectedLeads);

        if (leads) {
          allRecipients = leads
            .filter(lead => lead.phone) // Ensure phone exists
            .map(lead => ({
              campaign_id: campaign.id,
              company_id: companyId,
              lead_id: lead.id,
              phone_number: lead.phone,
              name: lead.name,
              imported_from: draft.audienceMethod === 'select_all' ? 'select_all' : 'manual_selection',
              delivery_status: 'queued',
            }));
        }
      }

      // Batch insert recipients
      if (allRecipients.length > 0) {
        const BATCH_SIZE = 500;
        const totalBatches = Math.ceil(allRecipients.length / BATCH_SIZE);
        let insertedCount = 0;

        for (let i = 0; i < totalBatches; i++) {
          const batch = allRecipients.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

          // Provide feedback
          toast.loading(
            isRTL
              ? `جاري إضافة المستلمين... (${insertedCount}/${allRecipients.length})`
              : `Adding recipients... (${insertedCount}/${allRecipients.length})`,
            { id: 'recipient-progress' }
          );

          const { error: recipientsError } = await supabase
            .from('campaign_recipients')
            .insert(batch);

          if (recipientsError) {
            console.error('Recipients insert error (batch ' + i + '):', recipientsError);
            toast.dismiss('recipient-progress');

            // Mark campaign as failed/draft due to error
            await supabase.from('campaigns').update({ status: 'draft' }).eq('id', campaign.id);
            throw new Error(`Failed to add recipients batch ${i + 1}. Campaign reverted to draft.`);
          }

          insertedCount += batch.length;
        }

        toast.dismiss('recipient-progress');
        console.log(`Added ${allRecipients.length} recipients in ${totalBatches} batches`);
      }

      // 3. Create analytics entry
      await supabase.from('campaign_analytics').insert({
        campaign_id: campaign.id,
        company_id: companyId,
        total_recipients: allRecipients.length,
        total_queued: allRecipients.length,
      });

      // 4. Log campaign creation
      await supabase.from('campaign_logs').insert({
        campaign_id: campaign.id,
        company_id: companyId,
        action: 'Campaign created',
        action_type: 'created',
        details: {
          audience_count: allRecipients.length,
          audience_type: draft.audienceMethod,
          scheduled: !draft.sendNow,
        },
      });

      // 5. If sending now, trigger the edge function
      if (draft.sendNow && allRecipients.length > 0) {
        const { data: execData, error: execError } = await supabase.functions.invoke('campaign-execute', {
          body: {
            action: 'start',
            campaign_id: campaign.id,
          },
        });

        if (execError) {
          console.error('Campaign execution error:', execError);
          toast.warning(isRTL
            ? 'تم إنشاء الحملة ولكن فشل البدء. يمكنك إعادة المحاولة من قائمة الحملات.'
            : 'Campaign created but failed to start. You can retry from the campaigns list.'
          );
        } else {
          const successMsg = execData?.sent
            ? `${execData.sent}/${allRecipients.length}`
            : `${allRecipients.length}`;
          toast.success(isRTL
            ? `تم إرسال الحملة إلى ${successMsg} مستلم!`
            : `Campaign sent to ${successMsg} recipients!`
          );
        }
      } else if (!draft.sendNow) {
        toast.success(isRTL
          ? `تم جدولة الحملة لـ ${allRecipients.length} مستلم`
          : `Campaign scheduled for ${allRecipients.length} recipients`
        );
      } else {
        toast.success(isRTL ? 'تم إنشاء الحملة بنجاح' : 'Campaign created successfully');
      }

      // Reset form
      setCurrentStep('channel');
      setCompletedSteps([]);
      setDraft({ sendNow: true });

    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(isRTL
        ? `فشل إنشاء الحملة: ${error.message}`
        : `Failed to create campaign: ${error.message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'channel':
        return <ChannelStep selected={draft.channel} onSelect={(c) => setDraft({ ...draft, channel: c })} isRTL={isRTL} />;
      case 'connection':
        return <ConnectionStep channel={draft.channel!} selectedConnectionId={draft.connectionId} onSelect={(id) => setDraft({ ...draft, connectionId: id })} isRTL={isRTL} />;
      case 'type':
        return <CampaignTypeStep selected={draft.type} onSelect={(t) => setDraft({ ...draft, type: t })} isRTL={isRTL} />;
      case 'template':
        return <TemplateStep channel={draft.channel!} selectedTemplateId={draft.templateId} customContent={draft.customContent} onSelectTemplate={(id) => setDraft({ ...draft, templateId: id, customContent: undefined })} onCustomContent={(c) => setDraft({ ...draft, customContent: c, templateId: undefined })} isRTL={isRTL} />;
      case 'audience':
        return (
          <AudienceStep
            selectedLeads={draft.selectedLeads}
            audienceMethod={draft.audienceMethod}
            importedLeads={draft.importedLeads}
            onSelectLeads={(leads) => setDraft({ ...draft, selectedLeads: leads })}
            onFiltersChange={() => { }}
            onAudienceMethodChange={(method) => setDraft({ ...draft, audienceMethod: method })}
            onImportedLeadsChange={(leads) => setDraft({ ...draft, importedLeads: leads })}
            isRTL={isRTL}
          />
        );
      case 'schedule':
        return <ScheduleStep sendNow={draft.sendNow} scheduledDate={draft.scheduledAt} onSendNowChange={(v) => setDraft({ ...draft, sendNow: v })} onScheduledDateChange={(d) => setDraft({ ...draft, scheduledAt: d })} onTimezoneChange={(tz) => setDraft({ ...draft, timezone: tz })} isRTL={isRTL} />;
      case 'review':
        return <ReviewStep draft={draft} isRTL={isRTL} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-2xl font-bold">{isRTL ? 'إنشاء حملة' : 'Create Campaign'}</h1>
          <p className="text-sm text-muted-foreground">{isRTL ? 'أنشئ وأرسل حملات تسويقية' : 'Create and send marketing campaigns'}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <Card>
        <CardContent className="p-4">
          <CampaignStepIndicator currentStep={currentStep} completedSteps={completedSteps} onStepClick={setCurrentStep} isRTL={isRTL} />
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="min-h-[400px]">
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
        <Button variant="outline" onClick={handleBack} disabled={isFirstStep}>
          <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
          {isRTL ? 'السابق' : 'Back'}
        </Button>
        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={isSubmitting || getAudienceCount() === 0} className="bg-success hover:bg-success/90">
            {isSubmitting ? (
              <><span className="animate-spin mr-2">⏳</span>{isRTL ? 'جاري الإرسال...' : 'Sending...'}</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />{draft.sendNow ? (isRTL ? 'إرسال الآن' : 'Send Now') : (isRTL ? 'جدولة' : 'Schedule')} ({getAudienceCount()})</>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()}>
            {isRTL ? 'التالي' : 'Next'}
            <ArrowRight className={cn("h-4 w-4", isRTL ? "mr-2" : "ml-2")} />
          </Button>
        )}
      </div>
    </div>
  );
}
