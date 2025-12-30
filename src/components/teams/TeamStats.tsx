import { Users, UserCheck, Building2, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TeamStatsProps {
  stats: {
    totalTeams: number;
    totalAgents: number;
    activeAgents: number;
    totalLeads: number;
    totalListings: number;
    avgConversionRate: number;
  };
}

export function TeamStats({ stats }: TeamStatsProps) {
  const statItems = [
    {
      label: 'Total Teams',
      value: stats.totalTeams,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Active Agents',
      value: `${stats.activeAgents}/${stats.totalAgents}`,
      icon: UserCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Total Leads',
      value: stats.totalLeads.toLocaleString(),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Total Listings',
      value: stats.totalListings.toLocaleString(),
      icon: Building2,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
