export type Page = "overview" | "sections" | "classroom" | "assignments" | "quizzes" | "rooms";

export function getQuizCreationSubjectId(pathname = window.location.pathname): string | null {
  const match = pathname.match(/^\/quizzes\/create\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function isQuizCreationPath(pathname = window.location.pathname): boolean {
  return /^\/quizzes\/create(?:\/[^/]+)?\/?$/.test(pathname);
}

export function getWorkspacePage(pathname = window.location.pathname): Page {
  if (pathname === "/sections") return "sections";
  if (pathname === "/classroom") return "classroom";
  if (pathname === "/assignments") return "assignments";
  if (pathname === "/quizzes" || /^\/quizzes\/create(?:\/|$)/.test(pathname)) return "quizzes";
  if (pathname === "/rooms") return "rooms";
  return "overview";
}
