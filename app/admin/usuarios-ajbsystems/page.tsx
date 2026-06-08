"use client";

import { FormEvent, useEffect, useState } from "react";
import { ShieldCheck, UserRoundCog } from "lucide-react";

type PlatformAdminRow = {
  id: string;
  name: string;
  email: string;
  role: "MASTER" | "BILLING" | "SUPPORT";
  active: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
};

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";
const roles = ["MASTER", "BILLING", "SUPPORT"];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

export default function UsuariosAjbSystemsPage() {
  const [admins, setAdmins] = useState<PlatformAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAdmins() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/platform-users", { cache: "no-store" });
    const result = await response.json();

    setLoading(false);

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível carregar usuários AJBSYSTEMS.");
      return;
    }

    setAdmins(result.admins || []);
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/admin/platform-users", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível criar usuário AJBSYSTEMS.");
      return;
    }

    event.currentTarget.reset();
    setMessage("Usuário AJBSYSTEMS criado.");
    await loadAdmins();
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, adminId: string) {
    event.preventDefault();
    setMessage("");

    const response = await fetch(`/api/admin/platform-users/${adminId}`, {
      method: "PUT",
      body: new FormData(event.currentTarget),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível atualizar usuário AJBSYSTEMS.");
      return;
    }

    setMessage("Usuário AJBSYSTEMS atualizado.");
    await loadAdmins();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <p className="text-lg font-black tracking-tight">AJBSYSTEMS Admin</p>
              <p className="text-xs text-blue-100">Usuários internos da plataforma</p>
            </div>
          </div>
          <a href="/admin" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-950">Voltar ao billing</a>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:px-10 lg:px-16">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Controle interno</p>
          <h1 className="mt-1 text-3xl font-black">Usuários AJBSYSTEMS</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Estes usuários administram a plataforma. Eles não pertencem a nenhuma oficina e não consomem licença de cliente.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-blue-700">
            <span className="rounded-full bg-blue-50 px-3 py-1">MASTER: controle total</span>
            <span className="rounded-full bg-blue-50 px-3 py-1">BILLING: licenças e pagamentos</span>
            <span className="rounded-full bg-blue-50 px-3 py-1">SUPPORT: suporte e acompanhamento</span>
          </div>
        </div>

        {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}
        {loading ? <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">Carregando usuários...</div> : null}

        <form onSubmit={handleCreate} className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><UserRoundCog className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-black">Novo usuário interno</h2>
              <p className="text-sm text-slate-500">Crie usuários de suporte ou billing sem misturar com usuários das empresas clientes.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <label className={labelClass}>Nome<input name="name" required placeholder="Ex: Suporte AJB" className={inputClass} /></label>
            <label className={labelClass}>E-mail<input name="email" type="email" required placeholder="suporte@ajbsystems.com" className={inputClass} /></label>
            <label className={labelClass}>Role<select name="role" defaultValue="SUPPORT" className={inputClass}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
            <label className={labelClass}>Senha<input name="password" type="password" required placeholder="Mínimo 8 caracteres" className={inputClass} /></label>
            <label className={labelClass}>Ativo<select name="active" defaultValue="true" className={inputClass}><option value="true">Sim</option><option value="false">Não</option></select></label>
          </div>

          <button className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Criar usuário AJBSYSTEMS</button>
        </form>

        <div className="grid gap-4">
          {admins.map((admin) => (
            <form key={admin.id} onSubmit={(event) => handleUpdate(event, admin.id)} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1.4fr_180px_140px_1fr_auto] lg:items-end">
                <label className={labelClass}>Nome<input name="name" required defaultValue={admin.name} className={inputClass} /></label>
                <div>
                  <p className="text-sm font-bold text-slate-700">E-mail</p>
                  <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{admin.email}</p>
                </div>
                <label className={labelClass}>Role<select name="role" defaultValue={admin.role} className={inputClass}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
                <label className={labelClass}>Ativo<select name="active" defaultValue={String(admin.active)} className={inputClass}><option value="true">Sim</option><option value="false">Não</option></select></label>
                <label className={labelClass}>Nova senha<input name="password" type="password" placeholder="Opcional" className={inputClass} /></label>
                <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Salvar</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">Criado em {formatDate(admin.createdAt)} • Último login: {formatDate(admin.lastLoginAt)}</p>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
