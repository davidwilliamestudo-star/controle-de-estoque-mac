import { appScriptIntegrationService } from "./appScriptIntegration.service";
import { generateAppointmentConfirmationHtml, generateAppointmentReminderHtml, AppointmentData } from "../utils/appointmentEmailTemplates";
import { subDays, subHours, isFuture } from "date-fns";

export const appointmentIntegrationService = {
  /**
   * Envia a confirmação de agendamento por email.
   * Chamado imediatamente ao salvar um novo agendamento.
   */
  async sendConfirmationEmail(data: AppointmentData) {
    const htmlBody = generateAppointmentConfirmationHtml(data);

    return appScriptIntegrationService.sendPayload({
      action: "send_generic_email",
      request_id: crypto.randomUUID(),
      to: data.patientEmail,
      subject: `Confirmação de Agendamento - ${data.clinicName}`,
      html_body: htmlBody
    });
  },

  /**
   * Agenda os lembretes padrao da aplicacao.
   * O payload vai para o Apps Script, que processa os envios por trigger.
   */
  async scheduleReminders(data: AppointmentData, appointmentId: string, patientId: string) {
    const appointmentDate = new Date(data.appointmentDate);
    const reminders = [
      { type: "7_days_before", date: subDays(appointmentDate, 7) },
      { type: "1_day_before", date: subDays(appointmentDate, 1) },
      { type: "4_hours_before", date: subHours(appointmentDate, 4) },
    ].filter((reminder) => isFuture(reminder.date));

    if (reminders.length === 0) {
      return [];
    }

    const htmlBody = generateAppointmentReminderHtml(data);

    return Promise.all(reminders.map((reminder) =>
      appScriptIntegrationService.sendPayload({
        action: "schedule_appointment_reminder",
        request_id: `schedule_appointment_reminder:${appointmentId}:${reminder.type}`,
        patient_id: patientId,
        patient: {
          id: patientId,
          email: data.patientEmail,
          name: data.patientName
        },
        appointment_id: appointmentId,
        protocol_name: data.protocolName || data.appointmentType,
        scheduled_for: reminder.date.toISOString(),
        reminder_type: reminder.type,
        html_body: htmlBody
      })
    ));
  },

  async scheduleReminder(data: AppointmentData, appointmentId: string, patientId: string) {
    return this.scheduleReminders(data, appointmentId, patientId);
  }
};
