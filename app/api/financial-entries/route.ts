import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";
import { recordAuditEvent, tenantAuditActor } from "@/lib/audit";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseAmount(value: string) {
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parseDate(value: string) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.trim();

  const entries = await prisma.financialEntry.findMany({
    where: {
      companyId: session.companyId,
      ...(type ? { type } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    success: true,
    entries: entries.map((entry) => ({
      ...entry,
      amount: entry.amount.toString(),
      dueDate: entry.dueDate.toISOString().slice(0, 10),
      settledAt: entry.settledAt?.toISOString().slice(0, 10) ?? "",
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const type = normalize(formData.get("type"));
  const description = normalize(formData.get("description"));
  const personName = normalize(formData.get("personName"));
  const reference = normalize(formData.get("reference"));
  const category = normalize(formData.get("category"));
  const amountRaw = normalize(formData.get("amount"));
  const dueDateRaw = normalize(formData.get("dueDate"));
  const settledAtRaw = normalize(formData.get("settledAt"));
  const status = normalize(formData.get("status")) || "Pendente";
  const paymentMethod = normalize(formData.get("paymentMethod"));
  const notes = normalize(formData.get("notes"));

  if (!["Pagar", "Receber"].includes(type)) {
    return NextResponse.json({ success: false, message: "Tipo financeiro inválido." }, { status: 400 });
  }

  if (!description || !category || !dueDateRaw) {
    return NextResponse.json({ success: false, message: "Descrição, categoria e vencimento são obrigatórios." }, { status: 400 });
  }

  const amount = parseAmount(amountRaw);
  if (amount <= 0) {
    return NextResponse.json({ success: false, message: "Informe um valor maior que zero." }, { status: 400 });
  }

  const dueDate = parseDate(dueDateRaw);
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ success: false, message: "Data de vencimento inválida." }, { status: 400 });
  }

  const entry = await prisma.financialEntry.create({
    data: {
      companyId: session.companyId,
      type,
      description,
      personName: personName || null,
      reference: reference || null,
      category,
      amount,
      dueDate,
      settledAt: parseDate(settledAtRaw),
      status,
      paymentMethod: paymentMethod || null,
      notes: notes || null,
    },
  });

  await recordAuditEvent({
    ...tenantAuditActor(session),
    action: "FINANCIAL_ENTRY_CREATED",
    entityType: "FinancialEntry",
    entityId: entry.id,
    newValue: {
      type: entry.type,
      description: entry.description,
      category: entry.category,
      amount: entry.amount.toString(),
      dueDate: entry.dueDate,
      status: entry.status,
      personName: entry.personName,
      reference: entry.reference,
    },
  });

  return NextResponse.json({ success: true, entry });
}
