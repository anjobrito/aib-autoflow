"use client";

import { useEffect, useMemo, useState } from "react";
import { getBusinessProfileByLabel } from "@/lib/business-types";

type BusinessAwarePageHeaderProps = {
  context: "dashboard" | "operations" | "yard";
};

export function BusinessAwarePageHeader({ context }: BusinessAwarePageHeaderProps) {
  const [businessType, setBusinessType] = useState("Completo / Multioperação");

  useEffect(() => {
    let active = true;

    async function loadBusinessType() {
      try {
        const response = await fetch("/api/company/me", { cache: "no-store" });
        const result = await response.json();
        if (!active) return;

        if (response.ok && result.success) {
          setBusinessType(result.company.businessTypeLabel || "Completo / Multioperação");
        }
      } catch {
        if (active) setBusinessType("Completo / Multioperação");
      }
    }

    loadBusinessType();
    return () => {
      active = false;
    };
  }, []);

  const profile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);
  const isDashboard = context === "dashboard";
  const isYard = context === "yard";

  const title = isDashboard ? `Dashboard ${profile.label}` : isYard ? profile.kanbanLabel : profile.operationPluralLabel;
  const eyebrow = isDashboard ? "Visão executiva adaptativa" : isYard ? "Pátio operacional" : profile.kanbanLabel;
  const description = isDashboard
    ? `Acompanhe os principais indicadores para o universo operacional de ${profile.label}: ${profile.dashboardCards.slice(0, 3).join(", ")}.`
    : isYard
      ? `Acompanhe visualmente ${profile.operationPluralLabel.toLowerCase()} no fluxo de ${profile.label}: ${profile.kanbanStatuses.join(" → ")}.`
      : `Gerencie ${profile.operationPluralLabel.toLowerCase()} usando o fluxo sugerido para ${profile.label}: ${profile.kanbanStatuses.join(" → ")}.`;

  return (
    <header className="rounded-3xl bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-bold text-blue-700">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-slate-600">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.kanbanStatuses.slice(0, 6).map((status) => (
            <span key={status} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{status}</span>
          ))}
        </div>
      </div>
    </header>
  );
}
