import type { ErrorRequestHandler, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }
  console.error("Unhandled API error:", error);
  res.status(500).json({ success: false, message: "Internal server error" });
};
