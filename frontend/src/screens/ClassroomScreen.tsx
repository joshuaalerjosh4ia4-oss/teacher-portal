import type { FormEvent, ReactNode } from "react";
import { ErrorBanner } from "../components/Brand";
import { formatDate } from "../utils/date";
import type { ClassroomPost, ClassroomPostType, ClassroomView, CourseSection, QuizItem } from "../types";

interface ClassroomPanelProps {
  sections: CourseSection[];
  classroomPosts: ClassroomPost[];
  quizzes: QuizItem[];
  classroomView: ClassroomView;
  isPostComposerOpen: boolean;
  isSubmitting: boolean;
  error: string;
  onToggleStreamComposer: () => void;
  onSetClassroomView: (view: ClassroomView) => void;
  onCreateAssignment: (event: FormEvent<HTMLFormElement>) => void;
  onCreatePost: (event: FormEvent<HTMLFormElement>, type: ClassroomPostType) => void;
  onCopyQuizLink: (quiz: QuizItem) => void;
  renderClassroomPost: (post: ClassroomPost) => ReactNode;
  pageHeading: (eyebrow: string, title: string, subtitle: string) => ReactNode;
}

export function ClassroomScreen({
  sections,
  classroomPosts,
  quizzes,
  classroomView,
  isPostComposerOpen,
  isSubmitting,
  error,
  onToggleStreamComposer,
  onSetClassroomView,
  onCreateAssignment,
  onCreatePost,
  onCopyQuizLink,
  renderClassroomPost,
  pageHeading,
}: ClassroomPanelProps) {
  const subjects = sections.flatMap((section) => section.subjects.map((subject) => ({
    ...subject,
    sectionCode: section.code,
    course: section.course,
  })));
  const visiblePosts = classroomPosts.filter((post) =>
    classroomView === "STREAM" ? post.type === "ANNOUNCEMENT" : post.type === "ASSIGNMENT",
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
            onClick={() => onSetClassroomView("STREAM")}
          >
            Stream <span>{classroomPosts.filter((post) => post.type === "ANNOUNCEMENT").length}</span>
          </button>
          <button
            className={`classroom-tab ${classroomView === "CLASSWORK" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={classroomView === "CLASSWORK"}
            onClick={() => onSetClassroomView("CLASSWORK")}
          >
            Classwork <span aria-label={`${quizzes.length} quizzes`}>{quizzes.length}</span>
          </button>
        </div>
        <div className="classroom-actions">
          {classroomView === "STREAM" && (
            <button
              className="button button-primary"
              type="button"
              onClick={onToggleStreamComposer}
              disabled={subjects.length === 0}
            >
              ＋ Share announcement
            </button>
          )}
        </div>
      </div>
      {classroomView === "STREAM" && isPostComposerOpen && <PostComposer type="ANNOUNCEMENT" subjects={subjects} isSubmitting={isSubmitting} onSubmit={onCreatePost} />}
      <section className="panel spaced-panel">
        <div className="panel-heading">
          <h2>{classroomView === "STREAM" ? "Stream" : "Activity"}</h2>
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
      {classroomView === "CLASSWORK" && (
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <h2>Quizzes</h2>
            <span className="card-meta">{quizzes.length} quiz{quizzes.length === 1 ? "" : "zes"} total</span>
          </div>
          {subjects.length > 0 && (
            <div className="quiz-subject-counts" aria-label="Quiz counts by subject">
              {subjects.map((subject) => {
                const subjectQuizCount = quizzes.filter((quiz) => quiz.subject.id === subject.id).length;
                return (
                  <div className="quiz-subject-count" key={subject.id}>
                    <span>{subject.code} · {subject.title} <small>{subject.course} · {subject.sectionCode}</small></span>
                    <strong>{subjectQuizCount} quiz{subjectQuizCount === 1 ? "" : "zes"}</strong>
                  </div>
                );
              })}
            </div>
          )}
          {quizzes.length
            ? <div className="quiz-list">{quizzes.map((quiz) => (
              <article className="quiz-card" key={quiz.id}>
                <div className="quiz-card-heading">
                  <div>
                    <h3>{quiz.title}</h3>
                    <p className="card-meta">{quiz.subject.title} · {quiz.subject.section.code} · {quiz.questions.length} questions</p>
                  </div>
                  <button className="button button-secondary button-small" type="button" onClick={() => onCopyQuizLink(quiz)}>
                    Copy quiz link
                  </button>
                </div>
                {quiz.description && <p className="quiz-description-text">{quiz.description}</p>}
                {quiz.dueAt && <p className="quiz-due-date">Due {formatDate(quiz.dueAt)}</p>}
              </article>
            ))}</div>
            : <div className="empty-state">No quizzes yet. Create a quiz to share a link with your class.</div>}
        </section>
      )}
      {classroomView === "CLASSWORK" && isPostComposerOpen && <PostComposer type="ASSIGNMENT" subjects={subjects} isSubmitting={isSubmitting} onSubmit={onCreatePost} onAssignmentSubmit={onCreateAssignment} />}
    </>
  );
}

export interface PostComposerProps {
  type: ClassroomPostType;
  subjects: Array<{ id: string; code: string; title: string; course: string; sectionCode: string }>;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>, type: ClassroomPostType) => void;
  onAssignmentSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}

export function PostComposer({
  type,
  subjects,
  isSubmitting,
  onSubmit,
  onAssignmentSubmit,
  onCancel,
}: PostComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (type === "ASSIGNMENT") {
      if (onAssignmentSubmit) {
        onAssignmentSubmit(event);
        return;
      }
      onSubmit(event, type);
      return;
    }
    onSubmit(event, type);
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{type === "ANNOUNCEMENT" ? "Share with your class" : "Create activity or exam"}</h2>
        {onCancel && <button className="text-link" type="button" onClick={onCancel}>Cancel</button>}
      </div>
      {subjects.length ? (
        <form
          className="post-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
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
            <input name="title" required maxLength={120} placeholder={type === "ASSIGNMENT" ? "e.g. Chapter 3 activity or midterm exam" : "Give your announcement a title"} />
          </label>
          <label className="field post-content-field">
            {type === "ASSIGNMENT" ? "Instructions" : "Message"}
            <textarea name="content" required maxLength={5000} rows={5} placeholder={type === "ASSIGNMENT" ? "Add directions, requirements, and how students should submit their work..." : "Write an update for your students..."} />
          </label>
          {type === "ASSIGNMENT" && (
            <label className="field">Due date and time (required)
              <input name="dueAt" required type="datetime-local" />
            </label>
          )}
          <label className="field post-content-field">
            Attach files (optional)
            <input name="attachments" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.docx,.pptx" />
            <span className="hint">Up to 5 files · 10 MB each · images, PDF, TXT, DOCX, PPTX</span>
          </label>
          <div className="post-form-actions">
            <span className="hint">Only students enrolled in the selected subject can view this post.</span>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Publishing..." : type === "ASSIGNMENT" ? "Assign to class" : "Post to stream"}
            </button>
          </div>
        </form>
      ) : (
        <div className="empty-state">No assigned subjects are available yet. Ask an administrator to assign you a section with subjects.</div>
      )}
    </section>
  );
}

export function ClassroomPostCard({ post, downloadingAttachmentId, onDownloadAttachment }: {
  post: ClassroomPost;
  downloadingAttachmentId: string | null;
  onDownloadAttachment: (attachment: ClassroomPost["attachments"][number]) => void;
}) {
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
              onClick={() => onDownloadAttachment(attachment)}
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
