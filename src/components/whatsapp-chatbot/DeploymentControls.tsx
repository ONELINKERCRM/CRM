import { useState } from 'react';
import { 
  Power, Pause, Play, RotateCcw, Eye, Settings, 
  Check, X, AlertCircle, Clock, MessageCircle,
  Users, Zap, ExternalLink, Shield, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BotStats {
  totalConversations: number;
  activeNow: number;
  leadsQualified: number;
  handoversToday: number;
  avgResponseTime: string;
  satisfactionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'qualification' | 'handover' | 'error';
  content: string;
  timestamp: Date;
}

const mockStats: BotStats = {
  totalConversations: 1248,
  activeNow: 12,
  leadsQualified: 892,
  handoversToday: 34,
  avgResponseTime: '1.2s',
  satisfactionRate: 94,
};

const mockActivities: RecentActivity[] = [
  { id: '1', type: 'message', content: 'New lead "Ahmed Ali" started conversation', timestamp: new Date() },
  { id: '2', type: 'qualification', content: 'Lead "Sara Mohamed" qualified as Premium', timestamp: new Date(Date.now() - 60000) },
  { id: '3', type: 'handover', content: 'Conversation transferred to Agent "John"', timestamp: new Date(Date.now() - 120000) },
  { id: '4', type: 'message', content: 'Bot answered property inquiry for "Marina Tower"', timestamp: new Date(Date.now() - 180000) },
  { id: '5', type: 'qualification', content: 'Lead "Khalid Omar" marked as Qualified', timestamp: new Date(Date.now() - 240000) },
];

export function DeploymentControls() {
  const { isRTL } = useLanguageSafe();
  const [isDeployed, setIsDeployed] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [stats] = useState<BotStats>(mockStats);
  const [activities] = useState<RecentActivity[]>(mockActivities);
  const [autoHandover, setAutoHandover] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleDeploy = () => {
    setIsDeployed(true);
    setIsPaused(false);
    toast.success(isRTL ? 'تم نشر البوت بنجاح!' : 'Bot deployed successfully!');
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast.success(isPaused 
      ? (isRTL ? 'تم استئناف البوت' : 'Bot resumed') 
      : (isRTL ? 'تم إيقاف البوت مؤقتاً' : 'Bot paused')
    );
  };

  const handleStop = () => {
    setIsDeployed(false);
    setIsPaused(false);
    toast.success(isRTL ? 'تم إيقاف البوت' : 'Bot stopped');
  };

  const handleRestart = () => {
    setIsPaused(false);
    toast.success(isRTL ? 'تمت إعادة تشغيل البوت' : 'Bot restarted');
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'message': return <MessageCircle className="h-3.5 w-3.5 text-blue-500" />;
      case 'qualification': return <Check className="h-3.5 w-3.5 text-green-500" />;
      case 'handover': return <Users className="h-3.5 w-3.5 text-purple-500" />;
      case 'error': return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6 max-w-4xl mx-auto">
      {/* Status Banner */}
      <Card className={cn(
        "overflow-hidden",
        isDeployed 
          ? isPaused 
            ? "bg-amber-500/10 border-amber-500/20" 
            : "bg-green-500/10 border-green-500/20"
          : "bg-muted/50"
      )}>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isDeployed 
                  ? isPaused 
                    ? "bg-amber-500/20" 
                    : "bg-green-500/20"
                  : "bg-muted"
              )}>
                {isDeployed ? (
                  isPaused ? (
                    <Pause className="h-6 w-6 text-amber-600" />
                  ) : (
                    <Power className="h-6 w-6 text-green-600" />
                  )
                ) : (
                  <Power className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">
                    {isRTL ? 'حالة البوت' : 'Bot Status'}
                  </h2>
                  <Badge className={cn(
                    isDeployed 
                      ? isPaused 
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20" 
                        : "bg-green-500/10 text-green-600 border-green-500/20"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isDeployed 
                      ? isPaused 
                        ? (isRTL ? 'متوقف مؤقتاً' : 'Paused')
                        : (isRTL ? 'نشط' : 'Active')
                      : (isRTL ? 'متوقف' : 'Stopped')
                    }
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isDeployed 
                    ? (isRTL ? `${stats.activeNow} محادثة نشطة الآن` : `${stats.activeNow} active conversations now`)
                    : (isRTL ? 'البوت غير نشط' : 'Bot is not active')
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {!isDeployed ? (
                <Button onClick={handleDeploy} className="flex-1 md:flex-none gap-2 bg-green-600 hover:bg-green-700">
                  <Power className="h-4 w-4" />
                  {isRTL ? 'نشر البوت' : 'Deploy Bot'}
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePause}
                    className="gap-1.5"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4" />
                        {isRTL ? 'استئناف' : 'Resume'}
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4" />
                        {isRTL ? 'إيقاف مؤقت' : 'Pause'}
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRestart}
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">{isRTL ? 'إعادة تشغيل' : 'Restart'}</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1.5">
                        <Power className="h-4 w-4" />
                        <span className="hidden sm:inline">{isRTL ? 'إيقاف' : 'Stop'}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isRTL ? 'إيقاف البوت؟' : 'Stop Bot?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isRTL 
                            ? 'سيتم إيقاف البوت ولن يتمكن من الرد على الرسائل الجديدة.' 
                            : 'The bot will stop responding to new messages.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStop} className="bg-destructive text-destructive-foreground">
                          {isRTL ? 'إيقاف' : 'Stop'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <MessageCircle className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg md:text-xl font-bold">{stats.totalConversations.toLocaleString()}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{isRTL ? 'إجمالي المحادثات' : 'Total Chats'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg md:text-xl font-bold">{stats.activeNow}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{isRTL ? 'نشط الآن' : 'Active Now'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-lg md:text-xl font-bold">{stats.leadsQualified}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{isRTL ? 'مؤهلين' : 'Qualified'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <Zap className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg md:text-xl font-bold">{stats.handoversToday}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{isRTL ? 'تسليمات اليوم' : 'Handovers'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
            <p className="text-lg md:text-xl font-bold">{stats.avgResponseTime}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{isRTL ? 'وقت الرد' : 'Response'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg md:text-xl font-bold">{stats.satisfactionRate}%</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{isRTL ? 'الرضا' : 'Satisfaction'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Settings */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {isRTL ? 'الإعدادات السريعة' : 'Quick Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium text-sm">{isRTL ? 'التسليم التلقائي' : 'Auto Handover'}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'بعد اكتمال التأهيل' : 'After qualification complete'}
                </p>
              </div>
              <Switch checked={autoHandover} onCheckedChange={setAutoHandover} />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium text-sm">{isRTL ? 'وضع عدم الاتصال' : 'Offline Mode'}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'إظهار رسالة خارج الدوام' : 'Show away message'}
                </p>
              </div>
              <Switch checked={offlineMode} onCheckedChange={setOfflineMode} />
            </div>

            <Button variant="outline" className="w-full gap-2" size="sm">
              <ExternalLink className="h-4 w-4" />
              {isRTL ? 'فتح إعدادات Meta' : 'Open Meta Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {isRTL ? 'النشاط الأخير' : 'Recent Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div 
                    key={activity.id}
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.content}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString(isRTL ? 'ar' : 'en', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Live Preview */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {isRTL ? 'معاينة مباشرة' : 'Live Preview'}
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {isRTL ? 'مباشر' : 'Live'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-b from-green-500/5 to-transparent rounded-xl p-4 border border-green-500/10">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="bg-card rounded-lg rounded-tl-none p-3 max-w-[80%] shadow-sm">
                  <p className="text-sm">Hello! 👋 Welcome to OneLinker Properties. I'm here to help you find your perfect property. May I know your name?</p>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <div className="bg-green-500 text-white rounded-lg rounded-tr-none p-3 max-w-[80%]">
                  <p className="text-sm">Hi, I'm Ahmed. Looking for a 2BR apartment in Marina.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="bg-card rounded-lg rounded-tl-none p-3 max-w-[80%] shadow-sm">
                  <p className="text-sm">Nice to meet you, Ahmed! 🏠 We have excellent 2BR options in Marina. What is your budget range?</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
