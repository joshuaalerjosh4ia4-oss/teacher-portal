import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { createClassroomPost, downloadClassroomAttachment } from "../services/classroomService";
import type { ClassroomPost, ClassroomPostAttachment, ClassroomPostType } from "../types";

interface UseClassroomActionsOptions {
  token: string | null;
  setClassroomPosts: Dispatch<SetStateAction<ClassroomPost[]>>;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  setIsPostComposerOpen: Dispatch<SetStateAction<boolean>>;
}

export function useClassroomActions({
  token,
  setClassroomPosts,
  setError,
  setNotice,
  setIsSubmitting,
  setIsPostComposerOpen,
}: UseClassroomActionsOptions) {
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>, type: ClassroomPostType) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const files = values.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
    const dueValue = String(values.get("dueAt") ?? "");
    const dueAt = dueValue ? new Date(dueValue) : null;

    if (type === "ASSIGNMENT" && !dueAt) {
      setError("Choose a due date and time for this activity or exam.");
      return;
    }
    if (files.length > 5) {
      setError("Attach up to five files to a post.");
      return;
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      setError("Each attachment must be 10 MB or smaller.");
      return;
    }
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      setError("Enter a valid due date.");
      return;
    }
    if (!token) return;

    setIsSubmitting(true);
    setError("");
    try {
      const body = new FormData();
      body.append("subjectId", String(values.get("subjectId") ?? ""));
      body.append("type", type);
      body.append("title", String(values.get("title") ?? ""));
      body.append("content", String(values.get("content") ?? ""));
      if (dueAt && type === "ASSIGNMENT") body.append("dueAt", dueAt.toISOString());
      files.forEach((file) => body.append("attachments", file));

      const post = await createClassroomPost(token, body);
      setClassroomPosts((current) => [post, ...current]);
      setNotice(type === "ASSIGNMENT" ? "Activity or exam posted to the class." : "Announcement shared with the class.");
      form.reset();
      setIsPostComposerOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not publish the classroom post.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCreateAssignment(event: FormEvent<HTMLFormElement>) {
    return handleCreatePost(event, "ASSIGNMENT");
  }

  async function downloadAttachment(attachment: ClassroomPostAttachment) {
    if (!token) return;
    setDownloadingAttachmentId(attachment.id);
    setError("");
    try {
      const objectUrl = URL.createObjectURL(await downloadClassroomAttachment(token, attachment.id));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not download the attachment.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  return { downloadingAttachmentId, handleCreatePost, handleCreateAssignment, downloadAttachment };
}
