import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function GET() {
  const session = await requireCurrentSession();

  const suppliers = await prisma.supplier.findMany({
    where: { companyId: session.companyId, active: true },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, suppliers });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const name = normalize(formData.get("name"));
  const document = normalize(formData.get("document"));
  const phone = normalize(formData.get("phone"));
  const email = normalize(formData.get("email"));
  const city = normalize(formData.get("city"));
  const state = normalize(formData.get("state"));

  if (!name) {
    return NextResponse.json({ success: false, message: "Nome do fornecedor é obrigatório." }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: {
      companyId: session.companyId,
      name,
      document: document || null,
      phone: phone || null,
      email: email || null,
      city: city || null,
      state: state || null,
    },
  });

  return NextResponse.json({ success: true, supplier });
}
