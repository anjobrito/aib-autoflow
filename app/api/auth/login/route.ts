import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSession, verifyPassword } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function getSafeLoginErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Environment variable not found")) return "DATABASE_URL não encontrada no ambiente.";
    if (error.message.includes("Can't reach database server")) return "Não foi possível conectar ao banco Supabase.";
    if (error.message.includes("Timed out")) return "O banco demorou demais para responder.";
    if (error.message.includes("PrismaClientInitializationError")) return "Prisma não inicializou corretamente no deploy.";
  }

  return "Erro ao autenticar. Verifique o log do deploy para detalhes técnicos.";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = normalize(formData.get("email")).toLowerCase();
    const password = normalize(formData.get("password"));

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Informe e-mail e senha." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ success: false, message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    if (user.company.subscriptionStatus === "BLOCKED" || user.company.subscriptionStatus === "CANCELED") {
      return NextResponse.json({ success: false, message: "Empresa bloqueada ou assinatura cancelada." }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createUserSession(user.id, user.companyId);

    return NextResponse.json({ success: true, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ success: false, message: getSafeLoginErrorMessage(error) }, { status: 500 });
  }
}
