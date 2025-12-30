import { Agent, Team, UserStatus } from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Users, Power, Download, CheckSquare } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  teams: Team[];
  onAssignTeam: (teamId: string) => void;
  onChangeStatus: (status: UserStatus) => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  teams,
  onAssignTeam,
  onChangeStatus,
  onExport,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-xl">
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <CheckSquare className="h-5 w-5 text-primary" />
          <Badge variant="secondary" className="font-semibold">
            {selectedCount} selected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Select onValueChange={onAssignTeam}>
            <SelectTrigger className="w-[160px] h-9">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Assign to Team" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="unassign">Remove from Team</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => onChangeStatus(v as UserStatus)}>
            <SelectTrigger className="w-[150px] h-9">
              <Power className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Change Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="active">Set Active</SelectItem>
              <SelectItem value="inactive">Set Inactive</SelectItem>
              <SelectItem value="on_leave">Set On Leave</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
