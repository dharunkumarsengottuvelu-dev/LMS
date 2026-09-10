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

  // 1. Explicit Public Test Cases
  const tc1In = row.testcase_1_input ?? row.testcase1_input ?? row.test_case_1_input;
  const tc1Out = row.testcase_1_output ?? row.testcase1_output ?? row.test_case_1_output;
  if (tc1In !== undefined || tc1Out !== undefined) {
    publicTestCases.push({
      id: `tc_${Date.now()}_1_${qIdx}`,
      name: "Test Case 1",
      input: String(tc1In ?? "").trim(),
      expected_output: String(tc1Out ?? "").trim(),
      expectedOutput: String(tc1Out ?? "").trim(),
      is_hidden: false,
      isSample: true,
    });
  }

  const tc2In = row.testcase_2_input ?? row.testcase2_input ?? row.test_case_2_input;
  const tc2Out = row.testcase_2_output ?? row.testcase2_output ?? row.test_case_2_output;
  if (tc2In !== undefined || tc2Out !== undefined) {
    publicTestCases.push({
      id: `tc_${Date.now()}_2_${qIdx}`,
      name: "Test Case 2",
      input: String(tc2In ?? "").trim(),
      expected_output: String(tc2Out ?? "").trim(),
      expectedOutput: String(tc2Out ?? "").trim(),
      is_hidden: false,
      isSample: false,
    });
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

  // 2. Hidden Test Cases
  const h1In = row.hidden_testcase_input ?? row.hidden_testcase_1_input ?? row.hidden_input ?? row.hiddenInput;
  const h1Out = row.hidden_testcase_output ?? row.hidden_testcase_1_output ?? row.hidden_output ?? row.hiddenOutput;
  if (h1In !== undefined || h1Out !== undefined) {
    hiddenTestCases.push({
      id: `tc_hid_${Date.now()}_1_${qIdx}`,
      name: "Hidden Test Case 1",
      input: String(h1In ?? "").trim(),
      expected_output: String(h1Out ?? "").trim(),
      expectedOutput: String(h1Out ?? "").trim(),
      is_hidden: true,
    });
  }

  const h2In = row.hidden_testcase_2_input ?? row.hidden_input_2 ?? row.hidden2Input;
  const h2Out = row.hidden_testcase_2_output ?? row.hidden_output_2 ?? row.hidden2Output;
  if (h2In !== undefined || h2Out !== undefined) {
    hiddenTestCases.push({
      id: `tc_hid_${Date.now()}_2_${qIdx}`,
      name: "Hidden Test Case 2",
      input: String(h2In ?? "").trim(),
      expected_output: String(h2Out ?? "").trim(),
      expectedOutput: String(h2Out ?? "").trim(),
      is_hidden: true,
    });
  }

  const problemStatement = String(row.description || row.problemStatement || row.problem_statement || "").trim();
  const constraints = String(row.constraints || "").trim();
  const inputFormat = String(row.input_format || row.inputFormat || "").trim();
  const outputFormat = String(row.output_format || row.outputFormat || "").trim();
  const starterCodeStr = String(row.starterCode || row.starter_code || "").trim();

  const combinedCases = [...publicTestCases, ...hiddenTestCases];

  const starterTemplates: Record<string, string> = {
    java: starterCodeStr || "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write solution here\n    }\n}\n",
    python: starterCodeStr || "# Write solution here\nimport sys\n\ndef main():\n    pass\n\nif __name__ == '__main__':\n    main()\n",
    cpp: starterCodeStr || "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write solution here\n    return 0;\n}\n",
    javascript: starterCodeStr || "// Write solution here\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\n",
    c: starterCodeStr || "/* Write solution here */\n#include <stdio.h>\n\nint main() {\n    return 0;\n}\n",
  };

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
  assessment_questions: {
    moduleType: "assessment_questions",
    displayName: "Assessment Sections & Questions Template",
    description: "Template for bulk importing questions organized into sections (e.g. Aptitude, Technical, Coding) under an Assessment.",
    templateFileName: "assessment_sections_and_questions_template.xlsx",
    groupByField: "sectionName",
    columns: [
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
        required: true,
        description: "Name of the Section (e.g. 'Aptitude & Logical Reasoning', 'Technical MCQ', 'Programming Fundamentals', 'Coding')",
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
        options: ["mcq", "msq", "coding"],
        description: "Type of question: mcq (Single choice), msq (Multiple select), or coding (Live execution)",
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
        key: "hidden_testcase_input",
        label: "Hidden Test Case Input",
        type: "string",
        required: false,
        description: "Hidden evaluation testcase input to prevent hardcoding",
        sampleValue: "7",
      },
      {
        key: "hidden_testcase_output",
        label: "Hidden Test Case Expected Output",
        type: "string",
        required: false,
        description: "Hidden evaluation expected output",
        sampleValue: "5040",
      },
      {
        key: "starterCode",
        label: "Starter Boilerplate Code",
        type: "string",
        required: false,
        description: "Pre-filled code template for students",
        sampleValue: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}",
      }
    ],
    sampleRows: [
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
        sectionName: "Aptitude & Logical Reasoning",
        title: "If 12 men can complete a job in 8 days, how many days will 16 men take?",
        type: "mcq",
        marks: 2,
        difficulty: "Easy",
        optionA: "4 days",
        optionB: "6 days",
        optionC: "8 days",
        optionD: "10 days",
        correctOption: "B",
        explanation: "M1 * D1 = M2 * D2 => 12 * 8 = 16 * D2 => D2 = 6 days."
      },

      // Section 2: Programming Fundamentals & OOP (MCQs)
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
        sectionName: "Programming Fundamentals",
        title: "What is the return type of hashCode() method in java.lang.Object?",
        type: "mcq",
        marks: 2,
        difficulty: "Easy",
        optionA: "int",
        optionB: "long",
        optionC: "String",
        optionD: "void",
        correctOption: "A",
        explanation: "hashCode() returns a 32-bit signed primitive integer."
      },

      // Section 3: Technical MCQ (MCQ & MSQ)
      {
        assessmentTitle: "Java MNC Assessment",
        sectionName: "Technical MCQ",
        title: "Which Java collection preserves insertion order and permits null values?",
        type: "mcq",
        marks: 2,
        difficulty: "Medium",
        optionA: "HashSet",
        optionB: "TreeSet",
        optionC: "LinkedHashSet",
        optionD: "PriorityQueue",
        correctOption: "C",
        explanation: "LinkedHashSet maintains a doubly-linked list running across its elements preserving insertion order."
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
        explanation: "IOException and SQLException are checked exceptions; NullPointerException and ArithmeticException are RuntimeExceptions."
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
        testcase_1_input: "hello",
        testcase_1_output: "olleh",
        testcase_2_input: "world",
        testcase_2_output: "dlrow",
        hidden_testcase_input: "enterprise",
        hidden_testcase_output: "esirpretne",
        starterCode: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n        System.out.println(new StringBuilder(s).reverse().toString());\n    }\n}"
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
        testcase_1_input: "{[()]}",
        testcase_1_output: "true",
        testcase_2_input: "{[(])}",
        testcase_2_output: "false",
        hidden_testcase_input: "((()))",
        hidden_testcase_output: "true",
        starterCode: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write solution here\n    }\n}"
      }
    ],
    mapToPayload: (row, idx) => {
      const qType = String(row.type || "mcq").toLowerCase().trim();
      const secName = String(row.sectionName || row.section || "General Assessment").trim();
      const marks = Number(row.marks) || 5;

      const rawCorrect = String(row.correctOption || "A").trim().toUpperCase();
      const correctParts = rawCorrect.split(",").map((s) => s.trim());

      const options = [
        { id: 1, text: String(row.optionA || "Option A").trim(), isCorrect: correctParts.includes("A") || correctParts.includes("1") },
        { id: 2, text: String(row.optionB || "Option B").trim(), isCorrect: correctParts.includes("B") || correctParts.includes("2") },
        { id: 3, text: String(row.optionC || "Option C").trim(), isCorrect: correctParts.includes("C") || correctParts.includes("3") },
        { id: 4, text: String(row.optionD || "Option D").trim(), isCorrect: correctParts.includes("D") || correctParts.includes("4") },
      ];

      const testCases: any[] = [];
      if (row.testcase_1_input !== undefined || row.testcase_1_output !== undefined) {
        testCases.push({
          id: 1,
          input: String(row.testcase_1_input || "").trim(),
          output: String(row.testcase_1_output || "").trim(),
          isHidden: false,
        });
      }
      if (row.testcase_2_input !== undefined || row.testcase_2_output !== undefined) {
        testCases.push({
          id: 2,
          input: String(row.testcase_2_input || "").trim(),
          output: String(row.testcase_2_output || "").trim(),
          isHidden: false,
        });
      }
      if (row.hidden_testcase_input !== undefined || row.hidden_testcase_output !== undefined) {
        testCases.push({
          id: 3,
          input: String(row.hidden_testcase_input || "").trim(),
          output: String(row.hidden_testcase_output || "").trim(),
          isHidden: true,
        });
      }

      return {
        id: `q_bulk_${Date.now()}_${idx}`,
        assessmentTitle: String(row.assessmentTitle || "").trim(),
        section: secName,
        title: String(row.title || `Question ${idx + 1}`).trim(),
        type: qType === "coding" ? "coding" : qType === "msq" ? "msq" : "mcq",
        marks,
        difficulty: row.difficulty || "Easy",
        options: qType !== "coding" ? options : undefined,
        testCases: qType === "coding" ? testCases : undefined,
        explanation: String(row.explanation || "").trim(),
        constraints: String(row.constraints || "").trim(),
        inputFormat: String(row.input_format || "").trim(),
        outputFormat: String(row.output_format || "").trim(),
        starterCode: String(row.starterCode || "").trim(),
      };
    },
    mapGroupedPayload: (grouped, indexOffset = 0) => {
      return grouped.map((group, gIdx) => {
        const secName = String(group.groupKey || `Section ${indexOffset + gIdx + 1}`).trim();
        const rows = group.rows || [];

        const questions = rows.map((r, qIdx) => {
          const qType = String(r.type || "mcq").toLowerCase().trim();
          const marks = Number(r.marks) || (qType === "coding" ? 10 : 2);
          const rawCorrect = String(r.correctOption || "A").trim().toUpperCase();
          const correctParts = rawCorrect.split(",").map((s) => s.trim());

          const options = [
            { id: 1, text: String(r.optionA || "Option A").trim(), isCorrect: correctParts.includes("A") || correctParts.includes("1") },
            { id: 2, text: String(r.optionB || "Option B").trim(), isCorrect: correctParts.includes("B") || correctParts.includes("2") },
            { id: 3, text: String(r.optionC || "Option C").trim(), isCorrect: correctParts.includes("C") || correctParts.includes("3") },
            { id: 4, text: String(r.optionD || "Option D").trim(), isCorrect: correctParts.includes("D") || correctParts.includes("4") },
          ];

          const testCases: any[] = [];
          if (r.testcase_1_input !== undefined || r.testcase_1_output !== undefined) {
            testCases.push({
              id: 1,
              input: String(r.testcase_1_input || "").trim(),
              output: String(r.testcase_1_output || "").trim(),
              isHidden: false,
            });
          }
          if (r.testcase_2_input !== undefined || r.testcase_2_output !== undefined) {
            testCases.push({
              id: 2,
              input: String(r.testcase_2_input || "").trim(),
              output: String(r.testcase_2_output || "").trim(),
              isHidden: false,
            });
          }
          if (r.hidden_testcase_input !== undefined || r.hidden_testcase_output !== undefined) {
            testCases.push({
              id: 3,
              input: String(r.hidden_testcase_input || "").trim(),
              output: String(r.hidden_testcase_output || "").trim(),
              isHidden: true,
            });
          }

          return {
            id: `q_bulk_${Date.now()}_${gIdx}_${qIdx}`,
            assessmentTitle: String(r.assessmentTitle || "").trim(),
            section: secName,
            title: String(r.title || `Question ${qIdx + 1}`).trim(),
            type: qType === "coding" ? "coding" : qType === "msq" ? "msq" : "mcq",
            marks,
            difficulty: r.difficulty || "Easy",
            options: qType !== "coding" ? options : undefined,
            testCases: qType === "coding" ? testCases : undefined,
            explanation: String(r.explanation || "").trim(),
            constraints: String(r.constraints || "").trim(),
            inputFormat: String(r.input_format || "").trim(),
            outputFormat: String(r.output_format || "").trim(),
            starterCode: String(r.starterCode || "").trim(),
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
    }
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
        label: "Correct Option (A/B/C/D)",
        type: "enum",
        required: true,
        options: ["A", "B", "C", "D"],
        description: "The correct answer key (A, B, C, or D)",
        sampleValue: "C",
      },
      {
        key: "explanation",
        label: "Explanation",
        type: "string",
        required: false,
        description: "Explanation shown after submission or review",
        sampleValue: "JavaScript numbers are all double-precision 64-bit binary format (Number type); Float is not a separate primitive.",
      },
      {
        key: "points",
        label: "Marks / Points",
        type: "number",
        required: false,
        defaultValue: 1,
        description: "Points awarded for answering correctly",
        sampleValue: 1,
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
        explanation: "In a balanced BST, tree height is log(n), making search O(log n).",
        points: 2
      },
      {
        questionText: "Which HTTP status code signifies 'Unauthorized'?",
        optionA: "400",
        optionB: "401",
        optionC: "403",
        optionD: "404",
        correctOption: "B",
        explanation: "401 represents Unauthorized (missing/invalid credentials).",
        points: 1
      }
    ],
    mapToPayload: (row, idx) => {
      const correctOpt = String(row.correctOption || "A").trim().toUpperCase();
      const correctIdx = correctOpt === "B" ? 1 : correctOpt === "C" ? 2 : correctOpt === "D" ? 3 : 0;
      const qText = String(row.questionText || "").trim();
      return {
        id: `quiz_q_${Date.now()}_${idx}`,
        questionText: qText,
        question: qText,
        title: `Question ${idx + 1}`,
        text: qText,
        type: "single",
        options: [
          { id: `opt_a_${idx}`, text: String(row.optionA || "").trim(), isCorrect: correctOpt === "A" },
          { id: `opt_b_${idx}`, text: String(row.optionB || "").trim(), isCorrect: correctOpt === "B" },
          { id: `opt_c_${idx}`, text: String(row.optionC || "").trim(), isCorrect: correctOpt === "C" },
          { id: `opt_d_${idx}`, text: String(row.optionD || "").trim(), isCorrect: correctOpt === "D" }
        ],
        correctOption: correctOpt,
        correctIndex: correctIdx,
        correctIndexes: [correctIdx],
        answer: correctOpt,
        explanation: String(row.explanation || "").trim(),
        points: Number(row.points) || 1,
        marks: Number(row.points) || 1,
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

  // ─── 5. CODING PROBLEMS REPOSITORY TEMPLATE ───────────────────────────────
  coding_problem: {
    moduleType: "coding_problem",
    displayName: "Coding Problems Repository Template",
    description: "Template for creating LeetCode-style algorithm & database coding challenges in bulk with test cases.",
    templateFileName: "coding_problems_template.xlsx",
    columns: [
      {
        key: "title",
        label: "Problem Title",
        type: "string",
        required: true,
        description: "Title of the coding challenge (e.g. 'Two Sum', 'Reverse Linked List')",
        sampleValue: "Two Sum",
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
        defaultValue: "Algorithms",
        description: "Topic domain (e.g. 'Algorithms', 'Data Structures', 'Databases', 'Dynamic Programming', 'Strings')",
        sampleValue: "Algorithms",
      },
      {
        key: "topic_tags",
        label: "Topic Tags (Comma-separated)",
        type: "string",
        required: false,
        description: "Comma-separated search tags (e.g. 'Array, Hash Table, Two Pointers')",
        sampleValue: "Array, Hash Table",
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
        sampleValue: "49.8%",
      },
      {
        key: "description",
        label: "Problem Statement (Markdown)",
        type: "string",
        required: true,
        description: "Detailed problem description, task instructions, and rules.",
        sampleValue: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      },
      {
        key: "constraints",
        label: "Constraints",
        type: "string",
        required: false,
        description: "Execution and boundary constraints (e.g. '2 <= nums.length <= 10^4')",
        sampleValue: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9",
      },
      {
        key: "input_format",
        label: "Input Format",
        type: "string",
        required: false,
        description: "Explanation of input structure received via standard input",
        sampleValue: "Line 1: Space-separated integers for nums.\nLine 2: target integer.",
      },
      {
        key: "output_format",
        label: "Output Format",
        type: "string",
        required: false,
        description: "Explanation of expected output printed to standard output",
        sampleValue: "Print the two 0-indexed positions separated by a space.",
      },
      {
        key: "sample_input",
        label: "Sample Input (Example 1)",
        type: "string",
        required: false,
        description: "Example input shown in problem overview",
        sampleValue: "2 7 11 15\n9",
      },
      {
        key: "sample_output",
        label: "Sample Output (Example 1)",
        type: "string",
        required: false,
        description: "Expected output for Example 1",
        sampleValue: "0 1",
      },
      {
        key: "sample_explanation",
        label: "Sample Explanation",
        type: "string",
        required: false,
        description: "Reasoning for Example 1",
        sampleValue: "Because nums[0] + nums[1] == 9, we return 0 1.",
      },
      {
        key: "testcase_1_input",
        label: "Test Case 1 Input",
        type: "string",
        required: false,
        description: "First public test case input for automated grader",
        sampleValue: "2 7 11 15\n9",
      },
      {
        key: "testcase_1_output",
        label: "Test Case 1 Expected Output",
        type: "string",
        required: false,
        description: "First public test case expected output",
        sampleValue: "0 1",
      },
      {
        key: "testcase_2_input",
        label: "Test Case 2 Input",
        type: "string",
        required: false,
        description: "Second public testcase input",
        sampleValue: "3 2 4\n6",
      },
      {
        key: "testcase_2_output",
        label: "Test Case 2 Expected Output",
        type: "string",
        required: false,
        description: "Second public testcase expected output",
        sampleValue: "1 2",
      },
      {
        key: "hidden_testcase_input",
        label: "Hidden Test Case Input",
        type: "string",
        required: false,
        description: "Private/Hidden test case to prevent hardcoding",
        sampleValue: "3 3\n6",
      },
      {
        key: "hidden_testcase_output",
        label: "Hidden Test Case Expected Output",
        type: "string",
        required: false,
        description: "Expected output for hidden test case",
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
      }
    ],
    sampleRows: [
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
        hidden_testcase_input: "3 3\n6",
        hidden_testcase_output: "0 1",
        time_limit_ms: 2000,
        memory_limit_mb: 256
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
        memory_limit_mb: 256
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
        memory_limit_mb: 256
      }
    ],
    mapToPayload: (row, idx) => {
      const rawTitle = String(row.title || `Coding Challenge ${idx + 1}`).trim();
      const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const diffRaw = String(row.difficulty || "Easy").toLowerCase().trim();
      const difficulty = (diffRaw === "hard" ? "hard" : diffRaw === "medium" ? "medium" : "easy") as "easy" | "medium" | "hard";
      
      const tags = row.topic_tags 
        ? String(row.topic_tags).split(",").map((s) => s.trim()).filter(Boolean)
        : ["Algorithms"];

      const testCases: any[] = [];
      const testCaseKeysSeen = new Set<string>();

      // 1. Dynamic scanner for numbered test cases (Test Case 1, 2, 3, 4, 5...)
      for (let i = 1; i <= 20; i++) {
        const inpVal = row[`testcase_${i}_input`] ?? row[`test_case_${i}_input`] ?? row[`input_${i}`] ?? row[`tc${i}_input`];
        const outVal = row[`testcase_${i}_output`] ?? row[`test_case_${i}_output`] ?? row[`output_${i}`] ?? row[`tc${i}_output`];
        
        if ((inpVal !== undefined && String(inpVal).trim() !== "") || (outVal !== undefined && String(outVal).trim() !== "")) {
          testCaseKeysSeen.add(`tc_${i}`);
          testCases.push({
            id: `tc-${Date.now()}-${i}-${idx}`,
            name: `Test Case ${i}`,
            input: String(inpVal ?? "").trim(),
            expected_output: String(outVal ?? "").trim(),
            is_hidden: false,
            is_enabled: true,
            weight: 10,
            order_index: testCases.length,
          });
        }
      }

      // 2. Sample input/output fallback as Test Case 1 if no public test cases were provided
      if (testCases.length === 0 && (row.sample_input || row.sample_output)) {
        testCases.push({
          id: `tc-${Date.now()}-1-${idx}`,
          name: "Test Case 1 (Sample)",
          input: String(row.sample_input ?? "").trim(),
          expected_output: String(row.sample_output ?? "").trim(),
          is_hidden: false,
          is_enabled: true,
          weight: 10,
          order_index: 0,
        });
      }

      // 3. Hidden Test Cases (Hidden 1, Hidden 2, etc.)
      for (let h = 1; h <= 10; h++) {
        const hInp = h === 1
          ? (row.hidden_testcase_input ?? row.hidden_input ?? row.hidden_test_case_1_input)
          : (row[`hidden_testcase_${h}_input`] ?? row[`hidden_input_${h}`]);
        const hOut = h === 1
          ? (row.hidden_testcase_output ?? row.hidden_output ?? row.hidden_test_case_1_output)
          : (row[`hidden_testcase_${h}_output`] ?? row[`hidden_output_${h}`]);

        if ((hInp !== undefined && String(hInp).trim() !== "") || (hOut !== undefined && String(hOut).trim() !== "")) {
          testCases.push({
            id: `tc-${Date.now()}-h${h}-${idx}`,
            name: `Hidden Case ${h}`,
            input: String(hInp ?? "").trim(),
            expected_output: String(hOut ?? "").trim(),
            is_hidden: true,
            is_enabled: true,
            weight: 20,
            order_index: testCases.length,
          });
        }
      }

      const exampleCases: any[] = [];
      if (row.sample_input || row.sample_output) {
        exampleCases.push({
          id: `example-${idx + 1}`,
          input: String(row.sample_input || ""),
          output: String(row.sample_output || ""),
          explanation: String(row.sample_explanation || ""),
        });
      }

      const templates = {
        python: `# Write your solution below\nimport sys\n\ndef solve():\n    lines = sys.stdin.read().splitlines()\n    if not lines:\n        return\n    # TODO: Implement solution\n\nif __name__ == '__main__':\n    solve()\n`,
        javascript: `// Write your solution below\nconst fs = require('fs');\n\nfunction solve() {\n  const input = fs.readFileSync(0, 'utf-8').trim();\n  if (!input) return;\n  // TODO: Implement solution\n}\n\nsolve();\n`,
        java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: Implement solution\n    }\n}\n`,
        cpp: `#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // TODO: Implement solution\n    return 0;\n}\n`
      };

      return {
        id: `problem-${slug}-${Date.now()}-${idx}`,
        title: rawTitle,
        slug,
        description: String(row.description || "").trim(),
        difficulty,
        category: String(row.category || "Algorithms").trim(),
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
        test_cases: testCases,
        time_limit_ms: Number(row.time_limit_ms) || 2000,
        memory_limit_mb: Number(row.memory_limit_mb) || 256,
        status: "published",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }
};

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

export function getTemplateConfig(moduleType: string): ModuleTemplateConfig {
  const normalized = (moduleType || "course").toLowerCase().trim();
  if (TEMPLATE_CONFIGS[normalized]) {
    return TEMPLATE_CONFIGS[normalized] as ModuleTemplateConfig;
  }
  // Aliases
  if (normalized === "courses" || normalized === "course_batch") return (TEMPLATE_CONFIGS.course_batch || TEMPLATE_CONFIGS.course) as ModuleTemplateConfig;
  if (normalized === "practices" || normalized === "practice_track" || normalized === "tracks") return (TEMPLATE_CONFIGS.practice_track || TEMPLATE_CONFIGS.practice) as ModuleTemplateConfig;
  if (normalized === "assessment_questions" || normalized === "assessment_question" || normalized === "test_questions" || normalized === "exam_questions") {
    return (TEMPLATE_CONFIGS.assessment_questions || TEMPLATE_CONFIGS.assessment) as ModuleTemplateConfig;
  }
  if (normalized === "assessments" || normalized === "assessment_track" || normalized === "tests") return (TEMPLATE_CONFIGS.assessment_track || TEMPLATE_CONFIGS.assessment) as ModuleTemplateConfig;
  if (normalized === "main_modules" || normalized === "units") return (TEMPLATE_CONFIGS.main_module || TEMPLATE_CONFIGS.course) as ModuleTemplateConfig;
  if (normalized === "coding" || normalized === "coding_problem" || normalized === "coding_problems" || normalized === "code_lab" || normalized === "codelab") {
    return (TEMPLATE_CONFIGS.coding_problem || Object.values(TEMPLATE_CONFIGS)[0]) as ModuleTemplateConfig;
  }
  
  return (TEMPLATE_CONFIGS.course || Object.values(TEMPLATE_CONFIGS)[0]) as ModuleTemplateConfig;
}

