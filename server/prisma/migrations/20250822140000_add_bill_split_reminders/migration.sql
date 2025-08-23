CREATE TABLE "bill_split_reminders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "billSplitId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "template" TEXT,
  "channels" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bill_split_reminders_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bill_split_reminders_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bill_split_reminders_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
