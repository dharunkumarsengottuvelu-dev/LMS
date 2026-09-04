"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Database, Plus, Trash2, CheckCircle2, Clock, Play,
  Sparkles, Save, ShieldCheck, Layers, FileText,
  AlertCircle, Check, Eye, ChevronRight, Terminal,
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
  onChangeQuestionType?: (type: "programming" | "sql") => void;
  initialProblem?: Partial<CodingProblem>;
  hideHeader?: boolean;
  inline?: boolean;
}

export function SqlProblemCreator({
  onCancel,
  onSave,
  onChangeQuestionType,
  initialProblem,
  hideHeader = false,
  inline = false,
}: SqlProblemCreatorProps) {
  const { toast } = useToast();

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewQuery, setPreviewQuery] = useState(
    (initialProblem?.templates as any)?.sql || "-- Write your SQL query here\n"
  );
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
      const problemId = `sql_${slug || Date.now()}`;

      const problemData: CodingProblem = {
        id: problemId,
        title: title.trim(),
        slug,
        description: description.trim(),
        difficulty,
        category: "Databases",
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
          sql: `-- Dialect: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect}\n-- Engine: ${SQL_ENGINE_DIALECT_MAP[sqlEngine]?.name}\nSELECT * FROM ${tables[0]?.name || "table_name"};\n`,
        },
        test_cases: testCases.map((tc) => ({
          id: tc.id,
          input: "",
          expected_output: tc.expected_output,
          is_hidden: tc.is_hidden,
          explanation: tc.explanation,
        })),
        sql_engine: (sqlEngine === "sqlserver" || sqlEngine === "oracle" ? "sqlite" : sqlEngine) as SQLEngine,
        sql_question_mode: sqlMode,
        provide_tables: sqlMode === "QUERY_ONLY",
        schema_sql: sqlMode === "QUERY_ONLY" ? schemaSql : undefined,
        seed_sql: sqlMode === "QUERY_ONLY" ? seedSql : undefined,
        comparison_mode: comparisonMode,
        duration_minutes: isDurationEnabled ? durationMinutes : 0,
        created_at: new Date().toISOString(),
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
          title="SQL Question Builder"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Question Bank", href: "/admin/coding" },
            { label: "Create SQL Question" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              {onChangeQuestionType && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onChangeQuestionType("programming")}
                  className="h-9 text-xs border-[#2563EB]/40 text-[#2563EB] font-bold"
                >
                  <Code2 className="h-4 w-4 mr-1.5" /> Switch to Programming Question
                </Button>
              )}
              {onCancel && (
                <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-9 text-xs">
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                className="h-9 text-xs border-emerald-600 text-emerald-600 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              >
                <Eye className="h-4 w-4 mr-1.5" /> Preview Student View
              </Button>
              <Button
                type="button"
                onClick={() => handlePublish(false)}
                disabled={isSaving}
                className="h-9 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-4"
              >
                {isSaving ? "Publishing..." : "Publish SQL Question"}
              </Button>
            </div>
          }
        />
      )}

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
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const next = [...tables];
                                if (next[activeTableIndex]) {
                                  next[activeTableIndex]!.columns = next[activeTableIndex]!.columns.filter((_, i) => i !== cIdx);
                                  setTables(next);
                                }
                              }}
                              className="h-6 w-6 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
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
                    Sample Records in '{activeTable?.name}' ({activeTable?.rows.length || 0} rows)
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
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const next = [...tables];
                                  if (next[activeTableIndex]) {
                                    next[activeTableIndex]!.rows = next[activeTableIndex]!.rows.filter((_, i) => i !== rIdx);
                                    setTables(next);
                                  }
                                }}
                                className="h-6 w-6 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
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
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> 5. SQL Test Cases & Semantic Evaluation ({testCases.length})
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
            className="h-8 text-xs bg-[#2563EB] text-white font-bold gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add SQL Test Case
          </Button>
        </div>

        {/* Global Result Comparison Mode */}
        <div className="p-3 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] block">Default Result Comparison Mode</span>
            <span className="text-[11px] text-[#6B7280]">How the evaluator checks student SQL output against the expected dataset</span>
          </div>

          <Select value={comparisonMode} onValueChange={(v) => setComparisonMode(v as SQLComparisonMode)}>
            <SelectTrigger className="h-9 text-xs rounded-lg w-56 bg-white dark:bg-[#18181B]">
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
            <div key={tc.id} className="p-4 border border-[#E5E7EB] dark:border-[#27272A] rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={tc.name}
                    onChange={(e) => {
                      const next = [...testCases];
                      next[idx]!.name = e.target.value;
                      setTestCases(next);
                    }}
                    className="h-8 text-xs font-bold w-64 bg-white dark:bg-[#18181B]"
                  />
                  <Badge variant={tc.is_hidden ? "secondary" : "outline"} className="text-[10px] font-bold">
                    {tc.is_hidden ? "Hidden Test" : "Public Sample Case"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                    <span>Weight:</span>
                    <Input
                      type="number"
                      value={tc.weight}
                      onChange={(e) => {
                        const next = [...testCases];
                        next[idx]!.weight = parseInt(e.target.value, 10) || 0;
                        setTestCases(next);
                      }}
                      className="h-7 w-16 text-xs text-center bg-white dark:bg-[#18181B]"
                    />
                    <span>%</span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = [...testCases];
                      next[idx]!.is_hidden = !next[idx]!.is_hidden;
                      setTestCases(next);
                    }}
                    className="h-7 text-[11px]"
                  >
                    {tc.is_hidden ? "Make Public" : "Make Hidden"}
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setTestCases((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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

      {/* STUDENT PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="h-14 border-b border-[#E5E7EB] dark:border-[#27272A] px-5 flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#2563EB] text-white text-[10px] uppercase font-bold">Candidate Live Preview</Badge>
                <span className="text-sm font-bold truncate max-w-md">{title || "Untitled SQL Problem"}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsPreviewOpen(false)} className="h-8 text-xs">
                Close Preview
              </Button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
              {/* Left: Problem Specs & Schema */}
              <div className="p-5 border-r border-[#E5E7EB] dark:border-[#27272A] overflow-y-auto space-y-5 bg-white dark:bg-[#18181B]">
                <div>
                  <h3 className="text-base font-bold mb-1">{title || "SQL Query Problem"}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-[#2563EB] border-[#2563EB]/40">
                      {SQL_ENGINE_DIALECT_MAP[sqlEngine]?.name} ({SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect})
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {difficulty}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Problem Statement</h4>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {description || "Solve the database problem using SQL."}
                  </p>
                </div>

                {sqlMode === "QUERY_ONLY" ? (
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-3">
                    <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5">
                      <Database className="h-4 w-4" /> Provided Database Schema (DDL)
                    </span>
                    <pre className="text-[10.5px] font-mono bg-background p-2.5 rounded-lg border border-border overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {schemaSql}
                    </pre>

                    {seedSql && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground">Sample Data Records (DML):</span>
                        <pre className="text-[10px] font-mono bg-background p-2 rounded-lg border border-border overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {seedSql}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-2">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Database Requirements:</span>
                    <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed whitespace-pre-wrap">
                      {dbRequirementsText}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Candidate SQL Editor */}
              <div className="p-5 flex flex-col justify-between bg-[#09090B] text-white">
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                    <span className="text-xs font-bold text-white/70 font-mono">SQL Editor ({SQL_ENGINE_DIALECT_MAP[sqlEngine]?.dialect})</span>
                    <Button size="sm" className="h-7 text-xs bg-[#16A34A] text-white font-bold gap-1">
                      <Play className="h-3 w-3" /> Run SQL Query
                    </Button>
                  </div>
                  <Textarea
                    rows={12}
                    value={previewQuery}
                    onChange={(e) => setPreviewQuery(e.target.value)}
                    className="font-mono text-xs leading-relaxed bg-[#18181B] text-emerald-400 border-[#27272A] rounded-xl p-3"
                  />
                </div>

                <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-xl text-center text-xs text-white/40 font-mono">
                  Sample Public Test Cases & Query Results will be evaluated live against isolated sandbox.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
