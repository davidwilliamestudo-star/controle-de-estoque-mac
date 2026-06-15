import { appointmentsRepository } from "../repositories/appointments.repository";
import { auditRepository } from "@/features/audit/repositories/audit.repository";
import type { AppointmentFormData, Appointment } from "../schemas/appointment.schema";
import { integrationOrchestratorService } from "@/features/integrations/apps-script/services/IntegrationOrchestrator.service";
import { patientApplicationsRepository } from "@/features/patients/repositories/patientApplications.repository";
import { dbSelect, dbTransaction } from "@/lib/db/sqlite";

const VALID_STATUSES = new Set(["scheduled", "confirmed", "done", "missed", "canceled"]);

function normalizeDateTime(value: string | undefined | null): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error("Informe a data e hora do agendamento.");
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data e hora do agendamento invalidas.");
  }

  return trimmed;
}

function normalizeDuration(value: number | undefined | null): number {
  const duration = Number(value ?? 30);
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    throw new Error("Duracao do agendamento deve ficar entre 5 e 480 minutos.");
  }
  return duration;
}

async function assertPatientExists(patientId: string): Promise<void> {
  const rows = await dbSelect<{ id: string }>(
    "SELECT id FROM patients WHERE id = ? AND deleted_at IS NULL AND is_active = 1 LIMIT 1",
    [patientId]
  );
  if (!rows[0]) {
    throw new Error("Paciente nao encontrado ou inativo.");
  }
}

async function resolveProtocolRoute(protocolId: string, routeId?: string | null): Promise<string> {
  const rows = await dbSelect<{ id: string; administration_route_id: string | null }>(
    `
      SELECT id, administration_route_id
      FROM protocols
      WHERE id = ? AND deleted_at IS NULL AND is_active = 1
      LIMIT 1
    `,
    [protocolId]
  );
  const protocol = rows[0];
  if (!protocol) {
    throw new Error("Protocolo nao encontrado ou inativo.");
  }

  const resolvedRouteId = routeId?.trim() || protocol.administration_route_id;
  if (!resolvedRouteId) {
    throw new Error("O protocolo selecionado nao possui via de aplicacao configurada.");
  }

  const routeRows = await dbSelect<{ id: string }>(
    "SELECT id FROM administration_routes WHERE id = ? AND deleted_at IS NULL AND is_active = 1 LIMIT 1",
    [resolvedRouteId]
  );
  if (!routeRows[0]) {
    throw new Error("Via de aplicacao nao encontrada ou inativa.");
  }

  return resolvedRouteId;
}

async function validateApplicationPlan(planId: string, patientId: string, currentAppointmentId?: string): Promise<void> {
  const plan = await patientApplicationsRepository.getById(planId);
  if (!plan) {
    throw new Error("Aplicacao planejada nao encontrada.");
  }
  if (plan.patientId !== patientId) {
    throw new Error("A aplicacao planejada selecionada pertence a outro paciente.");
  }
  if (plan.status === "cancelled" || plan.status === "finalized") {
    throw new Error("Nao e possivel agendar uma aplicacao cancelada ou finalizada.");
  }
  if (plan.appointmentId && plan.appointmentId !== currentAppointmentId) {
    throw new Error("Esta aplicacao planejada ja possui outro agendamento vinculado.");
  }
}

async function normalizeCreateData(data: AppointmentFormData): Promise<AppointmentFormData> {
  if (!data.patient_id) {
    throw new Error("Selecione um paciente.");
  }
  if (!VALID_STATUSES.has(data.status ?? "scheduled")) {
    throw new Error("Status de agendamento invalido.");
  }

  await assertPatientExists(data.patient_id);

  const normalized: AppointmentFormData = {
    ...data,
    appointment_date: normalizeDateTime(data.appointment_date),
    duration_minutes: normalizeDuration(data.duration_minutes),
    status: data.status ?? "scheduled",
    notes: data.notes?.trim() || "",
  };

  if (normalized.type !== "application") {
    return {
      ...normalized,
      application_plan_id: "",
      new_plan_protocol_id: "",
      new_plan_route_id: "",
    };
  }

  if (normalized.application_plan_id) {
    await validateApplicationPlan(normalized.application_plan_id, normalized.patient_id);
    return normalized;
  }

  if (!normalized.new_plan_protocol_id) {
    throw new Error("Selecione um protocolo para a aplicacao.");
  }

  const routeId = await resolveProtocolRoute(normalized.new_plan_protocol_id, normalized.new_plan_route_id);
  return {
    ...normalized,
    new_plan_route_id: routeId,
    application_plan_id: "",
  };
}

export const appointmentsService = {
  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return appointmentsRepository.findByDate(date);
  },

  async createAppointment(data: AppointmentFormData): Promise<string> {
    const existingDate = await appointmentsRepository.findByDate(data.appointment_date);
    const hasConflict = existingDate.some(a => a.patient_id === data.patient_id && a.status !== "canceled");
    
    if (hasConflict) {
      throw new Error("Paciente já possui um agendamento ativo neste horário.");
    }

    const normalized = await normalizeCreateData(data);
    const id = crypto.randomUUID();

    let planId = normalized.application_plan_id;

    await dbTransaction(async () => {
      if (normalized.type === "application" && !planId && normalized.new_plan_protocol_id && normalized.new_plan_route_id) {
        const plan = await patientApplicationsRepository.create({
          patientId: normalized.patient_id,
          protocolId: normalized.new_plan_protocol_id,
          routeId: normalized.new_plan_route_id,
          scheduledAt: normalized.appointment_date,
          status: "scheduled",
        });
        planId = plan.id;
      }

      await appointmentsRepository.create(id, {
        ...normalized,
        application_plan_id: planId,
      });

      if (normalized.type === "application" && planId) {
        await patientApplicationsRepository.update(planId, {
          id: planId,
          appointmentId: id,
          scheduledAt: normalized.appointment_date,
          status: "scheduled",
        });
      }

      await auditRepository.log({
        action: "appointment_created",
        entity_type: "appointment",
        entity_id: id,
        description: `Agendamento criado para ${normalized.appointment_date}`,
        after_data: { ...normalized, id, application_plan_id: planId },
      });
    });

    integrationOrchestratorService.handleAppointmentCreated(id, {
      ...normalized,
      application_plan_id: planId,
    }).catch(console.error);

    return id;
  },

  async updateAppointment(id: string, data: Partial<AppointmentFormData>): Promise<void> {
    const existing = await appointmentsRepository.findById(id);
    if (!existing) {
      throw new Error("Agendamento nao encontrado.");
    }

    if (data.appointment_date && data.appointment_date !== existing?.appointment_date) {
      const existingDate = await appointmentsRepository.findByDate(data.appointment_date);
      const hasConflict = existingDate.some(a => a.id !== id && a.patient_id === existing?.patient_id && a.status !== "canceled");
      
      if (hasConflict) {
        throw new Error("Paciente já possui um agendamento ativo neste horário.");
      }
    }

    if (data.patient_id) {
      await assertPatientExists(data.patient_id);
    }
    if (data.appointment_date !== undefined) {
      data.appointment_date = normalizeDateTime(data.appointment_date);
    }
    if (data.duration_minutes !== undefined) {
      data.duration_minutes = normalizeDuration(data.duration_minutes);
    }
    if (data.status && !VALID_STATUSES.has(data.status)) {
      throw new Error("Status de agendamento invalido.");
    }

    const patientId = data.patient_id ?? existing.patient_id;
    const planId = data.application_plan_id ?? existing?.application_plan_id;
    if ((data.type ?? existing.type) === "application") {
      if (!planId) {
        throw new Error("Agendamento de aplicacao precisa estar vinculado a uma aplicacao planejada.");
      }
      await validateApplicationPlan(planId, patientId, id);
    }

    await dbTransaction(async () => {
      if (planId) {
        await patientApplicationsRepository.update(planId, {
          id: planId,
          appointmentId: id,
          scheduledAt: data.appointment_date ?? existing?.appointment_date ?? null,
          status: data.status === "canceled" ? "cancelled" : data.status === "done" ? "finalized" : undefined,
        });
      }

      await appointmentsRepository.update(id, data);

      await auditRepository.log({
        action: "appointment_updated",
        entity_type: "appointment",
        entity_id: id,
        description: `Agendamento atualizado para ${data.appointment_date ?? "mesma data"}`,
        after_data: data,
      });
    });

    integrationOrchestratorService.handleAppointmentUpdated(id, data).catch(console.error);
  },

  async deleteAppointment(id: string): Promise<void> {
    const existing = await appointmentsRepository.findById(id);
    if (!existing) {
      throw new Error("Agendamento nao encontrado.");
    }
    
    await dbTransaction(async () => {
      await appointmentsRepository.delete(id);

      if (existing?.application_plan_id) {
        await patientApplicationsRepository.update(existing.application_plan_id, {
          id: existing.application_plan_id,
          appointmentId: null,
          scheduledAt: null,
          status: "cancelled",
        });
      }

      await auditRepository.log({
        action: "appointment_deleted",
        entity_type: "appointment",
        entity_id: id,
        description: "Agendamento cancelado/excluido",
      });
    });

    integrationOrchestratorService.handleAppointmentDeleted(id).catch(console.error);
  },
};
