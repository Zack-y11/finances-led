-- Persist user-owned automation rules (schema existed without a migration)
-- and add merchant normalization tables for Phase 6.
-- Existing local databases may already have these objects from earlier untracked
-- schema work, so every statement is additive.

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

CREATE TABLE IF NOT EXISTS "Merchant" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "defaultCategoryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Merchant_userId_normalizedKey_key" ON "Merchant"("userId", "normalizedKey");
CREATE INDEX IF NOT EXISTS "Merchant_userId_idx" ON "Merchant"("userId");
CREATE INDEX IF NOT EXISTS "Merchant_defaultCategoryId_idx" ON "Merchant"("defaultCategoryId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Merchant_userId_fkey'
    ) THEN
        ALTER TABLE "Merchant"
            ADD CONSTRAINT "Merchant_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Merchant_defaultCategoryId_fkey'
    ) THEN
        ALTER TABLE "Merchant"
            ADD CONSTRAINT "Merchant_defaultCategoryId_fkey"
            FOREIGN KEY ("defaultCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MerchantAlias" (
    "id" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MerchantAlias_userId_normalizedKey_key" ON "MerchantAlias"("userId", "normalizedKey");
CREATE INDEX IF NOT EXISTS "MerchantAlias_merchantId_idx" ON "MerchantAlias"("merchantId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MerchantAlias_merchantId_fkey'
    ) THEN
        ALTER TABLE "MerchantAlias"
            ADD CONSTRAINT "MerchantAlias_merchantId_fkey"
            FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MerchantAlias_userId_fkey'
    ) THEN
        ALTER TABLE "MerchantAlias"
            ADD CONSTRAINT "MerchantAlias_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "merchantId" UUID;
CREATE INDEX IF NOT EXISTS "LedgerEntry_merchantId_idx" ON "LedgerEntry"("merchantId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LedgerEntry_merchantId_fkey'
    ) THEN
        ALTER TABLE "LedgerEntry"
            ADD CONSTRAINT "LedgerEntry_merchantId_fkey"
            FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
