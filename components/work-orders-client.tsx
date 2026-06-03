"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UiModal } from "@/components/ui-modal";
import { NewWorkOrderForm } from "@/components/new-work-order-form";
import { getCompany } from "@/lib/browser-store";
import { BusinessProfile, getBusinessProfileByLabel } from "@/lib/business-types";

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

const demoOperationsByProfile: Record<BusinessProfile["id"], OperationRow[]> = {
  COMPLETO: [
    { id: "demo-completo-1", code: "OP-1024", customer: "João Pereira", vehicle: "Honda Civic", service: "Revisão e higienização", responsibleEmployeeName: "Marcos", status: "Em atendimento", total: "R$ 318,00", origin: "Modelo" },
    { id: "demo-completo-2", code: "OP-1025", customer: "Maria Souza", vehicle: "Fiat Argo", service: "Preparação operacional", responsibleEmployeeName: "Carla", status: "Aguardando", total: "R$ 540,00", origin: "Modelo" },
    { id: "demo-completo-3", code: "OP-1026", customer: "Carlos Lima", vehicle: "VW Gol", service: "Atendimento completo", responsibleEmployeeName: "Rafael", status: "Pronto", total: "R$ 270,00", origin: "Modelo" },
  ],
  OFICINA: [
    { id: "demo-oficina-1", code: "OS-1024", customer: "João Pereira", vehicle: "Honda Civic", service: "Troca de óleo", responsibleEmployeeName: "Marcos", status: "Em andamento", total: "R$ 238,00", origin: "Modelo" },
    { id: "demo-oficina-2", code: "OS-1025", customer: "Maria Souza", vehicle: "Fiat Argo", service: "Freio dianteiro", responsibleEmployeeName: "Rafael", status: "Aguardando peça", total: "R$ 640,00", origin: "Modelo" },
    { id: "demo-oficina-3", code: "OS-1026", customer: "Carlos Lima", vehicle: "VW Gol", service: "Diagnóstico de suspensão", responsibleEmployeeName: "Marcos", status: "Controle de qualidade", total: "R$ 380,00", origin: "Modelo" },
  ],
  LAVA_JATO: [
    { id: "demo-lava-1", code: "AT-1024", customer: "João Pereira", vehicle: "Honda Civic", service: "Lavagem completa", responsibleEmployeeName: "Diego", status: "Em lavagem", total: "R$ 70,00", origin: "Modelo" },
    { id: "demo-lava-2", code: "AT-1025", customer: "Maria Souza", vehicle: "Fiat Argo", service: "Lavagem técnica", responsibleEmployeeName: "Bruno", status: "Acabamento", total: "R$ 120,00", origin: "Modelo" },
    { id: "demo-lava-3", code: "AT-1026", customer: "Carlos Lima", vehicle: "VW Gol", service: "Aspiração e cera", responsibleEmployeeName: "Diego", status: "Pronto", total: "R$ 95,00", origin: "Modelo" },
  ],
  ESTETICA: [
    { id: "demo-estetica-1", code: "AE-1024", customer: "João Pereira", vehicle: "Honda Civic", service: "Polimento técnico", responsibleEmployeeName: "Marcos", status: "Em execução", total: "R$ 480,00", origin: "Modelo" },
    { id: "demo-estetica-2", code: "AE-1025", customer: "Maria Souza", vehicle: "Fiat Argo", service: "Vitrificação de pintura", responsibleEmployeeName: "Carla", status: "Cura/secagem", total: "R$ 1.200,00", origin: "Modelo" },
    { id: "demo-estetica-3", code: "AE-1026", customer: "Carlos Lima", vehicle: "VW Gol", service: "Higienização interna", responsibleEmployeeName: "Marcos", status: "Revisão final", total: "R$ 280,00", origin: "Modelo" },
  ],
  CENTRO_AUTOMOTIVO: [
    { id: "demo-centro-1", code: "OA-1024", customer: "João Pereira", vehicle: "Honda Civic", service: "Diagnóstico e revisão", responsibleEmployeeName: "Marcos", status: "Diagnóstico", total: "R$ 420,00", origin: "Modelo" },
    { id: "demo-centro-2", code: "OA-1025", customer: "Maria Souza", vehicle: "Fiat Argo", service: "Serviço com peça em estoque", responsibleEmployeeName: "Rafael", status: "Em execução", total: "R$ 690,00", origin: "Modelo" },
    { id: "demo-centro-3", code: "OA-1026", customer: "Carlos Lima", vehicle: "VW Gol", service: "Controle de qualidade", responsibleEmployeeName: "Carla", status: "Controle de qualidade", total: "R$ 350,00", origin: "Modelo" },
  ],
  ESTACIONAMENTO: [
    { id: "demo-estacionamento-1", code: "MOV-1024", customer: "João Pereira", vehicle: "Honda Civic", service: "Diária avulsa", responsibleEmployeeName: "Portaria", status: "Estacionado", total: "R$ 25,00", origin: "Modelo" },
    { id: "demo-estacionamento-2", code: "MOV-1025", customer: "Maria Souza", vehicle: "Fiat Argo", service: "Mensalista", responsibleEmployeeName: "Administração", status: "Mensalista", total: "R$ 220,00", origin: "Modelo" },
    { id: "demo-estacionamento-3", code: "MOV-1026", customer: "Carlos Lima", vehicle: "VW Gol", service: "Pagamento pendente", responsibleEmployeeName: "Portaria", status: "Pagamento pendente", total: "R$ 40,00", origin: "Modelo" },
  ],
  REVENDEDORA: [
    { id: "demo-revenda-1", code: "PV-1024", customer: "João Pereira", vehicle: "Honda Civic", service: "Preparação para venda", responsibleEmployeeName: "Marcos", status: "Preparação", total: "R$ 850,00", origin: "Modelo" },
    { id: "demo-revenda-2", code: "PV-1025", customer: "Maria Souza", vehicle: "Fiat Argo", service: "Negociação em andamento", responsibleEmployeeName: "Carla", status: "Em negociação", total: "R$ 58.900,00", origin: "Modelo" },
    { id: "demo-revenda-3", code: "PV-1026", customer: "Carlos Lima", vehicle: "VW Gol", service: "Documentação e gravame", responsibleEmployeeName: "Rafael", status: "Documentação", total: "R$ 34.500,00", origin: "Modelo" },
  ],
  AUTOPECAS: [
    { id: "demo-autopecas-1", code: "PV-1024", customer: "João Pereira", vehicle: "Retirada balcão", service: "Pedido de filtros", responsibleEmployeeName: "Bruno", status: "Separação", total: "R$ 128,00", origin: "Modelo" },
    { id: "demo-autopecas-2", code: "PV-1025", customer: "Maria Souza", vehicle: "Entrega local", service: "Venda de bateria", responsibleEmployeeName: "Carla", status: "Aguardando pagamento", total: "R$ 420,00", origin: "Modelo" },
    { id: "demo-autopecas-3", code: "PV-1026", customer: "Carlos Lima", vehicle: "Pedido online", service: "Separação de peças", responsibleEmployeeName: "Bruno", status: "Faturado", total: "R$ 260,00", origin: "Modelo" },
  ],
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getDemoOperationsForProfile(profile: BusinessProfile) {
  return demoOperationsByProfile[profile.id] ?? demoOperationsByProfile.COMPLETO;
}

export function WorkOrdersClient() {
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [orders, setOrders] = useState<OperationRow[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    setBusinessType(getCompany().businessType || "Completo / Multioperação");
    setMessage("");

    try {
      const query = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : "";
      const response = await fetch(`/api/work-orders${query}`, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) throw new Error(result.message || "Work orders API unavailable");
      setOrders(result.orders || []);
    } catch {
      setOrders([]);
      setMessage("Banco/API indisponível ou sessão expirada. Entre novamente para usar ordens reais.");
    }
  }

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ajb-company-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ajb-company-updated", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);

  const rows = useMemo(() => {
    const visibleRows = orders.length > 0 || !message ? orders : getDemoOperationsForProfile(profile);
    if (!searchTerm.trim()) return visibleRows;
    const term = normalize(searchTerm);
    return visibleRows.filter((row) => normalize(`${row.code} ${row.customer} ${row.vehicle} ${row.service} ${row.status} ${row.total} ${row.origin}`).includes(term));
  }, [orders, message, profile, searchTerm]);

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
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Perfil</p>
                <p className="mt-2 text-lg font-black text-slate-950">{profile.label}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Fluxo</p>
                <p className="mt-2 text-lg font-black text-slate-950">{profile.operationPluralLabel}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Kanban</p>
                <p className="mt-2 text-lg font-black text-slate-950">{profile.kanbanLabel}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.kanbanStatuses.map((status) => (
                <span key={status} className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">{status}</span>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setIsFormOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Novo {profile.operationLabel}
          </button>
        </div>
      </section>

      {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Buscar fluxo operacional
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onBlur={() => refresh()} placeholder="Busque por código, cliente, veículo, serviço, status ou total" className="w-full bg-transparent font-medium outline-none" />
          </span>
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h2 className="text-xl font-black text-slate-950">{profile.operationPluralLabel}</h2>
          <p className="mt-2 text-sm text-slate-600">Lista operacional gravada por empresa no PostgreSQL. Cadastros novos abrem em lightbox para manter a tela limpa.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[operationColumn, "Cliente", "Veículo", serviceColumn, responsibleColumn, "Status", "Total", "Origem", "Detalhe"].map((column) => (
                  <th key={column} className="px-5 py-4 font-black">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={`${row.id}-${row.origin}`} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-black text-slate-950">{row.code}</td>
                  <td className="px-5 py-4 text-slate-700">{row.customer}</td>
                  <td className="px-5 py-4 text-slate-700">{row.vehicle}</td>
                  <td className="px-5 py-4 text-slate-700">{row.service}</td>
                  <td className="px-5 py-4 text-slate-700">{row.responsibleEmployeeName}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{row.status}</span></td>
                  <td className="px-5 py-4 text-slate-700">{row.total}</td>
                  <td className="px-5 py-4 text-slate-700">{row.origin}</td>
                  <td className="px-5 py-4"><Link href={`/ordens-servico/${row.id}`} className="font-black text-blue-700 hover:text-blue-900">Abrir</Link></td>
                </tr>
              ))}
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
