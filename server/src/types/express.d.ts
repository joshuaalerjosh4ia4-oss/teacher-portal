import type { AuthPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export {};
