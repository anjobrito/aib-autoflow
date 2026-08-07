import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { platformAdminErrorResponse, requireSupportPlatformAdmin } from "@/lib/platform-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRevenueCompany(company: { isDemo: boolean; subscriptionStatus: string; accessBlocked: boolean; subscription: { status: string; priceCents: number } | null }) {
  if (company.isDemo) return false;
  if (company.accessBlocked) return false;
  if (!["ACTIVE", "TRIAL"].includes(company.subscriptionStatus)) return false;
  if (!company.subscription) return false;
  if (!["ACTIVE", "TRIAL"].includes(company.subscription.status)) return false;
  return true;
}

export async function GET() {
  try {
    await requireSupportPlatformAdmin();

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            customers: true,
            vehicles: true,
            workOrders: true,
          },
        },
      },
    });

    const billingRows = await prisma.$queryRaw<Array<{
      companyId: string;
      billingCycle: string;
      paymentProvider: string;
      providerSubscriptionId: string | null;
      providerPayerEmail: string | null;
      nextBillingAt: Date | null;
    }>>`
      SELECT "companyId", "billingCycle", "paymentProvider", "providerSubscriptionId", "providerPayerEmail", "nextBillingAt"
      FROM "Subscription"
    `;
    const billingByCompany = new Map(billingRows.map((row) => [row.companyId, row]));

    const enrichedCompanies = companies.map((company) => ({
      ...company,
      billing: billingByCompany.get(company.id) ?? null,
    }));

    const summary = companies.reduce(
      (acc, company) => {
        if (company.isDemo) {
          acc.demo += 1;
          return acc;
        }

        acc.total += 1;
        if (company.subscriptionStatus === "ACTIVE") acc.active += 1;
        if (company.subscriptionStatus === "TRIAL") acc.trial += 1;
        if (company.subscriptionStatus === "PAST_DUE") acc.pastDue += 1;
        if (company.subscriptionStatus === "CANCELED") acc.canceled += 1;
        if (company.subscriptionStatus === "BLOCKED" || company.accessBlocked) acc.blocked += 1;
        if (isRevenueCompany(company)) {
          const billing = billingByCompany.get(company.id);
          const amount = Number(company.subscription?.priceCents || 0);
          acc.monthlyRevenueCents += billing?.billingCycle === "YEARLY" ? Math.round(amount / 12) : amount;
        }
        return acc;
      },
      { total: 0, demo: 0, active: 0, trial: 0, pastDue: 0, canceled: 0, blocked: 0, monthlyRevenueCents: 0 },
    );

    return NextResponse.json({ success: true, summary, companies: enrichedCompanies });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
