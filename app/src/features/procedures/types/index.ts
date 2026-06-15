export interface Procedure {
  id: string;
  patientId: string;
  protocolId?: string | null;
  appointmentId?: string | null;
  applicationPlanId?: string | null;
  bodyAreaId?: string | null;
  performedAt: string;
  status: "draft" | "ready_to_finalize" | "finalized" | "cancelled";
  hadIntercurrence: number;
  intercurrenceDescription?: string | null;
  notes?: string | null;
  evolutionText?: string | null;
  responsibleUserId?: string | null;
  finalizedAt?: string | null;
  
  patientName?: string;
  protocolName?: string | null;
  bodyAreaName?: string | null;
  bodyAreaTechnicalName?: string | null;

  isCorrected?: number;
  correctedAt?: string | null;
  correctionReason?: string | null;
}

export interface ProcedureItemUsed {
  id: string;
  procedureId: string;
  inventoryItemId: string;
  inventoryBatchId?: string | null;
  itemType: string;
  quantityUsed: number;
  unit: string;
  batchNumberSnapshot?: string | null;
  expirationDateSnapshot?: string | null;
  notes?: string | null;
  
  isCorrected?: number;
  correctedAt?: string | null;
  correctionGroupId?: string | null;
  
  itemName?: string;
}
