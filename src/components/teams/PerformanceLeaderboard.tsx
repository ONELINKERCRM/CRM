import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Target, DollarSign, Medal } from 'lucide-react';
import { Agent, Team } from './types';

interface PerformanceLeaderboardProps {
  agents: Agent[];
  teams: Team[];
}

export function PerformanceLeaderboard({ agents, teams }: PerformanceLeaderboardProps) {
  // Sort agents by leads converted
  const topAgents = [...agents]
    .sort((a, b) => b.performance.leadsConverted - a.performance.leadsConverted)
    .slice(0, 5);

  // Calculate team performance
  const teamPerformance = teams.map(team => ({
    ...team,
    totalConverted: team.agents.reduce((sum, a) => sum + a.performance.leadsConverted, 0),
    totalRevenue: team.agents.reduce((sum, a) => sum + a.performance.revenue, 0),
  })).sort((a, b) => b.totalConverted - a.totalConverted);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-amber-500';
      case 1: return 'text-gray-400';
      case 2: return 'text-amber-700';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Top Agents */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top Performing Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topAgents.map((agent, index) => {
            const initials = agent.name.split(' ').map(n => n[0]).join('').toUpperCase();
            return (
              <div
                key={agent.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center w-6">
                  {index < 3 ? (
                    <Medal className={`h-5 w-5 ${getMedalColor(index)}`} />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                  )}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={agent.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {teams.find(t => t.agents.some(a => a.id === agent.id))?.name || 'Unassigned'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {agent.performance.leadsConverted}
                  </p>
                  <p className="text-xs text-muted-foreground">Converted</p>
                </div>
              </div>
            );
          })}
          {topAgents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No agent data available</p>
          )}
        </CardContent>
      </Card>

      {/* Top Teams */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamPerformance.slice(0, 5).map((team, index) => (
            <div
              key={team.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-center w-6">
                {index < 3 ? (
                  <Medal className={`h-5 w-5 ${getMedalColor(index)}`} />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{team.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{team.name}</p>
                <p className="text-xs text-muted-foreground">{team.agents.length} agents</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600 flex items-center gap-1 justify-end">
                  <TrendingUp className="h-3 w-3" />
                  {team.totalConverted}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <DollarSign className="h-3 w-3" />
                  {(team.totalRevenue / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          ))}
          {teamPerformance.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No team data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
