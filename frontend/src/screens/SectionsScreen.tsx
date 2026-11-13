import type { ReactNode } from "react";
import type { CourseSection } from "../types";
import { formatSubjectTime } from "../utils/date";

interface SectionsPanelProps {
  sections: CourseSection[];
  error: string;
  onCreatePost: () => void;
  renderSectionCard: (section: CourseSection) => ReactNode;
}

export function SectionsScreen({ sections, error, onCreatePost, renderSectionCard }: SectionsPanelProps) {
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Your teaching</p>
          <h1>My sections</h1>
          <p className="page-subtitle">Only sections assigned to your teacher account are shown.</p>
        </div>
        <button className="button button-primary" type="button" onClick={onCreatePost}>
          Create a post
        </button>
      </header>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {sections.length
        ? <div className="section-grid">{sections.map(renderSectionCard)}</div>
        : <div className="panel"><div className="empty-state">No sections are assigned to your account yet. Ask an administrator to assign your teaching sections.</div></div>}
    </>
  );
}

export function SectionCard({ section }: { section: CourseSection }) {
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
