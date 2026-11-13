CREATE TABLE "quizzes" (
  "id" TEXT NOT NULL,
  "shareCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "teacherId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_questions" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "correctOption" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,

  CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_submissions" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "studentName" TEXT NOT NULL DEFAULT '',
  "answers" JSONB NOT NULL,
  "score" INTEGER NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "correctCount" INTEGER NOT NULL,
  "totalQuestions" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quiz_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quizzes_shareCode_key" ON "quizzes"("shareCode");
CREATE INDEX "quizzes_teacherId_createdAt_idx" ON "quizzes"("teacherId", "createdAt");
CREATE INDEX "quizzes_subjectId_createdAt_idx" ON "quizzes"("subjectId", "createdAt");
CREATE UNIQUE INDEX "quiz_questions_quizId_position_key" ON "quiz_questions"("quizId", "position");
CREATE INDEX "quiz_submissions_quizId_createdAt_idx" ON "quiz_submissions"("quizId", "createdAt");

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quiz_questions"
  ADD CONSTRAINT "quiz_questions_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "quizzes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quiz_submissions"
  ADD CONSTRAINT "quiz_submissions_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "quizzes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
