import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { HttpError, notFoundHandler } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import { loginTeacher, getTeacher, changeTeacherPassword } from "../services/authService";
import { listTeachingSections } from "../services/teacherService";
import { createScheduledRoom, deleteScheduledRoom, listScheduledRooms } from "../services/roomService";
import { createClassroomPost, getClassroomAttachment, listClassroomPosts } from "../services/classroomService";
import { createQuiz, deleteQuiz, generateSubjectQuizzes, getPublicQuiz, listTeacherQuizzes, submitQuiz, updateQuiz } from "../services/quizService";
import { notifyMobileStudents } from "../services/mobileNotificationService";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const quizSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const MAX_CLASSROOM_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const allowedAttachmentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const classroomAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_CLASSROOM_ATTACHMENTS, fileSize: MAX_ATTACHMENT_SIZE },
  fileFilter: (_req, file, callback) => {
    if (allowedAttachmentTypes.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new HttpError(422, "Attachments must be images, PDF, plain text, DOCX, or PPTX files."));
    }
  },
});
const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
const handleClassroomAttachmentUpload = (req: Request, res: Response, next: NextFunction): void => {
  classroomAttachmentUpload.array("attachments", MAX_CLASSROOM_ATTACHMENTS)(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 422;
      res.status(status).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Each attachment must be 10 MB or smaller."
          : "You can attach up to five files to a post.",
      });
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
};

router.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

router.post(
  "/api/auth/login",
  loginLimiter,
  validateBody(z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
  })),
  asyncRoute(async (req, res) => {
    res.json({ success: true, data: await loginTeacher(req.body.email, req.body.password) });
  }),
);

const authRouter = Router();
authRouter.use(authMiddleware);
authRouter.get("/me", asyncRoute(async (req, res) => {
  res.json({ success: true, data: await getTeacher(req.user!.userId) });
}));
authRouter.post(
  "/change-password",
  validateBody(z.object({ newPassword: z.string().min(12).max(128) })),
  asyncRoute(async (req, res) => {
    res.json({ success: true, data: await changeTeacherPassword(req.user!.userId, req.body.newPassword) });
  }),
);
router.use("/api/auth", authRouter);

const quizQuestionSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  options: z.array(z.string().trim().min(1).max(250)).min(2).max(6),
  correctOption: z.number().int().min(0).max(5),
});
const quizSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  dueAt: z.string().datetime(),
  questions: z.array(quizQuestionSchema).min(1).max(50),
});

router.get(
  "/api/quizzes",
  authMiddleware,
  asyncRoute(async (req, res) => {
    res.json({ success: true, data: await listTeacherQuizzes(req.user!.userId) });
  }),
);
router.post(
  "/api/quizzes/generate",
  authMiddleware,
  validateBody(z.object({
    dueAt: z.string().datetime(),
  })),
  asyncRoute(async (req, res) => {
    const result = await generateSubjectQuizzes(req.user!.userId, req.body.dueAt);
    const subjectIds = [...new Set(result.createdQuizzes.map(({ subjectId }) => subjectId))];
    await Promise.all(subjectIds.map((subjectId) => notifyMobileStudents(req.get("authorization"), {
      subjectId,
      type: "QUIZ",
      title: "New quizzes added",
    })));
    res.status(201).json({
      success: true,
      data: result,
    });
  }),
);
router.post(
  "/api/quizzes",
  authMiddleware,
  validateBody(quizSchema),
  asyncRoute(async (req, res) => {
    const quiz = await createQuiz(req.user!.userId, req.body);
    await notifyMobileStudents(req.get("authorization"), {
      subjectId: req.body.subjectId,
      type: "QUIZ",
      title: quiz.title,
    });
    res.status(201).json({
      success: true,
      data: quiz,
    });
  }),
);
router.put(
  "/api/quizzes/:quizId",
  authMiddleware,
  validateBody(quizSchema),
  asyncRoute(async (req, res) => {
    res.json({
      success: true,
      data: await updateQuiz(req.user!.userId, req.params.quizId, req.body),
    });
  }),
);
router.delete(
  "/api/quizzes/:quizId",
  authMiddleware,
  asyncRoute(async (req, res) => {
    res.json({
      success: true,
      data: await deleteQuiz(req.user!.userId, req.params.quizId),
    });
  }),
);
router.get(
  "/api/public/quizzes/:shareCode",
  asyncRoute(async (req, res) => {
    res.json({ success: true, data: await getPublicQuiz(req.params.shareCode) });
  }),
);
router.post(
  "/api/public/quizzes/:shareCode/submissions",
  quizSubmissionLimiter,
  validateBody(z.object({
    studentName: z.string().trim().max(100).default(""),
    answers: z.array(z.number().int().min(0).max(5)).min(1).max(50),
  })),
  asyncRoute(async (req, res) => {
    res.status(201).json({
      success: true,
      data: await submitQuiz(req.params.shareCode, req.body.studentName, req.body.answers),
    });
  }),
);

router.get(
  "/api/admissions/sections",
  authMiddleware,
  asyncRoute(async (req, res) => {
    res.json({ success: true, data: await listTeachingSections(req.user!.userId) });
  }),
);

router.get(
  "/api/rooms",
  authMiddleware,
  asyncRoute(async (req, res) => {
    res.json({ success: true, data: await listScheduledRooms(req.user!.userId) });
  }),
);
router.post(
  "/api/rooms",
  authMiddleware,
  validateBody(z.object({
    subjectId: z.string().uuid(),
  })),
  asyncRoute(async (req, res) => {
    res.status(201).json({
      success: true,
      data: await createScheduledRoom(req.user!.userId, req.body),
    });
  }),
);
router.delete(
  "/api/rooms/:roomId",
  authMiddleware,
  asyncRoute(async (req, res) => {
    res.json({
      success: true,
      data: await deleteScheduledRoom(req.user!.userId, req.params.roomId),
    });
  }),
);

router.get(
  "/api/classroom/posts",
  authMiddleware,
  asyncRoute(async (req, res) => {
    res.json({ success: true, data: await listClassroomPosts(req.user!.userId) });
  }),
);
const classroomPostSchema = z.object({
  subjectId: z.string().uuid(),
  type: z.enum(["ANNOUNCEMENT", "ASSIGNMENT"]),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  dueAt: z.string().datetime().optional(),
}).superRefine((post, context) => {
  if (post.type === "ASSIGNMENT" && !post.dueAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dueAt"],
      message: "A due date and time is required for activities and exams.",
    });
  }
});

router.post(
  "/api/classroom/posts",
  authMiddleware,
  handleClassroomAttachmentUpload,
  validateBody(classroomPostSchema),
  asyncRoute(async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    const post = await createClassroomPost(req.user!.userId, { ...req.body, files });
    await notifyMobileStudents(req.get("authorization"), {
      subjectId: req.body.subjectId,
      type: req.body.type,
      title: post.title,
    });
    res.status(201).json({
      success: true,
      data: post,
    });
  }),
);
router.get(
  "/api/classroom/attachments/:attachmentId",
  authMiddleware,
  (req, res, next) => {
    void getClassroomAttachment(req.user!.userId, req.params.attachmentId)
      .then(({ filePath, originalName }) => {
        res.download(filePath, originalName, (error) => {
          if (!error) return;
          if (res.headersSent) {
            res.destroy(error);
            return;
          }
          next(error);
        });
      })
      .catch(next);
  },
);

router.use("/api", notFoundHandler);

router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }
  console.error("Unhandled API error:", error);
  res.status(500).json({ success: false, message: "Internal server error" });
});

export default router;
