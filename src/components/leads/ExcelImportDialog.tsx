import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  Loader2,
  X,
  AlertCircle,
  Copy,
  Merge,
  Database,
  Users,
  Shield,
  History,
  Sparkles,
  FileText,
  RotateCcw,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLeadImport } from "@/hooks/useLeadImport";

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (leads: Record<string, string>[]) => void;
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

const leadFields = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "source", label: "Source", required: false },
  { key: "stage", label: "Stage", required: false },
  { key: "assigned_agent", label: "Agent", required: false },
  { key: "opted_in", label: "Opted In", required: false },
  { key: "activity_date", label: "Activity Date", required: false },
  { key: "activity_description", label: "Activity Notes", required: false },
];

const features = [
  { icon: Database, text: "Up to 50,000 leads" },
  { icon: Merge, text: "Smart duplicate handling" },
  { icon: History, text: "Activity migration" },
  { icon: RotateCcw, text: "24h rollback option" },
];

export function ExcelImportDialog({ open, onOpenChange, onImport }: ExcelImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<string[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "merge">("skip");
  const [sourceLabel, setSourceLabel] = useState("Excel Import");
  const [previewStats, setPreviewStats] = useState<{
    total: number;
    valid: number;
    duplicates: number;
    invalid: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    importedRows: number;
    skippedRows: number;
    failedRows: number;
    duplicateRows: number;
    errors: Array<{ row: number; reason: string }>;
    rollbackUntil?: string;
    jobId?: string;
  } | null>(null);

  const { importLeads, previewImport, rollbackImport, downloadErrorReport, isImporting, isPreviewing, progress } = useLeadImport();

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setExcelData([]);
    setExcelHeaders([]);
    setColumnMapping({});
    setDuplicateAction("skip");
    setSourceLabel("Excel Import");
    setPreviewStats(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });

      if (jsonData.length < 2) {
        toast.error("File must have header + data rows");
        return;
      }

      const headers = jsonData[0].map(h => String(h || "").trim());
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ""));

      setExcelHeaders(headers);
      setExcelData(rows.map(row => row.map(cell => String(cell || ""))));
      setFile(file);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        leadFields.forEach(field => {
          if (
            headerLower.includes(field.key) ||
            (field.key === "name" && (headerLower.includes("full") || headerLower === "lead")) ||
            (field.key === "phone" && (headerLower.includes("mobile") || headerLower.includes("tel") || headerLower.includes("contact"))) ||
            (field.key === "email" && headerLower.includes("mail")) ||
            (field.key === "assigned_agent" && (headerLower.includes("agent") || headerLower.includes("owner") || headerLower.includes("assigned"))) ||
            (field.key === "opted_in" && (headerLower.includes("opt") || headerLower.includes("consent") || headerLower.includes("gdpr"))) ||
            (field.key === "activity_date" && (headerLower.includes("date") || headerLower.includes("created"))) ||
            (field.key === "activity_description" && (headerLower.includes("note") || headerLower.includes("activity") || headerLower.includes("comment")))
          ) {
            if (!autoMapping[field.key]) {
              autoMapping[field.key] = String(index);
            }
          }
        });
      });
      setColumnMapping(autoMapping);

      setStep("mapping");
      toast.success(`Found ${rows.length} leads in ${headers.length} columns`);
    } catch (error) {
      toast.error("Failed to parse file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) parseExcelFile(selectedFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls") || droppedFile.name.endsWith(".csv"))) {
      parseExcelFile(droppedFile);
    } else {
      toast.error("Upload .xlsx, .xls or .csv");
    }
  }, []);

  const handleMappingChange = (fieldKey: string, columnIndex: string) => {
    setColumnMapping(prev => {
      const newMapping = { ...prev };
      if (columnIndex === "skip") delete newMapping[fieldKey];
      else newMapping[fieldKey] = columnIndex;
      return newMapping;
    });
  };

  const getMappedData = (): Array<{ name: string; phone?: string; email?: string; source?: string; stage?: string; opted_in?: boolean; activity_date?: string; activity_description?: string }> => {
    return excelData.map(row => {
      const lead: Record<string, unknown> = {};
      Object.entries(columnMapping).forEach(([fieldKey, colIndex]) => {
        const value = row[parseInt(colIndex)] || "";
        if (fieldKey === "opted_in") {
          lead[fieldKey] = value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
        } else {
          lead[fieldKey] = value;
        }
      });
      // Store unmapped columns as custom fields
      excelHeaders.forEach((header, index) => {
        const isMapped = Object.values(columnMapping).includes(String(index));
        if (!isMapped && row[index]) {
          lead[header] = row[index];
        }
      });
      return lead;
    }).filter(lead => lead.name && (lead.phone || lead.email));
  };

  const handlePreview = async () => {
    const leads = getMappedData();
    const result = await previewImport(leads, file?.name || "import.xlsx", sourceLabel);

    if (result) {
      setPreviewStats({
        total: result.totalRows,
        valid: result.validRows,
        duplicates: result.duplicateRows,
        invalid: result.invalidRows,
      });
      setStep("preview");
    }
  };

  const handleImport = async () => {
    setStep("importing");
    const leads = getMappedData();

    const result = await importLeads(leads, file?.name || "import.xlsx", duplicateAction, {
      sourceLabel,
    });

    if (result) {
      setImportResult({
        importedRows: result.importedRows,
        skippedRows: result.skippedRows,
        failedRows: result.failedRows,
        duplicateRows: result.duplicateRows,
        errors: result.errors,
        rollbackUntil: result.rollbackUntil,
        jobId: result.jobId,
      });
      setStep("complete");
      onImport?.(leads as Record<string, string>[]);
    } else {
      setStep("preview");
    }
  };

  const handleRollback = async () => {
    if (importResult?.jobId) {
      const success = await rollbackImport(importResult.jobId);
      if (success) {
        handleClose();
      }
    }
  };

  const handleDownloadErrors = async () => {
    if (importResult?.jobId) {
      const csv = await downloadErrorReport(importResult.jobId);
      if (csv) {
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `import-errors-${importResult.jobId.slice(0, 8)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const requiredFieldsMapped = columnMapping["name"] !== undefined &&
    (columnMapping["phone"] !== undefined || columnMapping["email"] !== undefined);

  const mappedCount = Object.keys(columnMapping).length;

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <ResponsiveDialogHeader className="px-6 pt-4 pb-2 border-b">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            CRM Lead Import & Migration
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="p-0">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-5 space-y-4">
              {/* Steps indicator */}
              {(step === "upload" || step === "mapping" || step === "preview") && (
                <div className="flex items-center justify-between pb-3 mb-2 border-b overflow-x-auto no-scrollbar">
                  {[
                    { id: "upload", label: "Upload", icon: Upload },
                    { id: "mapping", label: "Map Fields", icon: FileText },
                    { id: "preview", label: "Review", icon: Shield },
                  ].map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <div className={cn(
                        "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-colors",
                        step === s.id
                          ? "bg-primary text-primary-foreground"
                          : ["mapping", "preview"].indexOf(step) > i - 1 && step !== "upload"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}>
                        <s.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className={cn(step !== s.id && "hidden sm:inline")}>{s.label}</span>
                        {step === s.id && <span>{s.label}</span>}
                      </div>
                      {i < 2 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Step */}
              {step === "upload" && (
                <div className="space-y-3">
                  {/* Drop zone - More compact */}
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all",
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                    )}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => document.getElementById("excel-file-input")?.click()}
                  >
                    <input
                      id="excel-file-input"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">Drop your file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mb-2">Support .xlsx, .xls, .csv</p>
                    <div className="flex items-center justify-center gap-1.5">
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">Excel</Badge>
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">CSV</Badge>
                    </div>
                  </div>

                  {/* Info box - Unified and Tighter */}
                  <Card className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                    <div className="flex gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-200">
                        <span className="font-semibold">Perfect for CRM Migration:</span> Import from Zoho, HubSpot, or Salesforce. Unmapped columns are saved as custom fields.
                      </p>
                    </div>
                  </Card>

                  {/* Features & Requirements - Integrated and smaller */}
                  <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="flex items-start gap-2">
                      <Database className="h-3.5 w-3.5 text-primary mt-0.5" />
                      <span className="text-[11px] text-muted-foreground">Up to 50k leads</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground">Header row required</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Merge className="h-3.5 w-3.5 text-primary mt-0.5" />
                      <span className="text-[11px] text-muted-foreground">Duplicate checking</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground">Migrate activities</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mapping Step */}
              {step === "mapping" && (
                <div className="space-y-4">
                  {/* File info */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{file?.name}</span>
                      <Badge variant="outline" className="text-xs">{excelData.length} rows</Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetState}>
                      <X className="h-3 w-3 mr-1" /> Change
                    </Button>
                  </div>

                  {/* Source Label */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Import Source Label</Label>
                    <Input
                      value={sourceLabel}
                      onChange={(e) => setSourceLabel(e.target.value)}
                      placeholder="e.g., Zoho CRM Migration, HubSpot Export"
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">This label will be saved with all imported leads</p>
                  </div>

                  {/* Column Mapping */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Column Mapping</Label>
                      <Badge variant="secondary" className="text-xs">
                        {mappedCount} / {leadFields.length} mapped
                      </Badge>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-lg p-2">
                      <div className="space-y-2">
                        {leadFields.map(field => (
                          <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-1.5 border-b border-muted last:border-0">
                            <div className="flex items-center gap-2 flex-shrink-0 sm:w-28">
                              <span className={cn(
                                "text-xs",
                                field.required && "font-medium"
                              )}>
                                {field.label}
                                {field.required && <span className="text-destructive ml-0.5">*</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 hidden sm:block" />
                              <Select
                                value={columnMapping[field.key] || "skip"}
                                onValueChange={(value) => handleMappingChange(field.key, value)}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                                  <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip" className="text-xs text-muted-foreground">— Skip —</SelectItem>
                                  {excelHeaders.map((header, index) => (
                                    <SelectItem key={index} value={String(index)} className="text-xs">
                                      {header || `Column ${index + 1}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {columnMapping[field.key] !== undefined && (
                                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      {excelHeaders.length - mappedCount} unmapped columns will be saved as custom fields
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={resetState}>
                      Back
                    </Button>
                    <Button size="sm" className="flex-1" onClick={handlePreview} disabled={!requiredFieldsMapped || isPreviewing}>
                      {isPreviewing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Analyze & Preview
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview Step */}
              {step === "preview" && (
                <div className="space-y-4">
                  {/* Preview Stats */}
                  {previewStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Card className="p-2 sm:p-3 text-center">
                        <p className="text-xl sm:text-2xl font-bold">{previewStats.total}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total Rows</p>
                      </Card>
                      <Card className="p-2 sm:p-3 text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{previewStats.valid}</p>
                        <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-400">Valid</p>
                      </Card>
                      <Card className="p-2 sm:p-3 text-center bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                        <p className="text-xl sm:text-2xl font-bold text-yellow-600">{previewStats.duplicates}</p>
                        <p className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-400">Duplicates</p>
                      </Card>
                      <Card className="p-2 sm:p-3 text-center bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                        <p className="text-xl sm:text-2xl font-bold text-red-600">{previewStats.invalid}</p>
                        <p className="text-[10px] sm:text-xs text-red-700 dark:text-red-400">Invalid</p>
                      </Card>
                    </div>
                  )}

                  {/* Duplicate Handling */}
                  {previewStats && previewStats.duplicates > 0 && (
                    <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3">
                        How should we handle {previewStats.duplicates} duplicate leads?
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setDuplicateAction("skip")}
                          className={cn(
                            "p-3 rounded-lg border-2 text-left transition-all",
                            duplicateAction === "skip"
                              ? "border-primary bg-primary/5"
                              : "border-transparent bg-background hover:border-muted"
                          )}
                        >
                          <Copy className="h-5 w-5 mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium">Skip Duplicates</p>
                          <p className="text-xs text-muted-foreground">Keep existing leads unchanged</p>
                        </button>
                        <button
                          onClick={() => setDuplicateAction("merge")}
                          className={cn(
                            "p-3 rounded-lg border-2 text-left transition-all",
                            duplicateAction === "merge"
                              ? "border-primary bg-primary/5"
                              : "border-transparent bg-background hover:border-muted"
                          )}
                        >
                          <Merge className="h-5 w-5 mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium">Merge Data</p>
                          <p className="text-xs text-muted-foreground">Fill empty fields on existing leads</p>
                        </button>
                      </div>
                    </Card>
                  )}

                  {/* Lead Preview */}
                  <div className="space-y-2">
                    <Label className="text-xs">Sample Leads Preview</Label>
                    <ScrollArea className="h-[120px] border rounded-lg">
                      <div className="p-2 space-y-1.5">
                        {getMappedData().slice(0, 5).map((lead, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{lead.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{lead.phone || lead.email}</p>
                            </div>
                            {lead.source && <Badge variant="outline" className="text-xs ml-2">{lead.source}</Badge>}
                          </div>
                        ))}
                        {getMappedData().length > 5 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            + {getMappedData().length - 5} more leads
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep("mapping")}>
                      Back
                    </Button>
                    <Button size="sm" className="flex-1" onClick={handleImport} disabled={isImporting}>
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Start Import
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Importing Step */}
              {step === "importing" && (
                <div className="py-10 space-y-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Importing your leads...</p>
                    <p className="text-sm text-muted-foreground">
                      Please don't close this window
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm font-medium">{progress}% complete</p>
                  </div>
                </div>
              )}

              {/* Complete Step */}
              {step === "complete" && importResult && (
                <div className="py-4 space-y-5">
                  <div className="text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                      <Check className="h-7 w-7 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Import Complete!</p>
                      <p className="text-sm text-muted-foreground">
                        Your leads have been imported successfully
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Card className="p-2 sm:p-3 text-center bg-green-50 dark:bg-green-900/20">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{importResult.importedRows}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Imported</p>
                    </Card>
                    <Card className="p-2 sm:p-3 text-center bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{importResult.duplicateRows}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Duplicates</p>
                    </Card>
                    <Card className="p-2 sm:p-3 text-center bg-yellow-50 dark:bg-yellow-900/20">
                      <p className="text-xl sm:text-2xl font-bold text-yellow-600">{importResult.skippedRows}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Skipped</p>
                    </Card>
                    <Card className="p-2 sm:p-3 text-center bg-red-50 dark:bg-red-900/20">
                      <p className="text-xl sm:text-2xl font-bold text-red-600">{importResult.failedRows}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Failed</p>
                    </Card>
                  </div>

                  {importResult.errors.length > 0 && (
                    <Card className="p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            {importResult.errors.length} errors occurred
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDownloadErrors}>
                          <Download className="h-3 w-3 mr-1" /> Export
                        </Button>
                      </div>
                      <ScrollArea className="h-[60px]">
                        <div className="space-y-1 text-xs text-red-700 dark:text-red-300">
                          {importResult.errors.slice(0, 3).map((err, i) => (
                            <p key={i}>Row {err.row}: {err.reason}</p>
                          ))}
                          {importResult.errors.length > 3 && (
                            <p className="text-red-500">+ {importResult.errors.length - 3} more errors</p>
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  )}

                  {importResult.rollbackUntil && (
                    <Card className="p-3 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm">Need to undo this import?</p>
                          <p className="text-xs text-muted-foreground">Rollback available for 24 hours</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-8" onClick={handleRollback}>
                          Rollback
                        </Button>
                      </div>
                    </Card>
                  )}

                  <Button className="w-full" onClick={handleClose}>
                    Done
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
