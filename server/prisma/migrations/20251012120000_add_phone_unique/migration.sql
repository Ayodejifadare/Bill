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

-- Build the duplicate-user map inline with each statement so that it is visible to the
-- Prisma migration runner for the entire script.

-- Tables with user-based uniqueness need conflicting duplicate rows removed prior to
-- rewriting their foreign keys to the canonical user.
WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
,
ranked_notification_preferences AS (
  SELECT
    np.ctid,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(dup.canonical_id, np."userId")
      ORDER BY CASE WHEN dup.duplicate_id IS NULL THEN 0 ELSE 1 END, np."createdAt", np.id
    ) AS rn
  FROM "notification_preferences" np
  LEFT JOIN duplicate_user_map dup
    ON np."userId" = dup.duplicate_id
)
DELETE FROM "notification_preferences" np
USING ranked_notification_preferences ranked
WHERE np.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
,
ranked_verification_codes AS (
  SELECT
    vc.ctid,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(dup.canonical_id, vc."userId"), vc."type"
      ORDER BY CASE WHEN dup.duplicate_id IS NULL THEN 0 ELSE 1 END, vc."expiresAt", vc.id
    ) AS rn
  FROM "verification_codes" vc
  LEFT JOIN duplicate_user_map dup
    ON vc."userId" = dup.duplicate_id
  WHERE vc."userId" IS NOT NULL
)
DELETE FROM "verification_codes" vc
USING ranked_verification_codes ranked
WHERE vc.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
,
ranked_bill_split_participants AS (
  SELECT
    bsp.ctid,
    ROW_NUMBER() OVER (
      PARTITION BY bsp."billSplitId", COALESCE(dup.canonical_id, bsp."userId")
      ORDER BY CASE WHEN dup.duplicate_id IS NULL THEN 0 ELSE 1 END, bsp."id"
    ) AS rn
  FROM "bill_split_participants" bsp
  LEFT JOIN duplicate_user_map dup
    ON bsp."userId" = dup.duplicate_id
)
DELETE FROM "bill_split_participants" bsp
USING ranked_bill_split_participants ranked
WHERE bsp.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
,
ranked_friend_requests_sender AS (
  SELECT
    fr.ctid,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(sender_dup.canonical_id, fr."senderId"),
        COALESCE(receiver_dup.canonical_id, fr."receiverId")
      ORDER BY
        CASE
          WHEN sender_dup.duplicate_id IS NULL AND receiver_dup.duplicate_id IS NULL THEN 0
          WHEN sender_dup.duplicate_id IS NULL OR receiver_dup.duplicate_id IS NULL THEN 1
          ELSE 2
        END,
        fr."createdAt",
        fr.id
    ) AS rn
  FROM "friend_requests" fr
  LEFT JOIN duplicate_user_map sender_dup
    ON fr."senderId" = sender_dup.duplicate_id
  LEFT JOIN duplicate_user_map receiver_dup
    ON fr."receiverId" = receiver_dup.duplicate_id
)
DELETE FROM "friend_requests" fr
USING ranked_friend_requests_sender ranked
WHERE fr.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
,
ranked_friend_requests_receiver AS (
  SELECT
    fr.ctid,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(sender_dup.canonical_id, fr."senderId"),
        COALESCE(receiver_dup.canonical_id, fr."receiverId")
      ORDER BY
        CASE
          WHEN sender_dup.duplicate_id IS NULL AND receiver_dup.duplicate_id IS NULL THEN 0
          WHEN sender_dup.duplicate_id IS NULL OR receiver_dup.duplicate_id IS NULL THEN 1
          ELSE 2
        END,
        fr."createdAt",
        fr.id
    ) AS rn
  FROM "friend_requests" fr
  LEFT JOIN duplicate_user_map sender_dup
    ON fr."senderId" = sender_dup.duplicate_id
  LEFT JOIN duplicate_user_map receiver_dup
    ON fr."receiverId" = receiver_dup.duplicate_id
)
DELETE FROM "friend_requests" fr
USING ranked_friend_requests_receiver ranked
WHERE fr.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
,
ranked_friendships_user1 AS (
  SELECT
    f.ctid,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(user1_dup.canonical_id, f."user1Id"),
        COALESCE(user2_dup.canonical_id, f."user2Id")
      ORDER BY
        CASE
          WHEN user1_dup.duplicate_id IS NULL AND user2_dup.duplicate_id IS NULL THEN 0
          WHEN user1_dup.duplicate_id IS NULL OR user2_dup.duplicate_id IS NULL THEN 1
          ELSE 2
        END,
        f."createdAt",
        f.id
    ) AS rn
  FROM "friendships" f
  LEFT JOIN duplicate_user_map user1_dup
    ON f."user1Id" = user1_dup.duplicate_id
  LEFT JOIN duplicate_user_map user2_dup
    ON f."user2Id" = user2_dup.duplicate_id
)
DELETE FROM "friendships" f
USING ranked_friendships_user1 ranked
WHERE f.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
,
ranked_friendships_user2 AS (
  SELECT
    f.ctid,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(user1_dup.canonical_id, f."user1Id"),
        COALESCE(user2_dup.canonical_id, f."user2Id")
      ORDER BY
        CASE
          WHEN user1_dup.duplicate_id IS NULL AND user2_dup.duplicate_id IS NULL THEN 0
          WHEN user1_dup.duplicate_id IS NULL OR user2_dup.duplicate_id IS NULL THEN 1
          ELSE 2
        END,
        f."createdAt",
        f.id
    ) AS rn
  FROM "friendships" f
  LEFT JOIN duplicate_user_map user1_dup
    ON f."user1Id" = user1_dup.duplicate_id
  LEFT JOIN duplicate_user_map user2_dup
    ON f."user2Id" = user2_dup.duplicate_id
)
DELETE FROM "friendships" f
USING ranked_friendships_user2 ranked
WHERE f.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
,
ranked_group_members AS (
  SELECT
    gm.ctid,
    ROW_NUMBER() OVER (
      PARTITION BY gm."groupId", COALESCE(dup.canonical_id, gm."userId")
      ORDER BY CASE WHEN dup.duplicate_id IS NULL THEN 0 ELSE 1 END, gm."joinedAt", gm."userId"
    ) AS rn
  FROM "group_members" gm
  LEFT JOIN duplicate_user_map dup
    ON gm."userId" = dup.duplicate_id
)
DELETE FROM "group_members" gm
USING ranked_group_members ranked
WHERE gm.ctid = ranked.ctid
  AND ranked.rn > 1;

-- Rewrite foreign key references from duplicate user ids to the canonical id.
WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "transactions" t
SET "senderId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE t."senderId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "transactions" t
SET "receiverId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE t."receiverId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "payment_requests" pr
SET "senderId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE pr."senderId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "payment_requests" pr
SET "receiverId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE pr."receiverId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "bill_splits" bs
SET "createdBy" = dup.canonical_id
FROM duplicate_user_map dup
WHERE bs."createdBy" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "bill_split_participants" bsp
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE bsp."userId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "bill_split_reminders" bsr
SET "senderId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE bsr."senderId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "bill_split_reminders" bsr
SET "recipientId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE bsr."recipientId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "friend_requests" fr
SET "senderId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE fr."senderId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "friend_requests" fr
SET "receiverId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE fr."receiverId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "friendships" f
SET "user1Id" = dup.canonical_id
FROM duplicate_user_map dup
WHERE f."user1Id" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "friendships" f
SET "user2Id" = dup.canonical_id
FROM duplicate_user_map dup
WHERE f."user2Id" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "group_members" gm
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE gm."userId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "group_accounts" ga
SET "createdById" = dup.canonical_id
FROM duplicate_user_map dup
WHERE ga."createdById" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "group_invites" gi
SET "invitedBy" = dup.canonical_id
FROM duplicate_user_map dup
WHERE gi."invitedBy" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "group_invite_links" gil
SET "createdBy" = dup.canonical_id
FROM duplicate_user_map dup
WHERE gil."createdBy" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "notifications" n
SET "recipientId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE n."recipientId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "notifications" n
SET "actorId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE n."actorId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "notification_preferences" np
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE np."userId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "payment_methods" pm
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE pm."userId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "payment_references" pref
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE pref."userId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "security_logs" sl
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE sl."userId" = dup.duplicate_id;

WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
UPDATE "verification_codes" vc
SET "userId" = dup.canonical_id
FROM duplicate_user_map dup
WHERE vc."userId" = dup.duplicate_id;

-- Remove duplicate user accounts now that all references point at the canonical user.
WITH duplicate_user_map AS (
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
  WHERE rn > 1
)
DELETE FROM "users" u
USING duplicate_user_map dup
WHERE u."id" = dup.duplicate_id;

-- Finally, enforce uniqueness on phone numbers.
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
