"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const damageOptions = [
  "Para-choque dianteiro",
  "Para-choque traseiro",
  "Capô",
  "Teto",
  "Porta esquerda",
  "Porta direita",
  "Lateral esquerda",
  "Lateral direita",
  "Rodas",
  "Vidros",
];

type Inspection = {
  id: string;
  plate: string;
  mileage?: string | null;
  fuelLevel?: string | null;
  hasDocuments: boolean;
  hasSpareTire: boolean;
  hasJack: boolean;
  hasPersonalItems: boolean;
  personalItems?: string | null;
  damages: string[];
  notes?: string | null;
};

type OrderSummary = { id: string; code: string; plate: string };

export function InspectionFormClient({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [damages, setDamages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/inspections/${workOrderId}`, { cache: "no-store" });
        const result = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(result.message || "Não foi possível carregar a vistoria.");
        setOrder(result.order);
        setInspection(result.inspection);
        setDamages(result.inspection?.damages || []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar vistoria.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [workOrderId]);

  function toggleDamage(value: string) {
    setDamages((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      plate: String(formData.get("plate") ?? ""),
      mileage: String(formData.get("mileage") ?? ""),
      fuelLevel: String(formData.get("fuelLevel") ?? ""),
      hasDocuments: formData.get("hasDocuments") === "on",
      hasSpareTire: formData.get("hasSpareTire") === "on",
      hasJack: formData.get("hasJack") === "on",
      hasPersonalItems: formData.get("hasPersonalItems") === "on",
      personalItems: String(formData.get("personalItems") ?? ""),
      damages,
      notes: String(formData.get("notes") ?? ""),
    };

    try {
      const response = await fetch(`/api/inspections/${workOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Não foi possível salvar a vistoria.");
      setInspection(result.inspection);
      setSaved(true);
      setTimeout(() => router.push(`/ordens-servico/${workOrderId}`), 700);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar vistoria.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="rounded-3xl bg-white p-6 font-semibold text-slate-500 shadow-sm">Carregando vistoria...</div>;
  if (!order) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 font-semibold text-rose-800">{error || "OS não encontrada."}</div>;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Checklist de entrada</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">A vistoria fica persistida no PostgreSQL e vinculada exclusivamente à OS e à empresa autenticada.</p>

        {error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-bold text-slate-700">Placa<input name="plate" defaultValue={inspection?.plate || order.plate} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium uppercase outline-none focus:border-blue-500 focus:bg-white" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">KM<input name="mileage" inputMode="numeric" defaultValue={inspection?.mileage || ""} placeholder="Ex: 82450" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Combustível<select name="fuelLevel" defaultValue={inspection?.fuelLevel || "1/2"} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white"><option>Reserva</option><option>1/4</option><option>1/2</option><option>3/4</option><option>Cheio</option></select></label>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["hasDocuments", "Documentos", inspection?.hasDocuments],
            ["hasSpareTire", "Estepe", inspection?.hasSpareTire],
            ["hasJack", "Macaco", inspection?.hasJack],
            ["hasPersonalItems", "Objetos pessoais", inspection?.hasPersonalItems],
          ].map(([name, label, checked]) => (
            <label key={String(name)} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="h-5 w-5" />
              {String(label)}
            </label>
          ))}
        </div>

        <label className="mt-6 grid gap-2 text-sm font-bold text-slate-700">Objetos deixados no veículo<textarea name="personalItems" defaultValue={inspection?.personalItems || ""} placeholder="Ex: óculos, carregador, mochila..." className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white" /></label>

        <div className="mt-6">
          <p className="text-sm font-black text-slate-700">Avarias visuais</p>
          <p className="mt-1 text-sm text-slate-500">Selecione as áreas com risco, amassado ou observação.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {damageOptions.map((item) => {
              const active = damages.includes(item);
              return <button key={item} type="button" onClick={() => toggleDamage(item)} className={`rounded-2xl border p-4 text-left text-sm font-black transition ${active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"}`}>{item}</button>;
            })}
          </div>
        </div>

        <label className="mt-6 grid gap-2 text-sm font-bold text-slate-700">Observações gerais<textarea name="notes" defaultValue={inspection?.notes || ""} placeholder="Descreva detalhes importantes da vistoria." className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white" /></label>

        <div className="mt-6 flex items-center justify-end gap-3">
          {saved ? <span className="text-sm font-bold text-emerald-700">Vistoria salva no banco.</span> : null}
          <button disabled={saving} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Salvando..." : "Salvar vistoria"}</button>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-sm font-bold text-blue-300">Proteção operacional</p>
        <h2 className="mt-2 text-2xl font-black">Menos conflito na entrega.</h2>
        <p className="mt-4 text-sm leading-6 text-slate-300">O checklist registra estado do veículo, itens presentes e avarias antes do serviço. O próximo incremento natural é anexar fotos e assinatura do cliente.</p>
        <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-slate-200">OS: {order.code}</div>
        <div className="mt-3 rounded-2xl bg-white/10 p-4 text-sm text-slate-200">Placa: {order.plate}</div>
      </div>
    </form>
  );
}
