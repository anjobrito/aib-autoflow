"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UiModal } from "@/components/ui-modal";
import { NewWorkOrderForm } from "@/components/new-work-order-form";
import { getBusinessProfileByLabel } from "@/lib/business-types";

type OperationRow = {
  id: string;
  code: string;
  customer: string;
  vehicle: string;
  service: string;
  responsibleEmployeeName: string;
  status: string;
  total: string;
  origin: string;
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function WorkOrdersClient() {
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [orders, setOrders] = useState<OperationRow[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    setMessage("");

    try {
      const params = new URLSearchParams({ scope: "active" });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const [companyResponse, ordersResponse] = await Promise.all([
        fetch("/api/company/me", { cache: "no-store" }),
        fetch(`/api/work-orders?${params.toString()}`, { cache: "no-store" }),
      ]);
      const [companyResult, ordersResult] = await Promise.all([companyResponse.json(), ordersResponse.json()]);

      if (!companyResponse.ok || !companyResult.success) throw new Error(companyResult.message || "Company API unavailable");
      if (!ordersResponse.ok || !ordersResult.success) throw new Error(ordersResult.message || "Work orders API unavailable");

      setBusinessType(companyResult.company.businessTypeLabel || "Completo / Multioperação");
      setOrders(ordersResult.orders || []);
    } catch {
      setOrders([]);
      setMessage("Banco/API indisponível ou sessão expirada. Entre novamente para usar ordens reais.");
    }
  }

  useEffect(() => {
    refresh();
    window.addEventListener("ajb-company-updated", refresh);
    return () => window.removeEventListener("ajb-company-updated", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);

  const rows = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const term = normalize(searchTerm);
    return orders.filter((row) => normalize(`${row.code} ${row.customer} ${row.vehicle} ${row.service} ${row.status} ${row.total} ${row.origin}`).includes(term));
  }, [orders, searchTerm]);

  const operationColumn = profile.operationLabel;
  const serviceColumn = profile.id === "REVENDEDORA" ? "Etapa / preparação" : profile.id === "ESTACIONAMENTO" ? "Contrato / permanência" : profile.id === "AUTOPECAS" ? "Pedido / produto" : "Serviço";
  const responsibleColumn = profile.id === "REVENDEDORA" ? "Vendedor" : "Responsável";

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">Contexto operacional ativo</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Perfil</p><p className="mt-2 text-lg font-black text-slate-950">{profile.label}</p></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Fluxo</p><p className="mt-2 text-lg font-black text-slate-950">{profile.operationPluralLabel}</p></div>
              <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Kanban</p><p className="mt-2 text-lg font-black text-slate-950">{profile.kanbanLabel}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{profile.kanbanStatuses.map((status) => <span key={status} className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">{status}</span>)}</div>
          </div>
          <button type="button" onClick={() => setIsFormOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Novo {profile.operationLabel}</button>
        </div>
      </section>

      {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <label className="grid gap-2 text-sm font-bold text-slate-700">Buscar fluxo operacional ativo<span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white"><Search className="h-4 w-4 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onBlur={() => refresh()} placeholder="Busca somente OS ativas. Finalizadas ficam no histórico." className="w-full bg-transparent font-medium outline-none" /></span></label>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6"><h2 className="text-xl font-black text-slate-950">{profile.operationPluralLabel} ativos</h2><p className="mt-2 text-sm text-slate-600">OS entregues, finalizadas, faturadas ou canceladas saem desta tela e ficam no histórico para conferência.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[operationColumn, "Cliente", "Veículo", serviceColumn, responsibleColumn, "Status", "Total", "Origem", "Detalhe"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={`${row.id}-${row.origin}`} className="hover:bg-slate-50"><td className="px-5 py-4 font-black text-slate-950">{row.code}</td><td className="px-5 py-4 text-slate-700">{row.customer}</td><td className="px-5 py-4 text-slate-700">{row.vehicle}</td><td className="px-5 py-4 text-slate-700">{row.service}</td><td className="px-5 py-4 text-slate-700">{row.responsibleEmployeeName}</td><td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{row.status}</span></td><td className="px-5 py-4 text-slate-700">{row.total}</td><td className="px-5 py-4 text-slate-700">{row.origin}</td><td className="px-5 py-4"><Link href={`/ordens-servico/${row.id}`} className="font-black text-blue-700 hover:text-blue-900">Abrir</Link></td></tr>)}
              {rows.length === 0 ? <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-500">Nenhuma OS ativa. Crie uma nova OS ou consulte finalizadas no histórico.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={`Novo ${profile.operationLabel}`} description={`Cadastre ${profile.operationPluralLabel.toLowerCase()} em lightbox, respeitando o fluxo operacional do perfil ${profile.label}.`} onClose={() => setIsFormOpen(false)}>
        <NewWorkOrderForm onCancel={() => setIsFormOpen(false)} onSaved={() => { refresh(); setIsFormOpen(false); }} submitLabel={`Salvar ${profile.operationLabel}`} />
      </UiModal>
    </div>
  );
}
