"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Play, RefreshCw, Wrench } from "lucide-react";

type MobileCard = {
  id: string;
  code: string;
  customer: string;
  vehicle: string;
  plate: string;
  service: string;
  status: string;
};

function statusLabel(status: string) {
  if (status === "Aberta") return "Aguardando início";
  if (status === "Em andamento") return "Em andamento";
  if (status === "Aguardando peças") return "Aguardando peça";
  if (status === "Pronto para retirada") return "Pronta para retirada";
  return status || "Sem status";
}

function statusClass(status: string) {
  if (status === "Em andamento") return "bg-emerald-400 text-slate-950 ring-emerald-200/40";
  if (status === "Pronto para retirada") return "bg-blue-400 text-slate-950 ring-blue-200/40";
  if (status === "Aguardando peças") return "bg-amber-300 text-slate-950 ring-amber-200/40";
  return "bg-white text-slate-950 ring-white/40";
}

function orderPriority(status: string) {
  if (status === "Em andamento") return 1;
  if (status === "Aberta") return 2;
  if (status === "Aguardando peças") return 3;
  if (status === "Pronto para retirada") return 4;
  return 5;
}

export function MobileYardClient() {
  const [cards, setCards] = useState<MobileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadCards() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/work-orders?scope=active", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Não foi possível carregar o pátio.");
      const rows: MobileCard[] = (result.orders || []).map((order: any) => ({
        id: order.id,
        code: order.code,
        customer: order.customer || "Cliente não informado",
        vehicle: String(order.vehicle || "Veículo não informado").replace(`${order.plate || ""} - `, ""),
        plate: order.plate || "Não informada",
        service: order.service || "Serviço não informado",
        status: order.status,
      }));
      setCards(rows.sort((a, b) => orderPriority(a.status) - orderPriority(b.status)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar o pátio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
  }, []);

  const stats = useMemo(() => ({
    total: cards.length,
    running: cards.filter((card) => card.status === "Em andamento").length,
    ready: cards.filter((card) => card.status === "Pronto para retirada").length,
  }), [cards]);

  async function changeStatus(card: MobileCard, status: string) {
    const formData = new FormData();
    formData.set("status", status);
    const response = await fetch(`/api/work-orders/${card.id}/status`, { method: "PATCH", body: formData });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message || "Não foi possível atualizar a OS.");
      return;
    }
    await loadCards();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white sm:px-6">
      <header className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">AJB AutoFlow by AJBSYSTEMS</p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Pátio Mobile</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Operação móvel conectada ao PostgreSQL e isolada pela empresa autenticada.</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-blue-500 shadow-lg shadow-blue-950/40"><Wrench className="h-7 w-7" /></div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-3xl bg-slate-950/70 p-4"><p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-400">OS</p><p className="mt-1 text-2xl font-black">{stats.total}</p></div>
            <div className="rounded-3xl bg-emerald-400/15 p-4"><p className="text-[0.65rem] font-black uppercase tracking-wide text-emerald-200">Rodando</p><p className="mt-1 text-2xl font-black text-emerald-200">{stats.running}</p></div>
            <div className="rounded-3xl bg-blue-400/15 p-4"><p className="text-[0.65rem] font-black uppercase tracking-wide text-blue-200">Prontas</p><p className="mt-1 text-2xl font-black text-blue-200">{stats.ready}</p></div>
          </div>
        </div>
      </header>

      <section className="mx-auto mt-6 grid max-w-2xl gap-4 pb-8">
        {message ? <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">{message}</div> : null}
        {loading ? <div className="rounded-[2rem] bg-white/10 p-6 text-center text-slate-300">Carregando pátio...</div> : cards.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/10 p-6 text-center shadow-xl shadow-slate-950/30">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-500/20 text-blue-200"><Wrench className="h-8 w-8" /></div>
            <h2 className="mt-4 text-2xl font-black">Nenhuma OS no pátio</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Somente ordens ativas da empresa autenticada aparecem aqui.</p>
            <Link href="/ordens-servico/nova" className="mt-5 inline-flex min-h-14 items-center justify-center rounded-3xl bg-blue-500 px-6 text-base font-black text-white">Criar primeira OS</Link>
          </div>
        ) : cards.map((card) => {
          const canStart = card.status !== "Em andamento" && card.status !== "Pronto para retirada";
          const canFinish = card.status !== "Pronto para retirada";
          return (
            <article key={card.id} className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-xl shadow-slate-950/30 backdrop-blur">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-black text-blue-300">{card.code}</p><h2 className="mt-1 text-2xl font-black leading-tight text-white">{card.vehicle}</h2><p className="mt-2 text-sm text-slate-300">{card.customer}</p></div><span className={`shrink-0 rounded-full px-3 py-2 text-[0.68rem] font-black uppercase tracking-wide ring-2 ${statusClass(card.status)}`}>{statusLabel(card.status)}</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-3xl bg-slate-950/70 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Placa</p><p className="mt-1 text-xl font-black text-white">{card.plate}</p></div><div className="rounded-3xl bg-slate-950/70 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Serviço</p><p className="mt-1 font-black text-white">{card.service}</p></div></div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => changeStatus(card, "Em andamento")} disabled={!canStart} className="flex min-h-24 flex-col items-center justify-center rounded-3xl bg-emerald-500 px-3 text-slate-950 disabled:opacity-45"><Play className="h-8 w-8 fill-current" /><span className="mt-2 text-lg font-black">Iniciar</span></button>
                <button type="button" onClick={() => changeStatus(card, "Pronto para retirada")} disabled={!canFinish} className="flex min-h-24 flex-col items-center justify-center rounded-3xl bg-blue-500 px-3 text-white disabled:opacity-45"><CheckCircle2 className="h-8 w-8" /><span className="mt-2 text-lg font-black">Finalizar</span></button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3"><button type="button" onClick={loadCards} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/10 px-4 text-sm font-black text-slate-200"><RefreshCw className="h-4 w-4" /> Atualizar</button><Link href={`/ordens-servico/${card.id}`} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-3xl bg-white px-4 text-sm font-black text-slate-950"><ExternalLink className="h-4 w-4" /> Abrir OS</Link></div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
