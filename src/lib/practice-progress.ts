/**
 * Authoritative Practice Track Progress Calculation System
 * Dynamic question-weighted aggregation across any number of modules (1, 2, 3, 5, 10, 20+ modules).
 * Accurately merges database submission records and live student practice session answers.
 * Provides exact resume question tracking ("Continue from Problem X / Question X").
 *
 * Formula:
 *   overallCompletedQuestions = SUM(completedQuestions of every module)
 *   overallTotalQuestions = SUM(totalQuestions of every module)
 *   percentage = overallTotalQuestions === 0 ? 0 : Math.min(100, Math.max(0, Math.round((overallCompletedQuestions / overallTotalQuestions) * 100)))
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
  totalSubModulesCount: number;
  completedSubModulesCount: number;
  totalTrackQuestions: number;
  totalAnsweredQuestions: number;
  progressPercentage: number;
}

/**
 * Normalizes question counts for any module structure
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
 * Calculates completed questions and exact resume question info for a specific module
 * by dynamically counting actual answered questions from database and live client storage.
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

  // 1. Initial count from database-supplied module object
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

  // 2. Check live client practice session state & completed records
  if (isMounted && typeof window !== "undefined") {
    try {
      const completedKey = `lms_completed_assessment_${module.id}`;
      const submittedKey = `lms_practice_session_${module.id}_submitted`;
      const sessionKey = `lms_practice_session_${module.id}`;

      const completedStr = localStorage.getItem(completedKey);
      const isLocallySubmitted = localStorage.getItem(submittedKey) === "true";

      if (completedStr || isLocallySubmitted) {
        isSubmitted = true;
        let actualAnsweredCount = 0;

        if (completedStr) {
          try {
            const compObj = JSON.parse(completedStr);
            const ansMap = compObj.answers || {};
            const answeredKeys = new Set<string>();

            Object.entries(ansMap).forEach(([k, v]) => {
              if (!v) return;
              if (Array.isArray(v) && v.length > 0) answeredKeys.add(k);
              else if (typeof v === "string" && v.trim().length > 0) answeredKeys.add(k);
              else if (typeof v === "object" && (v as any).code && (v as any).code.trim().length > 0) answeredKeys.add(k);
            });

            actualAnsweredCount = answeredKeys.size;
          } catch {}
        }

        completedCount = Math.min(totalQuestions, actualAnsweredCount);

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
        const sessionStr = localStorage.getItem(sessionKey);
        if (sessionStr) {
          const parsed = JSON.parse(sessionStr);
          const answeredKeys = new Set<string>();

          // Count answered MCQs
          Object.entries(parsed.answers || {}).forEach(([k, v]) => {
            if (!v) return;
            if (Array.isArray(v) && v.length > 0) answeredKeys.add(k);
            else if (typeof v === "string" && v.trim().length > 0) answeredKeys.add(k);
            else if (typeof v === "object" && (v as any).code && (v as any).code.trim().length > 0) answeredKeys.add(k);
          });

          // Count written coding answers
          Object.entries(parsed.codeAnswers || {}).forEach(([k, v]: any) => {
            if (v && v.code && v.code.trim().length > 0) answeredKeys.add(k);
          });

          // Count submitted coding problems
          Object.entries(parsed.submissionResults || {}).forEach(([k, v]: any) => {
            if (v && (v.status === "accepted" || v.status === "passed" || v.test_cases_passed > 0)) {
              answeredKeys.add(k);
            }
          });

          const localAnswered = Math.min(totalQuestions, answeredKeys.size);
          if (localAnswered > 0 || typeof parsed.codingIndex === "number" || typeof parsed.mcqIndex === "number") {
            inProg = true;
            completedCount = Math.max(completedCount, localAnswered);

            // Determine where the user actually left off in this session
            if (parsed.activeSection === "coding" && typeof parsed.codingIndex === "number") {
              resumeQuestionNumber = Math.min(totalQuestions, parsed.codingIndex + 1);
              resumeQuestionLabel = `Problem ${resumeQuestionNumber}`;
            } else if (parsed.activeSection === "mcq" && typeof parsed.mcqIndex === "number") {
              resumeQuestionNumber = Math.min(totalQuestions, parsed.mcqIndex + 1);
              resumeQuestionLabel = `Question ${resumeQuestionNumber}`;
            } else {
              resumeQuestionNumber = Math.min(totalQuestions, completedCount + 1);
              resumeQuestionLabel = (module.type === "coding" ? "Problem " : "Question ") + resumeQuestionNumber;
            }
          }
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
 * Universal dynamic overall Practice Track progress calculator.
 * Supports 0, 1, 2, 3, 5, 10, 20+ modules.
 * Weights accurately by actual questions across all modules.
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

    const modPercentage = modTotalQuestions > 0
      ? Math.min(100, Math.max(0, Math.round((completedCount / modTotalQuestions) * 100)))
      : isDone
      ? 100
      : 0;

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

  // Calculate overall track progress using total questions across ALL modules
  const rawPercentage = totalQuestions === 0
    ? 0
    : Math.round((completedQuestions / totalQuestions) * 100);

  const percentage = Math.min(100, Math.max(0, rawPercentage));

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
    // Aliases for compatibility
    totalSubModulesCount: totalModules,
    completedSubModulesCount: completedModules,
    totalTrackQuestions: totalQuestions,
    totalAnsweredQuestions: completedQuestions,
    progressPercentage: percentage,
  };
}

/**
 * Backward compatibility wrapper
 */
export const computeTrackProgress = getPracticeTrackProgress;
