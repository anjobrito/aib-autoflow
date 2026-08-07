-- AJB AutoFlow - Mercado Pago billing foundation
-- Additive migration only. Preserves existing subscriptions and company data.

ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "providerSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerPayerEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "nextBillingAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_providerSubscriptionId_key"
  ON "Subscription"("providerSubscriptionId")
  WHERE "providerSubscriptionId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "PaymentHistory" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
  "providerPaymentId" TEXT,
  "providerSubscriptionId" TEXT,
  "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "status" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3),
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentHistory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentHistory_providerPaymentId_key"
  ON "PaymentHistory"("providerPaymentId")
  WHERE "providerPaymentId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "PaymentHistory_companyId_createdAt_idx"
  ON "PaymentHistory"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentHistory_providerSubscriptionId_idx"
  ON "PaymentHistory"("providerSubscriptionId");

CREATE TABLE IF NOT EXISTS "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "resourceId" TEXT,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingWebhookEvent_provider_providerEventId_key"
  ON "BillingWebhookEvent"("provider", "providerEventId");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_eventType_createdAt_idx"
  ON "BillingWebhookEvent"("eventType", "createdAt");
