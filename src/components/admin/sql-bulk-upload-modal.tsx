"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Database,
  Table as TableIcon,
  HelpCircle,
  Layers,
  ChevronRight,
  Eye,
  X,
  Loader2,
  RefreshCw,
  FileText,
  FileCode,
  Code2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { downloadUniversalSqlExcelTemplate, downloadUniversalSqlCsvTemplate } from "@/lib/sql/template-generator";
import { parseSqlBulkSpreadsheet, type SqlImportResult, type SqlImportRowError } from "@/lib/sql/bulk-parser";
import type { CodingProblem, SQLTableSchema } from "@/types/coding";
import { CodingProblemsService } from "@/services/coding-problems.service";

export interface SqlBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (importedCount?: number) => void;
  targetModuleId?: string;
  targetTrackId?: string;
  targetSubmoduleId?: string;
  onSwitchToProgramming?: () => void;
}

export function SqlBulkUploadModal({
  isOpen,
  onClose,
  onSuccess,
  targetModuleId,
  targetTrackId,
  targetSubmoduleId,
  onSwitchToProgramming,
}: SqlBulkUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<SqlImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "errors">("preview");
  const [previewProblem, setPreviewProblem] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsParsing(false);
    setParseResult(null);
    setActiveTab("preview");
    setPreviewProblem(null);
    setIsImporting(false);
    setImportProgress(0);
  };

  const handleClose = () => {
    if (isImporting) return;
    resetState();
    onClose();
  };

  // Download 9-sheet Excel Template
  const handleDownloadExcel = async () => {
    try {
      await downloadUniversalSqlExcelTemplate();
      toast.success("Universal 9-Sheet SQL Excel Template downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download Excel template.");
    }
  };

  // Download CSV Template
  const handleDownloadCsv = async () => {
    try {
      await downloadUniversalSqlCsvTemplate();
      toast.success("SQL CSV Template downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download CSV template.");
    }
  };

  // Handle File Selection & Parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);
    setPreviewProblem(null);

    try {
      const res = await parseSqlBulkSpreadsheet(file);
      setParseResult(res);
      if (res.validQuestions.length > 0) {
        setPreviewProblem(res.validQuestions[0]);
        toast.success(`Successfully parsed ${res.validQuestions.length} SQL questions from spreadsheet.`);
      } else {
        setActiveTab("errors");
        toast.error("No valid questions found. Please check row errors below.");
      }
    } catch (err: any) {
      console.error("Spreadsheet parse error:", err);
      toast.error(err?.message || "Failed to parse spreadsheet.");
    } finally {
      setIsParsing(false);
    }
  };

  // Import Action
  const handleExecuteImport = async (status: "draft" | "published") => {
    if (!parseResult || parseResult.validQuestions.length === 0) return;

    setIsImporting(true);
    setImportProgress(10);

    const questionsToSave = parseResult.validQuestions.map((q) => ({
      ...q,
      status,
      module_id: (q as any).module_id || targetModuleId || undefined,
      track_id: (q as any).track_id || targetTrackId || undefined,
      submodule_id: (q as any).submodule_id || targetSubmoduleId || undefined,
      starter_code: {
        ...(typeof q.starter_code === "object" ? q.starter_code : {}),
        module_id: (q as any).module_id || targetModuleId || undefined,
        track_id: (q as any).track_id || targetTrackId || undefined,
        submodule_id: (q as any).submodule_id || targetSubmoduleId || undefined,
      },
    }));

    try {
      setImportProgress(40);
      await CodingProblemsService.saveProblems(questionsToSave as CodingProblem[]);
      setImportProgress(100);

      toast.success(
        `Successfully imported ${questionsToSave.length} SQL questions as ${status === "published" ? "Published" : "Draft"}!`
      );

      if (onSuccess) {
        onSuccess(questionsToSave.length);
      }
      handleClose();
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err?.message || "Failed to import SQL questions to database.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false} className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl shadow-xl">
        {/* Bulk Upload Top Header: Type Switcher & Aligned Close Button */}
        <div className="px-3.5 sm:px-6 py-2.5 bg-slate-50/90 dark:bg-[#141416] border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between gap-3 shrink-0">
          {onSwitchToProgramming ? (
            <div className="inline-flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-200/70 dark:bg-zinc-800 rounded-xl min-w-0 max-w-[calc(100%-44px)] sm:max-w-none">
              <button
                type="button"
                onClick={onSwitchToProgramming}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap min-w-0"
              >
                <Code2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden sm:inline">Programming Questions</span>
                <span className="sm:hidden">Programming</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs whitespace-nowrap min-w-0"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>SQL Questions</span>
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              Bulk Import Engine
            </div>
          )}

          {/* Perfectly Aligned Modal Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-zinc-800 cursor-pointer shrink-0 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Header: Title, Description, and Template Action Buttons */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shrink-0 bg-slate-50/50 dark:bg-[#141416]">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 sm:mt-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>SQL Question Bulk Upload & Template Engine</span>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-mono shrink-0">
                  Multi-Sheet v2.0
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Upload 50, 100, or 200+ SQL questions with visual tables, sample records, and multi-database test cases.
              </DialogDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              className="h-8.5 gap-1.5 text-xs font-semibold rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50 w-full sm:w-auto truncate cursor-pointer"
              title="Download full 9-Sheet Universal Excel Template"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Download Excel</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              className="h-8.5 gap-1.5 text-xs font-semibold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 w-full sm:w-auto cursor-pointer"
              title="Download flat CSV Template"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>CSV Template</span>
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-12 sm:pb-8 space-y-6">
          {/* File Upload Zone */}
          {!parseResult && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                  "border-slate-200 dark:border-[#27272A] hover:border-blue-400 hover:bg-blue-50/20 dark:hover:bg-blue-950/10",
                  isParsing && "opacity-60 pointer-events-none"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                  {isParsing ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                </div>

                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {isParsing ? "Analyzing & Validating 9 Sheets..." : "Drag and drop your SQL Workbook here, or browse"}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md">
                  Accepts Universal Excel (.xlsx) and CSV (.csv). Up to 10 MB and 5,000 rows.
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] text-slate-600">
                  <span className="bg-slate-100 dark:bg-[#27272A] px-2 py-0.5 rounded">Questions</span>
                  <span className="bg-slate-100 dark:bg-[#27272A] px-2 py-0.5 rounded">Database_Config</span>
                  <span className="bg-slate-100 dark:bg-[#27272A] px-2 py-0.5 rounded">Table_Schema</span>
                  <span className="bg-slate-100 dark:bg-[#27272A] px-2 py-0.5 rounded">Sample_Data</span>
                  <span className="bg-slate-100 dark:bg-[#27272A] px-2 py-0.5 rounded">Expected_Output</span>
                  <span className="bg-slate-100 dark:bg-[#27272A] px-2 py-0.5 rounded">Test_Cases</span>
                  <span className="bg-slate-100 dark:bg-[#27272A] px-2 py-0.5 rounded">Solutions</span>
                </div>
              </div>

              {/* Universal Template Info Card */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-200">
                    Enterprise Relational Spreadsheet Architecture
                  </p>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    Sensilearn LMS links all 9 sheets using <strong>Question_ID</strong>. Table schemas, column constraints,
                    sample records, expected results, and test cases are joined automatically without manual SQL scripting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validation & Preview Result */}
          {parseResult && (
            <div className="space-y-5">
              {/* Summary Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#141416]">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Total Questions</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {parseResult.summary.totalQuestions}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Valid Ready</p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {parseResult.summary.validCount}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">Errors</p>
                  <p className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
                    {parseResult.summary.errorCount}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">Warnings</p>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
                    {parseResult.summary.warningCount}
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#27272A] pb-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                      activeTab === "preview"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valid Questions ({parseResult.validQuestions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("errors")}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                      activeTab === "errors"
                        ? "bg-rose-600 text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                      parseResult.errors.length === 0 && "opacity-50"
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Errors & Warnings ({parseResult.errors.length})
                  </button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  className="h-7 text-xs text-slate-500 hover:text-slate-800 gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Re-upload File
                </Button>
              </div>

              {/* Tab 1: Valid Questions List & Detailed Drawer */}
              {activeTab === "preview" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Question List (5 cols) */}
                  <div className="lg:col-span-5 border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden flex flex-col max-h-[380px]">
                    <div className="p-2.5 bg-slate-50 dark:bg-[#141416] border-b border-slate-200 dark:border-[#27272A] text-[11px] font-bold text-slate-600">
                      Parsed Questions
                    </div>
                    <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-[#27272A]">
                      {parseResult.validQuestions.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => setPreviewProblem(q)}
                          className={cn(
                            "p-3 cursor-pointer text-left transition-colors text-xs space-y-1",
                            previewProblem?.id === q.id
                              ? "bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600"
                              : "hover:bg-slate-50 dark:hover:bg-[#1f1f23]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {q.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] uppercase font-bold",
                                q.difficulty === "easy"
                                  ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                                  : q.difficulty === "hard"
                                  ? "text-rose-700 border-rose-200 bg-rose-50"
                                  : "text-amber-700 border-amber-200 bg-amber-50"
                              )}
                            >
                              {q.difficulty}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span className="uppercase text-blue-600 font-semibold">{q.sql_engine}</span>
                            <span>•</span>
                            <span>{q.rawTables?.length || 0} table(s)</span>
                            <span>•</span>
                            <span>{q.test_cases?.length || 0} testcase(s)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Question Detail Preview (7 cols) */}
                  <div className="lg:col-span-7 border border-slate-200 dark:border-[#27272A] rounded-xl p-4 overflow-y-auto max-h-[380px] bg-slate-50/30 dark:bg-[#121214] space-y-4">
                    {previewProblem ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {previewProblem.title}
                            </h3>
                            <Badge className="bg-blue-600 text-white text-[10px] uppercase font-mono">
                              {previewProblem.sql_engine}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
                            {previewProblem.description}
                          </p>
                        </div>

                        {/* Database Tables Schema */}
                        {previewProblem.rawTables && previewProblem.rawTables.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                              <TableIcon className="w-3.5 h-3.5 text-blue-600" />
                              Tables ({previewProblem.rawTables.length})
                            </span>
                            <div className="space-y-2">
                              {previewProblem.rawTables.map((tbl: SQLTableSchema) => (
                                <div
                                  key={tbl.name}
                                  className="p-2.5 rounded-lg border border-slate-200 bg-white dark:bg-[#18181B] text-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                                    <span>{tbl.name}</span>
                                    <span className="text-[10px] text-slate-500">
                                      {tbl.columns.length} columns • {tbl.rows.length} sample records
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 text-[10px] font-mono text-slate-600">
                                    {tbl.columns.map((c) => (
                                      <span
                                        key={c.name}
                                        className="bg-slate-100 dark:bg-[#27272A] px-1.5 py-0.5 rounded flex items-center gap-1"
                                      >
                                        {c.isPrimary && <span className="text-amber-500 font-bold">PK</span>}
                                        {c.name} ({c.type})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Generated SQL DDL & DML preview */}
                        {previewProblem.schema_sql && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-slate-500" /> Auto-Generated DDL & DML
                            </span>
                            <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-32">
                              {previewProblem.schema_sql}
                              {"\n\n"}
                              {previewProblem.seed_sql}
                            </pre>
                          </div>
                        )}

                        {/* Test Cases Count */}
                        <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                          <span>Test Cases Configured</span>
                          <span className="font-bold font-mono">
                            {previewProblem.test_cases?.length || 0} cases ({previewProblem.comparison_mode})
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Select a question to inspect details
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Errors & Warnings List */}
              {activeTab === "errors" && (
                <div className="border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                  {parseResult.errors.length > 0 ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-[#141416] text-[11px] font-bold text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Severity</th>
                          <th className="p-2.5">Sheet</th>
                          <th className="p-2.5">Row</th>
                          <th className="p-2.5">Question ID</th>
                          <th className="p-2.5">Column</th>
                          <th className="p-2.5">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parseResult.errors.map((err, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-2.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] uppercase font-bold",
                                  err.severity === "error"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                )}
                              >
                                {err.severity}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-medium">{err.sheet}</td>
                            <td className="p-2.5 font-mono">{err.row}</td>
                            <td className="p-2.5 font-mono text-blue-600">{err.questionId || "—"}</td>
                            <td className="p-2.5 font-mono">{err.column || "—"}</td>
                            <td className="p-2.5 text-slate-700">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No errors or warnings found! All parsed rows are clean and valid.
                    </div>
                  )}
                </div>
              )}

              {/* Import Progress Bar */}
              {isImporting && (
                <div className="space-y-1.5 p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex justify-between text-xs font-semibold text-blue-900">
                    <span>Batch Importing Questions to Supabase Database...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#141416] flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
            className="text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>

          {parseResult && parseResult.validQuestions.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isImporting}
                onClick={() => handleExecuteImport("draft")}
                className="text-xs font-semibold rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Save as Draft ({parseResult.validQuestions.length})
              </Button>
              <Button
                type="button"
                disabled={isImporting}
                onClick={() => handleExecuteImport("published")}
                className="text-xs font-semibold rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs"
              >
                {isImporting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...
                  </span>
                ) : (
                  `Publish & Import (${parseResult.validQuestions.length} Questions)`
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
