import { request } from "../api/client";
import type { User } from "../types";

export interface TeacherLogin {
  token: string;
  user: User;
}

export function loginTeacher(email: FormDataEntryValue | null, password: FormDataEntryValue | null): Promise<TeacherLogin> {
  return request<TeacherLogin>("/api/auth/login", null, {
    method: "POST",
    body: { email, password },
  });
}

export function getCurrentTeacher(token: string): Promise<User> {
  return request<User>("/api/auth/me", token);
}

export function changeTeacherPassword(token: string, newPassword: string): Promise<void> {
  return request<void>("/api/auth/change-password", token, {
    method: "POST",
    body: { newPassword },
  });
}
