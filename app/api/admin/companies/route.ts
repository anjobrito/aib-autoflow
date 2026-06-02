import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminErrorResponse, requireSupportAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    await requireSupportAdmin();

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            systemRole: true,
            active: true,
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            customers: true,
            vehicles: true,
            workOrders: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, companies });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
