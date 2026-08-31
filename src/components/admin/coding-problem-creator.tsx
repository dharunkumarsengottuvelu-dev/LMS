"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Code2, Plus, Trash2, CheckCircle2, Clock, Play,
  Sparkles, Save, ShieldCheck, Layers, FileText,
  AlertCircle, Check, Eye, ChevronRight, Terminal,
  Cpu, HardDrive, HelpCircle, ArrowLeft,
  Maximize2, Minimize2, ShieldAlert, Lock, Database, RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CodingProblemsService } from "@/services/coding-problems.service";
import type { CodingProblem, TestCase, Difficulty, CodingLanguage, SQLEngine, SQLComparisonMode, SQLQuestionMode } from "@/types/coding";
import { PageHeader } from "@/components/layouts/page-header";
import { AutoSaveBadge } from "@/components/ui/auto-save-badge";
import { SqlProblemCreator } from "@/components/admin/sql-problem-creator";

interface SupportedLangOption {
  id: string;
  label: string;
  defaultTemplate: string;
}

export interface CodingProblemCreatorProps {
  onCancel?: () => void;
  onSave?: (problem: CodingProblem) => void;
  onChange?: (problemData: {
    title: string;
    description: string;
    difficulty: Difficulty;
    constraints: string;
    inputFormat: string;
    outputFormat: string;
    templates: Record<string, string>;
    publicTestCases: TestCase[];
    hiddenTestCases: TestCase[];
    sqlEngine?: SQLEngine;
    schemaSql?: string;
    seedSql?: string;
    comparisonMode?: SQLComparisonMode;
  }) => void;
  initialQuestionType?: "programming" | "sql";
  initialTitle?: string;
  initialDescription?: string;
  initialDifficulty?: Difficulty;
  initialConstraints?: string;
  initialInputFormat?: string;
  initialOutputFormat?: string;
  initialTemplates?: Record<string, string>;
  initialPublicTestCases?: TestCase[];
  initialHiddenTestCases?: TestCase[];
  initialSqlEngine?: SQLEngine;
  initialSchemaSql?: string;
  initialSeedSql?: string;
  initialComparisonMode?: SQLComparisonMode;
  initialProvideTables?: boolean;
  initialSqlQuestionMode?: SQLQuestionMode;
  hideHeader?: boolean;
  inline?: boolean;
}

export function CodingProblemCreator({
  onCancel,
  onSave,
  onChange,
  initialQuestionType,
  initialTitle,
  initialDescription,
  initialDifficulty,
  initialConstraints,
  initialInputFormat,
  initialOutputFormat,
  initialTemplates,
  initialPublicTestCases,
  initialHiddenTestCases,
  initialSqlEngine,
  initialSchemaSql,
  initialSeedSql,
  initialComparisonMode,
  initialProvideTables,
  initialSqlQuestionMode,
  hideHeader = false,
  inline = false,
}: CodingProblemCreatorProps) {
  const { toast } = useToast();
  const [questionType, setQuestionType] = useState<"programming" | "sql">(
    initialQuestionType || (initialSqlEngine || initialSchemaSql ? "sql" : "programming")
  );
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLangOption[]>([
    { id: "c", label: "C (GCC)", defaultTemplate: "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}" },
    { id: "cpp", label: "C++ (GCC)", defaultTemplate: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}" },
    { id: "java", label: "Java 17", defaultTemplate: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}" },
    { id: "python", label: "Python 3", defaultTemplate: "# Write your Python solution here\n" },
    { id: "javascript", label: "JavaScript (Node.js)", defaultTemplate: "// Write your JavaScript solution here\n" },
    { id: "sql", label: "SQL (Multi-Dialect)", defaultTemplate: "-- Write your SQL query here\nSELECT * FROM employees;\n" },
  ]);

  useEffect(() => {
    fetch("/api/compiler/languages?enabled=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.languages && Array.isArray(data.languages)) {
          const fetched = data.languages.map((l: any) => ({
            id: l.jobe_language,
            label: l.display_name,
            defaultTemplate: "",
          }));
          // Ensure SQL is always in the options
          if (!fetched.some((l: any) => l.id === "sql")) {
            fetched.push({ id: "sql", label: "SQL (Multi-Dialect)", defaultTemplate: "-- Write your SQL query here\nSELECT * FROM employees;\n" });
          }
          setSupportedLanguages(fetched);
        }
      })
      .catch((err) => console.error("Failed to load languages", err));
  }, []);

  // Problem Metadata State
  const [title, setTitle] = useState(initialTitle || "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty || "easy");
  const [isDurationEnabled, setIsDurationEnabled] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [points, setPoints] = useState(10);

  // Specifications State
  const [description, setDescription] = useState(initialDescription || "");
  const [inputFormat, setInputFormat] = useState(initialInputFormat || "");
  const [outputFormat, setOutputFormat] = useState(initialOutputFormat || "");
  const [constraints, setConstraints] = useState(initialConstraints || "");

  // Supported Languages
  const [selectedLanguages, setSelectedLanguages] = useState<CodingLanguage[]>([
    "c", "cpp", "java", "python", "javascript"
  ]);

  // SQL Engine & Configuration State
  const [sqlEngine, setSqlEngine] = useState<SQLEngine>(initialSqlEngine || "sqlite");
  const [provideTables, setProvideTables] = useState<boolean>(initialProvideTables !== undefined ? initialProvideTables : true);
  const [sqlQuestionMode, setSqlQuestionMode] = useState<SQLQuestionMode>(
    initialSqlQuestionMode || (initialProvideTables === false ? "TABLE_CREATION_AND_QUERY" : "QUERY_ONLY")
  );
  const [schemaSql, setSchemaSql] = useState<string>(initialSchemaSql || "");
  const [seedSql, setSeedSql] = useState<string>(initialSeedSql || "");
  const [comparisonMode, setComparisonMode] = useState<SQLComparisonMode>(initialComparisonMode || "ORDER_SENSITIVE");
  const [sqlEditorTab, setSqlEditorTab] = useState<"builder" | "raw">("builder");

  // Visual Table Builder State
  const [tableName, setTableName] = useState<string>("employees");
  const [tableColumns, setTableColumns] = useState<
    { name: string; type: string; isPrimary: boolean; isNullable: boolean; defaultValue: string; description: string }[]
  >([
    { name: "id", type: "INT", isPrimary: true, isNullable: false, defaultValue: "", description: "Primary Key" },
    { name: "name", type: "VARCHAR(100)", isPrimary: false, isNullable: false, defaultValue: "", description: "Employee Name" },
    { name: "department", type: "VARCHAR(100)", isPrimary: false, isNullable: true, defaultValue: "", description: "Department" },
    { name: "salary", type: "DECIMAL(10,2)", isPrimary: false, isNullable: true, defaultValue: "", description: "Salary" },
  ]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([
    { id: "101", name: "Arun", department: "Engineering", salary: "75000" },
    { id: "102", name: "Priya", department: "Engineering", salary: "85000" },
    { id: "103", name: "Ravi", department: "HR", salary: "52000" },
    { id: "104", name: "Sneha", department: "Finance", salary: "68000" },
  ]);

  // Starter Code Templates by Language
  const [activeTemplateLang, setActiveTemplateLang] = useState<CodingLanguage>("java");
  const [templates, setTemplates] = useState<Record<string, string>>(initialTemplates || {});

  // Public Test Cases
  const [publicTestCases, setPublicTestCases] = useState<TestCase[]>(initialPublicTestCases || []);

  // Hidden Test Cases
  const [hiddenTestCases, setHiddenTestCases] = useState<TestCase[]>(initialHiddenTestCases || []);
  const [revealHiddenTestCases, setRevealHiddenTestCases] = useState<boolean>(true);

  // Execution Limits
  const [timeLimit, setTimeLimit] = useState(2);
  const [memoryLimit, setMemoryLimit] = useState(256);

  // Published Problems List
  const [publishedProblems, setPublishedProblems] = useState<CodingProblem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const hasRestoredDraft = useRef(false);

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Restore draft on mount (only for standalone creator page, never overwrite inline submodule problem data)
  useEffect(() => {
    if (inline) return;
    if (typeof window === "undefined" || hasRestoredDraft.current) return;
    try {
      const savedDraft = localStorage.getItem("draft_coding_problem");
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d) {
          if (d.title && !initialTitle) setTitle(d.title);
          if (d.description && !initialDescription) setDescription(d.description);
          if (d.difficulty) setDifficulty(d.difficulty);
          if (d.inputFormat) setInputFormat(d.inputFormat);
          if (d.outputFormat) setOutputFormat(d.outputFormat);
          if (d.constraints) setConstraints(d.constraints);
          if (d.templates) setTemplates(d.templates);
          if (d.publicTestCases?.length) setPublicTestCases(d.publicTestCases);
          if (d.hiddenTestCases?.length) setHiddenTestCases(d.hiddenTestCases);
          setLastSaved(d.savedAt || new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.warn("Could not restore draft", e);
    } finally {
      hasRestoredDraft.current = true;
    }
  }, [initialTitle, initialDescription, inline]);

  // Auto-save draft on changes (debounced)
  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredDraft.current) return;
    setIsSaved(false);
    const timer = setTimeout(() => {
      try {
        const draftData = {
          title,
          description,
          difficulty,
          inputFormat,
          outputFormat,
          constraints,
          templates,
          publicTestCases,
          hiddenTestCases,
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        localStorage.setItem("draft_coding_problem", JSON.stringify(draftData));
        setIsSaved(true);
        setLastSaved(draftData.savedAt);
      } catch (err) {
        console.warn("Auto-save failed", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [title, description, difficulty, inputFormat, outputFormat, constraints, templates, publicTestCases, hiddenTestCases]);

  const saveDraftNow = () => {
    if (typeof window === "undefined") return;
    try {
      const draftData = {
        title,
        description,
        difficulty,
        inputFormat,
        outputFormat,
        constraints,
        templates,
        publicTestCases,
        hiddenTestCases,
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      localStorage.setItem("draft_coding_problem", JSON.stringify(draftData));
      setIsSaved(true);
      setLastSaved(draftData.savedAt);
      toast({ title: "Draft Saved", description: `Coding problem draft saved at ${draftData.savedAt}` });
    } catch (err) {
      console.warn("Draft save failed", err);
    }
  };

  useEffect(() => {
    const all = CodingProblemsService.getAllProblems();
    setPublishedProblems(all);
  }, []);

  useEffect(() => {
    if (onChangeRef.current) {
      const filteredTemplates: Record<string, string> = {};
      selectedLanguages.forEach((lang) => {
        filteredTemplates[lang] = templates[lang] || supportedLanguages.find((l) => l.id === lang)?.defaultTemplate || "";
      });
      onChangeRef.current({
        title,
        description,
        difficulty,
        constraints,
        inputFormat,
        outputFormat,
        templates: filteredTemplates,
        publicTestCases,
        hiddenTestCases,
        sqlEngine: selectedLanguages.includes("sql") ? sqlEngine : undefined,
        schemaSql: selectedLanguages.includes("sql") ? schemaSql : undefined,
        seedSql: selectedLanguages.includes("sql") ? seedSql : undefined,
        comparisonMode: selectedLanguages.includes("sql") ? comparisonMode : undefined,
      });
    }
  }, [title, description, difficulty, constraints, inputFormat, outputFormat, selectedLanguages, templates, publicTestCases, hiddenTestCases, sqlEngine, schemaSql, seedSql, comparisonMode]);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang as any) ? prev.filter((l) => l !== lang) : [...prev, lang as any]
    );
  };

  const handleTemplateChange = (code: string) => {
    setTemplates((prev) => ({
      ...prev,
      [activeTemplateLang]: code
    }));
  };

  const addPublicTestCase = () => {
    setPublicTestCases((prev) => [
      ...prev,
      {
        id: `tc_pub_${Date.now()}`,
        input: "",
        expected_output: "",
        is_hidden: false,
        explanation: ""
      }
    ]);
  };

  const removePublicTestCase = (id: string) => {
    setPublicTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const addHiddenTestCase = () => {
    setHiddenTestCases((prev) => [
      ...prev,
      {
        id: `tc_hid_${Date.now()}`,
        input: "",
        expected_output: "",
        is_hidden: true,
        explanation: ""
      }
    ]);
  };

  const removeHiddenTestCase = (id: string) => {
    setHiddenTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const handleSaveProblem = async (status: "published" | "draft") => {
    if (!title.trim()) {
      toast({ title: "Title Required", description: "Please specify a problem title.", variant: "destructive" });
      return;
    }

    if (!description.trim()) {
      toast({ title: "Description Required", description: "Please specify the problem statement.", variant: "destructive" });
      return;
    }

    if (selectedLanguages.includes("sql")) {
      if (provideTables && !schemaSql.trim()) {
        toast({
          title: "SQL Schema Required",
          description: "Provide Tables is enabled. Please define at least one table in the Schema or click 'Sync to DDL & DML'.",
          variant: "destructive"
        });
        return;
      }
    }

    if (publicTestCases.length === 0) {
      toast({ title: "Public Test Case Required", description: "Add at least 1 public test case.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const problemId = `prob_${slug || Date.now()}`;

      const filteredTemplates: Record<string, string> = {};
      selectedLanguages.forEach((lang) => {
        filteredTemplates[lang] = templates[lang] || supportedLanguages.find((l) => l.id === lang)?.defaultTemplate || "";
      });

      const problemData: CodingProblem = {
        id: problemId,
        title: title.trim(),
        slug,
        description: description.trim(),
        difficulty,
        category: selectedLanguages.includes("sql") ? "Databases" : "Algorithms",
        constraints,
        input_format: inputFormat,
        output_format: outputFormat,
        points: points || 10,
        sample_input: publicTestCases[0]?.input || "",
        sample_output: publicTestCases[0]?.expected_output || "",
        templates: filteredTemplates,
        test_cases: [...publicTestCases, ...hiddenTestCases],
        reveal_hidden_testcases: revealHiddenTestCases,
        sql_engine: selectedLanguages.includes("sql") ? sqlEngine : undefined,
        sql_question_mode: selectedLanguages.includes("sql") ? sqlQuestionMode : undefined,
        provide_tables: selectedLanguages.includes("sql") ? provideTables : undefined,
        schema_sql: selectedLanguages.includes("sql") ? (provideTables ? schemaSql : undefined) : undefined,
        seed_sql: selectedLanguages.includes("sql") ? (provideTables ? seedSql : undefined) : undefined,
        comparison_mode: selectedLanguages.includes("sql") ? comparisonMode : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await CodingProblemsService.saveProblem(problemData);
      setPublishedProblems(CodingProblemsService.getAllProblems());

      if (onSave) {
        onSave(problemData);
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("draft_coding_problem");
      }

      toast({
        title: status === "published" ? "Problem Published!" : "Problem Saved as Draft",
        description: `"${title}" has been successfully saved to the compiler sandbox.`,
      });

      if (onCancel) onCancel();
    } catch (err) {
      console.error("Failed to save coding problem:", err);
      toast({ title: "Save Failed", description: "Could not save problem. Please check input.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (questionType === "sql") {
    return (
      <div className={inline ? "space-y-6 w-full" : "space-y-8 w-full pb-16"}>
        {/* Step 1 Question Type Selector Banner */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#2563EB]/40 dark:border-[#2563EB]/40 p-4 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] block">
                Question Type *
              </span>
              <span className="text-[11px] text-[#6B7280]">
                Choose between algorithmic programming or dedicated relational database queries
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuestionType("programming")}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-foreground"
              >
                <Code2 className="h-4 w-4" />
                Programming (C, C++, Java, Python, etc.)
              </button>
              <button
                type="button"
                onClick={() => setQuestionType("sql")}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-[#2563EB] text-white shadow-sm"
              >
                <Database className="h-4 w-4" />
                SQL Database (MySQL, Postgres, SQLite, etc.)
              </button>
            </div>
          </div>
        </Card>

        <SqlProblemCreator
          onCancel={onCancel}
          onSave={onSave}
          onChangeQuestionType={(t) => setQuestionType(t)}
          initialProblem={{
            title,
            description,
            difficulty,
            points,
            sql_engine: sqlEngine,
            sql_question_mode: sqlQuestionMode,
            provide_tables: provideTables,
            schema_sql: schemaSql,
            seed_sql: seedSql,
            comparison_mode: comparisonMode,
          }}
          hideHeader={hideHeader}
          inline={inline}
        />
      </div>
    );
  }

  return (
    <div className={inline ? "space-y-6 w-full" : "space-y-8 w-full pb-16"}>
      {/* Top Header */}
      {!hideHeader && !inline && (
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-[#2563EB]" />
              <span className="uppercase tracking-wider">Create Coding Problem</span>
            </div>
          }
          description="Author algorithmic coding problems, test cases, and starter templates"
          backAction={onCancel ? { label: "Back", onClick: onCancel } : undefined}
          actions={
            <div className="flex items-center gap-3 flex-wrap">
              <AutoSaveBadge isSaved={isSaved} lastSaved={lastSaved} onManualSave={saveDraftNow} />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSaveProblem("draft")}
                disabled={isSaving}
                className="h-10 px-5 text-xs font-semibold rounded-xl border-[#E5E7EB] dark:border-[#27272A] gap-2"
              >
                <Save className="h-3.5 w-3.5" /> Save as Draft
              </Button>
              <Button
                type="button"
                onClick={() => handleSaveProblem("published")}
                disabled={isSaving}
                className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl gap-2 shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" /> Publish Problem
              </Button>
            </div>
          }
        />
      )}

      {/* Question Type Selection Banner */}
      <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-4 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] block">
              Question Type *
            </span>
            <span className="text-[11px] text-[#6B7280]">
              Choose between algorithmic programming or dedicated relational database queries
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuestionType("programming")}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-[#2563EB] text-white shadow-sm"
            >
              <Code2 className="h-4 w-4" />
              Programming (C, C++, Java, Python, etc.)
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("sql")}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-foreground"
            >
              <Database className="h-4 w-4" />
              SQL Database (MySQL, Postgres, SQLite, etc.)
            </button>
          </div>
        </div>
      </Card>

      {/* Inline Auto-Save Bar */}
      {inline && (
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
          <span className="text-xs font-bold text-[#6B7280]">Problem Configuration Form</span>
          <AutoSaveBadge isSaved={isSaved} lastSaved={lastSaved} onManualSave={saveDraftNow} />
        </div>
      )}

      {/* Main Authoring Form */}
      <div className="space-y-8">
        
        {/* Section 1: Problem Overview */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> 1. Problem Overview & Parameters
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Find the Largest Element"
                className="h-[48px] text-sm rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Difficulty</label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                  <SelectTrigger className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Duration (Minutes)</label>
                  <Switch checked={isDurationEnabled} onCheckedChange={setIsDurationEnabled} />
                </div>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                  disabled={!isDurationEnabled}
                  className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Total Problem Points</label>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value, 10) || 10)}
                  className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Problem Specifications */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
            <FileText className="h-4 w-4" /> 2. Problem Statement & Specifications
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Problem Statement</label>
              <Textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Given an array of integers, write a program to find and output the largest element in the array."
                className="text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Input Format</label>
                <Textarea
                  rows={3}
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  placeholder="e.g. First line contains an integer N representing the size of the array.&#10;Second line contains N space-separated integers."
                  className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Output Format</label>
                <Textarea
                  rows={3}
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  placeholder="e.g. Print a single integer representing the maximum value found in the array."
                  className="text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Constraints</label>
              <Textarea
                rows={2}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="e.g. 1 <= N <= 10^5&#10;-10^9 <= A[i] <= 10^9"
                className="text-xs font-mono rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>
          </div>
        </Card>

        {/* Section 3: Supported Languages */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
            <Cpu className="h-4 w-4" /> 3. Supported Execution Languages
          </h2>
          <p className="text-xs text-[#6B7280]">Select the programming languages students can use to submit their code:</p>

          <div className="flex flex-wrap gap-2">
            {supportedLanguages.map((lang) => {
              const isChecked = selectedLanguages.includes(lang.id as any);
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => toggleLanguage(lang.id)}
                  className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-bold transition-all text-left ${
                    isChecked
                      ? "bg-[#2563EB]/10 border-[#2563EB] text-[#2563EB] dark:text-[#93C5FD]"
                      : "bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                    isChecked ? "bg-[#2563EB] border-[#2563EB] text-white" : "border-[#9CA3AF]"
                  }`}>
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span>{lang.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Section 3.5: SQL Database Engine & Schema Configuration (Visible when SQL is selected) */}
        {selectedLanguages.includes("sql") && (
          <Card className="bg-white dark:bg-[#18181B] border border-[#2563EB]/40 dark:border-[#2563EB]/40 p-6 rounded-2xl shadow-sm space-y-6 bg-gradient-to-br from-blue-50/20 to-transparent dark:from-blue-950/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                  <Database className="h-4 w-4" /> 3.5 SQL Engine & Database Sandbox Configuration
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">Configure SQL question mode, database engine, schema, and sample datasets</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#2563EB] text-white text-[10px] uppercase font-bold">SQL Multi-Dialect Sandbox</Badge>
              </div>
            </div>

            {/* SQL Question Mode Selector */}
            <div className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] block">
                    Provide Tables to Candidate
                  </span>
                  <span className="text-[11px] text-[#6B7280]">
                    {provideTables
                      ? "MODE 1: QUERY_ONLY — Pre-create tables & sample data. Student only writes SELECT / SQL queries."
                      : "MODE 2: TABLE_CREATION_AND_QUERY — Candidate creates their own tables and queries in a clean sandbox."}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setProvideTables(true);
                      setSqlQuestionMode("QUERY_ONLY");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      provideTables
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]"
                    }`}
                  >
                    Provide Tables (ON)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProvideTables(false);
                      setSqlQuestionMode("TABLE_CREATION_AND_QUERY");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !provideTables
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]"
                    }`}
                  >
                    Candidate Creates (OFF)
                  </button>
                </div>
              </div>
            </div>

            {/* Engine & Comparison Mode Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Target Database Engine</label>
                <Select value={sqlEngine} onValueChange={(v) => setSqlEngine(v as SQLEngine)}>
                  <SelectTrigger className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sqlite">SQLite (Fast, In-Memory Sandbox)</SelectItem>
                    <SelectItem value="mysql">MySQL 8.0 (Enterprise Relational)</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL 15 (Advanced SQL / CTEs)</SelectItem>
                    <SelectItem value="mariadb">MariaDB 10.11 (Compatible Relational)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Result Comparison Mode</label>
                <Select value={comparisonMode} onValueChange={(v) => setComparisonMode(v as SQLComparisonMode)}>
                  <SelectTrigger className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORDER_SENSITIVE">Order Sensitive (Strict ORDER BY check)</SelectItem>
                    <SelectItem value="ORDER_INSENSITIVE">Order Insensitive (Content match only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* MODE 1: Interactive Table Builder & Sample Data (When Provide Tables is ON) */}
            {provideTables ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSqlEditorTab("builder")}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        sqlEditorTab === "builder"
                          ? "bg-[#2563EB] text-white"
                          : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                      }`}
                    >
                      Visual Table & Data Builder
                    </button>
                    <button
                      type="button"
                      onClick={() => setSqlEditorTab("raw")}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${
                        sqlEditorTab === "raw"
                          ? "bg-[#2563EB] text-white"
                          : "text-[#6B7280] hover:text-[#111827] dark:hover:text-[#FAFAFA]"
                      }`}
                    >
                      Raw DDL / DML Code Editor
                    </button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!tableName.trim() || tableColumns.length === 0) return;
                      const colDefs = tableColumns.map((col) => {
                        let def = `    ${col.name} ${col.type}`;
                        if (col.isPrimary) def += " PRIMARY KEY";
                        if (!col.isNullable && !col.isPrimary) def += " NOT NULL";
                        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
                        return def;
                      }).join(",\n");
                      const ddl = `CREATE TABLE ${tableName} (\n${colDefs}\n);`;
                      setSchemaSql(ddl);

                      if (sampleRows.length > 0) {
                        const colNames = tableColumns.map((c) => c.name).join(", ");
                        const rowValues = sampleRows.map((r) => {
                          const vals = tableColumns.map((c) => {
                            const rawVal = r[c.name] ?? "";
                            if (c.type.toUpperCase().includes("INT") || c.type.toUpperCase().includes("DECIMAL") || c.type.toUpperCase().includes("FLOAT")) {
                              return rawVal !== "" ? rawVal : "NULL";
                            }
                            return `'${rawVal.replace(/'/g, "''")}'`;
                          }).join(", ");
                          return `(${vals})`;
                        }).join(",\n");
                        const dml = `INSERT INTO ${tableName} (${colNames}) VALUES\n${rowValues};`;
                        setSeedSql(dml);
                      }
                      toast({ title: "SQL Generated", description: "Compiled visual table into DDL schema & DML seed." });
                    }}
                    className="h-7 text-xs border-[#2563EB] text-[#2563EB] gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Sync to DDL & DML
                  </Button>
                </div>

                {sqlEditorTab === "builder" ? (
                  <div className="space-y-5">
                    {/* Table Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Table Name</label>
                        <Input
                          value={tableName}
                          onChange={(e) => setTableName(e.target.value)}
                          placeholder="e.g. employees"
                          className="h-9 text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B]"
                        />
                      </div>
                    </div>

                    {/* Columns Builder Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Columns Schema ({tableColumns.length})</label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setTableColumns((prev) => [
                            ...prev,
                            { name: `col_${prev.length + 1}`, type: "VARCHAR(100)", isPrimary: false, isNullable: true, defaultValue: "", description: "" }
                          ])}
                          className="h-7 text-xs text-[#2563EB] font-semibold gap-1"
                        >
                          <Plus className="h-3 w-3" /> Add Column
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
                              <th className="p-2.5 font-bold">Description</th>
                              <th className="p-2.5 font-bold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                            {tableColumns.map((col, idx) => (
                              <tr key={idx} className="hover:bg-muted/30">
                                <td className="p-2">
                                  <Input
                                    value={col.name}
                                    onChange={(e) => {
                                      const next = [...tableColumns];
                                      next[idx]!.name = e.target.value;
                                      setTableColumns(next);
                                    }}
                                    className="h-8 text-xs font-mono rounded-lg"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input
                                    value={col.type}
                                    onChange={(e) => {
                                      const next = [...tableColumns];
                                      next[idx]!.type = e.target.value;
                                      setTableColumns(next);
                                    }}
                                    placeholder="INT, VARCHAR(100)"
                                    className="h-8 text-xs font-mono rounded-lg"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={col.isPrimary}
                                    onChange={(e) => {
                                      const next = [...tableColumns];
                                      next[idx]!.isPrimary = e.target.checked;
                                      setTableColumns(next);
                                    }}
                                    className="rounded border-[#E5E7EB]"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={col.isNullable}
                                    onChange={(e) => {
                                      const next = [...tableColumns];
                                      next[idx]!.isNullable = e.target.checked;
                                      setTableColumns(next);
                                    }}
                                    className="rounded border-[#E5E7EB]"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input
                                    value={col.description}
                                    onChange={(e) => {
                                      const next = [...tableColumns];
                                      next[idx]!.description = e.target.value;
                                      setTableColumns(next);
                                    }}
                                    placeholder="e.g. Employee ID"
                                    className="h-8 text-xs rounded-lg"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setTableColumns((prev) => prev.filter((_, i) => i !== idx))}
                                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sample Data Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Sample Data Records ({sampleRows.length} rows)</label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newRow: Record<string, string> = {};
                            tableColumns.forEach((c) => { newRow[c.name] = ""; });
                            setSampleRows((prev) => [...prev, newRow]);
                          }}
                          className="h-7 text-xs text-[#2563EB] font-semibold gap-1"
                        >
                          <Plus className="h-3 w-3" /> Add Sample Row
                        </Button>
                      </div>

                      <div className="border border-[#E5E7EB] dark:border-[#27272A] rounded-xl overflow-x-auto bg-white dark:bg-[#18181B]">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#F9FAFB] dark:bg-[#09090B] border-b border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280]">
                              {tableColumns.map((col, idx) => (
                                <th key={idx} className="p-2.5 font-bold font-mono">{col.name}</th>
                              ))}
                              <th className="p-2.5 font-bold text-center w-12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                            {sampleRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-muted/30">
                                {tableColumns.map((col, cIdx) => (
                                  <td key={cIdx} className="p-1.5">
                                    <Input
                                      value={row[col.name] ?? ""}
                                      onChange={(e) => {
                                        const next = [...sampleRows];
                                        next[rIdx] = { ...(next[rIdx] || {}), [col.name]: e.target.value };
                                        setSampleRows(next);
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
                                    onClick={() => setSampleRows((prev) => prev.filter((_, i) => i !== rIdx))}
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
                  </div>
                ) : (
                  /* Raw DDL / DML Code Editor */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Database Schema (DDL)</label>
                        <span className="text-[10px] text-[#6B7280]">Executed before student query</span>
                      </div>
                      <Textarea
                        rows={8}
                        value={schemaSql}
                        onChange={(e) => setSchemaSql(e.target.value)}
                        placeholder={`CREATE TABLE employees (\n    id INT PRIMARY KEY,\n    name VARCHAR(100),\n    department VARCHAR(100),\n    salary DECIMAL(10,2)\n);`}
                        className="font-mono text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Seed Data (DML)</label>
                        <span className="text-[10px] text-[#6B7280]">Sample rows for evaluation</span>
                      </div>
                      <Textarea
                        rows={8}
                        value={seedSql}
                        onChange={(e) => setSeedSql(e.target.value)}
                        placeholder={`INSERT INTO employees VALUES\n(101, 'Arun', 'Engineering', 75000),\n(102, 'Priya', 'Engineering', 85000),\n(103, 'Ravi', 'HR', 52000);`}
                        className="font-mono text-xs leading-relaxed rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* MODE 2: TABLE_CREATION_AND_QUERY Description */
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" /> Mode 2: Table Creation & Query Active
                </div>
                <p>
                  In this mode, tables will <strong>NOT</strong> be created automatically. The student will write <code>CREATE TABLE</code>, <code>INSERT INTO</code>, and <code>SELECT</code> queries sequentially.
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Ensure the <strong>Problem Statement</strong> clearly defines the expected table schema (columns, types, constraints) so candidates know what to create.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Section 4: Starter Code Template */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                <Terminal className="h-4 w-4" /> 4. Starter Code Templates
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Author standard I/O template code for each language</p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedLanguages.map((langId) => {
                const langObj = supportedLanguages.find((l) => l.id === langId);
                const isActive = activeTemplateLang === langId;
                return (
                  <button
                    key={langId}
                    type="button"
                    onClick={() => setActiveTemplateLang(langId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    {langObj?.label || langId}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span className="font-semibold text-[#111827] dark:text-[#FAFAFA]">
                Language Template: <span className="text-[#2563EB] font-mono">{activeTemplateLang.toUpperCase()}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const defaultCode = supportedLanguages.find((l) => l.id === activeTemplateLang)?.defaultTemplate || "";
                  handleTemplateChange(defaultCode);
                }}
                className="text-[11px] text-[#2563EB] hover:underline"
              >
                Reset to Default Solution Template
              </button>
            </div>

            <Textarea
              rows={12}
              value={templates[activeTemplateLang] || ""}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="font-mono text-xs leading-relaxed bg-[#09090B] text-[#FAFAFA] border-[#27272A] rounded-xl p-4"
            />
          </div>
        </Card>

        {/* Section 5: Public Test Cases */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> 5. Public Test Cases ({publicTestCases.length})
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Visible sample inputs & expected outputs for student testing</p>
            </div>
            <Button
              type="button"
              onClick={addPublicTestCase}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold border-[#2563EB] text-[#2563EB] gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Test Case
            </Button>
          </div>

          <div className="space-y-4">
            {publicTestCases.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[#6B7280] space-y-2">
                <p className="text-xs font-semibold">No public test cases added.</p>
                <Button
                  type="button"
                  onClick={addPublicTestCase}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-[#2563EB] text-[#2563EB] gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add First Test Case
                </Button>
              </div>
            ) : (
              publicTestCases.map((tc, idx) => (
                <div key={tc.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#2563EB] text-white text-[10px] font-bold">Public Case #{idx + 1}</Badge>
                    <Button
                      type="button"
                      onClick={() => removePublicTestCase(tc.id)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg transition-colors"
                      title="Delete Public Test Case"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6B7280]">Input (STDIN)</label>
                      <Textarea
                        rows={3}
                        value={tc.input}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPublicTestCases((prev) =>
                            prev.map((item) => (item.id === tc.id ? { ...item, input: val } : item))
                          );
                        }}
                        placeholder="e.g. 5&#10;10 25 7 42 18"
                        className="font-mono text-xs bg-white dark:bg-[#18181B] rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6B7280]">Expected Output (STDOUT)</label>
                      <Textarea
                        rows={3}
                        value={tc.expected_output}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPublicTestCases((prev) =>
                            prev.map((item) => (item.id === tc.id ? { ...item, expected_output: val } : item))
                          );
                        }}
                        placeholder="e.g. 42"
                        className="font-mono text-xs bg-white dark:bg-[#18181B] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#6B7280]">Explanation (Optional)</label>
                    <Input
                      value={tc.explanation || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPublicTestCases((prev) =>
                          prev.map((item) => (item.id === tc.id ? { ...item, explanation: val } : item))
                        );
                      }}
                      placeholder="Explanation of test case..."
                      className="text-xs bg-white dark:bg-[#18181B] rounded-lg h-9"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Section 6: Hidden Test Cases */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#D97706] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> 6. Hidden Test Cases ({hiddenTestCases.length})
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">Evaluation test cases used for scoring (hidden from students)</p>
            </div>
            <Button
              type="button"
              onClick={addHiddenTestCase}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold border-[#D97706] text-[#D97706] gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Hidden Test Case
            </Button>
          </div>

          {/* Trainer / Admin Permission Toggle: Reveal Hidden Test Cases in Results */}
          <div className="flex items-center justify-between p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA] block">
                Reveal Hidden Test Case Details to Student upon Submission
              </span>
              <span className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                When enabled (Default), students can inspect input & expected output for hidden cases after submitting. Turn OFF for strict exams.
              </span>
            </div>
            <Switch
              checked={revealHiddenTestCases}
              onCheckedChange={setRevealHiddenTestCases}
            />
          </div>

          <div className="space-y-4">
            {hiddenTestCases.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-[#E5E7EB] dark:border-[#27272A] rounded-xl text-[#6B7280] space-y-2">
                <p className="text-xs font-semibold">No hidden test cases added.</p>
                <Button
                  type="button"
                  onClick={addHiddenTestCase}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-[#D97706] text-[#D97706] gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add First Hidden Case
                </Button>
              </div>
            ) : (
              hiddenTestCases.map((tc, idx) => (
                <div key={tc.id} className="p-4 bg-[#F9FAFB] dark:bg-[#09090B] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#D97706] text-white text-[10px] font-bold">Hidden Case #{idx + 1}</Badge>
                    <Button
                      type="button"
                      onClick={() => removeHiddenTestCase(tc.id)}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg transition-colors"
                      title="Delete Hidden Test Case"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6B7280]">Input (STDIN)</label>
                      <Textarea
                        rows={3}
                        value={tc.input}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHiddenTestCases((prev) =>
                            prev.map((item) => (item.id === tc.id ? { ...item, input: val } : item))
                          );
                        }}
                        placeholder="Input..."
                        className="font-mono text-xs bg-white dark:bg-[#18181B] rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6B7280]">Expected Output (STDOUT)</label>
                      <Textarea
                        rows={3}
                        value={tc.expected_output}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHiddenTestCases((prev) =>
                            prev.map((item) => (item.id === tc.id ? { ...item, expected_output: val } : item))
                          );
                        }}
                        placeholder="Expected Output..."
                        className="font-mono text-xs bg-white dark:bg-[#18181B] rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Section 7: Execution Limits */}
        <Card className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
            <Clock className="h-4 w-4" /> 7. Execution Environment Limits
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Time Limit (Seconds)</label>
              <Input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 2)}
                className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111827] dark:text-[#FAFAFA]">Memory Limit (MB)</label>
              <Input
                type="number"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(parseInt(e.target.value, 10) || 256)}
                className="h-[44px] text-xs rounded-xl bg-[#F9FAFB] dark:bg-[#09090B] border-[#E5E7EB] dark:border-[#27272A]"
              />
            </div>
          </div>
        </Card>

        {/* Bottom Actions */}
        {!inline && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB] dark:border-[#27272A]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveProblem("draft")}
              disabled={isSaving}
              className="h-12 px-6 font-semibold text-xs rounded-xl border-[#E5E7EB] dark:border-[#27272A]"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveProblem("published")}
              disabled={isSaving}
              className="h-12 px-8 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl gap-2 shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" /> Publish Problem
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
