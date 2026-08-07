import { Gauge } from "lucide-react";
import { BillingSubscriptionClient } from "@/components/billing-subscription-client";

export default function AssinaturaPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><Gauge className="h-6 w-6" /></div>
            <div><p className="text-lg font-black tracking-tight">AJB AutoFlow</p><p className="text-xs text-blue-100">by AJBSYSTEMS</p></div>
          </a>
          <a href="/dashboard" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-950">Voltar ao sistema</a>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <BillingSubscriptionClient />
      </section>
    </main>
  );
}
