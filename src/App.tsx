import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY;
const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface User {
  id: string;
  username: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  mustChangePassword: boolean;
}

interface Subject {
  id: string;
  code: string;
  title: string;
  units: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface CourseSection {
  id: string;
  code: string;
  course: string;
  yearLevel: number;
  semester: string;
  subjects: Subject[];
}

interface ScheduledRoom {
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

type ClassroomPostType = "ANNOUNCEMENT" | "ASSIGNMENT";
type ClassroomView = "STREAM" | "CLASSWORK";

interface ClassroomPostAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface ClassroomPost {
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

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  message: string;
}

class PortalError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PortalError";
  }
}

type Page = "overview" | "sections" | "classroom" | "rooms";

async function request<T>(
  path: string,
  token: string | null,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const body = options.body;
  const isFormData = body instanceof FormData;
  if (options.body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = "Bearer " + token;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: isFormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PortalError("Could not reach the server. Check your connection and try again.", 0);
  }

  const result = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiError | null;
  if (!response.ok || !result || result.success !== true) {
    const message = result && "message" in result
      ? result.message
      : `Request failed (${response.status}).`;
    throw new PortalError(message, response.status);
  }
  return result.data;
}

function Logo() {
  return (
    <div className="brand-lockup">
      <img className="brand-mark" src="/assets/Logosplash.png" alt="" aria-hidden="true" />
      <span className="brand-name">
        MyClaSSes
        <span className="brand-caption">TEACHER WORKSPACE</span>
      </span>
    </div>
  );
}

function ErrorBanner({ children }: { children: string }) {
  return <div className="error-banner" role="alert">{children}</div>;
}

function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Schedule not set" : new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatSubjectTime(subject: Pick<Subject, "dayOfWeek" | "startTime" | "endTime">): string {
  const day = DAYS[subject.dayOfWeek] ?? "Schedule pending";
  if (!subject.startTime || !subject.endTime) return day;
  return `${day} · ${subject.startTime}–${subject.endTime}`;
}

function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [rooms, setRooms] = useState<ScheduledRoom[]>([]);
  const [classroomPosts, setClassroomPosts] = useState<ClassroomPost[]>([]);
  const [classroomView, setClassroomView] = useState<ClassroomView>("STREAM");
  const [postType, setPostType] = useState<ClassroomPostType>("ANNOUNCEMENT");
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const showAuth = useCallback((message = "") => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSections([]);
    setRooms([]);
    setClassroomPosts([]);
    setError(message);
    setIsLoading(false);
    setIsSubmitting(false);
  }, []);

  const loadWorkspace = useCallback(async (authToken: string) => {
    setIsLoading(true);
    setError("");
    try {
      const [teacherSections, scheduledRooms, posts] = await Promise.all([
        request<CourseSection[]>("/api/admissions/sections", authToken),
        request<ScheduledRoom[]>("/api/rooms", authToken),
        request<ClassroomPost[]>("/api/classroom/posts", authToken),
      ]);
      setSections(teacherSections);
      setRooms(scheduledRooms);
      setClassroomPosts(posts);
    } catch (loadError) {
      if (loadError instanceof PortalError && loadError.status === 401) {
        showAuth("Your session has expired. Please sign in again.");
      } else {
        setError(loadError instanceof Error ? loadError.message : "Could not load your workspace.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [showAuth]);

  const startSession = useCallback(async (authToken: string, nextUser: User) => {
    if (nextUser.role !== "TEACHER") {
      showAuth("Only teacher accounts can sign in to this portal. Admin and student accounts are not allowed.");
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, authToken);
    setToken(authToken);
    setUser(nextUser);
    setError("");
    if (nextUser.mustChangePassword) {
      setIsLoading(false);
      return;
    }
    setPage("overview");
    await loadWorkspace(authToken);
  }, [loadWorkspace, showAuth]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    void request<User>("/api/auth/me", token)
      .then((currentUser) => {
        if (active) return startSession(token, currentUser);
      })
      .catch((authError: unknown) => {
        if (!active) return;
        if (authError instanceof PortalError && authError.status === 401) {
          showAuth("Your session has expired. Please sign in again.");
        } else {
          showAuth(authError instanceof Error ? authError.message : "Unable to validate your session.");
        }
      });
    return () => {
      active = false;
    };
  }, [showAuth, startSession, token]);

  const subjectCount = useMemo(
    () => sections.reduce((count, section) => count + section.subjects.length, 0),
    [sections],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError("");
    try {
      const result = await request<{ token: string; user: User }>("/api/auth/login", null, {
        method: "POST",
        body: { email: values.get("email"), password: values.get("password") },
      });
      await startSession(result.token, result.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const newPassword = String(values.get("newPassword") ?? "");
    const confirmPassword = String(values.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (newPassword.length < 12) {
      setError("Use at least 12 characters for your new password.");
      return;
    }
    if (!token || !user) return;

    setIsSubmitting(true);
    setError("");
    try {
      await request("/api/auth/change-password", token, {
        method: "POST",
        body: { newPassword },
      });
      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      await loadWorkspace(token);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Could not update your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleScheduleRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (!token) return;

    setIsSubmitting(true);
    setError("");
    try {
      const room = await request<ScheduledRoom>("/api/rooms", token, {
        method: "POST",
        body: {
          subjectId: values.get("subjectId"),
        },
      });
      setRooms((current) => [...current.filter((item) => item.id !== room.id), room]
        .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()));
      setNotice("Room scheduled. Share the meeting ID and passcode with your students.");
      form.reset();
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "Could not schedule the room.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const files = values.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
    const dueValue = String(values.get("dueAt") ?? "");
    const dueAt = dueValue ? new Date(dueValue) : null;
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
      body.append("type", postType);
      body.append("title", String(values.get("title") ?? ""));
      body.append("content", String(values.get("content") ?? ""));
      if (dueAt && postType === "ASSIGNMENT") body.append("dueAt", dueAt.toISOString());
      files.forEach((file) => body.append("attachments", file));

      const post = await request<ClassroomPost>("/api/classroom/posts", token, {
        method: "POST",
        body,
      });
      setClassroomPosts((current) => [post, ...current]);
      setNotice(post.type === "ASSIGNMENT" ? "Assignment posted to the class." : "Announcement shared with the class.");
      form.reset();
      setIsPostComposerOpen(false);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Could not publish the classroom post.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function downloadAttachment(attachment: ClassroomPostAttachment) {
    if (!token) return;
    setDownloadingAttachmentId(attachment.id);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/classroom/attachments/${encodeURIComponent(attachment.id)}`,
        { headers: { Authorization: "Bearer " + token } },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as ApiError | null;
        throw new PortalError(result?.message ?? "Could not download the attachment.", response.status);
      }

      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Could not download the attachment.");
    } finally {
      setDownloadingAttachmentId(null);
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
      await request<{ deleted: true }>(`/api/rooms/${encodeURIComponent(room.id)}`, token, {
        method: "DELETE",
      });
      setRooms((current) => current.filter((item) => item.id !== room.id));
      setNotice("Room deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the room.");
    } finally {
      setDeletingRoomId(null);
    }
  }

  function renderAuth() {
    if (user?.mustChangePassword) {
      return (
        <main className="auth-wrap">
          <aside className="auth-story">
            <Logo />
            <div className="auth-story-copy">
              <span className="story-kicker">MYCLASSES TEACHER PORTAL</span>
              <p className="story-quote">Welcome to your school workspace.</p>
              <span className="story-rule" />
              <p className="story-note">Manage your classes, share updates, and keep your teaching day organized.</p>
            </div>
            <span className="story-footer">MYCLASSES · TEACHER WORKSPACE</span>
          </aside>
          <section className="auth-card" aria-labelledby="password-title">
            <span className="auth-step">ACCOUNT SECURITY <span>01 / 01</span></span>
            <p className="eyebrow">Before we begin</p>
            <h1 id="password-title">Set a new password</h1>
            <p className="lead">Your temporary password has done its job. Choose a new one to open your workspace.</p>
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <form onSubmit={(event) => void handlePasswordChange(event)}>
              <label className="field">New password
                <input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
              </label>
              <label className="field">Confirm new password
                <input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
              </label>
              <button className="button button-primary full-width" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update password"}
              </button>
            </form>
            <button className="button button-secondary full-width" type="button" onClick={() => showAuth()}>
              Sign out
            </button>
          </section>
        </main>
      );
    }

    return (
      <main className="auth-wrap">
        <aside className="auth-story">
          <Logo />
          <div className="auth-story-copy">
            <span className="story-kicker">MYCLASSES TEACHER PORTAL</span>
            <p className="story-quote">Welcome to your school workspace.</p>
            <span className="story-rule" />
            <p className="story-note">Manage your classes, share updates, and keep your teaching day organized.</p>
          </div>
          <span className="story-footer">MYCLASSES · TEACHER WORKSPACE</span>
        </aside>
        <section className="auth-card" aria-labelledby="login-title">
          <span className="auth-step">YOUR WORKSPACE <span>SECURE SIGN IN</span></span>
          <p className="eyebrow">Good to have you back</p>
          <h1 id="login-title">Sign in to teach</h1>
          <p className="lead">Pick up where your classes left off.</p>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <form onSubmit={(event) => void handleLogin(event)}>
            <label className="field">Email address
              <input name="email" type="email" autoComplete="username" required maxLength={254} />
            </label>
            <label className="field">Password
              <input name="password" type="password" autoComplete="current-password" required maxLength={128} />
            </label>
            <button className="button button-primary full-width" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Continue to workspace"}
            </button>
          </form>
          <p className="hint auth-help">Need access? <span>Ask your administrator to set up a teacher account.</span></p>
        </section>
      </main>
    );
  }

  function renderSectionCard(section: CourseSection) {
    return (
      <article className="section-card" key={section.id}>
        <h3>{section.course} · {section.code}</h3>
        <p className="card-meta">Year {section.yearLevel} · {section.semester}</p>
        {section.subjects.length
          ? <div className="subject-list">{section.subjects.map((subject) => (
            <div className="subject-row" key={subject.id}>
              <span className="subject-name">{subject.code} · {subject.title}</span>
              <span className="subject-time">{formatSubjectTime(subject)}</span>
            </div>
          ))}</div>
          : <div className="empty-state">No subjects are listed in this section yet.</div>}
      </article>
    );
  }

  function renderRoom(room: ScheduledRoom) {
    return (
      <article className="room-card" key={room.id}>
        <div className="room-actions">
          <h3>{room.subject.title} · {room.subject.section.code}</h3>
          <span className="status-pill">Scheduled</span>
        </div>
        <div className="room-details">
          <span>{formatSubjectTime(room.subject)}</span>
          <span>Meeting ID: <strong className="room-code">{room.id}</strong></span>
          <span>Passcode: <strong className="room-code">{room.passcode}</strong></span>
        </div>
        <div className="room-actions">
          <span className="card-meta">{room.subject.section.course}</span>
          <div className="room-button-group">
            <button className="button button-secondary button-small" type="button" onClick={() => copyRoomDetails(room)}>
              Copy meeting details
            </button>
            <button
              className="button button-danger button-small"
              type="button"
              onClick={() => void deleteRoom(room)}
              disabled={deletingRoomId === room.id}
              aria-label={`Delete room for ${room.subject.title}`}
            >
              {deletingRoomId === room.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  function pageHeading(eyebrow: string, title: string, subtitle: string) {
    return (
      <header className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </header>
    );
  }

  function renderRoomsPage() {
    const subjects = sections.flatMap((section) => section.subjects.map((subject) => ({
      ...subject,
      sectionCode: section.code,
      course: section.course,
    })));
    return (
      <>
        {pageHeading("Live classes", "Meeting rooms", "Create a room for an assigned subject using its regular class schedule.")}
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <section className="panel">
          <div className="panel-heading"><h2>Create a class room</h2></div>
          {subjects.length
            ? <>
              <form className="schedule-form" onSubmit={(event) => void handleScheduleRoom(event)}>
                <label className="field subject-field">Subject
                  <select name="subjectId" required defaultValue="">
                    <option value="" disabled>Choose a subject</option>
                    {subjects.map((subject) => (
                      <option value={subject.id} key={subject.id}>
                        {subject.course} · {subject.sectionCode} — {subject.code} {subject.title} · {formatSubjectTime(subject)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create room"}
                </button>
              </form>
              <p className="hint">The room will be available for the next class meeting at the selected subject’s scheduled day and time.</p>
            </>
            : <div className="empty-state">You need an assigned section with subjects before you can schedule a class room.</div>}
        </section>
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <h2>Upcoming rooms</h2>
            <span className="card-meta">{rooms.length} scheduled</span>
          </div>
          {rooms.length
            ? <div className="room-list">{rooms.map(renderRoom)}</div>
            : <div className="empty-state">No upcoming rooms. Schedule your first class above.</div>}
        </section>
      </>
    );
  }

  function renderClassroomPost(post: ClassroomPost) {
    return (
      <article className="post-card" key={post.id}>
        <div className="post-header">
          <span className={`post-type ${post.type === "ASSIGNMENT" ? "post-type-assignment" : ""}`}>
            {post.type === "ASSIGNMENT" ? "Assignment / quiz" : "Announcement"}
          </span>
          <span className="card-meta">{formatDate(post.createdAt)}</span>
        </div>
        <h3>{post.title}</h3>
        <p className="post-subject">{post.subject.section.course} · {post.subject.section.code} · {post.subject.code}</p>
        <p className="post-content">{post.content}</p>
        {post.dueAt && <p className="post-due">Due {formatDate(post.dueAt)}</p>}
        {post.attachments.length > 0 && (
          <div className="post-attachments" aria-label="Attachments">
            {post.attachments.map((attachment) => (
              <button
                className="attachment-button"
                key={attachment.id}
                type="button"
                onClick={() => void downloadAttachment(attachment)}
                disabled={downloadingAttachmentId === attachment.id}
              >
                <span aria-hidden="true">↧</span>
                <span>{downloadingAttachmentId === attachment.id ? "Downloading..." : attachment.originalName}</span>
                <span className="attachment-size">{Math.ceil(attachment.size / 1024)} KB</span>
              </button>
            ))}
          </div>
        )}
      </article>
    );
  }

  function renderClassroomPage() {
    const subjects = sections.flatMap((section) => section.subjects.map((subject) => ({
      ...subject,
      sectionCode: section.code,
      course: section.course,
    })));

    const visiblePosts = classroomPosts.filter((post) =>
      classroomView === "STREAM" ? post.type === "ANNOUNCEMENT" : post.type === "ASSIGNMENT"
    );

    return (
      <>
        {pageHeading("Classroom", "Class stream & classwork", "Share announcements, assignments, and quiz instructions with students in your assigned subjects.")}
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <div className="classroom-toolbar">
          <div className="classroom-tabs" role="tablist" aria-label="Classroom posts">
            <button
              className={`classroom-tab ${classroomView === "STREAM" ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={classroomView === "STREAM"}
              onClick={() => setClassroomView("STREAM")}
            >
              Stream <span>{classroomPosts.filter((post) => post.type === "ANNOUNCEMENT").length}</span>
            </button>
            <button
              className={`classroom-tab ${classroomView === "CLASSWORK" ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={classroomView === "CLASSWORK"}
              onClick={() => setClassroomView("CLASSWORK")}
            >
              Classwork <span>{classroomPosts.filter((post) => post.type === "ASSIGNMENT").length}</span>
            </button>
          </div>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              const nextType = classroomView === "STREAM" ? "ANNOUNCEMENT" : "ASSIGNMENT";
              setPostType(nextType);
              setIsPostComposerOpen((open) => !open);
              setError("");
            }}
            disabled={subjects.length === 0}
          >
            {classroomView === "STREAM" ? "＋ Share announcement" : "＋ Create assignment"}
          </button>
        </div>
        {isPostComposerOpen && (
          <section className="panel">
            <div className="panel-heading">
              <h2>{postType === "ANNOUNCEMENT" ? "Share with your class" : "Create assignment or quiz"}</h2>
              <button className="text-link" type="button" onClick={() => setIsPostComposerOpen(false)}>Cancel</button>
            </div>
            {subjects.length ? (
              <form className="post-form" onSubmit={(event) => void handleCreatePost(event)}>
                <input name="type" type="hidden" value={postType} />
                <label className="field">Class
                  <select name="subjectId" required defaultValue="">
                    <option value="" disabled>Choose an assigned subject</option>
                    {subjects.map((subject) => (
                      <option value={subject.id} key={subject.id}>
                        {subject.course} · {subject.sectionCode} — {subject.code} {subject.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">Title
                  <input name="title" required maxLength={120} placeholder={postType === "ASSIGNMENT" ? "e.g. Chapter 3 quiz" : "Give your announcement a title"} />
                </label>
                <label className="field post-content-field">
                  {postType === "ASSIGNMENT" ? "Instructions" : "Message"}
                  <textarea name="content" required maxLength={5000} rows={5} placeholder={postType === "ASSIGNMENT" ? "Add directions, requirements, and how students should submit their work..." : "Write an update for your students..."} />
                </label>
                {postType === "ASSIGNMENT" && (
                  <label className="field">Due date (optional)
                    <input name="dueAt" type="datetime-local" />
                  </label>
                )}
                <label className="field post-content-field">
                  Attach files (optional)
                  <input
                    name="attachments"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.docx,.pptx"
                  />
                  <span className="hint">Up to 5 files · 10 MB each · images, PDF, TXT, DOCX, PPTX</span>
                </label>
                <div className="post-form-actions">
                  <span className="hint">Only students enrolled in the selected subject can view this post.</span>
                  <button className="button button-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Publishing..." : postType === "ASSIGNMENT" ? "Assign to class" : "Post to stream"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="empty-state">No assigned subjects are available yet. Ask an administrator to assign you a section with subjects.</div>
            )}
          </section>
        )}
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <h2>{classroomView === "STREAM" ? "Stream" : "Classwork"}</h2>
            <span className="card-meta">{visiblePosts.length} posted</span>
          </div>
          {visiblePosts.length
            ? <div className="post-list">{visiblePosts.map(renderClassroomPost)}</div>
            : <div className="empty-state">
              {classroomView === "STREAM"
                ? "No announcements yet. Share an update with your class."
                : "No assignments or quizzes yet. Create classwork with instructions and a due date."}
            </div>}
        </section>
      </>
    );
  }

  function renderContent() {
    if (page === "sections") {
      return (
        <>
          <header className="page-heading">
            <div>
              <p className="eyebrow">Your teaching</p>
              <h1>My sections</h1>
              <p className="page-subtitle">Only sections assigned to your teacher account are shown.</p>
            </div>
            <button className="button button-primary" type="button" onClick={() => { setPage("classroom"); setError(""); }}>
              Create a post
            </button>
          </header>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          {sections.length
            ? <div className="section-grid">{sections.map(renderSectionCard)}</div>
            : <div className="panel"><div className="empty-state">No sections are assigned to your account yet. Ask an administrator to assign your teaching sections.</div></div>}
        </>
      );
    }
    if (page === "classroom") return renderClassroomPage();
    if (page === "rooms") return renderRoomsPage();

    return (
      <>
        {pageHeading("Teacher workspace", `Good day, ${user?.username ?? "Teacher"}.`, "Your teaching sections and upcoming online classes at a glance.")}
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <section className="stats-grid" aria-label="Teaching summary">
          <article className="stat-card"><span className="stat-label">Assigned sections</span><strong className="stat-value">{sections.length}</strong></article>
          <article className="stat-card"><span className="stat-label">Subjects</span><strong className="stat-value">{subjectCount}</strong></article>
          <article className="stat-card"><span className="stat-label">Class posts</span><strong className="stat-value">{classroomPosts.length}</strong></article>
        </section>
        <div className="two-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>My sections</h2>
              <button className="text-link" type="button" onClick={() => { setPage("sections"); setError(""); }}>View all →</button>
            </div>
            {sections.length
              ? <div className="section-grid">{sections.slice(0, 2).map(renderSectionCard)}</div>
              : <div className="empty-state">No sections are assigned to your account yet. Ask an administrator to assign your teaching sections.</div>}
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Classroom posts</h2>
              <button className="text-link" type="button" onClick={() => { setPage("classroom"); setError(""); }}>Create a post →</button>
            </div>
            {classroomPosts.length
              ? <div className="post-list">{classroomPosts.slice(0, 3).map(renderClassroomPost)}</div>
              : <div className="empty-state">Share your first announcement or assignment with a class.</div>}
          </section>
          <section className="panel spaced-panel">
            <div className="panel-heading">
              <h2>Upcoming rooms</h2>
              <button className="text-link" type="button" onClick={() => { setPage("rooms"); setError(""); }}>Manage rooms →</button>
            </div>
            {rooms.length
              ? <div className="room-list">{rooms.slice(0, 3).map(renderRoom)}</div>
              : <div className="empty-state">No upcoming rooms. Schedule one for a subject in your assigned sections.</div>}
          </section>
        </div>
      </>
    );
  }

  if (isLoading) {
    return <main className="loading-screen" aria-live="polite"><span className="brand-mark">M</span><p>Loading Teacher Workspace...</p></main>;
  }

  if (!token || !user || user.mustChangePassword) return renderAuth();

  const pages: { id: Page; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "sections", label: "My sections", icon: "▤" },
    { id: "classroom", label: "Classroom", icon: "✎" },
    { id: "rooms", label: "Meeting rooms", icon: "◉" },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo />
        <div className="account">
          <div className="account-copy">
            <div className="account-name">{user.username}</div>
            <div className="account-role">Teacher</div>
          </div>
          <span className="avatar" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
          <button className="button button-secondary button-small" type="button" onClick={() => showAuth()}>
            Sign out
          </button>
        </div>
      </header>
      <div className="portal-layout">
        <aside className="sidebar">
          <p className="sidebar-label">Workspace</p>
          <nav className="nav-list" aria-label="Teacher workspace">
            {pages.map((item) => (
              <button
                className={`nav-item ${page === item.id ? "active" : ""}`}
                type="button"
                key={item.id}
                aria-current={page === item.id ? "page" : undefined}
                onClick={() => { setPage(item.id); setError(""); }}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="main-content">{renderContent()}</main>
      </div>
      {notice && <div className="toast" role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
    </div>
  );
}

export default App;
