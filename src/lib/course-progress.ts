/**
 * ============================================================
 * AUTHORITATIVE STUDENT COURSE PROGRESS SYSTEM
 * ============================================================
 * 
 * Production-grade, 100% dynamic, LEARNING-UNIT-BASED progress calculation.
 * 
 * CORE RULES:
 * 1. ONLY ACTUAL COMPLETION MARKS A LESSON / VIDEO AS COMPLETED.
 *    - DO NOT count merely opening, viewing, or visiting the lesson.
 *    - Videos must reach completion threshold (e.g. ended / >= 90% watched).
 *    - Quizzes must be submitted.
 *    - Coding / Reading tasks must be explicitly completed.
 * 
 * 2. DUPLICATE-SAFE & ID-BASED:
 *    - Watching the same video multiple times counts as EXACTLY 1 completed unit.
 *    - Uses Set<string> of unique lesson IDs.
 * 
 * 3. DYNAMIC HIERARCHICAL FORMULA:
 *    - Module Progress: completedLessonsInModule / totalLessonsInModule * 100
 *    - Course Progress: totalCompletedAcrossAllModules / totalLessonsAcrossAllModules * 100
 * 
 * 4. TAB FILTERING RULES:
 *    - All Courses: All assigned courses.
 *    - In Progress: completedLearningUnits > 0 && completedLearningUnits < totalLearningUnits
 *    - Completed: completedLearningUnits === totalLearningUnits && totalLearningUnits > 0
 * 
 * 5. PERSISTENCE & MULTI-TAB SYNCHRONIZATION:
 *    - Syncs to localStorage and broadcasts real-time events.
 *    - Asynchronously updates backend Supabase enrollments.
 *    - Survives page refreshes and reloads.
 */

export interface CourseLessonItem {
  id: string;
  title: string;
  duration: string;
  type: "video" | "reading" | "quiz" | "coding";
  videoUrl?: string;
  notes?: string;
  isCompleted: boolean;
  moduleId: string;
  moduleTitle: string;
}

export interface CourseModuleItem {
  id: string;
  title: string;
  description?: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  isCompleted: boolean;
  isInProgress: boolean;
  lessons: CourseLessonItem[];
}

export interface CourseProgressResult {
  courseId: string;
  slug: string;
  totalLearningUnits: number;
  completedLearningUnits: number;
  progressPercentage: number;
  status: "not_started" | "in_progress" | "completed";
  isCompleted: boolean;
  isInProgress: boolean;
  isNotStarted: boolean;
  totalModulesCount: number;
  completedModulesCount: number;
  modules: CourseModuleItem[];
  completedLessonIds: string[];
  nextLessonToResume: CourseLessonItem | null;
  formattedLessonCount: string;
  formattedCompletion: string;
  // Aliases for 100% backward compatibility
  totalLessons: number;
  completedLessons: number;
  progress: number;
}

import { useState, useEffect } from "react";

const STORAGE_PREFIX = "lms_course_progress_";
export const COURSE_PROGRESS_EVENT = "lms_course_progress_updated";

/**
 * React hook to listen for course progress updates across components and browser tabs safely.
 */
export function useCourseProgressVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setVersion((v) => v + 1);
    };

    window.addEventListener(COURSE_PROGRESS_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(COURSE_PROGRESS_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return version;
}

/**
 * 1. Safe percentage calculation clamped strictly to [0, 100].
 */
export function calculateCourseProgressPercentage(
  completedUnits: number,
  totalUnits: number
): number {
  if (!totalUnits || totalUnits <= 0) return 0;
  const completed = Math.max(0, completedUnits || 0);
  return Math.min(100, Math.max(0, Math.round((completed / totalUnits) * 100)));
}

/**
 * 2. Helper to get stored completed lesson IDs from localStorage.
 */
export function getStoredCompletedLessonIds(courseIdOrSlug: string): string[] {
  if (typeof window === "undefined" || !courseIdOrSlug) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${courseIdOrSlug}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.completedLessonIds)) return parsed.completedLessonIds;
    return [];
  } catch {
    return [];
  }
}

/**
 * 3. Normalizes course raw modules and extracts flat lessons list.
 */
export function normalizeCourseStructure(course: any): {
  normalizedModules: CourseModuleItem[];
  allLessons: CourseLessonItem[];
} {
  if (!course) return { normalizedModules: [], allLessons: [] };

  const rawModules = course.modules || [];
  if (!Array.isArray(rawModules) || rawModules.length === 0) {
    return { normalizedModules: [], allLessons: [] };
  }

  const normalizedModules: CourseModuleItem[] = [];
  const allLessons: CourseLessonItem[] = [];

  rawModules.forEach((m: any, mIdx: number) => {
    const modId = m.id ? String(m.id) : `mod_${mIdx + 1}`;
    const modTitle = m.title || `Module ${mIdx + 1}`;
    const modDesc = m.description || "";

    const rawLessons = m.subModules || m.lessons || [];
    const moduleLessons: CourseLessonItem[] = [];

    if (Array.isArray(rawLessons) && rawLessons.length > 0) {
      rawLessons.forEach((sub: any, sIdx: number) => {
        const lessonId = sub.id ? String(sub.id) : `sub_${mIdx + 1}_${sIdx + 1}`;
        let lType: "video" | "reading" | "quiz" | "coding" = "video";
        if (sub.type === "quiz") lType = "quiz";
        else if (sub.type === "coding") lType = "coding";
        else if (sub.type === "reading") lType = "reading";
        else lType = "video";

        const lessonItem: CourseLessonItem = {
          id: lessonId,
          title: sub.title || `Lesson ${mIdx + 1}.${sIdx + 1}`,
          duration: sub.duration ? (typeof sub.duration === "number" ? `${sub.duration} mins` : String(sub.duration)) : "45 mins",
          type: lType,
          videoUrl: sub.videoUrl || sub.video_url || "",
          notes: sub.notes || sub.description || "",
          isCompleted: false,
          moduleId: modId,
          moduleTitle: modTitle,
        };

        moduleLessons.push(lessonItem);
        allLessons.push(lessonItem);
      });
    } else if (m.type || m.videoUrl || m.video_url || m.duration || m.notes) {
      // Single legacy module treated as 1 lesson
      const lessonItem: CourseLessonItem = {
        id: `sub_${mIdx + 1}_1`,
        title: modTitle,
        duration: m.duration || "45 mins",
        type: m.type || "video",
        videoUrl: m.videoUrl || m.video_url || "",
        notes: m.notes || "",
        isCompleted: false,
        moduleId: modId,
        moduleTitle: modTitle,
      };
      moduleLessons.push(lessonItem);
      allLessons.push(lessonItem);
    }

    normalizedModules.push({
      id: modId,
      title: modTitle,
      description: modDesc,
      totalLessons: moduleLessons.length,
      completedLessons: 0,
      percentage: 0,
      isCompleted: false,
      isInProgress: false,
      lessons: moduleLessons,
    });
  });

  return { normalizedModules, allLessons };
}

/**
 * 4. Primary, Authoritative Progress Computer for any Course object.
 * Reusable across Course Listing, Detail Player, Dashboard, and Reports.
 */
export function computeCourseProgress(
  course: any,
  isClientMounted: boolean = false
): CourseProgressResult {
  if (!course) {
    return {
      courseId: "",
      slug: "",
      totalLearningUnits: 0,
      completedLearningUnits: 0,
      progressPercentage: 0,
      status: "not_started",
      isCompleted: false,
      isInProgress: false,
      isNotStarted: true,
      totalModulesCount: 0,
      completedModulesCount: 0,
      modules: [],
      completedLessonIds: [],
      nextLessonToResume: null,
      formattedLessonCount: "0 of 0 lessons",
      formattedCompletion: "0%",
      totalLessons: 0,
      completedLessons: 0,
      progress: 0,
    };
  }

  const courseId = String(course.id || course.slug || "");
  const slug = String(course.slug || course.id || "");

  // 1. Gather all stored completed lesson IDs
  const completedIdsSet = new Set<string>();

  if (isClientMounted && typeof window !== "undefined") {
    const fromId = getStoredCompletedLessonIds(courseId);
    fromId.forEach((id) => completedIdsSet.add(id));

    if (slug && slug !== courseId) {
      const fromSlug = getStoredCompletedLessonIds(slug);
      fromSlug.forEach((id) => completedIdsSet.add(id));
    }

    if (course.title) {
      const fromTitle = getStoredCompletedLessonIds(course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      fromTitle.forEach((id) => completedIdsSet.add(id));
    }
  }

  // Also include any pre-attached completedLessonIds from course payload
  if (Array.isArray(course.completedLessonIds)) {
    course.completedLessonIds.forEach((id: string) => completedIdsSet.add(String(id)));
  }

  // 2. Normalize curriculum structure
  const { normalizedModules, allLessons } = normalizeCourseStructure(course);

  let totalLearningUnits = allLessons.length;
  if (totalLearningUnits === 0 && typeof course.totalLessons === "number" && course.totalLessons > 0) {
    totalLearningUnits = course.totalLessons;
  }

  // 3. Mark individual lessons completed and calculate module statistics
  let completedUnitsCount = 0;
  let nextLessonToResume: CourseLessonItem | null = null;

  const processedModules: CourseModuleItem[] = normalizedModules.map((mod, mIdx) => {
    let modCompletedCount = 0;
    const processedLessons: CourseLessonItem[] = mod.lessons.map((les, sIdx) => {
      const isCompleted =
        completedIdsSet.has(les.id) ||
        completedIdsSet.has(`sub_${mIdx + 1}_${sIdx + 1}`) ||
        completedIdsSet.has(`sub_mod_${mIdx + 1}_${sIdx + 1}`) ||
        completedIdsSet.has(`sub_${mod.id}_${sIdx + 1}`) ||
        completedIdsSet.has(les.title);

      if (isCompleted) {
        modCompletedCount++;
        completedUnitsCount++;
      } else if (!nextLessonToResume) {
        nextLessonToResume = { ...les, isCompleted: false };
      }
      return { ...les, isCompleted };
    });

    const modTotal = processedLessons.length;
    const modPercentage = calculateCourseProgressPercentage(modCompletedCount, modTotal);
    const modIsCompleted = modTotal > 0 && modCompletedCount === modTotal;
    const modIsInProgress = modCompletedCount > 0 && modCompletedCount < modTotal;

    return {
      ...mod,
      totalLessons: modTotal,
      completedLessons: modCompletedCount,
      percentage: modPercentage,
      isCompleted: modIsCompleted,
      isInProgress: modIsInProgress,
      lessons: processedLessons,
    };
  });

  // Fallback: If no local completed lesson IDs matched but server/payload provided existing progress
  if (totalLearningUnits > 0 && completedUnitsCount === 0) {
    const rawProgress =
      typeof course.progress === "number"
        ? course.progress
        : typeof course.progress_percentage === "number"
        ? course.progress_percentage
        : typeof course.progressPercentage === "number"
        ? course.progressPercentage
        : 0;

    if (rawProgress > 0) {
      completedUnitsCount = Math.min(
        totalLearningUnits,
        Math.max(1, Math.round((rawProgress / 100) * totalLearningUnits))
      );
    }
  }

  const completedLearningUnits = Math.min(totalLearningUnits, Math.max(0, completedUnitsCount));
  const progressPercentage = calculateCourseProgressPercentage(completedLearningUnits, totalLearningUnits);

  const isCompleted = totalLearningUnits > 0 && completedLearningUnits === totalLearningUnits;
  const isInProgress = completedLearningUnits > 0 && completedLearningUnits < totalLearningUnits;
  const isNotStarted = completedLearningUnits === 0;

  const status: "not_started" | "in_progress" | "completed" = isCompleted
    ? "completed"
    : isInProgress
    ? "in_progress"
    : "not_started";

  const completedModulesCount = processedModules.filter((m) => m.isCompleted).length;

  if (!nextLessonToResume && allLessons.length > 0) {
    nextLessonToResume = allLessons[0] || null;
  }

  const formattedLessonCount = `${completedLearningUnits} of ${totalLearningUnits} lessons`;
  const formattedCompletion = `${progressPercentage}%`;

  return {
    courseId,
    slug,
    totalLearningUnits,
    completedLearningUnits,
    progressPercentage,
    status,
    isCompleted,
    isInProgress,
    isNotStarted,
    totalModulesCount: processedModules.length,
    completedModulesCount,
    modules: processedModules,
    completedLessonIds: Array.from(completedIdsSet),
    nextLessonToResume,
    formattedLessonCount,
    formattedCompletion,
    totalLessons: totalLearningUnits,
    completedLessons: completedLearningUnits,
    progress: progressPercentage,
  };
}

/**
 * 5. Marks a specific lesson/video as completed persistently.
 * Broadcasts cross-tab and cross-component updates and syncs with backend database.
 */
export async function markLessonCompleted(
  courseIdOrSlug: string,
  lessonId: string,
  courseObject?: any
): Promise<CourseProgressResult> {
  if (typeof window === "undefined" || !courseIdOrSlug || !lessonId) {
    return computeCourseProgress(courseObject, false);
  }

  try {
    const existingIds = new Set<string>(getStoredCompletedLessonIds(courseIdOrSlug));
    existingIds.add(String(lessonId));

    const updatedIdsArray = Array.from(existingIds);
    const storagePayload = {
      courseId: courseIdOrSlug,
      completedLessonIds: updatedIdsArray,
      lastCompletedLessonId: lessonId,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`${STORAGE_PREFIX}${courseIdOrSlug}`, JSON.stringify(storagePayload));

    // Also store by course slug if available
    if (courseObject?.slug && courseObject.slug !== courseIdOrSlug) {
      localStorage.setItem(`${STORAGE_PREFIX}${courseObject.slug}`, JSON.stringify(storagePayload));
    }
    if (courseObject?.id && courseObject.id !== courseIdOrSlug) {
      localStorage.setItem(`${STORAGE_PREFIX}${courseObject.id}`, JSON.stringify(storagePayload));
    }

    // Compute new overall progress result
    const updatedProgress = computeCourseProgress(
      { ...(courseObject || {}), completedLessonIds: updatedIdsArray },
      true
    );

    // Broadcast event for all open components & pages
    window.dispatchEvent(
      new CustomEvent(COURSE_PROGRESS_EVENT, {
        detail: {
          courseId: courseIdOrSlug,
          lessonId,
          progress: updatedProgress,
        },
      })
    );

    // Asynchronously update backend Supabase enrollment
    try {
      fetch(`/api/student/courses/${encodeURIComponent(courseIdOrSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressPercentage: updatedProgress.progressPercentage,
          status: updatedProgress.status,
          completedLessonIds: updatedIdsArray,
        }),
      }).catch((err) => {
        console.warn("Backend course progress sync failed:", err);
      });
    } catch {}

    return updatedProgress;
  } catch (err) {
    console.error("markLessonCompleted error:", err);
    return computeCourseProgress(courseObject, true);
  }
}
