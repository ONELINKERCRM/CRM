import { useState } from "react";
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  Layers,
  RotateCcw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface CampaignFilters {
  search: string;
  type: string;
  status: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
  segment: string;
}

interface CampaignFiltersProps {
  filters: CampaignFilters;
  onFiltersChange: (filters: CampaignFilters) => void;
  segments: string[];
}

export function CampaignFiltersBar({ 
  filters, 
  onFiltersChange,
  segments 
}: CampaignFiltersProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const activeFiltersCount = [
    filters.type !== "all",
    filters.status !== "all",
    filters.dateRange.from || filters.dateRange.to,
    filters.segment !== "all",
  ].filter(Boolean).length;

  const handleReset = () => {
    onFiltersChange({
      search: "",
      type: "all",
      status: "all",
      dateRange: {},
      segment: "all",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 h-10"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onFiltersChange({ ...filters, search: "" })}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <Select
            value={filters.type}
            onValueChange={(value) => onFiltersChange({ ...filters, type: value })}
          >
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="email">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </span>
              </SelectItem>
              <SelectItem value="sms">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> SMS
                </span>
              </SelectItem>
              <SelectItem value="whatsapp">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> WhatsApp
                </span>
              </SelectItem>
              <SelectItem value="multi-channel">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Multi-channel
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          {/* Segment Filter */}
          <Select
            value={filters.segment}
            onValueChange={(value) => onFiltersChange({ ...filters, segment: value })}
          >
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              {segments.map((segment) => (
                <SelectItem key={segment} value={segment}>
                  {segment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 justify-start text-left font-normal",
                  !filters.dateRange.from && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "LLL dd")} -{" "}
                      {format(filters.dateRange.to, "LLL dd")}
                    </>
                  ) : (
                    format(filters.dateRange.from, "LLL dd, y")
                  )
                ) : (
                  "Date Range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange.from}
                selected={{
                  from: filters.dateRange.from,
                  to: filters.dateRange.to,
                }}
                onSelect={(range) => {
                  onFiltersChange({
                    ...filters,
                    dateRange: { from: range?.from, to: range?.to },
                  });
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              onClick={handleReset}
              className="h-10 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
