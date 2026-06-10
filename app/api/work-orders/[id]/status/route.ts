import { NextResponse } from "next/server";
import { WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";
import { finalizedPrismaStatuses } from "@/lib/work-order-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function mapStatus(value: string): WorkOrderStatus {
  const normalized = value.toLowerCase();
  if (normalized.includes("aprov")) return "APPROVED";
  if (normalized.includes("andamento") || normalized.includes("exec") || normalized.includes("lavagem") || normalized.includes("atendimento")) return "IN_PROGRESS";
  if (normalized.includes("peça") || normalized.includes("peca") || normalized.includes("aguard")) return "WAITING_PARTS";
  if (normalized.includes("pint")) return "PAINTING";
  if (normalized.includes("acab")) return "FINISHING";
  if (normalized.includes("pronto") || normalized.includes("retirada") || normalized.includes("qualidade")) return "READY_FOR_PICKUP";
  if (normalized.includes("entreg") || normalized.includes("finaliz") || normalized.includes("conclu") || normalized.includes("fatur")) return "DELIVERED";
  if (normalized.includes("cancel")) return "CANCELED";
  if (normalized.includes("orc") || normalized.includes("orç") || normalized.includes("diagn") || normalized.includes("entrada")) return "QUOTE";
  return "OPEN";
}

function statusLabel(status: WorkOrderStatus) {
  const labels: Record<WorkOrderStatus, string> = {
    OPEN: "Aberta",
    QUOTE: "Orçamento",
    APPROVED: "Aprovada",
    IN_PROGRESS: "Em andamento",
    WAITING_PARTS: "Aguardando peças",
    PAINTING: "Pintura",
    FINISHING: "Acabamento",
    READY_FOR_PICKUP: "Pronto para retirada",
    DELIVERED: "Entregue",
    CANCELED: "Cancelada",
  };
  return labels[status];
}

function formatCurrency(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatOrder(order: any) {
  return {
    id: order.id,
    code: order.code,
    customer: order.customer?.name || "Cliente não informado",
    vehicle: `${order.vehicle?.plate || ""} - ${order.vehicle?.brand || ""} ${order.vehicle?.model || ""}`.trim(),
    service: order.description || "Atendimento operacional",
    responsibleEmployeeName: "Não definido",
    status: statusLabel(order.status),
    statusCode: order.status,
    total: formatCurrency(order.totalAmount),
    origin: "Banco",
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await requireCurrentSession();
  const { id } = await params;
  const formData = await request.formData();
  const statusText = String(formData.get("status") || "").trim();

  if (!statusText) {
    return NextResponse.json({ success: false, message: "Status é obrigatório." }, { status: 400 });
  }

  const existing = await prisma.workOrder.findFirst({
    where: { id, companyId: session.companyId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, message: "OS não encontrada para esta empresa." }, { status: 404 });
  }

  const nextStatus = mapStatus(statusText);
  const isFinalized = finalizedPrismaStatuses.includes(nextStatus as any);

  const order = await prisma.workOrder.update({
    where: { id },
    data: {
      status: nextStatus,
      closedAt: isFinalized ? existing.closedAt || new Date() : null,
    },
    include: { customer: true, vehicle: true },
  });

  return NextResponse.json({ success: true, finalized: isFinalized, order: formatOrder(order) });
}
