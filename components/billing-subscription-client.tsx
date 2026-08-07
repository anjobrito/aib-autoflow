"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";

type BillingStatus = {
  authenticated: boolean;
  company?: {
    name: string;
    subscriptionStatus: string;
    accessBlocked: boolean;
    isDemo: boolean;
  };
  billing?: {
    plan: string;
    status: string;
    priceCents: number;
    billingCycle: string;
    paymentProvider: string;
    providerSubscriptionId: string | null;
    nextBillingAt: string | null;
  } | null;
  pricing?: {
    monthlyCents: number;
    yearlyCents: number;
  };
  automaticBillingConfigured?: boolean;
  payments?: Array<{
    id: string;
    providerPaymentId: string | null;
    amountCents: number;
    currency: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function BillingSubscriptionClient() {
  const [data, setData] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"MONTHLY" | "YEARLY" | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/entrar?redirect=/assinatura";
        return;
      }
      const result = await response.json();
      setData(result);
    } catch {
      setError("Não foi possível consultar sua assinatura.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function checkout(cycle: "MONTHLY" | "YEARLY") {
    if (submitting) return;
    setSubmitting(cycle);
    setError("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle }),
      });
      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) {
        setError(result.error || "Não foi possível iniciar o pagamento.");
        await load();
        return;
      }
      window.location.href = result.checkoutUrl;
    } catch {
      setError("Não foi possível iniciar o pagamento.");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!data?.company || !data.pricing) return null;

  const hasProviderSubscription = Boolean(data.billing?.providerSubscriptionId);

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-white p-7 shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">Assinatura AJB AutoFlow</p>
            <h1 className="mt-2 text-3xl font-black">{data.company.name}</h1>
            <p className="mt-2 text-sm text-slate-600">Status: <span className="font-black">{data.company.subscriptionStatus}</span></p>
          </div>
          <div className="rounded-3xl bg-slate-950 px-6 py-5 text-white">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Cobrança</p>
            <p className="mt-1 text-xl font-black">{data.billing?.paymentProvider === "MERCADO_PAGO" ? "Mercado Pago" : "Manual"}</p>
            <p className="mt-1 text-xs text-slate-300">{data.billing?.billingCycle === "YEARLY" ? "Ciclo anual" : "Ciclo mensal"}</p>
          </div>
        </div>
      </section>

      {data.company.isDemo ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-7 text-amber-950">
          <h2 className="text-xl font-black">Empresa Demo</h2>
          <p className="mt-2 text-sm">O tenant de demonstração não gera cobrança e não entra no faturamento.</p>
        </section>
      ) : null}

      {!data.company.isDemo && !hasProviderSubscription ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><CreditCard className="h-6 w-6" /></div>
            <h2 className="mt-5 text-2xl font-black">Plano mensal</h2>
            <p className="mt-2 text-4xl font-black">{money(data.pricing.monthlyCents)}<span className="text-base text-slate-500">/mês</span></p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Cobrança recorrente mensal automática pelo Mercado Pago.</p>
            <button
              type="button"
              disabled={!data.automaticBillingConfigured || Boolean(submitting)}
              onClick={() => checkout("MONTHLY")}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === "MONTHLY" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Assinar mensal
            </button>
          </article>

          <article className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><CheckCircle2 className="h-6 w-6" /></div>
            <h2 className="mt-5 text-2xl font-black">Plano anual</h2>
            <p className="mt-2 text-4xl font-black">{money(data.pricing.yearlyCents)}<span className="text-base text-slate-400">/ano</span></p>
            <p className="mt-3 text-sm leading-6 text-slate-300">Uma cobrança recorrente a cada 12 meses, ideal para contratos anuais.</p>
            <button
              type="button"
              disabled={!data.automaticBillingConfigured || Boolean(submitting)}
              onClick={() => checkout("YEARLY")}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting === "YEARLY" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Assinar anual
            </button>
          </article>
        </section>
      ) : null}

      {!data.automaticBillingConfigured && !data.company.isDemo ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          A cobrança automática ainda não possui credenciais de produção. A liberação manual continua disponível no painel AJBSYSTEMS.
        </section>
      ) : null}

      {hasProviderSubscription ? (
        <section className="rounded-[2rem] bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">Assinatura vinculada</h2>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-slate-500">Plano</span><p className="font-black">{data.billing?.plan}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-slate-500">Status</span><p className="font-black">{data.billing?.status}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-slate-500">Ciclo</span><p className="font-black">{data.billing?.billingCycle === "YEARLY" ? "Anual" : "Mensal"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-slate-500">Próxima cobrança</span><p className="font-black">{data.billing?.nextBillingAt ? new Date(data.billing.nextBillingAt).toLocaleDateString("pt-BR") : "Aguardando confirmação"}</p></div>
          </div>
        </section>
      ) : null}

      {error ? <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-700">{error}</div> : null}

      {data.payments?.length ? (
        <section className="rounded-[2rem] bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">Histórico de pagamentos</h2>
          <div className="mt-4 grid gap-3">
            {data.payments.map((payment) => (
              <div key={payment.id} className="flex flex-col justify-between gap-2 rounded-2xl bg-slate-50 p-4 text-sm sm:flex-row sm:items-center">
                <div><p className="font-black">{money(payment.amountCents)}</p><p className="text-xs text-slate-500">{payment.providerPaymentId || "Pagamento Mercado Pago"}</p></div>
                <div className="sm:text-right"><p className="font-black">{payment.status}</p><p className="text-xs text-slate-500">{new Date(payment.paidAt || payment.createdAt).toLocaleString("pt-BR")}</p></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
