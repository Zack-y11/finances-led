-- CreateEnum
CREATE TYPE "InputSessionModality" AS ENUM ('TEXT', 'VOICE', 'IMAGE', 'MANUAL');

-- CreateEnum
CREATE TYPE "InputSessionStatus" AS ENUM ('PROCESSED', 'NEEDS_REVIEW', 'FAILED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "InputSession" (
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

-- CreateIndex
CREATE UNIQUE INDEX "InputSession_ledgerEntryId_key" ON "InputSession"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "InputSession_userId_createdAt_idx" ON "InputSession"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "InputSession" ADD CONSTRAINT "InputSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputSession" ADD CONSTRAINT "InputSession_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
