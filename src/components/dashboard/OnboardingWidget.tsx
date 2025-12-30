import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, X, PartyPopper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OnboardingStep {
    id: string;
    label: { en: string; ar: string };
    action: string;
    completed: boolean;
}

export function OnboardingWidget() {
    const { isRTL } = useLanguageSafe();
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    const [isVisible, setIsVisible] = useState(true); // Keep local state for smooth exit or optimistic UI
    const isDismissed = profile?.dashboard_preferences?.onboarding_dismissed === true;
    const [steps, setSteps] = useState<OnboardingStep[]>([
        {
            id: 'connect_whatsapp',
            label: { en: 'Connect WhatsApp', ar: 'ربط واتساب' },
            action: '/connections?source=onboarding',
            completed: false
        },
        {
            id: 'import_leads',
            label: { en: 'Import Leads', ar: 'استيراد العملاء' },
            action: '/leads?action=import',
            completed: false
        },
        {
            id: 'create_campaign',
            label: { en: 'Create First Campaign', ar: 'إنشاء أول حملة' },
            action: '/campaigns?action=create',
            completed: false
        },
        {
            id: 'deploy_chatbot',
            label: { en: 'Deploy Chatbot', ar: 'نشر البوت' },
            action: '/whatsapp-chatbot',
            completed: false
        }
    ]);

    // Mock checking completion status (in a real app, this would check DB/Context)
    useEffect(() => {
        // This is a placeholder logic. In production, you'd fetch this from backend.
        const checkStatus = () => {
            // Example: Check localStorage for demo purposes
            const completed = JSON.parse(localStorage.getItem('onboarding_status') || '{}');

            setSteps(prev => prev.map(step => ({
                ...step,
                completed: !!completed[step.id]
            })));
        };

        checkStatus();
    }, []);

    const progress = Math.round((steps.filter(s => s.completed).length / steps.length) * 100);

    const handleStepClick = (step: OnboardingStep) => {
        if (step.completed) return;
        navigate(step.action);
    };

    const markComplete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = { ...JSON.parse(localStorage.getItem('onboarding_status') || '{}'), [id]: true };
        localStorage.setItem('onboarding_status', JSON.stringify(newStatus));

        setSteps(prev => {
            const newSteps = prev.map(s => s.id === id ? { ...s, completed: true } : s);
            const newProgress = Math.round((newSteps.filter(s => s.completed).length / newSteps.length) * 100);

            if (newProgress === 100) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                toast.success(isRTL ? 'تهانينا! لقد أكملت إعداد حسابك' : 'Congratulations! You completed your setup');
            }

            return newSteps;
        });
    };

    const handleDismiss = async () => {
        setIsVisible(false);
        if (user) {
            try {
                const currentPrefs = (profile?.dashboard_preferences as Record<string, any>) || {};
                await supabase.from('profiles').update({
                    dashboard_preferences: { ...currentPrefs, onboarding_dismissed: true }
                }).eq('id', user.id);
                refreshProfile();
            } catch (error) {
                console.error("Error updating preferences:", error);
            }
        }
    };

    if (!isVisible || isDismissed) return null;

    return (
        <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
                <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                    <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <PartyPopper className="h-5 w-5 text-primary" />
                            {isRTL ? 'ابدأ مع OneLinker' : 'Get Started with OneLinker'}
                        </CardTitle>
                        <CardDescription>
                            {isRTL
                                ? 'أكمل هذه الخطوات لتحقيق أقصى استفادة من حسابك'
                                : 'Complete these steps to get the most out of your account'}
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleDismiss} className="text-muted-foreground">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className={cn("flex justify-between text-sm text-muted-foreground", isRTL && "flex-row-reverse")}>
                            <span>{progress}% {isRTL ? 'مكتمل' : 'completed'}</span>
                            <span>{steps.filter(s => s.completed).length}/{steps.length}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                onClick={() => handleStepClick(step)}
                                className={cn(
                                    "relative group flex items-center gap-3 p-3 rounded-lg border bg-card transition-all cursor-pointer hover:shadow-md hover:border-primary/50",
                                    step.completed ? "opacity-60 bg-muted/50" : "border-border",
                                    isRTL && "flex-row-reverse"
                                )}
                            >
                                <div
                                    onClick={(e) => !step.completed && markComplete(step.id, e)}
                                    className={cn(
                                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                        step.completed ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                    )}
                                >
                                    {step.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                </div>

                                <div className={cn("flex-1 min-w-0", isRTL ? "text-right" : "text-left")}>
                                    <p className={cn("font-medium text-sm truncate", step.completed && "line-through decoration-border")}>
                                        {isRTL ? step.label.ar : step.label.en}
                                    </p>
                                </div>

                                {!step.completed && (
                                    <ArrowRight className={cn(
                                        "h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                                        isRTL && "rotate-180"
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
