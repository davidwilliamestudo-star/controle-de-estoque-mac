/**
 * ConsumptionDocument.tsx
 *
 * Documento PDF de Consumo por Período.
 * RECEBE dados como props — NÃO faz fetch interno.
 */
import { View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { PdfDocumentLayout, pdfStyles, PdfTable, PdfTableHeader, PdfTableRow, PdfTableCell } from "../../pdf";
import type { ConsumptionRow, ReportFilter } from "../../schemas/report.schema";

interface Props {
  data: ConsumptionRow[];
  filter: ReportFilter;
  orientation?: "portrait" | "landscape";
}

export function ConsumptionDocument({ data: consumption, filter, orientation = "portrait" }: Props) {
  const subtitle = [
    filter.startDate ? `De ${format(new Date(filter.startDate), "dd/MM/yy")}` : "Início",
    filter.endDate ? `até ${format(new Date(filter.endDate), "dd/MM/yy")}` : "Hoje",
  ].filter(Boolean).join(" ");

  const filtersText = [
    filter.startDate ? `De: ${filter.startDate}` : null,
    filter.endDate ? `Até: ${filter.endDate}` : null,
    filter.itemType ? `Tipo: ${filter.itemType === "medication" ? "Medicamentos" : "Materiais"}` : null,
    filter.categoryId ? "Categoria Filtrada" : null,
  ].filter(Boolean).join(" | ") || "Todos os itens consumidos no período";

  const totalConsumed = consumption.reduce((sum, r) => sum + Number(r.total_consumed), 0);
  const uniqueItems = consumption.length;

  return (
    <PdfDocumentLayout
      title="Consumo por Período"
      subtitle={subtitle}
      filtersText={filtersText}
      orientation={orientation}
    >
      {/* KPIs */}
      <View style={pdfStyles.kpiRow}>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiNeutral]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiNeutralText]}>Itens Distintos</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiNeutralText]}>{uniqueItems}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiBrand]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiBrandText]}>Unidades Consumidas</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiBrandText]}>
            {totalConsumed.toLocaleString("pt-BR")}
          </Text>
          <Text style={[pdfStyles.kpiSubtext, pdfStyles.kpiBrandText]}>total geral</Text>
        </View>
      </View>

      {/* Tabela */}
      <View style={pdfStyles.section}>
        {consumption.length === 0 ? (
          <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
            Nenhum consumo registrado para o período selecionado.
          </Text>
        ) : (
          <PdfTable>
            <PdfTableHeader>
              <PdfTableCell isHeader flex={5}>Item Consumido</PdfTableCell>
              <PdfTableCell isHeader align="right" flex={2}>Qtd. Total</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={1}>Un.</PdfTableCell>
            </PdfTableHeader>
            {consumption.map((row, index) => (
              <PdfTableRow key={row.item_id || index} isStriped={index % 2 === 1}>
                <PdfTableCell flex={5}>
                  <Text style={pdfStyles.textBold}>{row.item_name}</Text>
                </PdfTableCell>
                <PdfTableCell align="right" flex={2}>
                  <Text style={[pdfStyles.textBold, { color: "#b91c1c" }]}>
                    {Number(row.total_consumed).toLocaleString("pt-BR")}
                  </Text>
                </PdfTableCell>
                <PdfTableCell align="center" flex={1}>
                  <Text style={{ fontSize: 7, color: "#9ca3af" }}>{row.control_unit}</Text>
                </PdfTableCell>
              </PdfTableRow>
            ))}
          </PdfTable>
        )}
      </View>
    </PdfDocumentLayout>
  );
}

export { ConsumptionDocument as ConsumptionReport };
