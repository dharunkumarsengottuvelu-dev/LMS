# SQL Execution & Database Judging Architecture

## System Architecture

The EduNexus LMS SQL Execution Engine provides a secure, isolated database environment for MySQL practice and coding challenges.

```text
Student SQL Query
       │
       ▼
LMS Backend API (/api/sql/run)
       │
       ▼
Isolated SQLExecutionService
       │
       ▼
Dataset Schema Inspector (Tables, Columns, Types, Rows)
       │
       ▼
Query Parser & In-Memory Evaluator
       │
       ▼
QueryResult Table Matrix (Columns, Rows, Time)
```

---

## Security Policies

1. **Production Database Isolation**:
   Student SQL queries **NEVER** execute against the LMS application database or user tables. All queries execute against isolated test datasets (`university`, `company`, etc.).

2. **Privilege Constraints**:
   - `SELECT`, `WHERE`, `JOIN`, `GROUP BY`, `ORDER BY`, `HAVING`, subqueries, and window functions execute in a read-isolated memory space.
   - `DROP DATABASE`, `ALTER SYSTEM`, or filesystem commands are blocked.

3. **Dataset Table Comparison for Judging**:
   For SQL problem submissions, student queries produce a result dataset table which is compared row-by-row against expected solution datasets.

---

## Supported SQL Dialect Features

- `SELECT` column projections and wildcard `*`
- `FROM <table>`
- `WHERE <column> > <val>`, `WHERE <column> = '<string>'`
- `ORDER BY <column> [ASC|DESC]`
- Multi-table Schema Inspection (Primary Keys, Data Types, Table Rows)
