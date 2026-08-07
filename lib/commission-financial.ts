import type { FinancialEntry } from "@prisma/client";

const referencePrefix = "COMMISSION_V1:";

export type CommissionMetadata = {
  employeeId: string;
  targetType: string;
  targetName: string;
  valueType: string;
  value: string;
  baseAmount: string;
  sourceWorkOrderId?: string;
  sourceWorkOrderCode?: string;
};

export type CommissionView = {
  id: string;
  employeeId: string;
  employeeName: string;
  targetType: string;
  targetName: string;
  valueType: string;
  value: string;
  baseAmount: string;
  calculatedAmount: string;
  status: "Pendente" | "Paga" | "Cancelada";
  referenceDate: string;
  paidAt: string;
  sourceWorkOrderId: string;
  sourceWorkOrderCode: string;
  financialEntryId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export function parseMoney(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".")
    : raw.replace(/[^0-9.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

export function calculateCommission(baseAmount: unknown, valueType: string, value: unknown) {
  const base = parseMoney(baseAmount);
  const rule = parseMoney(value);
  if (base < 0 || rule < 0) return 0;
  return valueType === "Valor fixo" ? rule : base * (rule / 100);
}

export function encodeCommissionReference(metadata: CommissionMetadata) {
  return `${referencePrefix}${Buffer.from(JSON.stringify(metadata), "utf8").toString("base64url")}`;
}

export function decodeCommissionReference(reference?: string | null): CommissionMetadata | null {
  if (!reference?.startsWith(referencePrefix)) return null;
  try {
    const encoded = reference.slice(referencePrefix.length);
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CommissionMetadata;
  } catch {
    return null;
  }
}

export function financialStatusToCommission(status: string): CommissionView["status"] {
  if (status === "Pago") return "Paga";
  if (status === "Cancelado") return "Cancelada";
  return "Pendente";
}

export function commissionStatusToFinancial(status: string) {
  if (status === "Paga") return "Pago";
  if (status === "Cancelada") return "Cancelado";
  return "Pendente";
}

export function financialEntryToCommission(entry: FinancialEntry): CommissionView | null {
  const metadata = decodeCommissionReference(entry.reference);
  if (!metadata) return null;

  return {
    id: entry.id,
    employeeId: metadata.employeeId,
    employeeName: entry.personName || "Funcionário a definir",
    targetType: metadata.targetType,
    targetName: metadata.targetName,
    valueType: metadata.valueType,
    value: metadata.value,
    baseAmount: metadata.baseAmount,
    calculatedAmount: entry.amount.toString(),
    status: financialStatusToCommission(entry.status),
    referenceDate: entry.dueDate.toISOString().slice(0, 10),
    paidAt: entry.settledAt?.toISOString() ?? "",
    sourceWorkOrderId: metadata.sourceWorkOrderId || "",
    sourceWorkOrderCode: metadata.sourceWorkOrderCode || "",
    financialEntryId: entry.id,
    notes: entry.notes || "",
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}
