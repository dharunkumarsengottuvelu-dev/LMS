/**
 * Sensilearn LMS - Universal SQL Question Template Generator
 * Produces authoritative 9-Sheet Universal Excel Template (.xlsx) & CSV Template (.csv)
 * Adheres strictly to Sensilearn Enterprise SQL Question Specifications.
 */

import { downloadExcelWorkbook, downloadSpreadsheetFile, ExportSheetDefinition } from "@/lib/excel-security";

export const SQL_TEMPLATE_VERSION = "2.0.0";

/**
 * Authoritative 9-Sheet Excel Template Column Definitions
 */
export const SQL_EXCEL_SHEETS = {
  QUESTIONS: "Questions",
  DATABASE_CONFIG: "Database_Config",
  TABLE_SCHEMA: "Table_Schema",
  SAMPLE_DATA: "Sample_Data",
  EXPECTED_OUTPUT: "Expected_Output",
  TEST_CASES: "Test_Cases",
  SOLUTIONS: "Solutions",
  EXPLANATIONS: "Explanations",
  CONSTRAINTS: "Constraints",
} as const;

export const SQL_SHEET_HEADERS = {
  [SQL_EXCEL_SHEETS.QUESTIONS]: [
    "Question_ID",
    "Main_Module",
    "Submodule",
    "Practice_Module",
    "Question_Title",
    "Problem_Statement",
    "Difficulty",
    "Question_Type",
    "Supported_Databases",
    "Marks",
    "Time_Limit",
    "Memory_Limit",
    "Constraints",
    "Status",
  ],
  [SQL_EXCEL_SHEETS.DATABASE_CONFIG]: [
    "Question_ID",
    "Database_Engine",
    "Database_Version",
    "Database_Name",
    "Schema_Name",
    "Execution_Mode",
    "Case_Sensitivity",
    "Output_Comparison_Mode",
  ],
  [SQL_EXCEL_SHEETS.TABLE_SCHEMA]: [
    "Question_ID",
    "Table_ID",
    "Table_Name",
    "Column_Name",
    "Data_Type",
    "Column_Length",
    "Is_Primary_Key",
    "Is_Foreign_Key",
    "Is_Not_Null",
    "Is_Unique",
    "Default_Value",
  ],
  [SQL_EXCEL_SHEETS.SAMPLE_DATA]: [
    "Question_ID",
    "Table_Name",
    "Record_Data",
  ],
  [SQL_EXCEL_SHEETS.EXPECTED_OUTPUT]: [
    "Question_ID",
    "Output_ID",
    "Column_Definitions",
    "Expected_Records",
    "Comparison_Mode",
  ],
  [SQL_EXCEL_SHEETS.TEST_CASES]: [
    "Test_Case_ID",
    "Question_ID",
    "Test_Case_Type",
    "Dataset_Reference",
    "Expected_Output_Reference",
    "Marks",
    "Execution_Time_Limit",
    "Is_Hidden",
  ],
  [SQL_EXCEL_SHEETS.SOLUTIONS]: [
    "Question_ID",
    "Database_Engine",
    "Reference_SQL_Query",
  ],
  [SQL_EXCEL_SHEETS.EXPLANATIONS]: [
    "Question_ID",
    "Solution_Explanation",
    "Learning_Objectives",
  ],
  [SQL_EXCEL_SHEETS.CONSTRAINTS]: [
    "Question_ID",
    "Constraint_Type",
    "Constraint_Description",
  ],
};

/**
 * Realistic Sample Data demonstrating standard enterprise questions:
 * 1. SQL_Q_101: High Earning Employees in Departments (Aggregations & Joins)
 * 2. SQL_Q_102: Active Customers With Total Order Spend (GROUP BY & HAVING)
 */
export const SAMPLE_QUESTIONS_ROWS = [
  [
    "SQL_Q_101",
    "Database Systems",
    "SQL Queries & Joins",
    "Employee Department Practice",
    "High Earning Employees in Departments",
    "Write a SQL query to find employees who earn more than 70,000 in the Engineering or Sales departments. Return employee name, department name, and salary sorted by salary in descending order.",
    "Medium",
    "QUERY_ONLY",
    "MySQL, PostgreSQL, SQLite, SQL Server, Oracle",
    20,
    3000,
    256,
    "Use standard ANSI SQL JOIN. Salaries must be formatted as numeric.",
    "published",
  ],
  [
    "SQL_Q_102",
    "Database Systems",
    "Aggregations & Grouping",
    "Customer Orders Analysis",
    "Top Spending Customers",
    "Write a SQL query to calculate the total amount spent by each customer who has placed orders totaling more than $500. Return customer_name, total_orders, and total_spent sorted by total_spent descending.",
    "Easy",
    "QUERY_ONLY",
    "MySQL, PostgreSQL, SQLite, SQL Server, Oracle",
    15,
    3000,
    256,
    "Only include completed orders (status = 'COMPLETED').",
    "published",
  ],
];

export const SAMPLE_DATABASE_CONFIG_ROWS = [
  [
    "SQL_Q_101",
    "mysql",
    "8.0",
    "corporate_db",
    "public",
    "QUERY_ONLY",
    "INSENSITIVE",
    "ORDER_SENSITIVE",
  ],
  [
    "SQL_Q_102",
    "postgresql",
    "15.0",
    "ecommerce_db",
    "public",
    "QUERY_ONLY",
    "INSENSITIVE",
    "ORDER_SENSITIVE",
  ],
];

export const SAMPLE_TABLE_SCHEMA_ROWS = [
  // SQL_Q_101: departments table
  ["SQL_Q_101", "tbl_dept", "departments", "department_id", "INT", "", "YES", "NO", "YES", "YES", ""],
  ["SQL_Q_101", "tbl_dept", "departments", "department_name", "VARCHAR(100)", "100", "NO", "NO", "YES", "NO", ""],
  // SQL_Q_101: employees table
  ["SQL_Q_101", "tbl_emp", "employees", "employee_id", "INT", "", "YES", "NO", "YES", "YES", ""],
  ["SQL_Q_101", "tbl_emp", "employees", "name", "VARCHAR(100)", "100", "NO", "NO", "YES", "NO", ""],
  ["SQL_Q_101", "tbl_emp", "employees", "department_id", "INT", "", "NO", "YES", "YES", "NO", ""],
  ["SQL_Q_101", "tbl_emp", "employees", "salary", "DECIMAL(10,2)", "", "NO", "NO", "YES", "NO", "0.00"],

  // SQL_Q_102: customers table
  ["SQL_Q_102", "tbl_cust", "customers", "customer_id", "INT", "", "YES", "NO", "YES", "YES", ""],
  ["SQL_Q_102", "tbl_cust", "customers", "customer_name", "VARCHAR(100)", "100", "NO", "NO", "YES", "NO", ""],
  // SQL_Q_102: orders table
  ["SQL_Q_102", "tbl_orders", "orders", "order_id", "INT", "", "YES", "NO", "YES", "YES", ""],
  ["SQL_Q_102", "tbl_orders", "orders", "customer_id", "INT", "", "NO", "YES", "YES", "NO", ""],
  ["SQL_Q_102", "tbl_orders", "orders", "amount", "DECIMAL(10,2)", "", "NO", "NO", "YES", "NO", "0.00"],
  ["SQL_Q_102", "tbl_orders", "orders", "status", "VARCHAR(50)", "50", "NO", "NO", "YES", "NO", "'COMPLETED'"],
];

export const SAMPLE_DATA_ROWS = [
  // SQL_Q_101 departments
  ["SQL_Q_101", "departments", '{"department_id": 1, "department_name": "Engineering"}'],
  ["SQL_Q_101", "departments", '{"department_id": 2, "department_name": "Sales"}'],
  ["SQL_Q_101", "departments", '{"department_id": 3, "department_name": "HR"}'],
  // SQL_Q_101 employees
  ["SQL_Q_101", "employees", '{"employee_id": 101, "name": "Alice Smith", "department_id": 1, "salary": 85000}'],
  ["SQL_Q_101", "employees", '{"employee_id": 102, "name": "Bob Jones", "department_id": 1, "salary": 65000}'],
  ["SQL_Q_101", "employees", '{"employee_id": 103, "name": "Charlie Ray", "department_id": 2, "salary": 92000}'],
  ["SQL_Q_101", "employees", '{"employee_id": 104, "name": "Diana Ross", "department_id": 3, "salary": 75000}'],

  // SQL_Q_102 customers
  ["SQL_Q_102", "customers", '{"customer_id": 1, "customer_name": "Acme Corp"}'],
  ["SQL_Q_102", "customers", '{"customer_id": 2, "customer_name": "Globex Inc"}'],
  ["SQL_Q_102", "customers", '{"customer_id": 3, "customer_name": "Initech"}'],
  // SQL_Q_102 orders
  ["SQL_Q_102", "orders", '{"order_id": 501, "customer_id": 1, "amount": 350.00, "status": "COMPLETED"}'],
  ["SQL_Q_102", "orders", '{"order_id": 502, "customer_id": 1, "amount": 250.00, "status": "COMPLETED"}'],
  ["SQL_Q_102", "orders", '{"order_id": 503, "customer_id": 2, "amount": 150.00, "status": "COMPLETED"}'],
  ["SQL_Q_102", "orders", '{"order_id": 504, "customer_id": 3, "amount": 600.00, "status": "COMPLETED"}'],
  ["SQL_Q_102", "orders", '{"order_id": 505, "customer_id": 2, "amount": 800.00, "status": "CANCELLED"}'],
];

export const SAMPLE_EXPECTED_OUTPUT_ROWS = [
  [
    "SQL_Q_101",
    "OUT_101_1",
    "name, department_name, salary",
    '[{"name": "Charlie Ray", "department_name": "Sales", "salary": 92000}, {"name": "Alice Smith", "department_name": "Engineering", "salary": 85000}]',
    "ORDER_SENSITIVE",
  ],
  [
    "SQL_Q_102",
    "OUT_102_1",
    "customer_name, total_orders, total_spent",
    '[{"customer_name": "Acme Corp", "total_orders": 2, "total_spent": 600.00}, {"customer_name": "Initech", "total_orders": 1, "total_spent": 600.00}]',
    "ORDER_SENSITIVE",
  ],
];

export const SAMPLE_TEST_CASES_ROWS = [
  // SQL_Q_101: 2 public, 1 hidden
  ["TC_101_1", "SQL_Q_101", "PUBLIC", "DEFAULT", "OUT_101_1", 10, 3000, "NO"],
  ["TC_101_2", "SQL_Q_101", "PUBLIC", "DEFAULT", "OUT_101_1", 5, 3000, "NO"],
  ["TC_101_3", "SQL_Q_101", "HIDDEN", "DEFAULT", "OUT_101_1", 5, 3000, "YES"],

  // SQL_Q_102: 1 public, 1 hidden
  ["TC_102_1", "SQL_Q_102", "PUBLIC", "DEFAULT", "OUT_102_1", 10, 3000, "NO"],
  ["TC_102_2", "SQL_Q_102", "HIDDEN", "DEFAULT", "OUT_102_1", 5, 3000, "YES"],
];

export const SAMPLE_SOLUTIONS_ROWS = [
  [
    "SQL_Q_101",
    "mysql",
    "SELECT e.name, d.department_name, e.salary\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nWHERE e.salary > 70000\n  AND d.department_name IN ('Engineering', 'Sales')\nORDER BY e.salary DESC;",
  ],
  [
    "SQL_Q_102",
    "postgresql",
    "SELECT c.customer_name, COUNT(o.order_id) AS total_orders, SUM(o.amount) AS total_spent\nFROM customers c\nJOIN orders o ON c.customer_id = o.customer_id\nWHERE o.status = 'COMPLETED'\nGROUP BY c.customer_id, c.customer_name\nHAVING SUM(o.amount) > 500\nORDER BY total_spent DESC;",
  ],
];

export const SAMPLE_EXPLANATIONS_ROWS = [
  [
    "SQL_Q_101",
    "Filter employees earning over 70,000 using INNER JOIN between employees and departments, applying department criteria in the WHERE clause and sorting descending by salary.",
    "Mastering INNER JOINs, multi-conditional WHERE filtering, and result sorting with ORDER BY.",
  ],
  [
    "SQL_Q_102",
    "Combine customer and orders data via JOIN, filter completed status before grouping, aggregate using COUNT and SUM, and apply post-aggregation threshold filtering with HAVING.",
    "Understanding GROUP BY, aggregate functions (SUM, COUNT), and the distinction between WHERE and HAVING.",
  ],
];

export const SAMPLE_CONSTRAINTS_ROWS = [
  ["SQL_Q_101", "SYNTAX", "Must use explicit INNER JOIN syntax."],
  ["SQL_Q_101", "ORDERING", "Rows must strictly match ORDER BY e.salary DESC."],
  ["SQL_Q_102", "AGGREGATION", "Use HAVING clause for filtering aggregated totals, not WHERE."],
];

/**
 * Generates and downloads the Universal 9-Sheet Excel Workbook
 */
export async function downloadUniversalSqlExcelTemplate(fileName = "sensilearn_universal_sql_template.xlsx"): Promise<void> {
  const sheets: ExportSheetDefinition[] = [
    {
      name: SQL_EXCEL_SHEETS.QUESTIONS,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.QUESTIONS], ...SAMPLE_QUESTIONS_ROWS],
    },
    {
      name: SQL_EXCEL_SHEETS.DATABASE_CONFIG,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.DATABASE_CONFIG], ...SAMPLE_DATABASE_CONFIG_ROWS],
    },
    {
      name: SQL_EXCEL_SHEETS.TABLE_SCHEMA,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.TABLE_SCHEMA], ...SAMPLE_TABLE_SCHEMA_ROWS],
    },
    {
      name: SQL_EXCEL_SHEETS.SAMPLE_DATA,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.SAMPLE_DATA], ...SAMPLE_DATA_ROWS],
    },
    {
      name: SQL_EXCEL_SHEETS.EXPECTED_OUTPUT,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.EXPECTED_OUTPUT], ...SAMPLE_EXPECTED_OUTPUT_ROWS],
    },
    {
      name: SQL_EXCEL_SHEETS.TEST_CASES,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.TEST_CASES], ...SAMPLE_TEST_CASES_ROWS],
    },
    {
      name: SQL_EXCEL_SHEETS.SOLUTIONS,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.SOLUTIONS], ...SAMPLE_SOLUTIONS_ROWS],
    },
    {
      name: SQL_EXCEL_SHEETS.EXPLANATIONS,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.EXPLANATIONS], ...SAMPLE_EXPLANATIONS_ROWS],
    },
    {
      name: SQL_EXCEL_SHEETS.CONSTRAINTS,
      rows: [SQL_SHEET_HEADERS[SQL_EXCEL_SHEETS.CONSTRAINTS], ...SAMPLE_CONSTRAINTS_ROWS],
    },
  ];

  await downloadExcelWorkbook(sheets, fileName);
}

/**
 * Generates and downloads the Single-Sheet CSV Template for quick flat uploads
 */
export async function downloadUniversalSqlCsvTemplate(fileName = "sensilearn_sql_questions_template.csv"): Promise<void> {
  const csvHeaders = [
    "Question_ID",
    "Main_Module",
    "Submodule",
    "Practice_Module",
    "Question_Title",
    "Problem_Statement",
    "Difficulty",
    "Database_Engine",
    "Schema_SQL",
    "Seed_SQL",
    "Reference_Query",
    "Expected_Output_JSON",
    "Comparison_Mode",
    "Marks",
    "Explanation",
  ];

  const csvRows = [
    [
      "SQL_Q_101",
      "Database Systems",
      "SQL Queries & Joins",
      "Employee Department Practice",
      "High Earning Employees in Departments",
      "Write a SQL query to find employees who earn more than 70,000 in Engineering or Sales.",
      "Medium",
      "mysql",
      "CREATE TABLE departments (department_id INT PRIMARY KEY, department_name VARCHAR(100));\nCREATE TABLE employees (employee_id INT PRIMARY KEY, name VARCHAR(100), department_id INT, salary DECIMAL(10,2));",
      "INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Sales');\nINSERT INTO employees VALUES (101, 'Alice Smith', 1, 85000), (102, 'Bob Jones', 1, 65000), (103, 'Charlie Ray', 2, 92000);",
      "SELECT e.name, d.department_name, e.salary FROM employees e JOIN departments d ON e.department_id = d.department_id WHERE e.salary > 70000 ORDER BY e.salary DESC;",
      '[{"name":"Charlie Ray","department_name":"Sales","salary":92000},{"name":"Alice Smith","department_name":"Engineering","salary":85000}]',
      "ORDER_SENSITIVE",
      20,
      "Use INNER JOIN between employees and departments with WHERE salary > 70000.",
    ],
  ];

  await downloadSpreadsheetFile(csvHeaders, csvRows, "SQL_Questions", fileName, "csv");
}
