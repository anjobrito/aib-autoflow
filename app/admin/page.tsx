"use client";

import { FormEvent, useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, Building2, LogOut, UserRoundCog } from "lucide-react";

type AdminCompany = {
  id: string;
  name: string;
  tradeName?: string | null;
  cnpj: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  subscriptionStatus: string;
  accessBlocked: boolean;
  lockedReason?: string | null;
  createdAt: string;
  subscription?: {
    plan: string;
    status: string;
    priceCents: number;
    trialEndsAt?: string | null;
    expiresAt?: string | null;
    lastPaidAt?: string | null;
    notes?: string | null;
  } | null;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
  }>;
  _count: {
    customers: number;
    vehicles: number;
    workOrders: number;
  };
};

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";
const subscriptionStatuses = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "BLOCKED"];
const planOptions = ["BASIC", "PRO", "ENTERPRISE", "PILOT"];

function formatCurrency(priceCents?: number) {
  return ((priceCents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function dateInputValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function AdminPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function loadCompanies() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/companies", { cache: "no-store" });
    const result = await response.json();

    setLoading(false);

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível carregar empresas.");
      return;
    }

    setCompanies(result.companies || []);
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin/entrar";
    }
  }

  async function handleLicenseSubmit(event: FormEvent<HTMLFormElement>, companyId: string) {
    event.preventDefault();
    setMessage("");

    const response = await fetch(`/api/admin/companies/${companyId}/license`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível atualizar a licença.");
      return;
    }

    setMessage("Licença atualizada.");
    await loadCompanies();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <p className="text-lg font-black tracking-tight">AJBSYSTEMS Admin</p>
              <p className="text-xs text-blue-100">Billing, licenças, trials e suporte</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="/admin/usuarios-ajbsystems" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white hover:text-slate-950">
              <UserRoundCog className="h-4 w-4" />
              Usuários AJBSYSTEMS
            </a>
            <button type="button" onClick={loadCompanies} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white hover:text-slate-950 disabled:opacity-60">
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:px-10 lg:px-16">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Administração da plataforma</p>
          <h1 className="mt-1 text-3xl font-black">Controle comercial do SaaS</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Esta área é exclusiva da AJBSYSTEMS. MASTER controla tudo, BILLING altera licenças e SUPPORT acompanha empresas para suporte.
            Usuários de oficina entram pelo AJB AutoFlow em /entrar e usam roles próprias da empresa cliente.
          </p>
        </div>

        {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}
        {loading ? <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">Carregando empresas...</div> : null}

        <div className="grid gap-5">
          {companies.map((company) => {
            const subscription = company.subscription;
            return (
              <article key={company.id} className="rounded-[2rem] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Building2 className="h-5 w-5" /></div>
                      <div>
                        <h2 className="text-xl font-black">{company.tradeName || company.name}</h2>
                        <p className="text-sm text-slate-500">{company.name} • {company.cnpj}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <p><strong>Status:</strong> {company.subscriptionStatus}</p>
                      <p><strong>Plano:</strong> {subscription?.plan || "-"}</p>
                      <p><strong>Valor:</strong> {formatCurrency(subscription?.priceCents)}</p>
                      <p><strong>Bloqueio:</strong> {company.accessBlocked ? "Sim" : "Não"}</p>
                      <p><strong>Trial até:</strong> {formatDate(subscription?.trialEndsAt)}</p>
                      <p><strong>Expira em:</strong> {formatDate(subscription?.expiresAt)}</p>
                      <p><strong>Último pagamento:</strong> {formatDate(subscription?.lastPaidAt)}</p>
                      <p><strong>Cadastros:</strong> {company._count.customers} clientes / {company._count.vehicles} veículos / {company._count.workOrders} OS</p>
                    </div>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="font-black text-slate-950">Usuários da empresa cliente</p>
                      <div className="mt-2 grid gap-1">
                        {company.users.map((user) => <p key={user.id}>{user.name} — {user.email} — {user.role}</p>)}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={(event) => handleLicenseSubmit(event, company.id)} className="grid min-w-full gap-3 rounded-3xl border border-slate-200 p-4 lg:min-w-[360px]">
                    <label className={labelClass}>Status<select name="status" defaultValue={subscription?.status || company.subscriptionStatus} className={inputClass}>{subscriptionStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                    <label className={labelClass}>Plano<select name="plan" defaultValue={subscription?.plan || "BASIC"} className={inputClass}>{planOptions.map((plan) => <option key={plan}>{plan}</option>)}</select></label>
                    <label className={labelClass}>Valor em centavos<input name="priceCents" defaultValue={subscription?.priceCents || 9700} inputMode="numeric" className={inputClass} /></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={labelClass}>Trial até<input name="trialEndsAt" type="date" defaultValue={dateInputValue(subscription?.trialEndsAt)} className={inputClass} /></label>
                      <label className={labelClass}>Expira em<input name="expiresAt" type="date" defaultValue={dateInputValue(subscription?.expiresAt)} className={inputClass} /></label>
                    </div>
                    <label className={labelClass}>Bloquear acesso<select name="accessBlocked" defaultValue={String(company.accessBlocked)} className={inputClass}><option value="false">Não</option><option value="true">Sim</option></select></label>
                    <label className={labelClass}>Motivo do bloqueio<input name="lockedReason" defaultValue={company.lockedReason || ""} placeholder="Ex: pagamento pendente" className={inputClass} /></label>
                    <label className={labelClass}>Observações<input name="notes" defaultValue={subscription?.notes || ""} placeholder="Ex: piloto funilaria 14 dias" className={inputClass} /></label>
                    <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Salvar licença</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
