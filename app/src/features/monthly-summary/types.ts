/** Classificação de insumos para o Resumo do Mês (linguagem da doutora). */
export type MaterialKind =
  | "syringe_3ml"
  | "syringe_5ml"
  | "syringe_10ml"
  | "syringe_other"
  | "needle"
  | "cotton"
  | "alcohol"
  | "other_material"
  | "medication";

export interface MonthlyMaterialRow {
  itemId: string;
  itemName: string;
  itemType: string;
  categoryName: string | null;
  unit: string;
  kind: MaterialKind;
  totalQty: number;
  totalCost: number;
}

export interface MonthlyProtocolRow {
  protocolId: string | null;
  protocolName: string;
  applicationsCount: number;
  proceduresCount: number;
}

export interface MonthlySyringeBreakdown {
  ml3: number;
  ml5: number;
  ml10: number;
  other: number;
}

export interface MonthlySummary {
  startDate: string;
  endDate: string;
  year: number;
  month: number; // 1-12
  /** Sessões finalizadas no período */
  proceduresCount: number;
  /** Aplicações com protocolo no período */
  protocolApplicationsCount: number;
  syringes: MonthlySyringeBreakdown;
  needlesCount: number;
  cottonCount: number;
  alcoholCount: number;
  otherMaterials: Array<{ name: string; qty: number; unit: string; cost: number }>;
  /** Custo total de insumos (medicamentos + materiais) */
  totalCost: number;
  medicationCost: number;
  materialCost: number;
  materials: MonthlyMaterialRow[];
  byProtocol: MonthlyProtocolRow[];
}

export interface PatientMonthlyCostLine {
  kind: MaterialKind | "protocol_group";
  label: string;
  qty: number;
  unit: string;
  cost: number;
}

export interface PatientMonthlyCost {
  patientId: string;
  patientName: string;
  startDate: string;
  endDate: string;
  year: number;
  month: number;
  proceduresCount: number;
  protocolApplicationsCount: number;
  protocolNames: string[];
  medicationCost: number;
  syringesCost: number;
  needlesCost: number;
  otherMaterialsCost: number;
  totalCost: number;
  lines: PatientMonthlyCostLine[];
  details: MonthlyMaterialRow[];
}

/** Flags de setup do protocolo (seringa/agulha). */
export interface ProtocolSetupFlags {
  hasSyringe: boolean;
  hasNeedle: boolean;
  materialCount: number;
  medicationCount: number;
}
