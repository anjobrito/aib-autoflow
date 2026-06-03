import { NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { platformAdminErrorResponse, requireBillingPlatformAdmin } from "@/lib/platform-admin-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseOptionalDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "BLOCKED"].includes(value);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireBillingPlatformAdmin();
    const { id } = await params;
    const formData = await request.formData();

    const status = normalize(formData.get("status"));
    const plan = normalize(formData.get("plan")) || "BASIC";
    const priceCents = Number.parseInt(normalize(formData.get("priceCents")) || "9700", 10);
    const trialEndsAt = parseOptionalDate(normalize(formData.get("trialEndsAt")));
    const expiresAt = parseOptionalDate(normalize(formData.get("expiresAt")));
    const notes = normalize(formData.get("notes"));
    const accessBlocked = normalize(formData.get("accessBlocked")) === "true";
    const lockedReason = normalize(formData.get("lockedReason"));

    if (!isSubscriptionStatus(status)) {
      return NextResponse.json({ success: false, message: "Status de assinatura inválido." }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ success: false, message: "Empresa não encontrada." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCompany = await tx.company.update({
        where: { id },
        data: {
          subscriptionStatus: status,
          accessBlocked,
          lockedReason: accessBlocked ? lockedReason || "Bloqueado pelo administrador" : null,
        },
      });

      const subscription = await tx.subscription.upsert({
        where: { companyId: id },
        create: {
          companyId: id,
          plan,
          status,
          priceCents: Number.isFinite(priceCents) ? priceCents : 9700,
          trialEndsAt,
          expiresAt,
          lastPaidAt: status === "ACTIVE" ? new Date() : null,
          notes,
        },
        update: {
          plan,
          status,
          priceCents: Number.isFinite(priceCents) ? priceCents : 9700,
          trialEndsAt,
          expiresAt,
          lastPaidAt: status === "ACTIVE" ? new Date() : undefined,
          notes,
        },
      });

      return { company: updatedCompany, subscription };
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
