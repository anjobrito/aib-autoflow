import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await params;
  const formData = await request.formData();

  const name = normalize(formData.get("name"));
  const document = normalize(formData.get("document"));
  const phone = normalize(formData.get("phone"));
  const email = normalize(formData.get("email"));
  const city = normalize(formData.get("city"));
  const state = normalize(formData.get("state"));

  if (!name || !phone) {
    return NextResponse.json({ success: false, message: "Nome e telefone são obrigatórios." }, { status: 400 });
  }

  const existing = await prisma.customer.findFirst({
    where: { id, companyId: session.companyId, active: true },
  });

  if (!existing) {
    return NextResponse.json({ success: false, message: "Cliente não encontrado." }, { status: 404 });
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name,
      document,
      phone,
      email,
      city,
      state,
    },
  });

  return NextResponse.json({ success: true, customer });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await params;

  const existing = await prisma.customer.findFirst({
    where: { id, companyId: session.companyId, active: true },
  });

  if (!existing) {
    return NextResponse.json({ success: false, message: "Cliente não encontrado." }, { status: 404 });
  }

  await prisma.customer.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
