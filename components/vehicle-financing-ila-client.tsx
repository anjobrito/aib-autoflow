"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { currencyToNumber, numberToCurrency } from "@/lib/browser-store";
import { UiModal } from "@/components/ui-modal";
import { createEmptyVehicleFinancingDraft, deleteVehicleFinancing, listVehicleFinancings, normalizeVehicleFinancingDraft, saveVehicleFinancing, StoredVehicleFinancing, updateVehicleFinancing, VehicleFinancingDraft } from "@/lib/vehicle-financing-store";

const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";
const readOnlyClass = `${inputClass} bg-slate-100 text-slate-600`;

function netValue(record: StoredVehicleFinancing) {
  return currencyToNumber(record.netReturnAmount || record.returnAmount || "R$ 0,00");
}

function ilaValue(record: StoredVehicleFinancing) {
  return currencyToNumber(record.ilaDiscountAmount || "R$ 0,00");
}

export function VehicleFinancingClient() {
  const [records, setRecords] = useState<StoredVehicleFinancing[]>([]);
  const [form, setForm] = useState<VehicleFinancingDraft>(() => createEmptyVehicleFinancingDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  function refresh() {
    setRecords(listVehicleFinancings());
  }

  useEffect(() => { refresh(); }, []);

  function updateField<K extends keyof VehicleFinancingDraft>(field: K, value: VehicleFinancingDraft[K]) {
    if (field === "returnAmount" || field === "ilaDiscountPercentage") {
      setForm((current) => normalizeVehicleFinancingDraft({ ...current, [field]: value }));
      return;
    }
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeForm() {
    setForm(createEmptyVehicleFinancingDraft());
    setEditingId(null);
    setIsFormOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeVehicleFinancingDraft(form);
    if (editingId) updateVehicleFinancing(editingId, normalized);
    else saveVehicleFinancing(normalized);
    refresh();
    closeForm();
  }

  function handleEdit(record: StoredVehicleFinancing) {
    const { id, createdAt, updatedAt, ...draft } = record;
    setEditingId(id);
    setForm(normalizeVehicleFinancingDraft(draft));
    setIsFormOpen(true);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Deseja excluir este financiamento/gravame?")) return;
    deleteVehicleFinancing(id);
    refresh();
    if (editingId === id) closeForm();
  }

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return records;
    return records.filter((record) => [record.customerName, record.customerDocument, record.vehiclePlate, record.vehicleChassis, record.vehicleModel, record.contractNumber, record.financedBank, record.sellerName].join(" ").toLowerCase().includes(term));
  }, [records, search]);

  const summary = useMemo(() => filteredRecords.reduce((acc, record) => {
    acc.financed += currencyToNumber(record.financedAmount);
    acc.gross += currencyToNumber(record.returnAmount);
    acc.ila += ilaValue(record);
    acc.net += netValue(record);
    acc.received += record.returnReceived ? netValue(record) : 0;
    return acc;
  }, { financed: 0, gross: 0, ila: 0, net: 0, received: 0 }), [filteredRecords]);

  const cards = [
    ["Contratos", String(filteredRecords.length)],
    ["Valor financiado", numberToCurrency(summary.financed)],
    ["Retorno bruto", numberToCurrency(summary.gross)],
    ["Desconto ILA", numberToCurrency(summary.ila)],
    ["Retorno liquido", numberToCurrency(summary.net)],
    ["Liquido recebido", numberToCurrency(summary.received)],
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Revenda</p>
          <h2 className="mt-1 text-2xl font-black">Financiamentos e Gravames</h2>
          <p className="mt-2 text-sm text-slate-600">Controle retorno bruto, desconto ILA e retorno liquido automaticamente.</p>
        </div>
        <button type="button" onClick={() => { setForm(createEmptyVehicleFinancingDraft()); setEditingId(null); setIsFormOpen(true); }} className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700">Novo financiamento</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => <div key={label} className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-4 text-3xl font-black">{value}</p></div>)}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-sm font-black uppercase tracking-wide text-blue-700">Busca e acompanhamento</p><h2 className="mt-1 text-2xl font-black">Contratos cadastrados</h2></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca rapida" className={`${inputClass} md:max-w-sm`} />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Veiculo</th><th className="px-3 py-3">Banco/contrato</th><th className="px-3 py-3">Valores</th><th className="px-3 py-3">Acoes</th></tr></thead>
            <tbody>{filteredRecords.length > 0 ? filteredRecords.map((record) => <tr key={record.id} className="border-b border-slate-100 align-top"><td className="px-3 py-4"><p className="font-black">{record.customerName || "Cliente nao informado"}</p><p className="text-slate-500">{record.customerDocument}</p></td><td className="px-3 py-4"><p className="font-black">{record.vehicleBrand} {record.vehicleModel}</p><p className="text-slate-500">{record.vehiclePlate || "Placa nao informada"}</p></td><td className="px-3 py-4"><p className="font-black">{record.financedBank || "Banco nao informado"}</p><p className="text-slate-500">{record.contractNumber || "Contrato nao informado"}</p></td><td className="px-3 py-4"><p>Financiado: {record.financedAmount}</p><p className="text-slate-500">Retorno bruto: {record.returnAmount}</p><p className="text-slate-500">ILA {record.ilaDiscountPercentage || "0%"}: {record.ilaDiscountAmount || "R$ 0,00"}</p><p className="font-black">Liquido: {record.netReturnAmount || record.returnAmount}</p><p className="text-slate-500">{record.returnReceived ? "Retorno recebido" : "Retorno pendente"}</p></td><td className="px-3 py-4"><div className="flex gap-2"><button type="button" onClick={() => handleEdit(record)} className="rounded-xl border border-slate-200 px-3 py-2 text-blue-700 hover:bg-blue-50">Editar</button><button type="button" onClick={() => handleDelete(record.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-red-700 hover:bg-red-50">Excluir</button></div></td></tr>) : <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">Nenhum financiamento encontrado.</td></tr>}</tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={editingId ? "Editar financiamento" : "Novo financiamento/gravame"} description="Ao informar o retorno bruto e o percentual de ILA, o desconto e o retorno liquido sao calculados automaticamente." onClose={closeForm}>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            <label className={labelClass}>Valor financiado<input value={form.financedAmount} onChange={(event) => updateField("financedAmount", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>% retorno<input value={form.returnPercentage} onChange={(event) => updateField("returnPercentage", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Valor retorno bruto<input value={form.returnAmount} onChange={(event) => updateField("returnAmount", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>% ILA<input value={form.ilaDiscountPercentage} onChange={(event) => updateField("ilaDiscountPercentage", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Desconto ILA<input value={form.ilaDiscountAmount} readOnly className={readOnlyClass} /></label>
            <label className={labelClass}>Retorno liquido<input value={form.netReturnAmount} readOnly className={readOnlyClass} /></label>
            <label className={labelClass}>Seguro prestamista<input value={form.prestamistaInsuranceAmount} onChange={(event) => updateField("prestamistaInsuranceAmount", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Filial<input value={form.branchName} onChange={(event) => updateField("branchName", event.target.value)} className={inputClass} /></label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.returnReceived} onChange={(event) => updateField("returnReceived", event.target.checked)} />Retorno recebido</label>
          </div>
          <label className={`${labelClass} mt-4`}>Observacoes<textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} className={`${inputClass} min-h-24`} /></label>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeForm} className="rounded-2xl border border-slate-300 px-6 py-4 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" className="rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700">{editingId ? "Salvar alteracoes" : "Cadastrar financiamento"}</button></div>
        </form>
      </UiModal>
    </div>
  );
}
