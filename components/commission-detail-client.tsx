"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Commission = {
  id: string;
  employeeName: string;
  targetType: string;
  targetName: string;
  valueType: string;
  value: string;
  baseAmount: string;
  calculatedAmount: string;
  status: string;
  referenceDate: string;
  paidAt: string;
  sourceWorkOrderId: string;
  sourceWorkOrderCode: string;
  financialEntryId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

function money(value: string) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTime(value?: string) {
  if (!value) return "Não registrado";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const className = status === "Paga"
    ? "bg-emerald-100 text-emerald-700"
    : status === "Cancelada"
      ? "bg-rose-100 text-rose-700"
      : "bg-amber-100 text-amber-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{status}</span>;
}

export function CommissionDetailClient({ id }: { id: string }) {
  const [commission, setCommission] = useState<Commission | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/commissions/${id}`, { cache: "no-store" });
        const result = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(result.message || "Comissão não encontrada.");
        setCommission(result.commission);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Falha ao carregar comissão.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="rounded-3xl bg-white p-8 text-center font-semibold text-slate-500 shadow-sm">Carregando comissão...</div>;

  if (!commission) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
        <p className="text-xl font-black text-slate-950">Comissão não encontrada</p>
        <p className="mt-2 text-sm text-slate-600">{message || "O lançamento não existe ou não pertence à empresa autenticada."}</p>
        <Link href="/comissoes" className="mt-5 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Voltar</Link>
      </div>
    );
  }

  const details = [
    ["Funcionário", commission.employeeName || "Funcionário a definir"],
    ["Base", commission.targetType],
    ["Item", commission.targetName],
    ["Valor base", money(commission.baseAmount)],
    ["Regra", `${commission.valueType} • ${commission.value}`],
    ["Comissão calculada", money(commission.calculatedAmount)],
    ["Data de referência", commission.referenceDate || "Não informada"],
    ["Origem", commission.sourceWorkOrderCode || "Lançamento manual"],
    ["Conta a pagar", `Vinculada • ${commission.financialEntryId}`],
    ["Observações", commission.notes || "Sem observações"],
  ];

  const timeline = [
    ["Comissão criada", formatDateTime(commission.createdAt)],
    ["Última atualização", formatDateTime(commission.updatedAt)],
    ["Pagamento", commission.paidAt ? formatDateTime(commission.paidAt) : "Ainda não paga"],
    ["Vínculo financeiro", "Persistida diretamente no contas a pagar da empresa."],
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h2 className="text-2xl font-black text-slate-950">{commission.employeeName}</h2><p className="mt-2 text-sm font-semibold text-slate-600">{commission.targetType} • {commission.targetName}</p></div>
            <StatusBadge status={commission.status || "Pendente"} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">{details.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 break-words font-black text-slate-950">{value}</p></div>)}</div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/comissoes" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Editar na lista</Link>
            {commission.sourceWorkOrderId ? <Link href={`/ordens-servico/${commission.sourceWorkOrderId}`} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-50">Abrir OS</Link> : null}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-black text-slate-950">Histórico</h2><div className="mt-6 grid gap-4">{timeline.map(([title, description], index) => <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 p-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">{index + 1}</div><div><p className="font-black text-slate-950">{title}</p><p className="text-sm text-slate-500">{description}</p></div></div>)}</div></div>
      </div>
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm"><p className="text-sm font-bold text-blue-300">Leitura gerencial</p><h2 className="mt-2 text-2xl font-black">Comissão e financeiro são o mesmo registro.</h2><p className="mt-4 text-sm leading-6 text-slate-300">Isso evita divergência entre o módulo de comissões e contas a pagar.</p><div className="mt-6 grid gap-3 text-sm text-slate-200"><div className="rounded-2xl bg-white/10 p-4">Calculado: {money(commission.calculatedAmount)}</div><div className="rounded-2xl bg-white/10 p-4">Origem: {commission.sourceWorkOrderCode || "Manual"}</div><div className="rounded-2xl bg-white/10 p-4">Status: {commission.status}</div></div></div>
    </div>
  );
}
