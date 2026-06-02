import { NextResponse } from "next/server";
import { getCurrentSession, getLicenseBlockReason } from "@/lib/saas-auth";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ success: false, authenticated: false, allowed: false, reason: "Sessão inválida." }, { status: 401 });
  }

  const blockReason = getLicenseBlockReason(session);

  return NextResponse.json({
    success: true,
    authenticated: true,
    allowed: !blockReason,
    reason: blockReason,
    company: {
      id: session.company.id,
      name: session.company.name,
      tradeName: session.company.tradeName,
      subscriptionStatus: session.company.subscriptionStatus,
      accessBlocked: session.company.accessBlocked,
      lockedReason: session.company.lockedReason,
    },
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      systemRole: session.user.systemRole,
    },
    subscription: session.company.subscription,
  });
}
