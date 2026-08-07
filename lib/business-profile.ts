export type CompanyBusinessProfileSource = {
  businessType: string;
};

export type BusinessProfile = {
  kind: "workshop" | "carwash" | "parts" | "general";
  operationLabel: string;
  reminderTitle: string;
  reminderDescription: string;
  primaryService: string;
  secondaryService: string;
  recurrenceLabel: string;
  kanbanWorkColumn: string;
  customerReturnMessage: string;
};

export function getBusinessProfile(company: CompanyBusinessProfileSource): BusinessProfile {
  const type = company.businessType.toLowerCase();

  if (type.includes("lava") || type.includes("lavagem") || type.includes("car_wash")) {
    return {
      kind: "carwash",
      operationLabel: "Lavagens",
      reminderTitle: "Lembretes de lavagem",
      reminderDescription: "Programe retornos para lavagem simples, completa, higienização e estética automotiva.",
      primaryService: "Lavagem completa",
      secondaryService: "Higienização interna",
      recurrenceLabel: "Retorno de lavagem",
      kanbanWorkColumn: "Em lavagem",
      customerReturnMessage: "Está na hora de lavar ou higienizar seu veículo novamente.",
    };
  }

  if (type.includes("estética") || type.includes("estetica") || type.includes("detalhamento") || type.includes("auto_detailing")) {
    return {
      kind: "carwash",
      operationLabel: "Estética",
      reminderTitle: "Lembretes de estética automotiva",
      reminderDescription: "Programe retornos para detalhamento, higienização, polimento e vitrificação.",
      primaryService: "Detalhamento automotivo",
      secondaryService: "Higienização interna",
      recurrenceLabel: "Retorno de estética",
      kanbanWorkColumn: "Em estética",
      customerReturnMessage: "Está na hora de cuidar da estética do seu veículo novamente.",
    };
  }

  if (type.includes("autopeças") || type.includes("autopecas") || type.includes("peças") || type.includes("pecas") || type.includes("auto_parts")) {
    return {
      kind: "parts",
      operationLabel: "Peças",
      reminderTitle: "Lembretes de reposição",
      reminderDescription: "Acompanhe reposição, compra recorrente, estoque mínimo e retorno de clientes de autopeças.",
      primaryService: "Venda de peça",
      secondaryService: "Reposição de estoque",
      recurrenceLabel: "Reposição recorrente",
      kanbanWorkColumn: "Separando peça",
      customerReturnMessage: "Temos peças e itens de manutenção disponíveis para seu veículo.",
    };
  }

  if (type.includes("oficina") || type.includes("mecânica") || type.includes("mecanica") || type.includes("centro") || type.includes("auto_repair") || type.includes("full_auto_center")) {
    return {
      kind: "workshop",
      operationLabel: "Revisões",
      reminderTitle: "Lembretes de revisão",
      reminderDescription: "Programe retornos para troca de óleo, revisão preventiva, freios, filtros e manutenção.",
      primaryService: "Troca de óleo",
      secondaryService: "Revisão preventiva",
      recurrenceLabel: "Retorno de revisão",
      kanbanWorkColumn: "Em manutenção",
      customerReturnMessage: "Está na hora de revisar seu veículo novamente.",
    };
  }

  return {
    kind: "general",
    operationLabel: "Atendimentos",
    reminderTitle: "Lembretes de atendimento",
    reminderDescription: "Programe retornos para serviços recorrentes e relacionamento com o cliente.",
    primaryService: "Serviço principal",
    secondaryService: "Serviço complementar",
    recurrenceLabel: "Retorno do cliente",
    kanbanWorkColumn: "Em atendimento",
    customerReturnMessage: "Está na hora de retornar para um novo atendimento.",
  };
}
