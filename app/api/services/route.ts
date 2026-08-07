import { NextResponse } from "next/server";
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

function formatService(service: { id: string; name: string; category: string | null; duration: string | null; price: unknown; active: boolean }) {
  return {
    id: service.id,
    name: service.name,
    category: service.category || "Sem categoria",
    duration: service.duration || "Não informado",
    price: Number(service.price || 0),
    status: service.active ? "Ativo" : "Inativo",
  };
}

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const services = await prisma.service.findMany({
    where: {
      companyId: session.companyId,
      active: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { duration: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, services: services.map(formatService) });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const name = normalize(formData.get("name"));
  const category = normalize(formData.get("category"));
  const duration = normalize(formData.get("duration"));
  const price = parseMoneyToNumber(normalize(formData.get("price")));
  const status = normalize(formData.get("status")) || "Ativo";

  if (!name) {
    return NextResponse.json({ success: false, message: "Nome do serviço é obrigatório." }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      companyId: session.companyId,
      name,
      category,
      duration,
      price,
      active: status !== "Inativo",
    },
  });

  return NextResponse.json({ success: true, service: formatService(service) });
}

export async function PUT(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const id = normalize(formData.get("id"));
  const name = normalize(formData.get("name"));
  const category = normalize(formData.get("category"));
  const duration = normalize(formData.get("duration"));
  const price = parseMoneyToNumber(normalize(formData.get("price")));
  const status = normalize(formData.get("status")) || "Ativo";

  if (!id) {
    return NextResponse.json({ success: false, message: "ID do serviço é obrigatório." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ success: false, message: "Nome do serviço é obrigatório." }, { status: 400 });
  }

  const existing = await prisma.service.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Serviço não encontrado." }, { status: 404 });
  }

  const service = await prisma.service.update({
    where: { id },
    data: {
      name,
      category,
      duration,
      price,
      active: status !== "Inativo",
    },
  });

  return NextResponse.json({ success: true, service: formatService(service) });
}
