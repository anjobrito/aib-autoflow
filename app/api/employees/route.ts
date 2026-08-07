import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function GET() {
  const session = await requireCurrentSession();

  const employees = await prisma.employee.findMany({
    where: { companyId: session.companyId, active: true },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, employees });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const name = normalize(formData.get("name"));
  const role = normalize(formData.get("role"));
  const employmentType = normalize(formData.get("employmentType"));

  if (!name || !role || !employmentType) {
    return NextResponse.json({ success: false, message: "Nome, cargo e vínculo são obrigatórios." }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      companyId: session.companyId,
      name,
      cpf: normalize(formData.get("cpf")) || null,
      phone: normalize(formData.get("phone")) || null,
      email: normalize(formData.get("email")) || null,
      role,
      employmentType,
      status: normalize(formData.get("status")) || "Ativo",
      serviceCommissionType: normalize(formData.get("serviceCommissionType")) || "Sem comissão",
      serviceCommissionValue: normalize(formData.get("serviceCommissionValue")) || null,
      partCommissionType: normalize(formData.get("partCommissionType")) || "Sem comissão",
      partCommissionValue: normalize(formData.get("partCommissionValue")) || null,
      washCommissionType: normalize(formData.get("washCommissionType")) || "Sem comissão",
      washCommissionValue: normalize(formData.get("washCommissionValue")) || null,
    },
  });

  return NextResponse.json({ success: true, employee });
}
