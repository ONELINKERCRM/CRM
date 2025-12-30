import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { format } from "date-fns";
import { toast } from "sonner";
import { AssignmentLogsPageSkeleton } from "@/components/ui/page-skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAssignmentLogs, AssignmentLog } from "@/hooks/useAssignmentLogs";

const AssignmentLogsPage = () => {
  const isMobile = useIsMobile();
  const { logs, isLoading, stats, sources, refetch } = useAssignmentLogs();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  if (isLoading) {
    return <AssignmentLogsPageSkeleton isMobile={isMobile} />;
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.leadEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.rule.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesMethod = methodFilter === "all" || log.method === methodFilter;
    const matchesSource = sourceFilter === "all" || log.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesMethod && matchesSource;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-success/10 text-success border-success/20 gap-1">
            <CheckCircle className="h-3 w-3" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "reassigned":
        return (
          <Badge className="bg-info/10 text-info border-info/20 gap-1">
            <RefreshCw className="h-3 w-3" />
            Reassigned
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      "Campaign Rule": "bg-purple-100 text-purple-700 border-purple-200",
      "Round Robin": "bg-blue-100 text-blue-700 border-blue-200",
      "Manual": "bg-slate-100 text-slate-700 border-slate-200",
      "Advanced Logic": "bg-amber-100 text-amber-700 border-amber-200",
      "Auto-Reassign": "bg-cyan-100 text-cyan-700 border-cyan-200",
    };
    return (
      <Badge variant="outline" className={colors[method] || ""}>
        {method}
      </Badge>
    );
  };

  const handleExport = () => {
    toast.success("Exporting assignment logs...");
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Logs refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Assignment Logs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            View and audit all lead assignment history
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.success}</div>
            <p className="text-xs text-muted-foreground">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-info">{stats.reassigned}</div>
            <p className="text-xs text-muted-foreground">Reassigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by lead name, email, agent, or rule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reassigned">Reassigned</SelectItem>
                </SelectContent>
              </Select>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Campaign Rule">Campaign Rule</SelectItem>
                  <SelectItem value="Round Robin">Round Robin</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Advanced Logic">Advanced Logic</SelectItem>
                  <SelectItem value="Auto-Reassign">Auto-Reassign</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Date Range</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table - Desktop */}
      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Rule / Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Response</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{log.leadName}</p>
                    <p className="text-xs text-muted-foreground">{log.leadEmail}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.source}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {log.previousAgent && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          {log.previousAgent}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={log.assignedToAvatar} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {log.assignedTo.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{log.assignedTo}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm">{log.rule}</p>
                    {getMethodBadge(log.method)}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(log.status)}</TableCell>
                <TableCell>
                  {log.responseTime ? (
                    <span className="text-sm">{log.responseTime}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{log.timestamp.split(" ")[1]}</p>
                    <p className="text-xs text-muted-foreground">{log.timestamp.split(" ")[0]}</p>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Logs Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-3">
        {paginatedLogs.map((log) => (
          <Card key={log.id} className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="font-medium">{log.leadName}</h4>
                <p className="text-xs text-muted-foreground">{log.leadEmail}</p>
              </div>
              {getStatusBadge(log.status)}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="outline">{log.source}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assigned to</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {log.assignedTo.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span>{log.assignedTo}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                {getMethodBadge(log.method)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time</span>
                <span>{log.timestamp}</span>
              </div>
            </div>

            {log.notes && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                {log.notes}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium">No logs found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters or search query.
          </p>
        </Card>
      )}
    </div>
  );
};

export default AssignmentLogsPage;
