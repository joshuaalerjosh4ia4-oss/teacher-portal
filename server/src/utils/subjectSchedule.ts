export function getNextSubjectMeeting(schedule: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): { startsAt: Date; endsAt: Date } | null {
  const startTime = parseSubjectTime(schedule.startTime);
  const endTime = parseSubjectTime(schedule.endTime);
  if (
    !startTime ||
    !endTime ||
    toMinutes(endTime) <= toMinutes(startTime) ||
    schedule.dayOfWeek < 1 ||
    schedule.dayOfWeek > 7
  ) {
    return null;
  }

  const now = new Date();
  const startsAt = new Date(now);
  startsAt.setDate(now.getDate() + ((schedule.dayOfWeek % 7 - now.getDay() + 7) % 7));
  startsAt.setHours(startTime.hours, startTime.minutes, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setHours(endTime.hours, endTime.minutes, 0, 0);
  if (endsAt <= now) {
    startsAt.setDate(startsAt.getDate() + 7);
    endsAt.setDate(endsAt.getDate() + 7);
  }
  return { startsAt, endsAt };
}

function parseSubjectTime(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 ? { hours, minutes } : null;
}

function toMinutes(time: { hours: number; minutes: number }): number {
  return time.hours * 60 + time.minutes;
}
