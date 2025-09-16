-- CreateTable
CREATE TABLE "payment_references" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billSplitId" TEXT,
    "transactionId" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_references_code_key" ON "payment_references"("code");

-- CreateIndex
CREATE INDEX "payment_references_billSplitId_idx" ON "payment_references"("billSplitId");

-- CreateIndex
CREATE INDEX "payment_references_transactionId_idx" ON "payment_references"("transactionId");

-- AddForeignKey
ALTER TABLE "payment_references" ADD CONSTRAINT "payment_references_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_references" ADD CONSTRAINT "payment_references_billSplitId_fkey" FOREIGN KEY ("billSplitId") REFERENCES "bill_splits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_references" ADD CONSTRAINT "payment_references_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
