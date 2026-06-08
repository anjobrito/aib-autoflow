export type FinancingStatus = "EM_ANALISE" | "APROVADO" | "CONTRATO_EMITIDO" | "GRAVAME_PENDENTE" | "GRAVAME_REGISTRADO" | "PAGO" | "CANCELADO" | "RECUSADO";
export type LienStatus = "NAO_INICIADO" | "PENDENTE" | "REGISTRADO" | "BAIXA_SOLICITADA" | "BAIXADO" | "COM_ERRO";
export type ExternalCheckStatus = "NAO_CONSULTADO" | "CONSULTADO" | "ERRO";

export type StoredVehicleFinancing = {
  id: string;
  customerId?: string;
  vehicleId?: string;
  sellerId?: string;
  companyId?: string;
  branchId?: string;
  sellerName: string;
  date: string;
  financedBank: string;
  customerDocument: string;
  customerName: string;
  customerPhone: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleChassis: string;
  vehicleYear: string;
  contractNumber: string;
  requestedAmount: string;
  downPaymentAmount: string;
  principalAmount?: string;
  financedAmount: string;
  taxAmount?: string;
  installmentAmount?: string;
  returnPercentage: string;
  returnAmount: string;
  ilaDiscountPercentage: string;
  ilaDiscountAmount: string;
  netReturnAmount: string;
  prestamistaInsuranceAmount: string;
  branchName: string;
  financingStatus: FinancingStatus;
  lienStatus: LienStatus;
  externalCheckStatus?: ExternalCheckStatus;
  externalCheckDate?: string;
  externalCheckProvider?: string;
  externalCheckProtocol?: string;
  externalCheckResult?: string;
  hasCustomerDocument?: boolean;
  hasVehicleDocument?: boolean;
  hasSignedContract?: boolean;
  hasDownPaymentReceipt?: boolean;
  hasLienRegistration?: boolean;
  hasPrestamistaInsurance?: boolean;
  returnReceived: boolean;
  returnReceivedDate?: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
};

export type VehicleFinancingDraft = Omit<StoredVehicleFinancing, "id" | "createdAt" | "updatedAt">;

export const financingStatusOptions: { value: FinancingStatus; label: string }[] = [
  { value: "EM_ANALISE", label: "Em analise" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "CONTRATO_EMITIDO", label: "Contrato emitido" },
  { value: "GRAVAME_PENDENTE", label: "Gravame pendente" },
  { value: "GRAVAME_REGISTRADO", label: "Gravame registrado" },
  { value: "PAGO", label: "Pago" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "RECUSADO", label: "Recusado" },
];

export const lienStatusOptions: { value: LienStatus; label: string }[] = [
  { value: "NAO_INICIADO", label: "Nao iniciado" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "REGISTRADO", label: "Registrado" },
  { value: "BAIXA_SOLICITADA", label: "Baixa solicitada" },
  { value: "BAIXADO", label: "Baixado" },
  { value: "COM_ERRO", label: "Com erro" },
];

export const externalCheckStatusOptions: { value: ExternalCheckStatus; label: string }[] = [
  { value: "NAO_CONSULTADO", label: "Nao consultado" },
  { value: "CONSULTADO", label: "Consultado" },
  { value: "ERRO", label: "Erro na consulta" },
];

const storageKey = "ajb-autoflow-vehicle-financings";

function readRecords(): StoredVehicleFinancing[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredVehicleFinancing[];
  } catch {
    return [];
  }
}

function writeRecords(records: StoredVehicleFinancing[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(records));
}

function currencyToNumber(value?: string) {
  if (!value) return 0;
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberToCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function percentageToNumber(value?: string) {
  if (!value) return 0;
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatPercentage(value: string | undefined) {
  const parsed = percentageToNumber(value);
  if (!parsed) return "0%";
  return `${String(parsed).replace(".", ",")}%`;
}

export function calculateIlaDiscountAmount(returnAmount: string, ilaDiscountPercentage: string) {
  const grossReturn = Math.max(0, currencyToNumber(returnAmount));
  const ilaPercentage = percentageToNumber(ilaDiscountPercentage);
  return grossReturn * (ilaPercentage / 100);
}

export function calculateNetReturnAmount(returnAmount: string, ilaDiscountPercentage: string) {
  const grossReturn = Math.max(0, currencyToNumber(returnAmount));
  const ilaDiscount = calculateIlaDiscountAmount(returnAmount, ilaDiscountPercentage);
  return Math.max(0, grossReturn - ilaDiscount);
}

export function normalizeVehicleFinancingDraft(financing: VehicleFinancingDraft): VehicleFinancingDraft {
  const ilaDiscountPercentage = formatPercentage(financing.ilaDiscountPercentage || "0%");
  const ilaDiscountAmount = numberToCurrency(calculateIlaDiscountAmount(financing.returnAmount, ilaDiscountPercentage));
  const netReturnAmount = numberToCurrency(calculateNetReturnAmount(financing.returnAmount, ilaDiscountPercentage));

  return {
    ...financing,
    ilaDiscountPercentage,
    ilaDiscountAmount,
    netReturnAmount,
  };
}

export function createEmptyVehicleFinancingDraft(): VehicleFinancingDraft {
  return {
    sellerName: "",
    date: new Date().toISOString().slice(0, 10),
    financedBank: "",
    customerDocument: "",
    customerName: "",
    customerPhone: "",
    vehicleBrand: "",
    vehicleModel: "",
    vehiclePlate: "",
    vehicleChassis: "",
    vehicleYear: "",
    contractNumber: "",
    requestedAmount: "R$ 0,00",
    downPaymentAmount: "R$ 0,00",
    principalAmount: "R$ 0,00",
    financedAmount: "R$ 0,00",
    taxAmount: "R$ 0,00",
    installmentAmount: "R$ 0,00",
    returnPercentage: "0%",
    returnAmount: "R$ 0,00",
    ilaDiscountPercentage: "0%",
    ilaDiscountAmount: "R$ 0,00",
    netReturnAmount: "R$ 0,00",
    prestamistaInsuranceAmount: "R$ 0,00",
    branchName: "Matriz",
    financingStatus: "EM_ANALISE",
    lienStatus: "NAO_INICIADO",
    externalCheckStatus: "NAO_CONSULTADO",
    externalCheckDate: "",
    externalCheckProvider: "",
    externalCheckProtocol: "",
    externalCheckResult: "",
    hasCustomerDocument: false,
    hasVehicleDocument: false,
    hasSignedContract: false,
    hasDownPaymentReceipt: false,
    hasLienRegistration: false,
    hasPrestamistaInsurance: false,
    returnReceived: false,
    returnReceivedDate: "",
    notes: "",
  };
}

export function listVehicleFinancings() {
  return readRecords();
}

export function saveVehicleFinancing(financing: VehicleFinancingDraft) {
  const timestamp = new Date().toISOString();
  const normalized = normalizeVehicleFinancingDraft(financing);
  const record: StoredVehicleFinancing = { ...normalized, id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp };
  writeRecords([record, ...readRecords()]);
  return record;
}

export function updateVehicleFinancing(id: string, financing: VehicleFinancingDraft) {
  const normalized = normalizeVehicleFinancingDraft(financing);
  const updated = readRecords().map((item) => item.id === id ? { ...item, ...normalized, updatedAt: new Date().toISOString() } : item);
  writeRecords(updated);
  return updated.find((item) => item.id === id);
}

export function deleteVehicleFinancing(id: string) {
  const updated = readRecords().filter((item) => item.id !== id);
  writeRecords(updated);
  return updated;
}

export function getFinancingStatusLabel(status: string) {
  return financingStatusOptions.find((item) => item.value === status)?.label ?? status;
}

export function getLienStatusLabel(status: string) {
  return lienStatusOptions.find((item) => item.value === status)?.label ?? status;
}

export function getExternalCheckStatusLabel(status: string) {
  return externalCheckStatusOptions.find((item) => item.value === status)?.label ?? status;
}
