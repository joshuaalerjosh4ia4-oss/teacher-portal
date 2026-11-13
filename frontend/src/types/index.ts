export interface User {
  id: string;
  username: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  mustChangePassword: boolean;
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  units: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CourseSection {
  id: string;
  code: string;
  course: string;
  yearLevel: number;
  semester: string;
  subjects: Subject[];
}

export interface ScheduledRoom {
  id: string;
  passcode: string;
  startsAt: string;
  endsAt: string;
  subject: {
    id: string;
    code: string;
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    section: { course: string; code: string };
  };
}

export type ClassroomPostType = "ANNOUNCEMENT" | "ASSIGNMENT";
export type ClassroomView = "STREAM" | "CLASSWORK";

export interface ClassroomPostAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface ClassroomPost {
  id: string;
  type: ClassroomPostType;
  title: string;
  content: string;
  dueAt: string | null;
  createdAt: string;
  subject: {
    id: string;
    code: string;
    title: string;
    section: { course: string; code: string };
  };
  attachments: ClassroomPostAttachment[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctOption: number;
  position: number;
}

export interface QuizSubmission {
  id: string;
  studentName: string;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  createdAt: string;
}

export interface QuizItem {
  id: string;
  shareCode: string;
  title: string;
  description: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  subject: {
    id: string;
    code: string;
    title: string;
    section: { course: string; code: string };
  };
  questions: QuizQuestion[];
  submissions: QuizSubmission[];
}

export interface QuizDraftQuestion {
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  prompt: string;
  options: string[];
  correctOption: number;
}

export interface PublicQuiz {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  subject: {
    title: string;
    code: string;
    section: { course: string; code: string };
  };
  questions: Array<{ id: string; prompt: string; options: string[]; position: number }>;
}

export interface QuizGrade {
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  percentage: number;
}

export interface GeneratedQuizzes {
  generatedCount: number;
  subjectsUpdated: number;
  skippedSubjects: Array<{ code: string; title: string }>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
}
