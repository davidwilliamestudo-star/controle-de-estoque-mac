export interface Protocol {
  id: string;
  name: string;
  categoryId?: string | null;
  administrationRouteId?: string | null;
  description?: string | null;
  internalNotes?: string | null;
  defaultEvolutionTemplateId?: string | null;
  isActive: number;
  basePrice: number;
  categoryName?: string;
  routeName?: string;
}

export interface ProtocolItem {
  id: string;
  protocolId: string;
  inventoryItemId: string;
  itemRole: "medication" | "material" | "equipment" | "other";
  defaultQuantity: number;
  unit: string;
  isRequired: number;
  notes?: string | null;
  itemName?: string;
}

export interface EvolutionTemplate {
  id: string;
  name: string;
  templateText: string;
  appliesToProtocolId?: string | null;
  isDefault: number;
  isActive: number;
}
