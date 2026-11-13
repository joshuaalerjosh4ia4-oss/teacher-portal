import type { Subject } from "../types";

export const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short", hour12: true },
): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Schedule not set" : new Intl.DateTimeFormat(undefined, options).format(date);
}

export function formatTime(value: string): string {
  const match = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(value.trim());
  if (!match || Number(match[1]) > 23) return value;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}

export function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function formatSubjectTime(subject: Pick<Subject, "dayOfWeek" | "startTime" | "endTime">): string {
  const day = DAYS[subject.dayOfWeek] ?? "Schedule pending";
  if (!subject.startTime || !subject.endTime) return day;
  return `${day} · ${formatTime(subject.startTime)}–${formatTime(subject.endTime)}`;
}
