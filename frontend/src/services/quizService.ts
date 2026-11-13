import { request } from "../api/client";
import type { GeneratedQuizzes, QuizDraftQuestion, QuizItem } from "../types";

export interface SaveQuizInput {
  subjectId: string;
  title: string;
  description: string;
  dueAt: string;
  questions: Array<Pick<QuizDraftQuestion, "prompt" | "options" | "correctOption">>;
}

export function listTeacherQuizzes(token: string): Promise<QuizItem[]> {
  return request<QuizItem[]>("/api/quizzes", token);
}

export function saveQuiz(token: string, quizId: string | null, input: SaveQuizInput): Promise<QuizItem> {
  return request<QuizItem>(
    quizId ? `/api/quizzes/${encodeURIComponent(quizId)}` : "/api/quizzes",
    token,
    { method: quizId ? "PUT" : "POST", body: input },
  );
}

export function generateSubjectQuizzes(token: string, dueAt: string): Promise<GeneratedQuizzes> {
  return request<GeneratedQuizzes>("/api/quizzes/generate", token, {
    method: "POST",
    body: { dueAt },
  });
}

export function deleteQuiz(token: string, quizId: string): Promise<{ deleted: true }> {
  return request<{ deleted: true }>(`/api/quizzes/${encodeURIComponent(quizId)}`, token, { method: "DELETE" });
}
