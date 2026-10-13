WITH canonical_owner AS (
    SELECT "ownerId"
    FROM "DataScienceModule"
    WHERE "isPublic" = true
    ORDER BY "number", "createdAt", "ownerId"
    LIMIT 1
),
fallback_owner AS (
    SELECT "id" AS "ownerId"
    FROM "User"
    WHERE NOT EXISTS (SELECT 1 FROM canonical_owner)
    ORDER BY "createdAt", "id"
    LIMIT 1
),
selected_owner AS (
    SELECT "ownerId" FROM canonical_owner
    UNION ALL
    SELECT "ownerId" FROM fallback_owner
)
INSERT INTO "DataScienceModule" (
    "id",
    "ownerId",
    "number",
    "title",
    "isPublic",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    selected_owner."ownerId",
    numbers."number",
    'Module ' || LPAD(numbers."number"::text, 2, '0'),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM selected_owner
CROSS JOIN generate_series(1, 5) AS numbers("number")
WHERE NOT EXISTS (
    SELECT 1
    FROM "DataScienceModule" AS existing_public
    WHERE existing_public."number" = numbers."number"
      AND existing_public."isPublic" = true
      AND existing_public."ownerId" <> selected_owner."ownerId"
)
ON CONFLICT ("ownerId", "number")
DO UPDATE SET "isPublic" = true;
