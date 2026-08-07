import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";
import { recordAuditEvent, tenantAuditActor } from "@/lib/audit";

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=.*\.)/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculate(financedAmount: unknown, returnPercentage: unknown, ilaPercentage: unknown) {
  const financed = Math.max(0, toNumber(financedAmount));
  const returnPct = Math.max(0, toNumber(returnPercentage));
  const ilaPct = Math.max(0, toNumber(ilaPercentage));
  const gross = financed * (returnPct / 100);
  const ila = gross * (ilaPct / 100);
  const net = Math.max(0, gross - ila);
  return { financed, returnPct, ilaPct, gross, ila, net };
}

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const financings = await prisma.vehicleFinancing.findMany({
    where: {
      companyId: session.companyId,
      ...(search
        ? {
            OR: [
              { customerName: { contains: search, mode: "insensitive" } },
              { customerDocument: { contains: search, mode: "insensitive" } },
              { vehiclePlate: { contains: search, mode: "insensitive" } },
              { vehicleModel: { contains: search, mode: "insensitive" } },
              { contractNumber: { contains: search, mode: "insensitive" } },
              { financedBank: { contains: search, mode: "insensitive" } },
              { sellerName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, financings });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const body = await request.json();

  const customerId = body.customerId ? String(body.customerId) : null;
  const vehicleId = body.vehicleId ? String(body.vehicleId) : null;

  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: session.companyId, active: true } });
    if (!customer) return NextResponse.json({ success: false, message: "Cliente inválido para esta empresa." }, { status: 400 });
  }

  if (vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, companyId: session.companyId, active: true } });
    if (!vehicle) return NextResponse.json({ success: false, message: "Veículo inválido para esta empresa." }, { status: 400 });
  }

  const calculated = calculate(body.financedAmount, body.returnPercentage, body.ilaDiscountPercentage ?? 26);
  const date = body.date ? new Date(`${String(body.date).slice(0, 10)}T12:00:00.000Z`) : new Date();

  const financing = await prisma.vehicleFinancing.create({
    data: {
      companyId: session.companyId,
      customerId,
      vehicleId,
      sellerName: String(body.sellerName ?? "").trim(),
      date,
      financedBank: String(body.financedBank ?? "").trim(),
      customerDocument: String(body.customerDocument ?? "").trim(),
      customerName: String(body.customerName ?? "").trim(),
      customerPhone: String(body.customerPhone ?? "").trim(),
      vehicleBrand: String(body.vehicleBrand ?? "").trim(),
      vehicleModel: String(body.vehicleModel ?? "").trim(),
      vehiclePlate: String(body.vehiclePlate ?? "").trim().toUpperCase(),
      vehicleChassis: String(body.vehicleChassis ?? "").trim().toUpperCase(),
      vehicleYear: String(body.vehicleYear ?? "").trim(),
      contractNumber: String(body.contractNumber ?? "").trim(),
      requestedAmount: Math.max(0, toNumber(body.requestedAmount)),
      downPaymentAmount: Math.max(0, toNumber(body.downPaymentAmount)),
      financedAmount: calculated.financed,
      returnPercentage: calculated.returnPct,
      returnAmount: calculated.gross,
      ilaDiscountPercentage: calculated.ilaPct,
      ilaDiscountAmount: calculated.ila,
      netReturnAmount: calculated.net,
      prestamistaInsuranceAmount: Math.max(0, toNumber(body.prestamistaInsuranceAmount)),
      branchName: String(body.branchName ?? "Matriz").trim() || "Matriz",
      financingStatus: String(body.financingStatus ?? "EM_ANALISE"),
      lienStatus: String(body.lienStatus ?? "NAO_INICIADO"),
      returnReceived: Boolean(body.returnReceived),
      notes: String(body.notes ?? "").trim(),
    },
  });

  await recordAuditEvent({
    ...tenantAuditActor(session),
    action: "FINANCING_CREATED",
    entityType: "VehicleFinancing",
    entityId: financing.id,
    newValue: {
      customerId: financing.customerId,
      vehicleId: financing.vehicleId,
      contractNumber: financing.contractNumber,
      financedAmount: financing.financedAmount.toString(),
      returnPercentage: financing.returnPercentage.toString(),
      returnAmount: financing.returnAmount.toString(),
      ilaDiscountPercentage: financing.ilaDiscountPercentage.toString(),
      ilaDiscountAmount: financing.ilaDiscountAmount.toString(),
      netReturnAmount: financing.netReturnAmount.toString(),
      returnReceived: financing.returnReceived,
      financingStatus: financing.financingStatus,
      lienStatus: financing.lienStatus,
    },
  });

  return NextResponse.json({ success: true, financing }, { status: 201 });
}
