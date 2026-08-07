import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/saas-auth";

export async function POST() {
  await destroyCurrentSession();
  return NextResponse.json({ success: true, redirectTo: "/" });
}
