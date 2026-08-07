import { cookies } from "next/headers";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "ajb_session";
const sessionDurationDays = 30;
const systemAdminRoles = new Set(["MASTER", "BILLING", "SUPPORT"]);

function getPasswordSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "ajb-autoflow-local-dev-secret";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt + getPasswordSecret(), 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;

  const candidateHash = pbkdf2Sync(password, salt + getPasswordSecret(), 120000, 64, "sha512").toString("hex");
  const originalBuffer = Buffer.from(originalHash, "hex");
  const candidateBuffer = Buffer.from(candidateHash, "hex");

  if (originalBuffer.length !== candidateBuffer.length) return false;
  return timingSafeEqual(originalBuffer, candidateBuffer);
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function getSessionExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionDurationDays);
  return expiresAt;
}

export async function createUserSession(userId: string, companyId: string) {
  const token = createSessionToken();
  const expiresAt = getSessionExpiresAt();

  await prisma.session.create({
    data: {
      userId,
      companyId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true, company: { include: { subscription: true } } },
  });

  if (!session || session.status !== "ACTIVE" || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }

  return session;
}

export function getLicenseBlockReason(session: Awaited<ReturnType<typeof getCurrentSession>>) {
  if (!session) return "Sessão inválida.";
  if (systemAdminRoles.has(session.user.systemRole)) return null;

  if (session.company.accessBlocked) {
    return session.company.lockedReason || "Acesso bloqueado pelo administrador.";
  }

  if (session.company.subscriptionStatus === "BLOCKED") return "Empresa bloqueada por pendência administrativa.";
  if (session.company.subscriptionStatus === "CANCELED") return "Assinatura cancelada.";

  const subscription = session.company.subscription;
  const now = new Date();

  if (subscription?.status === "BLOCKED") return "Assinatura bloqueada.";
  if (subscription?.status === "CANCELED") return "Assinatura cancelada.";
  if (subscription?.expiresAt && subscription.expiresAt < now) return "Assinatura vencida.";
  if (subscription?.status === "TRIAL" && subscription.trialEndsAt && subscription.trialEndsAt < now) return "Período de demonstração expirado.";

  return null;
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Unauthorized");

  const blockReason = getLicenseBlockReason(session);
  if (blockReason) throw new Error(`LicenseBlocked:${blockReason}`);

  return session;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), status: "ACTIVE" },
      data: { status: "REVOKED" },
    });
  }

  cookieStore.delete(sessionCookieName);
}
