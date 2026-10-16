export type ColumnType = "string" | "number" | "boolean" | "enum" | "url" | "time" | "date";

export interface ColumnDefinition {
  key: string;
  label: string;
  type: ColumnType;
  required: boolean;
  options?: string[]; // Allowed dropdown values for enum
  defaultValue?: any;
  sampleValue?: any;
  placeholder?: string;
  description: string;
  validate?: (value: any, row: Record<string, any>) => string | null;
}

export interface ModuleTemplateConfig {
  moduleType: string;
  displayName: string;
  description: string;
  templateFileName: string;
  columns: ColumnDefinition[];
  sampleRows: Record<string, any>[];
  groupByField?: string;
  mapToPayload: (row: Record<string, any>, index: number) => any;
  mapGroupedPayload?: (grouped: { groupKey: string; rows: Record<string, any>[] }[], indexOffset?: number) => any[];
}

function parsePracticeQuestionRow(row: Record<string, any>, qIdx: number, parentModuleId: string) {
  const publicTestCases: any[] = [];
  const hiddenTestCases: any[] = [];

  // 1. Explicit Public Test Cases (1 to 10)
  for (let i = 1; i <= 10; i++) {
    const tcIn = row[`testcase_${i}_input`] ?? row[`testcase${i}_input`] ?? row[`test_case_${i}_input`] ?? (i === 1 ? row.testcase_input : undefined);
    const tcOut = row[`testcase_${i}_output`] ?? row[`testcase${i}_output`] ?? row[`test_case_${i}_output`] ?? (i === 1 ? row.testcase_output : undefined);
    if ((tcIn !== undefined && String(tcIn).trim() !== "") || (tcOut !== undefined && String(tcOut).trim() !== "")) {
      publicTestCases.push({
        id: `tc_${Date.now()}_${i}_${qIdx}`,
        name: `Test Case ${i}`,
        input: String(tcIn ?? "").trim(),
        expected_output: String(tcOut ?? "").trim(),
        expectedOutput: String(tcOut ?? "").trim(),
        is_hidden: false,
        isSample: i === 1,
      });
    }
  }

  // Sample fallback as public test case if no test cases provided
  if (publicTestCases.length === 0 && (row.sample_input || row.sample_output || row.sampleInput || row.sampleOutput)) {
    publicTestCases.push({
      id: `tc_${Date.now()}_sample_${qIdx}`,
      name: "Sample Test Case",
      input: String(row.sample_input ?? row.sampleInput ?? "").trim(),
      expected_output: String(row.sample_output ?? row.sampleOutput ?? "").trim(),
      expectedOutput: String(row.sample_output ?? row.sampleOutput ?? "").trim(),
      explanation: String(row.sample_explanation ?? row.sampleExplanation ?? "").trim(),
      is_hidden: false,
      isSample: true,
    });
  }

  // 2. Hidden Test Cases (1 to 10)
  for (let h = 1; h <= 10; h++) {
    const hIn = h === 1
      ? (row.hidden_testcase_input ?? row.hidden_testcase_1_input ?? row.hidden_input ?? row.hiddenInput)
      : (row[`hidden_testcase_${h}_input`] ?? row[`hidden_input_${h}`] ?? row[`hidden${h}Input`]);
    const hOut = h === 1
      ? (row.hidden_testcase_output ?? row.hidden_testcase_1_output ?? row.hidden_output ?? row.hiddenOutput)
      : (row[`hidden_testcase_${h}_output`] ?? row[`hidden_output_${h}`] ?? row[`hidden${h}Output`]);
    if ((hIn !== undefined && String(hIn).trim() !== "") || (hOut !== undefined && String(hOut).trim() !== "")) {
      hiddenTestCases.push({
        id: `tc_hid_${Date.now()}_${h}_${qIdx}`,
        name: `Hidden Test Case ${h}`,
        input: String(hIn ?? "").trim(),
        expected_output: String(hOut ?? "").trim(),
        expectedOutput: String(hOut ?? "").trim(),
        is_hidden: true,
      });
    }
  }

  const problemStatement = String(row.description || row.problemStatement || row.problem_statement || "").trim();
  const constraints = String(row.constraints || "").trim();
  const inputFormat = String(row.input_format || row.inputFormat || "").trim();
  const outputFormat = String(row.output_format || row.outputFormat || "").trim();
  const starterCodeStr = String(row.starterCode || row.starter_code || "").trim();

  const combinedCases = [...publicTestCases, ...hiddenTestCases];

  const starterTemplates: Record<string, string> = {};
  if (starterCodeStr) {
    const rawLang = String(row.language || row.lang || row.default_language || "").toLowerCase().trim();
    const matchedLang = CODING_LANGUAGES.find(l => l.id === rawLang || l.name.toLowerCase() === rawLang)?.id || "java";
    starterTemplates[matchedLang] = starterCodeStr;
  }
  CODING_LANGUAGES.forEach(l => {
    const lVal = row[`${l.id}_starter_code`] ?? row[`${l.id}_starter`] ?? row[`starter_code_${l.id}`];
    if (lVal !== undefined && String(lVal).trim() !== "") {
      starterTemplates[l.id] = String(lVal).trim();
    }
  });

  return {
    id: `cq_${Date.now()}_${parentModuleId}_${qIdx}`,
    subModuleId: parentModuleId,
    title: String(row.title || `Question ${qIdx + 1}`).trim(),
    description: problemStatement,
    difficulty: row.difficulty || "Easy",
    constraints,
    inputFormat,
    outputFormat,
    marks: Number(row.totalMarks) || 10,
    templates: starterTemplates,
    starterCode: starterCodeStr,
    publicTestCases,
    hiddenTestCases,
    test_cases: combinedCases,
    testCases: combinedCases,
  };
}

// ─── CODING PROBLEMS DYNAMIC LANGUAGE SCOPE GENERATOR ───────────────────────
export type CodingLanguageMode = "all" | "multi" | "single";

export interface CodingLanguageDef {
  id: string;
  name: string;
  category: "Popular" | "Systems" | "Modern" | "Backend" | "Mobile" | "Database" | "Shell";
}

export interface CodingTemplateOptions {
  languageMode?: CodingLanguageMode;
  selectedSingleLanguage?: string;
  selectedMultiLanguages?: string[];
}

export const CODING_LANGUAGES: CodingLanguageDef[] = [
  { id: "python", name: "Python", category: "Popular" },
  { id: "java", name: "Java", category: "Popular" },
  { id: "cpp", name: "C++", category: "Popular" },
  { id: "c", name: "C", category: "Popular" },
  { id: "javascript", name: "JavaScript", category: "Popular" },
  { id: "typescript", name: "TypeScript", category: "Popular" },
  { id: "csharp", name: "C#", category: "Popular" },
  { id: "go", name: "Go", category: "Systems" },
  { id: "rust", name: "Rust", category: "Systems" },
  { id: "kotlin", name: "Kotlin", category: "Modern" },
  { id: "php", name: "PHP", category: "Backend" },
  { id: "ruby", name: "Ruby", category: "Modern" },
  { id: "swift", name: "Swift", category: "Mobile" },
  { id: "scala", name: "Scala", category: "Modern" },
  { id: "dart", name: "Dart", category: "Mobile" },
  { id: "sql", name: "SQL", category: "Database" },
  { id: "bash", name: "Bash", category: "Shell" },
];

export const CODING_LANGUAGE_STARTERS: Record<string, string> = {
  python: `# Write your solution below\nimport sys\n\ndef solve():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    # TODO: Implement solution\n\nif __name__ == '__main__':\n    solve()\n`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: Implement solution\n    }\n}\n`,
  cpp: `#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // TODO: Implement solution\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // TODO: Implement solution\n    return 0;\n}\n`,
  javascript: `// Write your solution below\nconst fs = require('fs');\n\nfunction solve() {\n  const input = fs.readFileSync(0, 'utf-8').trim();\n  if (!input) return;\n  // TODO: Implement solution\n}\n\nsolve();\n`,
  typescript: `// Write your solution below\nimport * as fs from 'fs';\n\nfunction solve(): void {\n  const input = fs.readFileSync(0, 'utf-8').trim();\n  if (!input) return;\n  // TODO: Implement solution\n}\n\nsolve();\n`,
  csharp: `using System;\n\npublic class Program {\n    public static void Main(string[] args) {\n        // TODO: Implement solution\n    }\n}\n`,
  go: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nfunc main() {\n    // TODO: Implement solution\n}\n`,
  rust: `use std::io::{self, Read};\n\nfn main() {\n    let mut buffer = String::new();\n    io::stdin().read_to_string(&mut buffer).unwrap();\n    // TODO: Implement solution\n}\n`,
  kotlin: `import java.util.Scanner\n\nfun main() {\n    val scanner = Scanner(System.\`in\`)\n    // TODO: Implement solution\n}\n`,
  php: `<?php\n// Write your solution below\n$input = stream_get_contents(STDIN);\n// TODO: Implement solution\n?>\n`,
  ruby: `# Write your solution below\ninput = ARGF.read\n# TODO: Implement solution\n`,
  swift: `import Foundation\n// Write your solution below\n`,
  scala: `import scala.io.StdIn\n\nobject Solution {\n    def main(args: Array[String]): Unit = {\n        // TODO: Implement solution\n    }\n}\n`,
  dart: `import 'dart:io';\n\nvoid main() {\n  // TODO: Implement solution\n}\n`,
  sql: `-- Write your SQL query statement below\nSELECT * FROM table_name;\n`,
  bash: `#!/bin/bash\n# Write your solution below\n`,
};

export function getCodingProblemTemplateConfig(options?: CodingTemplateOptions): ModuleTemplateConfig {
  const mode: CodingLanguageMode = options?.languageMode || "all";
  const singleLang = (options?.selectedSingleLanguage || "python").toLowerCase();
  const multiLangs = (options?.selectedMultiLanguages && options.selectedMultiLanguages.length > 0)
    ? options.selectedMultiLanguages.map(l => l.toLowerCase())
    : ["python", "java", "cpp"];

  const isSqlSingle = mode === "single" && singleLang === "sql";
  const singleLangDef = CODING_LANGUAGES.find(l => l.id === singleLang) || { id: singleLang, name: singleLang.toUpperCase() };

  // Base Columns common to all coding challenges
  const baseColumns: ColumnDefinition[] = [
    {
      key: "title",
      label: "Problem Title",
      type: "string",
      required: true,
      description: "Title of the coding challenge (e.g. 'Two Sum', 'Reverse Linked List')",
      sampleValue: isSqlSingle ? "Combine Two Tables" : "Two Sum",
    },
    {
      key: "difficulty",
      label: "Difficulty",
      type: "enum",
      required: true,
      options: ["Easy", "Medium", "Hard"],
      description: "Challenge difficulty level: Easy, Medium, or Hard",
      sampleValue: "Easy",
    },
    {
      key: "category",
      label: "Category / Domain",
      type: "string",
      required: false,
      defaultValue: isSqlSingle ? "Databases" : "Algorithms",
      description: "Topic domain (e.g. 'Algorithms', 'Databases', 'Data Structures', 'Strings')",
      sampleValue: isSqlSingle ? "Databases" : "Algorithms",
    },
    {
      key: "topic_tags",
      label: "Topic Tags (Comma-separated)",
      type: "string",
      required: false,
      description: "Comma-separated search tags (e.g. 'Array, Hash Table' or 'SQL, Join')",
      sampleValue: isSqlSingle ? "SQL, Join, Database" : "Array, Hash Table",
    },
    {
      key: "points",
      label: "Points",
      type: "number",
      required: false,
      defaultValue: 100,
      description: "Score points awarded upon full pass (e.g. 10, 50, 100)",
      sampleValue: 10,
    },
    {
      key: "acceptance_rate",
      label: "Acceptance Rate",
      type: "string",
      required: false,
      defaultValue: "65%",
      description: "Benchmark acceptance percentage (e.g. '49.8%')",
      sampleValue: isSqlSingle ? "72.4%" : "49.8%",
    },
    {
      key: "description",
      label: "Problem Statement (Markdown)",
      type: "string",
      required: true,
      description: "Detailed problem description, task instructions, and rules.",
      sampleValue: isSqlSingle
        ? "Table: Person\n+-------------+---------+\n| Column Name | Type    |\n+-------------+---------+\n| personId    | int     |\n| lastName    | varchar |\n| firstName   | varchar |\n+-------------+---------+\npersonId is the primary key for this table.\n\nTable: Address\n+-------------+---------+\n| Column Name | Type    |\n+-------------+---------+\n| addressId   | int     |\n| personId    | int     |\n| city        | varchar |\n| state       | varchar |\n+-------------+---------+\n\nWrite a solution to report firstName, lastName, city, and state of each person in the Person table."
        : "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    },
    {
      key: "constraints",
      label: "Constraints",
      type: "string",
      required: false,
      description: "Execution and boundary constraints",
      sampleValue: isSqlSingle ? "Person table has up to 1000 rows.\nAddress table has up to 1000 rows." : "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
    },
    {
      key: "input_format",
      label: "Input Format",
      type: "string",
      required: false,
      description: isSqlSingle ? "Relational database tables schema" : "Explanation of standard input structure",
      sampleValue: isSqlSingle ? "Person and Address relational tables." : "Line 1: Space-separated integers for nums.\nLine 2: target integer.",
    },
    {
      key: "output_format",
      label: "Output Format",
      type: "string",
      required: false,
      description: isSqlSingle ? "Result set query format" : "Explanation of standard output structure",
      sampleValue: isSqlSingle ? "Table with columns: firstName, lastName, city, state." : "Print the two 0-indexed positions separated by a space.",
    },
    {
      key: "sample_input",
      label: "Sample Input (Example 1)",
      type: "string",
      required: false,
      description: "Example input shown in problem overview",
      sampleValue: isSqlSingle ? "Person: [[1, 'Wang', 'Allen']], Address: [[1, 2, 'New York City', 'New York']]" : "2 7 11 15\n9",
    },
    {
      key: "sample_output",
      label: "Sample Output (Example 1)",
      type: "string",
      required: false,
      description: "Expected output for Example 1",
      sampleValue: isSqlSingle ? "Allen|Wang|None|None" : "0 1",
    },
    {
      key: "sample_explanation",
      label: "Sample Explanation",
      type: "string",
      required: false,
      description: "Reasoning for Example 1",
      sampleValue: isSqlSingle ? "Allen has addressId null in Address table." : "Because nums[0] + nums[1] == 9, we return 0 1.",
    },
    {
      key: "testcase_1_input",
      label: "Test Case 1 Input",
      type: "string",
      required: false,
      description: "First public test case input for automated grader",
      sampleValue: isSqlSingle ? "SELECT * FROM Person;" : "2 7 11 15\n9",
    },
    {
      key: "testcase_1_output",
      label: "Test Case 1 Expected Output",
      type: "string",
      required: false,
      description: "First public test case expected output",
      sampleValue: isSqlSingle ? "Allen|Wang|None|None" : "0 1",
    },
    {
      key: "testcase_2_input",
      label: "Test Case 2 Input",
      type: "string",
      required: false,
      description: "Second public testcase input",
      sampleValue: isSqlSingle ? "SELECT COUNT(*) FROM Person;" : "3 2 4\n6",
    },
    {
      key: "testcase_2_output",
      label: "Test Case 2 Expected Output",
      type: "string",
      required: false,
      description: "Second public testcase expected output",
      sampleValue: isSqlSingle ? "1" : "1 2",
    },
    {
      key: "testcase_3_input",
      label: "Test Case 3 Input",
      type: "string",
      required: false,
      description: "Third public testcase input",
      sampleValue: isSqlSingle ? "SELECT * FROM Address;" : "3 3\n6",
    },
    {
      key: "testcase_3_output",
      label: "Test Case 3 Expected Output",
      type: "string",
      required: false,
      description: "Third public testcase expected output",
      sampleValue: isSqlSingle ? "1|2|New York City|New York" : "0 1",
    },
    {
      key: "testcase_4_input",
      label: "Test Case 4 Input",
      type: "string",
      required: false,
      description: "Fourth public testcase input",
      sampleValue: "1 5\n6",
    },
    {
      key: "testcase_4_output",
      label: "Test Case 4 Expected Output",
      type: "string",
      required: false,
      description: "Fourth public testcase expected output",
      sampleValue: "0 1",
    },
    {
      key: "testcase_5_input",
      label: "Test Case 5 Input",
      type: "string",
      required: false,
      description: "Fifth public testcase input",
      sampleValue: "4 8\n12",
    },
    {
      key: "testcase_5_output",
      label: "Test Case 5 Expected Output",
      type: "string",
      required: false,
      description: "Fifth public testcase expected output",
      sampleValue: "0 1",
    },
    {
      key: "hidden_testcase_input",
      label: "Hidden Test Case 1 Input",
      type: "string",
      required: false,
      description: "Private/Hidden test case 1 to prevent hardcoding",
      sampleValue: isSqlSingle ? "SELECT firstName FROM Person WHERE personId = 1;" : "3 3\n6",
    },
    {
      key: "hidden_testcase_output",
      label: "Hidden Test Case 1 Expected Output",
      type: "string",
      required: false,
      description: "Expected output for hidden test case 1",
      sampleValue: isSqlSingle ? "Allen" : "0 1",
    },
    {
      key: "hidden_testcase_2_input",
      label: "Hidden Test Case 2 Input",
      type: "string",
      required: false,
      description: "Private/Hidden testcase 2 evaluated during submit",
      sampleValue: "10 20 30\n50",
    },
    {
      key: "hidden_testcase_2_output",
      label: "Hidden Test Case 2 Expected Output",
      type: "string",
      required: false,
      description: "Expected output for hidden testcase 2",
      sampleValue: "1 2",
    },
    {
      key: "hidden_testcase_3_input",
      label: "Hidden Test Case 3 Input",
      type: "string",
      required: false,
      description: "Private/Hidden testcase 3 evaluated during submit",
      sampleValue: "100 200\n300",
    },
    {
      key: "hidden_testcase_3_output",
      label: "Hidden Test Case 3 Expected Output",
      type: "string",
      required: false,
      description: "Expected output for hidden testcase 3",
      sampleValue: "0 1",
    },
    {
      key: "hidden_testcase_4_input",
      label: "Hidden Test Case 4 Input",
      type: "string",
      required: false,
      description: "Private/Hidden testcase 4 evaluated during submit",
      sampleValue: "-1 -2\n-3",
    },
    {
      key: "hidden_testcase_4_output",
      label: "Hidden Test Case 4 Expected Output",
      type: "string",
      required: false,
      description: "Expected output for hidden testcase 4",
      sampleValue: "0 1",
    },
    {
      key: "hidden_testcase_5_input",
      label: "Hidden Test Case 5 Input",
      type: "string",
      required: false,
      description: "Private/Hidden testcase 5 evaluated during submit",
      sampleValue: "0 0\n0",
    },
    {
      key: "hidden_testcase_5_output",
      label: "Hidden Test Case 5 Expected Output",
      type: "string",
      required: false,
      description: "Expected output for hidden testcase 5",
      sampleValue: "0 1",
    },
    {
      key: "time_limit_ms",
      label: "Time Limit (ms)",
      type: "number",
      required: false,
      defaultValue: 2000,
      description: "Execution timeout in milliseconds (default: 2000)",
      sampleValue: 2000,
    },
    {
      key: "memory_limit_mb",
      label: "Memory Limit (MB)",
      type: "number",
      required: false,
      defaultValue: 256,
      description: "Memory threshold in megabytes (default: 256)",
      sampleValue: 256,
    },
  ];

  let modeSpecificColumns: ColumnDefinition[] = [];
  let templateFileName = "coding_problems_all_languages_template.xlsx";
  let displayName = "Coding Problems Repository Template (All Languages)";
  let description = "Universal LeetCode-style coding challenges template open to all platform compilers.";

  if (mode === "all") {
    modeSpecificColumns = [
      {
        key: "starter_code",
        label: "Starter Code (Optional)",
        type: "string",
        required: false,
        description: "General starter code boilerplate. If empty, platform templates are automatically assigned.",
        sampleValue: CODING_LANGUAGE_STARTERS.python,
      },
    ];
  } else if (mode === "single") {
    templateFileName = `coding_problems_${singleLang}_template.xlsx`;
    displayName = `Coding Problems Template (Single Language: ${singleLangDef.name})`;
    description = `Targeted template configured exclusively for ${singleLangDef.name}. Submissions will be locked to ${singleLangDef.name}.`;

    if (isSqlSingle) {
      modeSpecificColumns = [
        {
          key: "sql_engine",
          label: "SQL Engine",
          type: "enum",
          required: false,
          defaultValue: "postgresql",
          options: ["postgresql", "mysql", "sqlite", "sqlserver", "oracle", "mariadb"],
          description: "Relational database engine dialect: postgresql, mysql, sqlite, sqlserver",
          sampleValue: "postgresql",
        },
        {
          key: "schema_sql",
          label: "Schema SQL (DDL Tables & Inserts)",
          type: "string",
          required: true,
          description: "Database table schema and sample INSERT data for sandbox environment",
          sampleValue: "CREATE TABLE Person (personId INT PRIMARY KEY, lastName VARCHAR(50), firstName VARCHAR(50));\nCREATE TABLE Address (addressId INT PRIMARY KEY, personId INT, city VARCHAR(50), state VARCHAR(50));\nINSERT INTO Person VALUES (1, 'Wang', 'Allen'), (2, 'Alice', 'Bob');\nINSERT INTO Address VALUES (1, 2, 'New York City', 'New York');",
        },
        {
          key: "solution_sql",
          label: "Solution Query (SQL)",
          type: "string",
          required: false,
          description: "Reference solution SQL query",
          sampleValue: "SELECT p.firstName, p.lastName, a.city, a.state FROM Person p LEFT JOIN Address a ON p.personId = a.personId;",
        },
        {
          key: "starter_code",
          label: "Starter Query Template (SQL)",
          type: "string",
          required: false,
          description: "Starter SQL query boilerplate presented to the learner",
          sampleValue: "-- Write a solution to report firstName, lastName, city, and state of each person\nSELECT p.firstName, p.lastName, a.city, a.state\nFROM Person p\nLEFT JOIN Address a ON p.personId = a.personId;\n",
        },
      ];
    } else {
      modeSpecificColumns = [
        {
          key: "language",
          label: "Language",
          type: "enum",
          required: false,
          defaultValue: singleLangDef.name,
          options: CODING_LANGUAGES.map(l => l.name),
          description: `Single locked programming language for this problem: ${singleLangDef.name}`,
          sampleValue: singleLangDef.name,
        },
        {
          key: "starter_code",
          label: `Starter Code (${singleLangDef.name})`,
          type: "string",
          required: false,
          description: `Starter boilerplate code provided to learners in ${singleLangDef.name}`,
          sampleValue: CODING_LANGUAGE_STARTERS[singleLang] || CODING_LANGUAGE_STARTERS.python,
        },
      ];
    }
  } else if (mode === "multi") {
    templateFileName = "coding_problems_multi_language_template.xlsx";
    const selectedNames = multiLangs.map(id => CODING_LANGUAGES.find(l => l.id === id)?.name || id.toUpperCase());
    displayName = `Coding Problems Template (Multi Language: ${selectedNames.join(", ")})`;
    description = `Multi-language template with dedicated starter code columns for each chosen language (${selectedNames.join(", ")}).`;

    modeSpecificColumns = [
      {
        key: "allowed_languages",
        label: "Allowed Languages (Comma-separated)",
        type: "string",
        required: false,
        defaultValue: multiLangs.join(", "),
        description: `Comma-separated list of enabled compilers (default: ${multiLangs.join(", ")})`,
        sampleValue: multiLangs.join(", "),
      },
      {
        key: "default_language",
        label: "Default Language",
        type: "string",
        required: false,
        defaultValue: multiLangs[0] || "python",
        description: "Language selected by default when learner opens the problem",
        sampleValue: multiLangs[0] || "python",
      },
    ];

    // Add a dedicated column for each selected language
    multiLangs.forEach(langId => {
      const lDef = CODING_LANGUAGES.find(l => l.id === langId) || { id: langId, name: langId.toUpperCase() };
      modeSpecificColumns.push({
        key: `${langId}_starter_code`,
        label: `${lDef.name} Starter Code`,
        type: "string",
        required: false,
        description: `Starter code template for ${lDef.name}`,
        sampleValue: CODING_LANGUAGE_STARTERS[langId] || CODING_LANGUAGE_STARTERS.python,
      });
    });
  }

  const columns = [...baseColumns, ...modeSpecificColumns];

  // Sample Rows Generation
  let sampleRows: Record<string, any>[] = [];

  if (isSqlSingle) {
    sampleRows = [
      {
        title: "Combine Two Tables",
        difficulty: "Easy",
        category: "Databases",
        topic_tags: "SQL, Database, Join",
        points: 10,
        acceptance_rate: "72.4%",
        description: "Table: Person\n+-------------+---------+\n| Column Name | Type    |\n+-------------+---------+\n| personId    | int     |\n| lastName    | varchar |\n| firstName   | varchar |\n+-------------+---------+\npersonId is the primary key column for this table.\n\nTable: Address\n+-------------+---------+\n| Column Name | Type    |\n+-------------+---------+\n| addressId   | int     |\n| personId    | int     |\n| city        | varchar |\n| state       | varchar |\n+-------------+---------+\n\nWrite a solution to report the first name, last name, city, and state of each person in the Person table. If the address of a personId is not present in the Address table, report null instead.",
        constraints: "Person table has up to 1000 rows.\nAddress table has up to 1000 rows.",
        input_format: "Person and Address relational tables.",
        output_format: "Result table with columns: firstName, lastName, city, state in any order.",
        sql_engine: "postgresql",
        schema_sql: "CREATE TABLE Person (personId INT PRIMARY KEY, lastName VARCHAR(50), firstName VARCHAR(50));\nCREATE TABLE Address (addressId INT PRIMARY KEY, personId INT, city VARCHAR(50), state VARCHAR(50));\nINSERT INTO Person VALUES (1, 'Wang', 'Allen'), (2, 'Alice', 'Bob');\nINSERT INTO Address VALUES (1, 2, 'New York City', 'New York');",
        solution_sql: "SELECT p.firstName, p.lastName, a.city, a.state FROM Person p LEFT JOIN Address a ON p.personId = a.personId;",
        starter_code: "-- Write a solution to report firstName, lastName, city, and state of each person\nSELECT p.firstName, p.lastName, a.city, a.state\nFROM Person p\nLEFT JOIN Address a ON p.personId = a.personId;\n",
        sample_input: "Person: [[1, 'Wang', 'Allen'], [2, 'Alice', 'Bob']], Address: [[1, 2, 'New York City', 'New York']]",
        sample_output: "Allen|Wang|None|None\nBob|Alice|New York City|New York",
        sample_explanation: "Allen has addressId null, Bob has city New York City and state New York.",
        testcase_1_input: "SELECT * FROM Person;",
        testcase_1_output: "1|Wang|Allen\n2|Alice|Bob",
        testcase_2_input: "SELECT COUNT(*) FROM Person;",
        testcase_2_output: "2",
        testcase_3_input: "SELECT * FROM Address;",
        testcase_3_output: "1|2|New York City|New York",
        hidden_testcase_input: "SELECT firstName FROM Person WHERE personId = 1;",
        hidden_testcase_output: "Allen",
        time_limit_ms: 2000,
        memory_limit_mb: 256,
      },
      {
        title: "Second Highest Salary",
        difficulty: "Medium",
        category: "Databases",
        topic_tags: "SQL, Database, Subquery",
        points: 20,
        acceptance_rate: "39.1%",
        description: "Table: Employee\n+-------------+------+\n| Column Name | Type |\n+-------------+------+\n| id          | int  |\n| salary      | int  |\n+-------------+------+\nid is the primary key column for this table.\nEach row contains information about the salary of an employee.\n\nWrite a solution to find the second highest distinct salary from the Employee table. If there is no second highest salary, return null.",
        constraints: "1 <= Employee table length <= 10^4",
        input_format: "Employee table with id and salary integers.",
        output_format: "Result table with single column SecondHighestSalary.",
        sql_engine: "postgresql",
        schema_sql: "CREATE TABLE Employee (id INT PRIMARY KEY, salary INT);\nINSERT INTO Employee VALUES (1, 100), (2, 200), (3, 300);",
        solution_sql: "SELECT MAX(salary) AS SecondHighestSalary FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee);",
        starter_code: "-- Write a solution to find the second highest distinct salary\nSELECT MAX(salary) AS SecondHighestSalary\nFROM Employee\nWHERE salary < (SELECT MAX(salary) FROM Employee);\n",
        sample_input: "Employee: [[1, 100], [2, 200], [3, 300]]",
        sample_output: "200",
        sample_explanation: "The highest salary is 300 and the second highest salary is 200.",
        testcase_1_input: "SELECT * FROM Employee;",
        testcase_1_output: "1|100\n2|200\n3|300",
        testcase_2_input: "SELECT MAX(salary) FROM Employee;",
        testcase_2_output: "300",
        hidden_testcase_input: "DELETE FROM Employee WHERE id = 3; SELECT * FROM Employee;",
        hidden_testcase_output: "1|100\n2|200",
        time_limit_ms: 2000,
        memory_limit_mb: 256,
      },
      {
        title: "Customers Who Never Order",
        difficulty: "Easy",
        category: "Databases",
        topic_tags: "SQL, Database",
        points: 10,
        acceptance_rate: "67.8%",
        description: "Table: Customers\n+-------------+---------+\n| Column Name | Type    |\n+-------------+---------+\n| id          | int     |\n| name        | varchar |\n+-------------+---------+\nid is the primary key column for this table.\n\nTable: Orders\n+-------------+------+\n| Column Name | Type |\n+-------------+------+\n| id          | int  |\n| customerId  | int  |\n+-------------+------+\nid is the primary key column for this table.\ncustomerId is a foreign key of the ID from the Customers table.\n\nWrite a solution to find all customers who never order anything.",
        constraints: "Customers up to 10^4 rows, Orders up to 10^4 rows.",
        input_format: "Customers and Orders relational tables.",
        output_format: "Result table with single column Customers.",
        sql_engine: "postgresql",
        schema_sql: "CREATE TABLE Customers (id INT PRIMARY KEY, name VARCHAR(50));\nCREATE TABLE Orders (id INT PRIMARY KEY, customerId INT);\nINSERT INTO Customers VALUES (1, 'Joe'), (2, 'Henry'), (3, 'Sam'), (4, 'Max');\nINSERT INTO Orders VALUES (1, 3), (2, 1);",
        solution_sql: "SELECT name AS Customers FROM Customers c LEFT JOIN Orders o ON c.id = o.customerId WHERE o.customerId IS NULL;",
        starter_code: "-- Write a solution to find all customers who never order anything\nSELECT name AS Customers\nFROM Customers\nWHERE id NOT IN (SELECT customerId FROM Orders WHERE customerId IS NOT NULL);\n",
        sample_input: "Customers: [[1, 'Joe'], [2, 'Henry'], [3, 'Sam'], [4, 'Max']], Orders: [[1, 3], [2, 1]]",
        sample_output: "Henry\nMax",
        sample_explanation: "Henry and Max never made any orders.",
        testcase_1_input: "SELECT * FROM Customers;",
        testcase_1_output: "1|Joe\n2|Henry\n3|Sam\n4|Max",
        hidden_testcase_input: "SELECT COUNT(*) FROM Customers;",
        hidden_testcase_output: "4",
        time_limit_ms: 2000,
        memory_limit_mb: 256,
      },
    ];
  } else {
    const defaultStarter = CODING_LANGUAGE_STARTERS[singleLang] || CODING_LANGUAGE_STARTERS.python;

    sampleRows = [
      {
        title: "Two Sum",
        difficulty: "Easy",
        category: "Algorithms",
        topic_tags: "Array, Hash Table",
        points: 10,
        acceptance_rate: "49.8%",
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
        input_format: "Line 1: Space-separated integers for nums.\nLine 2: target integer.",
        output_format: "Print the two 0-indexed positions separated by a space.",
        sample_input: "2 7 11 15\n9",
        sample_output: "0 1",
        sample_explanation: "nums[0] + nums[1] == 2 + 7 == 9, so output is 0 1.",
        testcase_1_input: "2 7 11 15\n9",
        testcase_1_output: "0 1",
        testcase_2_input: "3 2 4\n6",
        testcase_2_output: "1 2",
        testcase_3_input: "3 3\n6",
        testcase_3_output: "0 1",
        hidden_testcase_input: "3 3\n6",
        hidden_testcase_output: "0 1",
        time_limit_ms: 2000,
        memory_limit_mb: 256,
        starter_code: defaultStarter,
        language: singleLangDef.name,
        allowed_languages: multiLangs.join(", "),
        default_language: multiLangs[0] || "python",
      },
      {
        title: "Valid Palindrome",
        difficulty: "Easy",
        category: "Strings",
        topic_tags: "Two Pointers, String",
        points: 20,
        acceptance_rate: "45.2%",
        description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.",
        constraints: "1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.",
        input_format: "A single line containing the string s.",
        output_format: "Print 'true' or 'false'.",
        sample_input: "A man, a plan, a canal: Panama",
        sample_output: "true",
        sample_explanation: "'amanaplanacanalpanama' is a palindrome.",
        testcase_1_input: "A man, a plan, a canal: Panama",
        testcase_1_output: "true",
        testcase_2_input: "race a car",
        testcase_2_output: "false",
        hidden_testcase_input: " ",
        hidden_testcase_output: "true",
        time_limit_ms: 2000,
        memory_limit_mb: 256,
        starter_code: defaultStarter,
        language: singleLangDef.name,
        allowed_languages: multiLangs.join(", "),
        default_language: multiLangs[0] || "python",
      },
      {
        title: "Maximum Subarray Sum",
        difficulty: "Medium",
        category: "Algorithms",
        topic_tags: "Array, Dynamic Programming",
        points: 50,
        acceptance_rate: "50.4%",
        description: "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
        constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        input_format: "A single line containing space-separated integers of the array.",
        output_format: "Print the maximum subarray sum.",
        sample_input: "-2 1 -3 4 -1 2 1 -5 4",
        sample_output: "6",
        sample_explanation: "The subarray [4, -1, 2, 1] has the largest sum 6.",
        testcase_1_input: "-2 1 -3 4 -1 2 1 -5 4",
        testcase_1_output: "6",
        testcase_2_input: "1",
        testcase_2_output: "1",
        hidden_testcase_input: "5 4 -1 7 8",
        hidden_testcase_output: "23",
        time_limit_ms: 2000,
        memory_limit_mb: 256,
        starter_code: defaultStarter,
        language: singleLangDef.name,
        allowed_languages: multiLangs.join(", "),
        default_language: multiLangs[0] || "python",
      },
    ];

    // If multi mode, populate language-specific starter codes on sample rows
    if (mode === "multi") {
      sampleRows.forEach(row => {
        multiLangs.forEach(langId => {
          row[`${langId}_starter_code`] = CODING_LANGUAGE_STARTERS[langId] || CODING_LANGUAGE_STARTERS.python;
        });
      });
    }
  }

  // Universal mapToPayload capable of processing all modes
  const mapToPayload = (row: Record<string, any>, idx: number) => {
    const rawTitle = String(row.title || `Coding Challenge ${idx + 1}`).trim();
    const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const diffRaw = String(row.difficulty || "Easy").toLowerCase().trim();
    const difficulty = (diffRaw === "hard" ? "hard" : diffRaw === "medium" ? "medium" : "easy") as "easy" | "medium" | "hard";

    const tags = row.topic_tags
      ? String(row.topic_tags).split(",").map((s) => s.trim()).filter(Boolean)
      : [isSqlSingle ? "Databases" : "Algorithms"];

    const cleanCsvVal = (v: any) =>
      String(v ?? "")
        .replace(/\\r\\n/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\r\n/g, "\n")
        .trim();

    const testCases: any[] = [];

    // Scan numbered test cases
    for (let i = 1; i <= 20; i++) {
      const inpVal = row[`testcase_${i}_input`] ?? row[`test_case_${i}_input`] ?? row[`input_${i}`] ?? row[`tc${i}_input`];
      const outVal = row[`testcase_${i}_output`] ?? row[`test_case_${i}_output`] ?? row[`output_${i}`] ?? row[`tc${i}_output`];

      if ((inpVal !== undefined && String(inpVal).trim() !== "") || (outVal !== undefined && String(outVal).trim() !== "")) {
        testCases.push({
          id: `tc-${Date.now()}-${i}-${idx}`,
          name: `Test Case ${i}`,
          input: cleanCsvVal(inpVal),
          expected_output: cleanCsvVal(outVal),
          is_hidden: false,
          is_enabled: true,
          weight: 10,
          order_index: testCases.length,
        });
      }
    }

    // Sample fallback as Test Case 1 if no test cases given
    if (testCases.length === 0 && (row.sample_input || row.sample_output)) {
      testCases.push({
        id: `tc-${Date.now()}-1-${idx}`,
        name: "Test Case 1 (Sample)",
        input: cleanCsvVal(row.sample_input),
        expected_output: cleanCsvVal(row.sample_output),
        is_hidden: false,
        is_enabled: true,
        weight: 10,
        order_index: 0,
      });
    }

    // Hidden Test Cases
    for (let h = 1; h <= 10; h++) {
      const hInp = h === 1
        ? (row.hidden_testcase_input ?? row.hidden_testcase_1_input ?? row.hidden_input ?? row.hidden_test_case_1_input)
        : (row[`hidden_testcase_${h}_input`] ?? row[`hidden_testcase_${h}`] ?? row[`hidden_input_${h}`] ?? row[`hidden_${h}_input`]);
      const hOut = h === 1
        ? (row.hidden_testcase_output ?? row.hidden_testcase_1_output ?? row.hidden_output ?? row.hidden_test_case_1_output)
        : (row[`hidden_testcase_${h}_output`] ?? row[`hidden_testcase_${h}`] ?? row[`hidden_output_${h}`] ?? row[`hidden_${h}_output`]);

      if ((hInp !== undefined && String(hInp).trim() !== "") || (hOut !== undefined && String(hOut).trim() !== "")) {
        testCases.push({
          id: `tc-${Date.now()}-h${h}-${idx}`,
          name: `Hidden Case ${h}`,
          input: cleanCsvVal(hInp),
          expected_output: cleanCsvVal(hOut),
          is_hidden: true,
          is_enabled: true,
          weight: 20,
          order_index: testCases.length,
        });
      }
    }

    // Example Cases
    const exampleCases: any[] = [];
    for (let e = 1; e <= 5; e++) {
      const eInp = e === 1
        ? (row.sample_input ?? row.example_1_input ?? row.sample_input_1 ?? row.example_input)
        : (row[`sample_input_${e}`] ?? row[`example_${e}_input`] ?? row[`example_input_${e}`]);
      const eOut = e === 1
        ? (row.sample_output ?? row.example_1_output ?? row.sample_output_1 ?? row.example_output)
        : (row[`sample_output_${e}`] ?? row[`example_${e}_output`] ?? row[`example_output_${e}`]);
      const eExp = e === 1
        ? (row.sample_explanation ?? row.example_1_explanation ?? row.sample_explanation_1 ?? row.example_explanation)
        : (row[`sample_explanation_${e}`] ?? row[`example_${e}_explanation`] ?? row[`example_explanation_${e}`]);

      if ((eInp !== undefined && String(eInp).trim() !== "") || (eOut !== undefined && String(eOut).trim() !== "")) {
        exampleCases.push({
          id: `example-${e}`,
          input: String(eInp || "").replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").trim(),
          output: String(eOut || "").replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").trim(),
          explanation: String(eExp || "").trim(),
        });
      }
    }

    // Determine Language Scope & Templates
    let templates: Record<string, string> = {};

    // 1. Check for language-specific starter code columns (e.g. python_starter_code, java_starter_code, etc.)
    CODING_LANGUAGES.forEach(l => {
      const lCode = row[`${l.id}_starter_code`] ?? row[`${l.id}_starter`] ?? row[`starter_code_${l.id}`] ?? row[`code_${l.id}`];
      if (lCode !== undefined && String(lCode).trim() !== "") {
        templates[l.id] = String(lCode).trim();
      }
    });

    // 2. Check for general starter_code column
    const genStarter = row.starter_code ?? row.starterCode ?? row.code ?? row.boilerplate;
    const rowLangRaw = String(row.language || row.lang || "").toLowerCase().trim();
    const matchedLang = CODING_LANGUAGES.find(l => l.id === rowLangRaw || l.name.toLowerCase() === rowLangRaw)?.id;

    if (genStarter && String(genStarter).trim() !== "") {
      const targetLang = matchedLang || (mode === "single" ? singleLang : "python");
      templates[targetLang] = String(genStarter).trim();
    }

    // 3. Allowed Languages resolution - strictly based on user selection scope
    let allowed_languages: string[] | undefined = undefined;
    if (row.allowed_languages) {
      allowed_languages = String(row.allowed_languages)
        .split(/[,|;\s]+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    } else if (mode === "single") {
      allowed_languages = [singleLang];
    } else if (mode === "multi" && multiLangs && multiLangs.length > 0) {
      allowed_languages = multiLangs;
    } else if (matchedLang) {
      allowed_languages = [matchedLang];
    } else if (Object.keys(templates).length > 0) {
      allowed_languages = Object.keys(templates);
    }

    // 4. Retain ONLY starter codes explicitly provided by author - NEVER inject default boilerplate!
    const prunedTemplates: Record<string, string> = {};
    if (allowed_languages && allowed_languages.length > 0) {
      allowed_languages.forEach(lId => {
        if (templates[lId] && templates[lId].trim()) {
          prunedTemplates[lId] = templates[lId].trim();
        }
      });
    } else {
      Object.entries(templates).forEach(([lId, codeStr]) => {
        if (codeStr && codeStr.trim()) {
          prunedTemplates[lId] = codeStr.trim();
        }
      });
    }
    templates = prunedTemplates;

    // 5. Default Language resolution
    const default_language =
      (row.default_language ? String(row.default_language).trim().toLowerCase() : undefined) ||
      matchedLang ||
      allowed_languages?.[0] ||
      (mode === "single" ? singleLang : "python");

    // 6. SQL Database properties
    const isSql = (row.category && String(row.category).toLowerCase().includes("database")) ||
      (row.category && String(row.category).toLowerCase().includes("sql")) ||
      row.sql_engine ||
      row.schema_sql ||
      (mode === "single" && singleLang === "sql");

    const sql_engine = row.sql_engine ? String(row.sql_engine).trim().toLowerCase() : (isSql ? "postgresql" : undefined);
    const schema_sql = row.schema_sql ? cleanCsvVal(row.schema_sql) : undefined;
    const solution_sql = row.solution_sql ? cleanCsvVal(row.solution_sql) : undefined;

    return {
      id: `problem-${slug}-${Date.now()}-${idx}`,
      title: rawTitle,
      slug,
      description: String(row.description || "").trim(),
      difficulty,
      category: isSql ? "Databases" : String(row.category || "Algorithms").trim(),
      topic_tags: tags,
      points: Number(row.points) || 100,
      acceptance_rate: row.acceptance_rate ? String(row.acceptance_rate).trim() : undefined,
      constraints: String(row.constraints || "").trim(),
      input_format: String(row.input_format || "").trim(),
      output_format: String(row.output_format || "").trim(),
      sample_input: String(row.sample_input || ""),
      sample_output: String(row.sample_output || ""),
      example_cases: exampleCases,
      templates,
      allowed_languages,
      allowedLanguages: allowed_languages,
      default_language,
      defaultLanguage: default_language,
      sql_engine,
      schema_sql,
      solution_sql,
      test_cases: testCases,
      time_limit_ms: Number(row.time_limit_ms) || 2000,
      memory_limit_mb: Number(row.memory_limit_mb) || 256,
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  return {
    moduleType: "coding_problem",
    displayName,
    description,
    templateFileName,
    columns,
    sampleRows,
    mapToPayload,
  };
}

export const TEMPLATE_CONFIGS: Record<string, ModuleTemplateConfig> = {
  // ─── 0. COURSE MAIN MODULE TEMPLATE ─────────────────────────────────────────
  main_module: {
    moduleType: "main_module",
    displayName: "Course Main Module / Unit Template",
    description: "Template for creating high-level Main Modules / Chapters (e.g. 'Module 1: Java Basics') in bulk.",
    templateFileName: "course_main_modules_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Main Module Title",
        type: "string",
        required: true,
        description: "Title of the main chapter/module (e.g. 'Module 1: Introduction to Java')",
        sampleValue: "Module 1: Introduction to Java Foundations",
      },
      {
        key: "description",
        label: "Module Description",
        type: "string",
        required: false,
        description: "Overview and learning goals of this unit",
        sampleValue: "Core principles of Java language, JVM architecture, and object-oriented syntax.",
      },
    ],
    sampleRows: [
      {
        title: "Module 1: Java Foundations & Object-Oriented Principles",
        description: "Introduction to JVM, JDK, primitives, classes, objects, and memory model."
      },
      {
        title: "Module 2: Advanced Data Structures & Collections Framework",
        description: "Lists, Sets, Maps, Queues, Iterators, and Big-O computational complexities."
      },
      {
        title: "Module 3: Concurrency, Multithreading & Async Programming",
        description: "Threads, Executers, Locks, Concurrent collections, and synchronization mechanisms."
      },
      {
        title: "Module 4: Spring Boot Microservices & REST API Development",
        description: "Spring Boot architecture, dependency injection, JPA/Hibernate, and security."
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `mod_bulk_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      subModules: []
    })
  },

  // ─── 1. COURSE SUB-MODULE TEMPLATE ──────────────────────────────────────────
  course: {
    moduleType: "course",
    displayName: "Course Sub-Module / Lesson Template",
    description: "Template for creating video lessons, reading documents, coding exercises, and quizzes inside Course modules.",
    templateFileName: "course_sub_modules_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Sub-Module Title",
        type: "string",
        required: true,
        description: "Title of the lesson or sub-module (e.g. '1.1 Introduction to Variables')",
        sampleValue: "1.1 Introduction to TypeScript",
      },
      {
        key: "type",
        label: "Delivery Type",
        type: "enum",
        required: true,
        options: ["video", "reading", "coding", "quiz"],
        description: "Lesson delivery medium: video, reading, coding, or quiz",
        sampleValue: "video",
      },
      {
        key: "duration",
        label: "Duration",
        type: "string",
        required: false,
        description: "Estimated duration (e.g. '45 mins', '1 hr 15 mins', or 'Self-paced')",
        sampleValue: "45 mins",
      },
      {
        key: "videoUrl",
        label: "Video Link",
        type: "url",
        required: false,
        description: "Google Drive, YouTube, or MP4 link for video lessons",
        sampleValue: "https://drive.google.com/file/d/sample-video-id/view",
        validate: (val, row) => {
          if (row.type === "video" && !val) {
            return "Video Link is recommended for 'video' delivery type";
          }
          if (val && !val.startsWith("http://") && !val.startsWith("https://")) {
            return "Video Link must start with http:// or https://";
          }
          return null;
        }
      },
      {
        key: "notes",
        label: "Lesson Notes / Summary",
        type: "string",
        required: false,
        description: "Key concepts, bullet points, or summary notes for video lessons",
        sampleValue: "# Overview\n- Variable scoping (let/const)\n- Static typing basics",
      },
      {
        key: "readingContent",
        label: "Reading / Article Content",
        type: "string",
        required: false,
        description: "Complete text content or markdown for reading lessons",
        sampleValue: "TypeScript extends JavaScript by adding static types.",
      },
      {
        key: "practiceDescription",
        label: "Coding Problem Statement",
        type: "string",
        required: false,
        description: "Problem description for coding lessons (Monaco editor)",
        sampleValue: "Write a function `sum(a, b)` that returns the addition of two numbers.",
      },
      {
        key: "enabled",
        label: "Duration Enabled",
        type: "boolean",
        required: false,
        defaultValue: true,
        description: "Whether duration tracking is enabled (Yes/No or True/False)",
        sampleValue: "Yes",
      }
    ],
    sampleRows: [
      {
        title: "1.1 Introduction to TypeScript & Ecosystem",
        type: "video",
        duration: "45 mins",
        videoUrl: "https://drive.google.com/file/d/sample-vid-1/view",
        notes: "- TypeScript benefits\n- TSC compiler setup",
        readingContent: "",
        practiceDescription: "",
        enabled: "Yes"
      },
      {
        title: "1.2 Types, Interfaces & Generics Deep Dive",
        type: "reading",
        duration: "30 mins",
        videoUrl: "",
        notes: "",
        readingContent: "Types in TypeScript allow statically typing variables, objects, and functions.",
        practiceDescription: "",
        enabled: "Yes"
      },
      {
        title: "1.3 Interactive Coding Challenge: Array Sum",
        type: "coding",
        duration: "40 mins",
        videoUrl: "",
        notes: "",
        readingContent: "",
        practiceDescription: "Implement a function solve(arr: number[]): number that computes total sum.",
        enabled: "Yes"
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `sub_bulk_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      type: (row.type || "video").toLowerCase(),
      duration: row.duration ? String(row.duration).trim() : "45 mins",
      videoUrl: row.videoUrl ? String(row.videoUrl).trim() : undefined,
      notes: row.notes ? String(row.notes).trim() : undefined,
      readingContent: row.readingContent ? String(row.readingContent).trim() : undefined,
      practiceDescription: row.practiceDescription ? String(row.practiceDescription).trim() : undefined,
    })
  },

  // ─── 2. PRACTICE SUB-MODULE / CHALLENGE TEMPLATE ────────────────────────────
  practice: {
    moduleType: "practice",
    displayName: "Practice Challenge & Track Template",
    description: "Template for creating MCQ problem sets, algorithmic coding challenges, and lab tracks.",
    templateFileName: "practice_sub_modules_template.xlsx",
    groupByField: "subModuleName",
    columns: [
      {
        key: "subModuleName",
        label: "Sub-Module Name",
        type: "string",
        required: true,
        description: "Name of the Sub-Module container (e.g. 'Java Basics', 'Java OOP', 'Java Arrays'). All questions sharing the same Sub-Module Name will be grouped together into a single Sub-Module containing multiple questions.",
        sampleValue: "Java Basics",
      },
      {
        key: "title",
        label: "Practice Item Title",
        type: "string",
        required: true,
        description: "Title of the question or challenge (e.g. 'What is Java?', 'Two Sum')",
        sampleValue: "What is Java?",
      },
      {
        key: "type",
        label: "Problem Type",
        type: "enum",
        required: true,
        options: ["coding", "mcq", "mixed"],
        description: "Problem category: coding, mcq, or mixed",
        sampleValue: "coding",
      },
      {
        key: "durationMinutes",
        label: "Duration (Minutes)",
        type: "number",
        required: false,
        defaultValue: 60,
        description: "Allotted time in minutes for this practice challenge",
        sampleValue: 60,
      },
      {
        key: "totalMarks",
        label: "Total Marks / Points",
        type: "number",
        required: false,
        defaultValue: 10,
        description: "Maximum score or points for this question",
        sampleValue: 10,
      },
      {
        key: "difficulty",
        label: "Difficulty Level",
        type: "enum",
        required: false,
        options: ["Easy", "Medium", "Hard"],
        defaultValue: "Easy",
        description: "Challenge difficulty rating",
        sampleValue: "Easy",
      },
      {
        key: "description",
        label: "Problem Statement (Markdown)",
        type: "string",
        required: false,
        description: "Detailed problem prompt, instructions, and constraints",
        sampleValue: "Print 'Hello, World!' to standard output or implement the requested logic.",
      },
      {
        key: "constraints",
        label: "Constraints",
        type: "string",
        required: false,
        description: "Execution and boundary constraints (e.g. '1 <= N <= 10^5')",
        sampleValue: "1 <= N <= 10^5",
      },
      {
        key: "input_format",
        label: "Input Format",
        type: "string",
        required: false,
        description: "Explanation of input structure received via standard input",
        sampleValue: "Standard input",
      },
      {
        key: "output_format",
        label: "Output Format",
        type: "string",
        required: false,
        description: "Explanation of expected output printed to standard output",
        sampleValue: "Print result to standard output",
      },
      {
        key: "sample_input",
        label: "Sample Input",
        type: "string",
        required: false,
        description: "Example input shown in problem overview",
        sampleValue: "5",
      },
      {
        key: "sample_output",
        label: "Sample Output",
        type: "string",
        required: false,
        description: "Expected output for sample case",
        sampleValue: "5",
      },
      {
        key: "sample_explanation",
        label: "Sample Explanation",
        type: "string",
        required: false,
        description: "Reasoning and explanation for sample case",
        sampleValue: "Outputs the value directly.",
      },
      {
        key: "testcase_1_input",
        label: "Test Case 1 Input",
        type: "string",
        required: false,
        description: "First public test case input for automated grader",
        sampleValue: "5",
      },
      {
        key: "testcase_1_output",
        label: "Test Case 1 Expected Output",
        type: "string",
        required: false,
        description: "First public test case expected output",
        sampleValue: "5",
      },
      {
        key: "testcase_2_input",
        label: "Test Case 2 Input",
        type: "string",
        required: false,
        description: "Second public testcase input",
        sampleValue: "10",
      },
      {
        key: "testcase_2_output",
        label: "Test Case 2 Expected Output",
        type: "string",
        required: false,
        description: "Second public testcase expected output",
        sampleValue: "10",
      },
      {
        key: "testcase_3_input",
        label: "Test Case 3 Input",
        type: "string",
        required: false,
        description: "Third public testcase input",
        sampleValue: "15",
      },
      {
        key: "testcase_3_output",
        label: "Test Case 3 Expected Output",
        type: "string",
        required: false,
        description: "Third public testcase expected output",
        sampleValue: "15",
      },
      {
        key: "testcase_4_input",
        label: "Test Case 4 Input",
        type: "string",
        required: false,
        description: "Fourth public testcase input",
        sampleValue: "20",
      },
      {
        key: "testcase_4_output",
        label: "Test Case 4 Expected Output",
        type: "string",
        required: false,
        description: "Fourth public testcase expected output",
        sampleValue: "20",
      },
      {
        key: "testcase_5_input",
        label: "Test Case 5 Input",
        type: "string",
        required: false,
        description: "Fifth public testcase input",
        sampleValue: "25",
      },
      {
        key: "testcase_5_output",
        label: "Test Case 5 Expected Output",
        type: "string",
        required: false,
        description: "Fifth public testcase expected output",
        sampleValue: "25",
      },
      {
        key: "hidden_testcase_input",
        label: "Hidden Test Case 1 Input",
        type: "string",
        required: false,
        description: "Private/Hidden test case evaluated during Submit to prevent hardcoding",
        sampleValue: "100",
      },
      {
        key: "hidden_testcase_output",
        label: "Hidden Test Case 1 Expected Output",
        type: "string",
        required: false,
        description: "Expected output for hidden test case 1",
        sampleValue: "100",
      },
      {
        key: "hidden_testcase_2_input",
        label: "Hidden Test Case 2 Input",
        type: "string",
        required: false,
        description: "Private/Hidden test case 2 evaluated during Submit",
        sampleValue: "500",
      },
      {
        key: "hidden_testcase_2_output",
        label: "Hidden Test Case 2 Expected Output",
        type: "string",
        required: false,
        description: "Expected output for hidden test case 2",
        sampleValue: "500",
      },
      {
        key: "hidden_testcase_3_input",
        label: "Hidden Test Case 3 Input",
        type: "string",
        required: false,
        description: "Private/Hidden test case 3 evaluated during Submit",
        sampleValue: "1000",
      },
      {
        key: "hidden_testcase_3_output",
        label: "Hidden Test Case 3 Expected Output",
        type: "string",
        required: false,
        description: "Expected output for hidden test case 3",
        sampleValue: "1000",
      },
      {
        key: "hidden_testcase_4_input",
        label: "Hidden Test Case 4 Input",
        type: "string",
        required: false,
        description: "Private/Hidden test case 4 evaluated during Submit",
        sampleValue: "2500",
      },
      {
        key: "hidden_testcase_4_output",
        label: "Hidden Test Case 4 Expected Output",
        type: "string",
        required: false,
        description: "Expected output for hidden test case 4",
        sampleValue: "2500",
      },
      {
        key: "hidden_testcase_5_input",
        label: "Hidden Test Case 5 Input",
        type: "string",
        required: false,
        description: "Private/Hidden test case 5 evaluated during Submit",
        sampleValue: "5000",
      },
      {
        key: "hidden_testcase_5_output",
        label: "Hidden Test Case 5 Expected Output",
        type: "string",
        required: false,
        description: "Expected output for hidden test case 5",
        sampleValue: "5000",
      },
      {
        key: "starterCode",
        label: "Starter Code / Boilerplate",
        type: "string",
        required: false,
        description: "Pre-filled code template for students (Java / Python / C++)",
        sampleValue: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write solution here\n    }\n}",
      },
      {
        key: "restrictCopyPaste",
        label: "Restrict Copy Paste",
        type: "boolean",
        required: false,
        defaultValue: false,
        description: "Proctoring guard: Disable clipboard paste (Yes/No)",
        sampleValue: "No",
      },
      {
        key: "enforceFullScreen",
        label: "Enforce Fullscreen",
        type: "boolean",
        required: false,
        defaultValue: false,
        description: "Proctoring guard: Require fullscreen mode (Yes/No)",
        sampleValue: "No",
      }
    ],
    sampleRows: [
      // ── SUB-MODULE 1: Java Basics (10 Questions) ─────────────────────────────
      { subModuleName: "Java Basics", title: "Sum of Two Numbers", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given two integers a and b, compute and print their sum.", testcase_1_input: "3 5", testcase_1_output: "8", hidden_testcase_input: "10 20", hidden_testcase_output: "30" },
      { subModuleName: "Java Basics", title: "Swap Two Numbers Without Temp Variable", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given two integers a and b, swap them without using a temporary variable and print them separated by space.", testcase_1_input: "5 10", testcase_1_output: "10 5", hidden_testcase_input: "12 45", hidden_testcase_output: "45 12" },
      { subModuleName: "Java Basics", title: "Check Even or Odd", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given an integer n, print 'Even' if it is even, otherwise print 'Odd'.", testcase_1_input: "4", testcase_1_output: "Even", hidden_testcase_input: "7", hidden_testcase_output: "Odd" },
      { subModuleName: "Java Basics", title: "Largest of Three Numbers", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given three integers a, b, and c, find and print the largest number.", testcase_1_input: "10 25 15", testcase_1_output: "25", hidden_testcase_input: "99 102 5", hidden_testcase_output: "102" },
      { subModuleName: "Java Basics", title: "Simple Interest Calculator", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given principal P, rate R, and time T, calculate and print simple interest: (P * R * T) / 100 as integer.", testcase_1_input: "1000 5 2", testcase_1_output: "100", hidden_testcase_input: "5000 8 3", hidden_testcase_output: "1200" },
      { subModuleName: "Java Basics", title: "Reverse a Number", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given an integer n, reverse its digits and print the reversed number.", testcase_1_input: "1234", testcase_1_output: "4321", hidden_testcase_input: "9870", hidden_testcase_output: "789" },
      { subModuleName: "Java Basics", title: "Check Prime Number", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given an integer n, print 'Prime' if n is prime, else 'Not Prime'.", testcase_1_input: "7", testcase_1_output: "Prime", hidden_testcase_input: "12", hidden_testcase_output: "Not Prime" },
      { subModuleName: "Java Basics", title: "Find Factorial", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given an integer n, compute and print the factorial n!.", testcase_1_input: "5", testcase_1_output: "120", hidden_testcase_input: "6", hidden_testcase_output: "720" },
      { subModuleName: "Java Basics", title: "Find Maximum Element", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given an array of size N, find and print the maximum element.", testcase_1_input: "4\n3 8 2 5", testcase_1_output: "8", hidden_testcase_input: "3\n10 50 30", hidden_testcase_output: "50" },
      { subModuleName: "Java Basics", title: "Count Digits", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Given an integer n, count and print the total number of digits.", testcase_1_input: "12345", testcase_1_output: "5", hidden_testcase_input: "9", hidden_testcase_output: "1" },

      // ── SUB-MODULE 2: Java OOP (10 Questions) ────────────────────────────────
      { subModuleName: "Java OOP", title: "Class and Object", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Create a Student class with name and age fields, instantiate and print details.", testcase_1_input: "Alice 20", testcase_1_output: "Student: Alice, Age: 20", hidden_testcase_input: "Bob 22", hidden_testcase_output: "Student: Bob, Age: 22" },
      { subModuleName: "Java OOP", title: "Constructor", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Implement a parameterized constructor to initialize object coordinates.", testcase_1_input: "3 4", testcase_1_output: "Point(3, 4)", hidden_testcase_input: "8 9", hidden_testcase_output: "Point(8, 9)" },
      { subModuleName: "Java OOP", title: "Inheritance", type: "coding", difficulty: "Medium", totalMarks: 10, durationMinutes: 60, description: "Demonstrate single inheritance with Animal base class and Dog derived class.", testcase_1_input: "Buddy", testcase_1_output: "Dog Buddy barks", hidden_testcase_input: "Max", hidden_testcase_output: "Dog Max barks" },
      { subModuleName: "Java OOP", title: "Polymorphism", type: "coding", difficulty: "Medium", totalMarks: 10, durationMinutes: 60, description: "Demonstrate runtime polymorphism by overriding the draw() method.", testcase_1_input: "Circle", testcase_1_output: "Drawing Circle", hidden_testcase_input: "Square", hidden_testcase_output: "Drawing Square" },
      { subModuleName: "Java OOP", title: "Encapsulation", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Create a BankAccount class with private balance and public getter/setter.", testcase_1_input: "500", testcase_1_output: "Balance: 500", hidden_testcase_input: "1200", hidden_testcase_output: "Balance: 1200" },
      { subModuleName: "Java OOP", title: "Abstraction", type: "coding", difficulty: "Medium", totalMarks: 10, durationMinutes: 60, description: "Define an abstract class Shape with abstract method area().", testcase_1_input: "4 5", testcase_1_output: "Area: 20", hidden_testcase_input: "6 7", hidden_testcase_output: "Area: 42" },
      { subModuleName: "Java OOP", title: "Interface", type: "coding", difficulty: "Medium", totalMarks: 10, durationMinutes: 60, description: "Implement Printable interface with print() method.", testcase_1_input: "Document", testcase_1_output: "Printing Document", hidden_testcase_input: "Invoice", hidden_testcase_output: "Printing Invoice" },
      { subModuleName: "Java OOP", title: "Method Overloading", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Overload add() to handle both two integers and three integers.", testcase_1_input: "2 3\n1 2 3", testcase_1_output: "5\n6", hidden_testcase_input: "5 5\n2 3 4", hidden_testcase_output: "10\n9" },
      { subModuleName: "Java OOP", title: "Method Overriding", type: "coding", difficulty: "Medium", totalMarks: 10, durationMinutes: 60, description: "Override sound() method in sub-class Cat returning 'Meow'.", testcase_1_input: "cat", testcase_1_output: "Meow", hidden_testcase_input: "cat2", hidden_testcase_output: "Meow" },
      { subModuleName: "Java OOP", title: "Exception Handling", type: "coding", difficulty: "Medium", totalMarks: 10, durationMinutes: 60, description: "Handle divide by zero using try-catch and print 'Division by zero error'.", testcase_1_input: "10 0", testcase_1_output: "Division by zero error", hidden_testcase_input: "20 5", hidden_testcase_output: "4" },

      // ── SUB-MODULE 3: Java Arrays (10 Questions) ─────────────────────────────
      { subModuleName: "Java Arrays", title: "Declare and Initialize an Array", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Initialize an array of size N and print its elements.", testcase_1_input: "3\n1 2 3", testcase_1_output: "1 2 3", hidden_testcase_input: "2\n7 8", hidden_testcase_output: "7 8" },
      { subModuleName: "Java Arrays", title: "Find Maximum in Array", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Find and return the maximum element in the given integer array.", testcase_1_input: "5\n3 1 9 4 2", testcase_1_output: "9", hidden_testcase_input: "4\n-5 -2 -10 -1", hidden_testcase_output: "-1" },
      { subModuleName: "Java Arrays", title: "Find Minimum in Array", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Find and return the minimum element in the given integer array.", testcase_1_input: "5\n3 1 9 4 2", testcase_1_output: "1", hidden_testcase_input: "4\n10 20 5 40", hidden_testcase_output: "5" },
      { subModuleName: "Java Arrays", title: "Reverse an Array", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Reverse an array in-place and print the reversed elements.", testcase_1_input: "4\n1 2 3 4", testcase_1_output: "4 3 2 1", hidden_testcase_input: "3\n9 8 7", hidden_testcase_output: "7 8 9" },
      { subModuleName: "Java Arrays", title: "Check if Array is Sorted", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Return true if the array is sorted in non-decreasing order, else false.", testcase_1_input: "4\n1 2 2 3", testcase_1_output: "true", hidden_testcase_input: "4\n1 3 2 4", hidden_testcase_output: "false" },
      { subModuleName: "Java Arrays", title: "Two Sum Problem", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Find indices of the two numbers that add up to target.", testcase_1_input: "2 7 11 15\n9", testcase_1_output: "0 1", hidden_testcase_input: "3 2 4\n6", hidden_testcase_output: "1 2" },
      { subModuleName: "Java Arrays", title: "Move Zeroes to End", type: "coding", difficulty: "Medium", totalMarks: 10, durationMinutes: 60, description: "Move all zeroes in an array to the end while maintaining relative order of non-zeroes.", testcase_1_input: "5\n0 1 0 3 12", testcase_1_output: "1 3 12 0 0", hidden_testcase_input: "3\n0 0 1", hidden_testcase_output: "1 0 0" },
      { subModuleName: "Java Arrays", title: "Remove Duplicates from Sorted Array", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Remove duplicates in-place from sorted array and return new length.", testcase_1_input: "3\n1 1 2", testcase_1_output: "2", hidden_testcase_input: "5\n0 0 1 1 2", hidden_testcase_output: "3" },
      { subModuleName: "Java Arrays", title: "Rotate Array by K Positions", type: "coding", difficulty: "Medium", totalMarks: 10, durationMinutes: 60, description: "Rotate array to the right by K steps.", testcase_1_input: "5 2\n1 2 3 4 5", testcase_1_output: "4 5 1 2 3", hidden_testcase_input: "4 1\n1 2 3 4", hidden_testcase_output: "4 1 2 3" },
      { subModuleName: "Java Arrays", title: "Linear Search in Array", type: "coding", difficulty: "Easy", totalMarks: 10, durationMinutes: 60, description: "Search for key K in array. Return index if found, else -1.", testcase_1_input: "4 30\n10 20 30 40", testcase_1_output: "2", hidden_testcase_input: "3 50\n10 20 30", hidden_testcase_output: "-1" }
    ],
    mapToPayload: (row, idx) => {
      const parentMod = String(row.subModuleName || row.sub_module_name || row.submodule || row.moduleName || row.module_name || row.title || `Sub-Module ${idx + 1}`).trim();
      const question = parsePracticeQuestionRow(row, idx, `sm_${idx}`);
      const starterCodeStr = String(row.starterCode || row.starter_code || "").trim();

      return {
        id: `sm_${Date.now()}_${idx}`,
        title: parentMod,
        type: (row.type || "coding").toLowerCase(),
        durationMinutes: Number(row.durationMinutes) || 60,
        totalMarks: Number(row.totalMarks) || 10,
        questionCount: 1,
        restrictCopyPaste: isTruthy(row.restrictCopyPaste),
        enforceFullScreen: isTruthy(row.enforceFullScreen),
        hasHiddenTests: question.hiddenTestCases.length > 0,
        hiddenTestsCode: question.hiddenTestCases.length > 0 ? JSON.stringify(question.hiddenTestCases) : undefined,
        problemDescription: question.description,
        constraints: question.constraints,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        publicTestCases: JSON.stringify(question.publicTestCases),
        starterCode: starterCodeStr,
        codingQuestions: [question],
        mcqQuestions: [],
        sections: [
          {
            id: `sec_${Date.now()}_${idx}`,
            title: `Section 1: ${parentMod}`,
            mcqQuestions: [],
            codingQuestions: [question]
          }
        ]
      };
    },
    mapGroupedPayload: (grouped, indexOffset = 0) => {
      return grouped.map((group, gIdx) => {
        const modIdx = indexOffset + gIdx;
        const moduleId = `sm_${Date.now()}_${modIdx}`;
        const moduleTitle = String(group.groupKey || `Module ${modIdx + 1}`).trim();
        const rows = group.rows || [];

        const restrictCopyPaste = rows.some((r) => isTruthy(r.restrictCopyPaste));
        const enforceFullScreen = rows.some((r) => isTruthy(r.enforceFullScreen));
        const totalDuration = rows.reduce((max, r) => Math.max(max, Number(r.durationMinutes) || 0), 60);
        const totalMarks = rows.reduce((acc, r) => acc + (Number(r.totalMarks) || 10), 0);

        const codingQuestions: any[] = [];
        const mcqQuestions: any[] = [];

        rows.forEach((r, qIdx) => {
          const qType = (r.type || "coding").toLowerCase();
          if (qType === "mcq") {
            mcqQuestions.push({
              id: `mcq_${Date.now()}_${modIdx}_${qIdx}`,
              questionText: String(r.description || r.title || `Question ${qIdx + 1}`).trim(),
              questionType: "single",
              marks: Number(r.totalMarks) || 10,
              options: [
                { id: "o1", text: "Option A", isCorrect: true },
                { id: "o2", text: "Option B", isCorrect: false },
                { id: "o3", text: "Option C", isCorrect: false },
                { id: "o4", text: "Option D", isCorrect: false },
              ],
              explanation: String(r.sample_explanation || "").trim(),
            });
          } else {
            codingQuestions.push(parsePracticeQuestionRow(r, qIdx, moduleId));
          }
        });

        const hasHiddenTests = codingQuestions.some((cq) => cq.hiddenTestCases && cq.hiddenTestCases.length > 0);
        const firstDesc = rows.find((r) => r.description)?.description || `Practice challenge module covering ${moduleTitle}`;

        return {
          id: moduleId,
          title: moduleTitle,
          type: mcqQuestions.length > 0 && codingQuestions.length > 0 ? "mixed" : mcqQuestions.length > 0 ? "mcq" : "coding",
          durationMinutes: totalDuration > 0 ? totalDuration : 60,
          totalMarks: totalMarks > 0 ? totalMarks : rows.length * 10,
          questionCount: rows.length,
          restrictCopyPaste,
          enforceFullScreen,
          hasHiddenTests,
          hiddenTestsCode: hasHiddenTests ? JSON.stringify(codingQuestions.flatMap((cq) => cq.hiddenTestCases)) : undefined,
          problemDescription: String(firstDesc).trim(),
          codingQuestions,
          mcqQuestions,
          sections: [
            {
              id: `sec_${Date.now()}_${modIdx}`,
              title: `Section 1: ${moduleTitle}`,
              mcqQuestions,
              codingQuestions,
            }
          ]
        };
      });
    }
  },

  // ─── 3. ASSIGNMENT SUB-MODULE TEMPLATE ───────────────────────────────────────
  assignment: {
    moduleType: "assignment",
    displayName: "Assignment & Submission Task Template",
    description: "Template for authoring project deliverables, homework tasks, and peer-reviewed assignments.",
    templateFileName: "assignments_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Assignment Title",
        type: "string",
        required: true,
        description: "Title of the assignment project or deliverable",
        sampleValue: "Sprint 1: Microservices Architecture Blueprint",
      },
      {
        key: "description",
        label: "Description",
        type: "string",
        required: true,
        description: "Summary and problem statement for the assignment",
        sampleValue: "Design and implement a scalable microservices architecture for an e-commerce platform.",
      },
      {
        key: "instructions",
        label: "Instructions & Criteria",
        type: "string",
        required: false,
        description: "Grading criteria and deliverable format requirements",
        sampleValue: "Submit GitHub repo URL and a PDF architectural diagram.",
      },
      {
        key: "totalMarks",
        label: "Total Marks",
        type: "number",
        required: true,
        defaultValue: 100,
        description: "Maximum achievable marks for grading",
        sampleValue: 100,
      },
      {
        key: "submissionType",
        label: "Submission Type",
        type: "enum",
        required: true,
        options: ["file_upload", "github_link", "text_entry", "url"],
        description: "Allowed submission mode",
        sampleValue: "github_link",
      },
      {
        key: "dueDate",
        label: "Due Date (YYYY-MM-DD)",
        type: "date",
        required: false,
        description: "Target submission deadline in YYYY-MM-DD format",
        sampleValue: "2026-12-31",
      },
      {
        key: "allowLateSubmission",
        label: "Allow Late Submissions",
        type: "boolean",
        required: false,
        defaultValue: true,
        description: "Allow submissions past deadline (Yes/No)",
        sampleValue: "Yes",
      }
    ],
    sampleRows: [
      {
        title: "Sprint 1: Full-Stack Authentication Microservice",
        description: "Build an OAuth2 + JWT authentication service in Node.js.",
        instructions: "Include Swagger documentation and unit test coverage above 80%.",
        totalMarks: 100,
        submissionType: "github_link",
        dueDate: "2026-09-30",
        allowLateSubmission: "Yes"
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `assign_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      instructions: String(row.instructions || "").trim(),
      totalMarks: Number(row.totalMarks) || 100,
      submissionType: row.submissionType || "github_link",
      dueDate: row.dueDate ? String(row.dueDate) : undefined,
      allowLateSubmission: isTruthy(row.allowLateSubmission)
    })
  },

  // ─── 4. ASSESSMENT / PROCTORED TEST TEMPLATE ────────────────────────────────
  assessment: {
    moduleType: "assessment",
    displayName: "Assessment & Examination Section Template",
    description: "Template for proctored examinations, timed term tests, and certification assessments.",
    templateFileName: "assessment_sections_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Section / Test Title",
        type: "string",
        required: true,
        description: "Title of the test section or assessment paper",
        sampleValue: "Section A: Core Engineering Foundations",
      },
      {
        key: "durationMinutes",
        label: "Duration (Minutes)",
        type: "number",
        required: true,
        defaultValue: 60,
        description: "Total allotted duration for the assessment",
        sampleValue: 60,
      },
      {
        key: "totalMarks",
        label: "Total Marks",
        type: "number",
        required: true,
        defaultValue: 100,
        description: "Maximum score for this section",
        sampleValue: 100,
      },
      {
        key: "passPercentage",
        label: "Passing Percentage",
        type: "number",
        required: false,
        defaultValue: 60,
        description: "Minimum percentage required to clear assessment (e.g. 60)",
        sampleValue: 60,
      },
      {
        key: "proctored",
        label: "Proctored Exam",
        type: "boolean",
        required: false,
        defaultValue: true,
        description: "Enable AI webcam proctoring and tab-switch monitoring (Yes/No)",
        sampleValue: "Yes",
      },
      {
        key: "shuffleQuestions",
        label: "Shuffle Questions",
        type: "boolean",
        required: false,
        defaultValue: true,
        description: "Randomize question ordering for each student (Yes/No)",
        sampleValue: "Yes",
      }
    ],
    sampleRows: [
      {
        title: "Section 1: Data Structures & Algorithms",
        durationMinutes: 90,
        totalMarks: 100,
        passPercentage: 70,
        proctored: "Yes",
        shuffleQuestions: "Yes"
      },
      {
        title: "Section 2: System Architecture & Design",
        durationMinutes: 60,
        totalMarks: 50,
        passPercentage: 60,
        proctored: "Yes",
        shuffleQuestions: "Yes"
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `as_sec_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      durationMinutes: Number(row.durationMinutes) || 60,
      totalMarks: Number(row.totalMarks) || 100,
      passPercentage: Number(row.passPercentage) || 60,
      proctored: isTruthy(row.proctored),
      shuffleQuestions: isTruthy(row.shuffleQuestions)
    })
  },

  // ─── 4.5. ASSESSMENT SECTION & QUESTIONS TEMPLATE (1 EXAM -> MULTI-SECTIONS -> QUESTIONS) ─
  assessment_questions: getAssessmentQuestionsTemplateConfig(),

  // ─── 4.6. ASSESSMENT MCQ & MULTI-SELECT TEMPLATE (SECTIONS -> MCQ / MSQ) ───
  assessment_mcq: {
    moduleType: "assessment_mcq",
    displayName: "Assessment MCQ & Multi-Select Template",
    description: "Template for bulk importing Single-Choice (MCQ) and Multiple-Select (MSQ) questions organized into sections.",
    templateFileName: "assessment_mcq_sections_template.xlsx",
    groupByField: "sectionName",
    columns: [
      {
        key: "assessmentTitle",
        label: "Assessment Title",
        type: "string",
        required: false,
        description: "Title of the Assessment exam. If blank, attaches to open assessment.",
        sampleValue: "Technical Assessment",
      },
      {
        key: "sectionName",
        label: "Section Name",
        type: "string",
        required: false,
        defaultValue: "Aptitude & Logical Reasoning",
        description: "Name of the Section (e.g. 'Aptitude & Logical Reasoning', 'Technical Core', 'Verbal Ability'). Supports multiple MCQ sections.",
        sampleValue: "Aptitude & Logical Reasoning",
      },
      {
        key: "title",
        label: "Question / Problem Statement",
        type: "string",
        required: true,
        description: "The complete question prompt or statement",
        sampleValue: "If 20% of a number is 50, what is the number?",
      },
      {
        key: "type",
        label: "Question Type",
        type: "enum",
        required: true,
        options: ["mcq", "Multiple Choice", "msq", "Multi-Select"],
        defaultValue: "mcq",
        description: "Question type: 'mcq' (Single choice) or 'msq' (Multiple select)",
        sampleValue: "mcq",
      },
      {
        key: "marks",
        label: "Marks / Points",
        type: "number",
        required: true,
        defaultValue: 2,
        description: "Marks allocated for this question",
        sampleValue: 2,
      },
      {
        key: "difficulty",
        label: "Difficulty Level",
        type: "enum",
        required: false,
        options: ["Easy", "Medium", "Hard"],
        defaultValue: "Easy",
        description: "Question difficulty rating",
        sampleValue: "Easy",
      },
      {
        key: "optionA",
        label: "Option A",
        type: "string",
        required: true,
        description: "Option A text",
        sampleValue: "200",
      },
      {
        key: "optionB",
        label: "Option B",
        type: "string",
        required: true,
        description: "Option B text",
        sampleValue: "250",
      },
      {
        key: "optionC",
        label: "Option C",
        type: "string",
        required: false,
        description: "Option C text",
        sampleValue: "300",
      },
      {
        key: "optionD",
        label: "Option D",
        type: "string",
        required: false,
        description: "Option D text",
        sampleValue: "350",
      },
      {
        key: "correctOption",
        label: "Correct Option(s)",
        type: "string",
        required: true,
        description: "Correct answer letter (e.g. 'B' for MCQ, or 'A,B' for MSQ)",
        sampleValue: "B",
      },
      {
        key: "explanation",
        label: "Explanation / Solution",
        type: "string",
        required: false,
        description: "Detailed solution or explanation",
        sampleValue: "Let the number be x. 0.20 * x = 50 => x = 250.",
      },
    ],
    sampleRows: [
      {
        assessmentTitle: "Technical Assessment",
        sectionName: "Aptitude & Logical Reasoning",
        title: "If 20% of a number is 50, what is the number?",
        type: "mcq",
        marks: 2,
        difficulty: "Easy",
        optionA: "200",
        optionB: "250",
        optionC: "300",
        optionD: "350",
        correctOption: "B",
        explanation: "Let the number be x. 0.20 * x = 50 => x = 250."
      },
      {
        assessmentTitle: "Technical Assessment",
        sectionName: "Aptitude & Logical Reasoning",
        title: "A train travels 180 km in 3 hours. What is its average speed?",
        type: "mcq",
        marks: 2,
        difficulty: "Easy",
        optionA: "50 km/h",
        optionB: "60 km/h",
        optionC: "70 km/h",
        optionD: "80 km/h",
        correctOption: "B",
        explanation: "Speed = Distance / Time = 180 / 3 = 60 km/h."
      },
      {
        assessmentTitle: "Technical Assessment",
        sectionName: "Technical Core",
        title: "Which of the following are primitive data types in Java? (MSQ)",
        type: "msq",
        marks: 4,
        difficulty: "Medium",
        optionA: "int",
        optionB: "boolean",
        optionC: "String",
        optionD: "Integer",
        correctOption: "A,B",
        explanation: "int and boolean are primitive types. String and Integer are reference classes."
      },
      {
        assessmentTitle: "Technical Assessment",
        sectionName: "Technical Core",
        title: "Which collection classes implement the List interface in Java? (MSQ)",
        type: "msq",
        marks: 4,
        difficulty: "Medium",
        optionA: "ArrayList",
        optionB: "LinkedList",
        optionC: "HashSet",
        optionD: "TreeSet",
        correctOption: "A,B",
        explanation: "ArrayList and LinkedList implement List; HashSet and TreeSet implement Set."
      }
    ],
    mapToPayload: (row, idx) => {
      const rawQType = String(row.type || "mcq").toLowerCase().trim().replace(/[\s_-]+/g, "");
      const isMsq = rawQType === "msq" || rawQType === "multipleselect" || rawQType === "multiselect" || rawQType === "multiple";
      const qType = isMsq ? "msq" : "mcq";
      const secName = String(row.sectionName || row.section || "Multiple Choice Questions").trim();
      const rawCorrect = String(row.correctOption || "A").trim().toUpperCase();
      const correctParts = rawCorrect.split(/[,;\s]+/).map((s) => s.trim());

      const options = [
        { id: 1, text: String(row.optionA || "Option A").trim(), isCorrect: correctParts.includes("A") || correctParts.includes("1") || rawCorrect === "A" },
        { id: 2, text: String(row.optionB || "Option B").trim(), isCorrect: correctParts.includes("B") || correctParts.includes("2") || rawCorrect === "B" },
        { id: 3, text: String(row.optionC || "Option C").trim(), isCorrect: correctParts.includes("C") || correctParts.includes("3") || rawCorrect === "C" },
        { id: 4, text: String(row.optionD || "Option D").trim(), isCorrect: correctParts.includes("D") || correctParts.includes("4") || rawCorrect === "D" },
      ].filter((o) => o.text !== "");

      return {
        id: `q_bulk_${Date.now()}_${idx}`,
        assessmentTitle: String(row.assessmentTitle || "").trim(),
        section: secName,
        title: String(row.title || `Question ${idx + 1}`).trim(),
        type: qType,
        marks: Number(row.marks) || 2,
        difficulty: row.difficulty || "Easy",
        problemStatement: String(row.description || row.problemStatement || row.title || "").trim(),
        description: String(row.description || row.problemStatement || "").trim(),
        options,
        explanation: String(row.explanation || "").trim(),
      };
    },
    mapGroupedPayload: (grouped, indexOffset = 0) => {
      return grouped.map((group, gIdx) => {
        const secName = String(group.groupKey || `Section ${indexOffset + gIdx + 1}`).trim();
        const rows = group.rows || [];
        const questions = rows.map((r, qIdx) => {
          const rawQType = String(r.type || "mcq").toLowerCase().trim().replace(/[\s_-]+/g, "");
          const isMsq = rawQType === "msq" || rawQType === "multipleselect" || rawQType === "multiselect" || rawQType === "multiple";
          const qType = isMsq ? "msq" : "mcq";
          const rawCorrect = String(r.correctOption || "A").trim().toUpperCase();
          const correctParts = rawCorrect.split(/[,;\s]+/).map((s) => s.trim());

          const options = [
            { id: 1, text: String(r.optionA || "Option A").trim(), isCorrect: correctParts.includes("A") || correctParts.includes("1") || rawCorrect === "A" },
            { id: 2, text: String(r.optionB || "Option B").trim(), isCorrect: correctParts.includes("B") || correctParts.includes("2") || rawCorrect === "B" },
            { id: 3, text: String(r.optionC || "Option C").trim(), isCorrect: correctParts.includes("C") || correctParts.includes("3") || rawCorrect === "C" },
            { id: 4, text: String(r.optionD || "Option D").trim(), isCorrect: correctParts.includes("D") || correctParts.includes("4") || rawCorrect === "D" },
          ].filter((o) => o.text !== "");

          return {
            id: `q_bulk_${Date.now()}_${gIdx}_${qIdx}`,
            assessmentTitle: String(r.assessmentTitle || "").trim(),
            section: secName,
            title: String(r.title || `Question ${qIdx + 1}`).trim(),
            type: qType,
            marks: Number(r.marks) || 2,
            difficulty: r.difficulty || "Easy",
            problemStatement: String(r.description || r.problemStatement || r.title || "").trim(),
            description: String(r.description || r.problemStatement || "").trim(),
            options,
            explanation: String(r.explanation || "").trim(),
          };
        });

        const totalSectionMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        return {
          sectionName: secName,
          title: secName,
          questions,
          questionCount: questions.length,
          totalMarks: totalSectionMarks,
          assessmentTitle: rows[0]?.assessmentTitle ? String(rows[0].assessmentTitle).trim() : undefined,
        };
      });
    },
  },

  // ─── 4.7. ASSESSMENT CODING TEMPLATE (SECTIONS -> CODING CHALLENGES) ────────
  assessment_coding: {
    moduleType: "assessment_coding",
    displayName: "Assessment Coding Challenges Template",
    description: "Template for bulk importing interactive programming problems organized into coding sections.",
    templateFileName: "assessment_coding_sections_template.xlsx",
    groupByField: "sectionName",
    columns: [
      {
        key: "assessmentTitle",
        label: "Assessment Title",
        type: "string",
        required: false,
        description: "Title of the Assessment exam. If blank, attaches to open assessment.",
        sampleValue: "Technical Assessment",
      },
      {
        key: "sectionName",
        label: "Section Name",
        type: "string",
        required: false,
        defaultValue: "Coding Challenges",
        description: "Name of the Coding Section (e.g. 'Data Structures', 'Algorithms', 'Core Java Coding'). Supports multiple coding sections.",
        sampleValue: "Data Structures",
      },
      {
        key: "title",
        label: "Problem Title / Statement",
        type: "string",
        required: true,
        description: "The complete problem statement or challenge title",
        sampleValue: "Reverse a String",
      },
      {
        key: "type",
        label: "Question Type",
        type: "enum",
        required: true,
        options: ["coding"],
        defaultValue: "coding",
        description: "Type: coding",
        sampleValue: "coding",
      },
      {
        key: "marks",
        label: "Marks / Points",
        type: "number",
        required: true,
        defaultValue: 10,
        description: "Marks allocated for this coding problem",
        sampleValue: 10,
      },
      {
        key: "difficulty",
        label: "Difficulty Level",
        type: "enum",
        required: false,
        options: ["Easy", "Medium", "Hard"],
        defaultValue: "Easy",
        description: "Problem difficulty",
        sampleValue: "Easy",
      },
      {
        key: "constraints",
        label: "Constraints",
        type: "string",
        required: false,
        description: "Time, memory and input constraints",
        sampleValue: "1 <= string.length <= 10^5",
      },
      {
        key: "input_format",
        label: "Input Format",
        type: "string",
        required: false,
        description: "Expected input structure",
        sampleValue: "A single line containing string S",
      },
      {
        key: "output_format",
        label: "Output Format",
        type: "string",
        required: false,
        description: "Expected output structure",
        sampleValue: "Print the reversed string",
      },
      {
        key: "testcase_1_input",
        label: "Test Case 1 Input",
        type: "string",
        required: false,
        description: "Public test case 1 input",
        sampleValue: "hello",
      },
      {
        key: "testcase_1_output",
        label: "Test Case 1 Expected Output",
        type: "string",
        required: false,
        description: "Public test case 1 expected output",
        sampleValue: "olleh",
      },
      {
        key: "testcase_2_input",
        label: "Test Case 2 Input",
        type: "string",
        required: false,
        description: "Public test case 2 input",
        sampleValue: "world",
      },
      {
        key: "testcase_2_output",
        label: "Test Case 2 Expected Output",
        type: "string",
        required: false,
        description: "Public test case 2 expected output",
        sampleValue: "dlrow",
      },
      {
        key: "hidden_testcase_input",
        label: "Hidden Test Case 1 Input",
        type: "string",
        required: false,
        description: "Hidden evaluation input",
        sampleValue: "racecar",
      },
      {
        key: "hidden_testcase_output",
        label: "Hidden Test Case 1 Expected Output",
        type: "string",
        required: false,
        description: "Hidden evaluation expected output",
        sampleValue: "racecar",
      },
      {
        key: "starterCode",
        label: "Starter Boilerplate Code",
        type: "string",
        required: false,
        description: "Starter code for students",
        sampleValue: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}",
      },
    ],
    sampleRows: [
      {
        assessmentTitle: "Technical Assessment",
        sectionName: "Data Structures",
        title: "Reverse a String",
        type: "coding",
        marks: 10,
        difficulty: "Easy",
        constraints: "1 <= string.length <= 10^5",
        input_format: "A single line containing string S",
        output_format: "Print the reversed string",
        testcase_1_input: "hello",
        testcase_1_output: "olleh",
        testcase_2_input: "world",
        testcase_2_output: "dlrow",
        hidden_testcase_input: "racecar",
        hidden_testcase_output: "racecar",
        starterCode: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}"
      },
      {
        assessmentTitle: "Technical Assessment",
        sectionName: "Algorithms",
        title: "Find Largest Element in Array",
        type: "coding",
        marks: 10,
        difficulty: "Easy",
        constraints: "1 <= n <= 10^5",
        input_format: "Line 1: N, Line 2: N space-separated integers",
        output_format: "Print the maximum integer",
        testcase_1_input: "5\n1 9 3 7 4",
        testcase_1_output: "9",
        testcase_2_input: "3\n-5 -2 -8",
        testcase_2_output: "-2",
        hidden_testcase_input: "1\n42",
        hidden_testcase_output: "42",
        starterCode: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}"
      }
    ],
    mapToPayload: (row, idx) => {
      const secName = String(row.sectionName || row.section || "Coding Challenges").trim();
      const testCases: any[] = [];
      for (let i = 1; i <= 10; i++) {
        const inp = row[`testcase_${i}_input`] ?? row[`test_case_${i}_input`];
        const out = row[`testcase_${i}_output`] ?? row[`test_case_${i}_output`];
        const trimmedInp = String(inp || "").trim();
        const trimmedOut = String(out || "").trim();
        if (trimmedInp !== "" || trimmedOut !== "") {
          testCases.push({ id: testCases.length + 1, input: trimmedInp, output: trimmedOut, isHidden: false });
        }
      }
      for (let h = 1; h <= 10; h++) {
        const hIn = h === 1 ? (row.hidden_testcase_input ?? row.hidden_testcase_1_input) : row[`hidden_testcase_${h}_input`];
        const hOut = h === 1 ? (row.hidden_testcase_output ?? row.hidden_testcase_1_output) : row[`hidden_testcase_${h}_output`];
        const trimmedHIn = String(hIn || "").trim();
        const trimmedHOut = String(hOut || "").trim();
        if (trimmedHIn !== "" || trimmedHOut !== "") {
          testCases.push({ id: testCases.length + 1, input: trimmedHIn, output: trimmedHOut, isHidden: true });
        }
      }

      return {
        id: `cp_bulk_${Date.now()}_${idx}`,
        assessmentTitle: String(row.assessmentTitle || "").trim(),
        section: secName,
        title: String(row.title || `Coding Challenge ${idx + 1}`).trim(),
        type: "coding",
        marks: Number(row.marks) || 10,
        difficulty: row.difficulty || "Easy",
        problemStatement: String(row.description || row.problemStatement || row.title || "").trim(),
        description: String(row.description || row.problemStatement || "").trim(),
        constraints: String(row.constraints || "").trim(),
        inputFormat: String(row.input_format || "").trim(),
        outputFormat: String(row.output_format || "").trim(),
        starterCode: String(row.starterCode || "").trim(),
        testCases: testCases.length > 0 ? testCases : [{ id: "tc_1", input: "1", output: "1", expected_output: "1", isHidden: false }],
      };
    },
    mapGroupedPayload: (grouped, indexOffset = 0) => {
      return grouped.map((group, gIdx) => {
        const secName = String(group.groupKey || `Coding Section ${indexOffset + gIdx + 1}`).trim();
        const rows = group.rows || [];
        const questions = rows.map((r, qIdx) => {
          const testCases: any[] = [];
          for (let i = 1; i <= 10; i++) {
            const inp = r[`testcase_${i}_input`] ?? r[`test_case_${i}_input`];
            const out = r[`testcase_${i}_output`] ?? r[`test_case_${i}_output`];
            const trimmedInp = String(inp || "").trim();
            const trimmedOut = String(out || "").trim();
            if (trimmedInp !== "" || trimmedOut !== "") {
              testCases.push({ id: testCases.length + 1, input: trimmedInp, output: trimmedOut, isHidden: false });
            }
          }
          for (let h = 1; h <= 10; h++) {
            const hIn = h === 1 ? (r.hidden_testcase_input ?? r.hidden_testcase_1_input) : r[`hidden_testcase_${h}_input`];
            const hOut = h === 1 ? (r.hidden_testcase_output ?? r.hidden_testcase_1_output) : r[`hidden_testcase_${h}_output`];
            const trimmedHIn = String(hIn || "").trim();
            const trimmedHOut = String(hOut || "").trim();
            if (trimmedHIn !== "" || trimmedHOut !== "") {
              testCases.push({ id: testCases.length + 1, input: trimmedHIn, output: trimmedHOut, isHidden: true });
            }
          }

          return {
            id: `cp_bulk_${Date.now()}_${gIdx}_${qIdx}`,
            assessmentTitle: String(r.assessmentTitle || "").trim(),
            section: secName,
            title: String(r.title || `Coding Challenge ${qIdx + 1}`).trim(),
            type: "coding",
            marks: Number(r.marks) || 10,
            difficulty: r.difficulty || "Easy",
            problemStatement: String(r.description || r.problemStatement || r.title || "").trim(),
            description: String(r.description || r.problemStatement || "").trim(),
            constraints: String(r.constraints || "").trim(),
            inputFormat: String(r.input_format || "").trim(),
            outputFormat: String(r.output_format || "").trim(),
            starterCode: String(r.starterCode || "").trim(),
            testCases: testCases.length > 0 ? testCases : [{ id: "tc_1", input: "1", output: "1", expected_output: "1", isHidden: false }],
          };
        });

        const totalSectionMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        return {
          sectionName: secName,
          title: secName,
          questions,
          questionCount: questions.length,
          totalMarks: totalSectionMarks,
          assessmentTitle: rows[0]?.assessmentTitle ? String(rows[0].assessmentTitle).trim() : undefined,
        };
      });
    },
  },

  // ─── 5. QUIZ TEMPLATE ──────────────────────────────────────────────────────
  quiz: {
    moduleType: "quiz",
    displayName: "Quiz Assessment Template",
    description: "Template for multiple-choice quiz questions with option keys and explanations.",
    templateFileName: "quiz_questions_template.xlsx",
    columns: [
      {
        key: "questionText",
        label: "Question Text",
        type: "string",
        required: true,
        description: "The question prompt presented to the student",
        sampleValue: "Which of the following is NOT a JavaScript primitive type?",
      },
      {
        key: "optionA",
        label: "Option A",
        type: "string",
        required: true,
        description: "Text for Option A",
        sampleValue: "String",
      },
      {
        key: "optionB",
        label: "Option B",
        type: "string",
        required: true,
        description: "Text for Option B",
        sampleValue: "Boolean",
      },
      {
        key: "optionC",
        label: "Option C",
        type: "string",
        required: true,
        description: "Text for Option C",
        sampleValue: "Float",
      },
      {
        key: "optionD",
        label: "Option D",
        type: "string",
        required: true,
        description: "Text for Option D",
        sampleValue: "Symbol",
      },
      {
        key: "correctOption",
        label: "Correct Option(s) (e.g. A or A,C)",
        type: "string",
        required: true,
        description: "The correct answer key. For single choice enter 'A', 'B', 'C', or 'D'. For multiple choice enter comma-separated letters e.g. 'A,C' or 'B,D'.",
        sampleValue: "B",
      },
      {
        key: "questionType",
        label: "Question Format",
        type: "enum",
        required: false,
        options: ["Single Choice", "Multiple Choice"],
        defaultValue: "Single Choice",
        description: "Specify whether this question has a single correct answer or multiple correct answers",
        sampleValue: "Single Choice",
      },
      {
        key: "explanation",
        label: "Explanation",
        type: "string",
        required: false,
        description: "Detailed solution explanation shown after submission or review",
        sampleValue: "In a balanced BST, tree height is log(n), making search O(log n).",
      },
      {
        key: "points",
        label: "Marks / Points",
        type: "number",
        required: false,
        defaultValue: 10,
        description: "Points awarded for answering correctly",
        sampleValue: 10,
      }
    ],
    sampleRows: [
      {
        questionText: "What is the time complexity of searching in a balanced Binary Search Tree?",
        optionA: "O(1)",
        optionB: "O(log n)",
        optionC: "O(n)",
        optionD: "O(n log n)",
        correctOption: "B",
        questionType: "Single Choice",
        explanation: "In a balanced BST, tree height is log(n), making search O(log n).",
        points: 10
      },
      {
        questionText: "Which of the following are checked exceptions in Java? (Multiple Choice)",
        optionA: "IOException",
        optionB: "SQLException",
        optionC: "NullPointerException",
        optionD: "ArithmeticException",
        correctOption: "A,B",
        questionType: "Multiple Choice",
        explanation: "IOException and SQLException are checked exceptions; NullPointerException and ArithmeticException are unchecked runtime exceptions.",
        points: 10
      },
      {
        questionText: "Which HTTP status code signifies 'Unauthorized'?",
        optionA: "400",
        optionB: "401",
        optionC: "403",
        optionD: "404",
        correctOption: "B",
        questionType: "Single Choice",
        explanation: "401 represents Unauthorized (missing or invalid authentication credentials).",
        points: 10
      },
      {
        questionText: "Which of the following are valid Java primitive types? (Multiple Choice)",
        optionA: "int",
        optionB: "boolean",
        optionC: "String",
        optionD: "char",
        correctOption: "A,B,D",
        questionType: "Multiple Choice",
        explanation: "int, boolean, and char are primitive types in Java. String is a reference class object.",
        points: 10
      }
    ],
    mapToPayload: (row, idx) => {
      const rawCorrect = String(row.correctOption || row.correctAnswer || "A").trim().toUpperCase();
      const correctParts = rawCorrect.split(/[\s,+/]+/).map((s) => s.trim());
      const isMultiple = correctParts.length > 1 || String(row.questionType || "").toLowerCase().includes("multi");

      const isACorrect = correctParts.includes("A") || correctParts.includes("1");
      const isBCorrect = correctParts.includes("B") || correctParts.includes("2");
      const isCCorrect = correctParts.includes("C") || correctParts.includes("3");
      const isDCorrect = correctParts.includes("D") || correctParts.includes("4");

      const qText = String(row.questionText || row.question || row.title || `Question ${idx + 1}`).trim();

      return {
        id: `quiz_q_${Date.now()}_${idx}`,
        questionText: qText,
        question: qText,
        title: `Question ${idx + 1}`,
        text: qText,
        allowMultiple: isMultiple,
        type: isMultiple ? "multiple" : "single",
        options: [
          { id: `opt_a_${idx}`, text: String(row.optionA || "").trim(), isCorrect: isACorrect },
          { id: `opt_b_${idx}`, text: String(row.optionB || "").trim(), isCorrect: isBCorrect },
          { id: `opt_c_${idx}`, text: String(row.optionC || "").trim(), isCorrect: isCCorrect },
          { id: `opt_d_${idx}`, text: String(row.optionD || "").trim(), isCorrect: isDCorrect }
        ],
        correctOption: rawCorrect,
        correctIndex: isBCorrect ? 1 : isCCorrect ? 2 : isDCorrect ? 3 : 0,
        correctIndexes: [
          ...(isACorrect ? [0] : []),
          ...(isBCorrect ? [1] : []),
          ...(isCCorrect ? [2] : []),
          ...(isDCorrect ? [3] : []),
        ],
        answer: rawCorrect,
        explanation: String(row.explanation || "").trim(),
        points: Number(row.points || row.marks) || 10,
        marks: Number(row.points || row.marks) || 10,
      };
    }
  },

  // ─── 6. PROJECT MILESTONE TEMPLATE ─────────────────────────────────────────
  project: {
    moduleType: "project",
    displayName: "Project Milestone & Phase Template",
    description: "Template for defining capstone phases, deliverables, and submission gates.",
    templateFileName: "project_milestones_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Milestone Title",
        type: "string",
        required: true,
        description: "Milestone or phase name",
        sampleValue: "Phase 1: Architecture & API Schema Definition",
      },
      {
        key: "description",
        label: "Deliverable Requirements",
        type: "string",
        required: true,
        description: "Detailed description of requirements for this phase",
        sampleValue: "Deliver OpenAPI 3.0 specification and ER diagram.",
      },
      {
        key: "weightagePercentage",
        label: "Weightage (%)",
        type: "number",
        required: true,
        defaultValue: 25,
        description: "Grade weightage percentage towards final evaluation",
        sampleValue: 25,
      },
      {
        key: "durationDays",
        label: "Duration (Days)",
        type: "number",
        required: false,
        defaultValue: 14,
        description: "Estimated days allocated for milestone completion",
        sampleValue: 14,
      }
    ],
    sampleRows: [
      {
        title: "Phase 1: System Design & DB Schema",
        description: "Design relational database schema and cloud architecture.",
        weightagePercentage: 25,
        durationDays: 10
      },
      {
        title: "Phase 2: Core Microservices Implementation",
        description: "Implement backend business logic with automated tests.",
        weightagePercentage: 45,
        durationDays: 20
      },
      {
        title: "Phase 3: Production Deployment & CI/CD",
        description: "Deploy to Kubernetes and configure automated monitoring.",
        weightagePercentage: 30,
        durationDays: 10
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `prj_m_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      weightagePercentage: Number(row.weightagePercentage) || 25,
      durationDays: Number(row.durationDays) || 14
    })
  },

  // ─── 8. PRACTICE TRACKS BULK CREATION TEMPLATE ─────────────────────────────
  practice_track: {
    moduleType: "practice_track",
    displayName: "Practice Track Template",
    description: "Template for creating multiple Practice Tracks in bulk.",
    templateFileName: "practice_tracks_bulk_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Track Title",
        type: "string",
        required: true,
        description: "Title of the Practice Track (e.g. 'Core Java & Data Structures')",
        sampleValue: "Core Java & OOPs Mastery",
      },
      {
        key: "category",
        label: "Category / Tags",
        type: "string",
        required: false,
        description: "Technical category (e.g. 'Java', 'Python', 'Web Dev')",
        sampleValue: "Java",
      },
      {
        key: "instructor",
        label: "Assigned Instructor",
        type: "string",
        required: false,
        description: "Instructor or Admin author name",
        sampleValue: "Dharunkumar S",
      },
      {
        key: "level",
        label: "Difficulty Level",
        type: "enum",
        required: false,
        options: ["Beginner", "Intermediate", "Advanced"],
        description: "Target difficulty level: Beginner, Intermediate, or Advanced",
        sampleValue: "Intermediate",
      },
      {
        key: "description",
        label: "Track Description",
        type: "string",
        required: false,
        description: "Overview and learning goals of this practice track",
        sampleValue: "Comprehensive hands-on coding and MCQ practice exercises.",
      },
    ],
    sampleRows: [
      {
        title: "Core Java & OOPs Mastery",
        category: "Java",
        instructor: "Dharunkumar S",
        level: "Intermediate",
        description: "Hands-on coding challenges covering classes, interfaces, collections, and streams."
      },
      {
        title: "Python Data Science & NumPy Bootcamp",
        category: "Python",
        instructor: "Dharunkumar S",
        level: "Beginner",
        description: "Foundational Python syntax, data manipulation with pandas, and array operations."
      },
      {
        title: "Full Stack MERN Architecture Practice",
        category: "Web Development",
        instructor: "Dharunkumar S",
        level: "Advanced",
        description: "Production-grade React, Node.js, Express, and MongoDB exercises."
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `track_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      description: String(row.description || "Practice track for student batches.").trim(),
      category: String(row.category || "General").trim(),
      assignedBy: String(row.instructor || "Dharunkumar S").trim(),
      level: (row.level && ["Beginner", "Intermediate", "Advanced"].includes(row.level)) ? row.level : "Intermediate",
      isPublished: true,
      subModules: [],
      assignedBatches: [],
      assignedStudents: [],
    })
  },

  // ─── 9. COURSES BULK CREATION TEMPLATE ──────────────────────────────────────
  course_batch: {
    moduleType: "course_batch",
    displayName: "Course Catalog Template",
    description: "Template for creating multiple Training Courses in bulk.",
    templateFileName: "courses_bulk_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Course Title",
        type: "string",
        required: true,
        description: "Full title of the Course (e.g. 'Mastering Modern Spring Boot 3')",
        sampleValue: "Mastering Modern Spring Boot 3",
      },
      {
        key: "category",
        label: "Category",
        type: "string",
        required: false,
        description: "Category (e.g. 'Web Development', 'Cloud Computing', 'AI & Machine Learning')",
        sampleValue: "Web Development",
      },
      {
        key: "level",
        label: "Level",
        type: "enum",
        required: false,
        options: ["Beginner", "Intermediate", "Advanced"],
        description: "Difficulty level",
        sampleValue: "Intermediate",
      },
      {
        key: "instructor",
        label: "Instructor Name",
        type: "string",
        required: false,
        description: "Primary course instructor",
        sampleValue: "Dharunkumar S",
      },
      {
        key: "description",
        label: "Course Description",
        type: "string",
        required: false,
        description: "Detailed syllabus overview and prerequisites",
        sampleValue: "Deep dive into microservices, Spring Security, and cloud deployments.",
      },
    ],
    sampleRows: [
      {
        title: "Mastering Modern Spring Boot 3",
        category: "Web Development",
        level: "Intermediate",
        instructor: "Dharunkumar S",
        description: "Build robust, scalable enterprise microservices using Spring Boot 3 and Docker."
      },
      {
        title: "Applied Machine Learning & LLM Engineering",
        category: "AI & Machine Learning",
        level: "Advanced",
        instructor: "Dharunkumar S",
        description: "Transformers, RAG pipelines, fine-tuning, and production deployment architectures."
      },
      {
        title: "AWS Certified Solutions Architect Training",
        category: "Cloud Computing",
        level: "Beginner",
        instructor: "Dharunkumar S",
        description: "Complete guide to AWS EC2, S3, RDS, IAM, and enterprise networking."
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `course_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      category: String(row.category || "General").trim(),
      level: (row.level && ["Beginner", "Intermediate", "Advanced"].includes(row.level)) ? row.level : "Intermediate",
      instructor: String(row.instructor || "Dharunkumar S").trim(),
      description: String(row.description || "Comprehensive course curriculum.").trim(),
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=80",
      modules: [],
      totalLessons: 0,
      status: "published",
      enrolledStudents: 0,
      durationHours: 0,
      durationMins: 0,
      isCommon: true,
      assignedBatches: [],
      assignedStudents: [],
    })
  },

  // ─── 10. ASSESSMENTS BULK CREATION TEMPLATE ─────────────────────────────────
  assessment_track: {
    moduleType: "assessment_track",
    displayName: "Assessment Exam Template",
    description: "Template for creating multiple Assessments / Proctored Exams in bulk.",
    templateFileName: "assessments_bulk_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Assessment Title",
        type: "string",
        required: true,
        description: "Title of the Assessment test",
        sampleValue: "Quarterly Java & Algorithms Assessment",
      },
      {
        key: "category",
        label: "Category / Domain",
        type: "string",
        required: false,
        description: "Category (e.g. 'Software Engineering', 'Aptitude')",
        sampleValue: "Software Engineering",
      },
      {
        key: "durationMinutes",
        label: "Duration (Minutes)",
        type: "number",
        required: false,
        description: "Test duration in minutes (e.g. 60, 90, 120)",
        sampleValue: 90,
      },
      {
        key: "totalMarks",
        label: "Total Marks",
        type: "number",
        required: false,
        description: "Total maximum score",
        sampleValue: 100,
      },
      {
        key: "passingMarks",
        label: "Passing Marks",
        type: "number",
        required: false,
        description: "Minimum qualifying score",
        sampleValue: 40,
      },
      {
        key: "description",
        label: "Description",
        type: "string",
        required: false,
        description: "Instructions and test overview",
        sampleValue: "Proctored technical test with coding challenges and multiple choice questions.",
      },
    ],
    sampleRows: [
      {
        title: "Quarterly Java & Algorithms Assessment",
        category: "Software Engineering",
        durationMinutes: 90,
        totalMarks: 100,
        passingMarks: 50,
        description: "Covers Core Java, Collections, Multithreading, and Time Complexities."
      },
      {
        title: "Frontend Engineering & React Mastery Test",
        category: "Web Development",
        durationMinutes: 60,
        totalMarks: 80,
        passingMarks: 40,
        description: "React hooks, state management, performance optimization, and DOM manipulation."
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `test_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      description: String(row.description || "Proctored evaluation test.").trim(),
      category: String(row.category || "General").trim(),
      durationMinutes: Number(row.durationMinutes) || 60,
      totalMarks: Number(row.totalMarks) || 100,
      passingMarks: Number(row.passingMarks) || 40,
      status: "published",
      sections: [],
    })
  },

  // ─── 5. CODING PROBLEMS REPOSITORY TEMPLATE (DYNAMIC LANGUAGE SCOPES) ─────
  coding_problem: getCodingProblemTemplateConfig({ languageMode: "all" }),
  practice_module: {
    moduleType: "practice_module",
    displayName: "Level-3 Practice Module",
    description: "Template for creating multiple Level-3 Practice Modules in bulk under a Submodule.",
    templateFileName: "sensilearn_practice_modules_template.csv",
    columns: [
      {
        key: "name",
        label: "Module Name",
        type: "string",
        required: true,
        description: "Name of the Level-3 Module (e.g. 'C Basics', 'Loops', 'Binary Trees')",
        sampleValue: "C Basics",
      },
      {
        key: "description",
        label: "Description",
        type: "string",
        required: false,
        description: "Detailed description and learning outcomes for this module",
        sampleValue: "Learn syntax, structure, compilation steps, and basic output statements.",
      },
      {
        key: "type",
        label: "Type",
        type: "enum",
        required: true,
        options: ["Mixed", "Coding", "MCQ"],
        defaultValue: "Mixed",
        description: "Assessment delivery type: Mixed, Coding, or MCQ",
        sampleValue: "Mixed",
      },
      {
        key: "durationMinutes",
        label: "Duration (Minutes)",
        type: "number",
        required: false,
        defaultValue: 60,
        description: "Time limit in minutes (use 0 or leave blank for untimed / no limit)",
        sampleValue: 30,
      },
      {
        key: "totalMarks",
        label: "Total Marks",
        type: "number",
        required: false,
        defaultValue: 100,
        description: "Total maximum score for this practice assessment",
        sampleValue: 100,
      },
      {
        key: "passingMarks",
        label: "Passing Marks",
        type: "number",
        required: false,
        defaultValue: 40,
        description: "Minimum marks required to pass or achieve benchmark",
        sampleValue: 40,
      },
      {
        key: "status",
        label: "Status",
        type: "enum",
        required: false,
        options: ["Active", "Inactive"],
        defaultValue: "Active",
        description: "Initial status: Active or Inactive",
        sampleValue: "Active",
      },
      {
        key: "displayOrder",
        label: "Display Order",
        type: "number",
        required: false,
        description: "Display ordering sequence (leave blank to auto-assign)",
        sampleValue: 1,
      },
    ],
    sampleRows: [
      {
        name: "C Basics",
        description: "Learn C syntax, structure and fundamentals",
        type: "Mixed",
        durationMinutes: 30,
        totalMarks: 100,
        passingMarks: 40,
        status: "Active",
        displayOrder: 1,
      },
      {
        name: "Variables and Data Types",
        description: "Learn int, float, char, memory allocation and limits",
        type: "Coding",
        durationMinutes: 45,
        totalMarks: 100,
        passingMarks: 40,
        status: "Active",
        displayOrder: 2,
      },
      {
        name: "Operators and Expressions",
        description: "Master arithmetic, logical, and bitwise operators",
        type: "MCQ",
        durationMinutes: 20,
        totalMarks: 50,
        passingMarks: 20,
        status: "Active",
        displayOrder: 3,
      },
      {
        name: "Input and Output",
        description: "Master scanf and printf format specifiers",
        type: "Coding",
        durationMinutes: 30,
        totalMarks: 100,
        passingMarks: 40,
        status: "Active",
        displayOrder: 4,
      },
    ],
    mapToPayload: (row: Record<string, any>, idx: number) => {
      const rawType = String(row.type || "mixed").toLowerCase().trim();
      const type = (rawType === "coding" || rawType === "code") ? "coding" : (rawType === "mcq" ? "mcq" : "mixed");
      const rawStatus = String(row.status || "active").toLowerCase().trim();
      const status = rawStatus === "inactive" ? "inactive" : "active";

      return {
        name: String(row.name || row.title || "").trim(),
        title: String(row.name || row.title || "").trim(),
        description: String(row.description || "").trim(),
        type,
        durationMinutes: Number(row.durationMinutes ?? row.duration ?? 60),
        totalMarks: Number(row.totalMarks ?? row.marks ?? 100),
        passingMarks: Number(row.passingMarks ?? 40),
        status,
        displayOrder: row.displayOrder !== undefined && row.displayOrder !== "" ? Number(row.displayOrder) : idx + 1,
      };
    },
  },

  // ─── 11. MIXED QUESTIONS (MCQ + CODING) TEMPLATE FOR PRACTICE MODULES ────
  mixed_questions: getMixedQuestionsTemplateConfig(),
};

// ─── 11. MIXED QUESTIONS (MCQ + CODING) TEMPLATE DYNAMIC GENERATOR ─────────
export function getMixedQuestionsTemplateConfig(options?: CodingTemplateOptions): ModuleTemplateConfig {
  const mode = options?.languageMode || "all";
  const singleLang = options?.selectedSingleLanguage || "python";
  const singleLangDef: CodingLanguageDef = CODING_LANGUAGES.find(l => l.id === singleLang) || CODING_LANGUAGES[0]!;
  const multiLangs = options?.selectedMultiLanguages && options.selectedMultiLanguages.length > 0
    ? options.selectedMultiLanguages
    : ["python", "java", "cpp"];

  let templateFileName = "module_mixed_questions_template.csv";
  let displayName = "Mixed Questions (MCQ + Coding) Template";
  let description = "Template for bulk uploading both Multiple Choice Questions and interactive Coding challenges into a single module.";

  let languageColumns: ColumnDefinition[] = [];

  if (mode === "single") {
    templateFileName = `module_mixed_questions_${singleLang}_template.xlsx`;
    displayName = `Mixed Questions Template (Single Language: ${singleLangDef.name})`;
    description = `Combined template for Multiple Choice Questions and Coding problems strictly locked to ${singleLangDef.name}.`;

    languageColumns = [
      {
        key: "language",
        label: "Coding Language",
        type: "enum",
        required: false,
        defaultValue: singleLangDef.name,
        options: CODING_LANGUAGES.map(l => l.name),
        description: `Single locked programming language for coding challenges: ${singleLangDef.name}`,
        sampleValue: singleLangDef.name,
      },
      {
        key: "starterCode",
        label: `Starter Code (${singleLangDef.name})`,
        type: "string",
        required: false,
        description: `Starter boilerplate code provided to learners in ${singleLangDef.name} (Coding challenges only)`,
        sampleValue: CODING_LANGUAGE_STARTERS[singleLang] || CODING_LANGUAGE_STARTERS.python,
      },
      {
        key: "allowed_languages",
        label: "Allowed Languages (Coding)",
        type: "string",
        required: false,
        defaultValue: singleLangDef.id,
        description: `Strictly locked compiler ID for this problem (${singleLangDef.id})`,
        sampleValue: singleLangDef.id,
      },
    ];
  } else if (mode === "multi") {
    templateFileName = "module_mixed_questions_multi_language_template.xlsx";
    const selectedNames = multiLangs.map(id => CODING_LANGUAGES.find(l => l.id === id)?.name || id.toUpperCase());
    displayName = `Mixed Questions Template (Multi Language: ${selectedNames.join(", ")})`;
    description = `Combined template for MCQ and Coding challenges enabled across: ${selectedNames.join(", ")}.`;

    languageColumns = [
      {
        key: "allowed_languages",
        label: "Allowed Languages (Coding)",
        type: "string",
        required: false,
        defaultValue: multiLangs.join(", "),
        description: `Comma-separated list of enabled compilers for coding challenges: ${multiLangs.join(", ")}`,
        sampleValue: multiLangs.join(", "),
      },
      {
        key: "starterCode",
        label: "Starter Code (Default / Fallback)",
        type: "string",
        required: false,
        description: "Default starter code boilerplate for coding questions",
        sampleValue: CODING_LANGUAGE_STARTERS[multiLangs[0] || "python"] || CODING_LANGUAGE_STARTERS.python,
      },
      ...multiLangs.map(lId => {
        const lDef = CODING_LANGUAGES.find(l => l.id === lId) || { id: lId, name: lId.toUpperCase() };
        return {
          key: `${lId}_starter_code`,
          label: `Starter Code (${lDef.name})`,
          type: "string" as ColumnType,
          required: false,
          description: `Optional dedicated starter code template for ${lDef.name}`,
          sampleValue: CODING_LANGUAGE_STARTERS[lId] || "",
        };
      }),
    ];
  } else {
    languageColumns = [
      {
        key: "allowed_languages",
        label: "Allowed Languages (Coding, optional)",
        type: "string",
        required: false,
        description: "Optional comma-separated list of allowed compilers for this question (e.g. 'python, java')",
        sampleValue: "python, java, cpp",
      },
      {
        key: "starterCode",
        label: "Starter Code (Coding)",
        type: "string",
        required: false,
        description: "Starter boilerplate code for learners (Coding challenges only)",
        sampleValue: CODING_LANGUAGE_STARTERS.java,
      },
    ];
  }

  const columns: ColumnDefinition[] = [
    {
      key: "type",
      label: "Question Type",
      type: "enum",
      required: true,
      options: ["MCQ", "Multiple Choice", "MSQ", "Coding"],
      defaultValue: "MCQ",
      description: "Specify whether this row is an 'MCQ' / 'Multiple Choice', 'MSQ', or 'Coding' challenge",
      sampleValue: "MCQ",
    },
    {
      key: "title",
      label: "Question Title / Prompt",
      type: "string",
      required: true,
      description: "Question prompt for MCQ, or challenge title for Coding problems",
      sampleValue: "Which keyword prevents method overriding in Java?",
    },
    {
      key: "difficulty",
      label: "Difficulty",
      type: "enum",
      required: false,
      options: ["Easy", "Medium", "Hard"],
      defaultValue: "Easy",
      description: "Difficulty level: Easy, Medium, or Hard",
      sampleValue: "Easy",
    },
    {
      key: "marks",
      label: "Marks / Points",
      type: "number",
      required: false,
      defaultValue: 10,
      description: "Score marks awarded for this question",
      sampleValue: 10,
    },
    // MCQ-specific columns
    {
      key: "optionA",
      label: "Option A (MCQ)",
      type: "string",
      required: false,
      description: "Option A choice text (MCQ only)",
      sampleValue: "static",
    },
    {
      key: "optionB",
      label: "Option B (MCQ)",
      type: "string",
      required: false,
      description: "Option B choice text (MCQ only)",
      sampleValue: "final",
    },
    {
      key: "optionC",
      label: "Option C (MCQ)",
      type: "string",
      required: false,
      description: "Option C choice text (MCQ only)",
      sampleValue: "abstract",
    },
    {
      key: "optionD",
      label: "Option D (MCQ)",
      type: "string",
      required: false,
      description: "Option D choice text (MCQ only)",
      sampleValue: "synchronized",
    },
    {
      key: "correctOption",
      label: "Correct Option (A, B, C, or D)",
      type: "string",
      required: false,
      description: "Correct answer choice: A, B, C, or D (MCQ only)",
      sampleValue: "B",
    },
    {
      key: "explanation",
      label: "Explanation (MCQ)",
      type: "string",
      required: false,
      description: "Detailed solution explanation (MCQ only)",
      sampleValue: "Marking a method with 'final' in Java forbids subclasses from overriding it.",
    },
    // Coding-specific columns
    {
      key: "description",
      label: "Problem Description (Coding)",
      type: "string",
      required: false,
      description: "Problem statement and instructions for Coding problems",
      sampleValue: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
    },
    {
      key: "constraints",
      label: "Constraints (Coding)",
      type: "string",
      required: false,
      description: "Input range and constraints (Coding only)",
      sampleValue: "2 <= nums.length <= 10^4",
    },
    {
      key: "input_format",
      label: "Input Format (Coding)",
      type: "string",
      required: false,
      description: "Input format received via stdin (Coding only)",
      sampleValue: "Line 1: space-separated integers for nums. Line 2: target integer.",
    },
    {
      key: "output_format",
      label: "Output Format (Coding)",
      type: "string",
      required: false,
      description: "Expected stdout structure (Coding only)",
      sampleValue: "Print two 0-indexed positions separated by a space.",
    },
    // Injected Language & Starter Code Columns
    ...languageColumns,
    // Test cases
    {
      key: "testcase_1_input",
      label: "Test Case 1 Input (Coding)",
      type: "string",
      required: false,
      description: "Public testcase 1 input (Coding only)",
      sampleValue: "2 7 11 15\n9",
    },
    {
      key: "testcase_1_output",
      label: "Test Case 1 Expected Output (Coding)",
      type: "string",
      required: false,
      description: "Public testcase 1 expected output (Coding only)",
      sampleValue: "0 1",
    },
    {
      key: "testcase_2_input",
      label: "Test Case 2 Input (Coding)",
      type: "string",
      required: false,
      description: "Public testcase 2 input (Coding only)",
      sampleValue: "3 2 4\n6",
    },
    {
      key: "testcase_2_output",
      label: "Test Case 2 Expected Output (Coding)",
      type: "string",
      required: false,
      description: "Public testcase 2 expected output (Coding only)",
      sampleValue: "1 2",
    },
    {
      key: "hidden_testcase_input",
      label: "Hidden Test Case 1 Input (Coding)",
      type: "string",
      required: false,
      description: "Hidden evaluation input (Coding only)",
      sampleValue: "3 3\n6",
    },
    {
      key: "hidden_testcase_output",
      label: "Hidden Test Case 1 Expected Output (Coding)",
      type: "string",
      required: false,
      description: "Hidden evaluation expected output (Coding only)",
      sampleValue: "0 1",
    },
  ];

  const codingStarterSample = mode === "single"
    ? (CODING_LANGUAGE_STARTERS[singleLang] || CODING_LANGUAGE_STARTERS.python)
    : mode === "multi"
    ? (CODING_LANGUAGE_STARTERS[multiLangs[0] || "python"] || CODING_LANGUAGE_STARTERS.python)
    : CODING_LANGUAGE_STARTERS.java;

  const sampleRows: Record<string, any>[] = [
    {
      type: "MCQ",
      title: "Which keyword prevents method overriding in Java?",
      difficulty: "Easy",
      marks: 10,
      optionA: "static",
      optionB: "final",
      optionC: "abstract",
      optionD: "synchronized",
      correctOption: "B",
      explanation: "Marking a method with 'final' in Java forbids subclasses from overriding it.",
      description: "",
      constraints: "",
      input_format: "",
      output_format: "",
      starterCode: "",
      language: mode === "single" ? singleLangDef.name : "",
      allowed_languages: mode === "single" ? singleLang : (mode === "multi" ? multiLangs.join(", ") : ""),
      testcase_1_input: "",
      testcase_1_output: "",
      testcase_2_input: "",
      testcase_2_output: "",
      hidden_testcase_input: "",
      hidden_testcase_output: "",
    },
    {
      type: "MCQ",
      title: "What is the average time complexity of lookup in a HashMap in Java?",
      difficulty: "Medium",
      marks: 10,
      optionA: "O(1)",
      optionB: "O(log n)",
      optionC: "O(n)",
      optionD: "O(n log n)",
      correctOption: "A",
      explanation: "Assuming a proper hash distribution, HashMap provides O(1) average lookup time.",
      description: "",
      constraints: "",
      input_format: "",
      output_format: "",
      starterCode: "",
      language: mode === "single" ? singleLangDef.name : "",
      allowed_languages: mode === "single" ? singleLang : (mode === "multi" ? multiLangs.join(", ") : ""),
      testcase_1_input: "",
      testcase_1_output: "",
      testcase_2_input: "",
      testcase_2_output: "",
      hidden_testcase_input: "",
      hidden_testcase_output: "",
    },
    {
      type: "Coding",
      title: "Two Sum Problem",
      difficulty: "Easy",
      marks: 10,
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "",
      explanation: "",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
      input_format: "Line 1: space separated integers for nums\nLine 2: target integer",
      output_format: "Print two 0-based indices separated by space",
      language: mode === "single" ? singleLangDef.name : "",
      allowed_languages: mode === "single" ? singleLang : (mode === "multi" ? multiLangs.join(", ") : "python, java, cpp"),
      starterCode: codingStarterSample,
      testcase_1_input: "2 7 11 15\n9",
      testcase_1_output: "0 1",
      testcase_2_input: "3 2 4\n6",
      testcase_2_output: "1 2",
      hidden_testcase_input: "3 3\n6",
      hidden_testcase_output: "0 1",
    },
    {
      type: "Coding",
      title: "Check Even or Odd",
      difficulty: "Easy",
      marks: 10,
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "",
      explanation: "",
      description: "Given an integer n, print 'Even' if it is divisible by 2, otherwise print 'Odd'.",
      constraints: "-10^9 <= n <= 10^9",
      input_format: "A single integer n",
      output_format: "Print 'Even' or 'Odd'",
      language: mode === "single" ? singleLangDef.name : "",
      allowed_languages: mode === "single" ? singleLang : (mode === "multi" ? multiLangs.join(", ") : "python, java, cpp"),
      starterCode: codingStarterSample,
      testcase_1_input: "4",
      testcase_1_output: "Even",
      testcase_2_input: "7",
      testcase_2_output: "Odd",
      hidden_testcase_input: "12",
      hidden_testcase_output: "Even",
    },
  ];

  return {
    moduleType: "mixed_questions",
    displayName,
    description,
    templateFileName,
    columns,
    sampleRows,
    mapToPayload: (row: Record<string, any>, idx: number) => {
      const rawType = String(row.type || "").toLowerCase().trim();
      const cleanType = rawType.replace(/[\s_-]+/g, "");
      const hasMcqOptions = Boolean(row.optionA || row.optionB || row.option_1 || row.correctOption);
      const isCoding = cleanType === "coding" || cleanType === "code";
      const isMcq = 
        cleanType === "mcq" || 
        cleanType === "msq" || 
        cleanType.includes("choice") || 
        cleanType.includes("select") || 
        (!isCoding && hasMcqOptions);

      if (isMcq) {
        const rawCorrect = String(row.correctOption || row.correctAnswer || "A").trim().toUpperCase();
        const correctParts = rawCorrect.split(/[,;\s]+/).map(s => s.trim());
        return {
          questionCategory: "mcq",
          id: `mcq_bulk_${Date.now()}_${idx}`,
          questionText: String(row.title || row.questionText || row.question || `Question ${idx + 1}`).trim(),
          marks: Number(row.marks) || 10,
          difficulty: row.difficulty || "Easy",
          explanation: String(row.explanation || "").trim(),
          options: [
            { id: `opt_${Date.now()}_1_${idx}`, text: String(row.optionA || row.option_1 || "Option A").trim(), isCorrect: correctParts.includes("A") || correctParts.includes("1") || rawCorrect === "A" },
            { id: `opt_${Date.now()}_2_${idx}`, text: String(row.optionB || row.option_2 || "Option B").trim(), isCorrect: correctParts.includes("B") || correctParts.includes("2") || rawCorrect === "B" },
            { id: `opt_${Date.now()}_3_${idx}`, text: String(row.optionC || row.option_3 || "Option C").trim(), isCorrect: correctParts.includes("C") || correctParts.includes("3") || rawCorrect === "C" },
            { id: `opt_${Date.now()}_4_${idx}`, text: String(row.optionD || row.option_4 || "Option D").trim(), isCorrect: correctParts.includes("D") || correctParts.includes("4") || rawCorrect === "D" },
          ].filter(o => o.text !== ""),
        };
      }

      // Coding Problem
      const testCases: any[] = [];
      for (let i = 1; i <= 5; i++) {
        const tcIn = row[`testcase_${i}_input`] ?? row[`testcase${i}_input`];
        const tcOut = row[`testcase_${i}_output`] ?? row[`testcase${i}_output`];
        if (tcIn !== undefined || tcOut !== undefined) {
          testCases.push({
            id: `tc_${Date.now()}_${i}_${idx}`,
            input: String(tcIn || "").trim(),
            output: String(tcOut || "").trim(),
            expected_output: String(tcOut || "").trim(),
            expectedOutput: String(tcOut || "").trim(),
            is_hidden: false,
          });
        }
      }
      for (let h = 1; h <= 5; h++) {
        const hIn = h === 1 ? (row.hidden_testcase_input ?? row.hidden_testcase_1_input) : row[`hidden_testcase_${h}_input`];
        const hOut = h === 1 ? (row.hidden_testcase_output ?? row.hidden_testcase_1_output) : row[`hidden_testcase_${h}_output`];
        if (hIn !== undefined || hOut !== undefined) {
          testCases.push({
            id: `tc_h_${Date.now()}_${h}_${idx}`,
            input: String(hIn || "").trim(),
            output: String(hOut || "").trim(),
            expected_output: String(hOut || "").trim(),
            expectedOutput: String(hOut || "").trim(),
            is_hidden: true,
          });
        }
      }

      const rawTitle = String(row.title || `Coding Challenge ${idx + 1}`).trim();
      const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `prob-${Date.now()}-${idx}`;

      // Resolve Language Scope & Templates
      let allowed_languages: string[] | undefined = undefined;
      if (row.allowed_languages) {
        allowed_languages = String(row.allowed_languages)
          .split(/[,|;\s]+/)
          .map(s => s.trim().toLowerCase())
          .filter(Boolean);
      } else if (mode === "single") {
        allowed_languages = [singleLang];
      } else if (mode === "multi" && multiLangs && multiLangs.length > 0) {
        allowed_languages = multiLangs;
      } else if (row.language) {
        const match = CODING_LANGUAGES.find(l => l.name.toLowerCase() === String(row.language).toLowerCase().trim() || l.id === String(row.language).toLowerCase().trim());
        allowed_languages = [match?.id || String(row.language).toLowerCase().trim()];
      }

      const default_language =
        (mode === "single" ? singleLang : undefined) ||
        (row.default_language ? String(row.default_language).trim().toLowerCase() : undefined) ||
        allowed_languages?.[0] ||
        "python";

      let templates: Record<string, string> = {};
      const genStarter = row.starterCode ?? row.starter_code ?? row.code ?? row.boilerplate;

      if (mode === "single") {
        if (genStarter && String(genStarter).trim()) {
          templates[singleLang] = String(genStarter).trim();
        }
      } else if (mode === "multi") {
        multiLangs.forEach(lId => {
          const lVal = row[`${lId}_starter_code`] ?? row[`${lId}_starter`];
          if (lVal && String(lVal).trim()) {
            templates[lId] = String(lVal).trim();
          }
        });
        if (Object.keys(templates).length === 0 && genStarter && String(genStarter).trim()) {
          templates[default_language] = String(genStarter).trim();
        }
      } else {
        CODING_LANGUAGES.forEach(l => {
          const lVal = row[`${l.id}_starter_code`] ?? row[`${l.id}_starter`];
          if (lVal && String(lVal).trim()) templates[l.id] = String(lVal).trim();
        });
        if (Object.keys(templates).length === 0 && genStarter && String(genStarter).trim()) {
          templates[default_language] = String(genStarter).trim();
        }
      }

      // Retain ONLY templates explicitly provided by author - NEVER inject default boilerplate!
      const pruned: Record<string, string> = {};
      if (allowed_languages && allowed_languages.length > 0) {
        allowed_languages.forEach(lId => {
          if (templates[lId] && templates[lId].trim()) {
            pruned[lId] = templates[lId].trim();
          }
        });
      } else {
        Object.entries(templates).forEach(([lId, codeStr]) => {
          if (codeStr && codeStr.trim()) {
            pruned[lId] = codeStr.trim();
          }
        });
      }
      templates = pruned;

      const starterCodePayload = {
        scope: "practice",
        templates,
        allowed_languages,
        allowedLanguages: allowed_languages,
        default_language,
        defaultLanguage: default_language,
        test_cases: testCases,
      };

      return {
        type: "coding",
        questionCategory: "coding",
        id: `cp_${slug}_${Date.now()}_${idx}`,
        title: rawTitle,
        slug,
        description: String(row.description || row.title || "").trim(),
        problemStatement: String(row.description || row.problemStatement || row.title || "").trim(),
        difficulty: (row.difficulty || "Easy").toLowerCase(),
        category: "Algorithms",
        points: Number(row.marks || row.points) || 10,
        marks: Number(row.marks || row.points) || 10,
        constraints: String(row.constraints || "").trim(),
        input_format: String(row.input_format || row.inputFormat || "").trim(),
        inputFormat: String(row.input_format || row.inputFormat || "").trim(),
        output_format: String(row.output_format || row.outputFormat || "").trim(),
        outputFormat: String(row.output_format || row.outputFormat || "").trim(),
        starter_code: starterCodePayload,
        starterCode: String(row.starterCode || row.starter_code || templates[default_language] || "").trim(),
        templates,
        allowed_languages,
        allowedLanguages: allowed_languages,
        default_language,
        defaultLanguage: default_language,
        test_cases: testCases,
        testCases: testCases.map((tc) => ({
          id: tc.id,
          input: tc.input,
          output: tc.output,
          expected_output: tc.expected_output,
          isHidden: Boolean(tc.is_hidden),
          is_hidden: Boolean(tc.is_hidden),
        })),
        sample_test_cases: testCases.filter((tc) => !tc.is_hidden),
        hidden_test_cases: testCases.filter((tc) => tc.is_hidden),
        status: "published",
        scope: "practice",
      };
    },
  };
}

// ─── 4.5. ASSESSMENT SECTION & QUESTIONS TEMPLATE DYNAMIC GENERATOR ────────
export function getAssessmentQuestionsTemplateConfig(options?: CodingTemplateOptions): ModuleTemplateConfig {
  const mode = options?.languageMode || "all";
  const singleLang = (options?.selectedSingleLanguage || "python").toLowerCase();
  const singleLangDef: CodingLanguageDef = CODING_LANGUAGES.find(l => l.id === singleLang) || CODING_LANGUAGES[0]!;
  const multiLangs = (options?.selectedMultiLanguages && options.selectedMultiLanguages.length > 0)
    ? options.selectedMultiLanguages.map(l => l.toLowerCase())
    : ["python", "java", "cpp"];

  let templateFileName = "assessment_sections_and_questions_template.xlsx";
  let displayName = "Assessment Sections & Questions Template";
  let description = "Template for bulk importing questions organized into sections (e.g. Aptitude, Technical, Coding) under an Assessment.";

  let languageColumns: ColumnDefinition[] = [];

  if (mode === "single") {
    templateFileName = `assessment_sections_and_questions_${singleLang}_template.xlsx`;
    displayName = `Assessment Sections & Questions Template (Single Language: ${singleLangDef.name})`;
    description = `Template for importing assessment questions with Coding challenges strictly locked to ${singleLangDef.name}.`;

    languageColumns = [
      {
        key: "language",
        label: "Coding Language",
        type: "enum",
        required: false,
        defaultValue: singleLangDef.name,
        options: CODING_LANGUAGES.map(l => l.name),
        description: `Single locked programming language for coding challenges: ${singleLangDef.name}`,
        sampleValue: singleLangDef.name,
      },
      {
        key: "starterCode",
        label: `Starter Code (${singleLangDef.name})`,
        type: "string",
        required: false,
        description: `Starter boilerplate code provided in ${singleLangDef.name} for coding questions`,
        sampleValue: CODING_LANGUAGE_STARTERS[singleLang] || CODING_LANGUAGE_STARTERS.python,
      },
      {
        key: "allowed_languages",
        label: "Allowed Languages (Coding)",
        type: "string",
        required: false,
        defaultValue: singleLangDef.id,
        description: `Strictly locked compiler ID for this problem (${singleLangDef.id})`,
        sampleValue: singleLangDef.id,
      },
    ];
  } else if (mode === "multi") {
    templateFileName = "assessment_sections_and_questions_multi_language_template.xlsx";
    const selectedNames = multiLangs.map(id => CODING_LANGUAGES.find(l => l.id === id)?.name || id.toUpperCase());
    displayName = `Assessment Sections & Questions Template (Multi Language: ${selectedNames.join(", ")})`;
    description = `Template for assessment questions with Coding challenges enabled across: ${selectedNames.join(", ")}.`;

    languageColumns = [
      {
        key: "allowed_languages",
        label: "Allowed Languages (Coding)",
        type: "string",
        required: false,
        defaultValue: multiLangs.join(", "),
        description: `Comma-separated list of enabled compilers for coding challenges: ${multiLangs.join(", ")}`,
        sampleValue: multiLangs.join(", "),
      },
      {
        key: "starterCode",
        label: "Starter Code (Default / Fallback)",
        type: "string",
        required: false,
        description: "Default starter code boilerplate for coding questions",
        sampleValue: CODING_LANGUAGE_STARTERS[multiLangs[0] || "python"] || CODING_LANGUAGE_STARTERS.python,
      },
      ...multiLangs.map(lId => {
        const lDef = CODING_LANGUAGES.find(l => l.id === lId) || { id: lId, name: lId.toUpperCase() };
        return {
          key: `${lId}_starter_code`,
          label: `Starter Code (${lDef.name})`,
          type: "string" as ColumnType,
          required: false,
          description: `Optional dedicated starter code template for ${lDef.name}`,
          sampleValue: CODING_LANGUAGE_STARTERS[lId] || "",
        };
      }),
    ];
  } else {
    languageColumns = [
      {
        key: "allowed_languages",
        label: "Allowed Languages (Coding, optional)",
        type: "string",
        required: false,
        description: "Optional comma-separated list of allowed compilers for this question (e.g. 'python, java')",
        sampleValue: "python, java, cpp",
      },
      {
        key: "starterCode",
        label: "Starter Boilerplate Code",
        type: "string",
        required: false,
        description: "Pre-filled code template for students",
        sampleValue: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}",
      },
    ];
  }

  const columns: ColumnDefinition[] = [
    {
      key: "assessmentTitle",
      label: "Assessment Title",
      type: "string",
      required: false,
      description: "Title of the Assessment exam (e.g. 'Java MNC Assessment'). If left blank, questions will attach to the currently open assessment.",
      sampleValue: "Java MNC Assessment",
    },
    {
      key: "sectionName",
      label: "Section Name",
      type: "string",
      required: false,
      defaultValue: "General Assessment",
      description: "Name of the Section (e.g. 'Aptitude & Logical Reasoning', 'Technical MCQ', 'Programming Fundamentals', 'Coding'). If left blank, automatically categorized based on question type.",
      sampleValue: "Aptitude & Logical Reasoning",
    },
    {
      key: "title",
      label: "Question / Problem Statement",
      type: "string",
      required: true,
      description: "The complete question prompt or programming challenge problem statement",
      sampleValue: "What is the primary difference between JVM and JRE?",
    },
    {
      key: "type",
      label: "Question Type",
      type: "enum",
      required: true,
      options: ["mcq", "Multiple Choice", "msq", "coding"],
      description: "Type of question: mcq / Multiple Choice (Single choice), msq (Multiple select), or coding (Live execution)",
      sampleValue: "mcq",
    },
    {
      key: "marks",
      label: "Marks / Points",
      type: "number",
      required: true,
      defaultValue: 5,
      description: "Marks allocated for this question",
      sampleValue: 5,
    },
    {
      key: "difficulty",
      label: "Difficulty Level",
      type: "enum",
      required: false,
      options: ["Easy", "Medium", "Hard"],
      defaultValue: "Easy",
      description: "Question difficulty rating",
      sampleValue: "Easy",
    },
    {
      key: "optionA",
      label: "Option A",
      type: "string",
      required: false,
      description: "MCQ / MSQ Option A text",
      sampleValue: "JVM executes bytecode; JRE provides libraries + JVM.",
    },
    {
      key: "optionB",
      label: "Option B",
      type: "string",
      required: false,
      description: "MCQ / MSQ Option B text",
      sampleValue: "JVM compiles source code; JRE executes binary.",
    },
    {
      key: "optionC",
      label: "Option C",
      type: "string",
      required: false,
      description: "MCQ / MSQ Option C text",
      sampleValue: "JVM and JRE are completely identical.",
    },
    {
      key: "optionD",
      label: "Option D",
      type: "string",
      required: false,
      description: "MCQ / MSQ Option D text",
      sampleValue: "None of the above.",
    },
    {
      key: "correctOption",
      label: "Correct Option (A/B/C/D)",
      type: "string",
      required: false,
      description: "For MCQ enter single letter (A, B, C, or D). For MSQ enter comma-separated letters (e.g. A,B).",
      sampleValue: "A",
    },
    {
      key: "explanation",
      label: "Explanation",
      type: "string",
      required: false,
      description: "Reasoning and explanation shown in test review",
      sampleValue: "JVM is the execution runtime; JRE bundles the JVM with class libraries.",
    },
    {
      key: "constraints",
      label: "Coding Constraints",
      type: "string",
      required: false,
      description: "Execution boundary for coding problems (e.g. '1 <= N <= 10^5')",
      sampleValue: "1 <= N <= 10^5",
    },
    {
      key: "input_format",
      label: "Coding Input Format",
      type: "string",
      required: false,
      description: "Expected structure from stdin",
      sampleValue: "Single line containing integer N",
    },
    {
      key: "output_format",
      label: "Coding Output Format",
      type: "string",
      required: false,
      description: "Expected printed output to stdout",
      sampleValue: "Print the computed result",
    },
    ...languageColumns,
    {
      key: "testcase_1_input",
      label: "Test Case 1 Input",
      type: "string",
      required: false,
      description: "First public testcase input for coding problems",
      sampleValue: "5",
    },
    {
      key: "testcase_1_output",
      label: "Test Case 1 Expected Output",
      type: "string",
      required: false,
      description: "First public testcase expected output",
      sampleValue: "120",
    },
    {
      key: "testcase_2_input",
      label: "Test Case 2 Input",
      type: "string",
      required: false,
      description: "Second public testcase input",
      sampleValue: "3",
    },
    {
      key: "testcase_2_output",
      label: "Test Case 2 Expected Output",
      type: "string",
      required: false,
      description: "Second public testcase expected output",
      sampleValue: "6",
    },
    {
      key: "testcase_3_input",
      label: "Test Case 3 Input",
      type: "string",
      required: false,
      description: "Third public testcase input",
      sampleValue: "4",
    },
    {
      key: "testcase_3_output",
      label: "Test Case 3 Expected Output",
      type: "string",
      required: false,
      description: "Third public testcase expected output",
      sampleValue: "24",
    },
    {
      key: "testcase_4_input",
      label: "Test Case 4 Input",
      type: "string",
      required: false,
      description: "Fourth public testcase input",
      sampleValue: "2",
    },
    {
      key: "testcase_4_output",
      label: "Test Case 4 Expected Output",
      type: "string",
      required: false,
      description: "Fourth public testcase expected output",
      sampleValue: "2",
    },
    {
      key: "testcase_5_input",
      label: "Test Case 5 Input",
      type: "string",
      required: false,
      description: "Fifth public testcase input",
      sampleValue: "1",
    },
    {
      key: "testcase_5_output",
      label: "Test Case 5 Expected Output",
      type: "string",
      required: false,
      description: "Fifth public testcase expected output",
      sampleValue: "1",
    },
    {
      key: "hidden_testcase_input",
      label: "Hidden Test Case 1 Input",
      type: "string",
      required: false,
      description: "Hidden evaluation testcase 1 to prevent hardcoding",
      sampleValue: "7",
    },
    {
      key: "hidden_testcase_output",
      label: "Hidden Test Case 1 Expected Output",
      type: "string",
      required: false,
      description: "Hidden evaluation 1 expected output",
      sampleValue: "5040",
    },
    {
      key: "hidden_testcase_2_input",
      label: "Hidden Test Case 2 Input",
      type: "string",
      required: false,
      description: "Hidden evaluation testcase 2",
      sampleValue: "8",
    },
    {
      key: "hidden_testcase_2_output",
      label: "Hidden Test Case 2 Expected Output",
      type: "string",
      required: false,
      description: "Hidden evaluation 2 expected output",
      sampleValue: "40320",
    },
    {
      key: "hidden_testcase_3_input",
      label: "Hidden Test Case 3 Input",
      type: "string",
      required: false,
      description: "Hidden evaluation testcase 3",
      sampleValue: "9",
    },
    {
      key: "hidden_testcase_3_output",
      label: "Hidden Test Case 3 Expected Output",
      type: "string",
      required: false,
      description: "Hidden evaluation 3 expected output",
      sampleValue: "362880",
    },
    {
      key: "hidden_testcase_4_input",
      label: "Hidden Test Case 4 Input",
      type: "string",
      required: false,
      description: "Hidden evaluation testcase 4",
      sampleValue: "10",
    },
    {
      key: "hidden_testcase_4_output",
      label: "Hidden Test Case 4 Expected Output",
      type: "string",
      required: false,
      description: "Hidden evaluation 4 expected output",
      sampleValue: "3628800",
    },
    {
      key: "hidden_testcase_5_input",
      label: "Hidden Test Case 5 Input",
      type: "string",
      required: false,
      description: "Hidden evaluation testcase 5",
      sampleValue: "0",
    },
    {
      key: "hidden_testcase_5_output",
      label: "Hidden Test Case 5 Expected Output",
      type: "string",
      required: false,
      description: "Hidden evaluation 5 expected output",
      sampleValue: "1",
    },
  ];

  const sampleStarter = mode === "single"
    ? (CODING_LANGUAGE_STARTERS[singleLang] || CODING_LANGUAGE_STARTERS.python)
    : mode === "multi"
    ? (CODING_LANGUAGE_STARTERS[multiLangs[0] || "python"] || CODING_LANGUAGE_STARTERS.python)
    : CODING_LANGUAGE_STARTERS.java;

  const sampleRows: Record<string, any>[] = [
    // Section 1: Aptitude & Logical Reasoning (MCQs)
    {
      assessmentTitle: "Java MNC Assessment",
      sectionName: "Aptitude & Logical Reasoning",
      title: "Find the missing number in series: 2, 6, 12, 20, 30, ?",
      type: "mcq",
      marks: 2,
      difficulty: "Easy",
      optionA: "36",
      optionB: "40",
      optionC: "42",
      optionD: "46",
      correctOption: "C",
      explanation: "The differences are +4, +6, +8, +10, +12. 30 + 12 = 42."
    },
    {
      assessmentTitle: "Java MNC Assessment",
      sectionName: "Aptitude & Logical Reasoning",
      title: "A train running at 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
      type: "mcq",
      marks: 2,
      difficulty: "Easy",
      optionA: "120 meters",
      optionB: "150 meters",
      optionC: "180 meters",
      optionD: "200 meters",
      correctOption: "B",
      explanation: "Speed = 60 * (5/18) = 50/3 m/s. Length = (50/3) * 9 = 150 meters."
    },
    {
      assessmentTitle: "Java MNC Assessment",
      sectionName: "Programming Fundamentals",
      title: "Which of the following is NOT an access modifier in Java?",
      type: "mcq",
      marks: 2,
      difficulty: "Easy",
      optionA: "private",
      optionB: "protected",
      optionC: "internal",
      optionD: "public",
      correctOption: "C",
      explanation: "'internal' is a C# keyword, not supported in Java."
    },
    {
      assessmentTitle: "Java MNC Assessment",
      sectionName: "Technical MCQ",
      title: "Which of the following are checked exceptions in Java? (MSQ)",
      type: "msq",
      marks: 3,
      difficulty: "Medium",
      optionA: "IOException",
      optionB: "SQLException",
      optionC: "NullPointerException",
      optionD: "ArithmeticException",
      correctOption: "A,B",
      explanation: "IOException and SQLException are checked exceptions."
    },
    // Section 4: Coding (Algorithmic challenges with test cases)
    {
      assessmentTitle: "Java MNC Assessment",
      sectionName: "Coding",
      title: "Reverse a String",
      type: "coding",
      marks: 10,
      difficulty: "Easy",
      constraints: "1 <= string.length <= 10^5",
      input_format: "Single line containing string S",
      output_format: "Reversed string",
      language: mode === "single" ? singleLangDef.name : "",
      allowed_languages: mode === "single" ? singleLang : (mode === "multi" ? multiLangs.join(", ") : ""),
      starterCode: sampleStarter,
      testcase_1_input: "hello",
      testcase_1_output: "olleh",
      testcase_2_input: "world",
      testcase_2_output: "dlrow",
      hidden_testcase_input: "enterprise",
      hidden_testcase_output: "esirpretne"
    },
    {
      assessmentTitle: "Java MNC Assessment",
      sectionName: "Coding",
      title: "Check Balanced Parentheses",
      type: "coding",
      marks: 10,
      difficulty: "Medium",
      constraints: "1 <= string.length <= 10^4",
      input_format: "A string containing brackets '()[]{}'",
      output_format: "Print 'true' if balanced, else 'false'",
      language: mode === "single" ? singleLangDef.name : "",
      allowed_languages: mode === "single" ? singleLang : (mode === "multi" ? multiLangs.join(", ") : ""),
      starterCode: sampleStarter,
      testcase_1_input: "{[()]}",
      testcase_1_output: "true",
      testcase_2_input: "{[(])}",
      testcase_2_output: "false",
      hidden_testcase_input: "((()))",
      hidden_testcase_output: "true"
    }
  ];

  const parseCodingLanguageScope = (row: any) => {
    let allowed_languages: string[] | undefined = undefined;
    if (row.allowed_languages) {
      allowed_languages = String(row.allowed_languages)
        .split(/[,|;\s]+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    } else if (mode === "single") {
      allowed_languages = [singleLang];
    } else if (mode === "multi" && multiLangs && multiLangs.length > 0) {
      allowed_languages = multiLangs;
    } else if (row.language) {
      const match = CODING_LANGUAGES.find(l => l.name.toLowerCase() === String(row.language).toLowerCase().trim() || l.id === String(row.language).toLowerCase().trim());
      allowed_languages = [match?.id || String(row.language).toLowerCase().trim()];
    }

    const default_language =
      (mode === "single" ? singleLang : undefined) ||
      (row.default_language ? String(row.default_language).trim().toLowerCase() : undefined) ||
      allowed_languages?.[0] ||
      "python";

    let templates: Record<string, string> = {};
    const genStarter = row.starterCode ?? row.starter_code ?? row.code ?? row.boilerplate;

    if (mode === "single") {
      if (genStarter && String(genStarter).trim()) {
        templates[singleLang] = String(genStarter).trim();
      }
    } else if (mode === "multi") {
      multiLangs.forEach(lId => {
        const lVal = row[`${lId}_starter_code`] ?? row[`${lId}_starter`];
        if (lVal && String(lVal).trim()) {
          templates[lId] = String(lVal).trim();
        }
      });
      if (Object.keys(templates).length === 0 && genStarter && String(genStarter).trim()) {
        templates[default_language] = String(genStarter).trim();
      }
    } else {
      CODING_LANGUAGES.forEach(l => {
        const lVal = row[`${l.id}_starter_code`] ?? row[`${l.id}_starter`];
        if (lVal && String(lVal).trim()) templates[l.id] = String(lVal).trim();
      });
      if (Object.keys(templates).length === 0 && genStarter && String(genStarter).trim()) {
        templates[default_language] = String(genStarter).trim();
      }
    }

    // Retain ONLY templates explicitly provided by author - NEVER inject default boilerplate!
    const pruned: Record<string, string> = {};
    if (allowed_languages && allowed_languages.length > 0) {
      allowed_languages.forEach(lId => {
        if (templates[lId] && templates[lId].trim()) {
          pruned[lId] = templates[lId].trim();
        }
      });
    } else {
      Object.entries(templates).forEach(([lId, codeStr]) => {
        if (codeStr && codeStr.trim()) {
          pruned[lId] = codeStr.trim();
        }
      });
    }
    templates = pruned;

    return { allowed_languages, default_language, templates };
  };

  const mapToPayload = (row: Record<string, any>, idx: number) => {
    const rawQType = String(row.type || "mcq").toLowerCase().trim();
    const cleanQType = rawQType.replace(/[\s_-]+/g, "");
    const isCoding = cleanQType === "coding" || cleanQType === "code" || cleanQType === "programming";
    const isMsq = cleanQType === "msq" || cleanQType === "multipleselect" || cleanQType === "multiselect" || cleanQType === "multiple";
    const qType = isCoding ? "coding" : isMsq ? "msq" : "mcq";
    let secName = String(row.sectionName || row.section || "").trim();

    if (isCoding) {
      if (!secName || (!secName.toLowerCase().includes("code") && !secName.toLowerCase().includes("programming"))) {
        secName = "Coding Challenges";
      }
    } else {
      if (secName.toLowerCase().includes("code") || secName.toLowerCase().includes("programming") || !secName) {
        secName = "Multiple Choice Questions";
      }
    }

    const marks = Number(row.marks) || (qType === "coding" ? 10 : 2);
    const rawCorrect = String(row.correctOption || "A").trim().toUpperCase();
    const correctParts = rawCorrect.split(/[,;\s]+/).map((s) => s.trim());

    const options = [
      { id: 1, text: String(row.optionA || "Option A").trim(), isCorrect: correctParts.includes("A") || correctParts.includes("1") || rawCorrect === "A" },
      { id: 2, text: String(row.optionB || "Option B").trim(), isCorrect: correctParts.includes("B") || correctParts.includes("2") || rawCorrect === "B" },
      { id: 3, text: String(row.optionC || "Option C").trim(), isCorrect: correctParts.includes("C") || correctParts.includes("3") || rawCorrect === "C" },
      { id: 4, text: String(row.optionD || "Option D").trim(), isCorrect: correctParts.includes("D") || correctParts.includes("4") || rawCorrect === "D" },
    ];

    const testCases: any[] = [];
    if (qType === "coding") {
      for (let i = 1; i <= 10; i++) {
        const inp = row[`testcase_${i}_input`] ?? row[`test_case_${i}_input`];
        const out = row[`testcase_${i}_output`] ?? row[`test_case_${i}_output`];
        const trimmedInp = String(inp || "").trim();
        const trimmedOut = String(out || "").trim();
        if (trimmedInp !== "" || trimmedOut !== "") {
          testCases.push({
            id: testCases.length + 1,
            input: trimmedInp,
            output: trimmedOut,
            isHidden: false,
          });
        }
      }
      for (let h = 1; h <= 10; h++) {
        const hIn = h === 1
          ? (row.hidden_testcase_input ?? row.hidden_testcase_1_input)
          : row[`hidden_testcase_${h}_input`];
        const hOut = h === 1
          ? (row.hidden_testcase_output ?? row.hidden_testcase_1_output)
          : row[`hidden_testcase_${h}_output`];
        const trimmedHIn = String(hIn || "").trim();
        const trimmedHOut = String(hOut || "").trim();
        if (trimmedHIn !== "" || trimmedHOut !== "") {
          testCases.push({
            id: testCases.length + 1,
            input: trimmedHIn,
            output: trimmedHOut,
            isHidden: true,
          });
        }
      }
    }

    const codingScope = isCoding ? parseCodingLanguageScope(row) : null;

    return {
      id: `q_bulk_${Date.now()}_${idx}`,
      assessmentTitle: String(row.assessmentTitle || "").trim(),
      section: secName,
      title: String(row.title || `Question ${idx + 1}`).trim(),
      type: qType,
      marks,
      difficulty: row.difficulty || "Easy",
      problemStatement: String(row.description || row.problemStatement || row.prompt || row.title || "").trim(),
      description: String(row.description || row.problemStatement || row.prompt || "").trim(),
      options: qType !== "coding" ? options : undefined,
      testCases: qType === "coding" ? (testCases.length > 0 ? testCases : undefined) : undefined,
      explanation: String(row.explanation || "").trim(),
      constraints: qType === "coding" ? String(row.constraints || "").trim() : undefined,
      inputFormat: qType === "coding" ? String(row.input_format || "").trim() : undefined,
      outputFormat: qType === "coding" ? String(row.output_format || "").trim() : undefined,
      allowed_languages: codingScope?.allowed_languages,
      allowedLanguages: codingScope?.allowed_languages,
      default_language: codingScope?.default_language,
      defaultLanguage: codingScope?.default_language,
      templates: codingScope?.templates,
      language: qType === "coding" ? (mode === "single" ? singleLang : codingScope?.default_language) : undefined,
      starterCode: qType === "coding" ? (codingScope?.templates?.[codingScope.default_language] || String(row.starterCode || row.starter_code || "").trim()) : undefined,
    };
  };

  const mapGroupedPayload = (grouped: { groupKey: string; rows: Record<string, any>[] }[], indexOffset = 0) => {
    const resultSections: any[] = [];

    grouped.forEach((group, gIdx) => {
      const rawSecName = String(group.groupKey || `Section ${indexOffset + gIdx + 1}`).trim();
      const rows = group.rows || [];

      const nonCodingRows: any[] = [];
      const codingRows: any[] = [];

      rows.forEach((r) => {
        const rawQType = String(r.type || "mcq").toLowerCase().trim();
        const cleanQType = rawQType.replace(/[\s_-]+/g, "");
        const isCoding = cleanQType === "coding" || cleanQType === "code" || cleanQType === "programming";
        if (isCoding) {
          codingRows.push(r);
        } else {
          nonCodingRows.push(r);
        }
      });

      const processRowToQuestion = (r: any, assignedSection: string, qIdx: number) => {
        const rawQType = String(r.type || "mcq").toLowerCase().trim();
        const cleanQType = rawQType.replace(/[\s_-]+/g, "");
        const isCoding = cleanQType === "coding" || cleanQType === "code" || cleanQType === "programming";
        const isMsq = cleanQType === "msq" || cleanQType === "multipleselect" || cleanQType === "multiselect" || cleanQType === "multiple";
        const qType = isCoding ? "coding" : isMsq ? "msq" : "mcq";
        const marks = Number(r.marks) || (qType === "coding" ? 10 : 2);
        const rawCorrect = String(r.correctOption || "A").trim().toUpperCase();
        const correctParts = rawCorrect.split(/[,;\s]+/).map((s) => s.trim());

        const options = [
          { id: 1, text: String(r.optionA || "Option A").trim(), isCorrect: correctParts.includes("A") || correctParts.includes("1") || rawCorrect === "A" },
          { id: 2, text: String(r.optionB || "Option B").trim(), isCorrect: correctParts.includes("B") || correctParts.includes("2") || rawCorrect === "B" },
          { id: 3, text: String(r.optionC || "Option C").trim(), isCorrect: correctParts.includes("C") || correctParts.includes("3") || rawCorrect === "C" },
          { id: 4, text: String(r.optionD || "Option D").trim(), isCorrect: correctParts.includes("D") || correctParts.includes("4") || rawCorrect === "D" },
        ];

        const testCases: any[] = [];
        if (qType === "coding") {
          for (let i = 1; i <= 10; i++) {
            const inp = r[`testcase_${i}_input`] ?? r[`test_case_${i}_input`];
            const out = r[`testcase_${i}_output`] ?? r[`test_case_${i}_output`];
            const trimmedInp = String(inp || "").trim();
            const trimmedOut = String(out || "").trim();
            if (trimmedInp !== "" || trimmedOut !== "") {
              testCases.push({
                id: testCases.length + 1,
                input: trimmedInp,
                output: trimmedOut,
                isHidden: false,
              });
            }
          }
          for (let h = 1; h <= 10; h++) {
            const hIn = h === 1
              ? (r.hidden_testcase_input ?? r.hidden_testcase_1_input)
              : r[`hidden_testcase_${h}_input`];
            const hOut = h === 1
              ? (r.hidden_testcase_output ?? r.hidden_testcase_1_output)
              : r[`hidden_testcase_${h}_output`];
            const trimmedHIn = String(hIn || "").trim();
            const trimmedHOut = String(hOut || "").trim();
            if (trimmedHIn !== "" || trimmedHOut !== "") {
              testCases.push({
                id: testCases.length + 1,
                input: trimmedHIn,
                output: trimmedHOut,
                isHidden: true,
              });
            }
          }
        }

        const codingScope = isCoding ? parseCodingLanguageScope(r) : null;

        return {
          id: `q_bulk_${Date.now()}_${gIdx}_${qIdx}`,
          assessmentTitle: String(r.assessmentTitle || "").trim(),
          section: assignedSection,
          title: String(r.title || `Question ${qIdx + 1}`).trim(),
          type: qType,
          marks,
          difficulty: r.difficulty || "Easy",
          problemStatement: String(r.description || r.problemStatement || r.prompt || r.title || "").trim(),
          description: String(r.description || r.problemStatement || r.prompt || "").trim(),
          options: qType !== "coding" ? options : undefined,
          testCases: qType === "coding" ? (testCases.length > 0 ? testCases : undefined) : undefined,
          explanation: String(r.explanation || "").trim(),
          constraints: qType === "coding" ? String(r.constraints || "").trim() : undefined,
          inputFormat: qType === "coding" ? String(r.input_format || "").trim() : undefined,
          outputFormat: qType === "coding" ? String(r.output_format || "").trim() : undefined,
          allowed_languages: codingScope?.allowed_languages,
          allowedLanguages: codingScope?.allowed_languages,
          default_language: codingScope?.default_language,
          defaultLanguage: codingScope?.default_language,
          templates: codingScope?.templates,
          language: qType === "coding" ? (mode === "single" ? singleLang : codingScope?.default_language) : undefined,
          starterCode: qType === "coding" ? (codingScope?.templates?.[codingScope.default_language] || String(r.starterCode || r.starter_code || "").trim()) : undefined,
        };
      };

      if (nonCodingRows.length > 0) {
        let nonCodingSec = rawSecName;
        if (nonCodingSec.toLowerCase().includes("code") || nonCodingSec.toLowerCase().includes("programming")) {
          nonCodingSec = "Multiple Choice Questions";
        }
        const questions = nonCodingRows.map((r, qIdx) => processRowToQuestion(r, nonCodingSec, qIdx));
        const totalSectionMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        resultSections.push({
          sectionName: nonCodingSec,
          title: nonCodingSec,
          questions,
          questionCount: questions.length,
          totalMarks: totalSectionMarks,
          assessmentTitle: rows[0]?.assessmentTitle ? String(rows[0].assessmentTitle).trim() : undefined,
        });
      }

      if (codingRows.length > 0) {
        let codingSec = rawSecName;
        if (!codingSec.toLowerCase().includes("code") && !codingSec.toLowerCase().includes("programming")) {
          codingSec = "Coding Challenges";
        }
        const questions = codingRows.map((r, qIdx) => processRowToQuestion(r, codingSec, qIdx));
        const totalSectionMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
        resultSections.push({
          sectionName: codingSec,
          title: codingSec,
          questions,
          questionCount: questions.length,
          totalMarks: totalSectionMarks,
          assessmentTitle: rows[0]?.assessmentTitle ? String(rows[0].assessmentTitle).trim() : undefined,
        });
      }
    });

    return resultSections;
  };

  return {
    moduleType: "assessment_questions",
    displayName,
    description,
    templateFileName,
    groupByField: "sectionName",
    columns,
    sampleRows,
    mapToPayload,
    mapGroupedPayload,
  };
}

/**
 * Helper to normalize truthy/boolean inputs from Excel/CSV (e.g. Yes/No, True/False, 1/0)
 */
export function isTruthy(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return str === "yes" || str === "true" || str === "1" || str === "enabled" || str === "y";
}

export function getTemplateConfig(moduleType: string, options?: CodingTemplateOptions): ModuleTemplateConfig {
  const normalized = (moduleType || "course").toLowerCase().trim();

  // Dynamic Coding Problem Routing
  if (
    normalized === "coding" ||
    normalized === "code_only" ||
    normalized === "coding_only" ||
    normalized === "coding_problem" ||
    normalized === "coding_problems" ||
    normalized === "code_lab" ||
    normalized === "codelab" ||
    normalized === "assessment_coding" ||
    normalized === "test_coding" ||
    normalized === "assessment_code"
  ) {
    return getCodingProblemTemplateConfig(options);
  }

  // Dynamic Mixed Questions Routing (MCQ + Code for Practice Modules)
  if (
    normalized === "mixed" ||
    normalized === "mixed_questions" ||
    normalized === "mixed_question" ||
    normalized === "practice_mixed" ||
    normalized === "practice_questions"
  ) {
    return getMixedQuestionsTemplateConfig(options);
  }

  // Dynamic Assessment Questions Routing (Sections + MCQ + Code for Assessments)
  if (
    normalized === "assessment_questions" ||
    normalized === "assessment_question" ||
    normalized === "test_questions" ||
    normalized === "exam_questions"
  ) {
    return getAssessmentQuestionsTemplateConfig(options);
  }

  if (TEMPLATE_CONFIGS[normalized]) {
    return TEMPLATE_CONFIGS[normalized] as ModuleTemplateConfig;
  }
  // Aliases
  if (normalized === "assessment_mcq" || normalized === "assessment_quiz" || normalized === "test_mcq" || normalized === "test_mcqs") {
    return (TEMPLATE_CONFIGS.assessment_mcq || TEMPLATE_CONFIGS.quiz) as ModuleTemplateConfig;
  }
  if (normalized === "mcq" || normalized === "mcq_only" || normalized === "mcqs" || normalized === "mcq_questions") {
    return (TEMPLATE_CONFIGS.quiz || TEMPLATE_CONFIGS.assessment_questions) as ModuleTemplateConfig;
  }
  if (normalized === "courses" || normalized === "course_batch") return (TEMPLATE_CONFIGS.course_batch || TEMPLATE_CONFIGS.course) as ModuleTemplateConfig;
  if (normalized === "practices" || normalized === "practice_track" || normalized === "tracks") return (TEMPLATE_CONFIGS.practice_track || TEMPLATE_CONFIGS.practice) as ModuleTemplateConfig;
  if (normalized === "practice_module" || normalized === "practice_modules" || normalized === "module" || normalized === "modules" || normalized === "level3_module") {
    return (TEMPLATE_CONFIGS.practice_module || TEMPLATE_CONFIGS.practice) as ModuleTemplateConfig;
  }
  if (normalized === "assessments" || normalized === "assessment_track" || normalized === "tests") return (TEMPLATE_CONFIGS.assessment_track || TEMPLATE_CONFIGS.assessment) as ModuleTemplateConfig;
  if (normalized === "main_modules" || normalized === "units") return (TEMPLATE_CONFIGS.main_module || TEMPLATE_CONFIGS.course) as ModuleTemplateConfig;
  
  return (TEMPLATE_CONFIGS.course || Object.values(TEMPLATE_CONFIGS)[0]) as ModuleTemplateConfig;
}

