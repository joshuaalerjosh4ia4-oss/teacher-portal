CREATE TYPE "ClassroomPostType" AS ENUM ('ANNOUNCEMENT', 'ASSIGNMENT');

CREATE TABLE "classroom_posts" (
  "id" TEXT NOT NULL,
  "type" "ClassroomPostType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "teacherId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "classroom_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "classroom_posts_subjectId_createdAt_idx"
  ON "classroom_posts"("subjectId", "createdAt");

CREATE INDEX "classroom_posts_teacherId_createdAt_idx"
  ON "classroom_posts"("teacherId", "createdAt");

ALTER TABLE "classroom_posts"
  ADD CONSTRAINT "classroom_posts_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "classroom_posts"
  ADD CONSTRAINT "classroom_posts_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "subjects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
