import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

async function requireTeacher(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== "TEACHER") throw new HttpError(403, "Only teachers can access this workspace");
}

export async function listTeachingSections(teacherId: string) {
  await requireTeacher(teacherId);
  return prisma.courseSection.findMany({
    where: { teacherId },
    select: {
      id: true,
      code: true,
      course: true,
      yearLevel: true,
      semester: true,
      subjects: {
        select: {
          id: true,
          code: true,
          title: true,
          units: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },
        orderBy: { code: "asc" },
      },
    },
    orderBy: [{ course: "asc" }, { yearLevel: "asc" }, { code: "asc" }],
  });
}
