import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { platformAdminErrorResponse, requireSupportPlatformAdmin } from "@/lib/platform-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRevenueCompany(company: { subscriptionStatus: string; accessBlocked: boolean; subscription: { status: string; priceCents: number } | null }) {
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

    const summary = companies.reduce(
      (acc, company) => {
        acc.total += 1;
        if (company.subscriptionStatus === "ACTIVE") acc.active += 1;
        if (company.subscriptionStatus === "TRIAL") acc.trial += 1;
        if (company.subscriptionStatus === "PAST_DUE") acc.pastDue += 1;
        if (company.subscriptionStatus === "CANCELED") acc.canceled += 1;
        if (company.subscriptionStatus === "BLOCKED" || company.accessBlocked) acc.blocked += 1;
        if (isRevenueCompany(company)) acc.monthlyRevenueCents += Number(company.subscription?.priceCents || 0);
        return acc;
      },
      { total: 0, active: 0, trial: 0, pastDue: 0, canceled: 0, blocked: 0, monthlyRevenueCents: 0 },
    );

    return NextResponse.json({ success: true, summary, companies });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
