import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseOptionalInt(value: string) {
  if (!value) return null;
  const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const vehicles = await prisma.vehicle.findMany({
    where: {
      companyId: session.companyId,
      active: true,
      ...(search
        ? {
            OR: [
              { plate: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              { color: { contains: search, mode: "insensitive" } },
              { powertrain: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { document: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          document: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, vehicles });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const customerId = normalize(formData.get("customerId"));
  const plate = normalize(formData.get("plate")).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const brand = normalize(formData.get("brand"));
  const model = normalize(formData.get("model"));
  const year = parseOptionalInt(normalize(formData.get("year")));
  const mileage = parseOptionalInt(normalize(formData.get("mileage")));
  const powertrain = normalize(formData.get("powertrain"));
  const color = normalize(formData.get("color"));

  if (!customerId || !plate || !model) {
    return NextResponse.json({ success: false, message: "Cliente, placa e modelo são obrigatórios." }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId: session.companyId, active: true },
  });

  if (!customer) {
    return NextResponse.json({ success: false, message: "Cliente não encontrado para esta empresa." }, { status: 404 });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      companyId: session.companyId,
      customerId,
      plate,
      brand,
      model,
      year,
      mileage,
      powertrain,
      color,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          document: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, vehicle });
}
