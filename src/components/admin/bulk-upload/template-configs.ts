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

      // Test Case 1
      if (row.testcase_1_input !== undefined && row.testcase_1_input !== "" || row.testcase_1_output !== undefined && row.testcase_1_output !== "") {
        testCases.push({
          id: `tc-${Date.now()}-1-${idx}`,
          name: "Test Case 1",
          input: String(row.testcase_1_input ?? ""),
          expected_output: String(row.testcase_1_output ?? ""),
          is_hidden: false,
          is_enabled: true,
          weight: 10,
          order_index: 0,
        });
      } else if (row.sample_input !== undefined && row.sample_input !== "" || row.sample_output !== undefined && row.sample_output !== "") {
        testCases.push({
          id: `tc-${Date.now()}-1-${idx}`,
          name: "Test Case 1",
          input: String(row.sample_input ?? ""),
          expected_output: String(row.sample_output ?? ""),
          is_hidden: false,
          is_enabled: true,
          weight: 10,
          order_index: 0,
        });
      }

      // Test Case 2
      if (row.testcase_2_input !== undefined && row.testcase_2_input !== "" || row.testcase_2_output !== undefined && row.testcase_2_output !== "") {
        testCases.push({
          id: `tc-${Date.now()}-2-${idx}`,
          name: "Test Case 2",
          input: String(row.testcase_2_input ?? ""),
          expected_output: String(row.testcase_2_output ?? ""),
          is_hidden: false,
          is_enabled: true,
          weight: 10,
          order_index: 1,
        });
      }

      // Hidden Test Case
      if (row.hidden_testcase_input !== undefined && row.hidden_testcase_input !== "" || row.hidden_testcase_output !== undefined && row.hidden_testcase_output !== "") {
        testCases.push({
          id: `tc-${Date.now()}-h-${idx}`,
          name: "Hidden Case 1",
          input: String(row.hidden_testcase_input ?? ""),
          expected_output: String(row.hidden_testcase_output ?? ""),
          is_hidden: true,
          is_enabled: true,
          weight: 20,
          order_index: 2,
        });
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
  if (normalized === "assessments" || normalized === "assessment_track" || normalized === "tests") return (TEMPLATE_CONFIGS.assessment_track || TEMPLATE_CONFIGS.assessment) as ModuleTemplateConfig;
  if (normalized === "main_modules" || normalized === "units") return (TEMPLATE_CONFIGS.main_module || TEMPLATE_CONFIGS.course) as ModuleTemplateConfig;
  if (normalized === "coding" || normalized === "coding_problem" || normalized === "coding_problems" || normalized === "code_lab" || normalized === "codelab") {
    return (TEMPLATE_CONFIGS.coding_problem || Object.values(TEMPLATE_CONFIGS)[0]) as ModuleTemplateConfig;
  }
  
  return (TEMPLATE_CONFIGS.course || Object.values(TEMPLATE_CONFIGS)[0]) as ModuleTemplateConfig;
}

