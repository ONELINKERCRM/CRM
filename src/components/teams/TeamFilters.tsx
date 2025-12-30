import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserRole, UserStatus } from './types';

export interface TeamFiltersState {
  search: string;
  role: UserRole | 'all';
  team: string;
  status: UserStatus | 'all';
}

interface TeamFiltersProps {
  filters: TeamFiltersState;
  onFiltersChange: (filters: TeamFiltersState) => void;
}

export function TeamFilters({ filters, onFiltersChange }: TeamFiltersProps) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search teams or agents..."
        value={filters.search}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        className="pl-9"
      />
      {filters.search && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={() => onFiltersChange({ ...filters, search: '' })}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
