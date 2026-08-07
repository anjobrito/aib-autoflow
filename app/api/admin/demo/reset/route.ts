import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMasterPlatformAdmin, platformAdminErrorResponse } from "@/lib/platform-admin-auth";
import { hashPassword } from "@/lib/saas-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const demoCnpj = "AJB-DEMO-0001";
const demoEmail = "demo@ajbsystems.local";

export async function POST() {
  try {
    await requireMasterPlatformAdmin();

    const demoPassword = process.env.AJB_DEMO_PASSWORD?.trim();
    if (!demoPassword) {
      return NextResponse.json(
        { success: false, message: "Configure AJB_DEMO_PASSWORD antes de criar ou restaurar a empresa Demo." },
        { status: 503 },
      );
    }

    const company = await prisma.company.upsert({
      where: { cnpj: demoCnpj },
      update: {
        name: "AJBSYSTEMS Demonstração",
        tradeName: "AJB AutoFlow Demo",
        businessType: "FULL_AUTO_CENTER",
        email: demoEmail,
        phone: null,
        city: "Campinas",
        state: "SP",
        subscriptionStatus: "ACTIVE",
        accessBlocked: false,
        lockedReason: null,
        isDemo: true,
      },
      create: {
        name: "AJBSYSTEMS Demonstração",
        tradeName: "AJB AutoFlow Demo",
        cnpj: demoCnpj,
        businessType: "FULL_AUTO_CENTER",
        email: demoEmail,
        city: "Campinas",
        state: "SP",
        subscriptionStatus: "ACTIVE",
        isDemo: true,
      },
    });

    const existingDemoUser = await prisma.user.findUnique({ where: { email: demoEmail } });
    if (existingDemoUser && existingDemoUser.companyId !== company.id) {
      return NextResponse.json(
        { success: false, message: "O e-mail reservado para a Demo já pertence a outra empresa. Corrija antes de restaurar a Demo." },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({ where: { companyId: company.id, status: "ACTIVE" }, data: { status: "REVOKED" } });
      await tx.vehicleInspection.deleteMany({ where: { companyId: company.id } });
      await tx.maintenanceReminder.deleteMany({ where: { companyId: company.id } });
      await tx.vehicleFinancing.deleteMany({ where: { companyId: company.id } });
      await tx.financialEntry.deleteMany({ where: { companyId: company.id } });
      await tx.workOrder.deleteMany({ where: { companyId: company.id } });
      await tx.vehicle.deleteMany({ where: { companyId: company.id } });
      await tx.customer.deleteMany({ where: { companyId: company.id } });
      await tx.product.deleteMany({ where: { companyId: company.id } });
      await tx.service.deleteMany({ where: { companyId: company.id } });
      await tx.supplier.deleteMany({ where: { companyId: company.id } });
      await tx.employee.deleteMany({ where: { companyId: company.id } });

      await tx.user.upsert({
        where: { email: demoEmail },
        update: {
          companyId: company.id,
          name: "Usuário Demonstração",
          passwordHash: hashPassword(demoPassword),
          role: "OWNER",
          systemRole: "NONE",
          active: true,
        },
        create: {
          companyId: company.id,
          name: "Usuário Demonstração",
          email: demoEmail,
          passwordHash: hashPassword(demoPassword),
          role: "OWNER",
          active: true,
        },
      });

      await tx.subscription.upsert({
        where: { companyId: company.id },
        update: { plan: "DEMO", status: "ACTIVE", priceCents: 0, expiresAt: null, notes: "Tenant exclusivo para demonstração comercial." },
        create: { companyId: company.id, plan: "DEMO", status: "ACTIVE", priceCents: 0, notes: "Tenant exclusivo para demonstração comercial." },
      });

      const customer = await tx.customer.create({
        data: {
          companyId: company.id,
          name: "Carlos Oliveira — Demo",
          document: "000.000.000-00",
          email: "cliente.demo@example.invalid",
          phone: "(19) 90000-0000",
          city: "Campinas",
          state: "SP",
        },
      });

      const vehicle = await tx.vehicle.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          plate: "DEMO001",
          brand: "Volkswagen",
          model: "Polo Demo",
          year: 2024,
          color: "Prata",
          mileage: 24500,
        },
      });

      await tx.product.createMany({
        data: [
          { companyId: company.id, sku: "DEMO-OLEO", name: "Óleo 5W30 — Demo", category: "Lubrificantes", costPrice: 32, salePrice: 49.9, currentStock: 12, minStock: 4 },
          { companyId: company.id, sku: "DEMO-FILTRO", name: "Filtro de óleo — Demo", category: "Filtros", costPrice: 18, salePrice: 32.9, currentStock: 8, minStock: 3 },
        ],
      });

      await tx.service.createMany({
        data: [
          { companyId: company.id, name: "Troca de óleo — Demo", category: "Manutenção", duration: "45 min", price: 120 },
          { companyId: company.id, name: "Lavagem completa — Demo", category: "Lavagem", duration: "60 min", price: 90 },
        ],
      });

      await tx.supplier.create({
        data: { companyId: company.id, name: "Fornecedor Exemplo — Demo", phone: "(19) 90000-0001", city: "Campinas", state: "SP" },
      });

      await tx.employee.create({
        data: { companyId: company.id, name: "João Mecânico — Demo", role: "Mecânico", employmentType: "CLT", serviceCommissionType: "Percentual", serviceCommissionValue: "5" },
      });

      const workOrder = await tx.workOrder.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          vehicleId: vehicle.id,
          code: "OS-DEMO-001",
          status: "IN_PROGRESS",
          description: "Revisão e troca de óleo — registro exclusivo do tenant Demo.",
          totalParts: 82.8,
          totalServices: 120,
          totalAmount: 202.8,
        },
      });

      await tx.vehicleInspection.create({
        data: {
          companyId: company.id,
          workOrderId: workOrder.id,
          plate: vehicle.plate,
          mileage: String(vehicle.mileage || ""),
          fuelLevel: "1/2",
          hasDocuments: true,
          hasSpareTire: true,
          hasJack: true,
          damages: ["Pequeno risco no para-choque traseiro — Demo"],
          notes: "Vistoria criada somente para demonstração comercial.",
        },
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await tx.maintenanceReminder.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          vehicleId: vehicle.id,
          title: "Revisão preventiva — Demo",
          description: "Lembrete fictício pertencente exclusivamente ao tenant Demo.",
          dueDate,
          channel: "WHATSAPP",
        },
      });
    });

    return NextResponse.json({
      success: true,
      companyId: company.id,
      loginEmail: demoEmail,
      message: "Empresa Demo restaurada sem alterar dados de empresas reais.",
    });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
