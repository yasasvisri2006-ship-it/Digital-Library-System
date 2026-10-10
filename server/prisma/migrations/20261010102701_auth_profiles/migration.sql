-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "photoPath" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
