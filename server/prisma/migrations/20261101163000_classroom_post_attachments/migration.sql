CREATE TABLE "classroom_post_attachments" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "classroom_post_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "classroom_post_attachments_storedName_key"
  ON "classroom_post_attachments"("storedName");

CREATE INDEX "classroom_post_attachments_postId_idx"
  ON "classroom_post_attachments"("postId");

ALTER TABLE "classroom_post_attachments"
  ADD CONSTRAINT "classroom_post_attachments_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "classroom_posts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
