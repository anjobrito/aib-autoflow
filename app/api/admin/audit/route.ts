import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { platformAdminErrorResponse, requireSupportPlatformAdmin } from "@/lib/platform-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  companyId: string | null;
  userId: string | null;
  platformAdminId: string | null;
  actorType: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: string | null;
  createdAt: Date;
};

export async function GET(request: Request) {
  try {
    await requireSupportPlatformAdmin();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId")?.trim() || null;
    const entityType = searchParams.get("entityType")?.trim() || null;
    const action = searchParams.get("action")?.trim() || null;
    const limitRaw = Number(searchParams.get("limit") || 200);
    const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 200, 500));

    const rows = await prisma.$queryRaw<AuditRow[]>`
      SELECT
        "id", "companyId", "userId", "platformAdminId", "actorType", "actorName",
        "action", "entityType", "entityId", "field", "oldValue", "newValue", "metadata", "createdAt"
      FROM "AuditLog"
      WHERE (${companyId}::text IS NULL OR "companyId" = ${companyId})
        AND (${entityType}::text IS NULL OR "entityType" = ${entityType})
        AND (${action}::text IS NULL OR "action" = ${action})
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      success: true,
      events: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
