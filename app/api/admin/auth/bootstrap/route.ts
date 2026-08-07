import { NextResponse } from "next/server";
import { ensureMasterPlatformAdmin } from "@/lib/platform-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const providedSecret = request.headers.get("x-admin-bootstrap-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ success: false, message: "Bootstrap administrativo não autorizado." }, { status: 401 });
  }

  const formData = await request.formData();
  const adminPassword = normalize(formData.get("adminPassword"));

  if (adminPassword.length < 8) {
    return NextResponse.json({ success: false, message: "Informe uma senha administrativa com pelo menos 8 caracteres." }, { status: 400 });
  }

  await ensureMasterPlatformAdmin(adminPassword);

  return NextResponse.json({ success: true, message: "MASTER AJBSYSTEMS criado ou atualizado." });
}
