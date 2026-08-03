import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { View, Text } from "@react-pdf/renderer";
import { PdfDocumentLayout, pdfStyles, PdfTable, PdfTableHeader, PdfTableRow, PdfTableCell } from "@/features/reports/pdf";
import type { PatientRecord, ProcedureSummary } from "../schemas/patient.schema";

export interface PatientReportConfig {
  showPatientInfo: boolean;
  showAlerts: boolean;
  showEvolutions: boolean;
  showIntercurrences: boolean;
  showItems: boolean;
  showBatches: boolean;
  orientation: "portrait" | "landscape";
}

interface PatientRecordReportProps {
  record: PatientRecord;
  procedures: ProcedureSummary[];
  config: PatientReportConfig;
}

export function PatientRecordReport({ record, procedures, config }: PatientRecordReportProps) {
  const calcAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <PdfDocumentLayout
      title="Prontuário de Paciente"
      subtitle={`Paciente: ${record.full_name}`}
      orientation={config.orientation}
    >
      {/* Patient Info */}
      {config.showPatientInfo && (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Dados do Paciente</Text>
          <View style={{ backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, borderWidth: 1, borderColor: '#f3f4f6' }}>
            <View style={pdfStyles.row}>
              <View style={pdfStyles.col}>
                <Text style={pdfStyles.tableCell}><Text style={pdfStyles.textBold}>Nome Completo:</Text> {record.full_name}</Text>
                <Text style={pdfStyles.tableCell}>
                  <Text style={pdfStyles.textBold}>Nascimento / Idade:</Text> {record.birth_date ? `${format(new Date(record.birth_date), 'dd/MM/yyyy')} (${calcAge(record.birth_date)} anos)` : "Não informado"}
                </Text>
              </View>
              <View style={pdfStyles.col}>
                <Text style={pdfStyles.tableCell}><Text style={pdfStyles.textBold}>Telefone:</Text> {record.phone || "Não informado"}</Text>
                <Text style={pdfStyles.tableCell}><Text style={pdfStyles.textBold}>E-mail:</Text> {record.email || "Não informado"}</Text>
              </View>
            </View>
            {record.notes && (
              <View style={{ marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                <Text style={pdfStyles.tableCell}><Text style={pdfStyles.textBold}>Observações Clínicas:</Text> {record.notes}</Text>
              </View>
            )}
            {config.showAlerts && record.alert_notes && (
              <View style={{ marginTop: 5, padding: 5, backgroundColor: '#fef2f2', borderRadius: 4, borderWidth: 1, borderColor: '#fca5a5' }}>
                <Text style={[pdfStyles.tableCell, { color: '#991b1b', fontFamily: 'Helvetica-Bold' }]}>Alertas Médicos:</Text>
                <Text style={[pdfStyles.tableCell, { color: '#b91c1c' }]}>{record.alert_notes}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Procedures History */}
      <View style={pdfStyles.section} wrap={false}>
        <Text style={pdfStyles.sectionTitle}>Histórico de Procedimentos ({procedures.length})</Text>
        
        {procedures.length === 0 ? (
          <Text style={[pdfStyles.tableCell, { fontStyle: 'italic', color: '#6b7280' }]}>Nenhum procedimento registrado.</Text>
        ) : (
          procedures.map((proc, index) => (
            <View key={proc.id} style={{ marginBottom: 15, paddingBottom: 10, borderBottomWidth: index === procedures.length - 1 ? 0 : 1, borderBottomColor: '#f3f4f6' }}>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <View>
                  <Text style={[pdfStyles.tableCell, { fontFamily: 'Helvetica-Bold', fontSize: 10 }]}>
                    {proc.protocol_name || "Procedimento Avulso"}
                  </Text>
                  <Text style={[pdfStyles.tableCell, { color: '#6b7280' }]}>
                    {format(new Date(proc.performed_at), "dd/MM/yyyy HH:mm")}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {proc.body_area_name && (
                    <Text style={[pdfStyles.tableCell, { color: '#6b7280' }]}>Área: {proc.body_area_name} {(proc as any).body_area_side ? `(${(proc as any).body_area_side})` : ""}</Text>
                  )}
                  {(proc as any).route_name && (
                    <Text style={[pdfStyles.tableCell, { color: '#6b7280' }]}>Via: {(proc as any).route_name}</Text>
                  )}
                </View>
              </View>

              {/* Itens Utilizados */}
              {config.showItems && (proc as any).items_used && (proc as any).items_used.length > 0 && (
                <View style={{ marginTop: 5, marginLeft: 10 }}>
                  <Text style={[pdfStyles.tableCell, { fontFamily: 'Helvetica-Bold', fontSize: 8, marginBottom: 2, color: '#374151' }]}>Itens Utilizados:</Text>
                  {(proc as any).items_used.map((item: any, i: number) => (
                    <Text key={item.id} style={[pdfStyles.tableCell, { color: '#4b5563' }]}>
                      • {item.item_name} - {item.quantity_used} {item.unit}
                      {config.showBatches && item.batch_number ? ` (Lote: ${item.batch_number})` : ""}
                    </Text>
                  ))}
                </View>
              )}

              {/* Intercorrências */}
              {config.showIntercurrences && proc.had_intercurrence && (
                <View style={{ marginTop: 5, padding: 5, backgroundColor: '#fef2f2', borderLeftWidth: 2, borderLeftColor: '#ef4444' }}>
                  <Text style={[pdfStyles.tableCell, { fontFamily: 'Helvetica-Bold', color: '#b91c1c', fontSize: 7, textTransform: 'uppercase' }]}>Intercorrência:</Text>
                  <Text style={[pdfStyles.tableCell, { color: '#991b1b' }]}>{proc.intercurrence_description}</Text>
                </View>
              )}

              {/* Evolução Clínica */}
              {config.showEvolutions && proc.evolution_text && (
                <View style={{ marginTop: 5, padding: 5, backgroundColor: '#f8fafc', borderLeftWidth: 2, borderLeftColor: '#3b82f6' }}>
                  <Text style={[pdfStyles.tableCell, { fontFamily: 'Helvetica-Bold', color: '#1e40af', fontSize: 7, textTransform: 'uppercase' }]}>Evolução Clínica:</Text>
                  <Text style={[pdfStyles.tableCell, { color: '#334155', fontStyle: 'italic' }]}>{proc.evolution_text}</Text>
                </View>
              )}

            </View>
          ))
        )}
      </View>
    </PdfDocumentLayout>
  );
}
