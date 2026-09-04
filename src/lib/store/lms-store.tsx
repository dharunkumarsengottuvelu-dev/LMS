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
  addCourse: (course: Course) => Promise<void>;
  updateCoursesList: (courses: Course[]) => void;
  deleteCourse: (id: string) => Promise<void>;

  // Assessments CRUD
  addAssessment: (assessment: Assessment) => Promise<void>;
  updateAssessmentsList: (assessments: Assessment[]) => void;
  deleteAssessment: (id: string) => Promise<void>;

  // Practice Tracks CRUD
  addPracticeTrack: (track: PracticeTrackItem) => Promise<void>;
  updatePracticeTracks: (tracks: PracticeTrackItem[]) => Promise<void>;
  deletePracticeTrack: (id: string) => Promise<void>;

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
  addBatch: (batchData: Omit<LMSBatch, "id" | "createdAt" | "studentIds">) => Promise<void>;
  updateBatch: (id: string, updates: Partial<LMSBatch>) => void;
  deleteBatch: (id: string) => Promise<void>;
  toggleBatchStatus: (id: string) => void;
  assignStudentToBatch: (studentId: string, batchId: string) => Promise<void>;
  removeStudentFromBatch: (studentId: string, batchId: string) => Promise<void>;
  transferStudentBatch: (studentId: string, fromBatchId: string, toBatchId: string) => Promise<void>;

  recordAttempt: (attempt: AssessmentAttempt) => void;
}

const LMSContext = createContext<LMSContextType | undefined>(undefined);

export function LMSProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [practiceTracks, setPracticeTracks] = useState<PracticeTrackItem[]>([]);
  const [assignments, setAssignments] = useState<StudentSubmissionItem[]>([]);
  const [modules, setModules] = useState<ManagedModuleItem[]>([]);
  const [students, setStudents] = useState<StudentUserRecord[]>([]);
  const [studentAttempts, setStudentAttempts] = useState<AssessmentAttempt[]>([]);
  const [batches, setBatches] = useState<LMSBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        fetchedCourses,
        fetchedAssessments,
        fetchedTracks,
        fetchedAttempts,
        fetchedBatches,
        fetchedStudents,
        fetchedAssignments,
        fetchedModules,
      ] = await Promise.all([
        CourseService.getCourses(),
        AssessmentService.getAssessments(),
        AssessmentService.getPracticeTracks(),
        AssessmentService.getStudentAttempts(),
        BatchService.getBatches(),
        StudentService.getStudents(),
        AssignmentService.getSubmissions(),
        ModuleService.getModules(),
      ]);

      setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
      setAssessments(Array.isArray(fetchedAssessments) ? fetchedAssessments : []);
      setPracticeTracks(Array.isArray(fetchedTracks) ? fetchedTracks : []);
      setStudentAttempts(Array.isArray(fetchedAttempts) ? fetchedAttempts : []);
      setBatches(Array.isArray(fetchedBatches) ? fetchedBatches : []);
      setStudents(Array.isArray(fetchedStudents) ? fetchedStudents : []);
      setAssignments(Array.isArray(fetchedAssignments) ? fetchedAssignments : []);
      setModules(Array.isArray(fetchedModules) ? fetchedModules : []);
    } catch (error) {
      console.error("Failed to fetch data from Supabase", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Courses Actions (Database Backed)
  const addCourse = async (newCourse: Course) => {
    setCourses((prev) => [newCourse, ...prev.filter((c) => c.id !== newCourse.id)]);
    try {
      await CourseService.createCourse({
        title: newCourse.title,
        description: newCourse.description,
        category_id: (newCourse as any).category_id || (newCourse as any).category || "",
        difficulty: newCourse.difficulty as any,
        visibility: newCourse.visibility as any,
      });
      await refreshData();
    } catch (e) {
      console.error("Error creating course:", e);
    }
  };

  const updateCoursesList = (newCourses: Course[]) => {
    setCourses(newCourses);
  };

  const deleteCourse = async (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    try {
      await CourseService.deleteCourse(id);
      await refreshData();
    } catch (e) {
      console.error("Error deleting course:", e);
    }
  };

  // Assessments Actions (Database Backed)
  const addAssessment = async (newAssessment: Assessment) => {
    setAssessments((prev) => [newAssessment, ...prev.filter((a) => a.id !== newAssessment.id)]);
    try {
      await AssessmentService.createAssessment({
        title: newAssessment.title,
        description: newAssessment.description || "",
        type: newAssessment.type,
        duration_minutes: newAssessment.duration_minutes,
        passing_marks: newAssessment.passing_marks,
      });
      await refreshData();
    } catch (e) {
      console.error("Error creating assessment:", e);
    }
  };

  const updateAssessmentsList = (newList: Assessment[]) => {
    setAssessments(newList);
  };

  const deleteAssessment = async (id: string) => {
    setAssessments((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/admin/tests?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshData();
    } catch (e) {
      console.error("Error deleting assessment:", e);
    }
  };

  // Practice Tracks Actions (Database Backed)
  const addPracticeTrack = async (track: PracticeTrackItem) => {
    setPracticeTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
    try {
      await AssessmentService.upsertPracticeTrack(track);
      await refreshData();
    } catch (e) {
      console.error("Error adding practice track:", e);
    }
  };

  const updatePracticeTracks = async (newTracks: PracticeTrackItem[]) => {
    setPracticeTracks(newTracks);
    if (newTracks.length > 0 && newTracks[0]) {
      try {
        await AssessmentService.upsertPracticeTrack(newTracks[0]);
        await refreshData();
      } catch (e) {
        console.error("Error updating practice track:", e);
      }
    }
  };

  const deletePracticeTrack = async (id: string) => {
    setPracticeTracks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/admin/practices?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshData();
    } catch (e) {
      console.error("Error deleting practice track:", e);
    }
  };

  // Assignments Actions (Database Backed)
  const addSubmission = (sub: StudentSubmissionItem) => {
    setAssignments((prev) => [sub, ...prev.filter((s) => s.id !== sub.id)]);
  };

  const updateSubmissions = (subs: StudentSubmissionItem[]) => {
    setAssignments(subs);
  };

  // Modules Actions (Database Backed)
  const addModule = (mod: ManagedModuleItem) => {
    setModules((prev) => [mod, ...prev.filter((m) => m.id !== mod.id)]);
  };

  const updateModules = (mods: ManagedModuleItem[]) => {
    setModules(mods);
    if (mods.length > 0 && mods[0]) {
      ModuleService.upsertModule(mods[0]);
    }
  };

  // Students Actions (Database Backed)
  const addStudent = (std: StudentUserRecord) => {
    setStudents((prev) => [std, ...prev.filter((s) => s.id !== std.id)]);
  };

  const updateStudents = (stds: StudentUserRecord[]) => {
    setStudents(stds);
  };

  // Batches Actions (Database Backed)
  const addBatch = async (batchData: Omit<LMSBatch, "id" | "createdAt" | "studentIds">) => {
    try {
      const newDbBatch = await BatchService.createBatch(batchData);
      if (newDbBatch) {
        setBatches((prev) => [newDbBatch, ...prev]);
        await refreshData();
      }
    } catch (e) {
      console.error("Error adding batch:", e);
    }
  };

  const updateBatch = (id: string, updates: Partial<LMSBatch>) => {
    setBatches((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBatch = async (id: string) => {
    setBatches((prev) => prev.filter((b) => b.id !== id));
    try {
      await BatchService.deleteBatch(id);
      await refreshData();
    } catch (e) {
      console.error("Error deleting batch:", e);
    }
  };

  const toggleBatchStatus = (id: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: (b.status === "active" ? "inactive" : "active") as "active" | "inactive" } : b))
    );
  };

  const assignStudentToBatch = async (studentId: string, batchId: string) => {
    try {
      await BatchService.assignStudent(batchId, studentId);
      await refreshData();
    } catch (e) {
      console.error("Error assigning student to batch:", e);
    }
  };

  const removeStudentFromBatch = async (studentId: string, batchId: string) => {
    try {
      await BatchService.removeStudent(batchId, studentId);
      await refreshData();
    } catch (e) {
      console.error("Error removing student from batch:", e);
    }
  };

  const transferStudentBatch = async (studentId: string, fromBatchId: string, toBatchId: string) => {
    await assignStudentToBatch(studentId, toBatchId);
  };

  const recordAttempt = (attempt: AssessmentAttempt) => {
    setStudentAttempts((prev) => [attempt, ...prev]);
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
