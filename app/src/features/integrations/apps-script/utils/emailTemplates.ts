import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AppointmentEmailData {
  patientName: string;
  scheduledAt: string;
  durationMinutes: number;
  clinicName: string;
  protocolName?: string;
  routeName?: string;
  calendarLink?: string;
}

export function generateAppointmentEmailHtml(data: AppointmentEmailData): string {
  const dateObj = parseISO(data.scheduledAt);
  const formattedDate = format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedTime = format(dateObj, "HH:mm", { locale: ptBR });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #3f3f46; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #115e59; color: #ffffff; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .content p { font-size: 16px; line-height: 1.6; margin-top: 0; }
    .info-box { background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0; }
    .info-item { margin-bottom: 10px; }
    .info-item strong { display: inline-block; width: 90px; color: #854d0e; }
    .btn-container { text-align: center; margin: 30px 0 10px 0; }
    .btn { display: inline-block; background-color: #115e59; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Confirmação de Agendamento</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${data.patientName}</strong>.</p>
      <p>Sua aplicação foi agendada com sucesso na <strong>${data.clinicName}</strong>.</p>
      
      <div class="info-box">
        <div class="info-item"><strong>Data:</strong> ${formattedDate}</div>
        <div class="info-item"><strong>Horário:</strong> ${formattedTime}</div>
        <div class="info-item"><strong>Duração:</strong> ~${data.durationMinutes} minutos</div>
        ${data.protocolName ? `<div class="info-item"><strong>Protocolo:</strong> ${data.protocolName}</div>` : ''}
        ${data.routeName ? `<div class="info-item"><strong>Via:</strong> ${data.routeName}</div>` : ''}
      </div>

      <p>Lembre-se de chegar com 10 minutos de antecedência. Em caso de imprevistos, por favor, nos avise o quanto antes.</p>

      ${data.calendarLink ? `
      <div class="btn-container">
        <a href="${data.calendarLink}" class="btn">Adicionar à minha agenda</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      Este é um e-mail automático. Em caso de dúvidas, entre em contato com a clínica pelos canais oficiais.
    </div>
  </div>
</body>
</html>
  `;
}

export function generateAppointmentEmailText(data: AppointmentEmailData): string {
  const dateObj = parseISO(data.scheduledAt);
  const formattedDate = format(dateObj, "dd/MM/yyyy", { locale: ptBR });
  const formattedTime = format(dateObj, "HH:mm", { locale: ptBR });

  let text = `Olá, ${data.patientName}.\n\n`;
  text += `Sua aplicação foi agendada com sucesso na ${data.clinicName}.\n\n`;
  text += `Detalhes:\n`;
  text += `- Data: ${formattedDate}\n`;
  text += `- Horário: ${formattedTime}\n`;
  text += `- Duração prevista: ~${data.durationMinutes} minutos\n`;
  if (data.protocolName) text += `- Protocolo: ${data.protocolName}\n`;
  if (data.routeName) text += `- Via: ${data.routeName}\n`;
  
  text += `\nLembre-se de chegar com 10 minutos de antecedência. Em caso de imprevistos, por favor, nos avise o quanto antes.\n\n`;
  
  if (data.calendarLink) {
    text += `Para adicionar à sua agenda, acesse: ${data.calendarLink}\n\n`;
  }
  
  text += `Este é um e-mail automático. Em caso de dúvidas, entre em contato com a clínica pelos canais oficiais.\n`;
  
  return text;
}
