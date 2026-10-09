/**
 * ============================================================
 * AUTHORITATIVE PRACTICE TRACK PROGRESS SYSTEM
 * ============================================================
 * 
 * Production-grade, 100% dynamic, SUBMISSION-BASED progress calculation.
 * 
 * CORE RULES:
 * 1. ONLY A VALID SUBMISSION COUNTS AS ANSWERED.
 *    - DO NOT count opening, viewing, visiting, or navigating to questions.
 *    - DO NOT count typing code, editing text, or saving draft sessions.
 *    - DO NOT count clicking "Run" or running test cases.
 *    - ONLY an actual successful "Submit" action marks a question as answered.
 * 
 * 2. DUPLICATE-SAFE:
 *    - Submitting the same question multiple times counts as EXACTLY 1 answered question.
 *    - Uses Set<string> of unique question IDs.
 * 
 * 3. MODULE PROGRESS:
 *    - answeredQuestions / totalQuestions * 100 (rounded).
 * 
 * 4. OVERALL TRACK PROGRESS:
 *    - Question-weighted: totalAnsweredAcrossAllModules / totalQuestionsAcrossAllModules * 100.
 * 
 * 5. PERSISTENCE & SAFETY:
 *    - Survives page refreshes, reloads, and logins.
 *    - Safe against 0 total questions (returns 0%, never NaN/undefined).
 */

export interface ModuleProgressDetail {
  id: string;
  title: string;
  totalQuestions: number;
  completedQuestions: number;
  percentage: number;
  status: "not_started" | "in_progress" | "completed";
  isCompleted: boolean;
  isInProgress: boolean;
  isSubmitted: boolean;
  rawModule: any;
  resumeQuestionNumber: number;
  resumeQuestionLabel: string;
}

export interface PracticeTrackProgressResult {
  totalModules: number;
  completedModules: number;
  totalQuestions: number;
  completedQuestions: number;
  percentage: number;
  moduleDetails: ModuleProgressDetail[];
  nextSubModuleToContinue: any;
  hasActiveSession: boolean;
  hasSubmittedModule: boolean;
  resumeQuestionNumber: number;
  resumeQuestionLabel: string;
  resumeModuleTitle: string;
  formattedModuleCount: string;
  formattedModuleCompletion: string;
  // Aliases for 100% backward compatibility
  totalSubModulesCount: number;
  completedSubModulesCount: number;
  totalTrackQuestions: number;
  totalAnsweredQuestions: number;
  progressPercentage: number;
}

/**
 * 1. Calculates percentage for an individual module.
 * Formula: Math.round((answeredQuestions / totalQuestions) * 100)
 */
export function calculateModuleProgress(answeredQuestions: number, totalQuestions: number): number {
  if (!totalQuestions || totalQuestions <= 0) return 0;
  const answered = Math.max(0, answeredQuestions || 0);
  return Math.min(100, Math.max(0, Math.round((answered / totalQuestions) * 100)));
}

/**
 * 2. Calculates overall track progress percentage across all modules (Question-Weighted).
 * Formula: Math.round((totalAnsweredQuestions / totalTrackQuestions) * 100)
 */
export function calculateTrackProgressPercentage(
  totalAnsweredQuestions: number,
  totalTrackQuestions: number
): number {
  if (!totalTrackQuestions || totalTrackQuestions <= 0) return 0;
  const answered = Math.max(0, totalAnsweredQuestions || 0);
  return Math.min(100, Math.max(0, Math.round((answered / totalTrackQuestions) * 100)));
}

/**
 * 3. Counts the number of completed modules.
 * A module is completed ONLY when answeredQuestions === totalQuestions (and totalQuestions > 0).
 */
export function calculateCompletedModules(
  moduleDetails: { completedQuestions?: number; answeredQuestions?: number; totalQuestions: number }[]
): number {
  if (!Array.isArray(moduleDetails) || moduleDetails.length === 0) return 0;
  return moduleDetails.filter((m) => {
    const answered = typeof m.completedQuestions === "number" ? m.completedQuestions : m.answeredQuestions || 0;
    const total = m.totalQuestions || 0;
    return total > 0 && answered >= total;
  }).length;
}

/**
 * 4. Counts unique answered questions from a SUBMISSION dictionary or submitted attempt object.
 * Strictly duplicate-safe using a Set of unique question IDs.
 * ONLY counts valid submitted answers (non-empty strings/arrays or valid submitted code objects).
 */
export function calculateAnsweredQuestions(
  answersMap: Record<string, any> | undefined | null,
  maxAllowed?: number
): number {
  if (!answersMap || typeof answersMap !== "object") return 0;
  const uniqueAnsweredKeys = new Set<string>();

  Object.entries(answersMap).forEach(([k, v]) => {
    if (!v) return;
    if (Array.isArray(v) && v.length > 0) {
      uniqueAnsweredKeys.add(k);
    } else if (typeof v === "string" && v.trim().length > 0) {
      uniqueAnsweredKeys.add(k);
    } else if (typeof v === "object") {
      if ((v as any).status === "accepted" || (v as any).status === "passed" || (v as any).status === "SUBMITTED" || (v as any).status === "submitted") {
        uniqueAnsweredKeys.add(k);
      } else if ((v as any).code && typeof (v as any).code === "string" && (v as any).code.trim().length > 0 && (v as any).isSubmitted !== false) {
        uniqueAnsweredKeys.add(k);
      }
    }
  });

  const count = uniqueAnsweredKeys.size;
  return typeof maxAllowed === "number" && maxAllowed > 0 ? Math.min(maxAllowed, count) : count;
}

/**
 * 5. Formats module count with proper singular/plural grammar.
 * e.g., 1 -> "1 Module", 5 -> "5 Modules"
 */
export function formatModuleCount(count: number): string {
  const c = Math.max(0, count || 0);
  return `${c} ${c === 1 ? "Module" : "Modules"}`;
}

/**
 * 6. Formats module completion string.
 * e.g., "1 of 3 Modules Completed", "0 of 1 Module Completed"
 */
export function formatModuleCompletion(completed: number, total: number): string {
  const c = Math.max(0, completed || 0);
  const t = Math.max(0, total || 0);
  return `${c} of ${t} ${t === 1 ? "Module" : "Modules"} Completed`;
}

/**
 * 7. Normalizes total question count for any module structure.
 */
export function getModuleQuestionCount(module: any): number {
  if (!module) return 1;

  const directMcqs = module.mcqQuestions?.length || module.mcqs?.length || 0;
  const directCoding = module.codingQuestions?.length || module.codingProblems?.length || 0;
  const sectionMcqs = module.sections?.flatMap((s: any) => s.mcqQuestions || []).length || 0;
  const sectionCoding = module.sections?.flatMap((s: any) => s.codingQuestions || []).length || 0;

  const mcqsCount = Math.max(directMcqs, sectionMcqs);
  const codingCount = Math.max(
    directCoding,
    sectionCoding,
    (module.type === "coding" || module.problemDescription) && (mcqsCount + directCoding + sectionCoding === 0) ? 1 : 0
  );

  let totalCount = mcqsCount + codingCount;
  if (totalCount === 0) {
    totalCount = module.totalQuestions || module.questionCount || module.question_count || module.questions?.length || 1;
  }

  return Math.max(1, totalCount);
}

/**
 * 8. Calculates completed questions and exact resume question info for a specific module
 * by dynamically counting actual SUBMITTED questions from database and live client storage.
 * 
 * SUBMISSION-ONLY RULE:
 * - Opening, viewing, typing, or running code does NOT increase completedCount.
 * - Only verified submissions (completed assessment / accepted coding submit) increase completedCount.
 */
export function getModuleCompletedCount(
  module: any,
  totalQuestions: number,
  isMounted: boolean = true
): {
  completedCount: number;
  isDone: boolean;
  inProg: boolean;
  isSubmitted: boolean;
  resumeQuestionNumber: number;
  resumeQuestionLabel: string;
} {
  let completedCount = 0;
  let isDone = false;
  let inProg = false;
  let isSubmitted = module.status === "completed";
  let resumeQuestionNumber = 1;
  let resumeQuestionLabel = module.type === "coding" ? "Problem 1" : "Question 1";

  // 1. Initial count from database-supplied module object (authoritative database records)
  if (typeof module.completedQuestions === "number") {
    completedCount = Math.min(totalQuestions, Math.max(0, module.completedQuestions));
    if (completedCount >= totalQuestions && totalQuestions > 0) {
      isDone = true;
    } else if (completedCount > 0) {
      inProg = true;
      resumeQuestionNumber = Math.min(totalQuestions, completedCount + 1);
      resumeQuestionLabel = (module.type === "coding" ? "Problem " : "Question ") + resumeQuestionNumber;
    }
  }

  // 2. Check live client submission state & completed records (SUBMISSION-BASED ONLY)
  if (isMounted && typeof window !== "undefined") {
    try {
      const completedKey = `lms_completed_assessment_${module.id}`;
      const submittedKey = `lms_practice_session_${module.id}_submitted`;
      const sessionKey = `lms_practice_session_${module.id}`;

      const completedStr = localStorage.getItem(completedKey);
      const isLocallySubmitted = localStorage.getItem(submittedKey) === "true";

      // Case A: The module has been formally SUBMITTED by the student
      if (completedStr || isLocallySubmitted) {
        isSubmitted = true;
        let actualAnsweredCount = 0;

        if (completedStr) {
          try {
            const compObj = JSON.parse(completedStr);
            const ansMap = compObj.answers || {};
            actualAnsweredCount = calculateAnsweredQuestions(ansMap, totalQuestions);
          } catch {}
        }

        // If marked completed but answers map was serialized as summary, fallback to total questions
        if (completedStr && actualAnsweredCount === 0 && totalQuestions > 0) {
          actualAnsweredCount = totalQuestions;
        }

        completedCount = Math.min(totalQuestions, Math.max(completedCount, actualAnsweredCount));

        if (completedCount >= totalQuestions && totalQuestions > 0) {
          isDone = true;
          inProg = false;
          resumeQuestionNumber = totalQuestions;
          resumeQuestionLabel = "Finished";
        } else {
          isDone = false;
          inProg = completedCount > 0;
          resumeQuestionNumber = Math.min(totalQuestions, completedCount + 1);
          resumeQuestionLabel = (module.type === "coding" ? "Problem " : "Question ") + resumeQuestionNumber;
        }
      } else {
        // Only active session-scoped client drafts/navigation state should be read if unsubmitted
        const sessionStr = localStorage.getItem(sessionKey);
        const submittedQuestionIds = new Set<string>();

        // Check individually submitted coding problems in this session
        if (sessionStr) {
          try {
            const parsed = JSON.parse(sessionStr);

            // ONLY submissionResults (from clicking "Submit Solution", NOT "Run")
            Object.entries(parsed.submissionResults || {}).forEach(([k, v]: any) => {
              if (
                v &&
                (v.status === "accepted" ||
                  v.status === "passed" ||
                  v.status === "SUBMITTED" ||
                  v.status === "submitted" ||
                  (v.total_test_cases > 0 && v.passed_test_cases === v.total_test_cases))
              ) {
                submittedQuestionIds.add(k);
              }
            });

            // Track active navigation position for "Left off at" ONLY
            if (parsed.activeSection === "coding" && typeof parsed.codingIndex === "number") {
              resumeQuestionNumber = Math.min(totalQuestions, parsed.codingIndex + 1);
              resumeQuestionLabel = `Problem ${resumeQuestionNumber}`;
              inProg = true;
            } else if (parsed.activeSection === "mcq" && typeof parsed.mcqIndex === "number") {
              resumeQuestionNumber = Math.min(totalQuestions, parsed.mcqIndex + 1);
              resumeQuestionLabel = `Question ${resumeQuestionNumber}`;
              inProg = true;
            }
          } catch {}
        }

        // ONLY submitted question IDs increase completedCount
        const verifiedSubmittedCount = Math.min(totalQuestions, submittedQuestionIds.size);
        completedCount = Math.max(completedCount, verifiedSubmittedCount);

        if (completedCount > 0) {
          inProg = true;
        }

        if (completedCount >= totalQuestions && totalQuestions > 0) {
          isDone = true;
          inProg = false;
          resumeQuestionNumber = totalQuestions;
          resumeQuestionLabel = "Finished";
        }
      }
    } catch {}
  }

  // Strictly clamp completedCount between 0 and totalQuestions
  completedCount = Math.min(totalQuestions, Math.max(0, completedCount));
  if (completedCount >= totalQuestions && totalQuestions > 0) {
    isDone = true;
    inProg = false;
    resumeQuestionNumber = totalQuestions;
    resumeQuestionLabel = "Finished";
  }

  return {
    completedCount,
    isDone,
    inProg,
    isSubmitted,
    resumeQuestionNumber,
    resumeQuestionLabel,
  };
}

/**
 * 9. Universal dynamic overall Practice Track progress calculator.
 * Supports ANY number of modules (0, 1, 2, 3, 5, 10, 20+ modules).
 * Calculates strictly QUESTION-WEIGHTED overall progress across all modules.
 */
export function getPracticeTrackProgress(
  modulesOrTrack: any[] | any,
  isMounted: boolean = true
): PracticeTrackProgressResult {
  const modulesList: any[] = Array.isArray(modulesOrTrack)
    ? modulesOrTrack
    : modulesOrTrack?.subModules || modulesOrTrack?.sub_modules || [];

  const totalModules = modulesList.length;

  if (totalModules === 0) {
    return {
      totalModules: 0,
      completedModules: 0,
      totalQuestions: 0,
      completedQuestions: 0,
      percentage: 0,
      moduleDetails: [],
      nextSubModuleToContinue: null,
      hasActiveSession: false,
      hasSubmittedModule: false,
      resumeQuestionNumber: 1,
      resumeQuestionLabel: "Question 1",
      resumeModuleTitle: "",
      formattedModuleCount: formatModuleCount(0),
      formattedModuleCompletion: formatModuleCompletion(0, 0),
      totalSubModulesCount: 0,
      completedSubModulesCount: 0,
      totalTrackQuestions: 0,
      totalAnsweredQuestions: 0,
      progressPercentage: 0,
    };
  }

  let totalQuestions = 0;
  let completedQuestions = 0;
  let completedModules = 0;
  let nextSubModuleToContinue: any = null;
  let hasActiveSession = false;
  let hasSubmittedModule = false;

  const moduleDetails: ModuleProgressDetail[] = modulesList.map((m: any, idx: number) => {
    const modTotalQuestions = getModuleQuestionCount(m);
    const {
      completedCount,
      isDone,
      inProg,
      isSubmitted,
      resumeQuestionNumber,
      resumeQuestionLabel,
    } = getModuleCompletedCount(m, modTotalQuestions, isMounted);

    const modPercentage = calculateModuleProgress(completedCount, modTotalQuestions);

    totalQuestions += modTotalQuestions;
    completedQuestions += completedCount;

    if (modPercentage === 100) {
      completedModules++;
    } else {
      if (inProg) {
        hasActiveSession = true;
      }
      if (!nextSubModuleToContinue) {
        nextSubModuleToContinue = {
          ...m,
          subModuleIndex: idx + 1,
          isInProgress: inProg,
          isSubmitted,
          resumeQuestionNumber,
          resumeQuestionLabel,
        };
      }
    }

    if (isSubmitted) {
      hasSubmittedModule = true;
    }

    const status: "not_started" | "in_progress" | "completed" = modPercentage === 100
      ? "completed"
      : inProg || isSubmitted
      ? "in_progress"
      : "not_started";

    return {
      id: m.id || `mod_${idx}`,
      title: m.title || `Module ${idx + 1}`,
      totalQuestions: modTotalQuestions,
      completedQuestions: completedCount,
      percentage: modPercentage,
      status,
      isCompleted: modPercentage === 100,
      isInProgress: inProg,
      isSubmitted,
      rawModule: m,
      resumeQuestionNumber,
      resumeQuestionLabel,
    };
  });

  // Calculate overall track progress using total questions across ALL modules (question-weighted)
  const percentage = calculateTrackProgressPercentage(completedQuestions, totalQuestions);

  const activeModule = nextSubModuleToContinue || moduleDetails.find((m) => !m.isCompleted) || moduleDetails[0];
  const resumeQuestionLabel = percentage === 100
    ? "Finished"
    : activeModule?.resumeQuestionLabel || (activeModule?.rawModule?.type === "coding" ? "Problem 1" : "Question 1");
  const resumeQuestionNumber = activeModule?.resumeQuestionNumber || 1;
  const resumeModuleTitle = activeModule?.title || "";

  return {
    totalModules,
    completedModules,
    totalQuestions,
    completedQuestions,
    percentage,
    moduleDetails,
    nextSubModuleToContinue: activeModule || modulesList[0],
    hasActiveSession,
    hasSubmittedModule,
    resumeQuestionNumber,
    resumeQuestionLabel,
    resumeModuleTitle,
    formattedModuleCount: formatModuleCount(totalModules),
    formattedModuleCompletion: formatModuleCompletion(completedModules, totalModules),
    // Aliases for compatibility
    totalSubModulesCount: totalModules,
    completedSubModulesCount: completedModules,
    totalTrackQuestions: totalQuestions,
    totalAnsweredQuestions: completedQuestions,
    progressPercentage: percentage,
  };
}

/**
 * Backward compatibility aliases
 */
export const computeTrackProgress = getPracticeTrackProgress;
export const calculateTrackProgress = getPracticeTrackProgress;

// ══════════════════════════════════════════════════════════════════════════════
// AUTHORITATIVE QUESTION WEIGHTS, SCORING & HIERARCHY AGGREGATION SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 1. Calculates equal integer weights for questions with remainder distribution.
 * Formula: Base Marks = Math.floor(Total Marks / Number of Questions)
 * Any remainder (Total Marks - Base * Count) is allocated 1 mark each to the first questions.
 * Result sum exactly equals totalMarks!
 *
 * Example: 100 marks / 3 questions -> [34, 33, 33] (Sum = 100)
 * Example: 100 marks / 10 questions -> [10, 10, 10, ...] (Sum = 100)
 * Example: 50 marks / 10 questions -> [5, 5, 5, ...] (Sum = 50)
 * Example: 80 marks / 4 questions -> [20, 20, 20, 20] (Sum = 80)
 */
export function calculateEqualWeights(totalMarks: number, count: number): number[] {
  if (!count || count <= 0) return [];
  const tMarks = Math.max(0, Math.round(totalMarks || 0));
  if (tMarks === 0) return Array(count).fill(0);

  const baseMarks = Math.floor(tMarks / count);
  const remainder = tMarks - baseMarks * count;

  const weights: number[] = [];
  for (let i = 0; i < count; i++) {
    weights.push(i < remainder ? baseMarks + 1 : baseMarks);
  }
  return weights;
}

/**
 * 2. Resolves question maximum weight/score point from question definition.
 */
export function getQuestionWeight(question: any, fallbackWeight: number = 10): number {
  if (!question || typeof question !== "object") return fallbackWeight;
  const raw =
    question.marks !== undefined
      ? question.marks
      : question.weight !== undefined
      ? question.weight
      : question.points !== undefined
      ? question.points
      : question.score !== undefined
      ? question.score
      : undefined;

  if (typeof raw === "number" && !isNaN(raw) && raw >= 0) {
    return Math.round(raw);
  }
  if (typeof raw === "string" && raw.trim() !== "" && !isNaN(Number(raw))) {
    const parsed = Number(raw);
    if (parsed >= 0) return Math.round(parsed);
  }
  return fallbackWeight;
}

/**
 * 3. Calculates the sum of question weights.
 */
export function calculateQuestionWeightsSum(questions: any[]): number {
  if (!Array.isArray(questions) || questions.length === 0) return 0;
  return questions.reduce((acc, q) => acc + getQuestionWeight(q), 0);
}

/**
 * 4. Validates module total marks against question weights.
 */
export function validateModuleMarks(
  totalMarks: number,
  questions: any[],
  isDraft: boolean = false
): { isValid: boolean; sum: number; diff: number; message: string; errorMessage?: string } {
  const tMarks = Math.max(1, Math.round(totalMarks || 100));
  const sum = calculateQuestionWeightsSum(questions);
  const diff = tMarks - sum;

  if (!questions || questions.length === 0) {
    if (isDraft) {
      return {
        isValid: true,
        sum: 0,
        diff: tMarks,
        message: "Draft module: No questions added yet.",
      };
    }
    const msg = "Module must have at least one question to be active.";
    return {
      isValid: false,
      sum: 0,
      diff: tMarks,
      message: msg,
      errorMessage: msg,
    };
  }

  if (diff === 0) {
    return {
      isValid: true,
      sum,
      diff: 0,
      message: `Valid: Sum of question weights (${sum}) exactly matches Total Marks (${tMarks}).`,
    };
  }

  if (diff > 0) {
    const msg = `Sum of question weights (${sum}) is less than configured Total Marks (${tMarks}). Remaining: ${diff} marks needed.`;
    return {
      isValid: false,
      sum,
      diff,
      message: msg,
      errorMessage: msg,
    };
  }

  const msg = `Sum of question weights (${sum}) exceeds configured Total Marks (${tMarks}) by ${Math.abs(diff)} marks.`;
  return {
    isValid: false,
    sum,
    diff,
    message: msg,
    errorMessage: msg,
  };
}

/**
 * 5. Calculates aggregate total marks for a Submodule from its active child modules.
 */
export function calculateSubmoduleTotalMarks(submodule: any): number {
  if (!submodule) return 0;
  if (Array.isArray(submodule.modules) && submodule.modules.length > 0) {
    return submodule.modules
      .filter((m: any) => m.status !== "inactive")
      .reduce(
        (acc: number, m: any) =>
          acc +
          (typeof m.totalMarks === "number"
            ? m.totalMarks
            : typeof m.total_marks === "number"
            ? m.total_marks
            : 100),
        0
      );
  }
  return typeof submodule.totalMarks === "number"
    ? submodule.totalMarks
    : typeof submodule.total_marks === "number"
    ? submodule.total_marks
    : 0;
}

/**
 * 6. Calculates aggregate total marks for a Main Module across all its submodules.
 */
export function calculateMainModuleTotalMarks(mainModule: any): number {
  if (!mainModule) return 0;
  const submodules = Array.isArray(mainModule.submodules)
    ? mainModule.submodules
    : Array.isArray(mainModule.sub_modules)
    ? mainModule.sub_modules
    : Array.isArray(mainModule.subModules)
    ? mainModule.subModules
    : [];

  return submodules
    .filter((sm: any) => sm.status !== "inactive")
    .reduce((acc: number, sm: any) => acc + calculateSubmoduleTotalMarks(sm), 0);
}

/**
 * 7. Evaluates student answers against authoritative question weights.
 * Supports unequal weights, coding test case partial scoring, and pass/fail thresholds.
 */
export interface AnswerEvaluationResult {
  earnedMarks: number;
  maxMarks: number;
  percentage: number;
  passed: boolean;
  questionBreakdown: Record<
    string,
    {
      earned: number;
      max: number;
      status: "correct" | "partially_correct" | "incorrect" | "not_attempted";
      detail?: string;
    }
  >;
}

export function evaluateStudentAnswers(
  module: any,
  studentAnswers: Record<string, any>,
  options?: { submissionResults?: Record<string, any> }
): AnswerEvaluationResult {
  const mcqs = Array.isArray(module?.mcqQuestions)
    ? module.mcqQuestions
    : Array.isArray(module?.mcqs)
    ? module.mcqs
    : [];
  const coding = Array.isArray(module?.codingQuestions)
    ? module.codingQuestions
    : Array.isArray(module?.codingProblems)
    ? module.codingProblems
    : [];
  const allQuestions = [...mcqs, ...coding];

  let totalEarned = 0;
  let totalMax = 0;
  const breakdown: AnswerEvaluationResult["questionBreakdown"] = {};
  const subResults = options?.submissionResults || {};

  const defaultWeights =
    allQuestions.length > 0
      ? calculateEqualWeights(module?.totalMarks || 100, allQuestions.length)
      : [];

  // Evaluate MCQs
  mcqs.forEach((q: any, idx: number) => {
    const qId = String(q.id || `mcq_${idx}`);
    const qWeight =
      q.marks !== undefined ? getQuestionWeight(q) : defaultWeights[idx] || 10;
    totalMax += qWeight;

    const studentAns = studentAnswers?.[qId] ?? studentAnswers?.[q.id];
    let isCorrect = false;

    if (studentAns !== undefined && studentAns !== null) {
      const studentAnsArray: string[] = Array.isArray(studentAns)
        ? studentAns.map(String)
        : typeof studentAns === "object" && studentAns.answer !== undefined
        ? Array.isArray(studentAns.answer)
          ? studentAns.answer.map(String)
          : [String(studentAns.answer)]
        : [String(studentAns)];

      const correctOpts = (q.options || []).filter(
        (o: any) => o.isCorrect || o.correct
      );
      const correctIds = correctOpts.map((o: any) => String(o.id));
      const correctTexts = correctOpts.map((o: any) =>
        String(o.text || "").trim().toLowerCase()
      );

      isCorrect =
        correctOpts.length > 0 &&
        studentAnsArray.length > 0 &&
        studentAnsArray.length === correctOpts.length &&
        studentAnsArray.every((ans) => {
          const trimmedAns = ans.trim().toLowerCase();
          return correctIds.includes(ans) || correctTexts.includes(trimmedAns);
        });
    }

    const earned = isCorrect ? qWeight : 0;
    totalEarned += earned;

    breakdown[qId] = {
      earned,
      max: qWeight,
      status:
        studentAns === undefined || studentAns === null
          ? "not_attempted"
          : isCorrect
          ? "correct"
          : "incorrect",
    };
  });

  // Evaluate Coding Questions
  coding.forEach((cp: any, idx: number) => {
    const cpId = String(cp.id || `coding_${idx}`);
    const cpWeight =
      cp.points !== undefined ||
      cp.marks !== undefined ||
      cp.weight !== undefined
        ? getQuestionWeight(cp)
        : defaultWeights[mcqs.length + idx] || 100;
    totalMax += cpWeight;

    const studentAns = studentAnswers?.[cpId] ?? studentAnswers?.[cp.id];
    const sub =
      subResults?.[cpId] ??
      subResults?.[cp.id] ??
      (typeof studentAns === "object" ? studentAns : null);

    let earned = 0;
    let status:
      | "correct"
      | "partially_correct"
      | "incorrect"
      | "not_attempted" = "not_attempted";
    let detail = "";

    const hasCode =
      studentAns &&
      ((typeof studentAns === "string" && studentAns.trim().length > 0) ||
        (typeof studentAns === "object" &&
          studentAns.code &&
          studentAns.code.trim().length > 0));

    if (sub && typeof sub === "object") {
      const isAccepted =
        sub.status === "accepted" ||
        sub.status === "passed" ||
        sub.status === "solved";
      const totalTc =
        typeof sub.total_test_cases === "number"
          ? sub.total_test_cases
          : typeof sub.totalTestCases === "number"
          ? sub.totalTestCases
          : typeof sub.totalCount === "number"
          ? sub.totalCount
          : 0;
      const passedTc =
        typeof sub.passed_test_cases === "number"
          ? sub.passed_test_cases
          : typeof sub.passedTestCases === "number"
          ? sub.passedTestCases
          : typeof sub.passedCount === "number"
          ? sub.passedCount
          : typeof sub.solvedCount === "number"
          ? sub.solvedCount
          : 0;

      const scorePct =
        typeof sub.scorePercentage === "number"
          ? sub.scorePercentage
          : typeof sub.score_percentage === "number"
          ? sub.score_percentage
          : typeof sub.percentage === "number"
          ? sub.percentage
          : null;

      if (isAccepted || (totalTc > 0 && passedTc === totalTc) || scorePct === 100) {
        earned = cpWeight;
        status = "correct";
        detail = totalTc > 0 ? "All test cases passed" : "Solved successfully";
      } else if (totalTc > 0 && passedTc > 0) {
        earned = Math.round(cpWeight * (passedTc / totalTc));
        status = "partially_correct";
        detail = `${passedTc}/${totalTc} test cases passed`;
      } else if (scorePct !== null && scorePct > 0) {
        earned = Math.round(cpWeight * (scorePct / 100));
        status = "partially_correct";
        detail = `${scorePct}% test cases passed`;
      } else if (hasCode || totalTc > 0 || sub.status) {
        earned = 0;
        status = "incorrect";
        detail = totalTc > 0 ? `0/${totalTc} test cases passed` : "Failed test cases";
      }
    } else if (
      studentAns &&
      typeof studentAns === "object" &&
      studentAns.status === "solved"
    ) {
      earned = cpWeight;
      status = "correct";
      detail = "Marked solved";
    } else if (hasCode) {
      status = "incorrect";
      detail = "Attempted but not passed";
    }

    totalEarned += earned;
    breakdown[cpId] = {
      earned,
      max: cpWeight,
      status,
      detail,
    };
  });

  const finalMax =
    totalMax > 0
      ? totalMax
      : typeof module?.totalMarks === "number"
      ? module.totalMarks
      : 100;
  const percentage =
    finalMax > 0
      ? Math.min(100, Math.max(0, Math.round((totalEarned / finalMax) * 100)))
      : 0;
  const passingMarks =
    typeof module?.passingMarks === "number"
      ? module.passingMarks
      : typeof module?.passing_marks === "number"
      ? module.passing_marks
      : 40;
  const passed = totalEarned >= passingMarks;

  return {
    earnedMarks: totalEarned,
    maxMarks: finalMax,
    percentage,
    passed,
    questionBreakdown: breakdown,
  };
}
