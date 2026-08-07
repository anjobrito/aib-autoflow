import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";
import {
  calculateCommission,
  commissionStatusToFinancial,
  decodeCommissionReference,
  encodeCommissionReference,
  financialEntryToCommission,
} from "@/lib/commission-financial";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function parseReferenceDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function findCommissionEntry(companyId: string, id: string) {
  const entry = await prisma.financialEntry.findFirst({
    where: { id, companyId, type: "Pagar", category: "Comissões" },
  });
  if (!entry || !decodeCommissionReference(entry.reference)) return null;
  return entry;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await context.params;
  const entry = await findCommissionEntry(session.companyId, id);

  if (!entry) {
    return NextResponse.json({ success: false, message: "Comissão não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ success: true, commission: financialEntryToCommission(entry) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await context.params;
  const current = await findCommissionEntry(session.companyId, id);

  if (!current) {
    return NextResponse.json({ success: false, message: "Comissão não encontrada." }, { status: 404 });
  }

  const currentMetadata = decodeCommissionReference(current.reference)!;
  const body = await request.json();

  const employeeId = text(body.employeeId) || currentMetadata.employeeId;
  const targetType = text(body.targetType) || currentMetadata.targetType;
  const targetName = text(body.targetName) || currentMetadata.targetName;
  const valueType = text(body.valueType) || currentMetadata.valueType;
  const value = body.value === undefined ? currentMetadata.value : text(body.value);
  const baseAmount = body.baseAmount === undefined ? currentMetadata.baseAmount : text(body.baseAmount);
  const status = text(body.status) || (current.status === "Pago" ? "Paga" : current.status === "Cancelado" ? "Cancelada" : "Pendente");
  const notes = body.notes === undefined ? (current.notes || "") : text(body.notes);
  const sourceWorkOrderId = body.sourceWorkOrderId === undefined ? (currentMetadata.sourceWorkOrderId || "") : text(body.sourceWorkOrderId);
  const sourceWorkOrderCode = body.sourceWorkOrderCode === undefined ? (currentMetadata.sourceWorkOrderCode || "") : text(body.sourceWorkOrderCode);
  const referenceDate = body.referenceDate === undefined ? current.dueDate : parseReferenceDate(body.referenceDate);

  if (!referenceDate) {
    return NextResponse.json({ success: false, message: "Data de referência inválida." }, { status: 400 });
  }

  if (!["Percentual", "Valor fixo"].includes(valueType) || !["Pendente", "Paga", "Cancelada"].includes(status)) {
    return NextResponse.json({ success: false, message: "Dados de comissão inválidos." }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: session.companyId, active: true },
  });

  if (!employee) {
    return NextResponse.json({ success: false, message: "Funcionário não pertence à empresa autenticada." }, { status: 404 });
  }

  if (sourceWorkOrderId) {
    const workOrder = await prisma.workOrder.findFirst({
      where: { id: sourceWorkOrderId, companyId: session.companyId },
      select: { id: true },
    });
    if (!workOrder) {
      return NextResponse.json({ success: false, message: "Ordem de serviço não pertence à empresa autenticada." }, { status: 404 });
    }
  }

  const calculatedAmount = calculateCommission(baseAmount, valueType, value);
  if (calculatedAmount <= 0) {
    return NextResponse.json({ success: false, message: "A comissão calculada deve ser maior que zero." }, { status: 400 });
  }

  const reference = encodeCommissionReference({
    employeeId: employee.id,
    targetType,
    targetName,
    valueType,
    value,
    baseAmount,
    sourceWorkOrderId: sourceWorkOrderId || undefined,
    sourceWorkOrderCode: sourceWorkOrderCode || undefined,
  });

  const updated = await prisma.financialEntry.update({
    where: { id: current.id },
    data: {
      description: `Comissão ${employee.name}${sourceWorkOrderCode ? ` • ${sourceWorkOrderCode}` : ""}`,
      personName: employee.name,
      reference,
      amount: calculatedAmount,
      dueDate: referenceDate,
      status: commissionStatusToFinancial(status),
      settledAt: status === "Paga" ? (current.settledAt || new Date()) : null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ success: true, commission: financialEntryToCommission(updated) });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await context.params;
  const current = await findCommissionEntry(session.companyId, id);

  if (!current) {
    return NextResponse.json({ success: false, message: "Comissão não encontrada." }, { status: 404 });
  }

  const updated = await prisma.financialEntry.update({
    where: { id: current.id },
    data: { status: "Cancelado", settledAt: null },
  });

  return NextResponse.json({ success: true, commission: financialEntryToCommission(updated) });
}
