import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/errorHandler";
import { getSubjectQuizTemplates } from "./quizTemplates";

export interface QuizQuestionInput {
  prompt: string;
  options: string[];
  correctOption: number;
}

export interface QuizInput {
  subjectId: string;
  title: string;
  description: string;
  dueAt: string | null;
  questions: QuizQuestionInput[];
}

const quizSelect = {
  id: true,
  shareCode: true,
  title: true,
  description: true,
  dueAt: true,
  createdAt: true,
  updatedAt: true,
  subject: {
    select: {
      id: true,
      code: true,
      title: true,
      section: { select: { course: true, code: true } },
    },
  },
  questions: {
    select: { id: true, prompt: true, options: true, correctOption: true, position: true },
    orderBy: { position: "asc" as const },
  },
  submissions: {
    select: {
      id: true,
      studentName: true,
      score: true,
      maxScore: true,
      correctCount: true,
      totalQuestions: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
};

function assertQuestions(questions: QuizQuestionInput[]) {
  if (questions.some((question) => question.correctOption >= question.options.length)) {
    throw new HttpError(422, "Each correct answer must match one of its answer choices.");
  }
}

export async function listTeacherQuizzes(teacherId: string) {
  return prisma.quiz.findMany({
    where: { teacherId },
    select: quizSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export async function createQuiz(teacherId: string, input: QuizInput) {
  assertQuestions(input.questions);
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, section: { select: { teacherId: true } } },
  });
  if (!subject) throw new HttpError(404, "Subject not found");
  if (subject.section.teacherId !== teacherId) {
    throw new HttpError(403, "You can create quizzes only for subjects in sections assigned to you");
  }

  return prisma.quiz.create({
    data: {
      shareCode: randomUUID(),
      title: input.title,
      description: input.description,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      teacherId,
      subjectId: subject.id,
      questions: {
        create: input.questions.map((question, position) => ({
          prompt: question.prompt,
          options: question.options,
          correctOption: question.correctOption,
          position,
        })),
      },
    },
    select: quizSelect,
  });
}

export async function generateSubjectQuizzes(teacherId: string, dueAt: string) {
  const subjects = await prisma.subject.findMany({
    where: { section: { teacherId } },
    select: {
      id: true,
      code: true,
      title: true,
      quizzes: { where: { teacherId }, select: { id: true } },
    },
    orderBy: [{ code: "asc" }, { title: "asc" }, { id: "asc" }],
  });
  const createOperations = [];
  const createdQuizzes: Array<{ subjectId: string; title: string }> = [];
  const skippedSubjects: Array<{ code: string; title: string }> = [];
  let subjectsUpdated = 0;
  let generatedCount = 0;

  for (const subject of subjects) {
    const templates = getSubjectQuizTemplates(subject.code);
    if (!templates) {
      if (subject.quizzes.length < 10) {
        skippedSubjects.push({ code: subject.code, title: subject.title });
      }
      continue;
    }

    const missingCount = Math.max(0, 10 - subject.quizzes.length);
    if (missingCount === 0) continue;

    subjectsUpdated += 1;
    generatedCount += missingCount;
    for (const template of templates.slice(subject.quizzes.length, 10)) {
      createdQuizzes.push({ subjectId: subject.id, title: template.title });
      createOperations.push(prisma.quiz.create({
        data: {
          shareCode: randomUUID(),
          title: template.title,
          description: template.description,
          dueAt: new Date(dueAt),
          teacherId,
          subjectId: subject.id,
          questions: {
            create: template.questions.map((question, position) => ({
              prompt: question.prompt,
              options: question.options,
              correctOption: question.correctOption,
              position,
            })),
          },
        },
      }));
    }
  }

  if (createOperations.length > 0) {
    await prisma.$transaction(createOperations);
  }

  return { generatedCount, subjectsUpdated, skippedSubjects, createdQuizzes };
}

export async function updateQuiz(teacherId: string, quizId: string, input: QuizInput) {
  assertQuestions(input.questions);
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true, section: { select: { teacherId: true } } },
  });
  if (!subject) throw new HttpError(404, "Subject not found");
  if (subject.section.teacherId !== teacherId) {
    throw new HttpError(403, "You can create quizzes only for subjects in sections assigned to you");
  }

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, teacherId }, select: { id: true } });
  if (!quiz) throw new HttpError(404, "Quiz not found");

  return prisma.$transaction(async (transaction) => {
    await transaction.quizQuestion.deleteMany({ where: { quizId } });
    return transaction.quiz.update({
      where: { id: quizId },
      data: {
        title: input.title,
        description: input.description,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        subjectId: subject.id,
        questions: {
          create: input.questions.map((question, position) => ({
            prompt: question.prompt,
            options: question.options,
            correctOption: question.correctOption,
            position,
          })),
        },
      },
      select: quizSelect,
    });
  });
}

export async function deleteQuiz(teacherId: string, quizId: string) {
  const result = await prisma.quiz.deleteMany({ where: { id: quizId, teacherId } });
  if (result.count === 0) throw new HttpError(404, "Quiz not found");
  return { deleted: true as const };
}

export async function getPublicQuiz(shareCode: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { shareCode },
    select: {
      id: true,
      title: true,
      description: true,
      dueAt: true,
      subject: { select: { title: true, code: true, section: { select: { course: true, code: true } } } },
      questions: {
        select: { id: true, prompt: true, options: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!quiz) throw new HttpError(404, "Quiz not found");
  return quiz;
}

export async function submitQuiz(
  shareCode: string,
  studentName: string,
  answers: number[],
) {
  const quiz = await prisma.quiz.findUnique({
    where: { shareCode },
    select: {
      id: true,
      dueAt: true,
      questions: { select: { correctOption: true, options: true }, orderBy: { position: "asc" } },
    },
  });
  if (!quiz) throw new HttpError(404, "Quiz not found");
  if (quiz.dueAt && quiz.dueAt.getTime() <= Date.now()) {
    throw new HttpError(410, "This quiz is closed because its due date has passed.");
  }
  if (answers.length !== quiz.questions.length) {
    throw new HttpError(422, "Answer every question before submitting.");
  }
  if (answers.some((answer, index) => {
    const options = quiz.questions[index].options;
    return !Array.isArray(options) || answer >= options.length;
  })) {
    throw new HttpError(422, "Choose a valid answer for every question.");
  }

  const correctCount = answers.reduce(
    (count, answer, index) => count + (answer === quiz.questions[index].correctOption ? 1 : 0),
    0,
  );
  const totalQuestions = quiz.questions.length;
  const result = await prisma.quizSubmission.create({
    data: {
      quizId: quiz.id,
      studentName,
      answers,
      score: correctCount,
      maxScore: totalQuestions,
      correctCount,
      totalQuestions,
    },
    select: { score: true, maxScore: true, correctCount: true, totalQuestions: true },
  });
  return { ...result, percentage: Math.round((correctCount / totalQuestions) * 100) };
}
