CREATE TYPE "CodingLanguage" AS ENUM ('PYTHON', 'SQL', 'JAVA', 'CPP', 'DSA');
CREATE TYPE "CodingEventType" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'COMPLETED', 'REOPENED', 'BOOKMARKED', 'UNBOOKMARKED', 'NOTE_UPDATED');
CREATE TYPE "CertificateCategory" AS ENUM ('GENERAL', 'AWS_CLOUD');

ALTER TABLE "CodingProblem"
  ADD COLUMN "language" "CodingLanguage" NOT NULL DEFAULT 'PYTHON',
  ADD COLUMN "topic" TEXT,
  ADD COLUMN "solutionNotes" TEXT,
  ADD COLUMN "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "Certificate"
  ADD COLUMN "category" "CertificateCategory" NOT NULL DEFAULT 'GENERAL';

CREATE TABLE "CodingPracticeEvent" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "problemId" UUID,
  "problemTitle" TEXT NOT NULL,
  "eventType" "CodingEventType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CodingPracticeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningProgress" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "trackKey" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "percentComplete" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CloudLabNote" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "isComplete" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CloudLabNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CodingProblem_ownerId_language_difficulty_idx" ON "CodingProblem"("ownerId", "language", "difficulty");
CREATE INDEX "CodingProblem_ownerId_isCompleted_isBookmarked_idx" ON "CodingProblem"("ownerId", "isCompleted", "isBookmarked");
CREATE INDEX "CodingPracticeEvent_ownerId_createdAt_idx" ON "CodingPracticeEvent"("ownerId", "createdAt");
CREATE INDEX "CodingPracticeEvent_problemId_idx" ON "CodingPracticeEvent"("problemId");
CREATE UNIQUE INDEX "LearningProgress_ownerId_trackKey_key" ON "LearningProgress"("ownerId", "trackKey");
CREATE INDEX "LearningProgress_ownerId_updatedAt_idx" ON "LearningProgress"("ownerId", "updatedAt");
CREATE INDEX "CloudLabNote_ownerId_updatedAt_idx" ON "CloudLabNote"("ownerId", "updatedAt");

ALTER TABLE "CodingPracticeEvent"
  ADD CONSTRAINT "CodingPracticeEvent_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CodingPracticeEvent_problemId_fkey"
  FOREIGN KEY ("problemId") REFERENCES "CodingProblem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LearningProgress"
  ADD CONSTRAINT "LearningProgress_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CloudLabNote"
  ADD CONSTRAINT "CloudLabNote_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
