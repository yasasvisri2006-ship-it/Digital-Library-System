-- Add resource categories for user-maintained syllabus and coursework records.
ALTER TYPE "ResourceType" ADD VALUE 'SYLLABUS';
ALTER TYPE "ResourceType" ADD VALUE 'ASSIGNMENT';
ALTER TYPE "ResourceType" ADD VALUE 'REFERENCE';

DROP INDEX "Subject_code_key";

ALTER TABLE "AcademicResource"
ADD COLUMN "fileName" TEXT,
ADD COLUMN "filePath" TEXT,
ADD COLUMN "fileSize" INTEGER,
ADD COLUMN "isReviewed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Subject"
ADD COLUMN "semester" TEXT,
ALTER COLUMN "code" DROP NOT NULL;

CREATE UNIQUE INDEX "Subject_ownerId_code_key" ON "Subject"("ownerId", "code");
