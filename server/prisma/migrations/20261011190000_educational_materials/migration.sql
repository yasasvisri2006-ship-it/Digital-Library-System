CREATE TABLE "EducationalMaterial" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subjectName" TEXT,
    "semester" TEXT,
    "moduleNumber" INTEGER,
    "category" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "sourceUrl" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationalMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EducationalMaterial_slug_key" ON "EducationalMaterial"("slug");
CREATE INDEX "EducationalMaterial_section_sortOrder_idx" ON "EducationalMaterial"("section", "sortOrder");
CREATE INDEX "EducationalMaterial_subjectName_moduleNumber_idx" ON "EducationalMaterial"("subjectName", "moduleNumber");
