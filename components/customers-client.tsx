"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import { brazilianStates, getCitiesByState } from "@/lib/select-options";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";

type CustomerRow = {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  origin: string;
  editable: boolean;
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function CustomersClient() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedState, setSelectedState] = useState("SP");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const cities = getCitiesByState(selectedState);

  async function refresh() {
    setMessage("");

    try {
      const query = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : "";
      const response = await fetch(`/api/customers${query}`, { cache: "no-store" });

      if (!response.ok) throw new Error("API unavailable");

      const result = await response.json();
      const apiCustomers = (result.customers || []).map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        document: customer.document,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        state: customer.state,
        origin: "Banco",
        editable: true,
      }));

      setCustomers(apiCustomers);
    } catch {
      setCustomers([]);
      setMessage("Banco/API indisponível ou sessão expirada. Entre novamente para usar clientes reais.");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateModal() {
    setEditingCustomer(null);
    setSelectedState("SP");
    setIsFormOpen(true);
  }

  function openEditModal(customer: CustomerRow) {
    setEditingCustomer(customer);
    setSelectedState(customer.state || "SP");
    setIsFormOpen(true);
  }

  function closeModal() {
    setEditingCustomer(null);
    setSelectedState("SP");
    setIsFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const endpoint = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
    const method = editingCustomer ? "PUT" : "POST";

    const response = await fetch(endpoint, { method, body: formData });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível salvar o cliente.");
      return;
    }

    form.reset();
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    closeModal();
  }

  const rows = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = normalize(searchTerm);
    return customers.filter((customer) => normalize(`${customer.name} ${customer.document || ""} ${customer.phone || ""} ${customer.email || ""} ${customer.city || ""} ${customer.state || ""}`).includes(term));
  }, [customers, searchTerm]);

  const modalTitle = editingCustomer ? "Editar cliente" : "Cadastrar cliente";
  const modalDescription = editingCustomer ? "Atualize os dados do cliente no banco desta empresa." : "Registre o cliente no banco desta empresa.";

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Cadastro</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Clientes cadastrados</h2>
          <p className="mt-2 text-sm text-slate-600">Clientes reais são gravados por empresa no PostgreSQL. Cadastros novos começam limpos.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo cliente
        </button>
      </div>

      {saved ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Cliente salvo!</div> : null}
      {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Buscar cliente
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onBlur={() => refresh()}
              placeholder="Busque por nome, CPF/CNPJ, telefone, e-mail, cidade ou UF"
              className="w-full bg-transparent font-medium outline-none"
            />
          </span>
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Cliente", "Telefone", "E-mail", "Cidade", "Origem", "Ações"].map((column) => (
                  <th key={column} className="px-5 py-4 font-black">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIndex) => (
                <tr key={`${row.id}-${rowIndex}`} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-black text-slate-950">{row.name}</td>
                  <td className="px-5 py-4 text-slate-700">{row.phone || "-"}</td>
                  <td className="px-5 py-4 text-slate-700">{row.email || "-"}</td>
                  <td className="px-5 py-4 text-slate-700">{row.city || "-"}/{row.state || "-"}</td>
                  <td className="px-5 py-4 text-slate-700">{row.origin}</td>
                  <td className="px-5 py-4">
                    <button type="button" onClick={() => openEditModal(row)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />Editar</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Nenhum cliente cadastrado nesta empresa.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={modalTitle} description={modalDescription} onClose={closeModal}>
        <form key={editingCustomer?.id ?? "new-customer"} onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Nome completo<input required name="name" defaultValue={editingCustomer?.name ?? ""} placeholder="Nome do cliente" autoComplete="name" className={inputClass} /></label>
            <label className={labelClass}>CPF/CNPJ<input name="document" defaultValue={editingCustomer?.document ?? ""} inputMode="numeric" placeholder="CPF ou CNPJ" className={inputClass} /></label>
            <label className={labelClass}>Telefone / WhatsApp<input required name="phone" defaultValue={editingCustomer?.phone ?? ""} inputMode="tel" autoComplete="tel" placeholder="Telefone do cliente" className={inputClass} /></label>
            <label className={labelClass}>E-mail<input name="email" type="email" defaultValue={editingCustomer?.email ?? ""} autoComplete="email" placeholder="E-mail do cliente" className={inputClass} /></label>
            <label className={labelClass}>UF<select name="state" value={selectedState} onChange={(event) => setSelectedState(event.target.value)} className={inputClass}>{brazilianStates.map((state) => <option key={state}>{state}</option>)}</select></label>
            <label className={labelClass}>Cidade<select name="city" defaultValue={editingCustomer?.city ?? cities[0]} className={inputClass}>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">{editingCustomer ? "Salvar alterações" : "Salvar cliente"}</button>
          </div>
        </form>
      </UiModal>
    </div>
  );
}
