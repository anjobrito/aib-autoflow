import { BusinessType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const businessTypeLabels: Record<BusinessType, string> = {
  AUTO_REPAIR: "Oficina mecânica",
  CAR_WASH: "Lava-jato",
  AUTO_DETAILING: "Estética automotiva",
  AUTO_PARTS: "Autopeças",
  CAR_DEALERSHIP: "Revendedora / Garagem",
  PARKING_LOT: "Estacionamento",
  FULL_AUTO_CENTER: "Completo / Multioperação",
  OTHER: "Outro",
};

const labelToBusinessType: Record<string, BusinessType> = {
  "Oficina mecânica": "AUTO_REPAIR",
  "Lava-jato": "CAR_WASH",
  "Estética automotiva": "AUTO_DETAILING",
  "Autopeças": "AUTO_PARTS",
  "Revendedora / Garagem": "CAR_DEALERSHIP",
  "Revenda / Garagem": "CAR_DEALERSHIP",
  "Estacionamento": "PARKING_LOT",
  "Centro automotivo": "FULL_AUTO_CENTER",
  "Completo / Multioperação": "FULL_AUTO_CENTER",
  "Outro": "OTHER",
};

function businessTypeLabel(value: BusinessType) {
  return businessTypeLabels[value] || "Completo / Multioperação";
}

function serializeCompany(company: {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  businessType: BusinessType;
  subscriptionStatus: string;
  accessBlocked: boolean;
  lockedReason: string | null;
}) {
  return {
    ...company,
    businessTypeLabel: businessTypeLabel(company.businessType),
  };
}

function errorResponse(error: unknown) {
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

export async function GET() {
  try {
    const session = await requireCurrentSession();

    return NextResponse.json({
      success: true,
      company: serializeCompany(session.company),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireCurrentSession();
    const body = await request.json();

    const name = String(body.name || body.legalName || "").trim();
    const tradeName = String(body.tradeName || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim().toUpperCase();
    const requestedBusinessType = String(body.businessType || body.businessTypeLabel || "").trim();
    const businessType = labelToBusinessType[requestedBusinessType] ||
      (Object.values(BusinessType).includes(requestedBusinessType as BusinessType) ? requestedBusinessType as BusinessType : session.company.businessType);

    if (!name || !email) {
      return NextResponse.json({ success: false, message: "Razão social e e-mail são obrigatórios." }, { status: 400 });
    }

    const company = await prisma.company.update({
      where: { id: session.companyId },
      data: {
        name,
        tradeName: tradeName || null,
        email,
        phone: phone || null,
        city: city || null,
        state: state || null,
        businessType,
      },
    });

    return NextResponse.json({ success: true, company: serializeCompany(company) });
  } catch (error) {
    return errorResponse(error);
  }
}
