import { useState, useCallback, useRef } from 'react';
import {
  Users, Filter, Search, UserCheck, Upload, FileSpreadsheet,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, X, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { LeadFilter, AudienceSelectionMethod, ImportedLead, ColumnMapping } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useLeads } from '@/hooks/useLeads';

const stages = ['New', 'Contacted', 'Qualified', 'Meeting', 'Proposal', 'Won'];
const sources = ['Property Finder', 'Bayut', 'Website', 'Meta Ads', 'Google Ads', 'Referral', 'Walk-in'];

interface AudienceStepProps {
  selectedLeads?: string[];
  filters?: LeadFilter;
  audienceMethod?: AudienceSelectionMethod;
  importedLeads?: ImportedLead[];
  onSelectLeads: (leads: string[]) => void;
  onFiltersChange: (filters: LeadFilter) => void;
  onAudienceMethodChange?: (method: AudienceSelectionMethod) => void;
  onImportedLeadsChange?: (leads: ImportedLead[]) => void;
  isRTL?: boolean;
}

export function AudienceStep({
  selectedLeads = [],
  filters = {},
  audienceMethod = 'manual',
  importedLeads = [],
  onSelectLeads,
  onFiltersChange,
  onAudienceMethodChange,
  onImportedLeadsChange,
  isRTL = false
}: AudienceStepProps) {
  const { leads: crmLeads, isLoading: leadsLoading } = useLeads();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<AudienceSelectionMethod>(audienceMethod);

  // Excel import state
  const [excelData, setExcelData] = useState<Record<string, string>[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ phone: '' });
  const [mappingComplete, setMappingComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter leads with phone numbers (required for WhatsApp campaigns)
  const leadsWithPhone = crmLeads.filter(l => l.phone);
  const optedInLeads = leadsWithPhone; // All leads with phone are considered opted-in for now

  const filteredLeads = leadsWithPhone.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone?.includes(search) ?? false);
    const matchesStage = stageFilter === 'all' || lead.lead_stage?.name === stageFilter || lead.stage === stageFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    return matchesSearch && matchesStage && matchesSource;
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as AudienceSelectionMethod);
    onAudienceMethodChange?.(tab as AudienceSelectionMethod);

    if (tab === 'select_all') {
      onSelectLeads(optedInLeads.map(l => l.id));
    } else if (tab === 'manual') {
      onSelectLeads([]);
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      onSelectLeads([]);
    } else {
      onSelectLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleSelectLead = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      onSelectLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      onSelectLeads([...selectedLeads, leadId]);
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Parse with raw: false to get formatted strings, and defval to handle empty cells
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          raw: false,
          defval: ''
        });

        if (jsonData.length === 0) {
          toast.error(isRTL ? 'الملف فارغ' : 'File is empty');
          return;
        }

        // Convert all values to strings for consistent handling
        const stringData = jsonData.map(row => {
          const newRow: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            newRow[key] = value !== null && value !== undefined ? String(value) : '';
          });
          return newRow;
        });

        const columns = Object.keys(stringData[0] || {});
        setExcelData(stringData);
        setExcelColumns(columns);
        setMappingComplete(false);

        // Auto-detect phone column
        const phoneCol = columns.find(c =>
          c.toLowerCase().includes('phone') ||
          c.toLowerCase().includes('mobile') ||
          c.toLowerCase().includes('whatsapp') ||
          c.toLowerCase().includes('tel') ||
          c.toLowerCase().includes('رقم') ||
          c.toLowerCase().includes('هاتف')
        );
        if (phoneCol) {
          setColumnMapping(prev => ({ ...prev, phone: phoneCol }));
        }

        // Auto-detect name column
        const nameCol = columns.find(c =>
          c.toLowerCase().includes('name') ||
          c.toLowerCase().includes('full') ||
          c.toLowerCase().includes('الاسم') ||
          c.toLowerCase().includes('اسم')
        );
        if (nameCol) {
          setColumnMapping(prev => ({ ...prev, name: nameCol }));
        }

        // Auto-detect email column
        const emailCol = columns.find(c =>
          c.toLowerCase().includes('email') ||
          c.toLowerCase().includes('mail') ||
          c.toLowerCase().includes('بريد')
        );
        if (emailCol) {
          setColumnMapping(prev => ({ ...prev, email: emailCol }));
        }



        toast.success(isRTL
          ? `تم تحميل ${stringData.length} سجل`
          : `Loaded ${stringData.length} records`
        );
      } catch (error) {
        console.error('Excel parse error:', error);
        toast.error(isRTL ? 'خطأ في قراءة الملف' : 'Error reading file');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [isRTL]);

  const handleApplyMapping = () => {
    if (!columnMapping.phone) {
      toast.error(isRTL ? 'يرجى تحديد عمود رقم الهاتف' : 'Please select the phone number column');
      return;
    }

    const leads: ImportedLead[] = excelData
      .filter(row => row[columnMapping.phone]?.toString().trim())
      .map(row => ({
        phone: row[columnMapping.phone]?.toString().trim(),
        name: columnMapping.name ? row[columnMapping.name]?.toString().trim() : undefined,
        email: columnMapping.email ? row[columnMapping.email]?.toString().trim() : undefined,
      }));

    if (leads.length === 0) {
      toast.error(isRTL ? 'لم يتم العثور على أرقام هاتف صالحة' : 'No valid phone numbers found');
      return;
    }

    setMappingComplete(true);
    onImportedLeadsChange?.(leads);
    toast.success(isRTL
      ? `تم استيراد ${leads.length} عميل`
      : `Imported ${leads.length} leads`
    );
  };

  const clearImport = () => {
    setExcelData([]);
    setExcelColumns([]);
    setColumnMapping({ phone: '' });
    setMappingComplete(false);
    onImportedLeadsChange?.([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'New': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'Contacted': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'Qualified': 'bg-green-500/10 text-green-600 border-green-500/20',
      'Meeting': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'Proposal': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'Won': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    };
    return colors[stage] || 'bg-muted text-muted-foreground';
  };

  const getTotalAudience = () => {
    if (activeTab === 'manual') return selectedLeads.length;
    if (activeTab === 'select_all') return optedInLeads.length;
    if (activeTab === 'excel_import') return importedLeads.length;
    return 0;
  };

  return (
    <div className="space-y-6">
      <div className={cn("text-center", isRTL && "font-arabic")}>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isRTL ? 'اختر الجمهور' : 'Select Audience'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL
            ? 'اختر العملاء الذين ستصلهم الحملة'
            : 'Choose the leads who will receive the campaign'}
        </p>
      </div>

      {/* Audience Method Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual" className="gap-2">
            <Users className="h-4 w-4" />
            {isRTL ? 'اختيار يدوي' : 'Manual Select'}
          </TabsTrigger>
          <TabsTrigger value="select_all" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {isRTL ? 'كل المشتركين' : 'All Opted-In'}
          </TabsTrigger>
          <TabsTrigger value="excel_import" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {isRTL ? 'استيراد Excel' : 'Import Excel'}
          </TabsTrigger>
        </TabsList>

        {/* Selected Count Card */}
        <Card className="bg-primary/5 border-primary/20 mt-4">
          <CardContent className="p-4">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-2xl font-bold text-primary">{getTotalAudience()}</p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'عميل سيستلم الحملة' : 'leads will receive campaign'}
                  </p>
                </div>
              </div>
              <Badge variant={getTotalAudience() > 0 ? "default" : "secondary"}>
                {activeTab === 'manual' && (isRTL ? 'اختيار يدوي' : 'Manual')}
                {activeTab === 'select_all' && (isRTL ? 'كل المشتركين' : 'All Opted-In')}
                {activeTab === 'excel_import' && (isRTL ? 'استيراد' : 'Imported')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Manual Selection Tab */}
        <TabsContent value="manual" className="space-y-4 mt-4">
          {/* Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Filter className="h-4 w-4" />
                  {isRTL ? 'الفلاتر' : 'Filters'}
                </span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {isRTL ? 'المرحلة' : 'Stage'}
                      </label>
                      <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{isRTL ? 'الكل' : 'All Stages'}</SelectItem>
                          {stages.map(stage => (
                            <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {isRTL ? 'المصدر' : 'Source'}
                      </label>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{isRTL ? 'الكل' : 'All Sources'}</SelectItem>
                          {sources.map(source => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {isRTL ? 'البحث' : 'Search'}
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={isRTL ? 'البحث عن عميل...' : 'Search leads...'}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Select All Button */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedLeads.length === filteredLeads.length
                ? (isRTL ? 'إلغاء الكل' : 'Deselect All')
                : (isRTL ? 'تحديد الكل' : 'Select All')}
            </Button>
          </div>

          {/* Leads List */}
          <Card>
            <CardContent className="p-0">
              {leadsLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="divide-y divide-border">
                    {filteredLeads.map(lead => {
                      const isSelected = selectedLeads.includes(lead.id);

                      return (
                        <div
                          key={lead.id}
                          onClick={() => handleSelectLead(lead.id)}
                          className={cn(
                            "flex items-center gap-4 p-4 cursor-pointer transition-colors",
                            isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                            isRTL && "flex-row-reverse"
                          )}
                        >
                          <Checkbox checked={isSelected} />
                          <div className={cn("flex-1", isRTL && "text-right")}>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{lead.name}</p>
                              {!lead.phone && (
                                <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                                  {isRTL ? 'لا يوجد هاتف' : 'No phone'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{lead.phone || 'N/A'}</p>
                          </div>
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <Badge variant="outline" className={getStageColor(lead.lead_stage?.name || lead.stage || '')}>
                              {lead.lead_stage?.name || lead.stage || 'New'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {lead.source || 'Unknown'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {!leadsLoading && filteredLeads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? 'لا يوجد عملاء مطابقين' : 'No leads match your filters'}
            </div>
          )}
        </TabsContent>

        {/* Select All Opted-In Tab */}
        <TabsContent value="select_all" className="space-y-4 mt-4">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-6">
              <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <h3 className="font-semibold text-lg">
                    {isRTL ? 'كل العملاء المشتركين' : 'All Opted-In Leads'}
                  </h3>
                  <p className="text-muted-foreground">
                    {isRTL
                      ? `سيتم إرسال الحملة إلى ${optedInLeads.length} عميل وافقوا على استلام الرسائل`
                      : `Campaign will be sent to ${optedInLeads.length} leads who have consented to receive messages`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {isRTL ? 'العملاء المشمولين' : 'Included Leads'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px]">
                <div className="divide-y divide-border">
                  {optedInLeads.map(lead => (
                    <div
                      key={lead.id}
                      className={cn(
                        "flex items-center gap-4 p-4",
                        isRTL && "flex-row-reverse"
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <div className={cn("flex-1", isRTL && "text-right")}>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.phone}</p>
                      </div>
                      <Badge variant="outline" className={getStageColor(lead.lead_stage?.name || lead.stage || '')}>
                        {lead.lead_stage?.name || lead.stage || 'New'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Excel Import Tab */}
        <TabsContent value="excel_import" className="space-y-4 mt-4">
          {!excelData.length ? (
            <Card className="border-dashed">
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {isRTL ? 'استيراد من Excel/CSV' : 'Import from Excel/CSV'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isRTL
                        ? 'قم بتحميل ملف Excel أو CSV يحتوي على أرقام الهاتف'
                        : 'Upload an Excel or CSV file containing phone numbers'}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {isRTL ? 'اختر ملف' : 'Choose File'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* File Info & Clear */}
              <Card>
                <CardContent className="p-4">
                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                    <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">
                          {isRTL ? `${excelData.length} سجل محمل` : `${excelData.length} records loaded`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? `${excelColumns.length} أعمدة` : `${excelColumns.length} columns`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearImport}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Column Mapping */}
              {!mappingComplete && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      {isRTL ? 'تعيين الأعمدة' : 'Map Columns'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-destructive">
                          {isRTL ? 'رقم الهاتف *' : 'Phone Number *'}
                        </label>
                        <Select
                          value={columnMapping.phone}
                          onValueChange={(v) => setColumnMapping(prev => ({ ...prev, phone: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isRTL ? 'اختر العمود' : 'Select column'} />
                          </SelectTrigger>
                          <SelectContent>
                            {excelColumns.map(col => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {isRTL ? 'الاسم (اختياري)' : 'Name (optional)'}
                        </label>
                        <Select
                          value={columnMapping.name || '_none'}
                          onValueChange={(v) => setColumnMapping(prev => ({ ...prev, name: v === '_none' ? undefined : v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isRTL ? 'اختر العمود' : 'Select column'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">{isRTL ? 'لا شيء' : 'None'}</SelectItem>
                            {excelColumns.map(col => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {isRTL ? 'البريد (اختياري)' : 'Email (optional)'}
                        </label>
                        <Select
                          value={columnMapping.email || '_none'}
                          onValueChange={(v) => setColumnMapping(prev => ({ ...prev, email: v === '_none' ? undefined : v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isRTL ? 'اختر العمود' : 'Select column'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">{isRTL ? 'لا شيء' : 'None'}</SelectItem>
                            {excelColumns.map(col => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleApplyMapping} className="w-full">
                      {isRTL ? 'تطبيق التعيين واستيراد' : 'Apply Mapping & Import'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Imported Leads Preview */}
              {mappingComplete && importedLeads.length > 0 && (
                <Card className="bg-success/5 border-success/20">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      {isRTL ? `تم استيراد ${importedLeads.length} عميل` : `${importedLeads.length} leads imported`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[200px]">
                      <div className="divide-y divide-border">
                        {importedLeads.slice(0, 50).map((lead, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-center gap-4 p-3",
                              isRTL && "flex-row-reverse"
                            )}
                          >
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <div className={cn("flex-1", isRTL && "text-right")}>
                              <p className="font-medium">{lead.name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{lead.phone}</p>
                            </div>
                          </div>
                        ))}
                        {importedLeads.length > 50 && (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            {isRTL
                              ? `... و ${importedLeads.length - 50} آخرين`
                              : `... and ${importedLeads.length - 50} more`}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
