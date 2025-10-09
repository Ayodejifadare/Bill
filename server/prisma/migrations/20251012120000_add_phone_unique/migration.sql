-- First, normalise all phone numbers by trimming whitespace so that stray spaces do not
-- create seemingly different values that would later violate the unique constraint.
UPDATE "users"
SET phone = NULLIF(TRIM(phone), '')
WHERE phone IS NOT NULL;

-- Clear duplicate phone numbers prior to enforcing uniqueness while keeping the oldest
-- entry for each phone number. We avoid deleting user accounts because they are
-- referenced by many foreign key relationships. Instead, we set the duplicate phone
-- numbers to NULL so the user can re-add a unique number later.
WITH duplicates AS (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY phone
        ORDER BY "createdAt" ASC, id ASC
      ) AS rn
    FROM "users"
    WHERE phone IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1
)
UPDATE "users" u
SET phone = NULL
FROM duplicates d
WHERE u.id = d.id;

-- Ensure phone numbers are unique
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
