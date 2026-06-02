import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/saas-auth";

const masterEmail = "anjobrito@gmail.com";
const billingRoles = new Set(["MASTER", "BILLING"]);
const supportRoles = new Set(["MASTER", "BILLING", "SUPPORT"]);

export function isMasterEmail(email: string) {
  return email.toLowerCase() === masterEmail;
}

export async function requireSupportAdmin() {
  const session = await getCurrentSession();

  if (!session || !session.user.active) {
    throw new Error("Unauthorized");
  }

  if (isMasterEmail(session.user.email)) return session;

  if (!supportRoles.has(session.user.systemRole)) {
    throw new Error("Forbidden");
  }

  return session;
}

export async function requireBillingAdmin() {
  const session = await getCurrentSession();

  if (!session || !session.user.active) {
    throw new Error("Unauthorized");
  }

  if (isMasterEmail(session.user.email)) return session;

  if (!billingRoles.has(session.user.systemRole)) {
    throw new Error("Forbidden");
  }

  return session;
}

export function adminErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unauthorized";

  if (message === "Forbidden") {
    return NextResponse.json({ success: false, message: "Acesso administrativo negado." }, { status: 403 });
  }

  return NextResponse.json({ success: false, message: "Sessão administrativa inválida." }, { status: 401 });
}
