/*
  Warnings:

  - You are about to alter the column `isDefault` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

*/
-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "metadata" TEXT,
    "transactionId" TEXT,
    "billSplitId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receipts_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "receipts_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "metadata" TEXT,
    "transactionId" TEXT,
    "billSplitId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoices_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payment_methods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "bank" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "sortCode" TEXT,
    "routingNumber" TEXT,
    "accountType" TEXT,
    "provider" TEXT,
    "phoneNumber" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_payment_methods" ("accountName", "accountNumber", "accountType", "bank", "id", "isDefault", "phoneNumber", "provider", "routingNumber", "sortCode", "type", "userId") SELECT "accountName", "accountNumber", "accountType", "bank", "id", "isDefault", "phoneNumber", "provider", "routingNumber", "sortCode", "type", "userId" FROM "payment_methods";
DROP TABLE "payment_methods";
ALTER TABLE "new_payment_methods" RENAME TO "payment_methods";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
