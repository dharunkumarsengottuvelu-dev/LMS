import type { SQLDatasetSchema } from "@/types/coding";

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

export function getDatasetSchema(datasetName = "university"): SQLDatasetSchema {
  return SAMPLE_SQL_DATASETS[datasetName] ?? SAMPLE_SQL_DATASETS["university"]!;
}
