"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CourseService } from "@/services/course.service";
import { AssessmentService } from "@/services/assessment.service";
import type { Course } from "@/types/course";
import type { Assessment, AssessmentAttempt } from "@/types/assessment";

interface LMSContextType {
  courses: Course[];
  assessments: Assessment[];
  studentAttempts: AssessmentAttempt[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  addCourse: (course: Course) => void;
  addAssessment: (assessment: Assessment) => void;
  recordAttempt: (attempt: AssessmentAttempt) => void;
}

const LMSContext = createContext<LMSContextType | undefined>(undefined);

export function LMSProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [studentAttempts, setStudentAttempts] = useState<AssessmentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const fetchedCourses = await CourseService.getCourses();
      const fetchedAssessments = await AssessmentService.getAssessments();
      const fetchedAttempts = await AssessmentService.getStudentAttempts();

      setCourses(fetchedCourses);
      setAssessments(fetchedAssessments);
      setStudentAttempts(fetchedAttempts);
    } catch (err) {
      console.error("Error refreshing LMS store:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addCourse = (newCourse: Course) => {
    setCourses(prev => [newCourse, ...prev]);
  };

  const addAssessment = (newAssessment: Assessment) => {
    setAssessments(prev => [newAssessment, ...prev]);
  };

  const recordAttempt = (attempt: AssessmentAttempt) => {
    setStudentAttempts(prev => [attempt, ...prev]);
  };

  return (
    <LMSContext.Provider
      value={{
        courses,
        assessments,
        studentAttempts,
        isLoading,
        refreshData,
        addCourse,
        addAssessment,
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
