"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getTemplateConfig, ModuleTemplateConfig, ColumnDefinition } from "./template-configs";

export interface BulkUploadProps {
  isOpen?: boolean;
  inline?: boolean;
  onClose?: () => void;
  moduleType: string; // "course" | "practice" | "assignment" | "assessment" | "assessment_questions" | "quiz" | "project"
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

  // Column Customizer State
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(() =>
    config.columns.map((c) => c.key)
  );

  // Modal Step: "upload" | "preview"
  const [currentStep, setCurrentStep] = useState<"upload" | "preview">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRowResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "invalid">("all");
  const [previewViewMode, setPreviewViewMode] = useState<"modules" | "table">(
    config.groupByField ? "modules" : "table"
  );
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
      const headerRow = activeColumns.map((col) => col.label);
      const sampleDataRows = config.sampleRows.map((sample) => {
        return activeColumns.map((col) => {
          const val = sample[col.key];
          return val !== undefined ? val : col.sampleValue !== undefined ? col.sampleValue : "";
        });
      });

      const XLSX = await import("xlsx");
      const worksheetData = [headerRow, ...sampleDataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      worksheet["!cols"] = activeColumns.map((col) => ({
        wch: Math.max(col.label.length + 4, 18),
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

      const baseName = config.templateFileName.replace(/\.(xlsx|csv)$/i, "");
      const fileName = `${baseName}_${activeColumns.length}_cols.${format}`;

      if (format === "csv") {
        XLSX.writeFile(workbook, fileName, { bookType: "csv" });
      } else {
        XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
      }

      toast({
        title: "Template Downloaded",
        description: `Downloaded ${fileName} with ${activeColumns.length} columns.`,
      });
    } catch (err: any) {
      console.error("Failed to generate template", err);
      toast({
        title: "Download Failed",
        description: err?.message || "Could not generate file.",
        variant: "destructive",
      });
    }
  };

  // ─── 2. FILE UPLOAD & PARSING ──────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const cleanHeader = (h: string): string => {
    return String(h || "")
      .trim()
      .toLowerCase()
      .replace(/[\s\-_*()\[\]/\\:]+/g, "");
  };

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("Workbook contains no readable sheets.");
      }

      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        throw new Error("Worksheet not found in workbook.");
      }
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        blankrows: false,
      });

      if (rawRows.length === 0) {
        throw new Error("The uploaded sheet has no data rows.");
      }

      const HEADER_ALIASES: Record<string, string[]> = {
        title: ["title", "name", "lessonname", "lesson", "questionname", "problemtitle", "itemtitle", "problemstatement", "statement"],
        subModuleName: ["submodulename", "submodule", "modulename", "module", "chapter", "unit", "section", "topic"],
        sectionName: ["sectionname", "section", "part", "category", "examsection", "testsection"],
        assessmentTitle: ["assessmenttitle", "assessmentname", "examtitle", "examname", "testtitle", "testname"],
        type: ["type", "deliverytype", "problemtype", "format", "category", "questiontype"],
        duration: ["duration", "time", "length", "durationminutes"],
        durationMinutes: ["durationminutes", "duration", "time", "timeminutes"],
        totalMarks: ["totalmarks", "marks", "points", "score", "maxmarks", "maxscore"],
        marks: ["marks", "points", "score", "totalmarks", "maxmarks"],
        difficulty: ["difficulty", "level", "difficultylevel"],
        description: ["description", "summary", "problemdescription", "prompt", "problemstatement", "statement", "notes"],
        constraints: ["constraints", "boundary", "limits"],
        input_format: ["inputformat", "input_format", "inputstructure"],
        output_format: ["outputformat", "output_format", "expectedoutputformat"],
        optionA: ["optiona", "opta", "opt1", "choicea", "choice1"],
        optionB: ["optionb", "optb", "opt2", "choiceb", "choice2"],
        optionC: ["optionc", "optc", "opt3", "choicec", "choice3"],
        optionD: ["optiond", "optd", "opt4", "choiced", "choice4"],
        correctOption: ["correctoption", "correctanswer", "correct", "answer", "key"],
        explanation: ["explanation", "solution", "reasoning"],
        testcase_1_input: ["testcase1input", "testcase1", "testcase1in", "tc1input"],
        testcase_1_output: ["testcase1output", "testcase1expectedoutput", "testcase1expected", "tc1output"],
        testcase_2_input: ["testcase2input", "testcase2", "tc2input"],
        testcase_2_output: ["testcase2output", "testcase2expectedoutput", "tc2output"],
        hidden_testcase_input: ["hiddentestcaseinput", "hiddentestcase1input", "hiddeninput"],
        hidden_testcase_output: ["hiddentestcaseoutput", "hiddentestcase1output", "hiddenoutput"],
        starterCode: ["startercode", "startercodeboilerplate", "boilerplate", "template", "starter"],
      };

      const columnMapping: Record<string, ColumnDefinition> = {};
      config.columns.forEach((col) => {
        columnMapping[cleanHeader(col.label)] = col;
        columnMapping[cleanHeader(col.key)] = col;
        const aliases = HEADER_ALIASES[col.key] || [];
        aliases.forEach((alias) => {
          columnMapping[cleanHeader(alias)] = col;
        });
      });

      const results: ParsedRowResult[] = rawRows.map((row, idx) => {
        const rowNumber = idx + 2;
        const mappedRow: Record<string, any> = {};
        const errors: RowValidationError[] = [];

        Object.keys(row).forEach((rawHeader) => {
          const cleaned = cleanHeader(rawHeader);
          const matchedCol = columnMapping[cleaned];
          if (matchedCol) {
            mappedRow[matchedCol.key] = row[rawHeader];
          }
        });

        if (mappedRow.moduleName && !mappedRow.subModuleName) {
          mappedRow.subModuleName = mappedRow.moduleName;
        }
        if (mappedRow.subModuleName && !mappedRow.moduleName) {
          mappedRow.moduleName = mappedRow.subModuleName;
        }
        if (mappedRow.section && !mappedRow.sectionName) {
          mappedRow.sectionName = mappedRow.section;
        }
        if (mappedRow.sectionName && !mappedRow.section) {
          mappedRow.section = mappedRow.sectionName;
        }

        config.columns.forEach((col) => {
          const val = mappedRow[col.key];
          const isBlank = val === undefined || val === null || String(val).trim() === "";

          if (col.required && isBlank) {
            errors.push({
              fieldKey: col.key,
              fieldLabel: col.label,
              message: `${col.label} is required (Row #${rowNumber}).`,
            });
            return;
          }

          if (!isBlank) {
            if (col.type === "enum" && col.options) {
              const matchedOption = col.options.find(
                (opt) => opt.toLowerCase() === String(val).trim().toLowerCase()
              );
              if (!matchedOption) {
                errors.push({
                  fieldKey: col.key,
                  fieldLabel: col.label,
                  message: `Invalid ${col.label}: '${val}'. Allowed: [${col.options.join(", ")}].`,
                });
              } else {
                mappedRow[col.key] = matchedOption;
              }
            }

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
          description: `${validCount} records ready for import.`,
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

      const reportHeaders = [
        "Row Number",
        "Error Field",
        "Error Description",
        ...config.columns.map((c) => c.label),
      ];

      const reportData: any[][] = [];
      invalidRows.forEach((item) => {
        item.errors.forEach((err) => {
          const rowValues = config.columns.map((c) => item.rawRow[c.key] || "");
          reportData.push([item.rowNumber, err.fieldLabel, err.message, ...rowValues]);
        });
      });

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([reportHeaders, ...reportData]);
      ws["!cols"] = [
        { wch: 12 },
        { wch: 22 },
        { wch: 45 },
        ...config.columns.map(() => ({ wch: 20 })),
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Errors");
      XLSX.writeFile(wb, `bulk_upload_errors_${config.moduleType}_report.xlsx`);

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

  // ─── 3.5. GROUPED CONTAINERS COMPUTATION (FOR 1 PARENT -> MANY CHILDREN) ────
  const groupedModules = useMemo(() => {
    if (!config.groupByField) return [];
    const groupKeyName = config.groupByField;
    const map = new Map<
      string,
      {
        groupKey: string;
        validRows: ParsedRowResult[];
        allRows: ParsedRowResult[];
        duplicateTitles: string[];
      }
    >();

    parsedRows.forEach((r) => {
      const rawVal =
        r.rawRow.sectionName ??
        r.rawRow.subModuleName ??
        r.rawRow[groupKeyName] ??
        r.rawRow.moduleName;
      const key = String(rawVal ?? "").trim() || "General Section";
      if (!map.has(key)) {
        map.set(key, { groupKey: key, validRows: [], allRows: [], duplicateTitles: [] });
      }
      const entry = map.get(key)!;
      entry.allRows.push(r);
      if (r.isValid) {
        entry.validRows.push(r);
      }
    });

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

  const totalDuplicatesCount = useMemo(() => {
    return groupedModules.reduce((acc, g) => acc + g.duplicateTitles.length, 0);
  }, [groupedModules]);

  // ─── 4. FINAL IMPORT EXECUTION ──────────────────────────────────────────────
  const handleConfirmImport = (importOnlyValid: boolean = false) => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast({
        title: "No Valid Records",
        description: "There are no valid records to import. Please correct the errors in the file.",
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
        ? `Imported ${payload.length} container(s) containing ${validRows.length} item(s).`
        : `Imported ${payload.length} items for ${moduleTitle || config.displayName}.`,
    });

    handleModalClose();
  };

  const totalCount = parsedRows.length;
  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = totalCount - validCount;

  const displayedRows = parsedRows.filter((r) => {
    if (previewFilter === "valid") return r.isValid;
    if (previewFilter === "invalid") return !r.isValid;
    return true;
  });

  // ─── CONTENT BODY (STRICTLY NO ICONS) ───────────────────────────────────────
  const contentBody = (
    <div className="space-y-6">
      {/* STEP 1: TEMPLATE DOWNLOAD & FILE UPLOAD */}
      {currentStep === "upload" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-slate-100">
                Bulk Upload Configuration for {config.displayName}
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Download the customized template below. Fill in the data while maintaining parent-child groupings, then upload your completed spreadsheet.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Step 1: Customize & Download Template
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  ({activeColumns.length} of {config.columns.length} columns active for export)
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownloadTemplate("csv")}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  Download CSV
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
                >
                  Download Excel ({activeColumns.length} Columns)
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 block">
                    Available Template Columns:
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Click any optional column button to include or exclude it from the download.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={selectAllColumns}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Include All ({config.columns.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={selectRequiredOnly}
                    className="text-[11px] font-bold text-slate-600 hover:underline cursor-pointer"
                  >
                    Required Only ({config.columns.filter((c) => c.required).length})
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {config.columns.map((col) => {
                  const isIncluded = col.required || selectedColumnKeys.includes(col.key);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleColumn(col.key)}
                      disabled={col.required}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                        col.required
                          ? "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 cursor-default"
                          : isIncluded
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-600 cursor-pointer"
                          : "bg-slate-50/50 dark:bg-zinc-900/30 border-dashed border-slate-300 dark:border-zinc-700 text-slate-400 hover:border-blue-400 hover:text-blue-600 cursor-pointer"
                      }`}
                    >
                      <span>{col.label}</span>
                      {col.required ? (
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      ) : isIncluded ? (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          Excluded
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Step 2: Upload Completed Spreadsheet
            </h4>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-400/50 hover:border-blue-600 bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50/60 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
                Select File
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Click to Browse or Drag & Drop Spreadsheet
                </p>
                <p className="text-xs text-slate-500">
                  Accepts Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                </p>
              </div>
              {isProcessing && (
                <div className="text-xs font-bold text-blue-600 pt-2">
                  Parsing and validating spreadsheet data...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & VALIDATION RESULTS */}
      {currentStep === "preview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                {config.groupByField ? "Total Containers" : "Total Records"}
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {config.groupByField ? groupedModules.length : totalCount}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {config.groupByField ? `${validCount} valid items` : "Processed rows"}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Valid Records
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {validCount}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Ready for import
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${
              totalDuplicatesCount > 0
                ? "border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700"
                : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-500"
            }`}>
              <p className="text-[11px] font-bold uppercase tracking-wider">
                Duplicates Detected
              </p>
              <p className="text-2xl font-bold mt-1">
                {totalDuplicatesCount}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Duplicate titles in container
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${
              invalidCount > 0
                ? "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 text-red-700"
                : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-500"
            }`}>
              <p className="text-[11px] font-bold uppercase tracking-wider">
                Invalid / Errors
              </p>
              <p className="text-2xl font-bold mt-1">
                {invalidCount}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Row-level issues
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {config.groupByField && (
                <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode("modules")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewViewMode === "modules"
                        ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    Grouped Container View ({groupedModules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode("table")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      previewViewMode === "table"
                        ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    Raw Table View ({totalCount})
                  </button>
                </div>
              )}

              <Tabs value={previewFilter} onValueChange={(v) => setPreviewFilter(v as any)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs font-semibold">
                    All ({totalCount})
                  </TabsTrigger>
                  <TabsTrigger value="valid" className="text-xs font-semibold text-emerald-600">
                    Valid ({validCount})
                  </TabsTrigger>
                  <TabsTrigger value="invalid" className="text-xs font-semibold text-red-600">
                    Invalid ({invalidCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {invalidCount > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadErrorReport}
                className="h-9 text-xs font-semibold text-red-600 border-red-300 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
              >
                Download Error Report (.xlsx)
              </Button>
            )}
          </div>

          {config.groupByField && previewViewMode === "modules" ? (
            <div className="space-y-4">
              {groupedModules.map((mod, mIdx) => {
                const isExpanded = expandedModuleKeys[mod.groupKey] !== false;
                const hasDupes = mod.duplicateTitles.length > 0;
                const modValidCount = mod.validRows.length;
                const modTotalCount = mod.allRows.length;

                return (
                  <Card
                    key={mod.groupKey}
                    className="border-2 border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] rounded-2xl shadow-xs overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900 uppercase">
                            CONTAINER {mIdx + 1}
                          </span>
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                            {mod.groupKey}
                          </h4>
                          <Badge className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            {modValidCount} {modValidCount === 1 ? "Item" : "Items"}
                          </Badge>
                          {modTotalCount > modValidCount && (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                              {modTotalCount - modValidCount} Invalid
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Group {mIdx + 1} of {groupedModules.length} • {modValidCount} questions mapped to this container
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedModuleKeys((prev) => ({
                              ...prev,
                              [mod.groupKey]: !isExpanded,
                            }))
                          }
                          className="h-8 text-xs font-semibold rounded-xl border-slate-300 dark:border-zinc-700"
                        >
                          {isExpanded ? "Collapse" : "View Questions"}
                        </Button>
                      </div>
                    </div>

                    {hasDupes && (
                      <div className="p-3 mx-4 mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                        Duplicate titles detected in this container: <strong>{mod.duplicateTitles.join(", ")}</strong>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-2 bg-slate-50/30 dark:bg-zinc-900/30">
                        <div className="divide-y divide-slate-200 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#18181B]">
                          {mod.allRows.map((r, qIdx) => {
                            const qTitle = String(r.rawRow.title || `Item ${qIdx + 1}`).trim();
                            const qDiff = r.rawRow.difficulty || "Easy";
                            const qType = r.rawRow.type || "coding";
                            const marks = r.rawRow.marks || r.rawRow.totalMarks || 10;

                            return (
                              <div
                                key={r.rowNumber}
                                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                                  !r.isValid
                                    ? "bg-red-50/50 dark:bg-red-950/20"
                                    : "hover:bg-slate-50 dark:hover:bg-zinc-900/50"
                                }`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 dark:border-blue-900">
                                    {qIdx + 1}
                                  </span>
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                                        {qTitle}
                                      </p>
                                      <Badge variant="outline" className="text-[10px] font-semibold">
                                        {qDiff}
                                      </Badge>
                                      <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] uppercase font-bold">
                                        {qType}
                                      </Badge>
                                      <span className="text-[10px] font-semibold text-blue-600">
                                        {marks} Marks
                                      </span>
                                    </div>
                                    {!r.isValid && (
                                      <p className="text-[11px] text-red-600 font-medium">
                                        Row #{r.rowNumber}: {r.errors.map((e) => e.message).join(", ")}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 self-end sm:self-center">
                                  {r.isValid ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                      Valid
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
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

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Import Summary
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Total Containers:</strong> {groupedModules.length} &nbsp;|&nbsp; <strong>Total Questions:</strong> {validCount} &nbsp;|&nbsp; <strong>Duplicates:</strong> {totalDuplicatesCount}
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#18181B]">
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 z-10">
                    <tr>
                      <th className="p-3 font-bold text-slate-600 w-16 text-center">Row</th>
                      <th className="p-3 font-bold text-slate-600 w-24">Status</th>
                      {config.columns.map((col) => (
                        <th key={col.key} className="p-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={config.columns.length + 2} className="p-8 text-center text-xs text-slate-500">
                          No records matching the selected filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((rowItem) => (
                        <tr
                          key={rowItem.rowNumber}
                          className={`hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors ${
                            !rowItem.isValid ? "bg-red-50/50 dark:bg-red-950/20" : ""
                          }`}
                        >
                          <td className="p-3 text-center font-mono font-bold text-slate-500">
                            #{rowItem.rowNumber}
                          </td>
                          <td className="p-3">
                            {rowItem.isValid ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Valid
                              </Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
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
                                    <span className="text-red-600 font-bold line-through">
                                      {cellVal !== undefined && cellVal !== "" ? String(cellVal) : "(Empty)"}
                                    </span>
                                    <p className="text-[10px] text-red-600 font-medium leading-tight whitespace-normal">
                                      {cellErr.message}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-slate-900 dark:text-slate-100">
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

  // FOOTER ACTIONS (TEXT ONLY, STRICTLY NO ICONS)
  const footerActions = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      {currentStep === "preview" ? (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep("upload")}
            className="h-10 text-xs font-semibold rounded-xl"
          >
            Re-Upload Different File
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
                className="h-10 px-4 text-xs font-semibold border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl"
              >
                Import {validCount} Valid Only
              </Button>
            )}

            <Button
              type="button"
              onClick={() => handleConfirmImport(false)}
              disabled={validCount === 0}
              className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
            >
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

  // ─── 1. INLINE CARD MODE ───────────────────────────────────────────────────
  if (inline) {
    return (
      <Card id="bulk-upload-card-section" className="bg-white dark:bg-[#18181B] border-2 border-blue-600 rounded-2xl shadow-md space-y-6 p-6 sm:p-7 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-900 uppercase">
                Bulk Import Engine
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {moduleTitle ? `Bulk Upload — ${moduleTitle}` : `Bulk Upload — ${config.displayName}`}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Target Module: <span className="font-semibold text-slate-900 dark:text-slate-100">{config.displayName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCurrentStep("upload")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStep === "upload" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                1. Upload & Validate
              </button>
              <span className="text-slate-300">/</span>
              <button
                type="button"
                onClick={() => {
                  if (parsedRows.length > 0) {
                    setCurrentStep("preview");
                  } else {
                    toast({
                      title: "Upload Required",
                      description: "Please upload a spreadsheet first to preview records.",
                    });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStep === "preview"
                    ? "bg-blue-600 text-white shadow-xs"
                    : parsedRows.length > 0
                    ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    : "text-slate-400"
                }`}
              >
                2. Preview & Import {parsedRows.length > 0 && `(${parsedRows.length})`}
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleModalClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Cancel
            </Button>
          </div>
        </div>

        {contentBody}

        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800">
          {footerActions}
        </div>
      </Card>
    );
  }

  // ─── 2. MODAL DIALOG MODE (PORTAL) ─────────────────────────────────────────
  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl h-[88vh] max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0 bg-slate-50/90 dark:bg-zinc-900/80 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-900 uppercase">
                Bulk Import
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {moduleTitle ? `Bulk Upload — ${moduleTitle}` : `Bulk Upload — ${config.displayName}`}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Target: <span className="font-semibold text-slate-900 dark:text-slate-100">{config.displayName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCurrentStep("upload")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStep === "upload" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                1. Upload & Validate
              </button>
              <span className="text-slate-300">/</span>
              <button
                type="button"
                onClick={() => {
                  if (parsedRows.length > 0) {
                    setCurrentStep("preview");
                  } else {
                    toast({
                      title: "Upload Required",
                      description: "Please upload a spreadsheet first to preview records.",
                    });
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentStep === "preview"
                    ? "bg-blue-600 text-white shadow-xs"
                    : parsedRows.length > 0
                    ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    : "text-slate-400"
                }`}
              >
                2. Preview & Import {parsedRows.length > 0 && `(${parsedRows.length})`}
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleModalClose}
              className="h-8 px-3 text-xs font-semibold rounded-lg text-slate-600"
            >
              Close
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {contentBody}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-zinc-800 shrink-0 bg-slate-50/90 dark:bg-zinc-900/80">
          {footerActions}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
