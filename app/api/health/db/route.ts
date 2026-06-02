import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, database: "ok" });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json({ success: false, database: "error" }, { status: 500 });
  }
}
