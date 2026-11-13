import { request } from "../api/client";
import type { ClassroomPost, CourseSection, QuizItem, ScheduledRoom } from "../types";

export interface TeacherWorkspaceData {
  sections: CourseSection[];
  rooms: ScheduledRoom[];
  classroomPosts: ClassroomPost[];
  quizzes: QuizItem[];
}

export async function loadTeacherWorkspace(token: string): Promise<TeacherWorkspaceData> {
  const [sections, rooms, classroomPosts, quizzes] = await Promise.all([
    request<CourseSection[]>("/api/admissions/sections", token),
    request<ScheduledRoom[]>("/api/rooms", token),
    request<ClassroomPost[]>("/api/classroom/posts", token),
    request<QuizItem[]>("/api/quizzes", token),
  ]);
  return { sections, rooms, classroomPosts, quizzes };
}
