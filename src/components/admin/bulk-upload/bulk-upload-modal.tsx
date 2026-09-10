"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Download, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle,
  XCircle, ArrowRight, ArrowLeft, RefreshCw, Layers, FileText, Check,
  AlertCircle, Sparkles, Filter, Info, Trash2, X, Plus,
  ChevronDown, ChevronRight, Folder, FolderOpen, Code2, ListOrdered
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getTemplateConfig, ModuleTemplateConfig, ColumnDefinition } from "./template-configs";

export interface BulkUploadProps {
  isOpen?: boolean;
  inline?: boolean;
  onClose?: () => void;
  moduleType: string; // "course" | "practice" | "assignment" | "assessment" | "quiz" | "project"
  moduleTitle?: string;
  onImport: (importedItems: any[]) => void;
}

interface RowValidationError {
  fieldKey: string;
  fieldLabel: string;
  message: string;
}

interface ParsedRowResult {
  rowNumber: number;
  rawRow: Record<string, any>;
  errors: RowValidationError[];
  isValid: boolean;
}

export function BulkUploadModal(props: BulkUploadProps) {
  return <BulkUploadComponent {...props} inline={props.inline ?? false} />;
}

export function BulkUploadCard(props: BulkUploadProps) {
  return <BulkUploadComponent {...props} inline={true} />;
}

export function BulkUploadComponent({
  isOpen = true,
  inline = false,
  onClose,
  moduleType,
  moduleTitle,
  onImport,
}: BulkUploadProps) {
  const { toast } = useToast();
  const config: ModuleTemplateConfig = getTemplateConfig(moduleType);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column Customizer State: User can include/exclude optional columns
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(() =>
    config.columns.map((c) => c.key)
  );

  // Modal Step: "upload" (Steps 1-3) | "preview" (Steps 4-6)
  const [currentStep, setCurrentStep] = useState<"upload" | "preview">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRowResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "invalid">("all");
  const [previewViewMode, setPreviewViewMode] = useState<"modules" | "table">("modules");
  const [expandedModuleKeys, setExpandedModuleKeys] = useState<Record<string, boolean>>({});

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen || inline) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, inline]);

  const resetState = () => {
    setCurrentStep("upload");
    setUploadedFile(null);
    setParsedRows([]);
    setIsProcessing(false);
    setPreviewFilter("all");
    setPreviewViewMode(config.groupByField ? "modules" : "table");
    setExpandedModuleKeys({});
    setSelectedColumnKeys(config.columns.map((c) => c.key));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleModalClose = () => {
    resetState();
    if (onClose) onClose();
  };

  if (!isOpen) return null;
  if (!inline && !mounted) return null;

  // Active columns to be exported in template
  const activeColumns = config.columns.filter(
    (col) => col.required || selectedColumnKeys.includes(col.key)
  );

  const toggleColumn = (key: string) => {
    const col = config.columns.find((c) => c.key === key);
    if (col?.required) {
      toast({
        title: "Required Field",
        description: `"${col.label}" is required by the curriculum system and cannot be removed.`,
      });
      return;
    }
    setSelectedColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumnKeys(config.columns.map((c) => c.key));
  };

  const selectRequiredOnly = () => {
    setSelectedColumnKeys(config.columns.filter((c) => c.required).map((c) => c.key));
  };

  // ─── 1. TEMPLATE GENERATION & DOWNLOAD ──────────────────────────────────────
  const handleDownloadTemplate = async (format: "xlsx" | "csv" = "xlsx") => {
    try {
      // 1. Build Header Row for Active Selected Columns
      const headerRow = activeColumns.map((col) => col.label);
      
      // 2. Build Sample Data Rows
      const sampleDataRows = config.sampleRows.map((sample) => {
        return activeColumns.map((col) => {
          const val = sample[col.key];
          return val !== undefined ? val : (col.sampleValue !== undefined ? col.sampleValue : "");
        });
      });

      // 3. Create Worksheet (dynamically import xlsx on demand)
      const XLSX = await import("xlsx");
      const wsData = [headerRow, ...sampleDataRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto-fit column widths
      const colWidths = activeColumns.map((col) => {
        const headerLen = col.label.length;
        const sampleLen = col.sampleValue ? String(col.sampleValue).length : 10;
        return { wch: Math.max(headerLen, sampleLen, 16) };
      });
      ws["!cols"] = colWidths;

      // 4. Create Workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");

      // Reference Guide sheet for Active Column Specifications
      const guideHeaders = ["Column Name", "Required", "Data Type", "Allowed Options / Format", "Description"];
      const guideRows = activeColumns.map((col) => [
        col.label,
        col.required ? "YES (Required)" : "NO (Optional)",
        col.type.toUpperCase(),
        col.options ? col.options.join(" | ") : (col.type === "boolean" ? "Yes / No" : "Any"),
        col.description
      ]);
      const guideWs = XLSX.utils.aoa_to_sheet([guideHeaders, ...guideRows]);
      guideWs["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 55 }];
      XLSX.utils.book_append_sheet(wb, guideWs, "Column Definitions");

      // 5. Trigger download
      const fileName = config.templateFileName
        ? (format === "csv" ? config.templateFileName.replace(/\.xlsx$/i, ".csv") : config.templateFileName)
        : `${config.moduleType}_template.${format}`;
      if (format === "csv") {
        XLSX.writeFile(wb, fileName, { bookType: "csv" });
      } else {
        XLSX.writeFile(wb, fileName, { bookType: "xlsx" });
      }

      toast({
        title: "Template Downloaded",
        description: `Downloaded ${fileName} with ${activeColumns.length} customized columns.`,
      });
    } catch (err: any) {
      console.error("Failed to generate Excel template", err);
      toast({
        title: "Download Failed",
        description: err?.message || "Could not generate template file.",
        variant: "destructive",
      });
    }
  };

  // ─── 2. FILE UPLOAD & VALIDATION LOGIC ──────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast({
        title: "Unsupported File Format",
        description: "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0] || "";
      const ws = sheetName ? wb.Sheets[sheetName] : undefined;
      
      if (!ws) {
        throw new Error("No data found in uploaded worksheet.");
      }

      // Convert sheet to JSON array of objects with raw header keys
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (rawRows.length === 0) {
        throw new Error("The uploaded file is empty. Please add rows and re-upload.");
      }

      // Helper to clean headers: lowercased, alphanumeric only
      const cleanHeader = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      // Extensive aliases for header matching
      const HEADER_ALIASES: Record<string, string[]> = {
        subModuleName: [
          "submodulename", "submodule", "submoduletitle", "submoduleheader",
          "modulename", "module", "moduletitle", "chapter", "topic", "group"
        ],
        title: [
          "practiceitemtitle", "itemtitle", "questiontitle", "question", "title",
          "problemtitle", "problemname", "problem", "challengename", "task"
        ],
        description: [
          "problemstatement", "problemstatementmarkdown", "description", "statement",
          "problemdesc", "prompt", "overview"
        ],
        type: [
          "problemtype", "type", "questiontype", "format", "category"
        ],
        difficulty: [
          "difficultylevel", "difficulty", "level", "tier"
        ],
        durationMinutes: [
          "durationminutes", "duration", "timelimit", "time", "mins", "minutes"
        ],
        totalMarks: [
          "totalmarks", "totalpoint", "marks", "points", "totalmarkspoints", "score", "maxmarks"
        ],
        constraints: [
          "constraints", "constraint", "limits"
        ],
        input_format: [
          "inputformat", "inputformatdescription", "input"
        ],
        output_format: [
          "outputformat", "outputformatdescription", "output"
        ],
        sample_input: [
          "sampleinput", "sampleinput1", "exampleinput"
        ],
        sample_output: [
          "sampleoutput", "sampleoutput1", "exampleoutput"
        ],
        sample_explanation: [
          "sampleexplanation", "explanation"
        ],
        testcase_1_input: [
          "testcase1input", "testcase1", "testcases", "testcasesinput", "publictestcase1input", "publictestcases"
        ],
        testcase_1_output: [
          "testcase1output", "testcase1expectedoutput", "testcase1expected", "publictestcase1output"
        ],
        testcase_2_input: [
          "testcase2input", "testcase2", "testcase2in"
        ],
        testcase_2_output: [
          "testcase2output", "testcase2expectedoutput", "testcase2out"
        ],
        hidden_testcase_input: [
          "hiddentestcaseinput", "hiddentestcase1input", "hiddentestcases", "hiddentests", "hiddentestinput"
        ],
        hidden_testcase_output: [
          "hiddentestcaseoutput", "hiddentestcase1output", "hiddentestcase1expectedoutput", "hiddentestoutput"
        ],
        starterCode: [
          "startercode", "startercodeboilerplate", "boilerplate", "template", "starter"
        ],
        restrictCopyPaste: [
          "restrictcopypaste", "copypaste", "disablepaste", "proctoringcopypaste"
        ],
        enforceFullScreen: [
          "enforcefullscreen", "fullscreen", "fullscreenmode", "lockfullscreen"
        ]
      };

      // Create a normalized header mapping
      const columnMapping: Record<string, ColumnDefinition> = {};
      config.columns.forEach((col) => {
        columnMapping[cleanHeader(col.label)] = col;
        columnMapping[cleanHeader(col.key)] = col;
        const aliases = HEADER_ALIASES[col.key] || [];
        aliases.forEach((alias) => {
          columnMapping[cleanHeader(alias)] = col;
        });
      });

      // Validate each row
      const results: ParsedRowResult[] = rawRows.map((row, idx) => {
        const rowNumber = idx + 2; // +2 for 1-based indexing & Excel header row
        const mappedRow: Record<string, any> = {};
        const errors: RowValidationError[] = [];

        // Match row attributes to canonical column keys
        Object.keys(row).forEach((rawHeader) => {
          const cleaned = cleanHeader(rawHeader);
          const matchedCol = columnMapping[cleaned];
          if (matchedCol) {
            mappedRow[matchedCol.key] = row[rawHeader];
          }
        });

        // Cross-populate subModuleName / moduleName
        if (mappedRow.moduleName && !mappedRow.subModuleName) {
          mappedRow.subModuleName = mappedRow.moduleName;
        }
        if (mappedRow.subModuleName && !mappedRow.moduleName) {
          mappedRow.moduleName = mappedRow.subModuleName;
        }

        // Check each expected column against rules
        config.columns.forEach((col) => {
          const val = mappedRow[col.key];
          const isBlank = val === undefined || val === null || String(val).trim() === "";

          // 1. Required Check
          if (col.required && isBlank) {
            errors.push({
              fieldKey: col.key,
              fieldLabel: col.label,
              message: `${col.label} is required (Row #${rowNumber}).`,
            });
            return;
          }

          if (!isBlank) {
            // 2. Enum Option Check
            if (col.type === "enum" && col.options) {
              const matchedOption = col.options.find(
                (opt) => opt.toLowerCase() === String(val).trim().toLowerCase()
              );
              if (!matchedOption) {
                errors.push({
                  fieldKey: col.key,
                  fieldLabel: col.label,
                  message: `Invalid ${col.label}: '${val}'. Allowed values: [${col.options.join(", ")}].`,
                });
              } else {
                mappedRow[col.key] = matchedOption; // normalize casing
              }
            }

            // 3. Number Check
            if (col.type === "number") {
              const num = Number(val);
              if (isNaN(num)) {
                errors.push({
                  fieldKey: col.key,
                  fieldLabel: col.label,
                  message: `${col.label} must be a valid number.`,
                });
              } else {
                mappedRow[col.key] = num;
              }
            }

            // 4. URL Check
            if (col.type === "url") {
              const strVal = String(val).trim();
              if (!strVal.startsWith("http://") && !strVal.startsWith("https://")) {
                errors.push({
                  fieldKey: col.key,
                  fieldLabel: col.label,
                  message: `${col.label} must be a valid URL starting with http:// or https://`,
                });
              }
            }

            // 5. Custom Column Validator
            if (col.validate) {
              const customErr = col.validate(val, mappedRow);
              if (customErr) {
                errors.push({
                  fieldKey: col.key,
                  fieldLabel: col.label,
                  message: customErr,
                });
              }
            }
          }
        });

        return {
          rowNumber,
          rawRow: mappedRow,
          errors,
          isValid: errors.length === 0,
        };
      });

      setParsedRows(results);
      setCurrentStep("preview");
      setIsProcessing(false);

      const validCount = results.filter((r) => r.isValid).length;
      const invalidCount = results.length - validCount;

      if (invalidCount > 0) {
        toast({
          title: "Validation Complete with Issues",
          description: `Found ${validCount} valid and ${invalidCount} invalid rows. Please review below.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "All Rows Validated Successfully",
          description: `${validCount} sub-modules ready for import.`,
        });
      }
    } catch (err: any) {
      console.error("Error parsing bulk file", err);
      setIsProcessing(false);
      toast({
        title: "File Parse Error",
        description: err?.message || "Failed to read Excel/CSV file.",
        variant: "destructive",
      });
    }
  };

  // ─── 3. ERROR REPORT EXPORT ────────────────────────────────────────────────
  const handleDownloadErrorReport = async () => {
    try {
      const invalidRows = parsedRows.filter((r) => !r.isValid);
      if (invalidRows.length === 0) {
        toast({ title: "No Errors", description: "All rows in this upload are valid." });
        return;
      }

      // Build Error Report Sheet
      const reportHeaders = [
        "Row Number",
        "Error Field",
        "Error Description",
        ...config.columns.map((c) => c.label)
      ];

      const reportData: any[][] = [];
      invalidRows.forEach((item) => {
        item.errors.forEach((err) => {
          const rowValues = config.columns.map((c) => item.rawRow[c.key] || "");
          reportData.push([
            item.rowNumber,
            err.fieldLabel,
            err.message,
            ...rowValues
          ]);
        });
      });

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([reportHeaders, ...reportData]);
      ws["!cols"] = [
        { wch: 12 },
        { wch: 22 },
        { wch: 45 },
        ...config.columns.map(() => ({ wch: 20 }))
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Errors");
      XLSX.writeFile(wb, `bulk_upload_errors_${config.moduleType}_row_report.xlsx`);

      toast({
        title: "Error Report Downloaded",
        description: `Exported ${reportData.length} error entries. Correct the issues and re-upload.`,
      });
    } catch (err: any) {
      console.error("Failed to generate error report", err);
      toast({
        title: "Error Report Failed",
        description: err?.message || "Could not export error report.",
        variant: "destructive",
      });
    }
  };

  // ─── 3.5. GROUPED MODULES COMPUTATION (FOR 1 MODULE -> MANY QUESTIONS) ────
  const groupedModules = React.useMemo(() => {
    if (!config.groupByField) return [];
    const groupKeyName = config.groupByField;
    const map = new Map<string, { groupKey: string; validRows: ParsedRowResult[]; allRows: ParsedRowResult[]; duplicateTitles: string[] }>();

    parsedRows.forEach((r) => {
      const rawVal = r.rawRow.subModuleName ?? r.rawRow[groupKeyName] ?? r.rawRow.moduleName ?? r.rawRow.sub_module_name ?? r.rawRow.module_name;
      const key = (String(rawVal ?? "").trim()) || "Unassigned Sub-Module";
      if (!map.has(key)) {
        map.set(key, { groupKey: key, validRows: [], allRows: [], duplicateTitles: [] });
      }
      const entry = map.get(key)!;
      entry.allRows.push(r);
      if (r.isValid) {
        entry.validRows.push(r);
      }
    });

    // Detect duplicate questions inside the same module
    map.forEach((entry) => {
      const seenTitles = new Set<string>();
      const dupes = new Set<string>();
      entry.allRows.forEach((r) => {
        const title = String(r.rawRow.title || "").trim().toLowerCase();
        if (title) {
          if (seenTitles.has(title)) {
            dupes.add(String(r.rawRow.title).trim());
          } else {
            seenTitles.add(title);
          }
        }
      });
      entry.duplicateTitles = Array.from(dupes);
    });

    return Array.from(map.values());
  }, [parsedRows, config.groupByField]);

  // ─── 4. FINAL IMPORT EXECUTION ──────────────────────────────────────────────
  const handleConfirmImport = (importOnlyValid: boolean = false) => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast({
        title: "No Valid Records",
        description: "There are no valid records to import. Please correct the errors in the Excel file.",
        variant: "destructive",
      });
      return;
    }

    let payload: any[];
    if (config.mapGroupedPayload && config.groupByField) {
      const groupedForPayload = groupedModules
        .filter((g) => g.validRows.length > 0)
        .map((g) => ({
          groupKey: g.groupKey,
          rows: g.validRows.map((r) => r.rawRow),
        }));
      payload = config.mapGroupedPayload(groupedForPayload);
    } else {
      payload = validRows.map((r, idx) => config.mapToPayload(r.rawRow, idx));
    }

    onImport(payload);

    toast({
      title: "Bulk Import Initiated",
      description: config.groupByField
        ? `Importing ${payload.length} module(s) containing ${validRows.length} question(s).`
        : `Processing ${payload.length} items for ${moduleTitle || config.displayName}.`,
    });

    handleModalClose();
  };

  // Counts
  const totalCount = parsedRows.length;
  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = totalCount - validCount;

  // Filtered rows for preview table
  const displayedRows = parsedRows.filter((r) => {
    if (previewFilter === "valid") return r.isValid;
    if (previewFilter === "invalid") return !r.isValid;
    return true;
  });

  // INNER CONTENT BODY
  const contentBody = (
    <div className="space-y-6">
      {/* STEP 1 & 2: UPLOAD & TEMPLATE SELECTION VIEW */}
      {currentStep === "upload" && (
        <div className="space-y-6">
          {/* Info Notice Banner */}
          <div className="p-4 rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/5 flex items-start gap-3.5">
            <Info className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-[#111827] dark:text-[#FAFAFA]">
                Auto-configured for {config.displayName}
              </p>
              <p className="text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                {config.moduleType === "coding_problem"
                  ? "Download the customized template below. Fill in your coding problem statements, test cases, and constraints, then upload the completed file."
                  : "Download the customized template below. Choose the columns you need, fill in your lessons, and upload the completed file."}
              </p>
            </div>
          </div>

          {/* Step 1: Download Template */}
          <div className="p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Step 1: Customize & Download Template
                </h4>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                  ({activeColumns.length} of {config.columns.length} columns active for export)
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownloadTemplate("csv")}
                  className="h-9 px-3.5 text-xs font-semibold rounded-xl gap-1.5 border-[#E5E7EB] dark:border-[#27272A] hover:bg-gray-50 dark:hover:bg-[#27272A]"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl gap-1.5 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" /> Download Excel ({activeColumns.length} Cols)
                </Button>
              </div>
            </div>

            {/* Interactive Column Selector / Customizer */}
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#27272A] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA] block">
                    Choose Template Columns:
                  </span>
                  <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">
                    Click any optional column pill below to add or remove it from the template.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={selectAllColumns}
                    className="text-[10px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    Include All ({config.columns.length})
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={selectRequiredOnly}
                    className="text-[10px] font-bold text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:underline cursor-pointer"
                  >
                    Required Only ({config.columns.filter((c) => c.required).length})
                  </button>
                </div>
              </div>

              {/* Interactive Column Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {config.columns.map((col) => {
                  const isIncluded = col.required || selectedColumnKeys.includes(col.key);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleColumn(col.key)}
                      disabled={col.required}
                      title={
                        col.required
                          ? `${col.label} is required by the system.`
                          : isIncluded
                          ? `Click to remove "${col.label}" from Excel template`
                          : `Click to add "${col.label}" into Excel template`
                      }
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                        col.required
                          ? "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#111827] dark:text-[#FAFAFA] cursor-default"
                          : isIncluded
                          ? "bg-[#2563EB]/10 border-[#2563EB] text-[#2563EB] shadow-2xs hover:bg-[#2563EB]/15 cursor-pointer"
                          : "bg-gray-50/60 dark:bg-black/20 border-dashed border-gray-300 dark:border-zinc-700 text-[#9CA3AF] hover:border-[#2563EB]/60 hover:text-[#2563EB] cursor-pointer"
                      }`}
                    >
                      <span className="font-semibold">{col.label}</span>

                      {col.required ? (
                        <span className="text-[9px] font-bold text-[#DC2626] bg-[#DC2626]/10 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      ) : isIncluded ? (
                        <span className="text-[9px] font-bold text-[#16A34A] bg-[#16A34A]/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Check className="h-2.5 w-2.5" /> Added
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-[#6B7280] bg-gray-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Plus className="h-2.5 w-2.5" /> Add
                        </span>
                      )}

                      <span className="text-[9px] font-mono opacity-70">
                        {col.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 2: Upload Dropzone */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#FAFAFA]">
              Step 2: Upload Completed Excel / CSV
            </h4>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2563EB]/40 hover:border-[#2563EB] bg-[#2563EB]/5 hover:bg-[#2563EB]/10 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#18181B] border border-[#2563EB]/30 flex items-center justify-center text-[#2563EB] shadow-sm">
                <UploadCloud className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#111827] dark:text-[#FAFAFA]">
                  Click to Browse or Drag & Drop Excel / CSV file
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                </p>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB] pt-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Parsing and validating data rows...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 & 5 & 6: PREVIEW & VALIDATION RESULTS */}
      {currentStep === "preview" && (
        <div className="space-y-5">
          {/* Summary Stats Cards */}
          {config.groupByField ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl border border-[#2563EB]/30 bg-[#2563EB]/5 flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">Total Sub-Modules</p>
                  <p className="text-2xl font-bold text-[#2563EB] mt-0.5">{groupedModules.length}</p>
                </div>
                <Folder className="h-7 w-7 text-[#2563EB]/50" />
              </div>

              <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Questions</p>
                  <p className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA] mt-0.5">{totalCount}</p>
                </div>
                <FileSpreadsheet className="h-7 w-7 text-[#6B7280]/40" />
              </div>

              <div className="p-4 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/5 flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider">Valid Questions</p>
                  <p className="text-2xl font-bold text-[#16A34A] mt-0.5">{validCount}</p>
                </div>
                <CheckCircle2 className="h-7 w-7 text-[#16A34A]/50" />
              </div>

              <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
                invalidCount > 0
                  ? "border-[#DC2626]/30 bg-[#DC2626]/5 text-[#DC2626]"
                  : "border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] text-[#6B7280]"
              }`}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider">Invalid Questions</p>
                  <p className="text-2xl font-bold mt-0.5">{invalidCount}</p>
                </div>
                <AlertTriangle className="h-7 w-7 opacity-50" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Records</p>
                  <p className="text-2xl font-bold text-[#111827] dark:text-[#FAFAFA] mt-0.5">{totalCount}</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-[#6B7280]/40" />
              </div>

              <div className="p-4 rounded-xl border border-[#16A34A]/30 bg-[#16A34A]/5 flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider">Valid Records</p>
                  <p className="text-2xl font-bold text-[#16A34A] mt-0.5">{validCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-[#16A34A]/50" />
              </div>

              <div className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
                invalidCount > 0
                  ? "border-[#DC2626]/30 bg-[#DC2626]/5 text-[#DC2626]"
                  : "border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#09090B] text-[#6B7280]"
              }`}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider">Invalid Records</p>
                  <p className="text-2xl font-bold mt-0.5">{invalidCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 opacity-50" />
              </div>
            </div>
          )}

          {/* Table Controls, View Mode Switcher & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {config.groupByField && (
                <div className="flex items-center bg-[#F3F4F6] dark:bg-[#09090B] p-0.5 rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode("modules")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      previewViewMode === "modules"
                        ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-xs"
                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5" /> Sub-Module Wise View ({groupedModules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode("table")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      previewViewMode === "table"
                        ? "bg-white dark:bg-[#18181B] text-[#2563EB] shadow-xs"
                        : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                    }`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> All Rows ({totalCount})
                  </button>
                </div>
              )}

              <Tabs value={previewFilter} onValueChange={(v) => setPreviewFilter(v as any)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs font-semibold">All ({totalCount})</TabsTrigger>
                  <TabsTrigger value="valid" className="text-xs font-semibold text-[#16A34A]">Valid ({validCount})</TabsTrigger>
                  <TabsTrigger value="invalid" className="text-xs font-semibold text-[#DC2626]">Invalid ({invalidCount})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {invalidCount > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadErrorReport}
                className="h-9 text-xs font-semibold text-[#DC2626] border-[#DC2626]/40 hover:bg-[#DC2626]/10 gap-1.5 rounded-xl self-start sm:self-auto shadow-xs"
              >
                <Download className="h-3.5 w-3.5" /> Download Error Report (.xlsx)
              </Button>
            )}
          </div>

          {/* VIEW 1: MODULE-WISE CARDS (ONE MODULE -> MANY QUESTIONS) */}
          {config.groupByField && previewViewMode === "modules" ? (
            <div className="space-y-4">
              {groupedModules.map((mod, mIdx) => {
                const isExpanded = expandedModuleKeys[mod.groupKey] !== false; // Default expanded
                const hasDupes = mod.duplicateTitles.length > 0;
                const modValidCount = mod.validRows.length;
                const modTotalCount = mod.allRows.length;

                return (
                  <Card key={mod.groupKey} className="border-2 border-[#2563EB]/30 dark:border-[#2563EB]/40 bg-white dark:bg-[#18181B] rounded-2xl shadow-xs overflow-hidden">
                    {/* Module Card Header */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-[#27272A]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold shrink-0">
                          <Folder className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-[#111827] dark:text-[#FAFAFA] truncate">
                              {mod.groupKey}
                            </h4>
                            <Badge className="bg-[#2563EB] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                              {modValidCount} {modValidCount === 1 ? "Question" : "Questions"}
                            </Badge>
                            {modTotalCount > modValidCount && (
                              <Badge className="bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 text-[10px] font-bold">
                                {modTotalCount - modValidCount} Invalid
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                            Module {mIdx + 1} of {groupedModules.length} • {modValidCount} challenges to be imported under this module
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedModuleKeys(prev => ({ ...prev, [mod.groupKey]: !isExpanded }))}
                          className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10"
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          {isExpanded ? "Collapse" : "View Questions"}
                        </Button>
                      </div>
                    </div>

                    {/* Duplicate Warning if any */}
                    {hasDupes && (
                      <div className="p-3 mx-4 mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          Duplicate questions detected in this module: <strong>{mod.duplicateTitles.join(", ")}</strong>
                        </span>
                      </div>
                    )}

                    {/* Question Items List */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-2 bg-[#F9FAFB]/40 dark:bg-[#09090B]/40">
                        <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-hidden bg-white dark:bg-[#18181B]">
                          {mod.allRows.map((r, qIdx) => {
                            const qTitle = String(r.rawRow.title || `Question ${qIdx + 1}`).trim();
                            const qDiff = r.rawRow.difficulty || "Easy";
                            const qType = r.rawRow.type || "coding";
                            const hasTc = Boolean(r.rawRow.testcase_1_input || r.rawRow.testcase_1_output);
                            const hasHid = Boolean(r.rawRow.hidden_testcase_input || r.rawRow.hidden_testcase_output);

                            return (
                              <div key={r.rowNumber} className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${!r.isValid ? "bg-[#FEF2F2]/60 dark:bg-[#450A0A]/20" : "hover:bg-slate-50/70 dark:hover:bg-zinc-900/50"}`}>
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {qIdx + 1}
                                  </span>
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-xs text-[#111827] dark:text-[#FAFAFA] truncate">
                                        {qTitle}
                                      </p>
                                      <Badge variant="outline" className="text-[10px] font-semibold">
                                        {qDiff}
                                      </Badge>
                                      <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] uppercase font-bold">
                                        {qType}
                                      </Badge>
                                      {hasTc && (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                          • Public Test Cases
                                        </span>
                                      )}
                                      {hasHid && (
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                          • Hidden Cases
                                        </span>
                                      )}
                                    </div>
                                    {!r.isValid && (
                                      <p className="text-[11px] text-[#DC2626] font-medium">
                                        Row #{r.rowNumber}: {r.errors.map(e => e.message).join(", ")}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 self-end sm:self-center">
                                  {r.isValid ? (
                                    <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30 text-[10px] font-bold">
                                      Valid
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 text-[10px] font-bold">
                                      Row #{r.rowNumber} Error
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}

              {/* Summary Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-[#E5E7EB] dark:border-[#27272A] space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#FAFAFA] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#2563EB]" /> Import Summary
                </h5>
                <p className="text-xs text-[#6B7280]">
                  <strong>Total Modules:</strong> {groupedModules.length} &nbsp;|&nbsp; <strong>Total Questions:</strong> {validCount}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {groupedModules.map(g => (
                    <div key={g.groupKey} className="p-2.5 rounded-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-xs flex items-center justify-between">
                      <span className="font-semibold truncate pr-2">{g.groupKey}</span>
                      <Badge className="bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold shrink-0">
                        {g.validRows.length} Questions
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 2: DETAILED ROWS TABLE VIEW */
            <div className="border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-hidden shadow-xs bg-white dark:bg-[#18181B]">
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] z-10">
                    <tr>
                      <th className="p-3 font-bold text-[#6B7280] w-16 text-center">Row</th>
                      <th className="p-3 font-bold text-[#6B7280] w-24">Status</th>
                      {config.columns.map((col) => (
                        <th key={col.key} className="p-3 font-bold text-[#111827] dark:text-[#FAFAFA] whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={config.columns.length + 2} className="p-8 text-center text-xs text-[#6B7280]">
                          No records matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((rowItem) => (
                        <tr
                          key={rowItem.rowNumber}
                          className={`hover:bg-[#F9FAFB] dark:hover:bg-[#09090B]/50 transition-colors ${
                            !rowItem.isValid ? "bg-[#FEF2F2]/50 dark:bg-[#450A0A]/20" : ""
                          }`}
                        >
                          <td className="p-3 text-center font-mono font-bold text-[#6B7280]">
                                #{rowItem.rowNumber}
                          </td>
                          <td className="p-3">
                            {rowItem.isValid ? (
                              <Badge className="bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/30 text-[10px] font-bold">
                                Valid
                              </Badge>
                            ) : (
                              <Badge className="bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 text-[10px] font-bold">
                                {rowItem.errors.length} Error{rowItem.errors.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </td>

                          {config.columns.map((col) => {
                            const cellVal = rowItem.rawRow[col.key];
                            const cellErr = rowItem.errors.find((e) => e.fieldKey === col.key);

                            return (
                              <td key={col.key} className="p-3 max-w-[220px] truncate align-top">
                                {cellErr ? (
                                  <div className="space-y-0.5">
                                    <span className="text-[#DC2626] font-bold line-through">
                                      {cellVal !== undefined && cellVal !== "" ? String(cellVal) : "(Empty)"}
                                    </span>
                                    <p className="text-[10px] text-[#DC2626] font-medium leading-tight whitespace-normal">
                                      {cellErr.message}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-[#111827] dark:text-[#FAFAFA]">
                                    {cellVal !== undefined && cellVal !== "" ? String(cellVal) : "-"}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // FOOTER ACTIONS
  const footerActions = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      {currentStep === "preview" ? (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep("upload")}
            className="h-10 text-xs font-semibold rounded-xl gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Re-Upload Different File
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleModalClose}
              className="h-10 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>

            {invalidCount > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleConfirmImport(true)}
                disabled={validCount === 0}
                className="h-10 px-4 text-xs font-semibold border-[#2563EB]/40 text-[#2563EB] hover:bg-[#2563EB]/10 rounded-xl"
              >
                Import {validCount} Valid Only
              </Button>
            )}

            <Button
              type="button"
              onClick={() => handleConfirmImport(false)}
              disabled={validCount === 0}
              className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl gap-2 shadow-sm"
            >
              <Check className="h-4 w-4" />
              Confirm & Import ({validCount} Records)
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-end w-full gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleModalClose}
            className="h-10 text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );

  // ─── 1. INLINE CARD MODE (Zero backdrop blur, fits screen workflow like a native card) ──
  if (inline) {
    return (
      <Card id="bulk-upload-card-section" className="bg-white dark:bg-[#18181B] border-2 border-[#2563EB] rounded-2xl shadow-md space-y-6 p-6 sm:p-7 animate-in fade-in-50 duration-200 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold shrink-0">
                <UploadCloud className="h-5 w-5 text-[#2563EB]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#111827] dark:text-[#FAFAFA] tracking-tight truncate">
                {config.moduleType === "coding_problem"
                  ? "Bulk Upload Coding Problems"
                  : moduleTitle
                  ? `Bulk Upload — ${moduleTitle}`
                  : "Bulk Upload Content"}
              </h3>
              <Badge className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                {config.moduleType}
              </Badge>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1 truncate">
              Target Module: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{config.displayName}</span>
              {moduleTitle && ` • "${moduleTitle}"`}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] p-1 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => setCurrentStep("upload")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStep === "upload" ? "bg-[#2563EB] text-white shadow-xs" : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                }`}
              >
                1. Upload & Validate
              </button>
              <ArrowRight className="h-3 w-3 text-[#9CA3AF]" />
              <button
                type="button"
                onClick={() => {
                  if (parsedRows.length > 0) {
                    setCurrentStep("preview");
                  } else {
                    toast({
                      title: "Upload Required",
                      description: "Please upload an Excel or CSV file first to preview records.",
                    });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStep === "preview"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : parsedRows.length > 0
                    ? "text-[#2563EB] hover:bg-[#2563EB]/10"
                    : "text-[#9CA3AF] hover:text-[#6B7280]"
                }`}
              >
                2. Preview & Import {parsedRows.length > 0 && `(${parsedRows.length})`}
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleModalClose}
              className="text-xs font-semibold text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Content Body */}
        {contentBody}

        {/* Footer */}
        <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
          {footerActions}
        </div>
      </Card>
    );
  }

  // ─── 2. MODAL DIALOG MODE (PORTALED TO DOCUMENT.BODY) ──
  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in-50 duration-150">
      <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl w-full max-w-4xl h-[88vh] max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#27272A] shrink-0 bg-[#F9FAFB]/90 dark:bg-[#111827]/80 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold shrink-0">
                <UploadCloud className="h-4 w-4 text-[#2563EB]" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#FAFAFA] tracking-tight truncate">
                {config.moduleType === "coding_problem"
                  ? "Bulk Upload Coding Problems"
                  : moduleTitle
                  ? `Bulk Upload — ${moduleTitle}`
                  : "Bulk Upload Content"}
              </h3>
              <Badge className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                {config.moduleType}
              </Badge>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5 truncate">
              Target: <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">{config.displayName}</span>
              {moduleTitle && ` • "${moduleTitle}"`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] p-1 rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => setCurrentStep("upload")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStep === "upload" ? "bg-[#2563EB] text-white shadow-xs" : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                }`}
              >
                1. Upload & Validate
              </button>
              <ArrowRight className="h-3 w-3 text-[#9CA3AF]" />
              <button
                type="button"
                onClick={() => {
                  if (parsedRows.length > 0) {
                    setCurrentStep("preview");
                  } else {
                    toast({
                      title: "Upload Required",
                      description: "Please upload an Excel or CSV file first to preview records.",
                    });
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStep === "preview"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : parsedRows.length > 0
                    ? "text-[#2563EB] hover:bg-[#2563EB]/10"
                    : "text-[#9CA3AF] hover:text-[#6B7280]"
                }`}
              >
                2. Preview & Import {parsedRows.length > 0 && `(${parsedRows.length})`}
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleModalClose}
              className="h-8 w-8 p-0 rounded-full text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {contentBody}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-[#E5E7EB] dark:border-[#27272A] shrink-0 bg-[#F9FAFB]/90 dark:bg-[#111827]/80">
          {footerActions}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
