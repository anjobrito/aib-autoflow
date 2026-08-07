import { NextResponse } from "next/server";
import { getCurrentPlatformAdminSession } from "@/lib/platform-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentPlatformAdminSession();

  if (!session) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    admin: {
      id: session.adminId,
      name: session.admin.name,
      email: session.admin.email,
      role: session.admin.role,
    },
  });
}
