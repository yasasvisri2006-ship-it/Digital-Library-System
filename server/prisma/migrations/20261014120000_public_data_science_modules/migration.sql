ALTER TABLE "DataScienceModule"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DataScienceMaterial"
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;

WITH canonical_owner AS (
    SELECT "ownerId"
    FROM "DataScienceModule"
    GROUP BY "ownerId"
    ORDER BY MIN("createdAt"), "ownerId"
    LIMIT 1
),
canonical_modules AS (
    SELECT module."id"
    FROM "DataScienceModule" AS module
    JOIN canonical_owner ON canonical_owner."ownerId" = module."ownerId"
    WHERE module."number" BETWEEN 1 AND 5
)
UPDATE "DataScienceModule"
SET "isPublic" = true
WHERE "id" IN (SELECT "id" FROM canonical_modules);

CREATE UNIQUE INDEX "DataScienceModule_public_number_key"
ON "DataScienceModule"("number")
WHERE "isPublic" = true;
