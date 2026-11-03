import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface AppointmentData {
  patientName?: string;
  patient_name?: string;
  name?: string;
  patientEmail: string;
  patient_email?: string;
  clinicName: string;
  appointmentDate: string | Date;
  protocolName?: string;
  protocol_name?: string;
  appointmentType: string;
  professionalName?: string;
  [key: string]: any;
}

export function generateAppointmentConfirmationHtml(data: AppointmentData): string {
  const patientName = data.patientName || data.patient_name || data.name || (data.patient && (data.patient.name || data.patient.patient_name)) || "Paciente";
  const clinicName = data.clinicName || "Clínica Dra. Ana Morong";
  const dateObj = typeof data.appointmentDate === "string" ? new Date(data.appointmentDate) : data.appointmentDate;
  const formattedDate = format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  
  // Google Calendar URL generation
  const startDateStr = dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
  // Assume 1 hour duration
  const endDateObj = new Date(dateObj.getTime() + 60 * 60 * 1000);
  const endDateStr = endDateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
  const details = encodeURIComponent(`Agendamento de ${data.appointmentType} na clínica ${clinicName}.`);
  const text = encodeURIComponent(`Aplicação - ${patientName}`);
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startDateStr}/${endDateStr}&details=${details}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; line-height: 1.6; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: #ffffff; padding: 35px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 20px; }
    .info-card { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 25px 0; }
    .info-row { margin-bottom: 12px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { font-size: 13px; color: #0369a1; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
    .info-value { font-size: 16px; color: #0f172a; font-weight: 500; }
    .btn-container { text-align: center; margin-top: 35px; }
    .btn { display: inline-block; background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 500; font-size: 15px; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3); transition: background-color 0.2s; }
    .footer { background-color: #f8fafc; padding: 25px 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Agendamento Confirmado!</h1>
    </div>
    <div class="content">
      <div class="greeting">Olá, ${patientName}!</div>
      <p>Seu agendamento na <strong>${clinicName}</strong> foi confirmado com sucesso. Abaixo estão os detalhes da sua sessão:</p>
      
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Data e Hora</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Procedimento</span>
          <span class="info-value">${data.appointmentType} ${data.protocolName || data.protocol_name ? `(${data.protocolName || data.protocol_name})` : ''}</span>
        </div>
        ${data.professionalName ? `
        <div class="info-row">
          <span class="info-label">Profissional</span>
          <span class="info-value">${data.professionalName}</span>
        </div>` : ''}
      </div>

      <div class="btn-container">
        <a href="${calendarUrl}" class="btn" target="_blank">Adicionar ao Google Agenda</a>
      </div>
    </div>
    <div class="footer">
      Esta é uma mensagem automática de ${clinicName}.<br>
      Por favor, não responda este email.
    </div>
  </div>
</body>
</html>
  `;
}

export function generateAppointmentReminderHtml(data: AppointmentData, reminderType?: string): string {
  const patientName = data.patientName || data.patient_name || data.name || (data.patient && (data.patient.name || data.patient.patient_name)) || "Paciente";
  const clinicName = data.clinicName || "Clínica Dra. Ana Morong";
  const dateObj = typeof data.appointmentDate === "string" ? new Date(data.appointmentDate) : data.appointmentDate;
  const formattedDate = format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  let reminderLead = `Passando para lembrar que faltam poucos dias para a sua aplicação na <strong>${clinicName}</strong>.`;
  if (reminderType === "4_hours_before") {
    reminderLead = `Passando para lembrar que sua aplicação na <strong>${clinicName}</strong> será em aproximadamente 4 horas.`;
  } else if (reminderType === "1_day_before") {
    reminderLead = `Passando para lembrar que sua aplicação na <strong>${clinicName}</strong> será amanhã.`;
  } else if (reminderType === "7_days_before") {
    reminderLead = `Passando para lembrar que sua aplicação na <strong>${clinicName}</strong> está agendada para daqui a 7 dias.`;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; line-height: 1.6; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 35px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 20px; }
    .info-card { background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 25px 0; }
    .info-row { margin-bottom: 12px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { font-size: 13px; color: #b45309; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
    .info-value { font-size: 16px; color: #0f172a; font-weight: 500; }
    .alert-text { color: #d97706; font-weight: 500; text-align: center; margin-top: 20px; }
    .footer { background-color: #f8fafc; padding: 25px 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lembrete de Aplicação</h1>
    </div>
    <div class="content">
      <div class="greeting">Olá, ${patientName}!</div>
      <p>${reminderLead}</p>
      
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Data e Hora</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Procedimento</span>
          <span class="info-value">${data.appointmentType} ${data.protocolName || data.protocol_name ? `(${data.protocolName || data.protocol_name})` : ''}</span>
        </div>
        ${data.professionalName ? `
        <div class="info-row">
          <span class="info-label">Profissional</span>
          <span class="info-value">${data.professionalName}</span>
        </div>` : ''}
      </div>

      <p class="alert-text">Caso precise reagendar, entre em contato com a clínica o quanto antes.</p>
    </div>
    <div class="footer">
      Esta é uma mensagem automática de ${clinicName}.<br>
      Por favor, não responda este email.
    </div>
  </div>
</body>
</html>
  `;
}
