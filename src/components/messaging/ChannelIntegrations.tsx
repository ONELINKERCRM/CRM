import { useState } from 'react';
import { 
  MessageCircle, Mail, Smartphone, Send, Camera, 
  Settings, RefreshCw, Check, X, AlertCircle, Plus,
  ExternalLink, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelConfig, Channel } from './types';
import { mockChannelConfigs } from './mockData';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const channelIcons: Record<Channel, React.ElementType> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  email: Mail,
  sms: Smartphone,
  telegram: Send,
  instagram: Camera,
};

const channelColors: Record<Channel, string> = {
  whatsapp: 'from-green-500 to-green-600',
  messenger: 'from-blue-500 to-blue-600',
  email: 'from-gray-500 to-gray-600',
  sms: 'from-purple-500 to-purple-600',
  telegram: 'from-sky-500 to-sky-600',
  instagram: 'from-pink-500 to-rose-600',
};

export function ChannelIntegrations() {
  const { isRTL } = useLanguageSafe();
  const [channels, setChannels] = useState<ChannelConfig[]>(mockChannelConfigs);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  const handleTestConnection = (channelId: string) => {
    setTestingChannel(channelId);
    setTimeout(() => {
      setTestingChannel(null);
      toast.success(isRTL ? 'تم اختبار الاتصال بنجاح' : 'Connection test successful');
    }, 2000);
  };

  const handleToggleChannel = (channelId: string, enabled: boolean) => {
    setChannels(channels.map(c => 
      c.id === channelId 
        ? { ...c, status: enabled ? 'connected' : 'disconnected' }
        : c
    ));
    toast.success(enabled 
      ? (isRTL ? 'تم تفعيل القناة' : 'Channel enabled')
      : (isRTL ? 'تم تعطيل القناة' : 'Channel disabled')
    );
  };

  const getStatusBadge = (status: ChannelConfig['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <Check className="h-3 w-3 mr-1" />
            {isRTL ? 'متصل' : 'Connected'}
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <X className="h-3 w-3 mr-1" />
            {isRTL ? 'غير متصل' : 'Disconnected'}
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            {isRTL ? 'خطأ' : 'Error'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold">
            {isRTL ? 'قنوات التواصل' : 'Channel Integrations'}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            {isRTL ? 'إدارة اتصالات قنوات المراسلة' : 'Manage your messaging channel connections'}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 h-8 md:h-9 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              {isRTL ? 'إضافة قناة' : 'Add Channel'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>{isRTL ? 'إضافة قناة جديدة' : 'Add New Channel'}</DialogTitle>
              <DialogDescription>
                {isRTL ? 'اختر قناة للاتصال' : 'Select a channel to connect'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 md:gap-3 py-4">
              {Object.entries(channelIcons).map(([channel, Icon]) => (
                <button
                  key={channel}
                  className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className={cn(
                    'w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0',
                    channelColors[channel as Channel]
                  )}>
                    <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <span className="font-medium capitalize text-sm md:text-base">{channel}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Channels Grid */}
      <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => {
          const Icon = channelIcons[channel.channel];
          return (
            <Card 
              key={channel.id} 
              className={cn(
                'bg-card/50 backdrop-blur-sm border-border/50 transition-all hover:shadow-lg',
                channel.status === 'error' && 'border-red-500/30'
              )}
            >
              <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className={cn(
                      'w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0',
                      channelColors[channel.channel]
                    )}>
                      <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm md:text-base truncate">{channel.name}</CardTitle>
                      {channel.accountName && (
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">
                          {channel.accountName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={channel.status === 'connected'}
                    onCheckedChange={(checked) => handleToggleChannel(channel.id, checked)}
                    className="shrink-0"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6 pt-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {getStatusBadge(channel.status)}
                  {channel.lastSync && (
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                      {isRTL ? 'آخر مزامنة: ' : 'Sync: '}
                      {formatDistanceToNow(channel.lastSync, {
                        addSuffix: false,
                        locale: isRTL ? ar : undefined,
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 md:h-8 text-[10px] md:text-xs"
                    onClick={() => handleTestConnection(channel.id)}
                    disabled={testingChannel === channel.id}
                  >
                    {testingChannel === channel.id ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {isRTL ? 'اختبار' : 'Test'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 md:h-8 text-[10px] md:text-xs px-2 md:px-3">
                    <Settings className="h-3 w-3" />
                  </Button>
                  {channel.status === 'error' && (
                    <Button variant="outline" size="sm" className="h-7 md:h-8 text-[10px] md:text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 px-2 md:px-3">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm md:text-base mb-1">
                {isRTL ? 'تحتاج مساعدة في الإعداد؟' : 'Need help setting up?'}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-3">
                {isRTL 
                  ? 'فريقنا جاهز لمساعدتك في ربط قنوات المراسلة الخاصة بك'
                  : 'Our team is ready to help you connect your messaging channels'
                }
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 md:h-8 text-xs">
                  {isRTL ? 'عرض الدليل' : 'View Guide'}
                </Button>
                <Button size="sm" className="h-7 md:h-8 text-xs">
                  {isRTL ? 'تواصل مع الدعم' : 'Contact Support'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
