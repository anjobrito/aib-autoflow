import { createHmac, timingSafeEqual } from "crypto";

const MERCADO_PAGO_API = "https://api.mercadopago.com";

export type BillingCycle = "MONTHLY" | "YEARLY";

type MercadoPagoSubscription = {
  id: string;
  status?: string;
  init_point?: string;
  external_reference?: string | number | null;
  payer_email?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number | string;
    currency_id?: string;
  };
};

type MercadoPagoPayment = {
  id: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  date_approved?: string | null;
  metadata?: Record<string, unknown> | null;
};

type MercadoPagoAuthorizedPayment = {
  id: number | string;
  status?: string;
  preapproval_id?: string;
  payment?: { id?: number | string; status?: string } | null;
  transaction_amount?: number;
  currency_id?: string;
  date_created?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`MissingEnvironment:${name}`);
  return value;
}

export function mercadoPagoConfigured() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim());
}

export function getBillingPriceCents(cycle: BillingCycle) {
  const raw = cycle === "YEARLY"
    ? process.env.AJB_PLAN_YEARLY_CENTS
    : process.env.AJB_PLAN_MONTHLY_CENTS;
  const fallback = cycle === "YEARLY" ? 49900 : 4990;
  const parsed = Number(raw ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export function getAppUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = requiredEnv("MERCADO_PAGO_ACCESS_TOKEN");
  const response = await fetch(`${MERCADO_PAGO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await response.text();
  let parsed: unknown = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = body;
  }

  if (!response.ok) {
    console.error("[AJB-BILLING] Mercado Pago API error", response.status, parsed);
    throw new Error(`MercadoPagoApi:${response.status}`);
  }

  return parsed as T;
}

export async function createMercadoPagoSubscription(input: {
  companyId: string;
  companyName: string;
  payerEmail: string;
  cycle: BillingCycle;
}) {
  const amountCents = getBillingPriceCents(input.cycle);
  const appUrl = getAppUrl();

  const body = {
    reason: `AJB AutoFlow - ${input.companyName} - ${input.cycle === "YEARLY" ? "Plano anual" : "Plano mensal"}`,
    external_reference: `company:${input.companyId}`,
    payer_email: input.payerEmail,
    auto_recurring: {
      frequency: input.cycle === "YEARLY" ? 12 : 1,
      frequency_type: "months",
      transaction_amount: amountCents / 100,
      currency_id: "BRL",
    },
    back_url: `${appUrl}/assinatura`,
  };

  const subscription = await mercadoPagoRequest<MercadoPagoSubscription>("/preapproval", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!subscription.id || !subscription.init_point) {
    throw new Error("MercadoPagoApi:InvalidSubscriptionResponse");
  }

  return { subscription, amountCents };
}

export async function getMercadoPagoSubscription(id: string) {
  return mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(id)}`);
}

export async function getMercadoPagoPayment(id: string) {
  return mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

export async function getMercadoPagoAuthorizedPayment(id: string) {
  return mercadoPagoRequest<MercadoPagoAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(id)}`);
}

export function companyIdFromExternalReference(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value);
  return text.startsWith("company:") ? text.slice("company:".length) || null : null;
}

export function normalizeSubscriptionStatus(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "authorized":
      return "ACTIVE" as const;
    case "cancelled":
    case "canceled":
      return "CANCELED" as const;
    case "paused":
      return "PAST_DUE" as const;
    default:
      return null;
  }
}

export function verifyMercadoPagoWebhookSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!secret || !input.xSignature) return false;

  const parts = Object.fromEntries(
    input.xSignature.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  const ts = parts.ts;
  const received = parts.v1;
  if (!ts || !received) return false;

  let manifest = "";
  if (input.dataId) manifest += `id:${input.dataId.toLowerCase()};`;
  if (input.xRequestId) manifest += `request-id:${input.xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
