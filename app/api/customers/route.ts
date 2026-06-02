import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const customers = await prisma.customer.findMany({
    where: {
      companyId: session.companyId,
      active: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { document: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
              { state: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, customers });
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

  if (!name || !phone) {
    return NextResponse.json({ success: false, message: "Nome e telefone são obrigatórios." }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      companyId: session.companyId,
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
