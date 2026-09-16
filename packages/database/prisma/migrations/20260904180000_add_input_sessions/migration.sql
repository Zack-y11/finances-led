-- Create InputSession for new databases, and add missing enum values on
-- databases that already created an earlier untracked InputSession schema.
-- New enum values are not used here: PostgreSQL cannot use values added in
-- the same transaction, so column rewrites live in the following migration.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'InputSessionModality'
    ) THEN
        CREATE TYPE "InputSessionModality" AS ENUM ('TEXT', 'VOICE', 'IMAGE', 'MANUAL');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'InputSessionModality'
          AND e.enumlabel = 'IMAGE'
    ) THEN
        ALTER TYPE "InputSessionModality" ADD VALUE 'IMAGE';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'InputSessionModality'
          AND e.enumlabel = 'MANUAL'
    ) THEN
        ALTER TYPE "InputSessionModality" ADD VALUE 'MANUAL';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'InputSessionStatus'
    ) THEN
        CREATE TYPE "InputSessionStatus" AS ENUM ('PROCESSED', 'NEEDS_REVIEW', 'FAILED', 'CONFIRMED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'InputSessionStatus'
          AND e.enumlabel = 'PROCESSED'
    ) THEN
        ALTER TYPE "InputSessionStatus" ADD VALUE 'PROCESSED';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'InputSessionStatus'
          AND e.enumlabel = 'NEEDS_REVIEW'
    ) THEN
        ALTER TYPE "InputSessionStatus" ADD VALUE 'NEEDS_REVIEW';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'InputSessionStatus'
          AND e.enumlabel = 'FAILED'
    ) THEN
        ALTER TYPE "InputSessionStatus" ADD VALUE 'FAILED';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'InputSessionStatus'
          AND e.enumlabel = 'CONFIRMED'
    ) THEN
        ALTER TYPE "InputSessionStatus" ADD VALUE 'CONFIRMED';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "InputSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "modality" "InputSessionModality" NOT NULL,
    "transcriptText" TEXT,
    "parsedPayload" JSONB,
    "mediaHash" TEXT,
    "mediaMimeType" TEXT,
    "mediaByteLength" INTEGER,
    "mediaDeletedAt" TIMESTAMPTZ(6),
    "status" "InputSessionStatus" NOT NULL DEFAULT 'PROCESSED',
    "ledgerEntryId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InputSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InputSession_ledgerEntryId_key"
    ON "InputSession"("ledgerEntryId");

CREATE INDEX IF NOT EXISTS "InputSession_userId_createdAt_idx"
    ON "InputSession"("userId", "createdAt");

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
