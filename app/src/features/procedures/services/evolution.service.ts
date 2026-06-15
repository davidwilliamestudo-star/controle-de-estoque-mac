export interface GenerateEvolutionContext {
  patientName: string;
  protocolName?: string | null;
  routeName?: string | null;
  bodyAreaName?: string | null;
  bodyAreaSide?: string | null;
  bodyAreaRegion?: string | null;
  professionalName?: string | null;
  hadIntercurrence?: boolean;
  intercurrenceDescription?: string | null;
  notes?: string | null;
  items: {
    itemType: string;
    itemName: string;
    quantityUsed: number;
    unit: string;
    batchNumber?: string | null;
    expirationDate?: string | null;
  }[];
}

export const evolutionService = {
  generateProcedureEvolution(contextData: GenerateEvolutionContext): string {
    const data = new Date().toLocaleDateString("pt-BR");
    
    let text = `Paciente ${contextData.patientName} realizou aplicação no dia ${data}`;
    
    if (contextData.protocolName) {
      text += ` do protocolo ${contextData.protocolName}`;
    }
    
    if (contextData.routeName) {
      text += ` por via ${contextData.routeName}`;
    }
    
    if (contextData.bodyAreaName) {
      text += `, em ${contextData.bodyAreaName}`;
    }
    
    if (contextData.hadIntercurrence) {
      text += ` COM intercorrência durante o procedimento: ${contextData.intercurrenceDescription}. `;
    } else {
      text += `, sem intercorrências durante o procedimento. `;
    }

    const meds = contextData.items.filter(i => i.itemType === 'medication');
    const mats = contextData.items.filter(i => i.itemType === 'material');

    if (meds.length > 0) {
      text += `\n\nMedicamentos utilizados:\n`;
      meds.forEach(m => {
        text += `- ${m.itemName}: ${m.quantityUsed} ${m.unit}`;
        if (m.batchNumber) {
          text += `, lote ${m.batchNumber}`;
        }
        if (m.expirationDate) {
          const validade = new Date(m.expirationDate).toLocaleDateString("pt-BR", { month: '2-digit', year: 'numeric' });
          text += `, validade ${validade}`;
        }
        text += `\n`;
      });
    }

    if (mats.length > 0) {
      text += `\nMateriais utilizados:\n`;
      mats.forEach(m => {
        text += `- ${m.itemName}: ${m.quantityUsed} ${m.unit}\n`;
      });
    }

    if (contextData.notes) {
      text += `\nObservações: ${contextData.notes}\n`;
    }

    if (contextData.professionalName) {
      text += `\nProcedimento realizado por: ${contextData.professionalName}`;
    } else {
      text += `\nPaciente orientado conforme rotina da clínica.`;
    }

    return text.trim();
  }
};
