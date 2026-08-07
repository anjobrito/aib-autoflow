import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentSession } from "@/lib/saas-auth";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseMoneyToNumber(value: string) {
  const cleaned = value.replace("R$", "").replaceAll(" ", "").replaceAll(".", "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseQuantity(value: string) {
  const cleaned = value.replaceAll(".", "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatProduct(product: { id: string; name: string; category: string | null; supplierName: string | null; costPrice: unknown; salePrice: unknown; currentStock: unknown; minStock: unknown; active: boolean }) {
  return {
    id: product.id,
    name: product.name,
    category: product.category || "Sem categoria",
    supplier: product.supplierName || "Sem fornecedor",
    stock: Number(product.currentStock || 0),
    minStock: Number(product.minStock || 0),
    costPrice: Number(product.costPrice || 0),
    price: Number(product.salePrice || 0),
    status: product.active ? "Ativo" : "Inativo",
  };
}

export async function GET(request: Request) {
  const session = await requireCurrentSession();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const products = await prisma.product.findMany({
    where: {
      companyId: session.companyId,
      active: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { supplierName: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, products: products.map(formatProduct) });
}

export async function POST(request: Request) {
  const session = await requireCurrentSession();
  const formData = await request.formData();

  const id = normalize(formData.get("id"));
  const name = normalize(formData.get("name"));
  const category = normalize(formData.get("category"));
  const supplier = normalize(formData.get("supplier"));
  const stock = parseQuantity(normalize(formData.get("stock")));
  const minStock = parseQuantity(normalize(formData.get("minStock")));
  const costPrice = parseMoneyToNumber(normalize(formData.get("costPrice")));
  const price = parseMoneyToNumber(normalize(formData.get("price")));

  if (!name) {
    return NextResponse.json({ success: false, message: "Nome do produto é obrigatório." }, { status: 400 });
  }

  if (id) {
    const existing = await prisma.product.findFirst({
      where: { id, companyId: session.companyId, active: true },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Produto não encontrado para esta empresa." }, { status: 404 });
    }
  }

  const product = id
    ? await prisma.product.update({
        where: { id },
        data: { name, category, supplierName: supplier, currentStock: stock, minStock, costPrice, salePrice: price },
      })
    : await prisma.product.create({
        data: { companyId: session.companyId, name, category, supplierName: supplier, currentStock: stock, minStock, costPrice, salePrice: price },
      });

  return NextResponse.json({ success: true, product: formatProduct(product) });
}
