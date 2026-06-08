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

function formatAdmin(admin: { id: string; name: string; email: string; role: PlatformAdminRole; active: boolean; lastLoginAt: Date | null; createdAt: Date }) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    active: admin.active,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  };
}

export async function GET() {
  try {
    await requireMasterPlatformAdmin();

    const admins = await prisma.platformAdmin.findMany({
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

    return NextResponse.json({ success: true, admins: admins.map(formatAdmin) });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireMasterPlatformAdmin();
    const formData = await request.formData();

    const name = normalize(formData.get("name"));
    const email = normalize(formData.get("email")).toLowerCase();
    const role = normalize(formData.get("role"));
    const password = normalize(formData.get("password"));
    const active = normalize(formData.get("active")) !== "false";

    if (!name || !email || !password || password.length < 8) {
      return NextResponse.json({ success: false, message: "Informe nome, e-mail e senha com pelo menos 8 caracteres." }, { status: 400 });
    }

    if (!isPlatformAdminRole(role)) {
      return NextResponse.json({ success: false, message: "Role administrativa inválida." }, { status: 400 });
    }

    const admin = await prisma.platformAdmin.create({
      data: {
        name,
        email,
        role,
        active,
        passwordHash: hashPassword(password),
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

    return NextResponse.json({ success: true, admin: formatAdmin(admin) });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ success: false, message: "Já existe admin AJBSYSTEMS com este e-mail." }, { status: 409 });
    }

    return platformAdminErrorResponse(error);
  }
}
