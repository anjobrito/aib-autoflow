CREATE TABLE "VehicleInspection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "mileage" TEXT,
    "fuelLevel" TEXT,
    "hasDocuments" BOOLEAN NOT NULL DEFAULT false,
    "hasSpareTire" BOOLEAN NOT NULL DEFAULT false,
    "hasJack" BOOLEAN NOT NULL DEFAULT false,
    "hasPersonalItems" BOOLEAN NOT NULL DEFAULT false,
    "personalItems" TEXT,
    "damages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleInspection_workOrderId_key" ON "VehicleInspection"("workOrderId");
CREATE INDEX "VehicleInspection_companyId_idx" ON "VehicleInspection"("companyId");
CREATE INDEX "VehicleInspection_companyId_workOrderId_idx" ON "VehicleInspection"("companyId", "workOrderId");

ALTER TABLE "VehicleInspection"
ADD CONSTRAINT "VehicleInspection_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VehicleInspection"
ADD CONSTRAINT "VehicleInspection_workOrderId_fkey"
FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
