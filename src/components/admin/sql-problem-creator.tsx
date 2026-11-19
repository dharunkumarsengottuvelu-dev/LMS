"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Database, Plus, Trash2, CheckCircle2, Clock, Play,
  Sparkles, Save, ShieldCheck, Layers, FileText,
  AlertCircle, Check, ChevronRight, Terminal,
  Cpu, HardDrive, HelpCircle, ArrowLeft,
  Maximize2, Minimize2, ShieldAlert, Lock, RefreshCw,
  Upload, FileSpreadsheet, Code2, CheckCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemsService } from "@/services/coding-problems.service";
import type { CodingProblem, TestCase, Difficulty, SQLEngine, SQLComparisonMode, SQLQuestionMode, SQLColumnSchema, SQLTableSchema } from "@/types/coding";
import { PageHeader } from "@/components/layouts/page-header";
import { AutoSaveBadge } from "@/components/ui/auto-save-badge";
import { Switch } from "@/components/ui/switch";

export type ExtendedSQLEngine = SQLEngine | "sqlserver" | "oracle";

export const SQL_ENGINE_DIALECT_MAP: Record<ExtendedSQLEngine, { name: string; dialect: string; version: string }> = {
  mysql: { name: "MySQL", dialect: "MySQL", version: "8.0" },
  postgresql: { name: "PostgreSQL", dialect: "PostgreSQL", version: "15.0" },
  sqlite: { name: "SQLite", dialect: "SQLite", version: "3.40+" },
  sqlserver: { name: "SQL Server", dialect: "T-SQL", version: "2022" },
  oracle: { name: "Oracle", dialect: "Oracle SQL", version: "21c" },
  mariadb: { name: "MariaDB", dialect: "MariaDB", version: "10.11" },
};

export interface SqlProblemCreatorProps {
  onCancel?: () => void;
  onSave?: (problem: CodingProblem) => void;
  onChange?: (data: any) => void;
  onChangeQuestionType?: (type: "programming" | "sql") => void;
  initialProblem?: Partial<CodingProblem> & Record<string, any>;
  hideHeader?: boolean;
  inline?: boolean;
}

export function SqlProblemCreator({
  onCancel,
  onSave,
  onChange,
  onChangeQuestionType,
  initialProblem,
  hideHeader = false,
  inline = false,
}: SqlProblemCreatorProps) {
  const { toast } = useToast();

  // 0. Practice Module Hierarchy State
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(
    initialProblem?.starter_code?.track_id || (initialProblem as any)?.track_id || ""
  );
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState<string>(
    initialProblem?.starter_code?.submodule_id || (initialProblem as any)?.submodule_id || ""
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    initialProblem?.starter_code?.module_id || (initialProblem as any)?.module_id || ""
  );

  // 1. Basic Details State
  const [title, setTitle] = useState(initialProblem?.title || "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialProblem?.difficulty || "easy");
  const [category, setCategory] = useState(initialProblem?.category || "Databases");
  const [subcategory, setSubcategory] = useState("Relational Queries");
  const [tags, setTags] = useState<string[]>(["SQL", "Queries", "Database"]);
  const [tagInput, setTagInput] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(
    typeof (initialProblem as any)?.durationMinutes === "number" && (initialProblem as any).durationMinutes > 0
      ? (initialProblem as any).durationMinutes
      : 30
  );
  const [isDurationEnabled, setIsDurationEnabled] = useState(
    typeof (initialProblem as any)?.durationMinutes === "number"
      ? (initialProblem as any).durationMinutes > 0
      : true
  );
  const [points, setPoints] = useState(initialProblem?.points || 20);
  const [timeLimitMs, setTimeLimitMs] = useState<number>(initialProblem?.time_limit_ms || 3000);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(initialProblem?.memory_limit_mb || 256);
  const [questionStatus, setQuestionStatus] = useState<"draft" | "published">(
    initialProblem?.status === "draft" ? "draft" : "published"
  );

  // Reference Solution & Learning Objectives State
  const [referenceSolution, setReferenceSolution] = useState<string>(
    (initialProblem as any)?.reference_solution ||
      (initialProblem as any)?.solution_code?.sql ||
      initialProblem?.solution_editorial?.approaches?.[0]?.code?.sql ||
      ""
  );
  const [solutionExplanation, setSolutionExplanation] = useState<string>(
    initialProblem?.explanation || initialProblem?.solution_editorial?.overview || ""
  );
  const [learningObjectives, setLearningObjectives] = useState<string>(
    (initialProblem as any)?.learning_objectives || ""
  );

  // Fetch Practice Tracks for hierarchy selection
  useEffect(() => {
    let active = true;
    setIsLoadingTracks(true);
    fetch("/api/admin/practices")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.tracks) ? data.tracks : Array.isArray(data) ? data : [];
        setTracks(list);
      })
      .catch((err) => console.warn("Failed to load tracks in SqlProblemCreator:", err))
      .finally(() => {
        if (active) setIsLoadingTracks(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const submodules = useMemo(() => {
    if (!selectedTrack) return [];
    let sms = selectedTrack.sub_modules || selectedTrack.submodules || [];
    if (!Array.isArray(sms) && selectedTrack.tags && selectedTrack.tags[0]) {
      try { sms = JSON.parse(selectedTrack.tags[0]).subModules || []; } catch {}
    }
    return Array.isArray(sms) ? sms : [];
  }, [selectedTrack]);

  const selectedSubmodule = submodules.find((sm: any) => sm.id === selectedSubmoduleId);
  const practiceModules = useMemo(() => {
    if (!selectedSubmodule) return [];
    return selectedSubmodule.modules || [];
  }, [selectedSubmodule]);

  // 2. Problem Statement State
  const [description, setDescription] = useState(initialProblem?.description || "");
  const [requirements, setRequirements] = useState("");
  const [constraints, setConstraints] = useState(initialProblem?.constraints || "");
  const [expectedBehavior, setExpectedBehavior] = useState("");

  // 3. Mode & Engine Configuration
  const [sqlMode, setSqlMode] = useState<SQLQuestionMode>(initialProblem?.sql_question_mode || "QUERY_ONLY");
  const [sqlEngine, setSqlEngine] = useState<ExtendedSQLEngine>((initialProblem?.sql_engine as ExtendedSQLEngine) || "mysql");
  const [comparisonMode, setComparisonMode] = useState<SQLComparisonMode>(initialProblem?.comparison_mode || "ORDER_SENSITIVE");
  const [databaseSetupMode, setDatabaseSetupMode] = useState<"visual" | "raw">("visual");

  // 4. Mode 1: Table Builder & Sample Data
  const [tables, setTables] = useState<SQLTableSchema[]>([
    {
      name: "",
      columns: [
        { name: "id", type: "INT", isPrimary: true, isNullable: false, defaultValue: "", description: "" },
      ],
      rows: [],
    },
  ]);
  const [activeTableIndex, setActiveTableIndex] = useState(0);

  // Raw DDL & DML
  const [schemaSql, setSchemaSql] = useState(initialProblem?.schema_sql || "");
  const [seedSql, setSeedSql] = useState(initialProblem?.seed_sql || "");

  // 5. Mode 2: Database Requirements State
  const [dbRequirementsText, setDbRequirementsText] = useState(
    (initialProblem as any)?.requirements || ""
  );

  // 6. Dedicated SQL Test Cases
  const [testCases, setTestCases] = useState<
    (TestCase & { name: string; weight: number; comparisonMode: SQLComparisonMode })[]
  >(() => {
    if (initialProblem?.test_cases && initialProblem.test_cases.length > 0) {
      return initialProblem.test_cases.map((tc, idx) => ({
        ...tc,
        name: (tc as any).name || `Test Case ${idx + 1}`,
        weight: (tc as any).weight || Math.round(100 / initialProblem.test_cases!.length),
        comparisonMode: (tc as any).comparisonMode || initialProblem.comparison_mode || "ORDER_SENSITIVE",
      }));
    }
    return [
      {
        id: "sql_tc_1",
        name: "Test Case 1",
        input: "",
        expected_output: "[]",
        is_hidden: false,
        weight: 100,
        comparisonMode: "ORDER_SENSITIVE",
        explanation: "",
      },
    ];
  });

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTable = tables[activeTableIndex] || tables[0];

  // Auto-generate DDL & DML on change
  const syncTablesToDDLAndDML = () => {
    const validTables = tables.filter((t) => t.name && t.name.trim().length > 0 && t.columns.some((c) => c.name.trim().length > 0));
    if (validTables.length === 0) {
      setSchemaSql("");
      setSeedSql("");
      return;
    }

    const ddlStatements = validTables.map((tbl) => {
      const validCols = tbl.columns.filter((c) => c.name.trim().length > 0);
      const colDefs = validCols.map((c) => {
        let def = `    ${c.name} ${c.type}`;
        if (c.isPrimary) def += " PRIMARY KEY";
        if (!c.isNullable && !c.isPrimary) def += " NOT NULL";
        if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
        return def;
      }).join(",\n");
      return `CREATE TABLE ${tbl.name} (\n${colDefs}\n);`;
    }).join("\n\n");

    const dmlStatements = validTables.map((tbl) => {
      if (!tbl.rows || tbl.rows.length === 0) return "";
      const validCols = tbl.columns.filter((c) => c.name.trim().length > 0);
      if (validCols.length === 0) return "";
      const colNames = validCols.map((c) => c.name).join(", ");
      const rowValues = tbl.rows.map((r) => {
        const vals = validCols.map((c) => {
          const rawVal = r[c.name] ?? "";
          if (
            c.type.toUpperCase().includes("INT") ||
            c.type.toUpperCase().includes("DECIMAL") ||
            c.type.toUpperCase().includes("FLOAT") ||
            c.type.toUpperCase().includes("NUMERIC")
          ) {
            return rawVal !== "" ? rawVal : "NULL";
          }
          return `'${String(rawVal).replace(/'/g, "''")}'`;
        }).join(", ");
        return `(${vals})`;
      }).join(",\n");

      return `INSERT INTO ${tbl.name} (${colNames}) VALUES\n${rowValues};`;
    }).filter(Boolean).join("\n\n");

    setSchemaSql(ddlStatements);
    setSeedSql(dmlStatements);
  };

  // Notify parent on change (e.g. practices track builder)
  useEffect(() => {
    if (onChange) {
      onChange({
        title,
        description,
        difficulty,
        category: "Databases",
        questionType: "sql",
        constraints: [
          constraints ? `Constraints:\n${constraints}` : "",
          requirements ? `Requirements:\n${requirements}` : "",
          expectedBehavior ? `Expected Behavior:\n${expectedBehavior}` : "",
        ].filter(Boolean).join("\n\n"),
        inputFormat: `Database Engine: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.name} (${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect})\nMode: ${sqlMode}`,
        outputFormat: `Query Results Table (${comparisonMode.replace(/_/g, " ")})`,
        points,
        templates: {
          sql: `-- Dialect: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect}\n-- Engine: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.name}\nSELECT * FROM ${tables[0]?.name || "table_name"};\n`,
        },
        allowedLanguages: ["sql"],
        allowed_languages: ["sql"],
        defaultLanguage: "sql",
        test_cases: testCases.map((tc) => ({
          id: tc.id,
          input: "",
          expected_output: tc.expected_output,
          is_hidden: tc.is_hidden,
          explanation: tc.explanation,
        })),
        publicTestCases: testCases.filter((tc) => !tc.is_hidden).map((tc) => ({
          id: tc.id,
          input: "",
          expected_output: tc.expected_output,
          is_hidden: false,
        })),
        hiddenTestCases: testCases.filter((tc) => tc.is_hidden).map((tc) => ({
          id: tc.id,
          input: "",
          expected_output: tc.expected_output,
          is_hidden: true,
        })),
        sql_engine: (sqlEngine === "sqlserver" || sqlEngine === "oracle" ? "sqlite" : sqlEngine) as SQLEngine,
        sql_question_mode: sqlMode,
        provide_tables: sqlMode === "QUERY_ONLY",
        schema_sql: sqlMode === "QUERY_ONLY" ? schemaSql : undefined,
        seed_sql: sqlMode === "QUERY_ONLY" ? seedSql : undefined,
        comparison_mode: comparisonMode,
      });
    }
  }, [
    title,
    description,
    difficulty,
    constraints,
    requirements,
    expectedBehavior,
    sqlEngine,
    sqlMode,
    comparisonMode,
    tables,
    schemaSql,
    seedSql,
    testCases,
    points,
    onChange,
  ]);

  useEffect(() => {
    if (databaseSetupMode === "visual") {
      syncTablesToDDLAndDML();
    }
  }, [tables, databaseSetupMode]);

  // CSV Import for Sample Data
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "CSV must have a header row and data rows.", variant: "destructive" });
        return;
      }

      const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const parsedRows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]!.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || "";
        });
        parsedRows.push(rowObj);
      }

      const nextTables = [...tables];
      if (nextTables[activeTableIndex]) {
        nextTables[activeTableIndex]!.rows = parsedRows;
        setTables(nextTables);
        const targetName = nextTables[activeTableIndex]?.name || "table";
        toast({ title: "CSV Imported", description: `Loaded ${parsedRows.length} sample records into ${targetName}.` });
      }
    };
    reader.readAsText(file);
  };

  // Add Column
  const handleAddColumn = () => {
    const nextTables = [...tables];
    if (nextTables[activeTableIndex]) {
      const colNum = nextTables[activeTableIndex]!.columns.length + 1;
      nextTables[activeTableIndex]!.columns.push({
        name: `column_${colNum}`,
        type: "VARCHAR(100)",
        isPrimary: false,
        isNullable: true,
        defaultValue: "",
        description: "",
      });
      setTables(nextTables);
    }
  };

  // Add Sample Row
  const handleAddSampleRow = () => {
    const nextTables = [...tables];
    if (nextTables[activeTableIndex]) {
      const newRow: Record<string, string> = {};
      nextTables[activeTableIndex]!.columns.forEach((c) => {
        newRow[c.name] = "";
      });
      nextTables[activeTableIndex]!.rows.push(newRow);
      setTables(nextTables);
    }
  };

  // Pre-Publish Validation
  const validateBeforePublish = (): boolean => {
    if (!title.trim()) {
      toast({ title: "Title Required", description: "Please specify an SQL question title.", variant: "destructive" });
      return false;
    }
    if (!description.trim()) {
      toast({ title: "Problem Statement Required", description: "Please enter the SQL problem statement.", variant: "destructive" });
      return false;
    }
    if (isDurationEnabled && durationMinutes <= 0) {
      toast({ title: "Invalid Duration", description: "Target duration must be greater than 0 minutes.", variant: "destructive" });
      return false;
    }
    if (points <= 0) {
      toast({ title: "Invalid Points", description: "Problem points must be greater than 0.", variant: "destructive" });
      return false;
    }
    if (testCases.length === 0) {
      toast({ title: "Test Case Required", description: "Please define at least one SQL test case.", variant: "destructive" });
      return false;
    }

    if (sqlMode === "QUERY_ONLY") {
      if (tables.length === 0 || !schemaSql.trim()) {
        toast({ title: "Database Schema Required", description: "Please configure at least one table with columns for Query Only mode.", variant: "destructive" });
        return false;
      }
      for (const tbl of tables) {
        if (!tbl.name.trim()) {
          toast({ title: "Table Name Required", description: "All tables must have a valid name.", variant: "destructive" });
          return false;
        }
        if (tbl.columns.length === 0) {
          toast({ title: "Columns Required", description: `Table '${tbl.name}' must have at least one column.`, variant: "destructive" });
          return false;
        }
      }
    }

    if (sqlMode === "TABLE_CREATION_AND_QUERY") {
      if (!description.includes("CREATE TABLE") && !description.includes("table") && !dbRequirementsText.trim()) {
        toast({
          title: "Requirements Incomplete",
          description: "For Table Creation mode, clearly outline the required tables/columns in the Problem Statement or Requirements.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  // Save / Publish Problem
  const handlePublish = async (isDraft = false) => {
    if (!isDraft && !validateBeforePublish()) return;

    setIsSaving(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const problemId = initialProblem?.id || `sql_${slug || Date.now()}`;

      const problemData: CodingProblem = {
        id: problemId,
        title: title.trim(),
        slug: initialProblem?.slug || slug,
        description: description.trim(),
        difficulty,
        category: "Databases",
        type: "sql",
        topic_tags: tags,
        constraints: [
          constraints ? `Constraints:\n${constraints}` : "",
          requirements ? `Requirements:\n${requirements}` : "",
          expectedBehavior ? `Expected Behavior:\n${expectedBehavior}` : "",
        ].filter(Boolean).join("\n\n"),
        input_format: `Database Engine: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.name} (${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect})\nMode: ${sqlMode}`,
        output_format: `Query Results Table (${comparisonMode.replace(/_/g, " ")})`,
        points: points || 20,
        sample_input: "",
        sample_output: testCases[0]?.expected_output || "",
        templates: {
          sql: referenceSolution
            ? `-- Dialect: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect}\n-- Engine: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.name}\nSELECT * FROM ${tables[0]?.name || "table_name"};\n`
            : `-- Dialect: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect}\nSELECT * FROM ${tables[0]?.name || "table_name"};\n`,
        },
        allowed_languages: ["sql"],
        allowedLanguages: ["sql"],
        default_language: "sql",
        defaultLanguage: "sql",
        test_cases: testCases.map((tc) => ({
          id: tc.id,
          name: tc.name,
          input: "",
          expected_output: tc.expected_output,
          is_hidden: tc.is_hidden,
          weight: tc.weight,
          explanation: tc.explanation,
        })),
        sample_test_cases: testCases.filter((tc) => !tc.is_hidden),
        hidden_test_cases: testCases.filter((tc) => tc.is_hidden),
        sql_engine: (sqlEngine === "sqlserver" || sqlEngine === "oracle" ? "sqlite" : sqlEngine) as SQLEngine,
        sql_question_mode: sqlMode,
        provide_tables: sqlMode === "QUERY_ONLY",
        schema_sql: sqlMode === "QUERY_ONLY" ? schemaSql : undefined,
        seed_sql: sqlMode === "QUERY_ONLY" ? seedSql : undefined,
        comparison_mode: comparisonMode,
        duration_minutes: isDurationEnabled ? durationMinutes : 0,
        time_limit_ms: timeLimitMs || 3000,
        memory_limit_mb: memoryLimitMb || 256,
        status: isDraft ? "draft" : questionStatus,
        explanation: solutionExplanation.trim(),
        solution_editorial: referenceSolution.trim()
          ? {
              overview: solutionExplanation || "Reference solution for this SQL database problem.",
              approaches: [
                {
                  name: `${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.name} Solution`,
                  timeComplexity: "O(N)",
                  spaceComplexity: "O(N)",
                  explanation: solutionExplanation || "Relational query solution.",
                  code: { sql: referenceSolution.trim() },
                },
              ],
            }
          : undefined,
        starter_code: {
          track_id: selectedTrackId || undefined,
          submodule_id: selectedSubmoduleId || undefined,
          module_id: selectedModuleId || undefined,
          learning_objectives: learningObjectives || undefined,
          sql_engine: sqlEngine,
          tables,
          reference_query: referenceSolution,
        },
        created_at: initialProblem?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await CodingProblemsService.saveProblem(problemData);

      if (onSave) {
        onSave(problemData);
      }

      toast({
        title: isDraft ? "Draft Saved" : "SQL Question Published",
        description: `Successfully ${isDraft ? "saved draft for" : "published"} '${title}'.`,
      });
    } catch (err: any) {
      toast({ title: "Failed to Save Problem", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      {!hideHeader && (
        <PageHeader
          title={initialProblem?.id ? `Edit SQL Question: ${title || initialProblem.title}` : "SQL Question Builder"}
          badge={
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                questionStatus === "published"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                  : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
              }`}
            >
              {initialProblem?.id ? questionStatus : `New ${questionStatus}`}
            </span>
          }
          backAction={
            onCancel
              ? {
                  label: "Back to Question Bank",
                  onClick: onCancel,
                }
              : undefined
          }
          actions={
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {onChangeQuestionType && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onChangeQuestionType("programming")}
                  className="h-9 px-3 sm:px-3.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-xs cursor-pointer gap-1.5"
                >
                  <Code2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="hidden sm:inline">Switch to Programming Question</span>
                  <span className="sm:hidden">Switch to Code</span>
                </Button>
              )}
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="h-9 px-3.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                onClick={() => handlePublish(false)}
                disabled={isSaving}
                className="h-9 px-4 text-xs font-semibold rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs cursor-pointer"
              >
                {isSaving ? "Publishing..." : "Publish SQL Question"}
              </Button>
            </div>
          }
        />
      )}

      {/* SECTION 0: PRACTICE HIERARCHY SELECTOR */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
              <Layers className="h-4 w-4" /> 0. Curriculum Hierarchy Association
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Link question to Main Module → Submodule → Practice Module hierarchy
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-mono">
            3-Level Hierarchy
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Module */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
              Main Module (Track)
            </label>
            <Select
              value={selectedTrackId}
              onValueChange={(val) => {
                setSelectedTrackId(val || "");
                setSelectedSubmoduleId("");
                setSelectedModuleId("");
              }}
            >
              <SelectTrigger className="h-10 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder={isLoadingTracks ? "Loading tracks..." : "Select Main Module"} />
              </SelectTrigger>
              <SelectContent>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title || t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submodule */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
              Submodule (Section)
            </label>
            <Select
              value={selectedSubmoduleId}
              onValueChange={(val) => {
                setSelectedSubmoduleId(val || "");
                setSelectedModuleId("");
              }}
              disabled={!selectedTrackId || submodules.length === 0}
            >
              <SelectTrigger className="h-10 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder={selectedTrackId ? (submodules.length === 0 ? "No Submodules" : "Select Submodule") : "Select Main Module First"} />
              </SelectTrigger>
              <SelectContent>
                {submodules.map((sm: any) => (
                  <SelectItem key={sm.id} value={sm.id}>
                    {sm.name || sm.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Practice Module */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
              Practice Module
            </label>
            <Select
              value={selectedModuleId}
              onValueChange={(val) => setSelectedModuleId(val || "")}
              disabled={!selectedSubmoduleId || practiceModules.length === 0}
            >
              <SelectTrigger className="h-10 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue placeholder={selectedSubmoduleId ? (practiceModules.length === 0 ? "No Practice Modules" : "Select Module") : "Select Submodule First"} />
              </SelectTrigger>
              <SelectContent>
                {practiceModules.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* SECTION 1: SQL QUESTION DETAILS */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
              <Database className="h-4 w-4" /> 1. SQL Question Details
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">Define core metadata, difficulty, duration, and assessment points</p>
          </div>
          <Badge className="bg-[#2563EB] text-white text-[10px] uppercase font-bold">SQL Database Question</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">SQL Question Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Find High-Earning Employees in Engineering"
              className="h-10 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Difficulty Level *</label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger className="h-10 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy (Single Table / Filtering)</SelectItem>
                <SelectItem value="medium">Medium (Joins / Aggregations / Subqueries)</SelectItem>
                <SelectItem value="hard">Hard (Window Functions / CTEs / Recursive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Category</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Target Duration (Minutes) {isDurationEnabled && "*"}
              </label>
              <Switch checked={isDurationEnabled} onCheckedChange={setIsDurationEnabled} />
            </div>
            {isDurationEnabled ? (
              <Input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                placeholder="e.g. 30"
                className="h-9 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            ) : (
              <div className="h-9 px-3 rounded-xl bg-[#F9FAFB]/60 dark:bg-[#09090B]/60 border border-dashed border-[#E5E7EB] dark:border-[#27272A] flex items-center text-xs text-muted-foreground font-medium">
                No Time Limit (Unlimited)
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Total Problem Points *</label>
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
              className="h-9 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-[#E5E7EB] dark:border-[#27272A]">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Question Status</label>
            <Select value={questionStatus} onValueChange={(v) => setQuestionStatus(v as any)}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published (Available immediately)</SelectItem>
                <SelectItem value="draft">Draft (Saved for review)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Execution Time Limit (ms)</label>
            <Input
              type="number"
              step={500}
              min={1000}
              max={15000}
              value={timeLimitMs}
              onChange={(e) => setTimeLimitMs(parseInt(e.target.value, 10) || 3000)}
              className="h-9 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Memory Limit (MB)</label>
            <Input
              type="number"
              step={64}
              min={64}
              max={1024}
              value={memoryLimitMb}
              onChange={(e) => setMemoryLimitMb(parseInt(e.target.value, 10) || 256)}
              className="h-9 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>
        </div>
      </Card>

      {/* SECTION 2: SQL PROBLEM STATEMENT */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
        <div className="border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
            <FileText className="h-4 w-4" /> 2. Problem Statement & Requirements
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">Author the problem specification, table requirements, and expected query behavior</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Statement *</label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Given an employees table, write an SQL query to find all employees whose salary is greater than the average salary of all employees. Display employee id, name, and salary sorted by salary in descending order."
              className="text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Constraints / Query Rules</label>
              <Textarea
                rows={3}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="e.g. Must not use hardcoded values. Handle NULL department values gracefully."
                className="text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Expected Output & Sorting Behavior</label>
              <Textarea
                rows={3}
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="e.g. Columns: (id, name, salary). Sort order: ORDER BY salary DESC."
                className="text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 3: SQL QUESTION MODE & DATABASE ENGINE */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
        <div className="border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
            <Cpu className="h-4 w-4" /> 3. SQL Question Mode & Database Engine
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">Select operational execution mode, target database engine, and associated SQL dialect</p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setSqlMode("QUERY_ONLY")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-1.5 ${
              sqlMode === "QUERY_ONLY"
                ? "border-[#2563EB] bg-blue-50/20 dark:bg-blue-950/20 shadow-xs"
                : "border-[#E5E7EB] dark:border-[#27272A] hover:border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">MODE 1: QUERY_ONLY</span>
              <input type="radio" checked={sqlMode === "QUERY_ONLY"} readOnly className="h-4 w-4 text-[#2563EB]" />
            </div>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              The LMS automatically creates the tables and sample data. The student only writes the <code>SELECT</code> query.
            </p>
          </div>

          <div
            onClick={() => setSqlMode("TABLE_CREATION_AND_QUERY")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-1.5 ${
              sqlMode === "TABLE_CREATION_AND_QUERY"
                ? "border-[#2563EB] bg-blue-50/20 dark:bg-blue-950/20 shadow-xs"
                : "border-[#E5E7EB] dark:border-[#27272A] hover:border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">MODE 2: TABLE_CREATION_AND_QUERY</span>
              <input type="radio" checked={sqlMode === "TABLE_CREATION_AND_QUERY"} readOnly className="h-4 w-4 text-[#2563EB]" />
            </div>
            <p className="text-[11px] text-[#6B7280] leading-relaxed">
              Student creates tables (<code>CREATE TABLE</code>), inserts records (<code>INSERT</code>), and writes queries. Fresh sandbox for every run.
            </p>
          </div>
        </div>

        {/* Engine & Dialect Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Database Engine *</label>
            <Select value={sqlEngine} onValueChange={(v) => setSqlEngine(v as ExtendedSQLEngine)}>
              <SelectTrigger className="h-10 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mysql">MySQL (Enterprise Relational, 8.0)</SelectItem>
                <SelectItem value="postgresql">PostgreSQL (Advanced Relational, 15)</SelectItem>
                <SelectItem value="sqlite">SQLite (In-Memory, Ultra-Fast)</SelectItem>
                <SelectItem value="sqlserver">Microsoft SQL Server (T-SQL, 2022)</SelectItem>
                <SelectItem value="oracle">Oracle Database (Oracle SQL, 21c)</SelectItem>
                <SelectItem value="mariadb">MariaDB (Standard Relational, 10.11)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Associated SQL Dialect</label>
            <div className="h-10 px-3.5 flex items-center justify-between rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-xs font-mono">
              <span className="font-bold text-[#2563EB]">{SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect} Dialect</span>
              <Badge variant="outline" className="text-[10px] font-bold">
                v{SQL_ENGINE_DIALECT_MAP[sqlEngine]?.version}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 4: TABLE BUILDER & SAMPLE DATA (MODE 1) OR DATABASE REQUIREMENTS (MODE 2) */}
      {sqlMode === "QUERY_ONLY" ? (
        <Card className="bg-white dark:bg-[#18181B] border border-[#2563EB]/40 dark:border-[#2563EB]/40 p-6 rounded-2xl shadow-sm space-y-5 bg-gradient-to-br from-blue-50/15 to-transparent dark:from-blue-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                <Database className="h-4 w-4" /> 4. Database Schema & Sample Data Builder
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Build tables, columns, constraints, and test records visually or with raw SQL</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#F9FAFB] dark:bg-[#09090B] p-1 rounded-xl border border-[#E5E7EB] dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setDatabaseSetupMode("visual")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    databaseSetupMode === "visual"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                  }`}
                >
                  Visual Table & Data Builder
                </button>
                <button
                  type="button"
                  onClick={() => setDatabaseSetupMode("raw")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    databaseSetupMode === "raw"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                  }`}
                >
                  Raw DDL / DML Editor
                </button>
              </div>
            </div>
          </div>

          {databaseSetupMode === "visual" ? (
            <div className="space-y-6">
              {/* Tables Navigation Strip */}
              <div className="flex items-center justify-between border-b border-border/40 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tables.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveTableIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                        activeTableIndex === idx
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-foreground"
                      }`}
                    >
                      <Database className="h-3.5 w-3.5" />
                      {t.name || `table_${idx + 1}`}
                      <span className="text-[10px] opacity-75">({t.rows.length} rows)</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newTblName = `table_${tables.length + 1}`;
                      setTables((prev) => [
                        ...prev,
                        {
                          name: newTblName,
                          columns: [
                            { name: "id", type: "INT", isPrimary: true, isNullable: false, defaultValue: "", description: "Primary Key" },
                            { name: "name", type: "VARCHAR(100)", isPrimary: false, isNullable: false, defaultValue: "", description: "" },
                          ],
                          rows: [],
                        },
                      ]);
                      setActiveTableIndex(tables.length);
                    }}
                    className="h-7 text-xs border-[#2563EB] text-[#2563EB] gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Table
                  </Button>
                </div>
              </div>

              {/* Active Table Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Table Name *</label>
                  <Input
                    value={activeTable?.name || ""}
                    placeholder="e.g. users, orders, employees"
                    onChange={(e) => {
                      const next = [...tables];
                      if (next[activeTableIndex]) {
                        next[activeTableIndex]!.name = e.target.value;
                        setTables(next);
                      }
                    }}
                    className="h-9 text-xs font-mono rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
                  />
                </div>
              </div>

              {/* Columns Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Table Columns ({activeTable?.columns.length || 0})
                  </span>
                  <Button type="button" size="sm" variant="ghost" onClick={handleAddColumn} className="h-7 text-xs text-[#2563EB] font-bold gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Column
                  </Button>
                </div>

                <div className="border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-x-auto bg-white dark:bg-[#18181B]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                        <th className="p-2.5 font-bold">Column Name</th>
                        <th className="p-2.5 font-bold">Data Type</th>
                        <th className="p-2.5 font-bold text-center">PK</th>
                        <th className="p-2.5 font-bold text-center">Nullable</th>
                        <th className="p-2.5 font-bold">Default Value</th>
                        <th className="p-2.5 font-bold">Description</th>
                        <th className="p-2.5 font-bold text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                      {activeTable?.columns.map((col, cIdx) => (
                        <tr key={cIdx} className="hover:bg-muted/20">
                          <td className="p-2">
                            <Input
                              value={col.name}
                              onChange={(e) => {
                                const next = [...tables];
                                if (next[activeTableIndex]?.columns[cIdx]) {
                                  next[activeTableIndex]!.columns[cIdx]!.name = e.target.value;
                                  setTables(next);
                                }
                              }}
                              className="h-7 text-xs font-mono rounded-lg"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={col.type}
                              onChange={(e) => {
                                const next = [...tables];
                                if (next[activeTableIndex]?.columns[cIdx]) {
                                  next[activeTableIndex]!.columns[cIdx]!.type = e.target.value;
                                  setTables(next);
                                }
                              }}
                              placeholder="INT, VARCHAR(100), DECIMAL(10,2)"
                              className="h-7 text-xs font-mono rounded-lg"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={col.isPrimary}
                              onChange={(e) => {
                                const next = [...tables];
                                if (next[activeTableIndex]?.columns[cIdx]) {
                                  next[activeTableIndex]!.columns[cIdx]!.isPrimary = e.target.checked;
                                  setTables(next);
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={col.isNullable}
                              onChange={(e) => {
                                const next = [...tables];
                                if (next[activeTableIndex]?.columns[cIdx]) {
                                  next[activeTableIndex]!.columns[cIdx]!.isNullable = e.target.checked;
                                  setTables(next);
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={col.defaultValue || ""}
                              onChange={(e) => {
                                const next = [...tables];
                                if (next[activeTableIndex]?.columns[cIdx]) {
                                  next[activeTableIndex]!.columns[cIdx]!.defaultValue = e.target.value;
                                  setTables(next);
                                }
                              }}
                              placeholder="e.g. NULL"
                              className="h-7 text-xs rounded-lg"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={col.description || ""}
                              onChange={(e) => {
                                const next = [...tables];
                                if (next[activeTableIndex]?.columns[cIdx]) {
                                  next[activeTableIndex]!.columns[cIdx]!.description = e.target.value;
                                  setTables(next);
                                }
                              }}
                              placeholder="Description"
                              className="h-7 text-xs rounded-lg"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const next = [...tables];
                                if (next[activeTableIndex]) {
                                  next[activeTableIndex]!.columns = next[activeTableIndex]!.columns.filter((_, i) => i !== cIdx);
                                  setTables(next);
                                }
                              }}
                              className="h-6 px-2 text-[11px] font-semibold text-red-500 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Records Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                    Sample Records in &apos;{activeTable?.name}&apos; ({activeTable?.rows.length || 0} rows)
                  </span>

                  <div className="flex items-center gap-2">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVImport} className="hidden" />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs border-[#E5E7EB] dark:border-[#27272A] gap-1"
                    >
                      <Upload className="h-3 w-3" /> Import CSV
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={handleAddSampleRow} className="h-7 text-xs text-[#2563EB] font-bold gap-1">
                      <Plus className="h-3 w-3" /> Add Row
                    </Button>
                  </div>
                </div>

                {(!activeTable?.rows || activeTable.rows.length === 0) ? (
                  <div className="border border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl p-8 text-center bg-[#F9FAFB]/50 dark:bg-[#09090B]/50">
                    <Database className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold text-foreground">No sample records added yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
                      Add sample rows manually or import from a CSV file.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button type="button" size="sm" onClick={handleAddSampleRow} className="h-7 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1 rounded-lg">
                        <Plus className="h-3 w-3" /> Add First Row
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs gap-1 rounded-lg">
                        <Upload className="h-3 w-3" /> Import CSV
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-x-auto bg-white dark:bg-[#18181B]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                          {activeTable?.columns.map((col, idx) => (
                            <th key={idx} className="p-2.5 font-bold font-mono">
                              {col.name || `col_${idx + 1}`}
                            </th>
                          ))}
                          <th className="p-2.5 font-bold text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                        {activeTable?.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-muted/20">
                            {activeTable.columns.map((col, cIdx) => (
                              <td key={cIdx} className="p-1.5">
                                <Input
                                  value={row[col.name] ?? ""}
                                  onChange={(e) => {
                                    const next = [...tables];
                                    if (next[activeTableIndex]?.rows[rIdx]) {
                                      next[activeTableIndex]!.rows[rIdx] = {
                                        ...(next[activeTableIndex]!.rows[rIdx] || {}),
                                        [col.name]: e.target.value,
                                      };
                                      setTables(next);
                                    }
                                  }}
                                  className="h-7 text-xs font-mono rounded-lg"
                                />
                              </td>
                            ))}
                            <td className="p-1.5 text-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const next = [...tables];
                                  if (next[activeTableIndex]) {
                                    next[activeTableIndex]!.rows = next[activeTableIndex]!.rows.filter((_, i) => i !== rIdx);
                                    setTables(next);
                                  }
                                }}
                                className="h-6 px-2 text-[11px] font-semibold text-red-500 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* RAW DDL / DML EDITOR */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Database Schema (DDL)</label>
                  <span className="text-[10px] text-[#6B7280]">Executed before student query</span>
                </div>
                <Textarea
                  rows={9}
                  value={schemaSql}
                  onChange={(e) => setSchemaSql(e.target.value)}
                  placeholder={`CREATE TABLE employees (\n    id INT PRIMARY KEY,\n    name VARCHAR(100) NOT NULL,\n    department VARCHAR(50),\n    salary DECIMAL(10,2)\n);`}
                  className="font-mono text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Seed Data (DML)</label>
                  <span className="text-[10px] text-[#6B7280]">Sample rows for evaluation</span>
                </div>
                <Textarea
                  rows={9}
                  value={seedSql}
                  onChange={(e) => setSeedSql(e.target.value)}
                  placeholder={`INSERT INTO employees VALUES\n(1, 'Arun', 'IT', 50000),\n(2, 'Priya', 'HR', 45000),\n(3, 'Rahul', 'IT', 75000);`}
                  className="font-mono text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
                />
              </div>
            </div>
          )}
        </Card>
      ) : (
        /* MODE 2: DATABASE REQUIREMENTS */
        <Card className="bg-white dark:bg-[#18181B] border border-amber-300 dark:border-amber-900/60 p-6 rounded-2xl shadow-sm space-y-4 bg-amber-50/15 dark:bg-amber-950/10">
          <div className="border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> 4. Table Creation & Query Requirements
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Specify the exact table names, columns, data types, and required records candidates must create in their submission
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Database Schema & Table Requirements *</label>
            <Textarea
              rows={5}
              value={dbRequirementsText}
              onChange={(e) => setDbRequirementsText(e.target.value)}
              placeholder="e.g. Candidate must create an 'employees' table with (id INT PRIMARY KEY, name VARCHAR(100), department VARCHAR(50), salary DECIMAL(10,2))."
              className="text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>
        </Card>
      )}

      {/* SECTION 5: DEDICATED SQL TEST CASES */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 sm:p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> 5. SQL Test Cases & Semantic Evaluation ({testCases.length})
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">Configure public datasets and hidden evaluation testcases with expected outputs</p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setTestCases((prev) => [
                ...prev,
                {
                  id: `sql_tc_${Date.now()}`,
                  name: `TC00${prev.length + 1} — Evaluation Dataset`,
                  input: "",
                  expected_output: "[]",
                  is_hidden: true,
                  weight: 20,
                  comparisonMode: "ORDER_SENSITIVE",
                  explanation: "",
                },
              ]);
            }}
            className="h-8 text-xs bg-[#2563EB] text-white font-bold gap-1 w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add SQL Test Case
          </Button>
        </div>

        {/* Global Result Comparison Mode */}
        <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] block">Default Result Comparison Mode</span>
            <span className="text-[11px] text-[#6B7280] mt-0.5 block">How the evaluator checks student SQL output against the expected dataset</span>
          </div>

          <Select value={comparisonMode} onValueChange={(v) => setComparisonMode(v as SQLComparisonMode)}>
            <SelectTrigger className="h-9 text-xs rounded-lg w-full sm:w-60 bg-white dark:bg-[#18181B] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ORDER_SENSITIVE">Order Sensitive (Strict ORDER BY check)</SelectItem>
              <SelectItem value="ORDER_INSENSITIVE">Order Insensitive (Content match only)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Test Cases List */}
        <div className="space-y-4">
          {testCases.map((tc, idx) => (
            <div key={tc.id} className="p-3.5 sm:p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] space-y-3">
              {/* Header: Test Case Name, Status Toggle, Weight, and Delete */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#E5E7EB] dark:border-[#27272A]">
                {/* Left: Test Case Name & Interactive Visibility Toggle */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Input
                    value={tc.name}
                    onChange={(e) => {
                      const next = [...testCases];
                      next[idx]!.name = e.target.value;
                      setTestCases(next);
                    }}
                    placeholder={`Test Case ${idx + 1}`}
                    className="h-8 text-xs font-bold w-full sm:w-56 min-w-0 bg-white dark:bg-[#18181B] rounded-lg shrink-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...testCases];
                      next[idx]!.is_hidden = !next[idx]!.is_hidden;
                      setTestCases(next);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      tc.is_hidden
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-300"
                        : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                    }`}
                    title={tc.is_hidden ? "Click to switch to Public Sample" : "Click to switch to Hidden Test"}
                  >
                    {tc.is_hidden ? "Hidden Test" : "Public Sample"}
                  </button>
                </div>

                {/* Right: Weight and Delete Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                    <span className="font-medium">Weight:</span>
                    <Input
                      type="number"
                      min={0}
                      value={tc.weight ?? ""}
                      onChange={(e) => {
                        const next = [...testCases];
                        const val = e.target.value;
                        next[idx]!.weight = val === "" ? ("" as any) : Number(val);
                        setTestCases(next);
                      }}
                      onBlur={() => {
                        const next = [...testCases];
                        if (next[idx]!.weight === undefined || String(next[idx]!.weight).trim() === "" || isNaN(Number(next[idx]!.weight))) {
                          next[idx]!.weight = 0;
                          setTestCases(next);
                        }
                      }}
                      className="h-8 w-16 text-xs text-center font-bold bg-white dark:bg-[#18181B] rounded-lg"
                    />
                    <span className="font-medium">%</span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setTestCases((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-8 px-2.5 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#111827] dark:text-[#FAFAFA]">Expected Output Dataset (JSON or Tabular)</label>
                <Textarea
                  rows={4}
                  value={tc.expected_output}
                  onChange={(e) => {
                    const next = [...testCases];
                    next[idx]!.expected_output = e.target.value;
                    setTestCases(next);
                  }}
                  placeholder={`[\n  { "id": 5, "name": "Karthik", "salary": 90000 },\n  { "id": 3, "name": "Rahul", "salary": 75000 }\n]`}
                  className="font-mono text-xs bg-white dark:bg-[#18181B] leading-relaxed rounded-xl"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* SECTION 6: REFERENCE SOLUTION & LEARNING OBJECTIVES */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
        <div className="border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
            <FileText className="h-4 w-4" /> 6. Reference Solution & Learning Objectives
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Configure trainer reference SQL query, editorial explanation, and competencies
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Reference SQL Solution Query ({SQL_ENGINE_DIALECT_MAP[sqlEngine]?.name})
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                Used for automated correctness benchmarking
              </span>
            </div>
            <Textarea
              rows={6}
              value={referenceSolution}
              onChange={(e) => setReferenceSolution(e.target.value)}
              placeholder={`SELECT e.name, d.department_name, e.salary\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nWHERE e.salary > 70000\nORDER BY e.salary DESC;`}
              className="font-mono text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Solution Explanation
              </label>
              <Textarea
                rows={4}
                value={solutionExplanation}
                onChange={(e) => setSolutionExplanation(e.target.value)}
                placeholder="Explain the optimal join strategy, index utilization, and filtering logic..."
                className="text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">
                Learning Objectives & Competencies
              </label>
              <Textarea
                rows={4}
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                placeholder="e.g. INNER JOIN, WHERE multi-criteria filtering, ORDER BY descending sorting..."
                className="text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
