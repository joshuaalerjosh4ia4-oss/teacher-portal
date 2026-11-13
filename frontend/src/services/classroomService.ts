import { API_BASE_URL, PortalError, request } from "../api/client";
import type { ApiError, ClassroomPost } from "../types";

export function createClassroomPost(token: string, body: FormData): Promise<ClassroomPost> {
  return request<ClassroomPost>("/api/classroom/posts", token, { method: "POST", body });
}

export async function downloadClassroomAttachment(token: string, attachmentId: string): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/classroom/attachments/${encodeURIComponent(attachmentId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as ApiError | null;
    throw new PortalError(result?.message ?? "Could not download the attachment.", response.status);
  }
  return response.blob();
}
