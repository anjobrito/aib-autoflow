import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";
import {
  calculateCommission,
  commissionStatusToFinancial,
  encodeCommissionReference,
  financialEntryToCommission,
} from "@/lib/commission-financial";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function parseReferenceDate(value: unknown) {
  const raw = text(value);
  const date = raw ? new Date(`${raw}T12:00:00.000Z`) : new Date();
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  const session = await requireCurrentSession();

  const entries = await prisma.financialEntry.findMany({
    where: {
      companyId: session.companyId,
      type: "Pagar",
      category: "Comissões",
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
  });

  const commissions = entries
    .map(financialEntryToCommission)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return NextResponse.json({ success: true, commissions });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json();

  const employeeId = text(body.employeeId);
  const targetType = text(body.targetType) || "Serviço";
  const targetName = text(body.targetName) || "Outro";
  const valueType = text(body.valueType) || "Percentual";
  const value = text(body.value);
  const baseAmount = text(body.baseAmount);
  const status = text(body.status) || "Pendente";
  const notes = text(body.notes);
  const sourceWorkOrderId = text(body.sourceWorkOrderId);
  const sourceWorkOrderCode = text(body.sourceWorkOrderCode);
  const referenceDate = parseReferenceDate(body.referenceDate);

  if (!employeeId) {
    return NextResponse.json({ success: false, message: "Selecione um funcionário." }, { status: 400 });
  }

  if (!referenceDate) {
    return NextResponse.json({ success: false, message: "Data de referência inválida." }, { status: 400 });
  }

  if (!["Percentual", "Valor fixo"].includes(valueType)) {
    return NextResponse.json({ success: false, message: "Regra de comissão inválida." }, { status: 400 });
  }

  if (!["Pendente", "Paga", "Cancelada"].includes(status)) {
    return NextResponse.json({ success: false, message: "Status de comissão inválido." }, { status: 400 });
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

  const entry = await prisma.financialEntry.create({
    data: {
      companyId: session.companyId,
      type: "Pagar",
      description: `Comissão ${employee.name}${sourceWorkOrderCode ? ` • ${sourceWorkOrderCode}` : ""}`,
      personName: employee.name,
      reference,
      category: "Comissões",
      amount: calculatedAmount,
      dueDate: referenceDate,
      settledAt: status === "Paga" ? new Date() : null,
      status: commissionStatusToFinancial(status),
      paymentMethod: null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ success: true, commission: financialEntryToCommission(entry) });
}
