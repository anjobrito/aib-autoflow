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

function formatUser(user: { id: string; name: string; email: string; role: UserRole; active: boolean; lastLoginAt: Date | null; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

async function requireTenantUserManager() {
  const session = await requireCurrentSession();
  if (!managerRoles.has(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

function tenantUserErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized";

  if (message === "Forbidden") {
    return NextResponse.json({ success: false, message: "Apenas OWNER ou MANAGER pode administrar usuários da empresa." }, { status: 403 });
  }

  if (message.startsWith("LicenseBlocked:")) {
    return NextResponse.json({ success: false, message: message.replace("LicenseBlocked:", "") }, { status: 402 });
  }

  return NextResponse.json({ success: false, message: "Sessão inválida ou expirada." }, { status: 401 });
}

export async function GET() {
  try {
    const session = await requireTenantUserManager();

    const users = await prisma.user.findMany({
      where: { companyId: session.companyId },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, users: users.map(formatUser) });
  } catch (error) {
    return tenantUserErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireTenantUserManager();
    const formData = await request.formData();

    const name = normalize(formData.get("name"));
    const email = normalize(formData.get("email")).toLowerCase();
    const role = normalize(formData.get("role"));
    const password = normalize(formData.get("password"));
    const active = normalize(formData.get("active")) !== "false";

    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json({ success: false, message: "Informe nome, e-mail e senha com pelo menos 6 caracteres." }, { status: 400 });
    }

    if (!isUserRole(role)) {
      return NextResponse.json({ success: false, message: "Role de usuário inválida." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, message: "Já existe usuário com este e-mail." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        companyId: session.companyId,
        name,
        email,
        role,
        active,
        passwordHash: hashPassword(password),
        systemRole: "NONE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: formatUser(user) });
  } catch (error) {
    return tenantUserErrorResponse(error);
  }
}
