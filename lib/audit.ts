import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export type AuditActor = {
  companyId?: string | null;
  userId?: string | null;
  platformAdminId?: string | null;
  actorType: "TENANT_USER" | "PLATFORM_ADMIN" | "SYSTEM";
  actorName?: string | null;
};

type AuditEvent = AuditActor & {
  action: string;
  entityType: string;
  entityId?: string | null;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
};

function serialize(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function recordAuditEvent(event: AuditEvent) {
  try {
    await prisma.$executeRaw`
      INSERT INTO "AuditLog" (
        "id", "companyId", "userId", "platformAdminId", "actorType", "actorName",
        "action", "entityType", "entityId", "field", "oldValue", "newValue", "metadata", "createdAt"
      ) VALUES (
        ${randomUUID()}, ${event.companyId ?? null}, ${event.userId ?? null}, ${event.platformAdminId ?? null},
        ${event.actorType}, ${event.actorName ?? null}, ${event.action}, ${event.entityType}, ${event.entityId ?? null},
        ${event.field ?? null}, ${serialize(event.oldValue)}, ${serialize(event.newValue)}, ${serialize(event.metadata)}, CURRENT_TIMESTAMP
      )
    `;
    return true;
  } catch (error) {
    console.error("[AJB-AUDIT] Falha ao registrar evento de auditoria", error);
    return false;
  }
}

export function tenantAuditActor(session: { companyId: string; user: { id: string; name: string } }): AuditActor {
  return {
    companyId: session.companyId,
    userId: session.user.id,
    actorType: "TENANT_USER",
    actorName: session.user.name,
  };
}

export function platformAuditActor(session: { admin: { id: string; name: string } }, companyId?: string | null): AuditActor {
  return {
    companyId: companyId ?? null,
    platformAdminId: session.admin.id,
    actorType: "PLATFORM_ADMIN",
    actorName: session.admin.name,
  };
}
