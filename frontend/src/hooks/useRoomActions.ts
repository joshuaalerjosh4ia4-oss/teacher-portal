import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { createScheduledRoom, deleteScheduledRoom } from "../services/roomService";
import { formatSubjectTime } from "../utils/date";
import type { ScheduledRoom } from "../types";

interface UseRoomActionsOptions {
  token: string | null;
  setRooms: Dispatch<SetStateAction<ScheduledRoom[]>>;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
}

export function useRoomActions({ token, setRooms, setError, setNotice, setIsSubmitting }: UseRoomActionsOptions) {
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  async function handleScheduleRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (!token) return;

    setIsSubmitting(true);
    setError("");
    try {
      const room = await createScheduledRoom(token, String(values.get("subjectId") ?? ""));
      setRooms((current) => [...current.filter((item) => item.id !== room.id), room]
        .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()));
      setNotice("Room scheduled. Share the meeting ID and passcode with your students.");
      form.reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not schedule the room.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyRoomDetails(room: ScheduledRoom) {
    const details = `Meeting ID: ${room.id}\nPasscode: ${room.passcode}\n${room.subject.title} · ${room.subject.section.code}\n${formatSubjectTime(room.subject)}`;
    try {
      await navigator.clipboard.writeText(details);
      setNotice("Meeting details copied.");
    } catch {
      setError("Could not copy meeting details. You can manually select and copy the ID and passcode.");
    }
  }

  async function deleteRoom(room: ScheduledRoom) {
    if (!window.confirm(`Delete the room for ${room.subject.title} · ${room.subject.section.code}? Students will no longer be able to join it.`)) {
      return;
    }
    if (!token) return;

    setDeletingRoomId(room.id);
    setError("");
    try {
      await deleteScheduledRoom(token, room.id);
      setRooms((current) => current.filter((item) => item.id !== room.id));
      setNotice("Room deleted.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete the room.");
    } finally {
      setDeletingRoomId(null);
    }
  }

  return { deletingRoomId, handleScheduleRoom, copyRoomDetails, deleteRoom };
}
