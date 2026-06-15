import { externalSyncQueueService } from "./externalSyncQueue.service";
import { appScriptIntegrationService } from "./appScriptIntegration.service";
import { auditRepository } from "@/features/audit/repositories/audit.repository";
import { notificationsRepository } from "@/features/notifications/repositories/notifications.repository";
import { dbSelect } from "@/lib/db/sqlite";
import type { AppointmentFormData } from "@/features/agenda/schemas/appointment.schema";
import { generateAppointmentEmailHtml, generateAppointmentEmailText } from "../utils/emailTemplates";

type PatientInfo = {
  id: string;
  name: string;
  email: string;
};

type ApplicationPlanInfo = {
  application_plan_id: string;
  protocol_id: string;
  route_id: string;
  protocol_name: string;
  route_name: string;
  route_code: string;
};

const APPOINTMENT_SYNC_ACTIONS = [
  "create_application_appointment",
  "update_application_appointment",
  "cancel_application_appointment",
  "send_application_reminder",
];

function requestIdFor(action: string, appointmentId: string, version?: string | null): string {
  const safeVersion = (version || "current").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${action}:${appointmentId}:${safeVersion}`;
}

export const integrationOrchestratorService = {
  async getPatientInfo(patientId: string): Promise<PatientInfo> {
    const rows = await dbSelect<{ id: string; full_name: string; email: string }>(
      "SELECT id, full_name, email FROM patients WHERE id = ? AND deleted_at IS NULL",
      [patientId]
    );

    if (!rows[0]) throw new Error("Paciente nao encontrado.");

    return {
      id: rows[0].id,
      name: rows[0].full_name,
      email: rows[0].email || "",
    };
  },

  async getApplicationPlanByAppointment(appointmentId: string): Promise<ApplicationPlanInfo | null> {
    const rows = await dbSelect<ApplicationPlanInfo>(
      `
        SELECT
          pap.id AS application_plan_id,
          pap.protocol_id,
          pap.route_id,
          pr.name AS protocol_name,
          r.name AS route_name,
          r.id AS route_code
        FROM patient_application_plans pap
        LEFT JOIN protocols pr ON pr.id = pap.protocol_id
        LEFT JOIN administration_routes r ON r.id = pap.route_id
        WHERE pap.appointment_id = ? AND pap.deleted_at IS NULL
        LIMIT 1
      `,
      [appointmentId]
    );

    return rows[0] ?? null;
  },

  async notifyMissingPatientEmail(appointmentId: string, patient: PatientInfo): Promise<void> {
    await notificationsRepository.upsertActiveNotification({
      type: "appscript_patient_email_missing",
      title: "Sincronizacao incompleta",
      message: `O paciente ${patient.name} nao possui e-mail. O agendamento foi salvo localmente, mas nao sera enviado ao Apps Script.`,
      severity: "medium",
      entityType: "appointment",
      entityId: appointmentId,
    });

    await auditRepository.log({
      action: "appscript_patient_email_missing",
      entity_type: "appointment",
      entity_id: appointmentId,
      description: "Agendamento salvo localmente, mas paciente nao possui e-mail cadastrado para integracao externa.",
    });
  },

  buildAppointmentPayload(
    appointmentId: string,
    data: Pick<AppointmentFormData, "appointment_date" | "duration_minutes">,
    patient: PatientInfo,
    plan: ApplicationPlanInfo,
    config: { calendarEnabled: boolean; emailEnabled: boolean; checkinEnabled: boolean },
  ): Record<string, any> {
    const payload: Record<string, any> = {
      appointment_id: appointmentId,
      application_plan_id: plan.application_plan_id,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
      },
      application: {
        scheduled_at: data.appointment_date,
        duration_minutes: data.duration_minutes || 60,
        protocol_id: plan.protocol_id,
        protocol_name: plan.protocol_name || "",
        route_id: plan.route_id,
        route_name: plan.route_name || "",
        route_code: plan.route_code || "",
        notes: "",
      },
      clinic: {
        name: "Dra. Ana Morong",
        email: "",
        phone: "",
        address: "",
      },
      features: {
        calendar: config.calendarEnabled,
        email: config.emailEnabled,
        checkin: config.checkinEnabled,
      },
    };

    if (config.emailEnabled) {
      const emailData = {
        patientName: patient.name,
        scheduledAt: data.appointment_date,
        durationMinutes: data.duration_minutes || 60,
        clinicName: "Dra. Ana Morong",
        protocolName: payload.application.protocol_name,
        routeName: payload.application.route_name,
      };

      payload.email_options = {
        send_email: true,
        subject: "Confirmacao da sua aplicacao - Dra. Ana Morong",
        html_body: generateAppointmentEmailHtml(emailData),
        text_body: generateAppointmentEmailText(emailData),
        reminders_delegated_to_local_queue: true,
      };
    }

    return payload;
  },

  async handleAppointmentCreated(appointmentId: string, data: AppointmentFormData): Promise<void> {
    const config = await appScriptIntegrationService.getSettings();
    if (!config.enabled || data.type !== "application") return;

    try {
      const patient = await this.getPatientInfo(data.patient_id);
      if (!patient.email) {
        await this.notifyMissingPatientEmail(appointmentId, patient);
        return;
      }

      const plan = await this.getApplicationPlanByAppointment(appointmentId);
      if (!plan) {
        await auditRepository.log({
          action: "appscript_application_plan_not_found",
          entity_type: "appointment",
          entity_id: appointmentId,
          description: "Integracao Apps Script ignorada: plano de aplicacao vinculado ao agendamento nao foi encontrado.",
        });
        return;
      }

      const payload = this.buildAppointmentPayload(appointmentId, data, patient, plan, config);
      await externalSyncQueueService.enqueue(
        "create_application_appointment",
        "appointment",
        appointmentId,
        payload,
        { requestId: requestIdFor("create_application_appointment", appointmentId) }
      );

      // Enfileirar os lembretes para envio futuro (D-7, D-1, H-4)
      if (config.emailEnabled) {
        const appointmentTime = new Date(data.appointment_date).getTime();
        const reminderOffsets = [
          { label: '7d', minutes: 7 * 24 * 60 },
          { label: '1d', minutes: 1 * 24 * 60 },
          { label: '4h', minutes: 4 * 60 },
        ];

        for (const offset of reminderOffsets) {
          const attemptTime = appointmentTime - offset.minutes * 60_000;
          if (attemptTime > Date.now()) {
            await externalSyncQueueService.enqueue(
              "send_application_reminder",
              "appointment",
              appointmentId,
              { ...payload, reminder_type: offset.label },
              { 
                requestId: requestIdFor(`send_application_reminder_${offset.label}`, appointmentId),
                nextAttemptAt: new Date(attemptTime).toISOString(),
              }
            );
          }
        }
      }

    } catch (error) {
      console.error("Erro no orquestrador Apps Script ao criar agendamento:", error);
    }
  },

  async handleAppointmentUpdated(appointmentId: string, data: Partial<AppointmentFormData>): Promise<void> {
    const config = await appScriptIntegrationService.getSettings();
    if (!config.enabled) return;

    try {
      const existing = await dbSelect<{
        patient_id: string;
        appointment_type: AppointmentFormData["type"];
        scheduled_at: string;
        duration_minutes: number;
        application_plan_id: string | null;
        google_calendar_event_id: string | null;
      }>(
        `
          SELECT patient_id, appointment_type, scheduled_at, duration_minutes, application_plan_id, google_calendar_event_id
          FROM appointments
          WHERE id = ?
          LIMIT 1
        `,
        [appointmentId]
      );

      const appointment = existing[0];
      if (!appointment || appointment.appointment_type !== "application") return;

      if (data.status === "canceled") {
        await this.handleAppointmentDeleted(appointmentId);
        return;
      }

      await externalSyncQueueService.cancelPendingForEntity("appointment", appointmentId, APPOINTMENT_SYNC_ACTIONS);

      const patient = await this.getPatientInfo(appointment.patient_id);
      if (!patient.email) return;

      const plan = await this.getApplicationPlanByAppointment(appointmentId);
      if (!plan) return;

      const appointmentData: AppointmentFormData = {
        patient_id: appointment.patient_id,
        type: "application",
        appointment_date: data.appointment_date ?? appointment.scheduled_at,
        duration_minutes: data.duration_minutes ?? appointment.duration_minutes ?? 60,
        status: data.status ?? "scheduled",
        notes: data.notes ?? "",
        application_plan_id: data.application_plan_id ?? appointment.application_plan_id ?? "",
        new_plan_protocol_id: "",
        new_plan_route_id: "",
      };

      if (!appointment.google_calendar_event_id) {
        await this.handleAppointmentCreated(appointmentId, appointmentData);
        return;
      }

      const payload = this.buildAppointmentPayload(appointmentId, appointmentData, patient, plan, config);
      payload.calendar_event_id = appointment.google_calendar_event_id;
      payload.notify_patient = config.emailEnabled;

      await externalSyncQueueService.enqueue(
        "update_application_appointment",
        "appointment",
        appointmentId,
        payload,
        { requestId: requestIdFor("update_application_appointment", appointmentId, `${appointmentData.appointment_date}:${appointmentData.duration_minutes}`) }
      );

      if (config.emailEnabled) {
        const appointmentTime = new Date(appointmentData.appointment_date).getTime();
        const reminderOffsets = [
          { label: '7d', minutes: 7 * 24 * 60 },
          { label: '1d', minutes: 1 * 24 * 60 },
          { label: '4h', minutes: 4 * 60 },
        ];

        for (const offset of reminderOffsets) {
          const attemptTime = appointmentTime - offset.minutes * 60_000;
          if (attemptTime > Date.now()) {
            await externalSyncQueueService.enqueue(
              "send_application_reminder",
              "appointment",
              appointmentId,
              { ...payload, reminder_type: offset.label },
              { 
                requestId: requestIdFor(`send_application_reminder_${offset.label}`, appointmentId, `${appointmentData.appointment_date}`),
                nextAttemptAt: new Date(attemptTime).toISOString(),
              }
            );
          }
        }
      }

    } catch (error) {
      console.error("Erro no orquestrador Apps Script ao atualizar agendamento:", error);
    }
  },

  async handleAppointmentDeleted(appointmentId: string): Promise<void> {
    const config = await appScriptIntegrationService.getSettings();
    if (!config.enabled) return;

    try {
      await externalSyncQueueService.cancelPendingForEntity("appointment", appointmentId, APPOINTMENT_SYNC_ACTIONS);

      const existing = await dbSelect<{
        patient_id: string;
        appointment_type: string;
        google_calendar_event_id: string | null;
      }>(
        "SELECT patient_id, appointment_type, google_calendar_event_id FROM appointments WHERE id = ? LIMIT 1",
        [appointmentId]
      );

      const appointment = existing[0];
      if (!appointment || appointment.appointment_type !== "application" || !appointment.google_calendar_event_id) return;

      const patient = await this.getPatientInfo(appointment.patient_id);

      await externalSyncQueueService.enqueue(
        "cancel_application_appointment",
        "appointment",
        appointmentId,
        {
          appointment_id: appointmentId,
          calendar_event_id: appointment.google_calendar_event_id,
          patient,
          notify_patient: config.emailEnabled,
          features: {
            calendar: config.calendarEnabled,
            email: config.emailEnabled,
            checkin: config.checkinEnabled,
          },
        },
        { requestId: requestIdFor("cancel_application_appointment", appointmentId) }
      );
    } catch (error) {
      console.error("Erro no orquestrador Apps Script ao deletar agendamento:", error);
    }
  },
};
