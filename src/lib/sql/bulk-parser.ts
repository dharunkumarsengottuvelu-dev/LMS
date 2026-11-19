/**
 * Sensilearn LMS - Universal SQL Bulk Parser & Validator
 * Parses 9-sheet Excel workbooks (.xlsx) and CSV files (.csv)
 * Performs cross-sheet relational resolution by Question_ID,
 * syntax heuristics, table schema validation, and row-level error reporting.
 */

import { validateSpreadsheetFile, parseCsv, sanitizeRowData } from "@/lib/excel-security";
import type {
  CodingProblem,
  Difficulty,
  SQLEngine,
  SQLComparisonMode,
  SQLQuestionMode,
  SQLTableSchema,
  SQLColumnSchema,
  TestCase,
} from "@/types/coding";
import { SQL_EXCEL_SHEETS } from "./template-generator";

export interface SqlImportRowError {
  sheet: string;
  row: number;
  questionId?: string;
  column?: string;
  message: string;
  severity: "error" | "warning";
}

export interface SqlImportResult {
  validQuestions: (CodingProblem & {
    rawTables?: SQLTableSchema[];
    databaseConfig?: Record<string, any>;
    referenceSolution?: string;
    explanationText?: string;
  })[];
  errors: SqlImportRowError[];
  summary: {
    totalQuestions: number;
    validCount: number;
    errorCount: number;
    warningCount: number;
  };
}

const VALID_ENGINES = new Set(["mysql", "postgresql", "sqlite", "sqlserver", "oracle", "mariadb"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const FORBIDDEN_KEYWORDS = [
  "DROP DATABASE",
  "SHUTDOWN",
  "GRANT ALL",
  "REVOKE ALL",
  "ALTER SYSTEM",
  "EXEC XP_",
  "XP_CMDSHELL",
];

/**
 * Normalizes string keys and values
 */
function clean(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function parseBool(val: any): boolean {
  if (val === true || val === 1) return true;
  const s = clean(val).toLowerCase();
  return s === "yes" || s === "true" || s === "1" || s === "y";
}

/**
 * Converts a 2D raw array from a sheet into an array of objects
 */
function sheetGridToObjects(grid: any[][]): Record<string, any>[] {
  if (!grid || grid.length < 2) return [];
  const headers = (grid[0] || []).map((h) => clean(h).toLowerCase().replace(/[\s-]+/g, "_"));
  const rows: Record<string, any>[] = [];

  for (let r = 1; r < grid.length; r++) {
    const rawRow = grid[r] || [];
    const obj: Record<string, any> = {};
    let hasData = false;
    for (let c = 0; c < headers.length; c++) {
      const headerKey = headers[c];
      if (!headerKey) continue;
      const cell = rawRow[c];
      if (cell !== null && cell !== undefined && cell !== "") {
        hasData = true;
        obj[headerKey] = cell;
      } else {
        obj[headerKey] = "";
      }
    }
    if (hasData) {
      rows.push(sanitizeRowData(obj));
    }
  }
  return rows;
}

/**
 * Builds DDL CREATE TABLE statements from table schema
 */
export function buildDDLFromTables(tables: SQLTableSchema[]): string {
  return tables
    .filter((t) => t.name && t.columns && t.columns.length > 0)
    .map((tbl) => {
      const colDefs = tbl.columns.map((c) => {
        let def = `    ${c.name} ${c.type || "VARCHAR(100)"}`;
        if (c.isPrimary) def += " PRIMARY KEY";
        if (c.isNullable === false && !c.isPrimary) def += " NOT NULL";
        if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
        return def;
      }).join(",\n");
      return `CREATE TABLE ${tbl.name} (\n${colDefs}\n);`;
    })
    .join("\n\n");
}

/**
 * Builds DML INSERT INTO statements from sample records
 */
export function buildDMLFromTables(tables: SQLTableSchema[]): string {
  return tables
    .filter((t) => t.name && t.rows && t.rows.length > 0 && t.columns && t.columns.length > 0)
    .map((tbl) => {
      const cols = tbl.columns.map((c) => c.name);
      const colList = cols.join(", ");
      const rowLines = tbl.rows.map((row) => {
        const vals = cols.map((colName) => {
          const rawVal = row[colName] ?? row[colName.toLowerCase()] ?? "";
          if (rawVal === "" || rawVal === null || rawVal === undefined) return "NULL";
          if (typeof rawVal === "number" || /^-?\d+(\.\d+)?$/.test(String(rawVal).trim())) {
            return String(rawVal).trim();
          }
          return `'${String(rawVal).replace(/'/g, "''")}'`;
        }).join(", ");
        return `(${vals})`;
      }).join(",\n");

      return `INSERT INTO ${tbl.name} (${colList}) VALUES\n${rowLines};`;
    })
    .join("\n\n");
}

/**
 * Safely parses an uploaded 9-Sheet Excel or CSV file
 */
export async function parseSqlBulkSpreadsheet(file: File): Promise<SqlImportResult> {
  validateSpreadsheetFile(file);
  const fileName = (file.name || "").toLowerCase();
  const errors: SqlImportRowError[] = [];

  if (fileName.endsWith(".csv")) {
    const text = await file.text();
    const rawGrid = parseCsv(text);
    return parseSqlCsvGrid(rawGrid, errors);
  }

  // Modern safe XLSX parsing with read-excel-file
  const { default: readXlsxFile } = await import("read-excel-file/universal");
  const sheets = await readXlsxFile(file);

  if (!Array.isArray(sheets) || sheets.length === 0) {
    throw new Error("Unable to read workbook sheets. The uploaded file is empty or corrupted.");
  }

  // Map sheet names case-insensitively
  const sheetMap = new Map<string, any[][]>();
  for (const s of sheets) {
    if (s && s.sheet && Array.isArray(s.data)) {
      sheetMap.set(s.sheet.trim().toLowerCase(), s.data);
    }
  }

  const findSheetData = (name: string): any[][] | undefined => {
    const lower = name.toLowerCase();
    for (const [k, v] of sheetMap.entries()) {
      if (k === lower || k.replace(/[\s-_]/g, "") === lower.replace(/[\s-_]/g, "")) {
        return v;
      }
    }
    return undefined;
  };

  const rawQuestionsGrid = findSheetData(SQL_EXCEL_SHEETS.QUESTIONS);
  if (!rawQuestionsGrid || rawQuestionsGrid.length < 2) {
    throw new Error("Missing 'Questions' sheet or no question rows found. Please use the Sensilearn Universal SQL Template.");
  }

  // Convert each sheet to objects
  const questionsRows = sheetGridToObjects(rawQuestionsGrid);
  const dbConfigRows = sheetGridToObjects(findSheetData(SQL_EXCEL_SHEETS.DATABASE_CONFIG) || []);
  const tableSchemaRows = sheetGridToObjects(findSheetData(SQL_EXCEL_SHEETS.TABLE_SCHEMA) || []);
  const sampleDataRows = sheetGridToObjects(findSheetData(SQL_EXCEL_SHEETS.SAMPLE_DATA) || []);
  const expectedOutputRows = sheetGridToObjects(findSheetData(SQL_EXCEL_SHEETS.EXPECTED_OUTPUT) || []);
  const testCasesRows = sheetGridToObjects(findSheetData(SQL_EXCEL_SHEETS.TEST_CASES) || []);
  const solutionsRows = sheetGridToObjects(findSheetData(SQL_EXCEL_SHEETS.SOLUTIONS) || []);
  const explanationsRows = sheetGridToObjects(findSheetData(SQL_EXCEL_SHEETS.EXPLANATIONS) || []);
  const constraintsRows = sheetGridToObjects(findSheetData(SQL_EXCEL_SHEETS.CONSTRAINTS) || []);

  // Index helper maps by question_id
  const dbConfigByQ = new Map<string, Record<string, any>>();
  dbConfigRows.forEach((r) => {
    const qid = clean(r.question_id);
    if (qid) dbConfigByQ.set(qid, r);
  });

  const tableSchemaByQ = new Map<string, Record<string, any>[]>();
  tableSchemaRows.forEach((r) => {
    const qid = clean(r.question_id);
    if (qid) {
      const list = tableSchemaByQ.get(qid) || [];
      list.push(r);
      tableSchemaByQ.set(qid, list);
    }
  });

  const sampleDataByQ = new Map<string, Record<string, any>[]>();
  sampleDataRows.forEach((r) => {
    const qid = clean(r.question_id);
    if (qid) {
      const list = sampleDataByQ.get(qid) || [];
      list.push(r);
      sampleDataByQ.set(qid, list);
    }
  });

  const expectedOutputByQ = new Map<string, Record<string, any>[]>();
  expectedOutputRows.forEach((r) => {
    const qid = clean(r.question_id);
    if (qid) {
      const list = expectedOutputByQ.get(qid) || [];
      list.push(r);
      expectedOutputByQ.set(qid, list);
    }
  });

  const testCasesByQ = new Map<string, Record<string, any>[]>();
  testCasesRows.forEach((r) => {
    const qid = clean(r.question_id);
    if (qid) {
      const list = testCasesByQ.get(qid) || [];
      list.push(r);
      testCasesByQ.set(qid, list);
    }
  });

  const solutionsByQ = new Map<string, Record<string, any>>();
  solutionsRows.forEach((r) => {
    const qid = clean(r.question_id);
    if (qid) solutionsByQ.set(qid, r);
  });

  const explanationsByQ = new Map<string, Record<string, any>>();
  explanationsRows.forEach((r) => {
    const qid = clean(r.question_id);
    if (qid) explanationsByQ.set(qid, r);
  });

  const constraintsByQ = new Map<string, Record<string, any>[]>();
  constraintsRows.forEach((r) => {
    const qid = clean(r.question_id);
    if (qid) {
      const list = constraintsByQ.get(qid) || [];
      list.push(r);
      constraintsByQ.set(qid, list);
    }
  });

  const validQuestions: (CodingProblem & {
    rawTables?: SQLTableSchema[];
    databaseConfig?: Record<string, any>;
    referenceSolution?: string;
    explanationText?: string;
  })[] = [];

  // Iterate over Questions rows and join
  for (let idx = 0; idx < questionsRows.length; idx++) {
    const rowNum = idx + 2; // +1 for 0-index, +1 for header
    const qRow = questionsRows[idx]!;
    const qId = clean(qRow.question_id || qRow.id);
    const title = clean(qRow.question_title || qRow.title);
    const statement = clean(qRow.problem_statement || qRow.description);

    if (!qId) {
      errors.push({
        sheet: "Questions",
        row: rowNum,
        column: "Question_ID",
        message: "Question_ID is required for all questions.",
        severity: "error",
      });
      continue;
    }

    if (!title) {
      errors.push({
        sheet: "Questions",
        row: rowNum,
        questionId: qId,
        column: "Question_Title",
        message: `Question '${qId}' is missing Question_Title.`,
        severity: "error",
      });
      continue;
    }

    if (!statement) {
      errors.push({
        sheet: "Questions",
        row: rowNum,
        questionId: qId,
        column: "Problem_Statement",
        message: `Question '${qId}' is missing Problem_Statement.`,
        severity: "error",
      });
      continue;
    }

    // Difficulty validation
    let rawDiff = clean(qRow.difficulty).toLowerCase();
    if (!VALID_DIFFICULTIES.has(rawDiff)) {
      errors.push({
        sheet: "Questions",
        row: rowNum,
        questionId: qId,
        column: "Difficulty",
        message: `Invalid Difficulty '${qRow.difficulty}'. Defaulted to 'medium'.`,
        severity: "warning",
      });
      rawDiff = "medium";
    }
    const difficulty = rawDiff as Difficulty;

    // Database Config
    const dbConfig = dbConfigByQ.get(qId) || {};
    let engineRaw = clean(dbConfig.database_engine || qRow.supported_databases || "mysql").toLowerCase();
    if (engineRaw.includes("postgres")) engineRaw = "postgresql";
    else if (engineRaw.includes("sqlite")) engineRaw = "sqlite";
    else if (engineRaw.includes("oracle")) engineRaw = "oracle";
    else if (engineRaw.includes("server") || engineRaw.includes("tsql")) engineRaw = "sqlserver";
    else if (engineRaw.includes("maria")) engineRaw = "mariadb";
    else engineRaw = "mysql";

    const sqlEngine: SQLEngine = (VALID_ENGINES.has(engineRaw) ? engineRaw : "mysql") as SQLEngine;
    const comparisonMode: SQLComparisonMode =
      clean(dbConfig.output_comparison_mode || "ORDER_SENSITIVE").toUpperCase() === "ORDER_INSENSITIVE"
        ? "ORDER_INSENSITIVE"
        : "ORDER_SENSITIVE";

    const sqlMode: SQLQuestionMode =
      clean(qRow.question_type).toUpperCase() === "TABLE_CREATION_AND_QUERY"
        ? "TABLE_CREATION_AND_QUERY"
        : "QUERY_ONLY";

    // Table Schema & Sample Data Resolution
    const rawSchemaRows = tableSchemaByQ.get(qId) || [];
    const rawSampleDataRows = sampleDataByQ.get(qId) || [];

    const tablesMap = new Map<string, SQLTableSchema>();

    rawSchemaRows.forEach((colRow) => {
      const tblName = clean(colRow.table_name);
      const colName = clean(colRow.column_name);
      if (!tblName || !colName) return;

      let tbl = tablesMap.get(tblName);
      if (!tbl) {
        tbl = { name: tblName, columns: [], rows: [] };
        tablesMap.set(tblName, tbl);
      }

      tbl.columns.push({
        name: colName,
        type: clean(colRow.data_type) || "VARCHAR(100)",
        isPrimary: parseBool(colRow.is_primary_key),
        isForeign: parseBool(colRow.is_foreign_key),
        isNullable: !parseBool(colRow.is_not_null),
        defaultValue: clean(colRow.default_value),
      });
    });

    // Populate Sample Data
    rawSampleDataRows.forEach((dataRow) => {
      const tblName = clean(dataRow.table_name);
      const recordDataRaw = clean(dataRow.record_data);
      if (!tblName || !recordDataRaw) return;

      const tbl = tablesMap.get(tblName);
      if (!tbl) return;

      try {
        if (recordDataRaw.startsWith("{") || recordDataRaw.startsWith("[")) {
          const parsed = JSON.parse(recordDataRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => tbl.rows.push(item));
          } else if (typeof parsed === "object") {
            tbl.rows.push(parsed);
          }
        } else {
          // Key-value pairs or CSV row format
          const rowObj: Record<string, any> = {};
          recordDataRaw.split(/[,;]/).forEach((part) => {
            const [k, v] = part.split("=").map((p) => p.trim());
            if (k && v !== undefined) rowObj[k] = v;
          });
          if (Object.keys(rowObj).length > 0) {
            tbl.rows.push(rowObj);
          }
        }
      } catch {
        // Silently skip malformed sample rows
      }
    });

    const tables = Array.from(tablesMap.values());
    const schemaSql = buildDDLFromTables(tables);
    const seedSql = buildDMLFromTables(tables);

    // Expected Output & Test Cases
    const expOutputs = expectedOutputByQ.get(qId) || [];
    const testCasesList = testCasesByQ.get(qId) || [];

    const defaultOutputJson = expOutputs[0]?.expected_records
      ? clean(expOutputs[0].expected_records)
      : "[]";

    const testCases: TestCase[] = [];

    if (testCasesList.length > 0) {
      testCasesList.forEach((tc, tcIdx) => {
        const outRef = clean(tc.expected_output_reference);
        const matchedOut = expOutputs.find((o) => clean(o.output_id) === outRef) || expOutputs[0];
        const outputJson = matchedOut?.expected_records ? clean(matchedOut.expected_records) : defaultOutputJson;

        testCases.push({
          id: clean(tc.test_case_id) || `tc_${qId}_${tcIdx + 1}`,
          name: clean(tc.test_case_id) || `Test Case ${tcIdx + 1}`,
          input: "",
          expected_output: outputJson,
          is_hidden: parseBool(tc.is_hidden) || clean(tc.test_case_type).toUpperCase() === "HIDDEN",
          weight: Number(tc.marks) || 10,
        });
      });
    } else {
      // Create at least 1 default public testcase if expected output exists
      testCases.push({
        id: `tc_${qId}_1`,
        name: "Default Test Case",
        input: "",
        expected_output: defaultOutputJson,
        is_hidden: false,
        weight: 100,
      });
    }

    // Solutions & Explanations
    const solutionRow = solutionsByQ.get(qId);
    const refQuery = clean(solutionRow?.reference_sql_query);

    // Forbidden keywords security check
    const checkSql = `${refQuery} ${schemaSql} ${seedSql}`.toUpperCase();
    const foundForbidden = FORBIDDEN_KEYWORDS.find((kw) => checkSql.includes(kw));
    if (foundForbidden) {
      errors.push({
        sheet: "Solutions",
        row: rowNum,
        questionId: qId,
        column: "Reference_SQL_Query",
        message: `Security violation: Question contains prohibited keyword '${foundForbidden}'.`,
        severity: "error",
      });
      continue;
    }

    const explanationRow = explanationsByQ.get(qId);
    const explanationText = [
      clean(explanationRow?.solution_explanation),
      clean(explanationRow?.learning_objectives) ? `Learning Objectives: ${clean(explanationRow?.learning_objectives)}` : "",
    ].filter(Boolean).join("\n\n");

    const constraintsList = constraintsByQ.get(qId) || [];
    const constraintsText = constraintsList
      .map((c) => `${clean(c.constraint_type) ? `[${clean(c.constraint_type)}] ` : ""}${clean(c.constraint_description)}`)
      .join("\n");

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${qId.toLowerCase()}`;

    const problem: CodingProblem & {
      rawTables?: SQLTableSchema[];
      databaseConfig?: Record<string, any>;
      referenceSolution?: string;
      explanationText?: string;
    } = {
      id: `sql_${qId}`,
      title,
      slug,
      description: statement,
      difficulty,
      category: "Databases",
      type: "sql",
      topic_tags: ["SQL", "Databases", clean(qRow.submodule) || "Relational Queries"],
      points: Number(qRow.marks) || 20,
      constraints: constraintsText || clean(qRow.constraints),
      input_format: `Database Engine: ${sqlEngine.toUpperCase()}\nTables Available: ${tables.map((t) => t.name).join(", ") || "None"}`,
      output_format: `Query Results Table (${comparisonMode.replace(/_/g, " ")})`,
      explanation: explanationText,
      templates: {
        sql: refQuery ? `-- Starter Template\nSELECT * FROM ${tables[0]?.name || "table_name"};\n` : "-- Write your SQL query here\n",
      },
      allowed_languages: ["sql"],
      allowedLanguages: ["sql"],
      default_language: "sql",
      defaultLanguage: "sql",
      test_cases: testCases,
      sample_test_cases: testCases.filter((tc) => !tc.is_hidden),
      hidden_test_cases: testCases.filter((tc) => tc.is_hidden),
      sql_engine: sqlEngine,
      sql_question_mode: sqlMode,
      provide_tables: true,
      schema_sql: schemaSql,
      seed_sql: seedSql,
      comparison_mode: comparisonMode,
      time_limit_ms: Number(qRow.time_limit) || 3000,
      memory_limit_mb: Number(qRow.memory_limit) || 256,
      status: clean(qRow.status).toLowerCase() === "draft" ? "draft" : "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rawTables: tables,
      databaseConfig: dbConfig,
      referenceSolution: refQuery,
      explanationText,
    };

    validQuestions.push(problem);
  }

  return {
    validQuestions,
    errors,
    summary: {
      totalQuestions: questionsRows.length,
      validCount: validQuestions.length,
      errorCount: errors.filter((e) => e.severity === "error").length,
      warningCount: errors.filter((e) => e.severity === "warning").length,
    },
  };
}

/**
 * Fallback parser for single-sheet CSV files
 */
function parseSqlCsvGrid(rawGrid: any[][], errors: SqlImportRowError[]): SqlImportResult {
  if (!rawGrid || rawGrid.length < 2) {
    throw new Error("Uploaded CSV contains no readable data.");
  }

  const rows = sheetGridToObjects(rawGrid);
  const validQuestions: CodingProblem[] = [];

  rows.forEach((r, idx) => {
    const rowNum = idx + 2;
    const qId = clean(r.question_id || r.id);
    const title = clean(r.question_title || r.title);
    const statement = clean(r.problem_statement || r.description);

    if (!qId || !title || !statement) {
      errors.push({
        sheet: "CSV",
        row: rowNum,
        questionId: qId,
        message: "Question_ID, Question_Title, and Problem_Statement are required.",
        severity: "error",
      });
      return;
    }

    const engineRaw = clean(r.database_engine || "mysql").toLowerCase();
    const sqlEngine: SQLEngine = (VALID_ENGINES.has(engineRaw) ? engineRaw : "mysql") as SQLEngine;
    const comparisonMode: SQLComparisonMode =
      clean(r.comparison_mode).toUpperCase() === "ORDER_INSENSITIVE" ? "ORDER_INSENSITIVE" : "ORDER_SENSITIVE";

    const schemaSql = clean(r.schema_sql);
    const seedSql = clean(r.seed_sql);
    const expectedJson = clean(r.expected_output_json || "[]");

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${qId.toLowerCase()}`;

    validQuestions.push({
      id: `sql_${qId}`,
      title,
      slug,
      description: statement,
      difficulty: (VALID_DIFFICULTIES.has(clean(r.difficulty).toLowerCase()) ? clean(r.difficulty).toLowerCase() : "medium") as Difficulty,
      category: "Databases",
      type: "sql",
      topic_tags: ["SQL", "Databases"],
      points: Number(r.marks) || 20,
      constraints: clean(r.constraints),
      explanation: clean(r.explanation),
      templates: {
        sql: "-- Write your SQL query here\n",
      },
      allowed_languages: ["sql"],
      allowedLanguages: ["sql"],
      default_language: "sql",
      defaultLanguage: "sql",
      test_cases: [
        {
          id: `tc_${qId}_1`,
          name: "Test Case 1",
          input: "",
          expected_output: expectedJson,
          is_hidden: false,
          weight: 100,
        },
      ],
      sql_engine: sqlEngine,
      sql_question_mode: "QUERY_ONLY",
      provide_tables: true,
      schema_sql: schemaSql,
      seed_sql: seedSql,
      comparison_mode: comparisonMode,
      time_limit_ms: 3000,
      memory_limit_mb: 256,
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  return {
    validQuestions,
    errors,
    summary: {
      totalQuestions: rows.length,
      validCount: validQuestions.length,
      errorCount: errors.filter((e) => e.severity === "error").length,
      warningCount: errors.filter((e) => e.severity === "warning").length,
    },
  };
}
