import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireCurrentSession } from "@/lib/saas-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const managerRoles = new Set<UserRole>(["OWNER", "MANAGER"]);

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function isUserRole(value: string): value is UserRole {
  return ["OWNER", "MANAGER", "MECHANIC", "ATTENDANT", "SALES", "FINANCIAL"].includes(value);
}

async function requireTenantUserManager() {
  const session = await requireCurrentSession();
  if (!managerRoles.has(session.user.role)) throw new Error("Forbidden");
  return session;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized";

  if (message === "Forbidden") {
    return NextResponse.json({ success: false, message: "Apenas OWNER ou MANAGER pode administrar usuários da empresa." }, { status: 403 });
  }

  if (message.startsWith("LicenseBlocked:")) {
    return NextResponse.json({ success: false, message: message.replace("LicenseBlocked:", "") }, { status: 402 });
  }

  return NextResponse.json({ success: false, message: "Sessão inválida ou expirada." }, { status: 401 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireTenantUserManager();
    const { id } = await params;
    const formData = await request.formData();

    const name = normalize(formData.get("name"));
    const role = normalize(formData.get("role"));
    const password = normalize(formData.get("password"));
    const active = normalize(formData.get("active")) !== "false";

    if (!name) {
      return NextResponse.json({ success: false, message: "Nome é obrigatório." }, { status: 400 });
    }

    if (!isUserRole(role)) {
      return NextResponse.json({ success: false, message: "Role de usuário inválida." }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { id, companyId: session.companyId } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Usuário não encontrado nesta empresa." }, { status: 404 });
    }

    const activeUserCount = await prisma.user.count({ where: { companyId: session.companyId, active: true } });
    if (existing.id === session.userId && !active && activeUserCount <= 1) {
      return NextResponse.json({ success: false, message: "Não é possível desativar o último usuário ativo da empresa." }, { status: 400 });
    }

    const data: { name: string; role: UserRole; active: boolean; passwordHash?: string } = { name, role, active };
    if (password) {
      if (password.length < 6) return NextResponse.json({ success: false, message: "Senha deve ter pelo menos 6 caracteres." }, { status: 400 });
      data.passwordHash = hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return errorResponse(error);
  }
}
