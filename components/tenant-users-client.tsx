"use client";

import { FormEvent, useEffect, useState } from "react";
import { UserRoundCog, Users } from "lucide-react";

type TenantUserRow = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "MECHANIC" | "ATTENDANT" | "SALES" | "FINANCIAL";
  active: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
};

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";
const roles = ["OWNER", "MANAGER", "MECHANIC", "ATTENDANT", "SALES", "FINANCIAL"];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    OWNER: "Dono",
    MANAGER: "Gerente",
    MECHANIC: "Técnico/Mecânico",
    ATTENDANT: "Atendimento",
    SALES: "Vendas",
    FINANCIAL: "Financeiro",
  };

  return labels[role] || role;
}

export function TenantUsersClient() {
  const [users, setUsers] = useState<TenantUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/users", { cache: "no-store" });
    const result = await response.json();

    setLoading(false);

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível carregar usuários da empresa.");
      return;
    }

    setUsers(result.users || []);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/users", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível criar usuário da empresa.");
      return;
    }

    event.currentTarget.reset();
    setMessage("Usuário da empresa criado.");
    await loadUsers();
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    setMessage("");

    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      body: new FormData(event.currentTarget),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível atualizar usuário da empresa.");
      return;
    }

    setMessage("Usuário da empresa atualizado.");
    await loadUsers();
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">Sistema</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Usuários da empresa</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Estes usuários pertencem somente à empresa cliente logada. Eles não são usuários administrativos da AJBSYSTEMS e não controlam billing global.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-blue-700">
          <span className="rounded-full bg-blue-50 px-3 py-1">OWNER: dono</span>
          <span className="rounded-full bg-blue-50 px-3 py-1">MANAGER: gerente</span>
          <span className="rounded-full bg-blue-50 px-3 py-1">MECHANIC: execução técnica</span>
          <span className="rounded-full bg-blue-50 px-3 py-1">ATTENDANT: atendimento</span>
          <span className="rounded-full bg-blue-50 px-3 py-1">SALES: vendas</span>
          <span className="rounded-full bg-blue-50 px-3 py-1">FINANCIAL: financeiro</span>
        </div>
      </div>

      {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}
      {loading ? <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">Carregando usuários...</div> : null}

      <form onSubmit={handleCreate} className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><UserRoundCog className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-black">Novo usuário da empresa</h2>
            <p className="text-sm text-slate-500">Crie acessos para funcionários da oficina, funilaria, lava-jato ou revenda.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <label className={labelClass}>Nome<input name="name" required placeholder="Ex: João Atendimento" className={inputClass} /></label>
          <label className={labelClass}>E-mail<input name="email" type="email" required placeholder="usuario@empresa.com" className={inputClass} /></label>
          <label className={labelClass}>Função<select name="role" defaultValue="ATTENDANT" className={inputClass}>{roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
          <label className={labelClass}>Senha<input name="password" type="password" required placeholder="Mínimo 6 caracteres" className={inputClass} /></label>
          <label className={labelClass}>Ativo<select name="active" defaultValue="true" className={inputClass}><option value="true">Sim</option><option value="false">Não</option></select></label>
        </div>

        <button className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Criar usuário</button>
      </form>

      <div className="grid gap-4">
        {users.map((user) => (
          <form key={user.id} onSubmit={(event) => handleUpdate(event, user.id)} className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1.4fr_180px_140px_1fr_auto] lg:items-end">
              <label className={labelClass}>Nome<input name="name" required defaultValue={user.name} className={inputClass} /></label>
              <div>
                <p className="text-sm font-bold text-slate-700">E-mail</p>
                <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{user.email}</p>
              </div>
              <label className={labelClass}>Função<select name="role" defaultValue={user.role} className={inputClass}>{roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
              <label className={labelClass}>Ativo<select name="active" defaultValue={String(user.active)} className={inputClass}><option value="true">Sim</option><option value="false">Não</option></select></label>
              <label className={labelClass}>Nova senha<input name="password" type="password" placeholder="Opcional" className={inputClass} /></label>
              <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Salvar</button>
            </div>
            <p className="mt-3 text-xs text-slate-500">Criado em {formatDate(user.createdAt)} • Último login: {formatDate(user.lastLoginAt)}</p>
          </form>
        ))}
      </div>

      {!loading && users.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 text-center text-sm font-bold text-slate-600 shadow-sm">
          <Users className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          Nenhum usuário encontrado para esta empresa.
        </div>
      ) : null}
    </div>
  );
}
