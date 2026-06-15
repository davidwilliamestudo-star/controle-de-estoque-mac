import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ReportItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  batchNumber: string;
  expirationDate: string | null;
}

export interface ReportApplication {
  id: string;
  date: string;
  protocolName: string;
  routeName: string;
  bodyAreaName: string;
  professionalName: string;
  finalEvolution: string;
  intercurrence: string;
  items: ReportItem[];
}

export interface ReportData {
  patientName: string;
  patientEmail: string;
  clinicName: string;
  applications: ReportApplication[];
  includeEvolution: boolean;
  includeIntercurrence: boolean;
  includeItems: boolean;
  includeBatches: boolean;
  customMessage?: string;
}

export function generateReportEmailHtml(data: ReportData): string {
  const currentDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; line-height: 1.6; }
    .container { max-width: 650px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .header { background: linear-gradient(135deg, #0f766e 0%, #064e3b 100%); color: #ffffff; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.025em; }
    .header p { margin: 8px 0 0 0; font-size: 15px; opacity: 0.9; }
    .content { padding: 40px 30px; }
    .patient-info { display: flex; justify-content: space-between; align-items: center; background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 30px; border-left: 4px solid #0f766e; }
    .patient-name { font-size: 18px; font-weight: 600; color: #0f172a; margin: 0; }
    .issue-date { font-size: 14px; color: #64748b; margin: 5px 0 0 0; }
    .custom-message { background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 20px; border-radius: 8px; margin-bottom: 35px; font-style: italic; position: relative; }
    .custom-message::before { content: '"'; font-size: 40px; color: #bbf7d0; position: absolute; top: -5px; left: 10px; font-family: serif; }
    h3 { color: #0f172a; font-size: 20px; margin-bottom: 20px; font-weight: 600; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .app-card { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .app-header { background-color: #f8fafc; padding: 18px 20px; border-bottom: 1px solid #e2e8f0; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .app-header-title { font-weight: 600; font-size: 16px; color: #0f766e; margin: 0; }
    .app-header-date { font-size: 14px; color: #64748b; background-color: #e2e8f0; padding: 4px 10px; border-radius: 20px; font-weight: 500; }
    .app-body { padding: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .info-item { font-size: 14px; }
    .info-item-label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
    .info-item-value { color: #0f172a; font-weight: 500; }
    .notes-box { background-color: #f8fafc; padding: 16px; border-radius: 6px; font-size: 14px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .notes-label { font-weight: 600; color: #475569; margin-bottom: 8px; display: block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
    .intercurrence-box { background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 6px; font-size: 14px; margin-bottom: 20px; color: #991b1b; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 15px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    th, td { text-align: left; padding: 12px 15px; }
    th { background-color: #f8fafc; color: #475569; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    td { border-bottom: 1px solid #e2e8f0; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .footer { background-color: #f8fafc; padding: 25px 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Relatório de Tratamento</h1>
      <p>${data.clinicName}</p>
    </div>
    
    <div class="content">
      <div class="patient-info">
        <div>
          <p class="patient-name">${data.patientName}</p>
          <p class="issue-date">Emitido em: ${currentDate}</p>
        </div>
      </div>

      ${data.customMessage ? `<div class="custom-message">${data.customMessage.replace(/\n/g, '<br>')}</div>` : ''}

      <h3>Histórico Selecionado</h3>
  `;  for (const app of data.applications) {
    const formattedDate = app.date ? format(parseISO(app.date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Sem data";
    
    html += `
      <div class="app-card">
        <div class="app-header">
          <p class="app-header-title">Sessão de Aplicação</p>
          <span class="app-header-date">${formattedDate}</span>
        </div>
        <div class="app-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-item-label">Protocolo</span>
              <span class="info-item-value">${app.protocolName}</span>
            </div>
            <div class="info-item">
              <span class="info-item-label">Via de Adm.</span>
              <span class="info-item-value">${app.routeName}</span>
            </div>
            <div class="info-item">
              <span class="info-item-label">Área Corporal</span>
              <span class="info-item-value">${app.bodyAreaName || '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-item-label">Profissional</span>
              <span class="info-item-value">${app.professionalName || '-'}</span>
            </div>
          </div>
    `;

    if (data.includeEvolution && app.finalEvolution) {
      html += `
          <div class="notes-box">
            <span class="notes-label">Evolução Clínica</span>
            ${app.finalEvolution.replace(/\n/g, '<br>')}
          </div>
      `;
    }

    if (data.includeIntercurrence && app.intercurrence) {
      html += `
          <div class="intercurrence-box">
            <span class="notes-label" style="color: #991b1b;">Intercorrência Registrada</span>
            ${app.intercurrence.replace(/\n/g, '<br>')}
          </div>
      `;
    }

    if (data.includeItems && app.items && app.items.length > 0) {
      html += `
          <h4 style="margin: 25px 0 10px 0; font-size: 15px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Rastreabilidade de Estoque</h4>
          <table>
            <thead>
              <tr>
                <th>Item Utilizado</th>
                <th>Tipo</th>
                <th>Qtd.</th>
                ${data.includeBatches ? `<th>Lote</th><th>Validade</th>` : ''}
              </tr>
            </thead>
            <tbody>
      `;
      
      for (const item of app.items) {
        const expDate = item.expirationDate ? format(parseISO(item.expirationDate), "dd/MM/yyyy") : "-";
        html += `
              <tr>
                <td style="font-weight: 500;">${item.name}</td>
                <td><span style="background-color: #f1f5f9; padding: 3px 8px; border-radius: 12px; font-size: 11px; text-transform: uppercase; color: #475569;">${item.type === 'medication' ? 'Medicamento' : 'Material'}</span></td>
                <td>${item.quantity} ${item.unit}</td>
                ${data.includeBatches ? `<td>${item.batchNumber || '-'}</td><td>${expDate}</td>` : ''}
              </tr>
        `;
      }
      
      html += `
            </tbody>
          </table>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  html += `
    </div>
    <div class="footer">
      Este relatório foi gerado automaticamente pelo sistema da ${data.clinicName}.<br>
      © ${new Date().getFullYear()} Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
  `;
  
  return html;
}

export function generateReportEmailText(data: ReportData): string {
  let text = `Relatório de Aplicações Clínicas - ${data.clinicName}\n`;
  text += `====================================================\n\n`;
  text += `Paciente: ${data.patientName}\n`;
  text += `Data de emissão: ${format(new Date(), "dd/MM/yyyy")}\n\n`;

  if (data.customMessage) {
    text += `Mensagem da Clínica:\n${data.customMessage}\n\n`;
  }

  text += `Histórico Selecionado:\n\n`;

  for (const app of data.applications) {
    const formattedDate = app.date ? format(parseISO(app.date), "dd/MM/yyyy HH:mm") : "Sem data";
    text += `--- Aplicação: ${formattedDate} ---\n`;
    text += `Protocolo: ${app.protocolName}\n`;
    text += `Via: ${app.routeName}\n`;
    if (app.bodyAreaName) text += `Área Corporal: ${app.bodyAreaName}\n`;
    if (app.professionalName) text += `Profissional: ${app.professionalName}\n`;
    
    if (data.includeEvolution && app.finalEvolution) {
      text += `Evolução:\n${app.finalEvolution}\n`;
    }
    if (data.includeIntercurrence && app.intercurrence) {
      text += `Intercorrência:\n${app.intercurrence}\n`;
    }

    if (data.includeItems && app.items && app.items.length > 0) {
      text += `Itens Utilizados:\n`;
      for (const item of app.items) {
        const type = item.type === 'medication' ? 'Med.' : 'Mat.';
        let itemLine = `  - [${type}] ${item.name} (${item.quantity} ${item.unit})`;
        if (data.includeBatches) {
          const expDate = item.expirationDate ? format(parseISO(item.expirationDate), "dd/MM/yyyy") : "-";
          itemLine += ` | Lote: ${item.batchNumber || '-'} | Val.: ${expDate}`;
        }
        text += `${itemLine}\n`;
      }
    }
    text += `\n`;
  }

  text += `====================================================\n`;
  text += `Gerado automaticamente pelo sistema.`;

  return text;
}
