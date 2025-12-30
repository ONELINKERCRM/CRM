import { 
  MessageCircle, Clock, TrendingUp, Users, Send, 
  CheckCheck, BarChart3, Download 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const messageStats = [
  { label: 'Total Sent', labelAr: 'إجمالي المرسل', value: 12450, icon: Send, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  { label: 'Delivered', labelAr: 'تم التسليم', value: 11890, icon: CheckCheck, color: 'text-green-600', bg: 'bg-green-500/10' },
  { label: 'Avg Response', labelAr: 'متوسط الرد', value: '4.2 min', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-500/10' },
  { label: 'Reply Rate', labelAr: 'معدل الرد', value: '68%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-500/10' },
];

const channelData = [
  { name: 'WhatsApp', value: 5200, color: '#25D366' },
  { name: 'Email', value: 3800, color: '#6B7280' },
  { name: 'Messenger', value: 2100, color: '#0084FF' },
  { name: 'SMS', value: 1350, color: '#8B5CF6' },
];

const dailyMessages = [
  { day: 'Mon', sent: 420, received: 380 },
  { day: 'Tue', sent: 520, received: 450 },
  { day: 'Wed', sent: 480, received: 420 },
  { day: 'Thu', sent: 550, received: 490 },
  { day: 'Fri', sent: 380, received: 340 },
  { day: 'Sat', sent: 280, received: 250 },
  { day: 'Sun', sent: 220, received: 200 },
];

const agentPerformance = [
  { name: 'Sarah Ahmed', messages: 1250, responseTime: '3.2 min', rate: 78 },
  { name: 'Mohammed Ali', messages: 980, responseTime: '4.5 min', rate: 72 },
  { name: 'Ahmed Al Kaabi', messages: 850, responseTime: '5.1 min', rate: 65 },
  { name: 'Fatima Hassan', messages: 720, responseTime: '3.8 min', rate: 70 },
];

export function MessagingAnalytics() {
  const { isRTL } = useLanguageSafe();

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
        {messageStats.map((stat) => (
          <Card key={stat.label} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-foreground truncate">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                    {isRTL ? stat.labelAr : stat.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Messages by Channel */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-sm md:text-base">
              {isRTL ? 'الرسائل حسب القناة' : 'Messages by Channel'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="h-[160px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1.5 md:gap-2 mt-3 md:mt-4">
              {channelData.map((channel) => (
                <div key={channel.name} className="flex items-center gap-1.5 md:gap-2">
                  <div 
                    className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: channel.color }}
                  />
                  <span className="text-[10px] md:text-xs text-muted-foreground truncate">{channel.name}</span>
                  <span className="text-[10px] md:text-xs font-medium ml-auto">{channel.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Messages Chart */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm md:text-base">
                {isRTL ? 'نشاط الرسائل اليومي' : 'Daily Message Activity'}
              </CardTitle>
              <Button variant="outline" size="sm" className="h-6 md:h-7 text-[10px] md:text-xs gap-1 shrink-0">
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="h-[160px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyMessages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sent" />
                  <Bar dataKey="received" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="Received" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {isRTL ? 'أداء الوكلاء' : 'Agent Performance'}
            </CardTitle>
            <Button variant="outline" size="sm" className="h-6 md:h-7 text-[10px] md:text-xs gap-1 shrink-0">
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">{isRTL ? 'تصدير التقرير' : 'Export Report'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
          <div className="space-y-3 md:space-y-4">
            {agentPerformance.map((agent, index) => (
              <div 
                key={agent.name}
                className="flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-lg md:rounded-xl bg-muted/30"
              >
                <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs md:text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-xs md:text-sm truncate">{agent.name}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground shrink-0">
                      {agent.messages.toLocaleString()} <span className="hidden sm:inline">{isRTL ? 'رسالة' : 'msgs'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex-1 hidden sm:block">
                      <Progress value={agent.rate} className="h-1.5 md:h-2" />
                    </div>
                    <Badge variant="outline" className="text-[10px] md:text-xs shrink-0 h-5 md:h-6 px-1.5">
                      <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                      {agent.responseTime}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] md:text-xs shrink-0 h-5 md:h-6 px-1.5 ${
                        agent.rate >= 75 
                          ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                          : agent.rate >= 60 
                            ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}
                    >
                      {agent.rate}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
