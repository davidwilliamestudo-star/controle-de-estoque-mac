export type ApplicationPlanStatus = 'planned' | 'scheduled' | 'in_progress' | 'finalized' | 'cancelled';

export interface PatientApplicationPlan {
  id: string;
  clinicId: string;
  patientId: string;
  protocolId: string;
  routeId: string;
  appointmentId?: string | null;
  scheduledAt?: string | null;
  status: ApplicationPlanStatus;
  notes?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  
  // Joins opicionais para UI
  protocolName?: string;
  routeName?: string;
  patientName?: string;
}

export interface CreatePatientApplicationPlanInput {
  patientId: string;
  protocolId: string;
  routeId: string;
  scheduledAt?: string | null; // Se existir, gera um agendamento
  notes?: string | null;
  status?: ApplicationPlanStatus; // Padrão: 'planned' ou 'scheduled' dependendo de scheduledAt
}

export interface UpdatePatientApplicationPlanInput {
  id: string;
  protocolId?: string;
  routeId?: string;
  scheduledAt?: string | null; // Se alterado, deve atualizar ou cancelar o agendamento
  notes?: string | null;
  status?: ApplicationPlanStatus;
}
