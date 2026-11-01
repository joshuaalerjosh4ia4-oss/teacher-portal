import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";

const attachmentDirectory = path.resolve(process.cwd(), "uploads", "classroom-posts");
const allowedAttachmentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export async function listClassroomPosts(teacherId: string) {
  return prisma.classroomPost.findMany({
    where: { teacherId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      dueAt: true,
      createdAt: true,
      subject: {
        select: {
          id: true,
          code: true,
          title: true,
          section: { select: { course: true, code: true } },
        },
      },
      attachments: {
        select: { id: true, originalName: true, mimeType: true, size: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createClassroomPost(
  teacherId: string,
  input: {
    subjectId: string;
    type: "ANNOUNCEMENT" | "ASSIGNMENT";
    title: string;
    content: string;
    dueAt?: string;
    files?: Express.Multer.File[];
  },
) {
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, section: { select: { teacherId: true } } },
  });
  if (!subject) throw new HttpError(404, "Subject not found");
  if (subject.section.teacherId !== teacherId) {
    throw new HttpError(403, "You can post only to subjects in sections assigned to you");
  }

  const files = input.files ?? [];
  if (files.some((file) => !allowedAttachmentTypes.has(file.mimetype))) {
    throw new HttpError(422, "Attachments must be images, PDF, plain text, DOCX, or PPTX files.");
  }

  const storedFiles = files.map((file) => ({
    file,
    storedName: `${randomUUID()}.bin`,
    originalName: file.originalname
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 255) || "attachment",
  }));
  const writtenPaths: string[] = [];

  try {
    if (storedFiles.length > 0) {
      await mkdir(attachmentDirectory, { recursive: true });
      for (const { file, storedName } of storedFiles) {
        const filePath = path.join(attachmentDirectory, storedName);
        await writeFile(filePath, file.buffer, { flag: "wx" });
        writtenPaths.push(filePath);
      }
    }

    return await prisma.classroomPost.create({
      data: {
        type: input.type,
        title: input.title,
        content: input.content,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        teacherId,
        subjectId: subject.id,
        attachments: {
          create: storedFiles.map(({ file, storedName, originalName }) => ({
            originalName,
            storedName,
            mimeType: file.mimetype,
            size: file.size,
          })),
        },
      },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        dueAt: true,
        createdAt: true,
        subject: {
          select: {
            id: true,
            code: true,
            title: true,
            section: { select: { course: true, code: true } },
          },
        },
        attachments: {
          select: { id: true, originalName: true, mimeType: true, size: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  } catch (error) {
    await Promise.all(writtenPaths.map((filePath) => unlink(filePath)));
    throw error;
  }
}

export async function getClassroomAttachment(teacherId: string, attachmentId: string) {
  const attachment = await prisma.classroomPostAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      originalName: true,
      storedName: true,
      post: { select: { teacherId: true } },
    },
  });
  if (!attachment || attachment.post.teacherId !== teacherId) {
    throw new HttpError(404, "Attachment not found");
  }

  return {
    originalName: attachment.originalName,
    filePath: path.join(attachmentDirectory, attachment.storedName),
  };
}
