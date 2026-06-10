"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import { vehicleBrands, vehiclePowertrains } from "@/lib/select-options";

type CustomerOption = {
  id: string;
  name: string;
  phone?: string | null;
  document?: string | null;
};

type VehicleRow = {
  id: string;
  customerId?: string | null;
  plate: string;
  brand?: string | null;
  model: string;
  year?: number | null;
  color?: string | null;
  mileage?: number | null;
  powertrain?: string | null;
  customerName: string;
  customerPhone?: string | null;
  status: string;
  editable: boolean;
};

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatMileage(value?: number | null) {
  if (!value) return "0 km";
  return `${value.toLocaleString("pt-BR")} km`;
}

export function VehiclesClient() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const [saved, setSaved] = useState(false);
  const [plate, setPlate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");

  async function refreshCustomers() {
    const response = await fetch("/api/customers", { cache: "no-store" });
    if (!response.ok) throw new Error("Customers API unavailable");

    const result = await response.json();
    const apiCustomers = (result.customers || []).map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      document: customer.document,
    }));

    setCustomers(apiCustomers);
    return apiCustomers;
  }

  async function refreshVehicles() {
    const query = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : "";
    const response = await fetch(`/api/vehicles${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Vehicles API unavailable");

    const result = await response.json();
    const apiVehicles = (result.vehicles || []).map((vehicle: any) => ({
      id: vehicle.id,
      customerId: vehicle.customerId,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
      powertrain: vehicle.powertrain,
      customerName: vehicle.customer?.name || "Cliente não informado",
      customerPhone: vehicle.customer?.phone,
      status: "Banco",
      editable: true,
    }));

    setVehicles(apiVehicles);
  }

  async function refresh() {
    setMessage("");

    try {
      await refreshCustomers();
      await refreshVehicles();
    } catch {
      setVehicles([]);
      setCustomers([]);
      setMessage("Banco/API indisponível, nenhum cliente cadastrado ou sessão expirada. Entre novamente e cadastre clientes antes de vincular veículos.");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateModal() {
    setEditingVehicle(null);
    setPlate("");
    setIsFormOpen(true);
  }

  function openEditModal(vehicle: VehicleRow) {
    setEditingVehicle(vehicle);
    setPlate(vehicle.plate);
    setIsFormOpen(true);
  }

  function closeModal() {
    setEditingVehicle(null);
    setPlate("");
    setIsFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const endpoint = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : "/api/vehicles";
    const method = editingVehicle ? "PUT" : "POST";

    const response = await fetch(endpoint, { method, body: formData });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível salvar o veículo.");
      return;
    }

    form.reset();
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    closeModal();
  }

  const rows = useMemo(() => {
    if (!searchTerm.trim()) return vehicles;
    const term = normalize(searchTerm);
    return vehicles.filter((vehicle) => normalize(`${vehicle.plate} ${vehicle.brand || ""} ${vehicle.model} ${vehicle.customerName} ${vehicle.customerPhone || ""} ${vehicle.powertrain || ""}`).includes(term));
  }, [vehicles, searchTerm]);

  const modalTitle = editingVehicle ? "Editar veículo" : "Cadastrar veículo";
  const modalDescription = editingVehicle ? "Atualize o veículo no banco desta empresa." : "Vincule o veículo a um cliente real desta empresa.";

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Cadastro</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Veículos cadastrados</h2>
          <p className="mt-2 text-sm text-slate-600">Veículos reais são gravados por empresa no PostgreSQL e vinculados a clientes do mesmo tenant.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo veículo
        </button>
      </div>

      {saved ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Veículo salvo!</div> : null}
      {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Buscar veículo
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onBlur={() => refresh()}
              placeholder="Busque por placa, modelo, marca, cliente, telefone ou propulsão"
              className="w-full bg-transparent font-medium outline-none"
            />
          </span>
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Placa", "Veículo", "Cliente", "Km atual", "Propulsão", "Situação", "Ações"].map((column) => (
                  <th key={column} className="px-5 py-4 font-black">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIndex) => (
                <tr key={`${row.id}-${rowIndex}`} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-slate-700"><span className="font-black text-slate-950">{row.plate}</span></td>
                  <td className="px-5 py-4 text-slate-700">{`${row.brand || ""} ${row.model}`.trim()}</td>
                  <td className="px-5 py-4 text-slate-700">{row.customerName}</td>
                  <td className="px-5 py-4 text-slate-700">{formatMileage(row.mileage)}</td>
                  <td className="px-5 py-4 text-slate-700">{row.powertrain || "Não informado"}</td>
                  <td className="px-5 py-4 text-slate-700">{row.status}</td>
                  <td className="px-5 py-4">
                    <button type="button" onClick={() => openEditModal(row)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />Editar</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Nenhum veículo cadastrado nesta empresa.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={modalTitle} description={modalDescription} onClose={closeModal}>
        <form key={editingVehicle?.id ?? "new-vehicle"} onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Cliente<select required name="customerId" defaultValue={editingVehicle?.customerId ?? ""} className={inputClass}><option value="" disabled>Selecione um cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
            <label className={labelClass}>Placa<input required name="plate" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" placeholder="Placa do veículo" className={`${inputClass} uppercase`} /></label>
            <label className={labelClass}>Marca<select name="brand" defaultValue={editingVehicle?.brand ?? vehicleBrands[0]} className={inputClass}>{vehicleBrands.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
            <label className={labelClass}>Tipo de propulsão<select name="powertrain" defaultValue={editingVehicle?.powertrain ?? vehiclePowertrains[0]} className={inputClass}>{vehiclePowertrains.map((powertrain) => <option key={powertrain}>{powertrain}</option>)}</select></label>
            <label className={labelClass}>Modelo<input required name="model" defaultValue={editingVehicle?.model ?? ""} placeholder="Modelo do veículo" className={inputClass} /></label>
            <label className={labelClass}>Ano<input name="year" defaultValue={editingVehicle?.year ?? ""} inputMode="numeric" placeholder="Ano" className={inputClass} /></label>
            <label className={labelClass}>Quilometragem<input name="mileage" defaultValue={editingVehicle?.mileage ?? ""} inputMode="numeric" placeholder="Quilometragem" className={inputClass} /></label>
            <label className={labelClass}>Cor<input name="color" defaultValue={editingVehicle?.color ?? ""} placeholder="Cor" className={inputClass} /></label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">{editingVehicle ? "Salvar alterações" : "Salvar veículo"}</button>
          </div>
        </form>
      </UiModal>
    </div>
  );
}
