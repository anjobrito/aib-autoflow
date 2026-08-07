"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import { brazilianStates, getCitiesByState } from "@/lib/select-options";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";

type Supplier = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
};

export function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedState, setSelectedState] = useState("SP");
  const cities = getCitiesByState(selectedState);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/suppliers", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível carregar fornecedores.");
      setSuppliers(result.suppliers ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/suppliers", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível salvar o fornecedor.");

      form.reset();
      setSelectedState("SP");
      await refresh();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
      setIsFormOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Cadastro</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Fornecedores cadastrados</h2>
          <p className="mt-2 text-sm text-slate-600">Dados persistidos no banco e isolados por empresa.</p>
        </div>
        <button type="button" onClick={() => setIsFormOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo fornecedor
        </button>
      </div>

      {saved ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Fornecedor salvo!</div> : null}
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Fornecedor", "CNPJ", "Telefone", "E-mail", "Cidade"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">Carregando fornecedores...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm font-semibold text-slate-500">Nenhum fornecedor cadastrado ainda.</td></tr>
              ) : suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-black text-slate-950">{supplier.name}</td>
                  <td className="px-5 py-4 text-slate-700">{supplier.document || "—"}</td>
                  <td className="px-5 py-4 text-slate-700">{supplier.phone || "—"}</td>
                  <td className="px-5 py-4 text-slate-700">{supplier.email || "—"}</td>
                  <td className="px-5 py-4 text-slate-700">{supplier.city ? `${supplier.city}${supplier.state ? `/${supplier.state}` : ""}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title="Cadastrar fornecedor" description="Registre fornecedores para controlar origem, custo de peças/produtos e margem." onClose={() => setIsFormOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Nome do fornecedor<input name="name" required placeholder="Ex: Auto Peças Brasil" className={inputClass} /></label>
            <label className={labelClass}>CNPJ<input name="document" inputMode="numeric" placeholder="Ex: 12.111.222/0001-33" className={inputClass} /></label>
            <label className={labelClass}>Telefone<input name="phone" inputMode="tel" placeholder="Ex: (19) 3333-1000" className={inputClass} /></label>
            <label className={labelClass}>E-mail<input name="email" type="email" placeholder="Ex: vendas@fornecedor.com" className={inputClass} /></label>
            <label className={labelClass}>UF<select name="state" value={selectedState} onChange={(event) => setSelectedState(event.target.value)} className={inputClass}>{brazilianStates.map((state) => <option key={state}>{state}</option>)}</select></label>
            <label className={labelClass}>Cidade<select name="city" className={inputClass}>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setIsFormOpen(false)} disabled={saving} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
            <button disabled={saving} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Salvando..." : "Salvar fornecedor"}</button>
          </div>
        </form>
      </UiModal>
    </div>
  );
}
