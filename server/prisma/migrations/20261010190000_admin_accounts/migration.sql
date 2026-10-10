ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "StudentProfile"
ADD COLUMN "branch" TEXT,
ADD COLUMN "section" TEXT;

CREATE INDEX "User_isActive_role_idx" ON "User"("isActive", "role");
