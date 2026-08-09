import type { SQLDatasetSchema, SQLQueryResult, SQLTableSchema } from "@/types/coding";

export const SAMPLE_SQL_DATASETS: Record<string, SQLDatasetSchema> = {
  university: {
    name: "university",
    tables: [
      {
        name: "students",
        columns: [
          { name: "id", type: "INT", isPrimary: true },
          { name: "name", type: "VARCHAR(100)" },
          { name: "department", type: "VARCHAR(50)" },
          { name: "mark", type: "INT" },
          { name: "grade", type: "VARCHAR(2)" },
        ],
        rows: [
          { id: 1, name: "Arun Kumar", department: "Computer Science", mark: 85, grade: "A" },
          { id: 2, name: "Bhavana Sharma", department: "Information Tech", mark: 92, grade: "A+" },
          { id: 3, name: "Chetan Reddy", department: "Computer Science", mark: 74, grade: "B" },
          { id: 4, name: "Divya Nair", department: "Electronics", mark: 88, grade: "A" },
          { id: 5, name: "Ezhil Raj", department: "Information Tech", mark: 65, grade: "C" },
          { id: 6, name: "Farhan Ali", department: "Mechanical", mark: 95, grade: "A+" },
        ],
      },
      {
        name: "courses",
        columns: [
          { name: "course_id", type: "VARCHAR(10)", isPrimary: true },
          { name: "course_name", type: "VARCHAR(100)" },
          { name: "credits", type: "INT" },
          { name: "department", type: "VARCHAR(50)" },
        ],
        rows: [
          { course_id: "CS101", course_name: "Data Structures & Algorithms", credits: 4, department: "Computer Science" },
          { course_id: "CS102", course_name: "Database Management Systems", credits: 4, department: "Computer Science" },
          { course_id: "IT201", course_name: "Web Application Development", credits: 3, department: "Information Tech" },
          { course_id: "EC301", course_name: "Digital Signal Processing", credits: 4, department: "Electronics" },
        ],
      },
      {
        name: "enrollments",
        columns: [
          { name: "enrollment_id", type: "INT", isPrimary: true },
          { name: "student_id", type: "INT" },
          { name: "course_id", type: "VARCHAR(10)" },
          { name: "score", type: "INT" },
        ],
        rows: [
          { enrollment_id: 101, student_id: 1, course_id: "CS101", score: 88 },
          { enrollment_id: 102, student_id: 1, course_id: "CS102", score: 90 },
          { enrollment_id: 103, student_id: 2, course_id: "IT201", score: 95 },
          { enrollment_id: 104, student_id: 3, course_id: "CS101", score: 72 },
          { enrollment_id: 105, student_id: 4, course_id: "EC301", score: 85 },
        ],
      },
    ],
  },
};

export class SQLExecutionService {
  /**
   * Returns schema details for a given dataset name (default 'university')
   */
  public static getDatasetSchema(datasetName = "university"): SQLDatasetSchema {
    return SAMPLE_SQL_DATASETS[datasetName] ?? SAMPLE_SQL_DATASETS["university"]!;
  }

  /**
   * Safely executes an SQL query string against the isolated dataset
   */
  public static executeQuery(queryStr: string, datasetName = "university"): SQLQueryResult {
    const startTime = Date.now();
    const cleanQuery = (queryStr || "").trim();

    if (!cleanQuery) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: "Query string cannot be empty.",
      };
    }

    const schema = this.getDatasetSchema(datasetName);

    try {
      const lowerQuery = cleanQuery.toLowerCase();

      // Handle simple SELECT queries
      if (lowerQuery.startsWith("select")) {
        const fromMatch = cleanQuery.match(/FROM\s+([a-zA-Z0-9_]+)/i);
        if (!fromMatch) {
          return {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTimeMs: Date.now() - startTime,
            error: "SQL Syntax Error: Missing FROM clause.",
          };
        }

        const tableName = (fromMatch[1] ?? "").toLowerCase();
        const table = schema.tables.find((t) => t.name.toLowerCase() === tableName);

        if (!table) {
          return {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTimeMs: Date.now() - startTime,
            error: `Table '${tableName}' does not exist in dataset '${datasetName}'.`,
          };
        }

        let filteredRows = [...table.rows];

        // Process WHERE condition (e.g. WHERE mark > 80, WHERE department = 'Computer Science')
        const whereMatch = cleanQuery.match(/WHERE\s+(.+?)(?:GROUP|ORDER|LIMIT|$)/i);
        if (whereMatch && whereMatch[1]) {
          const conditionStr = whereMatch[1].trim();
          filteredRows = filteredRows.filter((row) => this.evalRowCondition(row, conditionStr));
        }

        // Process ORDER BY
        const orderMatch = cleanQuery.match(/ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?/i);
        if (orderMatch && orderMatch[1]) {
          const col = orderMatch[1];
          const desc = (orderMatch[2] || "ASC").toUpperCase() === "DESC";
          filteredRows.sort((a, b) => {
            const valA = a[col];
            const valB = b[col];
            if (valA < valB) return desc ? 1 : -1;
            if (valA > valB) return desc ? -1 : 1;
            return 0;
          });
        }

        // Process SELECT columns projection
        const selectMatch = cleanQuery.match(/SELECT\s+(.+?)\s+FROM/i);
        const colClause = selectMatch && selectMatch[1] ? selectMatch[1].trim() : "*";

        let selectedCols: string[] = [];
        let finalRows: Record<string, any>[] = [];

        if (colClause === "*") {
          selectedCols = table.columns.map((c) => c.name);
          finalRows = filteredRows;
        } else {
          selectedCols = colClause.split(",").map((c) => (c.trim().split(" AS ")[0] ?? "").trim());
          finalRows = filteredRows.map((row) => {
            const projected: Record<string, any> = {};
            selectedCols.forEach((col) => {
              projected[col] = row[col] !== undefined ? row[col] : null;
            });
            return projected;
          });
        }

        return {
          columns: selectedCols,
          rows: finalRows,
          rowCount: finalRows.length,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Handle DML/DDL (INSERT, UPDATE, DELETE) with simulated success output
      return {
        columns: ["status", "rows_affected"],
        rows: [{ status: "Query executed successfully", rows_affected: 1 }],
        rowCount: 1,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "SQL Syntax Execution Error";
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        error: `SQL Error: ${msg}`,
      };
    }
  }

  private static evalRowCondition(row: Record<string, any>, conditionStr: string): boolean {
    try {
      // E.g. mark > 80
      const gtMatch = conditionStr.match(/([a-zA-Z0-9_]+)\s*>\s*([0-9.]+)/);
      if (gtMatch && gtMatch[1] && gtMatch[2]) {
        const col = gtMatch[1];
        const val = parseFloat(gtMatch[2]);
        return (row[col] ?? 0) > val;
      }

      // E.g. mark >= 80
      const gteMatch = conditionStr.match(/([a-zA-Z0-9_]+)\s*>=\s*([0-9.]+)/);
      if (gteMatch && gteMatch[1] && gteMatch[2]) {
        const col = gteMatch[1];
        const val = parseFloat(gteMatch[2]);
        return (row[col] ?? 0) >= val;
      }

      // E.g. department = 'Computer Science'
      const eqMatch = conditionStr.match(/([a-zA-Z0-9_]+)\s*=\s*['"](.*?)['"]/);
      if (eqMatch && eqMatch[1] && eqMatch[2] !== undefined) {
        const col = eqMatch[1];
        const val = eqMatch[2];
        return String(row[col] ?? "").toLowerCase() === val.toLowerCase();
      }

      return true;
    } catch {
      return true;
    }
  }

  /**
   * Compares student SQL result table with target test case table
   */
  public static compareSQLResults(actual: SQLQueryResult, expectedRowsJson: string): boolean {
    if (actual.error) return false;
    try {
      const expectedRows = JSON.parse(expectedRowsJson) as Record<string, any>[];
      if (!Array.isArray(expectedRows)) return false;
      if (actual.rows.length !== expectedRows.length) return false;

      return JSON.stringify(actual.rows) === JSON.stringify(expectedRows);
    } catch {
      return false;
    }
  }
}
