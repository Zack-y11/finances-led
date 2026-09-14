-- Persist user-owned automation rules (schema existed without a migration)
-- and add merchant normalization tables for Phase 6.

CREATE TABLE IF NOT EXISTS "AutomationRule" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "conditionField" TEXT NOT NULL,
    "conditionOp" TEXT NOT NULL,
    "conditionValue" TEXT NOT NULL,
    "actionField" TEXT NOT NULL,
    "actionValue" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationRule_userId_priority_idx" ON "AutomationRule"("userId", "priority");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AutomationRule_userId_fkey'
    ) THEN
        ALTER TABLE "AutomationRule"
            ADD CONSTRAINT "AutomationRule_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE "Merchant" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "defaultCategoryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Merchant_userId_normalizedKey_key" ON "Merchant"("userId", "normalizedKey");
CREATE INDEX "Merchant_userId_idx" ON "Merchant"("userId");
CREATE INDEX "Merchant_defaultCategoryId_idx" ON "Merchant"("defaultCategoryId");

ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MerchantAlias" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MerchantAlias_userId_normalizedKey_key" ON "MerchantAlias"("userId", "normalizedKey");
CREATE INDEX "MerchantAlias_merchantId_idx" ON "MerchantAlias"("merchantId");

ALTER TABLE "MerchantAlias" ADD CONSTRAINT "MerchantAlias_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MerchantAlias" ADD CONSTRAINT "MerchantAlias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LedgerEntry" ADD COLUMN "merchantId" UUID;
CREATE INDEX "LedgerEntry_merchantId_idx" ON "LedgerEntry"("merchantId");
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
