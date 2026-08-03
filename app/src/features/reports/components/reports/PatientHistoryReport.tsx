/**
 * PatientHistoryDocument.tsx
 *
 * Documento PDF de Histórico de Aplicações.
 * RECEBE dados como props — NÃO faz fetch interno.
 */
import { View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PdfDocumentLayout, pdfStyles, PdfTable, PdfTableHeader, PdfTableRow, PdfTableCell } from "../../pdf";
import type { PatientHistoryRow, ReportFilter } from "../../schemas/report.schema";

interface Props {
  data: PatientHistoryRow[];
  filter: ReportFilter;
  orientation?: "portrait" | "landscape";
}

export function PatientHistoryDocument({ data: history, filter, orientation = "landscape" }: Props) {
  const subtitle = [
    filter.startDate ? `De ${format(new Date(filter.startDate), "dd/MM/yy")}` : "Início",
    filter.endDate ? `até ${format(new Date(filter.endDate), "dd/MM/yy")}` : "Hoje",
  ].filter(Boolean).join(" ");

  const filtersText = [
    filter.startDate ? `De: ${filter.startDate}` : null,
    filter.endDate ? `Até: ${filter.endDate}` : null,
    filter.patientId ? "Paciente Específico" : null,
    filter.userId ? "Profissional Específico" : null,
  ].filter(Boolean).join(" | ") || "Todos os atendimentos do período";

  const withIntercurrence = history.filter(h => h.had_intercurrence).length;
  const uniquePatients = new Set(history.map(h => h.patient_id)).size;
  const finalized = history.filter(h => h.total_items_used > 0).length;

  return (
    <PdfDocumentLayout
      title="Histórico Geral de Aplicações"
      subtitle={subtitle}
      filtersText={filtersText}
      orientation={orientation}
    >
      {/* KPIs */}
      <View style={pdfStyles.kpiRow}>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiInfo]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiInfoText]}>Total de Atendimentos</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiInfoText]}>{history.length}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiBrand]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiBrandText]}>Pacientes Atendidos</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiBrandText]}>{uniquePatients}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, withIntercurrence > 0 ? pdfStyles.kpiWarning : pdfStyles.kpiSuccess]}>
          <Text style={[pdfStyles.kpiLabel, withIntercurrence > 0 ? pdfStyles.kpiWarningText : pdfStyles.kpiSuccessText]}>
            Com Intercorrência
          </Text>
          <Text style={[pdfStyles.kpiValue, withIntercurrence > 0 ? pdfStyles.kpiWarningText : pdfStyles.kpiSuccessText]}>
            {withIntercurrence}
          </Text>
        </View>
      </View>

      {/* Tabela */}
      <View style={pdfStyles.section}>
        {history.length === 0 ? (
          <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
            Nenhum atendimento encontrado para os filtros selecionados.
          </Text>
        ) : (
          <PdfTable>
            <PdfTableHeader>
              <PdfTableCell isHeader flex={2}>Data/Hora</PdfTableCell>
              <PdfTableCell isHeader flex={4}>Paciente</PdfTableCell>
              <PdfTableCell isHeader flex={4}>Protocolo</PdfTableCell>
              <PdfTableCell isHeader flex={2}>Área Tratada</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={1}>Itens</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={2}>Status</PdfTableCell>
            </PdfTableHeader>
            {history.map((row, index) => (
              <PdfTableRow key={row.procedure_id || index} isStriped={index % 2 === 1}>
                <PdfTableCell flex={2}>
                  {format(new Date(row.performed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </PdfTableCell>
                <PdfTableCell flex={4}>
                  <Text style={pdfStyles.textBold}>{row.patient_name}</Text>
                </PdfTableCell>
                <PdfTableCell flex={4}>
                  {row.protocol_name || "Procedimento Avulso"}
                </PdfTableCell>
                <PdfTableCell flex={2}>
                  {row.body_area_name || "—"}
                </PdfTableCell>
                <PdfTableCell align="center" flex={1}>
                  <Text style={pdfStyles.textBold}>{row.total_items_used}</Text>
                </PdfTableCell>
                <PdfTableCell align="center" flex={2}>
                  {row.had_intercurrence ? (
                    <Text style={pdfStyles.badgeWarning}>Intercorrência</Text>
                  ) : (
                    <Text style={pdfStyles.badgeSuccess}>Normal</Text>
                  )}
                </PdfTableCell>
              </PdfTableRow>
            ))}
          </PdfTable>
        )}
      </View>
    </PdfDocumentLayout>
  );
}

export { PatientHistoryDocument as PatientHistoryReport };
