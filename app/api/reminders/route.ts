import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function mapChannel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("whatsapp")) return "WHATSAPP" as const;
  if (normalized.includes("sms")) return "SMS" as const;
  return "EMAIL" as const;
}

function displayChannel(value: string) {
  if (value === "WHATSAPP") return "WhatsApp";
  if (value === "SMS") return "SMS";
  return "E-mail";
}

export async function GET() {
  const session = await requireCurrentSession();

  const reminders = await prisma.maintenanceReminder.findMany({
    where: { companyId: session.companyId },
    include: {
      customer: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    success: true,
    reminders: reminders.map((reminder) => ({
      id: reminder.id,
      type: reminder.title,
      customerId: reminder.customerId,
      customer: reminder.customer.name,
      vehicleId: reminder.vehicleId,
      plate: reminder.vehicle.plate,
      dueDate: reminder.dueDate?.toISOString().slice(0, 10) ?? "",
      channel: displayChannel(reminder.channel),
      message: reminder.description ?? "",
      status: reminder.sentAt ? "Enviado" : "Pendente",
      createdAt: reminder.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const type = normalize(formData.get("type"));
  const customerId = normalize(formData.get("customerId"));
  const vehicleId = normalize(formData.get("vehicleId"));
  const dueDateRaw = normalize(formData.get("dueDate"));
  const channel = normalize(formData.get("channel"));
  const message = normalize(formData.get("message"));

  if (!type || !customerId || !vehicleId || !dueDateRaw) {
    return NextResponse.json({ success: false, message: "Tipo, cliente, veículo e vencimento são obrigatórios." }, { status: 400 });
  }

  const [customer, vehicle] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, companyId: session.companyId, active: true } }),
    prisma.vehicle.findFirst({ where: { id: vehicleId, companyId: session.companyId, active: true } }),
  ]);

  if (!customer || !vehicle || vehicle.customerId !== customer.id) {
    return NextResponse.json({ success: false, message: "Cliente ou veículo não pertence à empresa autenticada." }, { status: 400 });
  }

  const dueDate = new Date(`${dueDateRaw}T12:00:00.000Z`);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ success: false, message: "Data de vencimento inválida." }, { status: 400 });
  }

  const reminder = await prisma.maintenanceReminder.create({
    data: {
      companyId: session.companyId,
      customerId,
      vehicleId,
      title: type,
      description: message || null,
      dueDate,
      channel: mapChannel(channel),
    },
  });

  return NextResponse.json({ success: true, reminder });
}
