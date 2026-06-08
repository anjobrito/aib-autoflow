export const finalizedStatusLabels = [
  "Entregue",
  "Finalizado",
  "Finalizada",
  "Cancelado",
  "Cancelada",
  "Faturado",
  "Faturada",
  "Concluído",
  "Concluida",
  "Concluída",
];

export const finalizedPrismaStatuses = ["DELIVERED", "CANCELED"] as const;
export const activePrismaStatuses = ["OPEN", "QUOTE", "APPROVED", "IN_PROGRESS", "WAITING_PARTS", "PAINTING", "FINISHING", "READY_FOR_PICKUP"] as const;

function normalizeStatus(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function isFinalizedWorkOrderStatus(status: string) {
  const normalized = normalizeStatus(status);
  return finalizedStatusLabels.some((label) => normalized === normalizeStatus(label));
}

export function isFinalizedPrismaStatus(status: string) {
  return finalizedPrismaStatuses.includes(status as typeof finalizedPrismaStatuses[number]);
}

export function isActivePrismaStatus(status: string) {
  return activePrismaStatuses.includes(status as typeof activePrismaStatuses[number]);
}
