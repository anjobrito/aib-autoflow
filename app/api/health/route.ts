import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coreEnvironmentReady() {
  const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim());
  return hasDatabase && hasAuthSecret;
}

export async function GET() {
  const environment = coreEnvironmentReady();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        ok: environment,
        service: "ajb-autoflow",
        database: "up",
        environment: environment ? "ready" : "incomplete",
      },
      { status: environment ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "ajb-autoflow",
        database: "down",
        environment: environment ? "ready" : "incomplete",
      },
      { status: 503 },
    );
  }
}
