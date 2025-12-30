import { 
  MessageCircle, Users, Clock, TrendingUp, Download,
  UserCheck, UserX, Star
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

const stats = [
  { label: 'Total Leads', labelAr: 'إجمالي العملاء', value: 248, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  { label: 'Qualified', labelAr: 'مؤهل', value: 186, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-500/10' },
  { label: 'Premium', labelAr: 'متميز', value: 42, icon: Star, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  { label: 'Avg Response', labelAr: 'متوسط الرد', value: '1.2 min', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-500/10' },
];

const qualificationData = [
  { name: 'Premium', value: 42, color: '#F59E0B' },
  { name: 'Qualified', value: 144, color: '#22C55E' },
  { name: 'Pending', value: 38, color: '#6B7280' },
  { name: 'Unqualified', value: 24, color: '#EF4444' },
];

const dailyLeads = [
  { day: 'Mon', leads: 32, qualified: 24 },
  { day: 'Tue', leads: 45, qualified: 38 },
  { day: 'Wed', leads: 28, qualified: 22 },
  { day: 'Thu', leads: 52, qualified: 41 },
  { day: 'Fri', leads: 38, qualified: 30 },
  { day: 'Sat', leads: 35, qualified: 28 },
  { day: 'Sun', leads: 18, qualified: 14 },
];

const topSources = [
  { source: 'Direct Message', leads: 98, rate: 78 },
  { source: 'Ad Campaign', leads: 76, rate: 72 },
  { source: 'Website Widget', leads: 45, rate: 68 },
  { source: 'QR Code', leads: 29, rate: 65 },
];

export function WhatsAppAnalytics() {
  const { isRTL } = useLanguageSafe();

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
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
        {/* Qualification Status */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-sm md:text-base">
              {isRTL ? 'حالة التأهيل' : 'Qualification Status'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="h-[160px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qualificationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {qualificationData.map((entry, index) => (
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
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {qualificationData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[10px] md:text-xs text-muted-foreground truncate">{item.name}</span>
                  <span className="text-[10px] md:text-xs font-medium ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Leads Chart */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm md:text-base">
                {isRTL ? 'العملاء اليومية' : 'Daily Leads'}
              </CardTitle>
              <Button variant="outline" size="sm" className="h-6 md:h-7 text-[10px] md:text-xs gap-1">
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="h-[160px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyLeads}>
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
                  <Bar dataKey="leads" fill="#22C55E" radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="qualified" fill="#22C55E80" radius={[4, 4, 0, 0]} name="Qualified" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sources */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {isRTL ? 'أفضل المصادر' : 'Top Sources'}
            </CardTitle>
            <Button variant="outline" size="sm" className="h-6 md:h-7 text-[10px] md:text-xs gap-1">
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
          <div className="space-y-3">
            {topSources.map((source, index) => (
              <div 
                key={source.source}
                className="flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-green-500/10 text-green-600 font-semibold text-xs md:text-sm shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-xs md:text-sm truncate">{source.source}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground shrink-0">
                      {source.leads} leads
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Progress value={source.rate} className="h-1.5" />
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] md:text-xs shrink-0 h-5 px-1.5 bg-green-500/10 text-green-600 border-green-500/20"
                    >
                      {source.rate}% qualified
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
