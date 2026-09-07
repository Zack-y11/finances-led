-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN "actionTargetId" UUID;

-- Backfill account targets from existing user-owned names.
UPDATE "AutomationRule" AS rule
SET "actionTargetId" = account."id"
FROM "Account" AS account
WHERE rule."userId" = account."userId"
  AND rule."actionField" = 'account'
  AND LOWER(rule."actionValue") = LOWER(account."name");

-- Backfill category targets from existing user-owned names.
UPDATE "AutomationRule" AS rule
SET "actionTargetId" = category."id"
FROM "Category" AS category
WHERE rule."userId" = category."userId"
  AND rule."actionField" = 'category'
  AND LOWER(rule."actionValue") = LOWER(category."name");

-- Unmatched legacy rules cannot be applied safely.
UPDATE "AutomationRule"
SET "isEnabled" = false
WHERE "actionTargetId" IS NULL;

ALTER TABLE "AutomationRule" DROP COLUMN "actionValue";

-- CreateEnum
CREATE TYPE "InputSessionStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'DISMISSED', 'FAILED');

-- CreateTable
CREATE TABLE "InputSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ledgerEntryId" UUID,
    "modality" "InputMethod" NOT NULL DEFAULT 'TEXT',
    "status" "InputSessionStatus" NOT NULL DEFAULT 'PROPOSED',
    "parsedPayload" JSONB,
    "confidence" DECIMAL(4,3),
    "appliedRuleIds" JSONB,
    "failureCode" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InputSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InputSession_ledgerEntryId_key" ON "InputSession"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "InputSession_userId_status_createdAt_idx" ON "InputSession"("userId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "InputSession" ADD CONSTRAINT "InputSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputSession" ADD CONSTRAINT "InputSession_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
