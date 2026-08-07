"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Pencil, Plus, Trash2, WalletCards } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import {
  accountsPayableCategories,
  accountsReceivableCategories,
  paymentMethods,
  payableStatuses,
  receivableStatuses,
} from "@/lib/select-options";

type AccountMode = "Pagar" | "Receber";
type FinancialEntryStatus = "Pendente" | "Pago" | "Recebido" | "Vencido" | "Cancelado";

type FinancialEntry = {
  id: string;
  type: AccountMode;
  description: string;
  personName?: string | null;
  reference?: string | null;
  category: string;
  amount: string;
  dueDate: string;
  settledAt?: string | null;
  status: FinancialEntryStatus;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type FormState = {
  description: string;
  personName: string;
  reference: string;
  category: string;
  amount: string;
  dueDate: string;
  settledAt: string;
  status: FinancialEntryStatus;
  paymentMethod: string;
  notes: string;
};

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";

function makeInitialForm(mode: AccountMode): FormState {
  return {
    description: "",
    personName: "",
    reference: "",
    category: mode === "Pagar" ? "Peças e produtos" : "Ordem de serviço",
    amount: "",
    dueDate: "",
    settledAt: "",
    status: "Pendente",
    paymentMethod: "Pix",
    notes: "",
  };
}

function parseAmount(value: string) {
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function displayStatus(entry: FinancialEntry): FinancialEntryStatus {
  if (entry.status !== "Pendente") return entry.status;
  const today = new Date().toISOString().slice(0, 10);
  return entry.dueDate && entry.dueDate < today ? "Vencido" : "Pendente";
}

function statusClassName(status: FinancialEntryStatus) {
  const styles: Record<FinancialEntryStatus, string> = {
    Pendente: "bg-amber-50 text-amber-700",
    Pago: "bg-emerald-50 text-emerald-700",
    Recebido: "bg-emerald-50 text-emerald-700",
    Vencido: "bg-rose-50 text-rose-700",
    Cancelado: "bg-slate-100 text-slate-600",
  };
  return styles[status];
}

function toFormData(mode: AccountMode, form: FormState) {
  const data = new FormData();
  data.set("type", mode);
  data.set("description", form.description);
  data.set("personName", form.personName);
  data.set("reference", form.reference);
  data.set("category", form.category);
  data.set("amount", form.amount);
  data.set("dueDate", form.dueDate);
  data.set("settledAt", form.settledAt);
  data.set("status", form.status);
  data.set("paymentMethod", form.paymentMethod);
  data.set("notes", form.notes);
  return data;
}

export function FinanceAccountsClient({ mode }: { mode: AccountMode }) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<"Todos" | FinancialEntryStatus>("Todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => makeInitialForm(mode));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isPayable = mode === "Pagar";
  const categories = isPayable ? accountsPayableCategories : accountsReceivableCategories;
  const statuses = isPayable ? payableStatuses : receivableStatuses;
  const settledStatus: FinancialEntryStatus = isPayable ? "Pago" : "Recebido";
  const personLabel = isPayable ? "Fornecedor / favorecido" : "Cliente / pagador";
  const referenceLabel = isPayable ? "Referência interna" : "OS / referência";
  const title = isPayable ? "Contas a pagar" : "Contas a receber";
  const emptyMessage = isPayable
    ? "Nenhuma conta a pagar cadastrada ainda."
    : "Nenhuma conta a receber cadastrada ainda.";

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/financial-entries?type=${encodeURIComponent(mode)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível carregar os lançamentos.");
      setEntries(result.entries ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os lançamentos.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    setForm(makeInitialForm(mode));
    setEditingId(null);
    reload();
  }, [mode, reload]);

  const summary = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        const amount = parseAmount(entry.amount);
        const status = displayStatus(entry);
        if (status !== "Cancelado") acc.total += amount;
        if (status === "Pendente") acc.pending += amount;
        if (status === "Pago" || status === "Recebido") acc.settled += amount;
        if (status === "Vencido") acc.overdue += amount;
        return acc;
      },
      { total: 0, pending: 0, settled: 0, overdue: 0 },
    );
  }, [entries]);

  const filteredEntries = entries.filter((entry) => statusFilter === "Todos" || displayStatus(entry) === statusFilter);
  const cards = [
    { label: "Total previsto", value: currency(summary.total), icon: WalletCards },
    { label: isPayable ? "Pendente de pagamento" : "Pendente de recebimento", value: currency(summary.pending), icon: CalendarDays },
    { label: isPayable ? "Pago" : "Recebido", value: currency(summary.settled), icon: CheckCircle2 },
    { label: "Vencido", value: currency(summary.overdue), icon: CalendarDays },
  ];

  function updateForm<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function closeForm() {
    setEditingId(null);
    setForm(makeInitialForm(mode));
    setIsFormOpen(false);
  }

  function openNewForm() {
    setEditingId(null);
    setForm(makeInitialForm(mode));
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      const url = editingId ? `/api/financial-entries/${editingId}` : "/api/financial-entries";
      const response = await fetch(url, { method: editingId ? "PUT" : "POST", body: toFormData(mode, form) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível salvar o lançamento.");
      closeForm();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o lançamento.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(entry: FinancialEntry) {
    setEditingId(entry.id);
    setForm({
      description: entry.description,
      personName: entry.personName ?? "",
      reference: entry.reference ?? "",
      category: entry.category,
      amount: currency(parseAmount(entry.amount)),
      dueDate: entry.dueDate,
      settledAt: entry.settledAt ?? "",
      status: entry.status,
      paymentMethod: entry.paymentMethod ?? "Pix",
      notes: entry.notes ?? "",
    });
    setIsFormOpen(true);
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/financial-entries/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível excluir o lançamento.");
      if (editingId === id) closeForm();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir o lançamento.");
    }
  }

  async function handleStatusChange(id: string, status: FinancialEntryStatus) {
    setError("");
    try {
      const response = await fetch(`/api/financial-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível alterar o status.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar o status.");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return <div key={card.label} className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{card.label}</p><Icon className="h-5 w-5 text-blue-700" /></div><p className="mt-4 text-3xl font-black">{card.value}</p></div>;
        })}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-sm font-black uppercase tracking-wide text-blue-700">Lançamentos financeiros</p><h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm text-slate-600">Lançamentos persistidos no PostgreSQL e isolados por empresa.</p></div>
          <button type="button" onClick={openNewForm} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Novo lançamento</button>
        </div>
      </div>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-xl font-black">Lista de lançamentos</h2><p className="mt-2 text-sm text-slate-600">Cadastre, edite, exclua e altere status sem sair da tela.</p></div>
          <label className={labelClass}>Filtrar status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "Todos" | FinancialEntryStatus)} className={inputClass}><option>Todos</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Descrição", personLabel, "Categoria", "Valor", "Vencimento", "Status", "Forma", "Ações"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Carregando lançamentos...</td></tr> : filteredEntries.length > 0 ? filteredEntries.map((entry) => {
                const status = displayStatus(entry);
                return <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4"><p className="font-black text-slate-950">{entry.description}</p><p className="mt-1 text-xs text-slate-500">{entry.reference || "Sem referência"}</p></td>
                  <td className="px-5 py-4 text-slate-700">{entry.personName || "-"}</td>
                  <td className="px-5 py-4 text-slate-700">{entry.category}</td>
                  <td className="px-5 py-4 font-black text-slate-950">{currency(parseAmount(entry.amount))}</td>
                  <td className="px-5 py-4 text-slate-700">{entry.dueDate || "-"}</td>
                  <td className="px-5 py-4"><select value={entry.status} onChange={(event) => handleStatusChange(entry.id, event.target.value as FinancialEntryStatus)} className={`rounded-full px-3 py-2 text-xs font-black outline-none ${statusClassName(status)}`}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></td>
                  <td className="px-5 py-4 text-slate-700">{entry.paymentMethod || "-"}</td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => handleStatusChange(entry.id, settledStatus)} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-4 w-4" />{settledStatus}</button><button type="button" onClick={() => handleEdit(entry)} className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"><Pencil className="h-4 w-4" />Editar</button><button type="button" onClick={() => handleDelete(entry.id)} className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"><Trash2 className="h-4 w-4" />Excluir</button></div></td>
                </tr>;
              }) : <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">{emptyMessage}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={editingId ? `Editar ${title.toLowerCase()}` : `Novo lançamento - ${title}`} description="Os dados ficam persistidos no banco da empresa autenticada." onClose={closeForm}>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Descrição<input required value={form.description} onChange={(event) => updateForm("description", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>{personLabel}<input value={form.personName} onChange={(event) => updateForm("personName", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>{referenceLabel}<input value={form.reference} onChange={(event) => updateForm("reference", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Categoria<select value={form.category} onChange={(event) => updateForm("category", event.target.value)} className={inputClass}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className={labelClass}>Status<select value={form.status} onChange={(event) => updateForm("status", event.target.value as FinancialEntryStatus)} className={inputClass}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className={labelClass}>Valor<input required value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} placeholder="Ex: R$ 250,00" inputMode="decimal" className={inputClass} /></label>
            <label className={labelClass}>Vencimento<input required type="date" value={form.dueDate} onChange={(event) => updateForm("dueDate", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>{isPayable ? "Data de pagamento" : "Data de recebimento"}<input type="date" value={form.settledAt} onChange={(event) => updateForm("settledAt", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Forma<select value={form.paymentMethod} onChange={(event) => updateForm("paymentMethod", event.target.value)} className={inputClass}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
          </div>
          <label className={`${labelClass} mt-4`}>Observações<textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} rows={4} className="resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white" /></label>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeForm} disabled={saving} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancelar</button><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"><Plus className="h-4 w-4" />{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar"}</button></div>
        </form>
      </UiModal>
    </div>
  );
}
