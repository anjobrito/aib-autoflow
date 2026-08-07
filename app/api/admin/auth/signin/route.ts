import { NextResponse } from "next/server";
import { authenticatePlatformAdmin } from "@/lib/platform-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = normalize(formData.get("email")).toLowerCase();
    const adminPassword = normalize(formData.get("adminPassword"));

    if (!email || !adminPassword) {
      return NextResponse.json({ success: false, message: "Informe e-mail e senha administrativa." }, { status: 400 });
    }

    const admin = await authenticatePlatformAdmin(email, adminPassword);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Credenciais administrativas inválidas." }, { status: 401 });
    }

    return NextResponse.json({ success: true, redirectTo: "/admin", admin: { name: admin.name, email: admin.email, role: admin.role } });
  } catch (error) {
    console.error("Platform admin signin failed", error);
    return NextResponse.json({ success: false, message: "Erro ao autenticar admin AJBSYSTEMS." }, { status: 500 });
  }
}
