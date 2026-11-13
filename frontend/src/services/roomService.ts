import { request } from "../api/client";
import type { ScheduledRoom } from "../types";

export function createScheduledRoom(token: string, subjectId: string): Promise<ScheduledRoom> {
  return request<ScheduledRoom>("/api/rooms", token, {
    method: "POST",
    body: { subjectId },
  });
}

export function deleteScheduledRoom(token: string, roomId: string): Promise<{ deleted: true }> {
  return request<{ deleted: true }>(`/api/rooms/${encodeURIComponent(roomId)}`, token, { method: "DELETE" });
}
