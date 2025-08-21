/*
  Warnings:

  - You are about to drop the `notification_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "notification_settings_userId_key";

-- AlterTable
ALTER TABLE "bill_splits" ADD COLUMN "date" DATETIME;
ALTER TABLE "bill_splits" ADD COLUMN "location" TEXT;
ALTER TABLE "bill_splits" ADD COLUMN "note" TEXT;
ALTER TABLE "bill_splits" ADD COLUMN "paymentMethodId" TEXT;
ALTER TABLE "bill_splits" ADD COLUMN "splitMethod" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "address" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "dateOfBirth" DATETIME;
ALTER TABLE "users" ADD COLUMN "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN "lastName" TEXT;
ALTER TABLE "users" ADD COLUMN "preferenceSettings" TEXT;
ALTER TABLE "users" ADD COLUMN "privacySettings" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "notification_settings";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "bill_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "billSplitId" TEXT NOT NULL,
    CONSTRAINT "bill_items_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bill_split_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "billSplitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "bill_split_participants_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bill_split_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_bill_split_participants" ("amount", "billSplitId", "id", "isPaid", "userId") SELECT "amount", "billSplitId", "id", "isPaid", "userId" FROM "bill_split_participants";
DROP TABLE "bill_split_participants";
ALTER TABLE "new_bill_split_participants" RENAME TO "bill_split_participants";
CREATE UNIQUE INDEX "bill_split_participants_billSplitId_userId_key" ON "bill_split_participants"("billSplitId", "userId");
CREATE TABLE "new_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionable" BOOLEAN NOT NULL DEFAULT false,
    "amount" REAL,
    "createdAt" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_notifications" ("actionable", "actorId", "amount", "createdAt", "id", "message", "read", "recipientId", "title", "type", "updatedAt") SELECT "actionable", "actorId", "amount", "createdAt", "id", "message", "read", "recipientId", "title", "type", "updatedAt" FROM "notifications";
DROP TABLE "notifications";
ALTER TABLE "new_notifications" RENAME TO "notifications";
CREATE TABLE "new_security_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "device" TEXT,
    "location" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_security_logs" ("action", "createdAt", "device", "id", "location", "suspicious", "userId") SELECT "action", "createdAt", "device", "id", "location", "suspicious", "userId" FROM "security_logs";
DROP TABLE "security_logs";
ALTER TABLE "new_security_logs" RENAME TO "security_logs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");
