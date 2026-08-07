"use client";

import Link from "next/link";
import { Bell, Car, ClipboardList, Package, Users, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BusinessProfile, getBusinessProfileByLabel } from "@/lib/business-types";

type DashboardOrder = {
  id: string;
  code: string;
  customer: string;
  vehicle: string;
  status: string;
};

type DashboardStats = {
  customers: number;
  vehicles: number;
  products: number;
  services: number;
  workOrders: number;
  openWorkOrders: number;
  readyWorkOrders: number;
  lowStock: number;
};

const emptyStats: DashboardStats = {
  customers: 0,
  vehicles: 0,
  products: 0,
  services: 0,
  workOrders: 0,
  openWorkOrders: 0,
  readyWorkOrders: 0,
  lowStock: 0,
};

function getInventoryCardLabel(profile: BusinessProfile) {
  if (profile.id === "REVENDEDORA") return "Veículos no estoque";
  if (profile.id === "AUTOPECAS") return "Itens no estoque";
  if (profile.id === "LAVA_JATO" || profile.id === "ESTETICA") return "Produtos operacionais";
  if (profile.id === "ESTACIONAMENTO") return "Itens operacionais";
  return "Itens no estoque";
}

function getReadySummaryLabel(profile: BusinessProfile) {
  if (profile.id === "LAVA_JATO") return "atendimentos prontos no fluxo";
  if (profile.id === "ESTETICA") return "atendimentos estéticos prontos no fluxo";
  if (profile.id === "REVENDEDORA") return "processos de venda prontos no fluxo";
  if (profile.id === "ESTACIONAMENTO") return "movimentações finalizadas no fluxo";
  if (profile.id === "AUTOPECAS") return "pedidos prontos no fluxo";
  return "itens prontos no fluxo";
}

function getStockSummaryLabel(profile: BusinessProfile) {
  if (profile.id === "LAVA_JATO" || profile.id === "ESTETICA") return "produtos operacionais em estoque baixo";
  if (profile.id === "REVENDEDORA") return "custos/itens operacionais em atenção";
  if (profile.id === "ESTACIONAMENTO") return "itens operacionais em atenção";
  if (profile.id === "AUTOPECAS") return "itens em estoque baixo";
  return "itens em estoque baixo";
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DashboardClient() {
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [message, setMessage] = useState("");

  async function refresh() {
    setMessage("");
    try {
      const [companyResponse, customersResponse, vehiclesResponse, productsResponse, servicesResponse, ordersResponse] = await Promise.all([
        fetch("/api/company/me", { cache: "no-store" }),
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/vehicles", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
        fetch("/api/work-orders?scope=active", { cache: "no-store" }),
      ]);

      const [companyResult, customersResult, vehiclesResult, productsResult, servicesResult, ordersResult] = await Promise.all([
        companyResponse.json(),
        customersResponse.json(),
        vehiclesResponse.json(),
        productsResponse.json(),
        servicesResponse.json(),
        ordersResponse.json(),
      ]);

      if (![companyResponse, customersResponse, vehiclesResponse, productsResponse, servicesResponse, ordersResponse].every((response) => response.ok)) {
        throw new Error("Dashboard API unavailable");
      }

      setBusinessType(companyResult.company?.businessTypeLabel || "Completo / Multioperação");

      const products = productsResult.products || [];
      const activeOrders: DashboardOrder[] = ordersResult.orders || [];
      const readyStatuses = new Set(["READY_FOR_PICKUP", "Pronta para retirada", "Pronto", "READY"]);

      setStats({
        customers: (customersResult.customers || []).length,
        vehicles: (vehiclesResult.vehicles || []).length,
        products: products.length,
        services: (servicesResult.services || []).length,
        workOrders: activeOrders.length,
        openWorkOrders: activeOrders.filter((order) => !readyStatuses.has(order.status)).length,
        readyWorkOrders: activeOrders.filter((order) => readyStatuses.has(order.status)).length,
        lowStock: products.filter((product: { currentStock?: unknown; minStock?: unknown }) => asNumber(product.currentStock) <= asNumber(product.minStock)).length,
      });
      setOrders(activeOrders.slice(0, 4));
    } catch {
      setStats(emptyStats);
      setOrders([]);
      setMessage("Não foi possível carregar os indicadores agora. Nenhum dado fictício foi exibido.");
    }
  }

  useEffect(() => {
    refresh();
    window.addEventListener("ajb-company-updated", refresh);
    return () => window.removeEventListener("ajb-company-updated", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);

  const cards = [
    { label: profile.dashboardCards[0] ?? profile.operationPluralLabel, value: String(stats.workOrders), icon: ClipboardList },
    { label: "Clientes", value: String(stats.customers), icon: Users },
    { label: "Veículos", value: String(stats.vehicles), icon: Car },
    { label: getInventoryCardLabel(profile), value: String(stats.products), icon: Package },
  ];

  return (
    <>
      {message ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{message}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return <div key={card.label} className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{card.label}</p><Icon className="h-5 w-5 text-blue-700" /></div><p className="mt-4 text-4xl font-black">{card.value}</p></div>;
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div><h2 className="text-xl font-black">{profile.operationPluralLabel} recentes</h2><p className="mt-1 text-sm text-slate-600">Fluxo principal: {profile.kanbanLabel}</p></div>
            <Link href="/ordens-servico/nova" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Novo {profile.operationLabel}</Link>
          </div>
          <div className="grid gap-3">
            {orders.length > 0 ? orders.map((order) => (
              <Link key={order.id} href={`/ordens-servico/${order.id}`} className="grid gap-2 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 sm:grid-cols-[120px_1fr_1fr_180px] sm:items-center"><p className="font-black">{order.code}</p><p>{order.customer}</p><p className="text-slate-600">{order.vehicle}</p><span className="rounded-full bg-blue-50 px-3 py-1 text-center text-xs font-bold text-blue-700">{order.status}</span></Link>
            )) : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Nenhuma operação cadastrada para esta empresa.</div>}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm"><Bell className="h-8 w-8 text-blue-300" /><h2 className="mt-4 text-xl font-black">Acompanhar cliente</h2><p className="mt-2 text-sm leading-6 text-slate-300">Use {profile.operationPluralLabel.toLowerCase()} para manter o cliente informado conforme o fluxo do perfil {profile.label}.</p><Link href="/ordens-servico" className="mt-6 inline-flex w-full justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Ver {profile.operationPluralLabel.toLowerCase()}</Link></div>
          <div className="rounded-3xl bg-white p-6 shadow-sm"><Wrench className="h-8 w-8 text-blue-700" /><h2 className="mt-4 text-xl font-black">Indicadores do perfil</h2><div className="mt-3 flex flex-wrap gap-2">{profile.dashboardCards.slice(0, 6).map((card) => <span key={card} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{card}</span>)}</div><p className="mt-4 text-sm text-slate-600">{stats.readyWorkOrders} {getReadySummaryLabel(profile)} e {stats.lowStock} {getStockSummaryLabel(profile)}.</p></div>
        </div>
      </div>
    </>
  );
}
