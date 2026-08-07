import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/saas-auth";
import { getBillingPriceCents, mercadoPagoConfigured } from "@/lib/mercado-pago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    plan: string;
    status: string;
    priceCents: number;
    expiresAt: Date | null;
    lastPaidAt: Date | null;
    billingCycle: string;
    paymentProvider: string;
    providerSubscriptionId: string | null;
    providerPayerEmail: string | null;
    nextBillingAt: Date | null;
  }>>`
    SELECT
      "id", "plan", "status", "priceCents", "expiresAt", "lastPaidAt",
      "billingCycle", "paymentProvider", "providerSubscriptionId", "providerPayerEmail", "nextBillingAt"
    FROM "Subscription"
    WHERE "companyId" = ${session.companyId}
    LIMIT 1
  `;

  const payments = await prisma.$queryRaw<Array<{
    id: string;
    providerPaymentId: string | null;
    amountCents: number;
    currency: string;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
  }>>`
    SELECT "id", "providerPaymentId", "amountCents", "currency", "status", "paidAt", "createdAt"
    FROM "PaymentHistory"
    WHERE "companyId" = ${session.companyId}
    ORDER BY "createdAt" DESC
    LIMIT 12
  `;

  return NextResponse.json({
    authenticated: true,
    company: {
      id: session.company.id,
      name: session.company.tradeName || session.company.name,
      email: session.company.email,
      subscriptionStatus: session.company.subscriptionStatus,
      accessBlocked: session.company.accessBlocked,
      isDemo: session.company.isDemo,
    },
    billing: rows[0] ?? null,
    pricing: {
      monthlyCents: getBillingPriceCents("MONTHLY"),
      yearlyCents: getBillingPriceCents("YEARLY"),
    },
    automaticBillingConfigured: mercadoPagoConfigured(),
    payments,
  });
}
