import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);

  try {
    const userCount = await prisma.user.count();
    const companyCount = await prisma.company.count();

    return NextResponse.json({
      success: true,
      database: "ok",
      auth: "ok",
      env: {
        DATABASE_URL: hasDatabaseUrl ? "configured" : "missing",
        AUTH_SECRET: hasAuthSecret ? "configured" : "missing",
      },
      checks: {
        users: userCount,
        companies: companyCount,
      },
    });
  } catch (error) {
    console.error("Auth health check failed", error);

    return NextResponse.json({
      success: false,
      database: "error",
      auth: "error",
      env: {
        DATABASE_URL: hasDatabaseUrl ? "configured" : "missing",
        AUTH_SECRET: hasAuthSecret ? "configured" : "missing",
      },
      message: error instanceof Error ? error.message : "Unknown auth health error",
    }, { status: 500 });
  }
}
