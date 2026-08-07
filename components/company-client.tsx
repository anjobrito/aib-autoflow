"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { businessTypes, getBusinessProfileByLabel } from "@/lib/business-types";
import { brazilianStates, getCitiesByState, normalizeCityForState } from "@/lib/select-options";

type CompanyForm = {
  name: string;
  tradeName: string;
  cnpj: string;
  businessType: string;
  businessTypeLabel: string;
  state: string;
  city: string;
  phone: string;
  email: string;
};

function Input({ label, name, value, onChange, readOnly = false }: { label: string; name: keyof CompanyForm; value: string; onChange: (name: keyof CompanyForm, value: string) => void; readOnly?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input readOnly={readOnly} value={value} onChange={(event) => onChange(name, event.target.value)} className={`rounded-2xl border border-slate-200 px-4 py-3 font-medium outline-none ${readOnly ? "bg-slate-100 text-slate-500" : "bg-slate-50 focus:border-blue-500 focus:bg-white"}`} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function CompanyClient() {
  const [company, setCompany] = useState<CompanyForm | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCompany() {
      try {
        const response = await fetch("/api/company/me", { cache: "no-store" });
        const result = await response.json();
        if (!active) return;

        if (!response.ok || !result.success) {
          setError(result.message || "Não foi possível carregar os dados da empresa.");
          return;
        }

        const loaded = result.company;
        const state = brazilianStates.includes(loaded.state as typeof brazilianStates[number]) ? loaded.state : "SP";
        const businessTypeLabel = businessTypes.includes(loaded.businessTypeLabel as typeof businessTypes[number]) ? loaded.businessTypeLabel : "Completo / Multioperação";

        setCompany({
          name: loaded.name || "",
          tradeName: loaded.tradeName || "",
          cnpj: loaded.cnpj || "",
          businessType: loaded.businessType || "FULL_AUTO_CENTER",
          businessTypeLabel,
          state,
          city: normalizeCityForState(loaded.city || "", state),
          phone: loaded.phone || "",
          email: loaded.email || "",
        });
      } catch {
        if (active) setError("Não foi possível carregar os dados da empresa.");
      }
    }

    loadCompany();
    return () => { active = false; };
  }, []);

  function updateField(name: keyof CompanyForm, value: string) {
    setCompany((current) => {
      if (!current) return current;
      if (name === "state") {
        return { ...current, state: value, city: normalizeCityForState(current.city, value) };
      }
      if (name === "businessTypeLabel") {
        return { ...current, businessTypeLabel: value };
      }
      return { ...current, [name]: value };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company || saving) return;

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const response = await fetch("/api/company/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name,
          tradeName: company.tradeName,
          email: company.email,
          phone: company.phone,
          city: company.city,
          state: company.state,
          businessTypeLabel: company.businessTypeLabel,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Não foi possível salvar os dados da empresa.");
        return;
      }

      const updated = result.company;
      setCompany((current) => current ? {
        ...current,
        name: updated.name || current.name,
        tradeName: updated.tradeName || "",
        email: updated.email || current.email,
        phone: updated.phone || "",
        city: updated.city || "",
        state: updated.state || current.state,
        businessType: updated.businessType || current.businessType,
        businessTypeLabel: updated.businessTypeLabel || current.businessTypeLabel,
      } : current);
      setSaved(true);
      window.dispatchEvent(new Event("ajb-company-updated"));
      setTimeout(() => setSaved(false), 1800);
    } catch {
      setError("Não foi possível salvar os dados da empresa.");
    } finally {
      setSaving(false);
    }
  }

  const selectedProfile = useMemo(() => getBusinessProfileByLabel(company?.businessTypeLabel), [company?.businessTypeLabel]);

  if (!company) return <div className="rounded-3xl bg-white p-6 shadow-sm">{error || "Carregando dados da empresa..."}</div>;

  const cities = getCitiesByState(company.state);
  const cards = [
    ["Nome fantasia", company.tradeName],
    ["Razão social", company.name],
    ["CNPJ", company.cnpj],
    ["Perfil de negócio", selectedProfile.label],
    ["Fluxo principal", selectedProfile.operationPluralLabel],
    ["Cidade/UF", `${company.city}/${company.state}`],
    ["Contato", `${company.phone} • ${company.email}`],
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Configuração da empresa</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Os dados abaixo pertencem ao tenant autenticado e ficam persistidos no PostgreSQL. O perfil escolhido adapta menus e operação da empresa.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input label="Nome fantasia" name="tradeName" value={company.tradeName} onChange={updateField} />
          <Input label="Razão social" name="name" value={company.name} onChange={updateField} />
          <Input label="CNPJ" name="cnpj" value={company.cnpj} onChange={updateField} readOnly />
          <SelectField label="Perfil de negócio" value={company.businessTypeLabel} options={businessTypes} onChange={(value) => updateField("businessTypeLabel", value)} />
          <SelectField label="Estado" value={company.state} options={brazilianStates} onChange={(value) => updateField("state", value)} />
          <SelectField label="Cidade" value={company.city} options={cities} onChange={(value) => updateField("city", value)} />
          <Input label="Telefone" name="phone" value={company.phone} onChange={updateField} />
          <Input label="E-mail" name="email" value={company.email} onChange={updateField} />
        </div>

        <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Universo operacional</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{selectedProfile.label}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{selectedProfile.description}</p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Fluxo principal</p><p className="mt-2 text-lg font-black text-slate-950">{selectedProfile.operationPluralLabel}</p><p className="mt-1 text-sm text-slate-600">Nome operacional: {selectedProfile.operationLabel}</p></div>
            <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Kanban sugerido</p><p className="mt-2 text-lg font-black text-slate-950">{selectedProfile.kanbanLabel}</p><p className="mt-1 text-sm text-slate-600">Base para adaptar colunas por perfil.</p></div>
          </div>

          <div className="mt-5"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Módulos recomendados</p><div className="mt-3 flex flex-wrap gap-2">{selectedProfile.modules.map((module) => <span key={module} className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">{module}</span>)}</div></div>
          <div className="mt-5"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Status do Kanban</p><div className="mt-3 flex flex-wrap gap-2">{selectedProfile.kanbanStatuses.map((status) => <span key={status} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 shadow-sm">{status}</span>)}</div></div>
          <div className="mt-5"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Indicadores sugeridos para o Dashboard</p><div className="mt-3 grid gap-2 md:grid-cols-2">{selectedProfile.dashboardCards.map((card) => <span key={card} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">{card}</span>)}</div></div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {error ? <span className="mr-auto text-sm font-bold text-red-700">{error}</span> : null}
          {saved ? <span className="text-sm font-bold text-emerald-700">Empresa salva!</span> : null}
          <button disabled={saving} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Salvando..." : "Salvar empresa"}</button>
        </div>
      </form>

      <div className="grid gap-4">
        {cards.map(([label, value]) => <div key={label} className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-lg font-black text-slate-950">{value}</p></div>)}
      </div>
    </div>
  );
}
