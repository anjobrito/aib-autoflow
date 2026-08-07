import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await context.params;
  const body = await request.json();

  const existing = await prisma.vehicleFinancing.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ success: false, message: "Financiamento não encontrado." }, { status: 404 });

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
  const date = body.date ? new Date(`${String(body.date).slice(0, 10)}T12:00:00.000Z`) : existing.date;

  const financing = await prisma.vehicleFinancing.update({
    where: { id },
    data: {
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

  return NextResponse.json({ success: true, financing });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireCurrentSession();
  const { id } = await context.params;

  const existing = await prisma.vehicleFinancing.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ success: false, message: "Financiamento não encontrado." }, { status: 404 });

  await prisma.vehicleFinancing.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
