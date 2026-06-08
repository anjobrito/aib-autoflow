import { NextResponse } from "next/server";
import { PlatformAdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/saas-auth";
import { platformAdminErrorResponse, requireMasterPlatformAdmin } from "@/lib/platform-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function isPlatformAdminRole(value: string): value is PlatformAdminRole {
  return ["MASTER", "BILLING", "SUPPORT"].includes(value);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMasterPlatformAdmin();
    const { id } = await params;
    const formData = await request.formData();

    const name = normalize(formData.get("name"));
    const role = normalize(formData.get("role"));
    const password = normalize(formData.get("password"));
    const active = normalize(formData.get("active")) !== "false";

    if (!name) {
      return NextResponse.json({ success: false, message: "Nome é obrigatório." }, { status: 400 });
    }

    if (!isPlatformAdminRole(role)) {
      return NextResponse.json({ success: false, message: "Role administrativa inválida." }, { status: 400 });
    }

    const data: { name: string; role: PlatformAdminRole; active: boolean; passwordHash?: string } = { name, role, active };
    if (password) {
      if (password.length < 8) return NextResponse.json({ success: false, message: "Senha deve ter pelo menos 8 caracteres." }, { status: 400 });
      data.passwordHash = hashPassword(password);
    }

    const admin = await prisma.platformAdmin.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
    });

    return NextResponse.json({ success: true, admin });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
