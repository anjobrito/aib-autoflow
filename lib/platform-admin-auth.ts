import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/saas-auth";

export type PlatformAdminRole = "SUPPORT" | "BILLING" | "MASTER";

const adminSessionCookieName = "ajb_platform_admin_session";
const masterEmail = "anjobrito@gmail.com";
const billingRoles = new Set<PlatformAdminRole>(["MASTER", "BILLING"]);
const supportRoles = new Set<PlatformAdminRole>(["MASTER", "BILLING", "SUPPORT"]);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("hex");
}

function getSessionExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt;
}

export async function ensureMasterPlatformAdmin(password: string) {
  const existing = await prisma.platformAdmin.findUnique({ where: { email: masterEmail } });

  if (existing) {
    return prisma.platformAdmin.update({
      where: { id: existing.id },
      data: { passwordHash: hashPassword(password), role: "MASTER", active: true },
    });
  }

  return prisma.platformAdmin.create({
    data: {
      name: "Andre Brito",
      email: masterEmail,
      passwordHash: hashPassword(password),
      role: "MASTER",
      active: true,
    },
  });
}

export async function createPlatformAdminSession(adminId: string) {
  const token = createSessionToken();
  const expiresAt = getSessionExpiresAt();

  await prisma.platformAdminSession.create({
    data: {
      adminId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function authenticatePlatformAdmin(email: string, password: string) {
  const admin = await prisma.platformAdmin.findUnique({ where: { email: email.toLowerCase() } });

  if (!admin || !admin.active || !verifyPassword(password, admin.passwordHash)) {
    return null;
  }

  await prisma.platformAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await createPlatformAdminSession(admin.id);
  return admin;
}

export async function getCurrentPlatformAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName)?.value;
  if (!token) return null;

  const session = await prisma.platformAdminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true },
  });

  if (!session || session.status !== "ACTIVE" || session.expiresAt < new Date() || !session.admin.active) {
    return null;
  }

  return session;
}

export async function requireSupportPlatformAdmin() {
  const session = await getCurrentPlatformAdminSession();
  if (!session) throw new Error("Unauthorized");
  if (!supportRoles.has(session.admin.role)) throw new Error("Forbidden");
  return session;
}

export async function requireBillingPlatformAdmin() {
  const session = await getCurrentPlatformAdminSession();
  if (!session) throw new Error("Unauthorized");
  if (!billingRoles.has(session.admin.role)) throw new Error("Forbidden");
  return session;
}

export async function requireMasterPlatformAdmin() {
  const session = await getCurrentPlatformAdminSession();
  if (!session) throw new Error("Unauthorized");
  if (session.admin.role !== "MASTER") throw new Error("Forbidden");
  return session;
}

export async function destroyCurrentPlatformAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName)?.value;

  if (token) {
    await prisma.platformAdminSession.updateMany({
      where: { tokenHash: hashToken(token), status: "ACTIVE" },
      data: { status: "REVOKED" },
    });
  }

  cookieStore.delete(adminSessionCookieName);
}

export function platformAdminErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized";

  if (message === "Forbidden") {
    return NextResponse.json({ success: false, message: "Acesso administrativo AJBSYSTEMS negado." }, { status: 403 });
  }

  return NextResponse.json({ success: false, message: "Sessão administrativa AJBSYSTEMS inválida." }, { status: 401 });
}
