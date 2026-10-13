ALTER TABLE "User" ADD COLUMN "dataScienceModulesInitialized" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DataScienceModule" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataScienceModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataScienceMaterial" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "readerFilePath" TEXT,
    "readerError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataScienceMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataScienceModule_ownerId_number_key" ON "DataScienceModule"("ownerId", "number");
CREATE INDEX "DataScienceModule_ownerId_number_idx" ON "DataScienceModule"("ownerId", "number");
CREATE INDEX "DataScienceMaterial_ownerId_moduleId_createdAt_idx" ON "DataScienceMaterial"("ownerId", "moduleId", "createdAt");
CREATE INDEX "DataScienceMaterial_moduleId_createdAt_idx" ON "DataScienceMaterial"("moduleId", "createdAt");

ALTER TABLE "DataScienceModule" ADD CONSTRAINT "DataScienceModule_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataScienceMaterial" ADD CONSTRAINT "DataScienceMaterial_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataScienceMaterial" ADD CONSTRAINT "DataScienceMaterial_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "DataScienceModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
