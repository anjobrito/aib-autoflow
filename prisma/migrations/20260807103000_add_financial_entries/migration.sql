CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "personName" TEXT,
    "reference" TEXT,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialEntry_companyId_idx" ON "FinancialEntry"("companyId");
CREATE INDEX "FinancialEntry_companyId_type_idx" ON "FinancialEntry"("companyId", "type");
CREATE INDEX "FinancialEntry_companyId_dueDate_idx" ON "FinancialEntry"("companyId", "dueDate");
CREATE INDEX "FinancialEntry_companyId_status_idx" ON "FinancialEntry"("companyId", "status");

ALTER TABLE "FinancialEntry"
ADD CONSTRAINT "FinancialEntry_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
