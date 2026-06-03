import { NextResponse } from "next/server";
import { BusinessType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createUserSession, hashPassword } from "@/lib/saas-auth";

const masterEmail = "anjobrito@gmail.com";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function mapBusinessType(value: string): BusinessType {
  const normalized = value.toLowerCase();

  if (normalized.includes("lava")) return "CAR_WASH";
  if (normalized.includes("estética") || normalized.includes("estetica")) return "AUTO_DETAILING";
  if (normalized.includes("autope")) return "AUTO_PARTS";
  if (normalized.includes("revenda") || normalized.includes("garagem")) return "CAR_DEALERSHIP";
  if (normalized.includes("estacionamento")) return "PARKING_LOT";
  if (normalized.includes("centro") || normalized.includes("completo")) return "FULL_AUTO_CENTER";
  if (normalized.includes("oficina") || normalized.includes("funilaria")) return "AUTO_REPAIR";

  return "AUTO_REPAIR";
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Environment variable not found")) return "DATABASE_URL não encontrada no ambiente.";
    if (error.message.includes("Can't reach database server")) return "Não foi possível conectar ao banco Supabase.";
    if (error.message.includes("Timed out")) return "O banco demorou demais para responder.";
    if (error.message.includes("P2002")) return "Já existe um registro com estes dados únicos.";
  }

  return "Erro ao criar empresa. Verifique o terminal do Next.js para detalhes técnicos.";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const companyName = normalize(formData.get("companyName"));
    const tradeName = normalize(formData.get("tradeName"));
    const cnpj = normalize(formData.get("cnpj"));
    const businessType = normalize(formData.get("businessType"));
    const phone = normalize(formData.get("phone"));
    const city = normalize(formData.get("city"));
    const state = normalize(formData.get("state"));
    const ownerName = normalize(formData.get("ownerName"));
    const email = normalize(formData.get("email")).toLowerCase();
    const password = normalize(formData.get("password"));

    if (!companyName || !tradeName || !cnpj || !ownerName || !email || password.length < 6) {
      return NextResponse.json({ success: false, message: "Preencha empresa, CNPJ, responsável, e-mail e senha com pelo menos 6 caracteres." }, { status: 400 });
    }

    const existingCompany = await prisma.company.findUnique({ where: { cnpj } });
    if (existingCompany) {
      return NextResponse.json({ success: false, message: "Já existe uma empresa cadastrada com este CNPJ." }, { status: 409 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, message: "Já existe um usuário cadastrado com este e-mail." }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          tradeName,
          cnpj,
          businessType: mapBusinessType(businessType),
          email,
          phone,
          city,
          state,
          subscriptionStatus: email === masterEmail ? "ACTIVE" : "TRIAL",
          subscription: {
            create: {
              plan: email === masterEmail ? "ENTERPRISE" : "BASIC",
              status: email === masterEmail ? "ACTIVE" : "TRIAL",
              priceCents: email === masterEmail ? 0 : 9700,
              trialEndsAt: email === masterEmail ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              expiresAt: email === masterEmail ? new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000) : null,
              lastPaidAt: email === masterEmail ? new Date() : null,
              notes: email === masterEmail ? "Master AJBSYSTEMS account" : "Trial created from public registration",
            },
          },
        },
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: ownerName,
          email,
          passwordHash: hashPassword(password),
          role: "OWNER",
          systemRole: email === masterEmail ? "MASTER" : "NONE",
        },
      });

      return { company, user };
    });

    await createUserSession(result.user.id, result.company.id);

    return NextResponse.json({ success: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ success: false, message: getSafeErrorMessage(error) }, { status: 500 });
  }
}
