/**
 * TraceabilityDocument.tsx
 *
 * Documento PDF de Rastreabilidade por Lote.
 * RECEBE dados como props — NÃO faz fetch interno.
 */
import { View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PdfDocumentLayout, pdfStyles, PdfTable, PdfTableHeader, PdfTableRow, PdfTableCell } from "../../pdf";
import type { TraceabilityRow } from "../../schemas/report.schema";

interface Props {
  data: TraceabilityRow[];
  batchNumber: string;
  orientation?: "portrait" | "landscape";
}

export function TraceabilityDocument({ data: rows, batchNumber, orientation = "portrait" }: Props) {
  const uniquePatients = new Set(rows.map(r => r.patient_name)).size;
  const uniqueItems = new Set(rows.map(r => r.item_name)).size;
  const totalUsed = rows.reduce((sum, r) => sum + Number(r.quantity_used), 0);

  return (
    <PdfDocumentLayout
      title="Rastreabilidade por Lote"
      subtitle={batchNumber ? `Lote: ${batchNumber}` : "Sem lote especificado"}
      filtersText={batchNumber ? `Número do Lote: ${batchNumber}` : undefined}
      orientation={orientation}
    >
      {!batchNumber ? (
        <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
          Nenhum número de lote especificado. Configure o filtro de lote antes de gerar este relatório.
        </Text>
      ) : rows.length === 0 ? (
        <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
          Nenhum uso registrado para o lote "{batchNumber}".
        </Text>
      ) : (
        <>
          {/* KPIs */}
          <View style={pdfStyles.kpiRow}>
            <View style={[pdfStyles.kpiCard, pdfStyles.kpiInfo]}>
              <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiInfoText]}>Pacientes Atendidos</Text>
              <Text style={[pdfStyles.kpiValue, pdfStyles.kpiInfoText]}>{uniquePatients}</Text>
            </View>
            <View style={[pdfStyles.kpiCard, pdfStyles.kpiNeutral]}>
              <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiNeutralText]}>Itens Rastreados</Text>
              <Text style={[pdfStyles.kpiValue, pdfStyles.kpiNeutralText]}>{uniqueItems}</Text>
            </View>
            <View style={[pdfStyles.kpiCard, pdfStyles.kpiBrand]}>
              <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiBrandText]}>Total Utilizado</Text>
              <Text style={[pdfStyles.kpiValue, pdfStyles.kpiBrandText]}>
                {totalUsed.toLocaleString("pt-BR")}
              </Text>
              <Text style={[pdfStyles.kpiSubtext, pdfStyles.kpiBrandText]}>unidades</Text>
            </View>
            <View style={[pdfStyles.kpiCard, pdfStyles.kpiNeutral]}>
              <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiNeutralText]}>Registros de Uso</Text>
              <Text style={[pdfStyles.kpiValue, pdfStyles.kpiNeutralText]}>{rows.length}</Text>
            </View>
          </View>

          {/* Tabela */}
          <View style={pdfStyles.section}>
            <PdfTable>
              <PdfTableHeader>
                <PdfTableCell isHeader flex={2}>Data</PdfTableCell>
                <PdfTableCell isHeader flex={3}>Paciente</PdfTableCell>
                <PdfTableCell isHeader flex={3}>Protocolo</PdfTableCell>
                <PdfTableCell isHeader flex={3}>Item Utilizado</PdfTableCell>
                <PdfTableCell isHeader align="right" flex={1}>Qtd.</PdfTableCell>
                <PdfTableCell isHeader align="center" flex={1}>Un.</PdfTableCell>
              </PdfTableHeader>
              {rows.map((row, index) => (
                <PdfTableRow key={row.procedure_id || index} isStriped={index % 2 === 1}>
                  <PdfTableCell flex={2}>
                    {format(new Date(row.performed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </PdfTableCell>
                  <PdfTableCell flex={3}>
                    <Text style={pdfStyles.textBold}>{row.patient_name}</Text>
                  </PdfTableCell>
                  <PdfTableCell flex={3}>
                    {row.protocol_name || "Aplicação Avulsa"}
                  </PdfTableCell>
                  <PdfTableCell flex={3}>
                    <Text style={pdfStyles.textBold}>{row.item_name}</Text>
                  </PdfTableCell>
                  <PdfTableCell align="right" flex={1}>
                    <Text style={[pdfStyles.textBold, { color: "#b91c1c" }]}>
                      {Number(row.quantity_used).toLocaleString("pt-BR")}
                    </Text>
                  </PdfTableCell>
                  <PdfTableCell align="center" flex={1}>
                    <Text style={{ fontSize: 7, color: "#9ca3af" }}>{row.control_unit}</Text>
                  </PdfTableCell>
                </PdfTableRow>
              ))}
            </PdfTable>
          </View>
        </>
      )}
    </PdfDocumentLayout>
  );
}

export { TraceabilityDocument as TraceabilityReport };
