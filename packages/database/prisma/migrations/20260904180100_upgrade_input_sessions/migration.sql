-- Upgrade the August InputSession table to the current Prisma schema.
-- This migration is additive so existing local databases that already created
-- InputSession can catch up without CREATE TABLE / CREATE TYPE collisions.

ALTER TABLE "InputSession" ALTER COLUMN "modality" DROP DEFAULT;

ALTER TABLE "InputSession"
    ALTER COLUMN "modality" TYPE "InputSessionModality"
    USING (
        CASE "modality"::text
            WHEN 'RECEIPT' THEN 'IMAGE'
            ELSE "modality"::text
        END
    )::"InputSessionModality";

ALTER TABLE "InputSession" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "InputSession"
    ALTER COLUMN "status" TYPE TEXT
    USING (
        CASE "status"::text
            WHEN 'PROPOSED' THEN 'NEEDS_REVIEW'
            WHEN 'DISMISSED' THEN 'FAILED'
            ELSE "status"::text
        END
    );

ALTER TABLE "InputSession"
    ALTER COLUMN "status" TYPE "InputSessionStatus"
    USING "status"::"InputSessionStatus";

ALTER TABLE "InputSession"
    ALTER COLUMN "status" SET DEFAULT 'PROCESSED'::"InputSessionStatus";

ALTER TABLE "InputSession" ADD COLUMN IF NOT EXISTS "transcriptText" TEXT;
ALTER TABLE "InputSession" ADD COLUMN IF NOT EXISTS "mediaHash" TEXT;
ALTER TABLE "InputSession" ADD COLUMN IF NOT EXISTS "mediaMimeType" TEXT;
ALTER TABLE "InputSession" ADD COLUMN IF NOT EXISTS "mediaByteLength" INTEGER;
ALTER TABLE "InputSession" ADD COLUMN IF NOT EXISTS "mediaDeletedAt" TIMESTAMPTZ(6);

ALTER TABLE "InputSession" DROP COLUMN IF EXISTS "confidence";
ALTER TABLE "InputSession" DROP COLUMN IF EXISTS "appliedRuleIds";
ALTER TABLE "InputSession" DROP COLUMN IF EXISTS "failureCode";
ALTER TABLE "InputSession" DROP COLUMN IF EXISTS "resolvedAt";
ALTER TABLE "InputSession" DROP COLUMN IF EXISTS "updatedAt";

CREATE UNIQUE INDEX IF NOT EXISTS "InputSession_ledgerEntryId_key"
    ON "InputSession"("ledgerEntryId");

CREATE INDEX IF NOT EXISTS "InputSession_userId_createdAt_idx"
    ON "InputSession"("userId", "createdAt");

DROP INDEX IF EXISTS "InputSession_userId_status_createdAt_idx";

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InputSession_userId_fkey'
    ) THEN
        ALTER TABLE "InputSession"
            ADD CONSTRAINT "InputSession_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InputSession_ledgerEntryId_fkey'
    ) THEN
        ALTER TABLE "InputSession"
            ADD CONSTRAINT "InputSession_ledgerEntryId_fkey"
            FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
