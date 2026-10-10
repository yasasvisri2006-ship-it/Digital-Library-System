CREATE TYPE "CareerApplicationStatus" AS ENUM ('SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "CareerResourceType" AS ENUM ('INTERVIEW_PREPARATION', 'APTITUDE_PRACTICE', 'TECHNICAL_INTERVIEW', 'OTHER');

ALTER TABLE "Project"
  ADD COLUMN "techStack" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "documentation" TEXT,
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Certificate"
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "filePath" TEXT,
  ADD COLUMN "fileName" TEXT,
  ADD COLUMN "fileSize" INTEGER;

CREATE TABLE "ProjectScreenshot" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectScreenshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResumeProfile" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "publicSlug" TEXT NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "displayName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "location" TEXT,
  "summary" TEXT NOT NULL DEFAULT '',
  "linkedInUrl" TEXT,
  "githubUrl" TEXT,
  "portfolioUrl" TEXT,
  "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "education" JSONB NOT NULL DEFAULT '[]',
  "internships" JSONB NOT NULL DEFAULT '[]',
  "achievements" JSONB NOT NULL DEFAULT '[]',
  "publicSections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResumeProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerApplication" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "companyName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3),
  "status" "CareerApplicationStatus" NOT NULL DEFAULT 'SAVED',
  "notes" TEXT,
  "jobUrl" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerResource" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "type" "CareerResourceType" NOT NULL,
  "url" TEXT,
  "notes" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerResource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResumeProfile_ownerId_key" ON "ResumeProfile"("ownerId");
CREATE UNIQUE INDEX "ResumeProfile_publicSlug_key" ON "ResumeProfile"("publicSlug");
CREATE INDEX "ResumeProfile_isPublic_publicSlug_idx" ON "ResumeProfile"("isPublic", "publicSlug");
CREATE INDEX "ProjectScreenshot_ownerId_projectId_idx" ON "ProjectScreenshot"("ownerId", "projectId");
CREATE INDEX "CareerApplication_ownerId_status_appliedAt_idx" ON "CareerApplication"("ownerId", "status", "appliedAt");
CREATE INDEX "CareerResource_ownerId_type_idx" ON "CareerResource"("ownerId", "type");

ALTER TABLE "ProjectScreenshot"
  ADD CONSTRAINT "ProjectScreenshot_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProjectScreenshot_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResumeProfile"
  ADD CONSTRAINT "ResumeProfile_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareerApplication"
  ADD CONSTRAINT "CareerApplication_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareerResource"
  ADD CONSTRAINT "CareerResource_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
