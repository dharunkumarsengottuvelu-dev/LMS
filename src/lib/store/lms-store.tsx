"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CourseService } from "@/services/course.service";
import { AssessmentService, PracticeTrackItem } from "@/services/assessment.service";
import { BatchService } from "@/services/batch.service";
import { StudentService } from "@/services/student.service";
import { AssignmentService, type StudentSubmissionItem } from "@/services/assignment.service";
import { ModuleService, type ManagedModuleItem } from "@/services/module.service";
export type { StudentSubmissionItem, ManagedModuleItem };
import type { Course } from "@/types/course";
import type { Assessment, AssessmentAttempt } from "@/types/assessment";
import type { LMSBatch } from "@/types/batch";


export interface StudentUserRecord {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  batch?: string;
  department?: string;
  designation?: string;
  techTrack?: string;
  role: string;
  status: string;
  avgScore: number;
  mcqAccuracy?: number;
  codingAccuracy?: number;
  proctoringCompliance: number;
  violationCount: number;
  joinedDate: string;
  college?: string;
  course?: string;
  batchId?: string;
}

interface LMSContextType {
  courses: Course[];
  assessments: Assessment[];
  practiceTracks: PracticeTrackItem[];
  assignments: StudentSubmissionItem[];
  modules: ManagedModuleItem[];
  students: StudentUserRecord[];
  studentAttempts: AssessmentAttempt[];
  batches: LMSBatch[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  
  // Courses CRUD
  addCourse: (course: Course) => void;
  updateCoursesList: (courses: Course[]) => void;
  deleteCourse: (id: string) => void;

  // Assessments CRUD
  addAssessment: (assessment: Assessment) => void;
  updateAssessmentsList: (assessments: Assessment[]) => void;
  deleteAssessment: (id: string) => void;

  // Practice Tracks CRUD
  addPracticeTrack: (track: PracticeTrackItem) => void;
  updatePracticeTracks: (tracks: PracticeTrackItem[]) => void;
  deletePracticeTrack: (id: string) => void;

  // Assignments CRUD
  addSubmission: (sub: StudentSubmissionItem) => void;
  updateSubmissions: (subs: StudentSubmissionItem[]) => void;

  // Modules CRUD
  addModule: (mod: ManagedModuleItem) => void;
  updateModules: (mods: ManagedModuleItem[]) => void;

  // Students CRUD
  addStudent: (std: StudentUserRecord) => void;
  updateStudents: (stds: StudentUserRecord[]) => void;

  // Batches CRUD & Actions
  addBatch: (batchData: Omit<LMSBatch, "id" | "createdAt" | "studentIds">) => void;
  updateBatch: (id: string, updates: Partial<LMSBatch>) => void;
  deleteBatch: (id: string) => void;
  toggleBatchStatus: (id: string) => void;
  assignStudentToBatch: (studentId: string, batchId: string) => void;
  removeStudentFromBatch: (studentId: string, batchId: string) => void;
  transferStudentBatch: (studentId: string, fromBatchId: string, toBatchId: string) => void;

  recordAttempt: (attempt: AssessmentAttempt) => void;
}

const LMSContext = createContext<LMSContextType | undefined>(undefined);

const STORAGE_KEYS = {
  COURSES: "edunexus_courses_v2",
  ASSESSMENTS: "edunexus_assessments_v2",
  PRACTICE_TRACKS: "edunexus_practice_tracks_v2",
  ASSIGNMENTS: "edunexus_assignments_v2",
  MODULES: "edunexus_modules_v2",
  STUDENTS: "edunexus_students_v3",
  ATTEMPTS: "edunexus_attempts_v2",
  BATCHES: "edunexus_batches_v3",
};

const INITIAL_MOCK_BATCHES: LMSBatch[] = [];

export function LMSProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [practiceTracks, setPracticeTracks] = useState<PracticeTrackItem[]>([]);
  const [assignments, setAssignments] = useState<StudentSubmissionItem[]>([]);
  const [modules, setModules] = useState<ManagedModuleItem[]>([]);
  const [students, setStudents] = useState<StudentUserRecord[]>([]);
  const [studentAttempts, setStudentAttempts] = useState<AssessmentAttempt[]>([]);
  const [batches, setBatches] = useState<LMSBatch[]>(INITIAL_MOCK_BATCHES);

  const [isLoading, setIsLoading] = useState(false);

  // Synchronous initial hydration from localStorage for 0 latency
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const c = localStorage.getItem(STORAGE_KEYS.COURSES);
        if (c) setCourses(JSON.parse(c));

        const a = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
        if (a) setAssessments(JSON.parse(a));

        const p = localStorage.getItem(STORAGE_KEYS.PRACTICE_TRACKS);
        if (p) setPracticeTracks(JSON.parse(p));

        const sub = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
        if (sub) setAssignments(JSON.parse(sub));

        const m = localStorage.getItem(STORAGE_KEYS.MODULES);
        if (m) setModules(JSON.parse(m));

        const s = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        if (s) setStudents(JSON.parse(s));

        const att = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
        if (att) setStudentAttempts(JSON.parse(att));

        const b = localStorage.getItem(STORAGE_KEYS.BATCHES);
        if (b) setBatches(JSON.parse(b));
      } catch (e) {
        console.warn("Could not read LMS storage cache:", e);
      }
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const fetchedCourses = await CourseService.getCourses();
      const fetchedAssessments = await AssessmentService.getAssessments();
      const fetchedTracks = await AssessmentService.getPracticeTracks();
      const fetchedAttempts = await AssessmentService.getStudentAttempts();
      const fetchedBatches = await BatchService.getBatches();
      const fetchedStudents = await StudentService.getStudents();
      const fetchedAssignments = await AssignmentService.getSubmissions();
      const fetchedModules = await ModuleService.getModules();

      if (fetchedCourses.length > 0) {
        setCourses(fetchedCourses);
        localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(fetchedCourses));
      }
      if (fetchedAssessments.length > 0) {
        setAssessments(fetchedAssessments);
        localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(fetchedAssessments));
      }
      if (fetchedTracks.length > 0) {
        setPracticeTracks(fetchedTracks);
        localStorage.setItem(STORAGE_KEYS.PRACTICE_TRACKS, JSON.stringify(fetchedTracks));
      }
      if (fetchedAttempts.length > 0) {
        setStudentAttempts(fetchedAttempts);
        localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(fetchedAttempts));
      }
      if (fetchedBatches.length > 0) {
        setBatches(fetchedBatches);
        localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(fetchedBatches));
      }
      if (fetchedStudents.length > 0) {
        setStudents(fetchedStudents);
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(fetchedStudents));
      }
      if (fetchedAssignments.length > 0) {
        setAssignments(fetchedAssignments);
        localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(fetchedAssignments));
      }
      if (fetchedModules.length > 0) {
        setModules(fetchedModules);
        localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(fetchedModules));
      }
    } catch (error) {
      console.error("Failed to fetch data from Supabase", error);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Sync to localStorage helpers
  const saveKey = (key: string, val: any) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
        console.error("Failed saving key:", key, e);
      }
    }
  };

  // Courses Actions
  const addCourse = (newCourse: Course) => {
    setCourses((prev) => {
      const updated = [newCourse, ...prev.filter((c) => c.id !== newCourse.id)];
      saveKey(STORAGE_KEYS.COURSES, updated);
      return updated;
    });
  };

  const updateCoursesList = (newCourses: Course[]) => {
    setCourses(newCourses);
    saveKey(STORAGE_KEYS.COURSES, newCourses);
  };

  const deleteCourse = (id: string) => {
    setCourses((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveKey(STORAGE_KEYS.COURSES, updated);
      return updated;
    });
  };

  // Assessments Actions
  const addAssessment = (newAssessment: Assessment) => {
    setAssessments((prev) => {
      const updated = [newAssessment, ...prev.filter((a) => a.id !== newAssessment.id)];
      saveKey(STORAGE_KEYS.ASSESSMENTS, updated);
      return updated;
    });
  };

  const updateAssessmentsList = (newList: Assessment[]) => {
    setAssessments(newList);
    saveKey(STORAGE_KEYS.ASSESSMENTS, newList);
  };

  const deleteAssessment = (id: string) => {
    setAssessments((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveKey(STORAGE_KEYS.ASSESSMENTS, updated);
      return updated;
    });
  };

  // Practice Tracks Actions
  const addPracticeTrack = (track: PracticeTrackItem) => {
    setPracticeTracks((prev) => {
      const updated = [track, ...prev.filter((t) => t.id !== track.id)];
      saveKey(STORAGE_KEYS.PRACTICE_TRACKS, updated);
      return updated;
    });
  };

  const updatePracticeTracks = (newTracks: PracticeTrackItem[]) => {
    setPracticeTracks(newTracks);
    saveKey(STORAGE_KEYS.PRACTICE_TRACKS, newTracks);
    if (newTracks.length > 0 && newTracks[0]) {
      AssessmentService.upsertPracticeTrack(newTracks[0] as PracticeTrackItem); // Best-effort push for the most recently modified track
    }
  };

  const deletePracticeTrack = (id: string) => {
    setPracticeTracks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveKey(STORAGE_KEYS.PRACTICE_TRACKS, updated);
      return updated;
    });
  };

  // Assignments Actions
  const addSubmission = (sub: StudentSubmissionItem) => {
    setAssignments((prev) => {
      const updated = [sub, ...prev.filter((s) => s.id !== sub.id)];
      saveKey(STORAGE_KEYS.ASSIGNMENTS, updated);
      return updated;
    });
  };

  const updateSubmissions = (subs: StudentSubmissionItem[]) => {
    setAssignments(subs);
    saveKey(STORAGE_KEYS.ASSIGNMENTS, subs);
  };

  // Modules Actions
  const addModule = (mod: ManagedModuleItem) => {
    setModules((prev) => {
      const updated = [mod, ...prev.filter((m) => m.id !== mod.id)];
      saveKey(STORAGE_KEYS.MODULES, updated);
      return updated;
    });
  };

  const updateModules = (mods: ManagedModuleItem[]) => {
    setModules(mods);
    saveKey(STORAGE_KEYS.MODULES, mods);
    if (mods.length > 0 && mods[0]) {
      ModuleService.upsertModule(mods[0]);
    }
  };

  // Students Actions
  const addStudent = (std: StudentUserRecord) => {
    setStudents((prev) => {
      const updated = [std, ...prev.filter((s) => s.id !== std.id)];
      saveKey(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });
  };

  const updateStudents = (stds: StudentUserRecord[]) => {
    setStudents(stds);
    saveKey(STORAGE_KEYS.STUDENTS, stds);
  };

  // Batches Actions
  const addBatch = async (batchData: Omit<LMSBatch, "id" | "createdAt" | "studentIds">) => {
    const newDbBatch = await BatchService.createBatch(batchData);
    if (newDbBatch) {
      setBatches((prev) => {
        const updated = [newDbBatch, ...prev];
        saveKey(STORAGE_KEYS.BATCHES, updated);
        return updated;
      });
    } else {
      // Fallback
      setBatches((prev) => {
        const newBatch: LMSBatch = {
          ...batchData,
          id: `batch_${Date.now()}`,
          createdAt: new Date().toISOString().slice(0, 10),
          studentIds: [],
        };
        const updated = [newBatch, ...prev];
        saveKey(STORAGE_KEYS.BATCHES, updated);
        return updated;
      });
    }
  };

  const updateBatch = (id: string, updates: Partial<LMSBatch>) => {
    setBatches((prev) => {
      const updated = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      saveKey(STORAGE_KEYS.BATCHES, updated);
      return updated;
    });
  };

  const deleteBatch = (id: string) => {
    setBatches((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      saveKey(STORAGE_KEYS.BATCHES, updated);
      return updated;
    });
    setStudents((prev) => {
      const updated = prev.map((s) => (s.batchId === id ? { ...s, batchId: undefined, batch: "Not Assigned" } : s));
      saveKey(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });
  };

  const toggleBatchStatus = (id: string) => {
    setBatches((prev) => {
      const updated = prev.map((b) => (b.id === id ? { ...b, status: (b.status === "active" ? "inactive" : "active") as "active" | "inactive" } : b));
      saveKey(STORAGE_KEYS.BATCHES, updated);
      return updated;
    });
  };

  const assignStudentToBatch = (studentId: string, batchId: string) => {
    let targetBatchName = "";
    setBatches((prev) => {
      const updated = prev.map((b) => {
        const withoutStudent = b.studentIds.filter((sid) => sid !== studentId);
        if (b.id === batchId) {
          targetBatchName = b.batchName;
          return { ...b, studentIds: [...withoutStudent, studentId] };
        }
        return { ...b, studentIds: withoutStudent };
      });
      saveKey(STORAGE_KEYS.BATCHES, updated);
      return updated;
    });

    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            batchId,
            batch: targetBatchName || s.batch || "Not Assigned",
          };
        }
        return s;
      });
      saveKey(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });
  };

  const removeStudentFromBatch = (studentId: string, batchId: string) => {
    setBatches((prev) => {
      const updated = prev.map((b) => {
        if (b.id === batchId) {
          return { ...b, studentIds: b.studentIds.filter((sid) => sid !== studentId) };
        }
        return b;
      });
      saveKey(STORAGE_KEYS.BATCHES, updated);
      return updated;
    });

    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.id === studentId) {
          return { ...s, batchId: undefined, batch: "Not Assigned" };
        }
        return s;
      });
      saveKey(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });
  };

  const transferStudentBatch = (studentId: string, fromBatchId: string, toBatchId: string) => {
    assignStudentToBatch(studentId, toBatchId);
  };

  const recordAttempt = (attempt: AssessmentAttempt) => {
    setStudentAttempts((prev) => {
      const updated = [attempt, ...prev];
      saveKey(STORAGE_KEYS.ATTEMPTS, updated);
      return updated;
    });
  };

  return (
    <LMSContext.Provider
      value={{
        courses,
        assessments,
        practiceTracks,
        assignments,
        modules,
        students,
        studentAttempts,
        batches,
        isLoading,
        refreshData,
        addCourse,
        updateCoursesList,
        deleteCourse,
        addAssessment,
        updateAssessmentsList,
        deleteAssessment,
        addPracticeTrack,
        updatePracticeTracks,
        deletePracticeTrack,
        addSubmission,
        updateSubmissions,
        addModule,
        updateModules,
        addStudent,
        updateStudents,
        addBatch,
        updateBatch,
        deleteBatch,
        toggleBatchStatus,
        assignStudentToBatch,
        removeStudentFromBatch,
        transferStudentBatch,
        recordAttempt,
      }}
    >
      {children}
    </LMSContext.Provider>
  );
}


export function useLMSStore() {
  const context = useContext(LMSContext);
  if (!context) {
    throw new Error("useLMSStore must be used within an LMSProvider");
  }
  return context;
}
