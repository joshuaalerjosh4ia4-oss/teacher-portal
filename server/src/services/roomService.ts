import { randomInt } from "node:crypto";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { getNextSubjectMeeting } from "../utils/subjectSchedule";

export async function listScheduledRooms(teacherId: string) {
  return prisma.room.findMany({
    where: {
      ownerId: teacherId,
      subjectId: { not: null },
      endsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      passcode: true,
      startsAt: true,
      endsAt: true,
      subject: {
        select: {
          id: true,
          code: true,
          title: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          section: { select: { course: true, code: true } },
        },
      },
    },
  });
}

export async function createScheduledRoom(
  teacherId: string,
  input: { subjectId: string },
) {
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      section: { select: { teacherId: true } },
    },
  });
  if (!subject) throw new HttpError(404, "Subject not found");
  if (subject.section.teacherId !== teacherId) {
    throw new HttpError(403, "You can schedule rooms only for subjects in sections assigned to you");
  }

  const meeting = getNextSubjectMeeting(subject);
  if (!meeting) {
    throw new HttpError(422, "This subject has an invalid schedule. Ask an administrator to correct it.");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.room.create({
        data: {
          id: randomInt(100_000_000, 1_000_000_000).toString(),
          passcode: randomInt(100_000, 1_000_000).toString(),
          ownerId: teacherId,
          subjectId: subject.id,
          startsAt: meeting.startsAt,
          endsAt: meeting.endsAt,
        },
        select: {
          id: true,
          passcode: true,
          startsAt: true,
          endsAt: true,
          subject: {
            select: {
              id: true,
              code: true,
              title: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              section: { select: { course: true, code: true } },
            },
          },
        },
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002" &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new HttpError(503, "Could not allocate a unique room ID. Please try again.");
}

export async function deleteScheduledRoom(teacherId: string, roomId: string) {
  const result = await prisma.room.deleteMany({
    where: {
      id: roomId,
      ownerId: teacherId,
      subjectId: { not: null },
    },
  });
  if (result.count === 0) throw new HttpError(404, "Room not found");
  return { deleted: true as const };
}
