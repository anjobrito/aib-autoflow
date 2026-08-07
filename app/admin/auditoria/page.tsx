"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";

type AuditEvent = {
  id: string;
  companyId?: string | null;
  actorType: string;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: string | null;
  createdAt: string;
};

function displayValue(value?: string | null) {
  if (!value) return "-";
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadAudit() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/audit?limit=300", { cache: "no-store" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível carregar a auditoria.");
      return;
    }
    setEvents(result.events || []);
  }

  useEffect(() => {
    loadAudit();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) =>
      [event.actorName, event.action, event.entityType, event.entityId, event.companyId, event.field]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [events, search]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <p className="text-lg font-black">Auditoria AJBSYSTEMS</p>
              <p className="text-xs text-blue-100">Rastreabilidade de ações críticas do SaaS</p>
            </div>
          </div>
          <div className="flex gap-3">
            <a href="/admin" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 text-sm font-black hover:bg-white hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Admin</a>
            <button type="button" onClick={loadAudit} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"><RefreshCw className="h-4 w-4" />Atualizar</button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-8 sm:px-10 lg:px-16">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black">Linha do tempo de auditoria</h1>
          <p className="mt-2 text-sm text-slate-600">Eventos de licença, bloqueio, financeiro, financiamento e demais ações críticas.</p>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por usuário, ação, entidade, empresa ou ID..." className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white" />
        </div>

        {message ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</div> : null}
        {loading ? <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">Carregando eventos...</div> : null}

        <div className="grid gap-4">
          {filtered.map((event) => (
            <article key={event.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">{event.action}</p>
                  <h2 className="mt-1 text-lg font-black">{event.entityType}{event.entityId ? ` • ${event.entityId}` : ""}</h2>
                  <p className="mt-1 text-sm text-slate-600">{event.actorName || event.actorType} • empresa {event.companyId || "plataforma"}</p>
                </div>
                <time className="text-xs font-bold text-slate-500">{new Date(event.createdAt).toLocaleString("pt-BR")}</time>
              </div>
              {event.field ? <p className="mt-3 text-sm"><strong>Campo:</strong> {event.field}</p> : null}
              {(event.oldValue || event.newValue) ? (
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs"><strong>Antes</strong>{"\n"}{displayValue(event.oldValue)}</pre>
                  <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs"><strong>Depois</strong>{"\n"}{displayValue(event.newValue)}</pre>
                </div>
              ) : null}
            </article>
          ))}
          {!loading && filtered.length === 0 ? <div className="rounded-3xl bg-white p-6 text-sm font-bold text-slate-500">Nenhum evento encontrado.</div> : null}
        </div>
      </section>
    </main>
  );
}
