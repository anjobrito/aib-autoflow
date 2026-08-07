CREATE TABLE "VehicleFinancing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "vehicleId" TEXT,
    "sellerName" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "financedBank" TEXT NOT NULL DEFAULT '',
    "customerDocument" TEXT NOT NULL DEFAULT '',
    "customerName" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "vehicleBrand" TEXT NOT NULL DEFAULT '',
    "vehicleModel" TEXT NOT NULL DEFAULT '',
    "vehiclePlate" TEXT NOT NULL DEFAULT '',
    "vehicleChassis" TEXT NOT NULL DEFAULT '',
    "vehicleYear" TEXT NOT NULL DEFAULT '',
    "contractNumber" TEXT NOT NULL DEFAULT '',
    "requestedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "downPaymentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "financedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "returnPercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "returnAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ilaDiscountPercentage" DECIMAL(65,30) NOT NULL DEFAULT 26,
    "ilaDiscountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netReturnAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "prestamistaInsuranceAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "branchName" TEXT NOT NULL DEFAULT 'Matriz',
    "financingStatus" TEXT NOT NULL DEFAULT 'EM_ANALISE',
    "lienStatus" TEXT NOT NULL DEFAULT 'NAO_INICIADO',
    "returnReceived" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleFinancing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VehicleFinancing_companyId_idx" ON "VehicleFinancing"("companyId");
CREATE INDEX "VehicleFinancing_customerId_idx" ON "VehicleFinancing"("customerId");
CREATE INDEX "VehicleFinancing_vehicleId_idx" ON "VehicleFinancing"("vehicleId");
CREATE INDEX "VehicleFinancing_companyId_date_idx" ON "VehicleFinancing"("companyId", "date");
CREATE INDEX "VehicleFinancing_companyId_contractNumber_idx" ON "VehicleFinancing"("companyId", "contractNumber");

ALTER TABLE "VehicleFinancing" ADD CONSTRAINT "VehicleFinancing_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VehicleFinancing" ADD CONSTRAINT "VehicleFinancing_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VehicleFinancing" ADD CONSTRAINT "VehicleFinancing_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
