-- Remove duplicate phone numbers prior to enforcing uniqueness while keeping the oldest entry
WITH duplicates AS (
  SELECT ctid
  FROM (
    SELECT
      ctid,
      row_number() OVER (
        PARTITION BY phone
        ORDER BY "createdAt" ASC, id ASC
      ) AS rn
    FROM "users"
    WHERE phone IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1
)
DELETE FROM "users" u
USING duplicates d
WHERE u.ctid = d.ctid;

-- Ensure phone numbers are unique
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
