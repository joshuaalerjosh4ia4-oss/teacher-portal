import type { ReactElement } from "react";
import { ErrorBanner } from "../components/Brand";
import type { ClassroomPost, CourseSection, ScheduledRoom } from "../types";

interface TeacherOverviewProps {
  sections: CourseSection[];
  classroomPosts: ClassroomPost[];
  rooms: ScheduledRoom[];
  subjectCount: number;
  error: string;
  onViewSections: () => void;
  onViewClassroom: () => void;
  onViewRooms: () => void;
  renderSectionCard: (section: CourseSection) => ReactElement;
  renderRoom: (room: ScheduledRoom) => ReactElement;
  renderClassroomPost: (post: ClassroomPost) => ReactElement;
  pageHeading: (eyebrow: string, title: string, subtitle: string) => ReactElement;
  userName: string;
}

export function OverviewScreen({
  sections,
  classroomPosts,
  rooms,
  subjectCount,
  error,
  onViewSections,
  onViewClassroom,
  onViewRooms,
  renderSectionCard,
  renderRoom,
  renderClassroomPost,
  pageHeading,
  userName,
}: TeacherOverviewProps) {
  return (
    <>
      {pageHeading("Teacher workspace", `Good day, ${userName}.`, "Your teaching sections and upcoming online classes at a glance.")}
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
            <button className="text-link" type="button" onClick={onViewSections}>View all →</button>
          </div>
          {sections.length
            ? <div className="section-grid">{sections.slice(0, 2).map(renderSectionCard)}</div>
            : <div className="empty-state">No sections are assigned to your account yet. Ask an administrator to assign your teaching sections.</div>}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Classroom posts</h2>
            <button className="text-link" type="button" onClick={onViewClassroom}>Create a post →</button>
          </div>
          {classroomPosts.length
            ? <div className="post-list">{classroomPosts.slice(0, 3).map(renderClassroomPost)}</div>
            : <div className="empty-state">Share your first announcement or assignment with a class.</div>}
        </section>
        <section className="panel spaced-panel">
          <div className="panel-heading">
            <h2>Upcoming rooms</h2>
            <button className="text-link" type="button" onClick={onViewRooms}>Manage rooms →</button>
          </div>
          {rooms.length
            ? <div className="room-list">{rooms.slice(0, 3).map(renderRoom)}</div>
            : <div className="empty-state">No upcoming rooms. Schedule one for a subject in your assigned sections.</div>}
        </section>
      </div>
    </>
  );
}
