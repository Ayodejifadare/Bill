-- AlterTable
ALTER TABLE "payment_requests" RENAME COLUMN "frequency" TO "recurringFrequency";
ALTER TABLE "payment_requests" ADD COLUMN "recurringDay" INTEGER;
ALTER TABLE "payment_requests" ADD COLUMN "recurringDayOfWeek" INTEGER;
