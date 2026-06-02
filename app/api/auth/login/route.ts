import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSession, verifyPassword } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
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
}
