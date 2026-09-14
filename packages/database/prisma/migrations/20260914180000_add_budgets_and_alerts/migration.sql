-- Persist user-owned monthly budgets and one alert per level for each budget month.

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "BudgetAlertLevel" AS ENUM ('APPROACHING', 'EXCEEDED');

-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "alertThreshold" DECIMAL(4,3) NOT NULL,
    "categoryId" UUID,
    "accountId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "monthKey" VARCHAR(7) NOT NULL,
    "level" "BudgetAlertLevel" NOT NULL,
    "spent" DECIMAL(12,2) NOT NULL,
    "limitAmount" DECIMAL(12,2) NOT NULL,
    "raisedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_name_period_key" ON "Budget"("userId", "name", "period");

-- CreateIndex
CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");

-- CreateIndex
CREATE INDEX "Budget_accountId_idx" ON "Budget"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAlert_budgetId_monthKey_level_key" ON "BudgetAlert"("budgetId", "monthKey", "level");

-- CreateIndex
CREATE INDEX "BudgetAlert_userId_monthKey_idx" ON "BudgetAlert"("userId", "monthKey");

-- CreateIndex
CREATE INDEX "BudgetAlert_budgetId_monthKey_idx" ON "BudgetAlert"("budgetId", "monthKey");

-- CreateIndex
CREATE INDEX "BudgetAlert_userId_raisedAt_idx" ON "BudgetAlert"("userId", "raisedAt");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
