import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { signToken } from "../utils/jwt";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function loginTeacher(emailInput: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(emailInput) },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (user.role !== "TEACHER") {
    throw new HttpError(403, "Only teacher accounts can sign in to this portal");
  }
  if (!user.emailVerified) {
    throw new HttpError(403, "Please verify your email before signing in");
  }

  return {
    token: signToken({ userId: user.id, username: user.username }),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export async function getTeacher(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, role: true, mustChangePassword: true },
  });
  if (!user || user.role !== "TEACHER") throw new HttpError(404, "Teacher account not found");
  return user;
}

export async function changeTeacherPassword(userId: string, newPassword: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mustChangePassword: true, role: true },
  });
  if (user?.role !== "TEACHER") throw new HttpError(404, "Teacher account not found");
  if (!user.mustChangePassword) throw new HttpError(400, "No temporary password change is required");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
  return { changed: true as const };
}
