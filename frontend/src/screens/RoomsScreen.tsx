import type { FormEvent, ReactNode } from "react";
import { ErrorBanner } from "../components/Brand";
import { formatSubjectTime } from "../utils/date";
import type { ScheduledRoom, CourseSection } from "../types";

interface RoomsPanelProps {
  sections: CourseSection[];
  rooms: ScheduledRoom[];
  error: string;
  isSubmitting: boolean;
  deletingRoomId: string | null;
  onScheduleRoom: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteRoom: (room: ScheduledRoom) => void;
  onCopyRoomDetails: (room: ScheduledRoom) => void;
  pageHeading: (eyebrow: string, title: string, subtitle: string) => ReactNode;
}

export function RoomsScreen({
  sections,
  rooms,
  error,
  isSubmitting,
  deletingRoomId,
  onScheduleRoom,
  onDeleteRoom,
  onCopyRoomDetails,
  pageHeading,
}: RoomsPanelProps) {
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
            <form className="schedule-form" onSubmit={onScheduleRoom}>
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
          ? <div className="room-list">{rooms.map((room) => <RoomCard key={room.id} room={room} deletingRoomId={deletingRoomId} onCopyRoomDetails={onCopyRoomDetails} onDeleteRoom={onDeleteRoom} />)}</div>
          : <div className="empty-state">No upcoming rooms. Schedule your first class above.</div>}
      </section>
    </>
  );
}

function RoomCard({
  room,
  deletingRoomId,
  onCopyRoomDetails,
  onDeleteRoom,
}: {
  room: ScheduledRoom;
  deletingRoomId: string | null;
  onCopyRoomDetails: (room: ScheduledRoom) => void;
  onDeleteRoom: (room: ScheduledRoom) => void;
}) {
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
          <button className="button button-secondary button-small" type="button" onClick={() => onCopyRoomDetails(room)}>
            Copy meeting details
          </button>
          <button
            className="button button-danger button-small"
            type="button"
            onClick={() => onDeleteRoom(room)}
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
