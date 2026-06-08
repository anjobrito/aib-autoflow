"use client";

import Link from "next/link";
import { DragEvent, useEffect, useMemo, useState } from "react";
import { Car, Clock, ClipboardList, Move } from "lucide-react";
import { getCompany, listWorkOrders, StoredWorkOrder, updateWorkOrderStatus } from "@/lib/browser-store";
import { filterWorkOrdersByBusinessProfile } from "@/lib/business-profile-work-orders";
import { getBusinessProfileByLabel } from "@/lib/business-types";
import { isFinalizedWorkOrderStatus } from "@/lib/work-order-lifecycle";

type KanbanCard = {
  id: string;
  code: string;
  customer: string;
  vehicle: string;
  service: string;
  status: string;
  total: string;
  source: "storage" | "demo";
};

type KanbanColumn = {
  title: string;
  status: string;
  finalizer: boolean;
};

const fallbackStatuses = ["Entrada", "Em atendimento", "Aguardando", "Pronto", "Entregue", "Finalizado"];

function normalizeOrder(order: StoredWorkOrder): KanbanCard {
  return {
    id: order.id,
    code: order.code,
    customer: order.customer,
    vehicle: order.vehicle,
    service: order.service,
    status: order.status,
    total: order.total,
    source: "storage",
  };
}

function buildColumns(statuses: string[]): KanbanColumn[] {
  return statuses.map((status) => ({
    title: status,
    status,
    finalizer: isFinalizedWorkOrderStatus(status),
  }));
}

function buildDemoCards(statuses: string[]): KanbanCard[] {
  const activeStatuses = statuses.filter((status) => !isFinalizedWorkOrderStatus(status));
  const statusAt = (index: number) => activeStatuses[Math.min(index, Math.max(activeStatuses.length - 1, 0))] ?? "Entrada";

  return [
    { id: "demo-yard-001", code: "OS-1024", customer: "João Pereira", vehicle: "ABC1D23 - Honda Civic", service: "Revisão preventiva", status: statusAt(1), total: "R$ 380,00", source: "demo" },
    { id: "demo-yard-002", code: "OS-1025", customer: "Maria Souza", vehicle: "BRA2E44 - Fiat Argo", service: "Diagnóstico de suspensão", status: statusAt(2), total: "R$ 640,00", source: "demo" },
    { id: "demo-yard-003", code: "OS-1026", customer: "Carlos Lima", vehicle: "CAR9F10 - VW Gol", service: "Controle de qualidade", status: statusAt(3), total: "R$ 180,00", source: "demo" },
    { id: "demo-yard-004", code: "OS-1027", customer: "Ana Martins", vehicle: "AIB7S20 - Chevrolet Onix", service: "Entrada para orçamento", status: statusAt(0), total: "R$ 0,00", source: "demo" },
  ];
}

export function YardKanbanClient() {
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [orders, setOrders] = useState<KanbanCard[]>([]);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const profile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);
  const columns = useMemo(() => buildColumns(profile.kanbanStatuses.length > 0 ? profile.kanbanStatuses : fallbackStatuses), [profile.kanbanStatuses]);
  const activeColumns = useMemo(() => columns.filter((column) => !column.finalizer), [columns]);
  const finalizerColumns = useMemo(() => columns.filter((column) => column.finalizer), [columns]);
  const firstStatus = activeColumns[0]?.status ?? fallbackStatuses[0];
  const readyStatus = activeColumns[Math.max(activeColumns.length - 1, 0)]?.status ?? "Pronto";

  function refresh() {
    const company = getCompany();
    const nextProfile = getBusinessProfileByLabel(company.businessType || "Completo / Multioperação");
    const statuses = nextProfile.kanbanStatuses.length > 0 ? nextProfile.kanbanStatuses : fallbackStatuses;
    const stored = filterWorkOrdersByBusinessProfile(listWorkOrders(), nextProfile)
      .filter((order) => !isFinalizedWorkOrderStatus(order.status))
      .map(normalizeOrder);

    setBusinessType(nextProfile.label);
    setOrders(stored.length > 0 ? stored : buildDemoCards(statuses));
  }

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ajb-company-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ajb-company-updated", refresh);
    };
  }, []);

  const normalizedOrders = useMemo(() => {
    const allowedStatuses = new Set(columns.map((column) => column.status));
    return orders
      .filter((order) => !isFinalizedWorkOrderStatus(order.status))
      .map((order) => allowedStatuses.has(order.status) ? order : { ...order, status: firstStatus });
  }, [orders, columns, firstStatus]);

  const totalInYard = normalizedOrders.length;
  const ready = normalizedOrders.filter((order) => order.status === readyStatus).length;
  const inProgress = normalizedOrders.filter((order) => ![firstStatus, readyStatus].includes(order.status)).length;

  const grouped = useMemo(() => {
    return activeColumns.map((column) => ({
      ...column,
      cards: normalizedOrders.filter((order) => order.status === column.status),
    }));
  }, [activeColumns, normalizedOrders]);

  function handleDragStart(cardId: string) {
    setDraggingCardId(cardId);
  }

  function handleDragEnd() {
    setDraggingCardId(null);
    setDragOverStatus(null);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, status: string) {
    event.preventDefault();
    setDragOverStatus(status);
  }

  function handleDrop(event: DragEvent<HTMLElement>, status: string) {
    event.preventDefault();
    if (!draggingCardId) return;

    const draggedCard = orders.find((order) => order.id === draggingCardId);
    if (!draggedCard) return;

    if (draggedCard.source === "storage") {
      updateWorkOrderStatus(draggingCardId, status);
    }

    if (isFinalizedWorkOrderStatus(status)) {
      setOrders((current) => current.filter((order) => order.id !== draggingCardId));
      setMessage(`${draggedCard.code} saiu do pátio e ficou disponível no histórico.`);
    } else {
      setOrders((current) => current.map((order) => order.id === draggingCardId ? { ...order, status } : order));
      setMessage("");
    }

    setDraggingCardId(null);
    setDragOverStatus(null);
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Itens no pátio</p>
          <p className="mt-3 text-4xl font-black">{totalInYard}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Próximos da entrega</p>
          <p className="mt-3 text-4xl font-black text-emerald-700">{ready}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Em andamento</p>
          <p className="mt-3 text-4xl font-black text-amber-700">{inProgress}</p>
        </div>
      </div>

      {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div> : null}

      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">Kanban operacional</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{profile.kanbanLabel}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          O pátio mostra somente OS ativas. Ao mover para entrega, finalização, cancelamento ou faturamento, o card sai do pátio e fica disponível no histórico para conferência.
        </p>
      </section>

      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[980px] gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(activeColumns.length, 1)}, minmax(190px, 1fr))` }}>
          {grouped.map((column) => (
            <section
              key={column.status}
              onDragOver={(event) => handleDragOver(event, column.status)}
              onDrop={(event) => handleDrop(event, column.status)}
              className={`rounded-3xl p-4 transition ${dragOverStatus === column.status ? "bg-blue-100 ring-2 ring-blue-400" : "bg-slate-200/70"}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-800">{column.title}</h2>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">{column.cards.length}</span>
              </div>

              <div className="grid min-h-40 gap-3">
                {column.cards.length > 0 ? column.cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => handleDragStart(card.id)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${draggingCardId === card.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/ordens-servico/${card.id}`} className="font-black text-slate-950 hover:text-blue-700">{card.code}</Link>
                      <div className="flex items-center gap-2"><Move className="h-4 w-4 cursor-grab text-slate-400" /><ClipboardList className="h-4 w-4 text-blue-700" /></div>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2"><Car className="h-4 w-4 text-slate-400" /><span>{card.vehicle}</span></div>
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /><span>{card.service}</span></div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Cliente</p><p className="font-bold text-slate-950">{card.customer}</p></div>
                    <p className="mt-3 text-sm font-black text-blue-700">{card.total}</p>
                  </div>
                )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-sm text-slate-500">Solte cards aqui ou avance itens para esta etapa.</div>}
              </div>
            </section>
          ))}
        </div>
      </div>

      {finalizerColumns.length > 0 ? (
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-blue-300">Saída do pátio</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">Arraste uma OS para uma destas etapas para remover do pátio e manter somente no histórico/conferência:</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {finalizerColumns.map((column) => (
              <section
                key={column.status}
                onDragOver={(event) => handleDragOver(event, column.status)}
                onDrop={(event) => handleDrop(event, column.status)}
                className={`rounded-2xl border border-white/10 p-4 text-sm font-black transition ${dragOverStatus === column.status ? "bg-blue-500 text-white" : "bg-white/10 text-slate-100"}`}
              >
                {column.title}
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
