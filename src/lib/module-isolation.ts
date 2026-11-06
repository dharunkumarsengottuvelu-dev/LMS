/**
 * Module Isolation Helper for Sensilearn LMS
 * Enforces strict separation between Practice, Tests, Assessments, and Challenges.
 * Rule: What is created in one module must NEVER appear in another module.
 */

/**
 * Extract all unique IDs belonging to Practice Tracks, Submodules, and Modules.
 */
export function extractPracticeIds(tracks: any[]): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(tracks)) return set;

  for (const t of tracks) {
    if (t?.id) set.add(String(t.id));

    let subModules = t?.sub_modules || t?.subModules || [];
    if (!Array.isArray(subModules) && t?.tags && t?.tags[0]) {
      try {
        const parsed = typeof t.tags[0] === "string" ? JSON.parse(t.tags[0]) : t.tags[0];
        subModules = parsed.subModules || parsed.sub_modules || [];
      } catch {}
    }

    if (Array.isArray(subModules)) {
      for (const sm of subModules) {
        if (sm?.id) set.add(String(sm.id));
        const childModules = sm?.modules || [];
        if (Array.isArray(childModules)) {
          for (const m of childModules) {
            if (m?.id) set.add(String(m.id));
          }
        }
      }
    }
  }

  return set;
}

/**
 * Determine whether a row from `assessments` table was created as a practice module
 * placeholder or practice-related item.
 */
export function isPracticeAssessment(assessment: any, practiceIdSet?: Set<string>): boolean {
  if (!assessment) return false;

  const id = String(assessment.id || "");
  if (practiceIdSet && practiceIdSet.has(id)) {
    return true;
  }

  let meta: any = {};
  if (assessment.tags && assessment.tags[0]) {
    try {
      meta = typeof assessment.tags[0] === "string" ? JSON.parse(assessment.tags[0]) : assessment.tags[0];
    } catch {}
  }

  // Explicit module tag indicating practice
  if (
    meta.source_module === "practice" ||
    meta.module === "practice" ||
    meta.isPractice === true ||
    meta.trackId ||
    meta.submoduleId ||
    meta.mainModuleId
  ) {
    return true;
  }

  // Description patterns used by practice auto-sync / placeholders
  const desc = String(assessment.description || "").toLowerCase().trim();
  if (
    desc === "practice module assessment" ||
    desc === "auto-synced practice module placeholder" ||
    desc === "practice module" ||
    desc.includes("practice module placeholder") ||
    desc.includes("auto-synced practice")
  ) {
    return true;
  }

  // Title patterns used by practice placeholders
  const title = String(assessment.title || "").toLowerCase().trim();
  if (title.startsWith("practice assessment ") || title.startsWith("practice module ")) {
    return true;
  }

  return false;
}

/**
 * Determine whether an assessment record is an authentic Test created in the Tests module.
 */
export function isAuthenticTest(assessment: any, practiceIdSet?: Set<string>): boolean {
  if (!assessment) return false;
  if (isPracticeAssessment(assessment, practiceIdSet)) return false;

  let meta: any = {};
  if (assessment.tags && assessment.tags[0]) {
    try {
      meta = typeof assessment.tags[0] === "string" ? JSON.parse(assessment.tags[0]) : assessment.tags[0];
    } catch {}
  }

  // If explicitly tagged as test
  if (meta.source_module === "test" || meta.module === "test") {
    return true;
  }

  // If it has test-specific configuration (proctoring, sections, schedule, or questions)
  if (
    meta.scheduleMode !== undefined ||
    meta.proctoringFlags !== undefined ||
    meta.secWebcam !== undefined ||
    meta.secFullscreen !== undefined ||
    (Array.isArray(meta.questions) && meta.questions.length > 0) ||
    (Array.isArray(meta.sections) && meta.sections.length > 0)
  ) {
    return true;
  }

  return false;
}

