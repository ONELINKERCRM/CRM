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
import { Upload, FileSpreadsheet, ArrowRight, Check, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ListingsImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportComplete?: () => void;
}

type ImportStep = "upload" | "mapping" | "importing" | "complete";

const listingFields = [
    { key: "title", label: "Title", required: true },
    { key: "title_ar", label: "Title (Arabic)", required: false },
    { key: "description", label: "Description", required: false },
    { key: "description_ar", label: "Description (Arabic)", required: false },
    { key: "price", label: "Price", required: false },
    { key: "currency", label: "Currency", required: false },
    { key: "address", label: "Address", required: false },
    { key: "city", label: "City", required: false },
    { key: "number_of_bedrooms", label: "Bedrooms", required: false },
    { key: "number_of_bathrooms", label: "Bathrooms", required: false },
    { key: "area_size", label: "Area Size", required: false },
    { key: "property_type", label: "Property Type", required: false },
    { key: "listing_type", label: "Listing Type (sale/rent)", required: false },
    { key: "developer", label: "Developer", required: false },
    { key: "project_name", label: "Project Name", required: false },
    { key: "building_name", label: "Building Name", required: false },
    { key: "handover_date", label: "Handover Date", required: false },
    { key: "floor_number", label: "Floor Number", required: false },
    { key: "parking_spaces", label: "Parking Spaces", required: false },
    { key: "rent_frequency", label: "Rent Frequency", required: false },
    { key: "completion_status", label: "Completion Status", required: false },
    { key: "tags", label: "Tags (comma separated)", required: false },
];

export function ListingsImportDialog({ open, onOpenChange, onImportComplete }: ListingsImportDialogProps) {
    const [step, setStep] = useState<ImportStep>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileUpload = (e: any) => {
        let uploadedFile: File | null = null;
        if (e.target && e.target.files) {
            uploadedFile = e.target.files[0];
        } else if (e.dataTransfer && e.dataTransfer.files) {
            uploadedFile = e.dataTransfer.files[0];
        }

        if (uploadedFile) {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: "array" });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    if (json.length > 0) {
                        const headers = (json[0] as string[]).map(h => String(h || '').trim());
                        setExcelHeaders(headers);
                        setExcelData(json.slice(1));
                        setFile(uploadedFile);

                        // Auto-mapping
                        const initialMapping: Record<string, string> = {};
                        listingFields.forEach(field => {
                            const match = headers.find(h =>
                                h.toLowerCase().includes(field.label.toLowerCase()) ||
                                h.toLowerCase().includes(field.key.toLowerCase().replace(/_/g, ' '))
                            );
                            if (match) initialMapping[field.key] = match;
                        });
                        setColumnMapping(initialMapping);
                        setStep("mapping");
                    }
                } catch (err: any) {
                    toast.error("Failed to read file: " + err.message);
                }
            };
            reader.readAsArrayBuffer(uploadedFile);
        }
    };

    const startImport = async () => {
        setIsImporting(true);
        setStep("importing");
        setProgress(0);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Use a more reliable way to get agent and company_id
            const { data: profile } = await supabase
                .from("profiles")
                .select("company_id")
                .eq("id", user.id)
                .single();

            const { data: agent } = await supabase
                .from("agents")
                .select("id, company_id")
                .eq("user_id", user.id)
                .single();

            if (!agent) throw new Error("Agent profile not found");

            const total = excelData.length;
            let imported = 0;

            const batchSize = 10;
            for (let i = 0; i < total; i += batchSize) {
                const batch = excelData.slice(i, i + batchSize);
                const records = batch.map(row => {
                    const record: any = {
                        company_id: agent.company_id,
                        created_by: agent.id,
                        assigned_agent_id: agent.id,
                        currency: 'AED',
                        status: 'draft',
                        property_type: 'residential',
                        listing_type: 'sale',
                        area_unit: 'sqft'
                    };

                    listingFields.forEach(field => {
                        const excelHeader = columnMapping[field.key];
                        if (excelHeader) {
                            const headerIndex = excelHeaders.indexOf(excelHeader);
                            let val = row[headerIndex];

                            if (val !== undefined && val !== null) {
                                // Conversions
                                if (field.key === 'price' || field.key === 'area_size') {
                                    val = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : parseFloat(val);
                                } else if (['number_of_bedrooms', 'number_of_bathrooms', 'floor_number', 'parking_spaces'].includes(field.key)) {
                                    val = parseInt(String(val)) || 0;
                                } else if (field.key === 'tags' && typeof val === 'string') {
                                    val = val.split(',').map(t => t.trim()).filter(Boolean);
                                }

                                if (val !== undefined && val !== null && !Number.isNaN(val)) {
                                    record[field.key] = val;
                                }
                            }
                        }
                    });

                    // Data cleaning for constraints
                    if (record.rent_frequency) {
                        const rf = String(record.rent_frequency).toLowerCase();
                        if (rf.includes('year')) record.rent_frequency = 'Yearly';
                        else if (rf.includes('month')) record.rent_frequency = 'Monthly';
                        else if (rf.includes('week')) record.rent_frequency = 'Weekly';
                        else if (rf.includes('day')) record.rent_frequency = 'Daily';
                        else record.rent_frequency = 'Yearly';
                    }

                    if (record.completion_status) {
                        const cs = String(record.completion_status).toLowerCase();
                        if (cs.includes('off') || cs.includes('plan')) record.completion_status = 'Off-plan';
                        else record.completion_status = 'Ready';
                    }
                    if (record.property_type) {
                        const pt = record.property_type.toLowerCase();
                        const allowedPT = ['residential', 'commercial', 'land', 'industrial', 'mixed_use', 'other'];
                        if (!allowedPT.includes(pt)) record.property_type = 'residential';
                    }

                    if (record.listing_type) {
                        const lt = record.listing_type.toLowerCase();
                        const allowedLT = ['sale', 'rent', 'both'];
                        if (!allowedLT.includes(lt)) record.listing_type = 'sale';
                    }

                    if (!record.title || record.title === "null") record.title = "Untitled Listing";

                    return record;
                });

                const { error } = await supabase.from("listings").insert(records);
                if (error) throw error;

                imported += records.length;
                setProgress(Math.round((imported / total) * 100));
            }

            setStep("complete");
            onImportComplete?.();
        } catch (error: any) {
            console.error("Import error:", error);
            toast.error("Import failed: " + error.message);
            setStep("mapping");
            setIsImporting(false);
        }
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
                <ResponsiveDialogHeader className="px-6 py-3 border-b">
                    <ResponsiveDialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary" />
                        Import Listings
                    </ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <ResponsiveDialogBody className="p-0">
                    <ScrollArea className="max-h-[75vh]">
                        <div className="p-5">
                            {step === "upload" && (
                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                                        isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20 hover:border-primary/50"
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
                                    onClick={() => document.getElementById("listing-file-upload")?.click()}
                                >
                                    <input
                                        id="listing-file-upload"
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                    />
                                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileSpreadsheet className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Upload your listings file</h3>
                                    <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                                        Drag and drop your Excel or CSV file here, or click to browse
                                    </p>
                                    <Button variant="outline" className="gap-2">
                                        <Upload className="h-4 w-4" />
                                        Select File
                                    </Button>
                                </div>
                            )}

                            {step === "mapping" && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Mapping columns for <strong>{file?.name}</strong></span>
                                        <Badge variant="outline">{excelData.length} rows found</Badge>
                                    </div>

                                    <div className="grid gap-2">
                                        {listingFields.map((field) => (
                                            <div key={field.key} className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg border border-border/50">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium flex items-center gap-1">
                                                        {field.label}
                                                        {field.required && <span className="text-destructive">*</span>}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                <div className="flex-1">
                                                    <Select
                                                        value={columnMapping[field.key] || "skip"}
                                                        onValueChange={(val) => setColumnMapping(prev => ({ ...prev, [field.key]: val }))}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select column..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="skip">Skip field</SelectItem>
                                                            {excelHeaders.map(header => (
                                                                <SelectItem key={header} value={header}>{header}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button variant="outline" className="flex-1" onClick={() => setStep("upload")}>Back</Button>
                                        <Button className="flex-1 gap-2" onClick={startImport}>
                                            Start Import
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === "importing" && (
                                <div className="text-center py-12 space-y-4">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                                    <h3 className="text-lg font-semibold">Importing Listings...</h3>
                                    <p className="text-muted-foreground">Please wait while we process your data.</p>
                                    <div className="max-w-xs mx-auto pt-4">
                                        <Progress value={progress} className="h-2" />
                                        <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
                                    </div>
                                </div>
                            )}

                            {step === "complete" && (
                                <div className="text-center py-12 space-y-6">
                                    <div className="bg-success/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                                        <Check className="h-10 w-10 text-success" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Import Complete!</h3>
                                        <p className="text-muted-foreground mt-2">
                                            Successfully imported {excelData.length} listings to your company portfolio.
                                        </p>
                                    </div>
                                    <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </ResponsiveDialogBody>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
}
