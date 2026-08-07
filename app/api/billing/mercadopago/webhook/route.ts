import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  companyIdFromExternalReference,
  getMercadoPagoAuthorizedPayment,
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  normalizeSubscriptionStatus,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercado-pago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookPayload = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

async function markProcessed(providerEventId: string) {
  await prisma.$executeRaw`
    UPDATE "BillingWebhookEvent"
    SET "processedAt" = CURRENT_TIMESTAMP
    WHERE "provider" = 'MERCADO_PAGO'
      AND "providerEventId" = ${providerEventId}
  `;
}

async function persistPayment(input: {
  companyId: string;
  providerPaymentId: string;
  providerSubscriptionId?: string | null;
  status: string;
  amountCents: number;
  currency: string;
  paidAt?: Date | null;
  payload: unknown;
}) {
  const subscriptionRows = await prisma.$queryRaw<Array<{ id: string; billingCycle: string }>>`
    SELECT "id", "billingCycle"
    FROM "Subscription"
    WHERE "companyId" = ${input.companyId}
    LIMIT 1
  `;
  const subscription = subscriptionRows[0];

  await prisma.$executeRaw`
    INSERT INTO "PaymentHistory" (
      "id", "companyId", "subscriptionId", "provider", "providerPaymentId",
      "providerSubscriptionId", "billingCycle", "amountCents", "currency", "status",
      "paidAt", "rawPayload", "createdAt", "updatedAt"
    ) VALUES (
      ${randomUUID()}, ${input.companyId}, ${subscription?.id ?? null}, 'MERCADO_PAGO', ${input.providerPaymentId},
      ${input.providerSubscriptionId ?? null}, ${subscription?.billingCycle ?? "MONTHLY"}, ${input.amountCents}, ${input.currency}, ${input.status},
      ${input.paidAt ?? null}, CAST(${JSON.stringify(input.payload)} AS JSONB), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT ("providerPaymentId") WHERE "providerPaymentId" IS NOT NULL
    DO UPDATE SET
      "status" = EXCLUDED."status",
      "amountCents" = EXCLUDED."amountCents",
      "currency" = EXCLUDED."currency",
      "paidAt" = COALESCE(EXCLUDED."paidAt", "PaymentHistory"."paidAt"),
      "rawPayload" = EXCLUDED."rawPayload",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

async function applySubscriptionState(providerSubscriptionId: string) {
  const providerSubscription = await getMercadoPagoSubscription(providerSubscriptionId);
  const companyId = companyIdFromExternalReference(providerSubscription.external_reference);
  if (!companyId) return null;

  const localStatus = normalizeSubscriptionStatus(providerSubscription.status);
  const nextBillingAt = providerSubscription.next_payment_date ? new Date(providerSubscription.next_payment_date) : null;

  await prisma.$executeRaw`
    UPDATE "Subscription"
    SET
      "paymentProvider" = 'MERCADO_PAGO',
      "providerSubscriptionId" = ${providerSubscription.id},
      "providerPayerEmail" = ${providerSubscription.payer_email ?? null},
      "nextBillingAt" = ${nextBillingAt},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "companyId" = ${companyId}
  `;

  if (localStatus === "ACTIVE") {
    await prisma.$transaction([
      prisma.subscription.update({
        where: { companyId },
        data: {
          status: "ACTIVE",
          lastPaidAt: new Date(),
          expiresAt: nextBillingAt,
        },
      }),
      prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: "ACTIVE",
          accessBlocked: false,
          lockedReason: null,
        },
      }),
    ]);
  } else if (localStatus === "PAST_DUE") {
    await prisma.$transaction([
      prisma.subscription.update({ where: { companyId }, data: { status: "PAST_DUE" } }),
      prisma.company.update({
        where: { id: companyId },
        data: { subscriptionStatus: "PAST_DUE", accessBlocked: true, lockedReason: "Assinatura Mercado Pago pausada ou pendente de regularização." },
      }),
    ]);
  } else if (localStatus === "CANCELED") {
    await prisma.$transaction([
      prisma.subscription.update({ where: { companyId }, data: { status: "CANCELED" } }),
      prisma.company.update({
        where: { id: companyId },
        data: { subscriptionStatus: "CANCELED", accessBlocked: true, lockedReason: "Assinatura Mercado Pago cancelada." },
      }),
    ]);
  }

  return { companyId, providerSubscription };
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const rawBody = await request.text();
  let payload: WebhookPayload;

  try {
    payload = rawBody ? JSON.parse(rawBody) as WebhookPayload : {};
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const dataId = url.searchParams.get("data.id") || url.searchParams.get("data_id") || (payload.data?.id != null ? String(payload.data.id) : null);
  const signatureValid = verifyMercadoPagoWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });

  if (!signatureValid) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const providerEventId = payload.id != null
    ? String(payload.id)
    : `${payload.type || "unknown"}:${payload.action || "unknown"}:${dataId || "unknown"}`;

  const existing = await prisma.$queryRaw<Array<{ processedAt: Date | null }>>`
    SELECT "processedAt"
    FROM "BillingWebhookEvent"
    WHERE "provider" = 'MERCADO_PAGO'
      AND "providerEventId" = ${providerEventId}
    LIMIT 1
  `;
  if (existing[0]?.processedAt) return NextResponse.json({ ok: true, duplicate: true });

  await prisma.$executeRaw`
    INSERT INTO "BillingWebhookEvent" (
      "id", "provider", "providerEventId", "eventType", "resourceId", "payload", "createdAt"
    ) VALUES (
      ${randomUUID()}, 'MERCADO_PAGO', ${providerEventId}, ${payload.type || payload.action || "unknown"}, ${dataId},
      CAST(${JSON.stringify(payload)} AS JSONB), CURRENT_TIMESTAMP
    )
    ON CONFLICT ("provider", "providerEventId") DO NOTHING
  `;

  try {
    if (!dataId) {
      await markProcessed(providerEventId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (payload.type === "subscription_preapproval" || payload.action?.includes("preapproval")) {
      await applySubscriptionState(dataId);
    } else if (payload.type === "subscription_authorized_payment") {
      const authorized = await getMercadoPagoAuthorizedPayment(dataId);
      if (authorized.preapproval_id) {
        const state = await applySubscriptionState(authorized.preapproval_id);
        if (state) {
          await persistPayment({
            companyId: state.companyId,
            providerPaymentId: String(authorized.payment?.id ?? authorized.id),
            providerSubscriptionId: authorized.preapproval_id,
            status: authorized.payment?.status || authorized.status || "unknown",
            amountCents: Math.round(Number(authorized.transaction_amount || 0) * 100),
            currency: authorized.currency_id || "BRL",
            paidAt: authorized.status === "processed" || authorized.payment?.status === "approved" ? new Date() : null,
            payload: authorized,
          });
        }
      }
    } else if (payload.type === "payment") {
      const payment = await getMercadoPagoPayment(dataId);
      const companyId = companyIdFromExternalReference(payment.external_reference)
        || (typeof payment.metadata?.company_id === "string" ? payment.metadata.company_id : null);
      if (companyId) {
        await persistPayment({
          companyId,
          providerPaymentId: String(payment.id),
          status: payment.status || "unknown",
          amountCents: Math.round(Number(payment.transaction_amount || 0) * 100),
          currency: payment.currency_id || "BRL",
          paidAt: payment.date_approved ? new Date(payment.date_approved) : null,
          payload: payment,
        });
      }
    }

    await markProcessed(providerEventId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[AJB-BILLING] Falha ao processar webhook Mercado Pago", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
