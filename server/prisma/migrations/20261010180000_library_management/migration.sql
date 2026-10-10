ALTER TABLE "Book"
  ADD COLUMN "department" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Book_department_isActive_idx" ON "Book"("department", "isActive");
CREATE INDEX "Book_isActive_createdAt_idx" ON "Book"("isActive", "createdAt");
CREATE INDEX "Issue_status_issuedAt_idx" ON "Issue"("status", "issuedAt");

CREATE UNIQUE INDEX "Issue_one_active_book_per_student_key"
  ON "Issue"("userId", "bookId")
  WHERE "status" = 'ACTIVE';
