CREATE TABLE "payment_methods" (
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
  "isDefault" INTEGER NOT NULL DEFAULT 0,
  "userId" TEXT NOT NULL,
  CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
