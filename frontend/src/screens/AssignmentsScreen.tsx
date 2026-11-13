import { ErrorBanner } from "../components/Brand";
import { PostComposer } from "./ClassroomScreen";
import type { ClassroomPost, ClassroomPostType, CourseSection } from "../types";

interface AssignmentsScreenProps {
  sections: CourseSection[];
  assignments: ClassroomPost[];
  isPostComposerOpen: boolean;
  isSubmitting: boolean;
  error: string;
  onToggleComposer: () => void;
  onCreatePost: (event: React.FormEvent<HTMLFormElement>, type: ClassroomPostType) => void;
  onCreateAssignment: (event: React.FormEvent<HTMLFormElement>) => void;
  renderClassroomPost: (post: ClassroomPost) => React.ReactNode;
}

export function AssignmentsScreen({
  sections,
  assignments,
  isPostComposerOpen,
  isSubmitting,
  error,
  onToggleComposer,
  onCreatePost,
  onCreateAssignment,
  renderClassroomPost,
}: AssignmentsScreenProps) {
  const subjects = sections.flatMap((section) => section.subjects.map((subject) => ({
    ...subject,
    sectionCode: section.code,
    course: section.course,
  })));

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Classwork</p>
          <h1>Activities &amp; exams</h1>
          <p className="page-subtitle">Create class activities and exams with instructions, attachments, and a required due date.</p>
        </div>
      </header>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <div className="classroom-toolbar">
        <p className="quiz-count-note">
          {assignments.length} {assignments.length === 1 ? "activity / exam" : "activities / exams"}
        </p>
        <button
          className="button button-primary"
          type="button"
          onClick={onToggleComposer}
          disabled={subjects.length === 0}
        >
          ＋ Create activity or exam
        </button>
      </div>
      {isPostComposerOpen && (
        <PostComposer
          type="ASSIGNMENT"
          subjects={subjects}
          isSubmitting={isSubmitting}
          onSubmit={onCreatePost}
          onAssignmentSubmit={onCreateAssignment}
          onCancel={onToggleComposer}
        />
      )}
      <section className="panel spaced-panel">
        <div className="panel-heading">
          <h2>Activities &amp; exams</h2>
          <span className="card-meta">{assignments.length} posted</span>
        </div>
        {assignments.length
          ? <div className="post-list">{assignments.map(renderClassroomPost)}</div>
          : <div className="empty-state">No activities or exams yet. Create one for an assigned subject.</div>}
      </section>
    </>
  );
}
