ALTER TABLE "Company"
ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Company_isDemo_idx" ON "Company"("isDemo");
