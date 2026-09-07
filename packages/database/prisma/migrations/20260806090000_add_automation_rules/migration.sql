-- CreateTable
CREATE TABLE "AutomationRule" (
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

-- CreateIndex
CREATE INDEX "AutomationRule_userId_priority_idx" ON "AutomationRule"("userId", "priority");

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
