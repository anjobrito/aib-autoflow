"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import { getOperationalFormLabels } from "@/lib/business-domain-options";
import { getBusinessProfileByLabel } from "@/lib/business-profiles";
import { serviceCategories, serviceStatuses } from "@/lib/select-options";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";

type ServiceRow = {
  id: string;
  name: string;
  category: string;
  duration: string;
  price: string;
  status: string;
  origin: string;
  editable: boolean;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function ServicesClient() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const profile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);
  const labels = useMemo(() => getOperationalFormLabels(profile), [profile]);

  async function refresh() {
    setMessage("");

    try {
      const [companyResponse, servicesResponse] = await Promise.all([
        fetch("/api/company/me", { cache: "no-store" }),
        fetch(`/api/services${searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : ""}`, { cache: "no-store" }),
      ]);
      const companyResult = await companyResponse.json();
      const servicesResult = await servicesResponse.json();

      if (!companyResponse.ok || !companyResult.success) throw new Error(companyResult.message || "Company API unavailable");
      if (!servicesResponse.ok || !servicesResult.success) throw new Error(servicesResult.message || "Services API unavailable");

      setBusinessType(companyResult.company.businessTypeLabel || "Completo / Multioperação");

      const apiServices = (servicesResult.services || []).map((service: any) => ({
        id: service.id,
        name: service.name,
        category: service.category,
        duration: service.duration,
        price: formatCurrency(Number(service.price || 0)),
        status: service.status,
        origin: "Banco",
        editable: true,
      }));

      setServices(apiServices);
    } catch {
      setServices([]);
      setMessage("Banco/API indisponível ou sessão expirada. Entre novamente para usar serviços reais.");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateModal() {
    setEditingService(null);
    setIsFormOpen(true);
  }

  function openEditModal(service: ServiceRow) {
    setEditingService(service);
    setIsFormOpen(true);
  }

  function closeModal() {
    setEditingService(null);
    setIsFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (editingService) formData.set("id", editingService.id);

    const response = await fetch("/api/services", {
      method: editingService ? "PUT" : "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível salvar o serviço.");
      return;
    }

    form.reset();
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    closeModal();
  }

  const rows = useMemo(() => {
    if (!searchTerm.trim()) return services;
    const term = normalize(searchTerm);
    return services.filter((service) => normalize(`${service.name} ${service.category} ${service.duration} ${service.price} ${service.status}`).includes(term));
  }, [services, searchTerm]);

  const modalTitle = editingService ? `Editar ${labels.serviceLabel.toLowerCase()}` : `Cadastrar ${labels.serviceLabel.toLowerCase()}`;
  const modalDescription = editingService ? `Atualize este cadastro no banco desta empresa.` : `Cadastre opções respeitando o perfil ${profile.label}.`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Cadastro</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{labels.serviceLabel}s cadastrados</h2>
          <p className="mt-2 text-sm text-slate-600">Serviços reais são gravados por empresa no PostgreSQL. Cadastros novos começam limpos.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo {labels.serviceLabel.toLowerCase()}
        </button>
      </div>

      {saved ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Cadastro salvo!</div> : null}
      {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Buscar serviço
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onBlur={() => refresh()} placeholder="Busque por nome, categoria, tempo, preço ou status" className="w-full bg-transparent font-medium outline-none" />
          </span>
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{[labels.serviceLabel, "Categoria", "Tempo médio", "Preço", "Status", "Origem", "Ações"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIndex) => (
                <tr key={`${row.id}-${rowIndex}`} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-black text-slate-950">{row.name}</td>
                  <td className="px-5 py-4 text-slate-700">{row.category}</td>
                  <td className="px-5 py-4 text-slate-700">{row.duration}</td>
                  <td className="px-5 py-4 text-slate-700">{row.price}</td>
                  <td className="px-5 py-4 text-slate-700">{row.status}</td>
                  <td className="px-5 py-4 text-slate-700">{row.origin}</td>
                  <td className="px-5 py-4"><button type="button" onClick={() => openEditModal(row)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />Editar</button></td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Nenhum serviço cadastrado nesta empresa.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={modalTitle} description={modalDescription} onClose={closeModal}>
        <form key={editingService?.id ?? "new-service"} onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Nome<input name="name" required defaultValue={editingService?.name ?? ""} placeholder="Nome do serviço" className={inputClass} /></label>
            <label className={labelClass}>Categoria<select name="category" defaultValue={editingService?.category ?? serviceCategories[0]} className={inputClass}>{serviceCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className={labelClass}>Tempo médio<input name="duration" required inputMode="numeric" defaultValue={editingService?.duration ?? ""} placeholder="Tempo médio" className={inputClass} /></label>
            <label className={labelClass}>Preço<input name="price" required inputMode="decimal" defaultValue={editingService?.price ?? ""} placeholder="Preço" className={inputClass} /></label>
            <label className={labelClass}>Status<select name="status" defaultValue={editingService?.status ?? "Ativo"} className={inputClass}>{serviceStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">{editingService ? "Salvar alterações" : "Salvar cadastro"}</button>
          </div>
        </form>
      </UiModal>
    </div>
  );
}
