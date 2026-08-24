import type {
  SQLDatasetSchema,
  SQLQueryResult,
  SQLQueryInput,
  SQLEngine,
  SQLComparisonMode,
} from "@/types/coding";

// Default seed dataset for backward compatibility
export const DEFAULT_SQL_SCHEMA = `
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    salary INT NOT NULL,
    hire_date VARCHAR(20)
);

CREATE TABLE departments (
    dept_id INT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    location VARCHAR(100)
);
`;

export const DEFAULT_SQL_SEED = `
INSERT INTO departments VALUES
(1, 'Engineering', 'Building A'),
(2, 'Human Resources', 'Building B'),
(3, 'Finance', 'Building C'),
(4, 'Marketing', 'Building A');

INSERT INTO employees VALUES
(101, 'Arun', 'Engineering', 75000, '2021-03-15'),
(102, 'Priya', 'Engineering', 85000, '2020-07-01'),
(103, 'Ravi', 'Human Resources', 52000, '2019-11-20'),
(104, 'Sneha', 'Finance', 68000, '2022-01-10'),
(105, 'Kumar', 'Marketing', 48000, '2023-05-18'),
(106, 'Divya', 'Engineering', 92000, '2018-09-12');
`;

export const SAMPLE_SQL_DATASETS: Record<string, SQLDatasetSchema> = {
  university: {
    name: "university",
    tables: [
      {
        name: "employees",
        columns: [
          { name: "id", type: "INT", isPrimary: true },
          { name: "name", type: "VARCHAR" },
          { name: "department", type: "VARCHAR" },
          { name: "salary", type: "INT" },
          { name: "hire_date", type: "VARCHAR" },
        ],
        rows: [
          { id: 101, name: "Arun", department: "Engineering", salary: 75000, hire_date: "2021-03-15" },
          { id: 102, name: "Priya", department: "Engineering", salary: 85000, hire_date: "2020-07-01" },
          { id: 103, name: "Ravi", department: "Human Resources", salary: 52000, hire_date: "2019-11-20" },
          { id: 104, name: "Sneha", department: "Finance", salary: 68000, hire_date: "2022-01-10" },
          { id: 105, name: "Kumar", department: "Marketing", salary: 48000, hire_date: "2023-05-18" },
          { id: 106, name: "Divya", department: "Engineering", salary: 92000, hire_date: "2018-09-12" },
        ],
      },
    ],
  },
};

export class SQLExecutionService {
  /**
   * Returns schema details for a given dataset name
   */
  public static getDatasetSchema(datasetName = "university"): SQLDatasetSchema {
    return SAMPLE_SQL_DATASETS[datasetName] ?? SAMPLE_SQL_DATASETS["university"]!;
  }

  /**
   * Executes an SQL query string against the isolated engine using Jobe.
   */
  public static async executeQuery(
    queryStr: string,
    datasetName = "university",
    options?: {
      engine?: SQLEngine;
      schemaSql?: string;
      seedSql?: string;
      timeoutMs?: number;
    }
  ): Promise<SQLQueryResult> {
    const engine: SQLEngine = options?.engine || "sqlite";
    const schemaSql = options?.schemaSql?.trim() || DEFAULT_SQL_SCHEMA;
    const seedSql = options?.seedSql?.trim() || DEFAULT_SQL_SEED;
    const timeoutMs = options?.timeoutMs || 8000;

    const cleanQuery = (queryStr || "").trim();

    if (!cleanQuery) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: "Query string cannot be empty.",
        engine,
      };
    }

    // 1. Browser context: route through Next.js API endpoint
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/sql/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: cleanQuery,
            datasetName,
            engine,
            schemaSql,
            seedSql,
            timeoutMs,
          }),
        });

        if (res.ok) {
          return (await res.json()) as SQLQueryResult;
        }

        const errData = await res.json().catch(() => ({}));
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: errData.error || `Execution failed with status ${res.status}`,
          engine,
        };
      } catch (clientErr: any) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: `Network error: ${clientErr.message || clientErr}`,
          engine,
        };
      }
    }

    // 2. Server context: execute directly on Jobe
    const runnerPythonScript = this.generateRunnerScript({
      engine,
      schemaSql,
      seedSql,
      query: cleanQuery,
    });

    const startTime = Date.now();

    try {
      const { jobeService } = await import("@/services/jobe");
      const execution = await jobeService.executeCode(
        "python3",
        runnerPythonScript,
        "",
        {
          timeLimit: Math.max(1, Math.ceil(timeoutMs / 1000)),
          memoryLimit: 256,
        }
      );

      const elapsed = Date.now() - startTime;

      if (execution.status?.id === 5 || execution.outcome === 13) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: elapsed,
          error: "SQL Execution Timeout: Query exceeded maximum allowed time.",
          engine,
        };
      }

      const rawStdout = (execution.stdout || "").trim();
      const rawStderr = (execution.stderr || "").trim();
      const compileErr = (execution.compile_output || "").trim();

      // Look for the JSON payload marker in stdout
      const jsonMatch = rawStdout.match(/__SQL_RESULT_JSON_START__([\s\S]*?)__SQL_RESULT_JSON_END__/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          if (parsed.error) {
            return {
              columns: [],
              rows: [],
              rowCount: 0,
              executionTimeMs: parsed.executionTimeMs || elapsed,
              error: this.sanitizeErrorMessage(parsed.error),
              engine,
            };
          }

          return {
            columns: parsed.columns || [],
            rows: parsed.rows || [],
            rowCount: typeof parsed.rowCount === "number" ? parsed.rowCount : (parsed.rows?.length || 0),
            executionTimeMs: parsed.executionTimeMs || elapsed,
            engine,
          };
        } catch {
          // JSON parsing failed
        }
      }

      // If we have an error in stderr or compile error
      const combinedError = rawStderr || compileErr || rawStdout || "Unknown SQL runtime execution error";
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: elapsed,
        error: this.sanitizeErrorMessage(combinedError),
        engine,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        error: this.sanitizeErrorMessage(msg),
        engine,
      };
    }
  }

  /**
   * Generates a robust, self-contained Python script to provision a temporary isolated
   * database, apply DDL/DML, execute student query, capture JSON, and tear down.
   */
  public static generateRunnerScript(params: {
    engine: SQLEngine;
    schemaSql: string;
    seedSql: string;
    query: string;
  }): string {
    const { engine, schemaSql, seedSql, query } = params;

    // Encode SQL strings as JSON strings to safely embed into Python
    const schemaJson = JSON.stringify(schemaSql);
    const seedJson = JSON.stringify(seedSql);
    const queryJson = JSON.stringify(query);

    return `
import sys
import json
import time
import uuid
import decimal
import datetime

class JSONEncoderCustom(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        if isinstance(obj, decimal.Decimal):
            return float(obj) if (obj % 1 > 0) else int(obj)
        if isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        return super(JSONEncoderCustom, self).default(obj)

SCHEMA_SQL = ${schemaJson}
SEED_SQL = ${seedJson}
USER_QUERY = ${queryJson}
ENGINE = "${engine}"

def sanitize_err(e):
    msg = str(e)
    # Remove internal connection credentials/hosts if present
    for secret in ["jobe_pg_password", "jobe_mysql_password", "jobe_mariadb_password", "postgres-sandbox", "mysql-sandbox", "mariadb-sandbox", "localhost", "127.0.0.1"]:
        msg = msg.replace(secret, "[redacted]")
    return msg

def run_sqlite():
    import sqlite3
    # Use memory database or temporary file in /tmp
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Apply Schema
    if SCHEMA_SQL.strip():
        cursor.executescript(SCHEMA_SQL)
    
    # 2. Apply Seed Data
    if SEED_SQL.strip():
        cursor.executescript(SEED_SQL)
    
    # 3. Execute User Query
    t0 = time.time()
    cursor.execute(USER_QUERY)
    t_elapsed = int((time.time() - t0) * 1000)
    
    columns = [desc[0] for desc in cursor.description] if cursor.description else []
    rows = []
    if cursor.description:
        raw_rows = cursor.fetchall()
        for r in raw_rows:
            rows.append(dict(r))
        row_count = len(rows)
    else:
        conn.commit()
        row_count = cursor.rowcount if cursor.rowcount >= 0 else 0
        rows = [{"status": "Query executed successfully", "rows_affected": row_count}]
        columns = ["status", "rows_affected"]
        
    conn.close()
    return {"columns": columns, "rows": rows, "rowCount": row_count, "executionTimeMs": t_elapsed, "error": None}

def run_postgres():
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
        import psycopg2.extras
    except ImportError:
        # Fallback to sqlite if driver missing in local dev
        return run_sqlite()
        
    import os
    pg_host = os.environ.get("POSTGRES_HOST", "postgres-sandbox")
    pg_port = int(os.environ.get("POSTGRES_PORT", 5432))
    pg_user = os.environ.get("POSTGRES_USER", "postgres")
    pg_pass = os.environ.get("POSTGRES_PASSWORD", "jobe_pg_password")
    
    db_name = f"sandbox_{uuid.uuid4().hex[:12]}"
    
    # Connect to default db to create ephemeral db
    try:
        conn_init = psycopg2.connect(dbname="postgres", user=pg_user, password=pg_pass, host=pg_host, port=pg_port, connect_timeout=4)
    except Exception:
        # Try localhost fallback for local development
        conn_init = psycopg2.connect(dbname="postgres", user=pg_user, password=pg_pass, host="127.0.0.1", port=pg_port, connect_timeout=3)
        
    conn_init.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur_init = conn_init.cursor()
    cur_init.execute(f'CREATE DATABASE "{db_name}";')
    cur_init.close()
    conn_init.close()
    
    res = {}
    try:
        conn = psycopg2.connect(dbname=db_name, user=pg_user, password=pg_pass, host=pg_host, port=pg_port, connect_timeout=4)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Apply schema & seed
        if SCHEMA_SQL.strip():
            cur.execute(SCHEMA_SQL)
        if SEED_SQL.strip():
            cur.execute(SEED_SQL)
        conn.commit()
        
        # Execute query
        t0 = time.time()
        cur.execute(USER_QUERY)
        t_elapsed = int((time.time() - t0) * 1000)
        
        columns = [desc.name for desc in cur.description] if cur.description else []
        rows = []
        if cur.description:
            raw_rows = cur.fetchall()
            rows = [dict(r) for r in raw_rows]
            row_count = len(rows)
        else:
            conn.commit()
            row_count = cur.rowcount if cur.rowcount >= 0 else 0
            rows = [{"status": "Query executed successfully", "rows_affected": row_count}]
            columns = ["status", "rows_affected"]
            
        cur.close()
        conn.close()
        res = {"columns": columns, "rows": rows, "rowCount": row_count, "executionTimeMs": t_elapsed, "error": None}
    finally:
        # Guaranteed teardown
        try:
            conn_cleanup = psycopg2.connect(dbname="postgres", user=pg_user, password=pg_pass, host=pg_host, port=pg_port, connect_timeout=4)
            conn_cleanup.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur_clean = conn_cleanup.cursor()
            cur_clean.execute(f'DROP DATABASE IF EXISTS "{db_name}";')
            cur_clean.close()
            conn_cleanup.close()
        except Exception:
            pass
            
    return res

def run_mysql_family(db_engine):
    try:
        import pymysql
        import pymysql.cursors
    except ImportError:
        # Fallback to sqlite if driver missing in local dev
        return run_sqlite()
        
    import os
    default_host = "mysql-sandbox" if db_engine == "mysql" else "mariadb-sandbox"
    default_pass = "jobe_mysql_password" if db_engine == "mysql" else "jobe_mariadb_password"
    
    host = os.environ.get("MYSQL_HOST", default_host)
    port = int(os.environ.get("MYSQL_PORT", 3306))
    user = os.environ.get("MYSQL_USER", "root")
    password = os.environ.get("MYSQL_PASSWORD", default_pass)
    
    db_name = f"sandbox_{uuid.uuid4().hex[:12]}"
    
    try:
        conn_init = pymysql.connect(host=host, user=user, password=password, port=port, connect_timeout=4)
    except Exception:
        conn_init = pymysql.connect(host="127.0.0.1", user=user, password=password, port=port, connect_timeout=3)
        
    cur_init = conn_init.cursor()
    cur_init.execute(f"CREATE DATABASE \`{db_name}\`;")
    cur_init.close()
    conn_init.close()
    
    res = {}
    try:
        conn = pymysql.connect(host=host, user=user, password=password, database=db_name, port=port, cursorclass=pymysql.cursors.DictCursor, connect_timeout=4)
        cur = conn.cursor()
        
        # Apply schema and seed (handling multiple statements if present)
        for stmt in SCHEMA_SQL.split(';'):
            if stmt.strip():
                cur.execute(stmt)
        for stmt in SEED_SQL.split(';'):
            if stmt.strip():
                cur.execute(stmt)
        conn.commit()
        
        # Execute User Query
        t0 = time.time()
        cur.execute(USER_QUERY)
        t_elapsed = int((time.time() - t0) * 1000)
        
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = []
        if cur.description:
            raw_rows = cur.fetchall()
            rows = [dict(r) for r in raw_rows]
            row_count = len(rows)
        else:
            conn.commit()
            row_count = cur.rowcount if cur.rowcount >= 0 else 0
            rows = [{"status": "Query executed successfully", "rows_affected": row_count}]
            columns = ["status", "rows_affected"]
            
        cur.close()
        conn.close()
        res = {"columns": columns, "rows": rows, "rowCount": row_count, "executionTimeMs": t_elapsed, "error": None}
    finally:
        try:
            conn_cleanup = pymysql.connect(host=host, user=user, password=password, port=port, connect_timeout=4)
            cur_clean = conn_cleanup.cursor()
            cur_clean.execute(f"DROP DATABASE IF EXISTS \`{db_name}\`;")
            cur_clean.close()
            conn_cleanup.close()
        except Exception:
            pass
            
    return res

def main():
    result = None
    try:
        if ENGINE == "sqlite":
            result = run_sqlite()
        elif ENGINE == "postgresql":
            result = run_postgres()
        elif ENGINE in ["mysql", "mariadb"]:
            result = run_mysql_family(ENGINE)
        else:
            result = run_sqlite()
    except Exception as err:
        result = {
            "columns": [],
            "rows": [],
            "rowCount": 0,
            "executionTimeMs": 0,
            "error": sanitize_err(err)
        }
        
    print("__SQL_RESULT_JSON_START__")
    print(json.dumps(result, cls=JSONEncoderCustom))
    print("__SQL_RESULT_JSON_END__")

if __name__ == "__main__":
    main()
`;
  }

  /**
   * Sanitizes database error messages to prevent leaking credentials, internal container IPs,
   * or file system paths to the student.
   */
  public static sanitizeErrorMessage(errorStr: string): string {
    if (!errorStr) return "SQL Execution Error";

    let sanitized = errorStr
      .replace(/password\s*=\s*['"][^'"]+['"]/gi, "password='***'")
      .replace(/jobe_pg_password|jobe_mysql_password|jobe_mariadb_password/gi, "***")
      .replace(/postgres-sandbox|mysql-sandbox|mariadb-sandbox/gi, "database-host")
      .replace(/\/tmp\/[a-zA-Z0-9_-]+/g, "/tmp/[sandbox]")
      .replace(/File ".*?", line \d+, in \w+/g, "")
      .replace(/Traceback \(most recent call last\):/g, "")
      .trim();

    // Clean up empty lines created by removing stack trace lines
    sanitized = sanitized
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");

    return sanitized || "SQL Syntax Execution Error";
  }

  /**
   * Canonical row normalization for robust comparison
   */
  private static normalizeValue(val: any): any {
    if (val === null || val === undefined) return null;
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val;
    // Check if numeric string
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^-?\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }
      if (/^-?\d+\.\d+$/.test(trimmed)) {
        return parseFloat(trimmed);
      }
      return trimmed;
    }
    return String(val);
  }

  private static canonicalizeRow(row: Record<string, any>): Record<string, any> {
    const sortedKeys = Object.keys(row).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const normalized: Record<string, any> = {};
    for (const key of sortedKeys) {
      normalized[key.toLowerCase()] = this.normalizeValue(row[key]);
    }
    return normalized;
  }

  /**
   * Compares student SQL result table with target test case table.
   * Supports ORDER_SENSITIVE and ORDER_INSENSITIVE evaluation.
   */
  public static compareSQLResults(
    actual: SQLQueryResult,
    expectedRowsOrJson: string | Record<string, any>[],
    mode: SQLComparisonMode = "ORDER_SENSITIVE"
  ): boolean {
    if (actual.error || !actual.rows) return false;

    let expectedRows: Record<string, any>[] = [];
    try {
      if (typeof expectedRowsOrJson === "string") {
        const parsed = JSON.parse(expectedRowsOrJson.trim());
        expectedRows = Array.isArray(parsed) ? parsed : [parsed];
      } else if (Array.isArray(expectedRowsOrJson)) {
        expectedRows = expectedRowsOrJson;
      } else {
        return false;
      }
    } catch {
      // If expected output is a raw string/table rather than JSON, compare row count or string repr
      return false;
    }

    if (actual.rows.length !== expectedRows.length) {
      return false;
    }

    const normActualRows = actual.rows.map((r) => this.canonicalizeRow(r));
    const normExpectedRows = expectedRows.map((r) => this.canonicalizeRow(r));

    if (mode === "ORDER_INSENSITIVE") {
      // Sort rows canonically by their JSON representation
      const sortedActual = normActualRows
        .map((r) => JSON.stringify(r))
        .sort();
      const sortedExpected = normExpectedRows
        .map((r) => JSON.stringify(r))
        .sort();

      return JSON.stringify(sortedActual) === JSON.stringify(sortedExpected);
    }

    // ORDER_SENSITIVE (Default): Row order must match exactly
    for (let i = 0; i < normActualRows.length; i++) {
      if (JSON.stringify(normActualRows[i]) !== JSON.stringify(normExpectedRows[i])) {
        return false;
      }
    }

    return true;
  }
}

