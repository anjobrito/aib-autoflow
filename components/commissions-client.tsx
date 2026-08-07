"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import { commissionTargetTypes, commissionValueTypes } from "@/lib/select-options";

type Commission = {
  id: string;
  employeeId: string;
  employeeName: string;
  targetType: string;
  targetName: string;
  valueType: string;
  value: string;
  baseAmount: string;
  calculatedAmount: string;
  status: "Pendente" | "Paga" | "Cancelada";
  referenceDate: string;
  paidAt: string;
  sourceWorkOrderId: string;
  sourceWorkOrderCode: string;
  financialEntryId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type Employee = {
  id: string;
  name: string;
  serviceCommissionType: string;
  serviceCommissionValue?: string | null;
  partCommissionType: string;
  partCommissionValue?: string | null;
  washCommissionType: string;
  washCommissionValue?: string | null;
};

type CatalogItem = { id: string; name: string };

type CommissionFormState = {
  employeeId: string;
  targetType: string;
  targetName: string;
  valueType: string;
  value: string;
  baseAmount: string;
  status: string;
  referenceDate: string;
  notes: string;
};

const emptyForm: CommissionFormState = {
  employeeId: "",
  targetType: "Serviço",
  targetName: "",
  valueType: "Percentual",
  value: "",
  baseAmount: "",
  status: "Pendente",
  referenceDate: "",
  notes: "",
};

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";

function money(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(amount) ? amount : 0);
}

function parseMoney(value: string) {
  const raw = value.trim();
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".")
    : raw.replace(/[^0-9.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function calculate(baseAmount: string, valueType: string, value: string) {
  const base = parseMoney(baseAmount);
  const rule = parseMoney(value);
  return valueType === "Valor fixo" ? rule : base * (rule / 100);
}

function StatusBadge({ status }: { status: string }) {
  const className = status === "Paga"
    ? "bg-emerald-100 text-emerald-700"
    : status === "Cancelada"
      ? "bg-rose-100 text-rose-700"
      : "bg-amber-100 text-amber-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{status}</span>;
}

function getEmployeeRule(employee: Employee | undefined, targetType: string) {
  if (!employee) return { valueType: "Percentual", value: "" };
  if (targetType === "Serviço" && employee.serviceCommissionType !== "Sem comissão") {
    return { valueType: employee.serviceCommissionType, value: employee.serviceCommissionValue || "" };
  }
  if (targetType === "Produto/peça" && employee.partCommissionType !== "Sem comissão") {
    return { valueType: employee.partCommissionType, value: employee.partCommissionValue || "" };
  }
  if (targetType === "Lavagem" && employee.washCommissionType !== "Sem comissão") {
    return { valueType: employee.washCommissionType, value: employee.washCommissionValue || "" };
  }
  return { valueType: "Percentual", value: "" };
}

export function CommissionsClient() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [targetFilter, setTargetFilter] = useState("Todas");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CommissionFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const [commissionResponse, employeeResponse, serviceResponse, productResponse] = await Promise.all([
        fetch("/api/commissions", { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
      ]);

      const [commissionResult, employeeResult, serviceResult, productResult] = await Promise.all([
        commissionResponse.json(), employeeResponse.json(), serviceResponse.json(), productResponse.json(),
      ]);

      if (!commissionResponse.ok) throw new Error(commissionResult.message || "Não foi possível carregar as comissões.");

      setCommissions(commissionResult.commissions || []);
      setEmployees(employeeResponse.ok ? employeeResult.employees || [] : []);
      setServices(serviceResponse.ok ? serviceResult.services || [] : []);
      setProducts(productResponse.ok ? productResult.products || [] : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar comissões.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedEmployee = useMemo(() => employees.find((item) => item.id === form.employeeId), [employees, form.employeeId]);
  const calculatedAmount = useMemo(() => calculate(form.baseAmount, form.valueType, form.value), [form.baseAmount, form.valueType, form.value]);

  const targetOptions = useMemo(() => {
    if (form.targetType === "Serviço") return services.map((item) => item.name);
    if (form.targetType === "Produto/peça") return products.map((item) => item.name);
    if (form.targetType === "Lavagem") return ["Lavagem simples", "Lavagem completa", "Higienização interna", "Outro"];
    return ["Outro"];
  }, [form.targetType, services, products]);

  const filteredRows = useMemo(() => commissions.filter((commission) => {
    const matchesStatus = statusFilter === "Todas" || commission.status === statusFilter;
    const matchesTarget = targetFilter === "Todas" || commission.targetType === targetFilter;
    return matchesStatus && matchesTarget;
  }), [commissions, statusFilter, targetFilter]);

  const pendingTotal = useMemo(() => commissions.filter((item) => item.status === "Pendente").reduce((sum, item) => sum + Number(item.calculatedAmount || 0), 0), [commissions]);
  const paidTotal = useMemo(() => commissions.filter((item) => item.status === "Paga").reduce((sum, item) => sum + Number(item.calculatedAmount || 0), 0), [commissions]);
  const cancelledTotal = useMemo(() => commissions.filter((item) => item.status === "Cancelada").reduce((sum, item) => sum + Number(item.calculatedAmount || 0), 0), [commissions]);

  const employeeSummaries = useMemo(() => {
    const map = new Map<string, { name: string; pending: number; paid: number; cancelled: number; count: number }>();
    for (const item of commissions) {
      const current = map.get(item.employeeId) || { name: item.employeeName, pending: 0, paid: 0, cancelled: 0, count: 0 };
      const amount = Number(item.calculatedAmount || 0);
      if (item.status === "Pendente") current.pending += amount;
      if (item.status === "Paga") current.paid += amount;
      if (item.status === "Cancelada") current.cancelled += amount;
      current.count += 1;
      map.set(item.employeeId, current);
    }
    return Array.from(map.values()).sort((a, b) => (b.pending + b.paid) - (a.pending + a.paid));
  }, [commissions]);

  function updateForm<K extends keyof CommissionFormState>(field: K, value: CommissionFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openNewForm() {
    const employeeId = employees[0]?.id || "";
    const rule = getEmployeeRule(employees[0], "Serviço");
    setEditingId(null);
    setForm({ ...emptyForm, employeeId, valueType: rule.valueType, value: rule.value, referenceDate: new Date().toISOString().slice(0, 10) });
    setMessage("");
    setIsFormOpen(true);
  }

  function handleEdit(commission: Commission) {
    setEditingId(commission.id);
    setForm({
      employeeId: commission.employeeId,
      targetType: commission.targetType,
      targetName: commission.targetName,
      valueType: commission.valueType,
      value: commission.value,
      baseAmount: commission.baseAmount,
      status: commission.status,
      referenceDate: commission.referenceDate,
      notes: commission.notes,
    });
    setMessage("");
    setIsFormOpen(true);
  }

  function handleEmployeeChange(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);
    const rule = getEmployeeRule(employee, form.targetType);
    setForm((current) => ({ ...current, employeeId, valueType: rule.valueType, value: rule.value }));
  }

  function handleTargetTypeChange(targetType: string) {
    const rule = getEmployeeRule(selectedEmployee, targetType);
    setForm((current) => ({ ...current, targetType, targetName: "", valueType: rule.valueType, value: rule.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(editingId ? `/api/commissions/${editingId}` : "/api/commissions", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Não foi possível salvar a comissão.");
      setIsFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar comissão.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: Commission["status"]) {
    const response = await fetch(`/api/commissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message || "Não foi possível alterar o status.");
      return;
    }
    await loadData();
  }

  async function cancelCommission(id: string) {
    const response = await fetch(`/api/commissions/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message || "Não foi possível cancelar a comissão.");
      return;
    }
    await loadData();
  }

  return (
    <div className="grid gap-6">
      {message ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[["Pendente", money(pendingTotal)], ["Pago", money(paidTotal)], ["Cancelado", money(cancelledTotal)], ["Lançamentos", commissions.length]].map(([label, value]) => (
          <div key={String(label)} className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">PostgreSQL + financeiro</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Comissões por empresa</h2>
          <p className="mt-2 text-sm text-slate-600">Cada comissão é persistida como conta a pagar do tenant autenticado.</p>
        </div>
        <button type="button" onClick={openNewForm} disabled={employees.length === 0} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" /> Nova comissão
        </button>
      </div>

      {employees.length === 0 && !loading ? <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm font-bold text-blue-900">Cadastre ao menos um funcionário antes de lançar comissões.</div> : null}

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-black text-slate-950">Resumo por funcionário</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Funcionário", "Pendente", "Pago", "Cancelado", "Lançamentos"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {employeeSummaries.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center font-semibold text-slate-500">Nenhuma comissão cadastrada.</td></tr> : employeeSummaries.map((summary) => (
                <tr key={summary.name}><td className="px-5 py-4 font-black">{summary.name}</td><td className="px-5 py-4 text-amber-700">{money(summary.pending)}</td><td className="px-5 py-4 text-emerald-700">{money(summary.paid)}</td><td className="px-5 py-4 text-rose-700">{money(summary.cancelled)}</td><td className="px-5 py-4">{summary.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-2">
        <label className={labelClass}>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>{["Todas", "Pendente", "Paga", "Cancelada"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className={labelClass}>Base<select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)} className={inputClass}>{["Todas", ...commissionTargetTypes].map((target) => <option key={target}>{target}</option>)}</select></label>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Funcionário", "Base", "Item", "Valor base", "Regra", "Calculado", "Referência", "Status", "Ações"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={9} className="px-5 py-10 text-center font-semibold text-slate-500">Carregando...</td></tr> : filteredRows.length === 0 ? <tr><td colSpan={9} className="px-5 py-10 text-center font-semibold text-slate-500">Nenhuma comissão encontrada.</td></tr> : filteredRows.map((commission) => (
                <tr key={commission.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-black text-slate-950">{commission.employeeName}</td>
                  <td className="px-5 py-4">{commission.targetType}</td>
                  <td className="px-5 py-4">{commission.targetName}</td>
                  <td className="px-5 py-4">{money(commission.baseAmount)}</td>
                  <td className="px-5 py-4">{commission.valueType} • {commission.value}</td>
                  <td className="px-5 py-4 font-black">{money(commission.calculatedAmount)}</td>
                  <td className="px-5 py-4">{commission.referenceDate}</td>
                  <td className="px-5 py-4"><StatusBadge status={commission.status} /></td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-2">
                    <Link href={`/comissoes/${commission.id}`} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" title="Detalhar"><Eye className="h-4 w-4" /></Link>
                    <button type="button" onClick={() => handleEdit(commission)} className="rounded-xl border border-slate-200 p-2 text-blue-700 hover:bg-blue-50" title="Editar"><Pencil className="h-4 w-4" /></button>
                    {commission.status !== "Paga" ? <button type="button" onClick={() => changeStatus(commission.id, "Paga")} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50">Pagar</button> : null}
                    {commission.status === "Paga" ? <button type="button" onClick={() => changeStatus(commission.id, "Pendente")} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-50">Reabrir</button> : null}
                    <button type="button" onClick={() => cancelCommission(commission.id)} disabled={commission.status === "Cancelada"} className="rounded-xl border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-40" title="Cancelar"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={editingId ? "Editar comissão" : "Nova comissão"} onClose={() => setIsFormOpen(false)}>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Funcionário<select required value={form.employeeId} onChange={(event) => handleEmployeeChange(event.target.value)} className={inputClass}><option value="">Selecione</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
          <label className={labelClass}>Base<select value={form.targetType} onChange={(event) => handleTargetTypeChange(event.target.value)} className={inputClass}>{commissionTargetTypes.map((target) => <option key={target}>{target}</option>)}</select></label>
          <label className={labelClass}>Item<select required value={form.targetName} onChange={(event) => updateForm("targetName", event.target.value)} className={inputClass}><option value="">Selecione</option>{Array.from(new Set([...targetOptions, form.targetName].filter(Boolean))).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className={labelClass}>Valor base<input required value={form.baseAmount} onChange={(event) => updateForm("baseAmount", event.target.value)} placeholder="R$ 0,00" className={inputClass} /></label>
          <label className={labelClass}>Regra<select value={form.valueType} onChange={(event) => updateForm("valueType", event.target.value)} className={inputClass}>{commissionValueTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className={labelClass}>{form.valueType === "Valor fixo" ? "Valor da comissão" : "Percentual"}<input required value={form.value} onChange={(event) => updateForm("value", event.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Data de referência<input required type="date" value={form.referenceDate} onChange={(event) => updateForm("referenceDate", event.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Status<select value={form.status} onChange={(event) => updateForm("status", event.target.value)} className={inputClass}>{["Pendente", "Paga", "Cancelada"].map((status) => <option key={status}>{status}</option>)}</select></label>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 md:col-span-2"><p className="text-xs font-black uppercase tracking-wide text-blue-700">Comissão calculada</p><p className="mt-2 text-2xl font-black text-blue-950">{money(calculatedAmount)}</p><p className="mt-1 text-xs text-blue-800">O servidor recalcula o valor antes de persistir.</p></div>
          <label className={`${labelClass} md:col-span-2`}>Observações<textarea rows={3} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className={inputClass} /></label>
          <div className="flex justify-end gap-3 md:col-span-2"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black">Cancelar</button><button disabled={saving} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar comissão"}</button></div>
        </form>
      </UiModal>
    </div>
  );
}
