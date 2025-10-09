-- Normalise phone numbers before enforcing uniqueness so that stray whitespace does not
-- create multiple distinct values for the same number.
UPDATE "users"
SET phone = NULLIF(TRIM(phone), '')
WHERE phone IS NOT NULL;

-- Lock user-related tables to prevent concurrent writes creating new duplicates while we
-- migrate existing data.
LOCK TABLE
  "users",
  "transactions",
  "payment_requests",
  "bill_splits",
  "bill_split_participants",
  "bill_split_reminders",
  "friendships",
  "friend_requests",
  "group_members",
  "group_accounts",
  "group_invites",
  "group_invite_links",
  "notifications",
  "notification_preferences",
  "payment_methods",
  "payment_references",
  "security_logs",
  "verification_codes"
IN SHARE ROW EXCLUSIVE MODE;

-- Build the duplicate-user map by selecting all non-canonical accounts into a temporary
-- table that we can reuse across the rest of the migration.
CREATE TEMP TABLE duplicate_user_map AS
SELECT
  phone,
  canonical_id,
  id AS duplicate_id
FROM (
  SELECT
    id,
    phone,
    FIRST_VALUE(id) OVER (
      PARTITION BY phone
      ORDER BY "createdAt" ASC, id ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "users"
  WHERE phone IS NOT NULL
) ranked_users
WHERE rn > 1;

-- Tables with user-based uniqueness need conflicting duplicate rows removed prior to
-- rewriting their foreign keys to the canonical user.
DELETE FROM "notification_preferences" np
USING duplicate_user_map dup
WHERE np."userId" = dup.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM "notification_preferences" existing
    WHERE existing."userId" = dup.canonical_id
  );

DELETE FROM "verification_codes" vc
USING duplicate_user_map dup
WHERE vc."userId" = dup.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM "verification_codes" existing
    WHERE existing."userId" = dup.canonical_id
      AND existing."type" = vc."type"
  );

DELETE FROM "bill_split_participants" bsp
USING duplicate_user_map dup
WHERE bsp."userId" = dup.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM "bill_split_participants" existing
    WHERE existing."billSplitId" = bsp."billSplitId"
      AND existing."userId" = dup.canonical_id
  );

DELETE FROM "friend_requests" fr
USING duplicate_user_map dup
WHERE fr."senderId" = dup.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM "friend_requests" existing
    WHERE existing."senderId" = dup.canonical_id
      AND existing."receiverId" = fr."receiverId"
  );

DELETE FROM "friend_requests" fr
USING duplicate_user_map dup
WHERE fr."receiverId" = dup.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM "friend_requests" existing
    WHERE existing."receiverId" = dup.canonical_id
      AND existing."senderId" = fr."senderId"
  );

DELETE FROM "friendships" f
USING duplicate_user_map dup
WHERE f."user1Id" = dup.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM "friendships" existing
    WHERE existing."user1Id" = dup.canonical_id
      AND existing."user2Id" = f."user2Id"
  );

DELETE FROM "friendships" f
USING duplicate_user_map dup
WHERE f."user2Id" = dup.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM "friendships" existing
    WHERE existing."user2Id" = dup.canonical_id
      AND existing."user1Id" = f."user1Id"
  );

DELETE FROM "group_members" gm
USING duplicate_user_map dup
WHERE gm."userId" = dup.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM "group_members" existing
    WHERE existing."groupId" = gm."groupId"
      AND existing."userId" = dup.canonical_id
  );

-- Rewrite foreign key references from duplicate user ids to the canonical id.
UPDATE "transactions" t
SET "senderId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE t."senderId" = dup.duplicate_id;

UPDATE "transactions" t
SET "receiverId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE t."receiverId" = dup.duplicate_id;

UPDATE "payment_requests" pr
SET "senderId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE pr."senderId" = dup.duplicate_id;

UPDATE "payment_requests" pr
SET "receiverId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE pr."receiverId" = dup.duplicate_id;

UPDATE "bill_splits" bs
SET "createdBy" = dup.canonical_id
FROM duplicate_user_map dup
WHERE bs."createdBy" = dup.duplicate_id;

UPDATE "bill_split_participants" bsp
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE bsp."userId" = dup.duplicate_id;

UPDATE "bill_split_reminders" bsr
SET "senderId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE bsr."senderId" = dup.duplicate_id;

UPDATE "bill_split_reminders" bsr
SET "recipientId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE bsr."recipientId" = dup.duplicate_id;

UPDATE "friend_requests" fr
SET "senderId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE fr."senderId" = dup.duplicate_id;

UPDATE "friend_requests" fr
SET "receiverId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE fr."receiverId" = dup.duplicate_id;

UPDATE "friendships" f
SET "user1Id" = dup.canonical_id
FROM duplicate_user_map dup
WHERE f."user1Id" = dup.duplicate_id;

UPDATE "friendships" f
SET "user2Id" = dup.canonical_id
FROM duplicate_user_map dup
WHERE f."user2Id" = dup.duplicate_id;

UPDATE "group_members" gm
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE gm."userId" = dup.duplicate_id;

UPDATE "group_accounts" ga
SET "createdById" = dup.canonical_id
FROM duplicate_user_map dup
WHERE ga."createdById" = dup.duplicate_id;

UPDATE "group_invites" gi
SET "invitedBy" = dup.canonical_id
FROM duplicate_user_map dup
WHERE gi."invitedBy" = dup.duplicate_id;

UPDATE "group_invite_links" gil
SET "createdBy" = dup.canonical_id
FROM duplicate_user_map dup
WHERE gil."createdBy" = dup.duplicate_id;

UPDATE "notifications" n
SET "recipientId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE n."recipientId" = dup.duplicate_id;

UPDATE "notifications" n
SET "actorId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE n."actorId" = dup.duplicate_id;

UPDATE "notification_preferences" np
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE np."userId" = dup.duplicate_id;

UPDATE "payment_methods" pm
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE pm."userId" = dup.duplicate_id;

UPDATE "payment_references" pref
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE pref."userId" = dup.duplicate_id;

UPDATE "security_logs" sl
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE sl."userId" = dup.duplicate_id;

UPDATE "verification_codes" vc
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE vc."userId" = dup.duplicate_id;

-- Remove duplicate user accounts now that all references point at the canonical user.
DELETE FROM "users" u
USING duplicate_user_map dup
WHERE u."id" = dup.duplicate_id;

-- Clean up the temporary mapping table (it will also drop automatically on commit).
DROP TABLE duplicate_user_map;

-- Finally, enforce uniqueness on phone numbers.
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
