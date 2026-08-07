"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Commission = {
  id: string;
  employeeName: string;
  targetType: string;
  targetName: string;
  calculatedAmount: string;
  status: string;
  sourceWorkOrderId: string;
};

function money(value: string) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(amount) ? amount : 0);
}

export function WorkOrderCommissionClient({ workOrderId }: { workOrderId: string }) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/commissions", { cache: "no-store" });
        const result = await response.json();
        if (!active) return;
        setCommissions(response.ok ? (result.commissions || []).filter((item: Commission) => item.sourceWorkOrderId === workOrderId) : []);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [workOrderId]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Comissões da OS</h2>
          <p className="mt-2 text-sm text-slate-600">Comissões persistidas no PostgreSQL e vinculadas à empresa autenticada.</p>
        </div>
        <Link href="/comissoes" className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-50">Gerenciar comissões</Link>
      </div>

      {loading ? <p className="mt-6 text-sm font-semibold text-slate-500">Carregando...</p> : commissions.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-900">
          Nenhuma comissão vinculada a esta OS. O lançamento pode ser feito no módulo de comissões. A geração automática por responsável será reativada quando o responsável da OS estiver persistido no banco.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {commissions.map((commission) => (
            <Link key={commission.id} href={`/comissoes/${commission.id}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:bg-blue-50">
              <p className="text-sm font-bold text-slate-500">{commission.targetType}</p>
              <p className="mt-2 font-black text-slate-950">{commission.employeeName}</p>
              <p className="mt-1 text-sm text-slate-600">{commission.targetName}</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{money(commission.calculatedAmount)}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-blue-700">{commission.status}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
