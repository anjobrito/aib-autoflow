"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeDollarSign,
  Bell,
  Building2,
  Car,
  ChevronDown,
  ClipboardList,
  Gauge,
  HandCoins,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  UserRoundCog,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { getCompany } from "@/lib/browser-store";
import { getBusinessProfileByLabel, isMenuKeyAllowedForBusinessProfile } from "@/lib/business-types";

type MenuItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MenuGroup = {
  title: string;
  description: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    title: "Geral",
    description: "visão e alertas",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: Gauge },
      { key: "lembretes", label: "Lembretes", href: "/lembretes", icon: Bell },
    ],
  },
  {
    title: "Operação",
    description: "rotina da oficina",
    items: [
      { key: "ordens", label: "Ordens", href: "/ordens-servico", icon: ClipboardList },
      { key: "patio", label: "Pátio", href: "/patio", icon: LayoutDashboard },
      { key: "veiculos", label: "Veículos", href: "/veiculos", icon: Car },
      { key: "historico", label: "Histórico", href: "/historico-veiculo", icon: History },
    ],
  },
  {
    title: "Cadastros",
    description: "base operacional",
    items: [
      { key: "clientes", label: "Clientes", href: "/clientes", icon: Users },
      { key: "fornecedores", label: "Fornecedores", href: "/fornecedores", icon: Building2 },
      { key: "funcionarios", label: "Funcionários", href: "/funcionarios", icon: UserRoundCog },
      { key: "estoque", label: "Estoque", href: "/produtos", icon: Package },
      { key: "servicos", label: "Serviços", href: "/servicos", icon: Wrench },
    ],
  },
  {
    title: "Financeiro",
    description: "contas e comissões",
    items: [
      { key: "financeiro", label: "Financeiro", href: "/financeiro", icon: BadgeDollarSign },
      { key: "contas-pagar", label: "Contas a pagar", href: "/contas-pagar", icon: Wallet },
      { key: "contas-receber", label: "Contas a receber", href: "/contas-receber", icon: Receipt },
      { key: "comissoes", label: "Comissões", href: "/comissoes", icon: HandCoins },
    ],
  },
  {
    title: "Revenda",
    description: "garagem e veículos",
    items: [
      { key: "financiamentos-gravames", label: "Financ. e Gravames", href: "/financiamentos-gravames", icon: ClipboardList },
    ],
  },
  {
    title: "Sistema",
    description: "empresa e usuários",
    items: [
      { key: "empresa", label: "Empresa", href: "/empresa", icon: Settings },
      { key: "usuarios", label: "Usuários", href: "/usuarios", icon: UserRoundCog },
    ],
  },
];

function filterMenuGroups(businessType: string) {
  return menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.key === "usuarios" || isMenuKeyAllowedForBusinessProfile(item.key, businessType)),
    }))
    .filter((group) => group.items.length > 0);
}

function findActiveGroup(pathname: string, groups: MenuGroup[]) {
  return groups.find((group) => group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)))?.title ?? groups[0]?.title ?? "Geral";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkLicense() {
      try {
        const response = await fetch("/api/license/status", { cache: "no-store" });
        const result = await response.json();

        if (!active) return;

        if (response.ok && result.authenticated && !result.allowed) {
          window.location.href = "/licenca";
        }
      } catch {
        // Keep the UI available while local development services are starting.
      }
    }

    checkLicense();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function refreshBusinessType() {
      setBusinessType(getCompany().businessType || "Completo / Multioperação");
    }

    refreshBusinessType();
    window.addEventListener("storage", refreshBusinessType);
    window.addEventListener("ajb-company-updated", refreshBusinessType);

    return () => {
      window.removeEventListener("storage", refreshBusinessType);
      window.removeEventListener("ajb-company-updated", refreshBusinessType);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/entrar";
    }
  }

  const businessProfile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);
  const visibleMenuGroups = useMemo(() => filterMenuGroups(businessProfile.label), [businessProfile.label]);
  const activeGroup = useMemo(() => findActiveGroup(pathname, visibleMenuGroups), [pathname, visibleMenuGroups]);
  const [openGroups, setOpenGroups] = useState<string[]>([activeGroup]);

  useEffect(() => {
    setOpenGroups((current) => current.includes(activeGroup) ? current : [activeGroup, ...current]);
  }, [activeGroup]);

  function toggleGroup(title: string) {
    setOpenGroups((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl bg-slate-950 p-5 text-white lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:overflow-hidden">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black">AJB AutoFlow</p>
              <p className="text-xs text-slate-300">by AJBSYSTEMS</p>
            </div>
          </Link>

          <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">Perfil ativo</p>
            <p className="mt-1 text-sm font-black text-white">{businessProfile.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">Menu adaptado ao universo da empresa.</p>
          </div>

          <nav className="mt-5 grid max-h-[calc(100vh-325px)] gap-3 overflow-y-auto pr-1 text-sm font-semibold text-slate-200">
            {visibleMenuGroups.map((group) => {
              const isOpen = openGroups.includes(group.title);
              const hasActiveItem = group.title === activeGroup;

              return (
                <div key={group.title} className="rounded-2xl border border-white/10 bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${hasActiveItem ? "bg-blue-500/20 text-white" : "hover:bg-white/10"}`}
                    aria-expanded={isOpen}
                  >
                    <span>
                      <span className="block text-sm font-black">{group.title}</span>
                      <span className="block text-[11px] font-semibold text-slate-400">{group.description}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen ? (
                    <div className="grid gap-1 px-2 pb-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="px-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Sessão</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-3 text-sm font-black text-red-100 transition hover:bg-red-500 hover:text-white disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Encerrando..." : "Encerrar sessão"}
            </button>
            <p className="mt-2 px-1 text-[11px] leading-4 text-slate-500">Use ao finalizar o atendimento ou trocar de usuário.</p>
          </div>
        </aside>
        <section className="grid gap-6">{children}</section>
      </div>
    </main>
  );
}
