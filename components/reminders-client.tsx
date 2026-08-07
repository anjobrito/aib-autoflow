"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Mail, MessageCircle, Plus } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import { getBusinessProfile } from "@/lib/business-profile";
import { carwashReminderTypes, partsReminderTypes, reminderChannels, workshopReminderTypes } from "@/lib/select-options";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";

type CompanyContext = {
  businessType: string;
  businessTypeLabel: string;
};

type Customer = { id: string; name: string };
type Vehicle = { id: string; customerId: string; plate: string; model: string; customer?: { id: string; name: string } };
type Reminder = {
  id: string;
  type: string;
  customerId: string;
  customer: string;
  vehicleId: string;
  plate: string;
  dueDate: string;
  channel: string;
  message: string;
  status: string;
};

function formatDate(value: string) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function RemindersClient() {
  const [company, setCompany] = useState<CompanyContext | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [companyResponse, remindersResponse, customersResponse, vehiclesResponse] = await Promise.all([
        fetch("/api/company/me", { cache: "no-store" }),
        fetch("/api/reminders", { cache: "no-store" }),
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/vehicles", { cache: "no-store" }),
      ]);

      const [companyResult, remindersResult, customersResult, vehiclesResult] = await Promise.all([
        companyResponse.json(), remindersResponse.json(), customersResponse.json(), vehiclesResponse.json(),
      ]);

      if (!companyResponse.ok || !companyResult.success) throw new Error(companyResult.message || "Não foi possível carregar a empresa.");
      if (!remindersResponse.ok || !remindersResult.success) throw new Error(remindersResult.message || "Não foi possível carregar lembretes.");
      if (!customersResponse.ok || !customersResult.success) throw new Error(customersResult.message || "Não foi possível carregar clientes.");
      if (!vehiclesResponse.ok || !vehiclesResult.success) throw new Error(vehiclesResult.message || "Não foi possível carregar veículos.");

      setCompany(companyResult.company);
      setReminders(remindersResult.reminders ?? []);
      setCustomers(customersResult.customers ?? []);
      setVehicles(vehiclesResult.vehicles ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os lembretes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const profile = useMemo(() => getBusinessProfile({ businessType: company?.businessType || company?.businessTypeLabel || "OTHER" }), [company]);
  const reminderTypes = profile.kind === "carwash" ? carwashReminderTypes : profile.kind === "parts" ? partsReminderTypes : workshopReminderTypes;
  const filteredVehicles = selectedCustomerId ? vehicles.filter((vehicle) => vehicle.customerId === selectedCustomerId) : [];

  function openForm() {
    const firstCustomerId = customers[0]?.id ?? "";
    setSelectedCustomerId(firstCustomerId);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/reminders", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível salvar o lembrete.");
      form.reset();
      setIsFormOpen(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o lembrete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm"><CalendarClock className="h-7 w-7 text-blue-700" /><p className="mt-4 text-sm text-slate-500">Tipo de operação</p><p className="mt-2 text-2xl font-black">{profile.operationLabel}</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-sm"><Mail className="h-7 w-7 text-blue-700" /><p className="mt-4 text-sm text-slate-500">Canal atual</p><p className="mt-2 text-2xl font-black">E-mail</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-sm"><MessageCircle className="h-7 w-7 text-blue-700" /><p className="mt-4 text-sm text-slate-500">Próximo canal</p><p className="mt-2 text-2xl font-black">WhatsApp</p></div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-sm md:flex-row md:items-center md:justify-between">
        <div><p className="text-sm font-bold text-blue-300">Mensagem automática sugerida</p><p className="mt-3 text-xl font-black">{profile.customerReturnMessage}</p><p className="mt-3 text-sm leading-6 text-slate-300">O conteúdo é definido pelo perfil da empresa autenticada.</p></div>
        <button type="button" onClick={openForm} disabled={!customers.length || !vehicles.length} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Novo lembrete</button>
      </div>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
      {!loading && (!customers.length || !vehicles.length) ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Cadastre ao menos um cliente e um veículo antes de criar lembretes.</div> : null}

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6"><h2 className="text-xl font-black">{profile.reminderTitle}</h2><p className="mt-2 text-sm text-slate-600">{profile.reminderDescription}</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Lembrete", "Cliente", "Placa", "Vencimento", "Canal", "Status"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Carregando lembretes...</td></tr> : reminders.length ? reminders.map((reminder) => <tr key={reminder.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-black text-slate-950">{reminder.type}</td><td className="px-5 py-4 text-slate-700">{reminder.customer}</td><td className="px-5 py-4 text-slate-700">{reminder.plate}</td><td className="px-5 py-4 text-slate-700">{formatDate(reminder.dueDate)}</td><td className="px-5 py-4 text-slate-700">{reminder.channel}</td><td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{reminder.status}</span></td></tr>) : <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Nenhum lembrete cadastrado para esta empresa.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title="Novo lembrete" description={profile.reminderDescription} onClose={() => setIsFormOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Tipo de lembrete<select name="type" className={inputClass}>{reminderTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className={labelClass}>Cliente<select name="customerId" required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} className={inputClass}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
            <label className={labelClass}>Veículo<select name="vehicleId" required className={inputClass}>{filteredVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} • {vehicle.model}</option>)}</select></label>
            <label className={labelClass}>Vencimento<input name="dueDate" type="date" required className={inputClass} /></label>
            <label className={labelClass}>Canal<select name="channel" className={inputClass}>{reminderChannels.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <label className={`${labelClass} mt-4`}>Mensagem<textarea name="message" defaultValue={profile.customerReturnMessage} className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white" /></label>
          <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} disabled={saving} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancelar</button><button disabled={saving || filteredVehicles.length === 0} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Salvando..." : "Salvar lembrete"}</button></div>
        </form>
      </UiModal>
    </div>
  );
}
