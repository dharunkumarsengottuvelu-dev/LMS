import type { SQLDatasetSchema, SQLQueryResult, SQLTableSchema } from "@/types/coding";

export const SAMPLE_SQL_DATASETS: Record<string, SQLDatasetSchema> = {};

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
