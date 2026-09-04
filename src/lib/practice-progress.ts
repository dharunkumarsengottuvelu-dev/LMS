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
