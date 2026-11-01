import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { HttpError } from "./errorHandler";
import { verifyToken } from "../utils/jwt";

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Missing or invalid Authorization header" });
    return;
  }

  try {
    const payload = verifyToken(header.slice("Bearer ".length).trim());
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true, mustChangePassword: true },
    });
    if (!user || user.role !== "TEACHER") {
      res.status(401).json({ success: false, message: "Invalid or expired token" });
      return;
    }

    const isCurrentUserRequest = req.method === "GET" && req.path === "/me";
    const isPasswordChangeRequest = req.method === "POST" && req.path === "/change-password";
    if (user.mustChangePassword && !isCurrentUserRequest && !isPasswordChangeRequest) {
      throw new HttpError(403, "Change your temporary password before continuing");
    }

    req.user = { userId: user.id, username: user.username };
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof Error && error.name === "JsonWebTokenError") {
      res.status(401).json({ success: false, message: "Invalid or expired token" });
      return;
    }
    next(error);
  }
}
