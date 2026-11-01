import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        success: false,
        message: result.error.issues.map((issue) => issue.message).join(", "),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
