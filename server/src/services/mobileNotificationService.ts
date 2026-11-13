import { env } from "../config/env";

type ClassroomNotificationType = "ANNOUNCEMENT" | "ASSIGNMENT" | "QUIZ";

export async function notifyMobileStudents(
  authorization: string | undefined,
  notification: { subjectId: string; type: ClassroomNotificationType; title: string },
): Promise<void> {
  if (!authorization) {
    console.error("[notifications] could not notify students: teacher authorization is unavailable");
    return;
  }

  try {
    const response = await fetch(new URL("/api/notifications/subjects", env.mobileApiUrl), {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notification),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`[notifications] mobile API returned HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("[notifications] failed to notify students through the mobile API", error);
  }
}
