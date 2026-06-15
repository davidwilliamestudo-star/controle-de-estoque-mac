import { patientApplicationsRepository } from "../repositories/patientApplications.repository";
import { appointmentsService } from "@/features/agenda/services/appointments.service";
import { auditRepository } from "@/features/audit/repositories/audit.repository";
import {
  CreatePatientApplicationPlanInput,
  PatientApplicationPlan,
  UpdatePatientApplicationPlanInput,
} from "../types";

export const patientApplicationsService = {
  async getByPatientId(patientId: string): Promise<PatientApplicationPlan[]> {
    return patientApplicationsRepository.getByPatientId(patientId);
  },

  async getById(id: string): Promise<PatientApplicationPlan | null> {
    return patientApplicationsRepository.getById(id);
  },

  async createPlan(input: CreatePatientApplicationPlanInput): Promise<PatientApplicationPlan> {
    let plan = await patientApplicationsRepository.create(input);

    if (input.scheduledAt) {
      const appointmentId = await appointmentsService.createAppointment({
        patient_id: input.patientId,
        application_plan_id: plan.id,
        type: "application",
        appointment_date: input.scheduledAt,
        duration_minutes: 30,
        notes: input.notes,
      } as any);

      plan = await patientApplicationsRepository.update(plan.id, {
        id: plan.id,
        appointmentId,
        scheduledAt: input.scheduledAt,
        status: "scheduled",
      });
    }

    await auditRepository.log({
      action: "patient_application_plan_created",
      entity_type: "patient_application_plan",
      entity_id: plan.id,
      description: `Plano de aplicacao criado para o protocolo ${input.protocolId} com status ${plan.status}`,
      after_data: plan as any,
    });

    return plan;
  },

  async savePlan(input: CreatePatientApplicationPlanInput): Promise<PatientApplicationPlan> {
    return this.createPlan(input);
  },

  async updatePlan(id: string, input: UpdatePatientApplicationPlanInput): Promise<PatientApplicationPlan> {
    const existingPlan = await patientApplicationsRepository.getById(id);
    if (!existingPlan) {
      throw new Error("Plano de aplicacao nao encontrado.");
    }

    let appointmentId = existingPlan.appointmentId;
    let newStatus = input.status || existingPlan.status;

    if (input.scheduledAt !== undefined) {
      if (input.scheduledAt === null) {
        if (appointmentId) {
          await appointmentsService.deleteAppointment(appointmentId);
          appointmentId = undefined;
        }
        if (newStatus === "scheduled") {
          newStatus = "planned";
        }
      } else {
        if (appointmentId) {
          await appointmentsService.updateAppointment(appointmentId, {
            application_plan_id: existingPlan.id,
            appointment_date: input.scheduledAt,
          } as any);
        } else {
          appointmentId = await appointmentsService.createAppointment({
            patient_id: existingPlan.patientId,
            application_plan_id: existingPlan.id,
            type: "application",
            appointment_date: input.scheduledAt,
            duration_minutes: 30,
          } as any);
        }
        if (newStatus === "planned") {
          newStatus = "scheduled";
        }
      }
    }

    const updatedPlan = await patientApplicationsRepository.update(id, {
      ...input,
      status: newStatus,
      appointmentId: appointmentId || null,
    });

    await auditRepository.log({
      action: "patient_application_plan_updated",
      entity_type: "patient_application_plan",
      entity_id: updatedPlan.id,
      description: "Plano de aplicacao atualizado",
      before_data: existingPlan as any,
      after_data: updatedPlan as any,
    });

    return updatedPlan;
  },

  async cancelPlan(id: string): Promise<void> {
    const existingPlan = await patientApplicationsRepository.getById(id);
    if (!existingPlan) return;

    if (existingPlan.appointmentId) {
      await appointmentsService.deleteAppointment(existingPlan.appointmentId);
    }

    await patientApplicationsRepository.delete(id);

    await auditRepository.log({
      action: "patient_application_plan_cancelled",
      entity_type: "patient_application_plan",
      entity_id: id,
      description: "Plano de aplicacao cancelado",
      before_data: existingPlan as any,
    });
  },

  async createMultiplePlans(inputs: CreatePatientApplicationPlanInput[]): Promise<PatientApplicationPlan[]> {
    const plans: PatientApplicationPlan[] = [];
    for (const input of inputs) {
      const plan = await this.createPlan(input);
      plans.push(plan);
    }
    return plans;
  },
};
