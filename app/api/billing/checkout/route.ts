import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";
import { createMercadoPagoSubscription, getBillingPriceCents, mercadoPagoConfigured, type BillingCycle } from "@/lib/mercado-pago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutBody = {
  cycle?: string;
};

function parseCycle(value?: string): BillingCycle | null {
  if (value === "MONTHLY" || value === "YEARLY") return value;
  return null;
}

export async function POST(request: Request) {
  try {
    const session = await requireCurrentSession();
    const body = (await request.json().catch(() => ({}))) as CheckoutBody;
    const cycle = parseCycle(body.cycle);

    if (!cycle) {
      return NextResponse.json({ success: false, error: "Ciclo de cobrança inválido." }, { status: 400 });
    }

    if (!mercadoPagoConfigured()) {
      return NextResponse.json(
        { success: false, error: "Cobrança automática ainda não foi configurada. Use a liberação manual." },
        { status: 503 },
      );
    }

    if (session.company.isDemo) {
      return NextResponse.json({ success: false, error: "A empresa Demo não pode contratar assinatura paga." }, { status: 403 });
    }

    const current = await prisma.$queryRaw<Array<{
      providerSubscriptionId: string | null;
      billingCycle: string;
    }>>`
      SELECT "providerSubscriptionId", "billingCycle"
      FROM "Subscription"
      WHERE "companyId" = ${session.companyId}
      LIMIT 1
    `;

    if (current[0]?.providerSubscriptionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Já existe uma assinatura Mercado Pago vinculada à empresa. Consulte o status antes de iniciar outra cobrança.",
        },
        { status: 409 },
      );
    }

    const { subscription: providerSubscription, amountCents } = await createMercadoPagoSubscription({
      companyId: session.companyId,
      companyName: session.company.tradeName || session.company.name,
      payerEmail: session.company.email || session.user.email,
      cycle,
    });

    const subscription = await prisma.subscription.upsert({
      where: { companyId: session.companyId },
      create: {
        companyId: session.companyId,
        plan: cycle === "YEARLY" ? "START_YEARLY" : "START_MONTHLY",
        status: "TRIAL",
        priceCents: amountCents,
      },
      update: {
        plan: cycle === "YEARLY" ? "START_YEARLY" : "START_MONTHLY",
        priceCents: amountCents,
      },
    });

    await prisma.$executeRaw`
      UPDATE "Subscription"
      SET
        "billingCycle" = ${cycle},
        "paymentProvider" = 'MERCADO_PAGO',
        "providerSubscriptionId" = ${providerSubscription.id},
        "providerPayerEmail" = ${session.company.email || session.user.email},
        "nextBillingAt" = ${providerSubscription.next_payment_date ? new Date(providerSubscription.next_payment_date) : null},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${subscription.id}
        AND "companyId" = ${session.companyId}
    `;

    return NextResponse.json({
      success: true,
      cycle,
      amountCents: getBillingPriceCents(cycle),
      provider: "MERCADO_PAGO",
      checkoutUrl: providerSubscription.init_point,
      providerSubscriptionId: providerSubscription.id,
    });
  } catch (error) {
    console.error("[AJB-BILLING] Falha ao criar checkout", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Não autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("LicenseBlocked:")) {
      // A tela de licença precisa conseguir iniciar a regularização mesmo quando a licença operacional está bloqueada.
      return NextResponse.json(
        { success: false, error: "Sessão bloqueada para operação. Entre novamente para iniciar a regularização." },
        { status: 403 },
      );
    }
    return NextResponse.json({ success: false, error: "Não foi possível iniciar a cobrança automática." }, { status: 500 });
  }
}
