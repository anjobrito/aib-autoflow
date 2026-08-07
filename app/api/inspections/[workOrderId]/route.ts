import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function text(value: unknown) {
  return String(value ?? "").trim();
}

async function findOrder(companyId: string, workOrderId: string) {
  return prisma.workOrder.findFirst({
    where: { id: workOrderId, companyId },
    include: { vehicle: true },
  });
}

export async function GET(_: Request, context: { params: Promise<{ workOrderId: string }> }) {
  const session = await requireCurrentSession();
  const { workOrderId } = await context.params;
  const order = await findOrder(session.companyId, workOrderId);

  if (!order) {
    return NextResponse.json({ success: false, message: "Ordem de serviço não encontrada para esta empresa." }, { status: 404 });
  }

  const inspection = await prisma.vehicleInspection.findFirst({
    where: { companyId: session.companyId, workOrderId },
  });

  return NextResponse.json({
    success: true,
    order: { id: order.id, code: order.code, plate: order.vehicle.plate },
    inspection: inspection ? {
      ...inspection,
      createdAt: inspection.createdAt.toISOString(),
      updatedAt: inspection.updatedAt.toISOString(),
    } : null,
  });
}

export async function PUT(request: Request, context: { params: Promise<{ workOrderId: string }> }) {
  const session = await requireCurrentSession();
  const { workOrderId } = await context.params;
  const order = await findOrder(session.companyId, workOrderId);

  if (!order) {
    return NextResponse.json({ success: false, message: "Ordem de serviço não encontrada para esta empresa." }, { status: 404 });
  }

  const body = await request.json();
  const plate = text(body.plate) || order.vehicle.plate;
  const damages = Array.isArray(body.damages) ? body.damages.map(text).filter(Boolean) : [];

  const inspection = await prisma.vehicleInspection.upsert({
    where: { workOrderId },
    create: {
      companyId: session.companyId,
      workOrderId,
      plate,
      mileage: text(body.mileage) || null,
      fuelLevel: text(body.fuelLevel) || null,
      hasDocuments: Boolean(body.hasDocuments),
      hasSpareTire: Boolean(body.hasSpareTire),
      hasJack: Boolean(body.hasJack),
      hasPersonalItems: Boolean(body.hasPersonalItems),
      personalItems: text(body.personalItems) || null,
      damages,
      notes: text(body.notes) || null,
    },
    update: {
      plate,
      mileage: text(body.mileage) || null,
      fuelLevel: text(body.fuelLevel) || null,
      hasDocuments: Boolean(body.hasDocuments),
      hasSpareTire: Boolean(body.hasSpareTire),
      hasJack: Boolean(body.hasJack),
      hasPersonalItems: Boolean(body.hasPersonalItems),
      personalItems: text(body.personalItems) || null,
      damages,
      notes: text(body.notes) || null,
    },
  });

  return NextResponse.json({
    success: true,
    inspection: {
      ...inspection,
      createdAt: inspection.createdAt.toISOString(),
      updatedAt: inspection.updatedAt.toISOString(),
    },
  });
}
