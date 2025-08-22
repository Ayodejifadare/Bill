-- CreateTable
CREATE TABLE "recurring_bill_splits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billSplitId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "day" INTEGER,
    "nextRun" DATETIME NOT NULL,
    CONSTRAINT "recurring_bill_splits_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bill_splits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "location" TEXT,
    "date" DATETIME,
    "note" TEXT,
    "splitMethod" TEXT,
    "paymentMethodId" TEXT,
    "groupId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "bill_splits_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bill_splits_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_bill_splits" ("createdAt", "createdBy", "date", "description", "id", "location", "note", "paymentMethodId", "splitMethod", "status", "title", "totalAmount", "updatedAt") SELECT "createdAt", "createdBy", "date", "description", "id", "location", "note", "paymentMethodId", "splitMethod", "status", "title", "totalAmount", "updatedAt" FROM "bill_splits";
DROP TABLE "bill_splits";
ALTER TABLE "new_bill_splits" RENAME TO "bill_splits";
CREATE TABLE "new_verification_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "target" TEXT,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_verification_codes" ("code", "expiresAt", "id", "target", "type", "userId") SELECT "code", "expiresAt", "id", "target", "type", "userId" FROM "verification_codes";
DROP TABLE "verification_codes";
ALTER TABLE "new_verification_codes" RENAME TO "verification_codes";
CREATE UNIQUE INDEX "verification_codes_userId_type_key" ON "verification_codes"("userId", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "recurring_bill_splits_billSplitId_key" ON "recurring_bill_splits"("billSplitId");
