import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

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

async function findOwnedEntry(id: string, companyId: string) {
  return prisma.financialEntry.findFirst({ where: { id, companyId } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await context.params;
  const existing = await findOwnedEntry(id, session.companyId);

  if (!existing) {
    return NextResponse.json({ success: false, message: "Lançamento não encontrado." }, { status: 404 });
  }

  const formData = await request.formData();
  const type = normalize(formData.get("type")) || existing.type;
  const description = normalize(formData.get("description"));
  const personName = normalize(formData.get("personName"));
  const reference = normalize(formData.get("reference"));
  const category = normalize(formData.get("category"));
  const amountRaw = normalize(formData.get("amount"));
  const dueDateRaw = normalize(formData.get("dueDate"));
  const settledAtRaw = normalize(formData.get("settledAt"));
  const status = normalize(formData.get("status"));
  const paymentMethod = normalize(formData.get("paymentMethod"));
  const notes = normalize(formData.get("notes"));

  const amount = parseAmount(amountRaw);
  const dueDate = parseDate(dueDateRaw);

  if (!['Pagar', 'Receber'].includes(type) || !description || !category || amount <= 0 || !dueDate || Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ success: false, message: "Dados do lançamento inválidos." }, { status: 400 });
  }

  const entry = await prisma.financialEntry.update({
    where: { id },
    data: {
      type,
      description,
      personName: personName || null,
      reference: reference || null,
      category,
      amount,
      dueDate,
      settledAt: parseDate(settledAtRaw),
      status: status || existing.status,
      paymentMethod: paymentMethod || null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ success: true, entry });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await context.params;
  const existing = await findOwnedEntry(id, session.companyId);

  if (!existing) {
    return NextResponse.json({ success: false, message: "Lançamento não encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const status = String(body.status ?? "").trim();
  if (!status) {
    return NextResponse.json({ success: false, message: "Status é obrigatório." }, { status: 400 });
  }

  const settled = status === "Pago" || status === "Recebido";
  const entry = await prisma.financialEntry.update({
    where: { id },
    data: {
      status,
      settledAt: settled ? existing.settledAt ?? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, entry });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await context.params;
  const existing = await findOwnedEntry(id, session.companyId);

  if (!existing) {
    return NextResponse.json({ success: false, message: "Lançamento não encontrado." }, { status: 404 });
  }

  await prisma.financialEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
