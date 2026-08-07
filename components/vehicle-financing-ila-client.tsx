"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { UiModal } from "@/components/ui-modal";

const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";
const readOnlyClass = `${inputClass} bg-slate-100 text-slate-600`;

type Customer = { id: string; name: string; document?: string | null; phone?: string | null };
type Vehicle = { id: string; customerId: string; plate: string; brand?: string | null; model: string; year?: number | null; customer?: Customer };

type FinancingRecord = {
  id: string;
  customerId?: string | null;
  vehicleId?: string | null;
  sellerName: string;
  date: string;
  financedBank: string;
  customerDocument: string;
  customerName: string;
  customerPhone: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleChassis: string;
  vehicleYear: string;
  contractNumber: string;
  requestedAmount: string | number;
  downPaymentAmount: string | number;
  financedAmount: string | number;
  returnPercentage: string | number;
  returnAmount: string | number;
  ilaDiscountPercentage: string | number;
  ilaDiscountAmount: string | number;
  netReturnAmount: string | number;
  prestamistaInsuranceAmount: string | number;
  branchName: string;
  financingStatus: string;
  lienStatus: string;
  returnReceived: boolean;
  notes: string;
};

type FinancingDraft = {
  customerId: string;
  vehicleId: string;
  sellerName: string;
  date: string;
  financedBank: string;
  customerDocument: string;
  customerName: string;
  customerPhone: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleChassis: string;
  vehicleYear: string;
  contractNumber: string;
  requestedAmount: string;
  downPaymentAmount: string;
  financedAmount: string;
  returnPercentage: string;
  returnAmount: string;
  ilaDiscountPercentage: string;
  ilaDiscountAmount: string;
  netReturnAmount: string;
  prestamistaInsuranceAmount: string;
  branchName: string;
  financingStatus: string;
  lienStatus: string;
  returnReceived: boolean;
  notes: string;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  if (raw.includes(",")) {
    const parsed = Number(raw.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(value));
}

function pct(value: unknown) {
  const number = Math.max(0, toNumber(value));
  return String(number).replace(".", ",");
}

function emptyDraft(): FinancingDraft {
  return {
    customerId: "",
    vehicleId: "",
    sellerName: "",
    date: new Date().toISOString().slice(0, 10),
    financedBank: "",
    customerDocument: "",
    customerName: "",
    customerPhone: "",
    vehicleBrand: "",
    vehicleModel: "",
    vehiclePlate: "",
    vehicleChassis: "",
    vehicleYear: "",
    contractNumber: "",
    requestedAmount: "R$ 0,00",
    downPaymentAmount: "R$ 0,00",
    financedAmount: "R$ 0,00",
    returnPercentage: "0",
    returnAmount: "R$ 0,00",
    ilaDiscountPercentage: "26",
    ilaDiscountAmount: "R$ 0,00",
    netReturnAmount: "R$ 0,00",
    prestamistaInsuranceAmount: "R$ 0,00",
    branchName: "Matriz",
    financingStatus: "EM_ANALISE",
    lienStatus: "NAO_INICIADO",
    returnReceived: false,
    notes: "",
  };
}

function withCalculatedValues(draft: FinancingDraft): FinancingDraft {
  const financed = Math.max(0, toNumber(draft.financedAmount));
  const returnPercentage = Math.max(0, toNumber(draft.returnPercentage));
  const ilaPercentage = Math.max(0, toNumber(draft.ilaDiscountPercentage));
  const gross = financed * (returnPercentage / 100);
  const ila = gross * (ilaPercentage / 100);
  return {
    ...draft,
    returnAmount: money(gross),
    ilaDiscountAmount: money(ila),
    netReturnAmount: money(Math.max(0, gross - ila)),
  };
}

function recordToDraft(record: FinancingRecord): FinancingDraft {
  return withCalculatedValues({
    customerId: record.customerId ?? "",
    vehicleId: record.vehicleId ?? "",
    sellerName: record.sellerName ?? "",
    date: String(record.date).slice(0, 10),
    financedBank: record.financedBank ?? "",
    customerDocument: record.customerDocument ?? "",
    customerName: record.customerName ?? "",
    customerPhone: record.customerPhone ?? "",
    vehicleBrand: record.vehicleBrand ?? "",
    vehicleModel: record.vehicleModel ?? "",
    vehiclePlate: record.vehiclePlate ?? "",
    vehicleChassis: record.vehicleChassis ?? "",
    vehicleYear: record.vehicleYear ?? "",
    contractNumber: record.contractNumber ?? "",
    requestedAmount: money(record.requestedAmount),
    downPaymentAmount: money(record.downPaymentAmount),
    financedAmount: money(record.financedAmount),
    returnPercentage: pct(record.returnPercentage),
    returnAmount: money(record.returnAmount),
    ilaDiscountPercentage: pct(record.ilaDiscountPercentage),
    ilaDiscountAmount: money(record.ilaDiscountAmount),
    netReturnAmount: money(record.netReturnAmount),
    prestamistaInsuranceAmount: money(record.prestamistaInsuranceAmount),
    branchName: record.branchName ?? "Matriz",
    financingStatus: record.financingStatus ?? "EM_ANALISE",
    lienStatus: record.lienStatus ?? "NAO_INICIADO",
    returnReceived: Boolean(record.returnReceived),
    notes: record.notes ?? "",
  });
}

export function VehicleFinancingClient() {
  const [records, setRecords] = useState<FinancingRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<FinancingDraft>(() => emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [financingResponse, customerResponse, vehicleResponse] = await Promise.all([
        fetch("/api/financings", { cache: "no-store" }),
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/vehicles", { cache: "no-store" }),
      ]);
      const [financingResult, customerResult, vehicleResult] = await Promise.all([
        financingResponse.json(), customerResponse.json(), vehicleResponse.json(),
      ]);
      if (!financingResponse.ok) throw new Error(financingResult.message || "Não foi possível carregar financiamentos.");
      setRecords(financingResult.financings ?? []);
      setCustomers(customerResponse.ok ? customerResult.customers ?? [] : []);
      setVehicles(vehicleResponse.ok ? vehicleResult.vehicles ?? [] : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  function updateField<K extends keyof FinancingDraft>(field: K, value: FinancingDraft[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      return ["financedAmount", "returnPercentage", "ilaDiscountPercentage"].includes(String(field)) ? withCalculatedValues(next) : next;
    });
  }

  function selectCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    setForm((current) => ({
      ...current,
      customerId,
      vehicleId: "",
      customerName: customer?.name ?? "",
      customerDocument: customer?.document ?? "",
      customerPhone: customer?.phone ?? "",
      vehicleBrand: "",
      vehicleModel: "",
      vehiclePlate: "",
      vehicleYear: "",
      vehicleChassis: "",
    }));
  }

  function selectVehicle(vehicleId: string) {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    const customer = vehicle?.customer ?? customers.find((item) => item.id === vehicle?.customerId);
    setForm((current) => ({
      ...current,
      vehicleId,
      customerId: vehicle?.customerId ?? current.customerId,
      customerName: customer?.name ?? current.customerName,
      customerDocument: customer?.document ?? current.customerDocument,
      customerPhone: customer?.phone ?? current.customerPhone,
      vehicleBrand: vehicle?.brand ?? "",
      vehicleModel: vehicle?.model ?? "",
      vehiclePlate: vehicle?.plate ?? "",
      vehicleYear: vehicle?.year ? String(vehicle.year) : "",
    }));
  }

  function closeForm() {
    setForm(emptyDraft());
    setEditingId(null);
    setIsFormOpen(false);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editingId ? `/api/financings/${editingId}` : "/api/financings", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Não foi possível salvar o financiamento.");
      await refresh();
      closeForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao salvar financiamento.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(record: FinancingRecord) {
    setEditingId(record.id);
    setForm(recordToDraft(record));
    setIsFormOpen(true);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja excluir este financiamento/gravame?")) return;
    setError("");
    try {
      const response = await fetch(`/api/financings/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Não foi possível excluir o financiamento.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao excluir financiamento.");
    }
  }

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return records;
    return records.filter((record) => [record.customerName, record.customerDocument, record.vehiclePlate, record.vehicleChassis, record.vehicleModel, record.contractNumber, record.financedBank, record.sellerName].join(" ").toLowerCase().includes(term));
  }, [records, search]);

  const availableVehicles = useMemo(() => form.customerId ? vehicles.filter((vehicle) => vehicle.customerId === form.customerId) : vehicles, [form.customerId, vehicles]);

  const summary = useMemo(() => filteredRecords.reduce((acc, record) => {
    acc.financed += toNumber(record.financedAmount);
    acc.gross += toNumber(record.returnAmount);
    acc.ila += toNumber(record.ilaDiscountAmount);
    acc.net += toNumber(record.netReturnAmount);
    acc.received += record.returnReceived ? toNumber(record.netReturnAmount) : 0;
    return acc;
  }, { financed: 0, gross: 0, ila: 0, net: 0, received: 0 }), [filteredRecords]);

  const cards = [
    ["Contratos", String(filteredRecords.length)],
    ["Valor financiado", money(summary.financed)],
    ["Retorno bruto", money(summary.gross)],
    ["Desconto ILA", money(summary.ila)],
    ["Retorno líquido", money(summary.net)],
    ["Líquido recebido", money(summary.received)],
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Revenda</p>
          <h2 className="mt-1 text-2xl font-black">Financiamentos e Gravames</h2>
          <p className="mt-2 text-sm text-slate-600">Dados persistidos no banco da empresa. Selecione cliente e veículo; retorno bruto, ILA e líquido são calculados automaticamente.</p>
        </div>
        <button type="button" onClick={() => { setForm(emptyDraft()); setEditingId(null); setIsFormOpen(true); }} className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700">Novo financiamento</button>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => <div key={label} className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-4 text-3xl font-black">{value}</p></div>)}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-sm font-black uppercase tracking-wide text-blue-700">Busca e acompanhamento</p><h2 className="mt-1 text-2xl font-black">Contratos cadastrados</h2></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca rápida" className={`${inputClass} md:max-w-sm`} />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Veículo</th><th className="px-3 py-3">Banco/contrato</th><th className="px-3 py-3">Valores</th><th className="px-3 py-3">Ações</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">Carregando financiamentos...</td></tr> : filteredRecords.length > 0 ? filteredRecords.map((record) => <tr key={record.id} className="border-b border-slate-100 align-top"><td className="px-3 py-4"><p className="font-black">{record.customerName || "Cliente não informado"}</p><p className="text-slate-500">{record.customerDocument}</p></td><td className="px-3 py-4"><p className="font-black">{record.vehicleBrand} {record.vehicleModel}</p><p className="text-slate-500">{record.vehiclePlate || "Placa não informada"}</p></td><td className="px-3 py-4"><p className="font-black">{record.financedBank || "Banco não informado"}</p><p className="text-slate-500">{record.contractNumber || "Contrato não informado"}</p></td><td className="px-3 py-4"><p>Financiado: {money(record.financedAmount)}</p><p className="text-slate-500">Retorno bruto: {money(record.returnAmount)}</p><p className="text-slate-500">ILA {pct(record.ilaDiscountPercentage)}%: {money(record.ilaDiscountAmount)}</p><p className="font-black">Líquido: {money(record.netReturnAmount)}</p><p className="text-slate-500">{record.returnReceived ? "Retorno recebido" : "Retorno pendente"}</p></td><td className="px-3 py-4"><div className="flex gap-2"><button type="button" onClick={() => handleEdit(record)} className="rounded-xl border border-slate-200 px-3 py-2 text-blue-700 hover:bg-blue-50">Editar</button><button type="button" onClick={() => void handleDelete(record.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-red-700 hover:bg-red-50">Excluir</button></div></td></tr>) : <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">Nenhum financiamento encontrado para esta empresa.</td></tr>}</tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={editingId ? "Editar financiamento" : "Novo financiamento/gravame"} description="Selecione dados já cadastrados para evitar redigitação. O servidor recalcula os valores financeiros ao salvar." onClose={closeForm}>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 rounded-3xl bg-slate-50 p-5 md:grid-cols-2">
            <label className={labelClass}>Cliente<select value={form.customerId} onChange={(event) => selectCustomer(event.target.value)} className={inputClass}><option value="">Selecione um cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.document ? ` — ${customer.document}` : ""}</option>)}</select></label>
            <label className={labelClass}>Veículo<select value={form.vehicleId} onChange={(event) => selectVehicle(event.target.value)} className={inputClass}><option value="">Selecione um veículo</option>{availableVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} — {vehicle.brand} {vehicle.model}</option>)}</select></label>
          </div>

          <div className="mt-5 rounded-3xl bg-blue-50 p-5">
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">Cálculo automático</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className={labelClass}>Valor financiado<input value={form.financedAmount} onChange={(event) => updateField("financedAmount", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}>% retorno<input value={form.returnPercentage} onChange={(event) => updateField("returnPercentage", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}>% ILA<input value={form.ilaDiscountPercentage} onChange={(event) => updateField("ilaDiscountPercentage", event.target.value)} className={inputClass} /></label>
              <label className={labelClass}>Valor retorno bruto<input value={form.returnAmount} readOnly className={readOnlyClass} /></label>
              <label className={labelClass}>Desconto ILA<input value={form.ilaDiscountAmount} readOnly className={readOnlyClass} /></label>
              <label className={labelClass}>Retorno líquido<input value={form.netReturnAmount} readOnly className={readOnlyClass} /></label>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClass}>Data<input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Cliente<input value={form.customerName} onChange={(event) => updateField("customerName", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>CPF/CNPJ<input value={form.customerDocument} onChange={(event) => updateField("customerDocument", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Telefone<input value={form.customerPhone} onChange={(event) => updateField("customerPhone", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Vendedor<input value={form.sellerName} onChange={(event) => updateField("sellerName", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Banco financiado<input value={form.financedBank} onChange={(event) => updateField("financedBank", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Marca<input value={form.vehicleBrand} onChange={(event) => updateField("vehicleBrand", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Modelo<input value={form.vehicleModel} onChange={(event) => updateField("vehicleModel", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Placa<input value={form.vehiclePlate} onChange={(event) => updateField("vehiclePlate", event.target.value.toUpperCase())} className={inputClass} /></label>
            <label className={labelClass}>Chassi<input value={form.vehicleChassis} onChange={(event) => updateField("vehicleChassis", event.target.value.toUpperCase())} className={inputClass} /></label>
            <label className={labelClass}>Ano<input value={form.vehicleYear} onChange={(event) => updateField("vehicleYear", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Contrato<input value={form.contractNumber} onChange={(event) => updateField("contractNumber", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Valor solicitado<input value={form.requestedAmount} onChange={(event) => updateField("requestedAmount", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Entrada<input value={form.downPaymentAmount} onChange={(event) => updateField("downPaymentAmount", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Seguro prestamista<input value={form.prestamistaInsuranceAmount} onChange={(event) => updateField("prestamistaInsuranceAmount", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Filial<input value={form.branchName} onChange={(event) => updateField("branchName", event.target.value)} className={inputClass} /></label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.returnReceived} onChange={(event) => updateField("returnReceived", event.target.checked)} />Retorno recebido</label>
          </div>
          <label className={`${labelClass} mt-4`}>Observações<textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} className={`${inputClass} min-h-24`} /></label>
          {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeForm} className="rounded-2xl border border-slate-300 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" disabled={saving} className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar financiamento"}</button></div>
        </form>
      </UiModal>
    </div>
  );
}
