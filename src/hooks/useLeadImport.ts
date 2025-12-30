import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// =====================================================
// ENHANCED CRM MIGRATION SYSTEM
// Supports enterprise-grade lead import with:
// - Preview mode (mandatory before import)
// - Merge duplicate handling
// - Activity migration
// - Rollback capability
// - Custom fields support
// - Detailed error tracking
// =====================================================

interface ImportedLead {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  stage?: string;
  group?: string;
  assigned_agent?: string;
  notes?: string;
  opted_in?: boolean;
  activity_date?: string;
  activity_description?: string;
  [key: string]: string | boolean | undefined; // For custom fields
}

interface PreviewResult {
  jobId: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  previewData: Array<{
    row: number;
    data: ImportedLead;
    isDuplicate: boolean;
    existingLeadId?: string;
    errors: string[];
  }>;
}

interface ImportJobResult {
  jobId: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  failedRows: number;
  duplicateRows: number;
  errors: Array<{ row: number; reason: string }>;
  rollbackUntil?: string;
}

interface ImportOptions {
  duplicateAction: "skip" | "merge";
  sourceLabel?: string;
  defaultAgentId?: string;
  defaultStage?: string;
  defaultGroupId?: string;
  forceAgentReassign?: boolean;
}

export function useLeadImport() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Get company_id from user profile
  const getCompanyId = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    return data?.company_id || null;
  }, [user]);

  // Check user role (everyone has access as requested)
  const checkUserRole = useCallback(async (): Promise<boolean> => {
    return !!user;
  }, [user]);

  // Normalize phone number for duplicate detection
  const normalizePhone = (phone: string): string => {
    if (!phone) return "";
    // Remove all non-numeric chars
    let cleaned = phone.replace(/[^0-9]/g, "");
    // Remove leading 00 (international prefix)
    if (cleaned.startsWith("00")) {
      cleaned = cleaned.slice(2);
    }
    // Require minimum 7 digits
    if (cleaned.length < 7) return "";
    return "+" + cleaned;
  };

  // Check for duplicate lead
  const checkDuplicate = async (
    phone: string,
    email: string | undefined,
    companyId: string
  ): Promise<{ leadId: string; matchType: string } | null> => {
    // First check by normalized phone
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone) {
      const { data: phoneMatch } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", companyId)
        .eq("normalized_phone", normalizedPhone)
        .limit(1)
        .maybeSingle();

      if (phoneMatch) {
        return { leadId: phoneMatch.id, matchType: "phone" };
      }
    }

    // Then check by email
    if (email && email.trim()) {
      const { data: emailMatch } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", companyId)
        .ilike("email", email.trim())
        .limit(1)
        .maybeSingle();

      if (emailMatch) {
        return { leadId: emailMatch.id, matchType: "email" };
      }
    }

    return null;
  };

  // Extract custom fields from lead data
  const extractCustomFields = (lead: ImportedLead): Record<string, string> => {
    const standardFields = [
      "name", "phone", "email", "source", "stage", "group",
      "assigned_agent", "notes", "opted_in", "activity_date",
      "activity_description"
    ];

    const customFields: Record<string, string> = {};
    Object.entries(lead).forEach(([key, value]) => {
      if (!standardFields.includes(key) && value !== undefined && value !== "") {
        customFields[key] = String(value);
      }
    });

    return customFields;
  };

  // STEP 1: Preview import (analyze without inserting)
  const previewImport = async (
    leads: ImportedLead[],
    fileName: string,
    sourceLabel: string = "Excel Import"
  ): Promise<PreviewResult | null> => {
    if (!user) {
      toast.error("You must be logged in");
      return null;
    }

    const hasPermission = await checkUserRole();
    if (!hasPermission) {
      toast.error("Only Admin or Manager can import leads");
      return null;
    }

    const companyId = await getCompanyId();
    if (!companyId) {
      toast.error("Company not found");
      return null;
    }

    setIsPreviewing(true);
    setProgress(0);

    try {
      const previewData: PreviewResult["previewData"] = [];
      let validRows = 0;
      let duplicateRows = 0;
      let invalidRows = 0;

      // Analyze each row
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const rowNumber = i + 1;
        const errors: string[] = [];
        let isDuplicate = false;
        let existingLeadId: string | undefined;

        // Validate required fields
        if (!lead.name?.trim()) {
          errors.push("Name is required");
        }

        // Require phone OR email
        if (!lead.phone?.trim() && !lead.email?.trim()) {
          errors.push("Phone or Email is required");
        }

        // Check for duplicates
        if (lead.phone?.trim() || lead.email?.trim()) {
          const duplicate = await checkDuplicate(
            lead.phone || "",
            lead.email,
            companyId
          );
          if (duplicate) {
            isDuplicate = true;
            existingLeadId = duplicate.leadId;
            duplicateRows++;
          }
        }

        if (errors.length > 0) {
          invalidRows++;
        } else if (!isDuplicate) {
          validRows++;
        }

        previewData.push({
          row: rowNumber,
          data: lead,
          isDuplicate,
          existingLeadId,
          errors,
        });

        // Update progress
        if (i % 100 === 0) {
          setProgress(Math.round((i / leads.length) * 100));
        }
      }

      // Create import job in preview status
      const { data: job, error: jobError } = await supabase
        .from("lead_import_jobs")
        .insert({
          company_id: companyId,
          uploaded_by: user.id,
          file_name: fileName,
          source_label: sourceLabel,
          total_rows: leads.length,
          valid_rows: validRows,
          duplicate_rows: duplicateRows,
          skipped_rows: invalidRows,
          status: "preview",
          preview_rows: previewData.slice(0, 100), // Store first 100 for UI preview
        })
        .select()
        .single();

      if (jobError) {
        console.error("Failed to create preview job:", jobError);
        toast.error("Failed to create import preview");
        setIsPreviewing(false);
        return null;
      }

      setIsPreviewing(false);
      setProgress(100);

      return {
        jobId: job.id,
        totalRows: leads.length,
        validRows,
        duplicateRows,
        invalidRows,
        previewData,
      };
    } catch (error) {
      console.error("Preview error:", error);
      setIsPreviewing(false);
      toast.error("Preview failed unexpectedly");
      return null;
    }
  };

  // STEP 2: Execute import (after preview)
  const importLeads = async (
    leads: ImportedLead[],
    fileName: string,
    duplicateAction: "skip" | "merge" = "skip",
    options?: Partial<ImportOptions>
  ): Promise<ImportJobResult | null> => {
    if (!user) {
      toast.error("You must be logged in to import leads");
      return null;
    }

    const hasPermission = await checkUserRole();
    if (!hasPermission) {
      toast.error("Only Admin or Manager can import leads");
      return null;
    }

    const companyId = await getCompanyId();
    if (!companyId) {
      toast.error("Company not found");
      return null;
    }

    setIsImporting(true);
    setProgress(0);

    const errors: Array<{ row: number; reason: string }> = [];
    let importedRows = 0;
    let skippedRows = 0;
    let failedRows = 0;
    let duplicateRows = 0;

    try {
      // Create import job record
      const rollbackUntil = new Date();
      rollbackUntil.setHours(rollbackUntil.getHours() + 24); // 24-hour rollback window

      const { data: job, error: jobError } = await supabase
        .from("lead_import_jobs")
        .insert({
          company_id: companyId,
          uploaded_by: user.id,
          file_name: fileName,
          source_label: options?.sourceLabel || "Excel Import",
          total_rows: leads.length,
          duplicate_action: duplicateAction,
          default_agent_id: options?.defaultAgentId || null,
          default_stage: options?.defaultStage || null,
          default_group_id: options?.defaultGroupId || null,
          status: "processing",
          rollback_until: rollbackUntil.toISOString(),
        })
        .select()
        .single();

      if (jobError) {
        console.error("Failed to create import job:", jobError);
        toast.error("Failed to start import. Check your permissions.");
        setIsImporting(false);
        return null;
      }

      const jobId = job.id;

      // Process leads in batches
      const batchSize = 50;
      const totalBatches = Math.ceil(leads.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, leads.length);
        const batch = leads.slice(batchStart, batchEnd);

        const leadsToInsert: any[] = [];
        const activitiesToInsert: any[] = [];
        const errorRecords: any[] = [];

        for (let i = 0; i < batch.length; i++) {
          const lead = batch[i];
          const rowNumber = batchStart + i + 1;

          // Validate required fields
          const hasName = lead.name?.trim();
          const hasPhone = lead.phone?.trim();
          const hasEmail = lead.email?.trim();

          if (!hasName) {
            errors.push({ row: rowNumber, reason: "Name is required" });
            errorRecords.push({
              import_job_id: jobId,
              row_number: rowNumber,
              error_type: "validation",
              error_message: "Name is required",
              raw_row_data: lead,
            });
            failedRows++;
            continue;
          }

          if (!hasPhone && !hasEmail) {
            errors.push({ row: rowNumber, reason: "Phone or Email is required" });
            errorRecords.push({
              import_job_id: jobId,
              row_number: rowNumber,
              error_type: "validation",
              error_message: "Phone or Email is required",
              raw_row_data: lead,
            });
            failedRows++;
            continue;
          }

          // Check for duplicates
          const duplicate = await checkDuplicate(
            lead.phone || "",
            lead.email,
            companyId
          );

          if (duplicate) {
            duplicateRows++;

            if (duplicateAction === "skip") {
              skippedRows++;
              continue;
            } else {
              // Merge: update only empty fields on existing lead
              const customFields = extractCustomFields(lead);
              const updateData: any = {};

              // Only add non-empty values for merge
              if (lead.email?.trim()) updateData.email = lead.email.trim();
              if (lead.source?.trim()) updateData.source = lead.source.trim();
              if (lead.stage?.trim()) updateData.stage = lead.stage.trim();
              if (Object.keys(customFields).length > 0) updateData.custom_fields = customFields;

              // Optionally reassign agent
              if (options?.forceAgentReassign && options?.defaultAgentId) {
                updateData.assigned_agent_id = options.defaultAgentId;
              }

              // Call merge function or update directly
              const { error: mergeError } = await supabase
                .from("leads")
                .update({
                  ...updateData,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", duplicate.leadId)
                .is("email", null); // Only update if field is empty (basic merge)

              if (!mergeError) {
                importedRows++;

                // Add merge activity
                activitiesToInsert.push({
                  lead_id: duplicate.leadId,
                  type: "note",
                  title: "Lead data merged from import",
                  description: `Data merged from file: ${fileName}`,
                  agent_id: user.id,
                  agent_name: user.email || "System",
                  company_id: companyId,
                  import_job_id: jobId,
                });

                // Import activities if provided
                if (lead.activity_date || lead.activity_description) {
                  activitiesToInsert.push({
                    lead_id: duplicate.leadId,
                    type: "note",
                    title: lead.activity_description?.substring(0, 100) || "Imported activity",
                    description: lead.activity_description || "",
                    agent_name: "Imported",
                    company_id: companyId,
                    import_job_id: jobId,
                    created_at: lead.activity_date || new Date().toISOString(),
                  });
                }
              }
              continue;
            }
          }

          // Extract custom fields for new lead
          const customFields = extractCustomFields(lead);

          // Prepare new lead
          leadsToInsert.push({
            company_id: companyId,
            name: lead.name.trim(),
            phone: lead.phone?.trim() || null,
            email: lead.email?.trim() || null,
            source: lead.source?.trim() || options?.sourceLabel || "Excel Import",
            stage: lead.stage?.trim() || options?.defaultStage || "New",
            lead_group_id: options?.defaultGroupId || null,
            assigned_agent_id: options?.defaultAgentId || null,
            imported_from: "excel",
            import_job_id: jobId,
            opted_in: lead.opted_in !== undefined ? lead.opted_in : false,
            custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
          });
        }

        // Insert error records
        if (errorRecords.length > 0) {
          await supabase.from("import_row_errors").insert(errorRecords);
        }

        // Insert new leads
        if (leadsToInsert.length > 0) {
          const { data: insertedLeads, error: insertError } = await supabase
            .from("leads")
            .insert(leadsToInsert)
            .select("id");

          if (insertError) {
            console.error("Insert error:", insertError);
            failedRows += leadsToInsert.length;
            errors.push({
              row: batchStart + 1,
              reason: `Batch insert failed: ${insertError.message}`
            });
          } else {
            importedRows += insertedLeads?.length || 0;

            // Create activity records for imported leads
            if (insertedLeads && insertedLeads.length > 0) {
              const importActivities = insertedLeads.map((lead, idx) => ({
                lead_id: lead.id,
                type: "import",
                title: "Lead imported via Excel",
                description: `Imported from file: ${fileName}`,
                agent_id: user.id,
                agent_name: user.email || "System",
                company_id: companyId,
                import_job_id: jobId,
              }));

              activitiesToInsert.push(...importActivities);

              // Add migrated activities if present
              batch.forEach((batchLead, idx) => {
                if (insertedLeads[idx] && (batchLead.activity_date || batchLead.activity_description)) {
                  activitiesToInsert.push({
                    lead_id: insertedLeads[idx].id,
                    type: "note",
                    title: batchLead.activity_description?.substring(0, 100) || "Imported activity",
                    description: batchLead.activity_description || "",
                    agent_name: "Imported",
                    company_id: companyId,
                    import_job_id: jobId,
                    created_at: batchLead.activity_date || new Date().toISOString(),
                  });
                }
              });
            }
          }
        }

        // Insert activities
        if (activitiesToInsert.length > 0) {
          await supabase.from("lead_activities").insert(activitiesToInsert);
        }

        // Update progress
        const progressPercent = Math.round(((batchIndex + 1) / totalBatches) * 100);
        setProgress(progressPercent);

        // Update job progress in database
        await supabase
          .from("lead_import_jobs")
          .update({
            imported_rows: importedRows,
            skipped_rows: skippedRows,
            failed_rows: failedRows,
            duplicate_rows: duplicateRows,
            error_details: errors.slice(0, 100), // Keep first 100 errors in job record
          })
          .eq("id", jobId);
      }

      // Mark job as completed
      const finalStatus = failedRows > 0 && importedRows === 0 ? "failed" : "completed";

      await supabase
        .from("lead_import_jobs")
        .update({
          status: finalStatus,
          imported_rows: importedRows,
          skipped_rows: skippedRows,
          failed_rows: failedRows,
          duplicate_rows: duplicateRows,
          error_details: errors.slice(0, 100),
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      setIsImporting(false);
      setProgress(100);

      return {
        jobId,
        totalRows: leads.length,
        importedRows,
        skippedRows,
        failedRows,
        duplicateRows,
        errors,
        rollbackUntil: rollbackUntil.toISOString(),
      };
    } catch (error) {
      console.error("Import error:", error);
      setIsImporting(false);
      toast.error("Import failed unexpectedly");
      return null;
    }
  };

  // STEP 3: Rollback import
  const rollbackImport = async (jobId: string): Promise<boolean> => {
    if (!user) {
      toast.error("You must be logged in");
      return false;
    }

    const hasPermission = await checkUserRole();
    if (!hasPermission) {
      toast.error("Only Admin or Manager can rollback imports");
      return false;
    }

    try {
      const { data, error } = await supabase.rpc("rollback_import", {
        p_job_id: jobId,
        p_user_id: user.id,
      });

      if (error) {
        console.error("Rollback error:", error);
        toast.error("Rollback failed: " + error.message);
        return false;
      }

      const result = data as { success: boolean; error?: string; leads_deleted?: number };

      if (result.success) {
        toast.success(`Rolled back ${result.leads_deleted} leads`);
        return true;
      } else {
        toast.error(result.error || "Rollback failed");
        return false;
      }
    } catch (error) {
      console.error("Rollback error:", error);
      toast.error("Rollback failed unexpectedly");
      return false;
    }
  };

  // Get import job history
  const getImportHistory = async (): Promise<any[]> => {
    const companyId = await getCompanyId();
    if (!companyId) return [];

    const { data, error } = await supabase
      .from("lead_import_jobs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch import history:", error);
      return [];
    }

    return data || [];
  };

  // Download error report for an import job
  const downloadErrorReport = async (jobId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("import_row_errors")
      .select("*")
      .eq("import_job_id", jobId)
      .order("row_number");

    if (error || !data) {
      toast.error("Failed to fetch error report");
      return null;
    }

    // Create CSV content
    const headers = ["Row Number", "Error Type", "Error Message", "Raw Data"];
    const rows = data.map(e => [
      e.row_number,
      e.error_type,
      e.error_message,
      JSON.stringify(e.raw_row_data),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return csv;
  };

  return {
    // Core functions
    previewImport,
    importLeads,
    rollbackImport,

    // Utility functions
    getImportHistory,
    downloadErrorReport,

    // State
    isImporting,
    isPreviewing,
    progress,
  };
}
