import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { MdAssignment, MdClass, MdDashboard, MdGroups, MdMeetingRoom, MdQuiz } from "react-icons/md";
import { WorkspaceShell } from "./components/WorkspaceShell";
import { AuthScreen } from "./screens/AuthScreen";
import { ClassroomPostCard, ClassroomScreen } from "./screens/ClassroomScreen";
import { PublicQuizScreen } from "./screens/PublicQuizScreen";
import { QuizzesScreen } from "./screens/QuizzesScreen";
import { RoomsScreen } from "./screens/RoomsScreen";
import { SectionCard, SectionsScreen } from "./screens/SectionsScreen";
import { OverviewScreen } from "./screens/OverviewScreen";
import { AssignmentsScreen } from "./screens/AssignmentsScreen";
import { PortalError, TOKEN_KEY } from "./api/client";
import { formatSubjectTime } from "./utils/date";
import { getWorkspacePage, type Page } from "./navigation/routes";
import { changeTeacherPassword, getCurrentTeacher, loginTeacher } from "./services/authService";
import { loadTeacherWorkspace } from "./services/workspaceService";
import { useQuizManager } from "./hooks/useQuizManager";
import { useClassroomActions } from "./hooks/useClassroomActions";
import { useRoomActions } from "./hooks/useRoomActions";
import type {
  ClassroomPost,
  ClassroomView,
  CourseSection,
  QuizItem,
  ScheduledRoom,
  User,
} from "./types";

function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [rooms, setRooms] = useState<ScheduledRoom[]>([]);
  const [classroomPosts, setClassroomPosts] = useState<ClassroomPost[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [classroomView, setClassroomView] = useState<ClassroomView>("STREAM");
  const [isPostComposerOpen, setIsPostComposerOpen] = useState(false);
  const [page, setPage] = useState<Page>(() => getWorkspacePage());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const classroomActions = useClassroomActions({
    token,
    setClassroomPosts,
    setError,
    setNotice,
    setIsSubmitting,
    setIsPostComposerOpen,
  });
  const roomActions = useRoomActions({
    token,
    setRooms,
    setError,
    setNotice,
    setIsSubmitting,
  });
  const {
    downloadingAttachmentId,
    handleCreatePost,
    handleCreateAssignment,
    downloadAttachment,
  } = classroomActions;
  const {
    deletingRoomId,
    handleScheduleRoom,
    copyRoomDetails,
    deleteRoom,
  } = roomActions;
  const quizManager = useQuizManager({
    token,
    setQuizzes,
    setError,
    setNotice,
    setIsSubmitting,
    setPage,
    setIsPostComposerOpen,
  });
  const {
    isQuizComposerOpen,
    isGeneratingQuizzes,
    editingQuizId,
    quizTitle,
    quizDescription,
    quizDueAt,
    generatedQuizDueAt,
    quizSubjectId,
    quizQuestions,
    setQuizTitle,
    setQuizDescription,
    setQuizDueAt,
    setGeneratedQuizDueAt,
    setQuizSubjectId,
    setQuizQuestionType,
    addQuizQuestion,
    duplicateQuizQuestion,
    removeQuizQuestion,
    updateQuizQuestion,
    startQuizCreation,
    closeQuizComposer,
    startQuizEditing,
    handleSaveQuiz,
    handleGenerateQuizzes,
    handleDeleteQuiz,
    copyQuizLink,
  } = quizManager;

  useEffect(() => {
    function syncPageFromUrl() {
      const pathname = window.location.pathname;
      setPage(getWorkspacePage(pathname));
      quizManager.syncFromPath(pathname);
      setIsPostComposerOpen(false);
    }

    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, [quizManager.syncFromPath]);

  const showAuth = useCallback((message = "") => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSections([]);
    setRooms([]);
    setClassroomPosts([]);
    setQuizzes([]);
    setError(message);
    setIsLoading(false);
    setIsSubmitting(false);
  }, []);

  const loadWorkspace = useCallback(async (authToken: string) => {
    setIsLoading(true);
    setError("");
    try {
      const workspace = await loadTeacherWorkspace(authToken);
      setSections(workspace.sections);
      setRooms(workspace.rooms);
      setClassroomPosts(workspace.classroomPosts);
      setQuizzes(workspace.quizzes);
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
    setPage(getWorkspacePage());
    await loadWorkspace(authToken);
  }, [loadWorkspace, showAuth]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    void getCurrentTeacher(token)
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
      const result = await loginTeacher(values.get("email"), values.get("password"));
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
      await changeTeacherPassword(token, newPassword);
      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      await loadWorkspace(token);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Could not update your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function navigateToPage(nextPage: Page) {
    setPage(nextPage);
    quizManager.dismissQuizComposer();
    setIsPostComposerOpen(false);
    const path = nextPage === "overview" ? "/" : `/${nextPage}`;
    window.history.pushState(null, "", path);
    setError("");
  }

  function renderAuth() {
    return (
      <AuthScreen
        userMustChangePassword={Boolean(user?.mustChangePassword)}
        error={error}
        isSubmitting={isSubmitting}
        onLogin={(event) => void handleLogin(event)}
        onPasswordChange={(event) => void handlePasswordChange(event)}
        onSignOut={() => showAuth()}
      />
    );
  }

  function renderSectionCard(section: CourseSection) {
    return <SectionCard key={section.id} section={section} />;
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
    return (
      <RoomsScreen
        sections={sections}
        rooms={rooms}
        error={error}
        isSubmitting={isSubmitting}
        deletingRoomId={deletingRoomId}
        onScheduleRoom={(event) => void handleScheduleRoom(event)}
        onDeleteRoom={deleteRoom}
        onCopyRoomDetails={copyRoomDetails}
        pageHeading={pageHeading}
      />
    );
  }

  function renderClassroomPost(post: ClassroomPost) {
    return (
      <ClassroomPostCard
        key={post.id}
        post={post}
        downloadingAttachmentId={downloadingAttachmentId}
        onDownloadAttachment={downloadAttachment}
      />
    );
  }

  function renderClassroomPage() {
    return (
      <ClassroomScreen
        sections={sections}
        classroomPosts={classroomPosts}
        quizzes={quizzes}
        classroomView={classroomView}
        isPostComposerOpen={isPostComposerOpen}
        isSubmitting={isSubmitting}
        error={error}
        onToggleStreamComposer={() => {
          quizManager.dismissQuizComposer();
          setIsPostComposerOpen((open) => !open);
          setError("");
        }}
        onSetClassroomView={setClassroomView}
        onCreateAssignment={(event) => handleCreateAssignment(event)}
        onCreatePost={(event, type) => handleCreatePost(event, type)}
        onCopyQuizLink={(quiz) => void copyQuizLink(quiz)}
        renderClassroomPost={renderClassroomPost}
        pageHeading={pageHeading}
      />
    );
  }

  function renderAssignmentsPage() {
    const assignments = classroomPosts.filter((post) => post.type === "ASSIGNMENT");

    return (
      <AssignmentsScreen
        sections={sections}
        assignments={assignments}
        isPostComposerOpen={isPostComposerOpen}
        isSubmitting={isSubmitting}
        error={error}
        onToggleComposer={() => {
          quizManager.dismissQuizComposer();
          setIsPostComposerOpen((open) => !open);
          setError("");
        }}
        onCreatePost={handleCreatePost}
        onCreateAssignment={handleCreateAssignment}
        renderClassroomPost={renderClassroomPost}
      />
    );
  }

  function renderQuizzesPage() {
    return (
      <QuizzesScreen
        sections={sections}
        quizzes={quizzes}
        error={error}
        isQuizComposerOpen={isQuizComposerOpen}
        isGeneratingQuizzes={isGeneratingQuizzes}
        generatedQuizDueAt={generatedQuizDueAt}
        isSubmitting={isSubmitting}
        quizSubjectId={quizSubjectId}
        editingQuizId={editingQuizId}
        quizTitle={quizTitle}
        quizDescription={quizDescription}
        quizDueAt={quizDueAt}
        quizQuestions={quizQuestions}
        onGenerateQuizzes={() => void handleGenerateQuizzes()}
        onCloseComposer={closeQuizComposer}
        onSaveQuiz={(event) => void handleSaveQuiz(event)}
        onCopyQuizLink={(quiz) => void copyQuizLink(quiz)}
        onEditQuiz={startQuizEditing}
        onDeleteQuiz={(quiz) => void handleDeleteQuiz(quiz)}
        onStartQuizCreation={startQuizCreation}
        setQuizTitle={setQuizTitle}
        setQuizDescription={setQuizDescription}
        setQuizDueAt={setQuizDueAt}
        setGeneratedQuizDueAt={setGeneratedQuizDueAt}
        setQuizSubjectId={setQuizSubjectId}
        setQuizQuestionType={setQuizQuestionType}
        addQuizQuestion={addQuizQuestion}
        duplicateQuizQuestion={duplicateQuizQuestion}
        removeQuizQuestion={removeQuizQuestion}
        updateQuizQuestion={updateQuizQuestion}
        pageHeading={pageHeading}
      />
    );
  }

  function renderContent() {
    if (page === "sections") {
      return (
        <SectionsScreen
          sections={sections}
          error={error}
          onCreatePost={() => navigateToPage('classroom')}
          renderSectionCard={renderSectionCard}
        />
      );
    }
    if (page === "classroom") return renderClassroomPage();
    if (page === "assignments") return renderAssignmentsPage();
    if (page === "quizzes") return renderQuizzesPage();
    if (page === "rooms") return renderRoomsPage();

    return (
      <OverviewScreen
        sections={sections}
        classroomPosts={classroomPosts}
        rooms={rooms}
        subjectCount={subjectCount}
        error={error}
        onViewSections={() => navigateToPage("sections")}
        onViewClassroom={() => navigateToPage("classroom")}
        onViewRooms={() => navigateToPage("rooms")}
        renderSectionCard={renderSectionCard}
        renderRoom={renderRoom}
        renderClassroomPost={renderClassroomPost}
        pageHeading={pageHeading}
        userName={user?.username ?? "Teacher"}
      />
    );
  }

  const publicQuizMatch = window.location.pathname.match(/^\/quiz\/([0-9a-f-]{36})\/?$/i);
  if (publicQuizMatch) return <PublicQuizScreen shareCode={publicQuizMatch[1]} />;

  if (isLoading) {
    return <main className="loading-screen" aria-live="polite"><span className="brand-mark">M</span><p>Loading Teacher Workspace...</p></main>;
  }

  if (!token || !user || user.mustChangePassword) return renderAuth();

  const pages: { id: Page; label: string; icon: ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <MdDashboard /> },
    { id: "sections", label: "My sections", icon: <MdGroups /> },
    { id: "classroom", label: "Classroom", icon: <MdClass /> },
    { id: "assignments", label: "Assignments", icon: <MdAssignment /> },
    { id: "quizzes", label: "Quizzes", icon: <MdQuiz /> },
    { id: "rooms", label: "Meeting rooms", icon: <MdMeetingRoom /> },
  ];

  return (
    <WorkspaceShell
      user={user}
      page={page}
      pages={pages}
      notice={notice}
      navigateToPage={navigateToPage}
      showAuth={showAuth}
      setNotice={setNotice}
    >
      {renderContent()}
    </WorkspaceShell>
  );
}

export default App;
