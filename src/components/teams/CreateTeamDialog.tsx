import { useState, useEffect } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Search, Check, Info, X } from 'lucide-react';
import { Team as TeamType, Agent } from './types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: TeamType | null;
  availableAgents: Agent[];
  onSave: (teamData: Partial<TeamType>) => void;
}

export function CreateTeamDialog({ open, onOpenChange, team, availableAgents, onSave }: CreateTeamDialogProps) {
  const [name, setName] = useState('');
  const [leaderId, setLeaderId] = useState<string>('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (open) {
      if (team) {
        setName(team.name);
        setLeaderId(team.leaderId || '');
        setSelectedAgents(team.agents.map(a => a.id));
        setStatus(team.status);
      } else {
        setName('');
        setLeaderId('');
        setSelectedAgents([]);
        setStatus('active');
      }
      setMemberSearch('');
    }
  }, [team, open]);

  const handleSave = () => {
    onSave({
      name,
      leaderId: leaderId || undefined,
      status,
      agents: availableAgents.filter(a => selectedAgents.includes(a.id)),
    });
    onOpenChange(false);
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const teamLeaderCandidates = availableAgents.filter(a =>
    a.role === 'team_leader' || selectedAgents.includes(a.id)
  );

  const filteredMembers = availableAgents.filter(a =>
    a.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    a.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <ResponsiveDialogHeader className="px-5 py-2.5 border-b">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-sm">
            <Users className="h-5 w-5 text-primary" />
            {team ? 'Edit Team Details' : 'Initialize New Team'}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="p-0">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Team Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Real Estate Team"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Team Leader</Label>
                <Select value={leaderId || 'none'} onValueChange={(v) => setLeaderId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Assign a leader" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="none">No leader assigned</SelectItem>
                    {teamLeaderCandidates.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={agent.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {agent.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{agent.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Add Team Members</Label>
                <Badge variant="secondary" className="font-normal text-[9px] px-1.5 h-4">
                  {selectedAgents.length} Selected
                </Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  className="pl-9 h-8.5 text-xs"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>

              <div className="border rounded-lg bg-muted/20 overflow-hidden">
                <ScrollArea className="h-[140px]">
                  <div className="p-2 space-y-1">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((agent) => {
                        const isSelected = selectedAgents.includes(agent.id);
                        return (
                          <div
                            key={agent.id}
                            onClick={() => toggleAgent(agent.id)}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border border-transparent",
                              isSelected
                                ? "bg-primary/10 border-primary/20 shadow-sm"
                                : "hover:bg-background hover:border-border"
                            )}
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={agent.avatar} />
                              <AvatarFallback className="text-[10px]">
                                {agent.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{agent.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{agent.email}</p>
                            </div>
                            <div className={cn(
                              "h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            )}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">No matching agents found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border">
              <div className="space-y-0.5">
                <p className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Operational Status</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Team is active and visible
                </p>
              </div>
              <Switch
                checked={status === 'active'}
                onCheckedChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
                className="scale-90"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex gap-2">
              <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[9px] leading-relaxed text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Note:</span> Changing assignments will notify affected agents.
              </p>
            </div>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="p-3 border-t bg-muted/20">
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!name.trim()}
              className="min-w-[120px] h-8 text-xs shadow-sm"
            >
              {team ? 'Update Team' : 'Establish Team'}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
