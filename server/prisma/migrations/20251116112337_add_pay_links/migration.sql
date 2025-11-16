-- CreateTable
CREATE TABLE "pay_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "paymentRequestId" TEXT,
    "slug" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pay_links_paymentRequestId_key" ON "pay_links"("paymentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "pay_links_slug_key" ON "pay_links"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pay_links_token_key" ON "pay_links"("token");

-- AddForeignKey
ALTER TABLE "pay_links" ADD CONSTRAINT "pay_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_links" ADD CONSTRAINT "pay_links_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_links" ADD CONSTRAINT "pay_links_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
