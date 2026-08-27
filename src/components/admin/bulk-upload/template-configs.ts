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
  mapToPayload: (row: Record<string, any>, index: number) => any;
}

export const TEMPLATE_CONFIGS: Record<string, ModuleTemplateConfig> = {
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
    columns: [
      {
        key: "title",
        label: "Practice Item Title",
        type: "string",
        required: true,
        description: "Title of the practice session or challenge",
        sampleValue: "Dynamic Programming - Longest Common Subsequence",
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
        defaultValue: 100,
        description: "Maximum score or points for completion",
        sampleValue: 100,
      },
      {
        key: "difficulty",
        label: "Difficulty Level",
        type: "enum",
        required: false,
        options: ["Easy", "Medium", "Hard"],
        defaultValue: "Medium",
        description: "Challenge difficulty rating",
        sampleValue: "Medium",
      },
      {
        key: "description",
        label: "Problem Description",
        type: "string",
        required: false,
        description: "Problem prompt, instructions, and constraints",
        sampleValue: "Given two strings text1 and text2, return the length of their longest common subsequence.",
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
      {
        title: "Two Sum Problem",
        type: "coding",
        durationMinutes: 45,
        totalMarks: 50,
        difficulty: "Easy",
        description: "Find two numbers in array that add up to target.",
        restrictCopyPaste: "No",
        enforceFullScreen: "No"
      },
      {
        title: "Database Indexing & ACID Concept Quiz",
        type: "mcq",
        durationMinutes: 30,
        totalMarks: 30,
        difficulty: "Medium",
        description: "Multiple choice questionnaire testing SQL internals.",
        restrictCopyPaste: "Yes",
        enforceFullScreen: "Yes"
      }
    ],
    mapToPayload: (row, idx) => ({
      id: `sm_${Date.now()}_${idx}`,
      title: String(row.title || "").trim(),
      type: (row.type || "coding").toLowerCase(),
      durationMinutes: Number(row.durationMinutes) || 60,
      totalMarks: Number(row.totalMarks) || 100,
      questionCount: 1,
      restrictCopyPaste: isTruthy(row.restrictCopyPaste),
      enforceFullScreen: isTruthy(row.enforceFullScreen),
      sections: [
        {
          id: `sec_${Date.now()}_${idx}`,
          title: "Section 1",
          mcqQuestions: [],
          codingQuestions: row.type === "coding" || row.type === "mixed" ? [{
            id: `cq_${Date.now()}_${idx}`,
            title: String(row.title || "").trim(),
            description: String(row.description || "").trim(),
            difficulty: row.difficulty || "Medium",
            publicTestCases: [],
            hiddenTestCases: []
          }] : []
        }
      ]
    })
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
    mapToPayload: (row, idx) => ({
      id: `quiz_q_${Date.now()}_${idx}`,
      questionText: String(row.questionText || "").trim(),
      options: [
        { id: `opt_a_${idx}`, text: String(row.optionA || "").trim(), isCorrect: String(row.correctOption).toUpperCase() === "A" },
        { id: `opt_b_${idx}`, text: String(row.optionB || "").trim(), isCorrect: String(row.correctOption).toUpperCase() === "B" },
        { id: `opt_c_${idx}`, text: String(row.optionC || "").trim(), isCorrect: String(row.correctOption).toUpperCase() === "C" },
        { id: `opt_d_${idx}`, text: String(row.optionD || "").trim(), isCorrect: String(row.correctOption).toUpperCase() === "D" }
      ],
      explanation: String(row.explanation || "").trim(),
      points: Number(row.points) || 1
    })
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

/**
 * Returns the template config for a given module type, falling back to 'course' if undefined.
 */
export function getTemplateConfig(moduleType: string): ModuleTemplateConfig {
  const normalized = (moduleType || "course").toLowerCase();
  return (TEMPLATE_CONFIGS[normalized] || TEMPLATE_CONFIGS.course) as ModuleTemplateConfig;
}
