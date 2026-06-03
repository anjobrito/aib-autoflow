import { NextResponse } from "next/server";
import { WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseMoneyToNumber(value: string) {
  const cleaned = value.replace("R$", "").replaceAll(" ", "").replaceAll(".", "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapStatus(value: string): WorkOrderStatus {
  const normalized = value.toLowerCase();
  if (normalized.includes("aprov")) return "APPROVED";
  if (normalized.includes("andamento") || normalized.includes("exec") || normalized.includes("lavagem")) return "IN_PROGRESS";
  if (normalized.includes("peça") || normalized.includes("peca")) return "WAITING_PARTS";
  if (normalized.includes("pint")) return "PAINTING";
  if (normalized.includes("acab")) return "FINISHING";
  if (normalized.includes("pronto") || normalized.includes("retirada")) return "READY_FOR_PICKUP";
  if (normalized.includes("entreg")) return "DELIVERED";
  if (normalized.includes("cancel")) return "CANCELED";
  if (normalized.includes("orc") || normalized.includes("orç") || normalized.includes("diagn")) return "QUOTE";
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
    total: formatCurrency(order.totalAmount),
    origin: "Banco",
  };
}

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const orders = await prisma.workOrder.findMany({
    where: {
      companyId: session.companyId,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { vehicle: { plate: { contains: search, mode: "insensitive" } } },
              { vehicle: { model: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { customer: true, vehicle: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, orders: orders.map(formatOrder) });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const customerId = normalize(formData.get("customerId"));
  const vehicleId = normalize(formData.get("vehicleId"));
  const serviceName = normalize(formData.get("serviceName"));
  const productName = normalize(formData.get("productName"));
  const statusText = normalize(formData.get("status"));
  const notes = normalize(formData.get("notes"));
  const partsTotal = parseMoneyToNumber(normalize(formData.get("partsTotal")));
  const servicesTotal = parseMoneyToNumber(normalize(formData.get("servicesTotal")));
  const totalAmount = parseMoneyToNumber(normalize(formData.get("totalAmount")));

  if (!customerId || !vehicleId) {
    return NextResponse.json({ success: false, message: "Cliente e veículo são obrigatórios." }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: session.companyId, active: true } });
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, companyId: session.companyId, active: true } });

  if (!customer || !vehicle) {
    return NextResponse.json({ success: false, message: "Cliente ou veículo não encontrado para esta empresa." }, { status: 404 });
  }

  const count = await prisma.workOrder.count({ where: { companyId: session.companyId } });
  const code = `OS-${String(count + 1).padStart(5, "0")}`;
  const description = [serviceName, productName ? `Item: ${productName}` : "", notes].filter(Boolean).join(" | ");

  const order = await prisma.workOrder.create({
    data: {
      companyId: session.companyId,
      customerId,
      vehicleId,
      code,
      status: mapStatus(statusText),
      description,
      totalParts: partsTotal,
      totalServices: servicesTotal,
      totalAmount,
    },
    include: { customer: true, vehicle: true },
  });

  return NextResponse.json({ success: true, order: formatOrder(order) });
}
