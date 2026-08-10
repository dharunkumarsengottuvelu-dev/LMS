import type {
  CodingProblem,
  CodingSubmission,
  TestCase,
  TestCaseResult,
  CodingLanguage,
  SubmissionStatus,
  SubmitCodeInput,
} from "@/types/coding";
import { jobeService } from "@/services/jobe";
import { SQLExecutionService } from "@/services/sql-execution.service";

// TODO: NEEDS REAL IMPLEMENTATION
// The Supabase schema is missing 'coding_problems' and 'coding_submissions' tables.
// This feature relies entirely on mocked data and localStorage persistence.
// Do not remove this mock data until real backend implementation is ready.

export const SAMPLE_CODING_PROBLEMS: CodingProblem[] = [
  {
    id: "p1",
    title: "1. Two Sum Problem",
    slug: "two-sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
    difficulty: "easy",
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.",
    input_format: "First line: integer n (array length). Second line: n space-separated integers. Third line: integer target.",
    output_format: "Print two space-separated indices i j such that nums[i] + nums[j] == target.",
    points: 10,
    sample_input: "4\n2 7 11 15\n9",
    sample_output: "0 1",
    templates: {
      python: `# Python Solution\nimport sys\n\ndef main():\n    lines = sys.stdin.read().split()\n    if not lines:\n        return\n    n = int(lines[0])\n    nums = [int(x) for x in lines[1:n+1]]\n    target = int(lines[n+1])\n    \n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            print(f"{seen[diff]} {i}")\n            return\n        seen[num] = i\n\nif __name__ == "__main__":\n    main()\n`,
      java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();\n        int target = sc.nextInt();\n        \n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < n; i++) {\n            int diff = target - nums[i];\n            if (map.containsKey(diff)) {\n                System.out.println(map.get(diff) + " " + i);\n                return;\n            }\n            map.put(nums[i], i);\n        }\n    }\n}\n`,
      cpp: `#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) cin >> nums[i];\n    int target;\n    cin >> target;\n    \n    unordered_map<int, int> mp;\n    for (int i = 0; i < n; i++) {\n        int diff = target - nums[i];\n        if (mp.count(diff)) {\n            cout << mp[diff] << " " << i << endl;\n            return 0;\n        }\n        mp[nums[i]] = i;\n    }\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split(/\\s+/);\nif (input.length < 3) process.exit(0);\n\nconst n = parseInt(input[0], 10);\nconst nums = input.slice(1, n + 1).map(Number);\nconst target = parseInt(input[n + 1], 10);\n\nconst map = new Map();\nfor (let i = 0; i < n; i++) {\n  const diff = target - nums[i];\n  if (map.has(diff)) {\n    console.log(\`\${map.get(diff)} \${i}\`);\n    break;\n  }\n  map.set(nums[i], i);\n}\n`,
    },
    test_cases: [
      {
        id: "tc-p1-1",
        input: "4\n2 7 11 15\n9",
        expected_output: "0 1",
        is_hidden: false,
        explanation: "nums[0] + nums[1] = 2 + 7 = 9, so target is met.",
      },
      {
        id: "tc-p1-2",
        input: "3\n3 2 4\n6",
        expected_output: "1 2",
        is_hidden: false,
        explanation: "nums[1] + nums[2] = 2 + 4 = 6.",
      },
      {
        id: "tc-p1-3",
        input: "5\n10 20 30 40 50\n90",
        expected_output: "3 4",
        is_hidden: true,
      },
      {
        id: "tc-p1-4",
        input: "6\n-1 -2 -3 -4 -5 10\n6",
        expected_output: "3 5",
        is_hidden: true,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "p2",
    title: "2. Reverse a String",
    slug: "reverse-string",
    description: "Write a program that takes a single line string from standard input and prints the reversed string to stdout.",
    difficulty: "easy",
    input_format: "A single line containing the string to reverse.",
    output_format: "Print the reversed string.",
    points: 10,
    sample_input: "edunexus",
    sample_output: "suxened",
    templates: {
      python: `import sys\ns = sys.stdin.read().strip()\nprint(s[::-1])\n`,
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync('/dev/stdin', 'utf-8').trim();\nconsole.log(s.split('').reverse().join(''));\n`,
      java: `import java.util.Scanner;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            String s = sc.nextLine().trim();\n            System.out.println(new StringBuilder(s).reverse().toString());\n        }\n    }\n}\n`,
    },
    test_cases: [
      {
        id: "tc-p2-1",
        input: "edunexus",
        expected_output: "suxened",
        is_hidden: false,
      },
      {
        id: "tc-p2-2",
        input: "hello",
        expected_output: "olleh",
        is_hidden: false,
      },
      {
        id: "tc-p2-3",
        input: "OpenAI Jobe Sandbox",
        expected_output: "xodnaS eboJ IAnepO",
        is_hidden: true,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "p3",
    title: "3. Fibonacci Sequence Generator",
    slug: "fibonacci",
    description: "Given N, return the N-th Fibonacci number. Base cases: F(0) = 0, F(1) = 1.",
    difficulty: "medium",
    input_format: "A single integer N (0 <= N <= 50).",
    output_format: "Print the N-th Fibonacci number.",
    points: 10,
    sample_input: "10",
    sample_output: "55",
    templates: {
      python: `import sys\n\ndef fib(n):\n    if n <= 0: return 0\n    if n == 1: return 1\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().split()\n    if lines:\n        print(fib(int(lines[0])))\n`,
    },
    test_cases: [
      {
        id: "tc-p3-1",
        input: "10",
        expected_output: "55",
        is_hidden: false,
      },
      {
        id: "tc-p3-2",
        input: "0",
        expected_output: "0",
        is_hidden: false,
      },
      {
        id: "tc-p3-3",
        input: "30",
        expected_output: "832040",
        is_hidden: true,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "p4",
    title: "4. High Scoring Students Query",
    slug: "high-scoring-students-sql",
    description: "Write an SQL query to select all columns from `students` table where `mark` is greater than 80.",
    difficulty: "easy",
    category: "SQL",
    input_format: "An SQL SELECT query against the `students` table.",
    output_format: "Print the matching rows as JSON.",
    points: 10,
    dataset_name: "university",
    sample_input: "SELECT * FROM students WHERE mark > 80;",
    sample_output: `[{"id":1,"name":"Arun Kumar","department":"Computer Science","mark":85,"grade":"A"},{"id":2,"name":"Bhavana Sharma","department":"Information Tech","mark":92,"grade":"A+"},{"id":4,"name":"Divya Nair","department":"Electronics","mark":88,"grade":"A"},{"id":6,"name":"Farhan Ali","department":"Mechanical","mark":95,"grade":"A+"}]`,
    templates: {
      sql: `SELECT * FROM students WHERE mark > 80;`,
    },
    test_cases: [
      {
        id: "tc-p4-1",
        input: "SELECT * FROM students WHERE mark > 80;",
        expected_output: `[{"id":1,"name":"Arun Kumar","department":"Computer Science","mark":85,"grade":"A"},{"id":2,"name":"Bhavana Sharma","department":"Information Tech","mark":92,"grade":"A+"},{"id":4,"name":"Divya Nair","department":"Electronics","mark":88,"grade":"A"},{"id":6,"name":"Farhan Ali","department":"Mechanical","mark":95,"grade":"A+"}]`,
        is_hidden: false,
        explanation: "Selects students with mark > 80",
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_SUBMISSIONS_KEY = "edunexus_coding_submissions_v1";

export class SubmissionService {
  private static submissionsMemoryStore: CodingSubmission[] = [];

  /**
   * Retrieves a problem by ID, option to sanitize hidden test cases for public client view.
   */
  public static getProblemById(problemId: string, publicOnly = true): CodingProblem | null {
    console.warn("Mock getProblemById called: 'coding_problems' table missing from Supabase.");
    const problem = SAMPLE_CODING_PROBLEMS.find((p) => p.id === problemId || p.slug === problemId);
    if (!problem) return null;

    if (publicOnly) {
      return {
        ...problem,
        test_cases: problem.test_cases.filter((tc) => !tc.is_hidden),
      };
    }

    return problem;
  }

  /**
   * Evaluates a solution against test cases via the Jobe execution server.
   */
  public static async submitSolution(
    input: SubmitCodeInput,
    studentId: string = "student-1"
  ): Promise<CodingSubmission> {
    console.warn("Mock submitSolution called: 'coding_submissions' table missing from Supabase.");
    const problem = this.getProblemById(input.problem_id, false);

    if (!problem) {
      throw new Error(`Problem not found: ${input.problem_id}`);
    }

    const testCases = problem.test_cases;
    const testResults: TestCaseResult[] = [];
    let passedCount = 0;
    let overallStatus: SubmissionStatus = "accepted";
    let firstError: string | undefined;

    // Evaluate each test case through Jobe or SQLExecutionService
    for (const tc of testCases) {
      let passed = false;
      let trimmedActual = "";
      let trimmedExpected = (tc.expected_output || "").trim();
      let resError: string | undefined;
      let executionTime = 0.02;

      if (input.language === "sql") {
        const sqlRes = SQLExecutionService.executeQuery(input.code, problem.dataset_name ?? "university");
        executionTime = sqlRes.executionTimeMs / 1000;
        if (sqlRes.error) {
          passed = false;
          resError = sqlRes.error;
          trimmedActual = sqlRes.error;
        } else {
          trimmedActual = JSON.stringify(sqlRes.rows);
          passed = SQLExecutionService.compareSQLResults(sqlRes, trimmedExpected);
        }
      } else {
        const res = await jobeService.executeCode(input.language, input.code, tc.input);
        trimmedActual = (res.stdout || "").trim();
        executionTime = res.time ? parseFloat(res.time) : 0.02;

        passed =
          res.outcome === 15 || res.outcome === 0
            ? trimmedActual === trimmedExpected
            : false;

        if (!passed) {
          resError = res.compile_output || res.stderr || res.message || "Output mismatch";
        }
      }

      if (passed) {
        passedCount++;
      } else if (overallStatus === "accepted") {
        overallStatus = resError?.includes("Syntax") || resError?.includes("compile")
          ? "compilation_error"
          : "wrong_answer";
        firstError = resError || "Output mismatch";
      }

      // Prepare sanitized test result (never expose hidden test inputs/expected output to browser)
      testResults.push({
        test_case_id: tc.id,
        passed,
        actual_output: tc.is_hidden ? (passed ? "Match" : "Mismatch (Hidden Test Case)") : trimmedActual,
        expected_output: tc.is_hidden ? "Hidden" : trimmedExpected,
        error: !passed ? (tc.is_hidden ? "Hidden Test Failed" : firstError) : undefined,
        time_seconds: executionTime,
        memory_kb: 12400,
      });
    }

    const submission: CodingSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      problem_id: problem.id,
      student_id: studentId,
      language: input.language,
      code: input.code,
      status: overallStatus,
      passed_test_cases: passedCount,
      total_test_cases: testCases.length,
      results: testResults,
      created_at: new Date().toISOString(),
    };

    this.saveSubmission(submission);
    return submission;
  }

  /**
   * Saves a submission to in-memory store and localStorage if available.
   */
  public static saveSubmission(submission: CodingSubmission): void {
    this.submissionsMemoryStore.unshift(submission);

    if (typeof window !== "undefined") {
      try {
        const existing = this.getStudentSubmissions(submission.student_id);
        const updated = [submission, ...existing.filter((s) => s.id !== submission.id)];
        localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(updated.slice(0, 50)));
      } catch (err) {
        console.error("Failed to save submission to localStorage:", err);
      }
    }
  }

  /**
   * Retrieves submissions for a student.
   */
  public static getStudentSubmissions(studentId: string = "student-1"): CodingSubmission[] {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CodingSubmission[];
          return parsed.filter((s) => s.student_id === studentId);
        }
      } catch {}
    }

    return this.submissionsMemoryStore.filter((s) => s.student_id === studentId);
  }
}
