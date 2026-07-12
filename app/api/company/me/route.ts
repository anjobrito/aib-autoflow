import { NextResponse } from "next/server";
import { requireCurrentSession } from "@/lib/saas-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function businessTypeLabel(value: string) {
  const labels: Record<string, string> = {
    AUTO_REPAIR: "Oficina mecânica",
    CAR_WASH: "Lava-jato",
    AUTO_DETAILING: "Estética automotiva",
    AUTO_PARTS: "Autopeças",
    CAR_DEALERSHIP: "Revenda / Garagem",
    PARKING_LOT: "Estacionamento",
    FULL_AUTO_CENTER: "Completo / Multioperação",
    OTHER: "Outro",
  };

  return labels[value] || "Completo / Multioperação";
}

export async function GET() {
  try {
    const session = await requireCurrentSession();

    return NextResponse.json({
      success: true,
      company: {
        id: session.company.id,
        name: session.company.name,
        tradeName: session.company.tradeName,
        cnpj: session.company.cnpj,
        email: session.company.email,
        phone: session.company.phone,
        city: session.company.city,
        state: session.company.state,
        businessType: session.company.businessType,
        businessTypeLabel: businessTypeLabel(session.company.businessType),
        subscriptionStatus: session.company.subscriptionStatus,
        accessBlocked: session.company.accessBlocked,
        lockedReason: session.company.lockedReason,
      },
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const isBlocked = message.startsWith("LicenseBlocked:");

    return NextResponse.json(
      {
        success: false,
        message: isBlocked ? message.replace("LicenseBlocked:", "") : "Sessão inválida ou expirada.",
        blocked: isBlocked,
      },
      { status: isBlocked ? 402 : 401 },
    );
  }
}
