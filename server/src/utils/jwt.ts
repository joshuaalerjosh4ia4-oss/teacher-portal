import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthPayload {
  userId: string;
  username: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (
    typeof decoded === "object" &&
    decoded !== null &&
    "userId" in decoded &&
    "username" in decoded
  ) {
    return { userId: String(decoded.userId), username: String(decoded.username) };
  }
  throw new Error("Invalid token payload");
}
