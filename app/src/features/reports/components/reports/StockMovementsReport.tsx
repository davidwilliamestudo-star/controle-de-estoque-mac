/**
 * StockMovementsDocument.tsx
 *
 * Documento PDF de Movimentações de Estoque.
 * RECEBE dados como props — NÃO faz fetch interno.
 */
import { View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PdfDocumentLayout, pdfStyles, PdfTable, PdfTableHeader, PdfTableRow, PdfTableCell } from "../../pdf";
import type { StockMovementRow, ReportFilter } from "../../schemas/report.schema";

interface Props {
  data: StockMovementRow[];
  filter: ReportFilter;
  orientation?: "portrait" | "landscape";
}

const typeMap: Record<string, string> = {
  entry: "Entrada",
  exit: "Saída Manual",
  automatic_exit: "Uso em Paciente",
  adjustment: "Ajuste",
  loss: "Perda",
  expired: "Vencimento",
  correction: "Correção",
};

const typeColorMap: Record<string, string> = {
  entry: "#065f46",
  adjustment: "#1e40af",
  automatic_exit: "#374151",
  exit: "#b91c1c",
  loss: "#b91c1c",
  expired: "#b91c1c",
  correction: "#92400e",
};

export function StockMovementsDocument({ data: movements, filter, orientation = "landscape" }: Props) {
  const subtitle = [
    filter.startDate ? `De ${format(new Date(filter.startDate), "dd/MM/yy")}` : "Início",
    filter.endDate ? `até ${format(new Date(filter.endDate), "dd/MM/yy")}` : "Hoje",
    filter.movementType === "entry" ? "· Apenas Entradas" : null,
    filter.movementType === "exit" ? "· Apenas Saídas" : null,
    filter.movementType === "usage" ? "· Apenas Uso em Pacientes" : null,
  ].filter(Boolean).join(" ");

  const filtersText = [
    filter.startDate ? `De: ${filter.startDate}` : null,
    filter.endDate ? `Até: ${filter.endDate}` : null,
    filter.movementType && filter.movementType !== "all" ? `Tipo: ${typeMap[filter.movementType] || filter.movementType}` : null,
    filter.itemType ? `Categoria: ${filter.itemType === "medication" ? "Medicamentos" : "Materiais"}` : null,
    filter.supplierId ? "Fornecedor Selecionado" : null,
    filter.userId ? "Responsável Selecionado" : null,
  ].filter(Boolean).join(" | ") || "Todas as movimentações";

  const entries = movements.filter(m => m.movement_type === "entry").length;
  const exits = movements.filter(m => ["exit", "loss", "expired"].includes(m.movement_type)).length;
  const usages = movements.filter(m => m.movement_type === "automatic_exit").length;

  return (
    <PdfDocumentLayout
      title="Histórico de Movimentações"
      subtitle={subtitle}
      filtersText={filtersText}
      orientation={orientation}
    >
      {/* KPIs */}
      <View style={pdfStyles.kpiRow}>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiNeutral]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiNeutralText]}>Total de Registros</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiNeutralText]}>{movements.length}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiSuccess]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiSuccessText]}>Entradas</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiSuccessText]}>{entries}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiDanger]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiDangerText]}>Saídas / Perdas</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiDangerText]}>{exits}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiInfo]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiInfoText]}>Uso em Pacientes</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiInfoText]}>{usages}</Text>
        </View>
      </View>

      {/* Tabela */}
      <View style={pdfStyles.section}>
        {movements.length === 0 ? (
          <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
            Nenhuma movimentação encontrada para os filtros aplicados.
          </Text>
        ) : (
          <PdfTable>
            <PdfTableHeader>
              <PdfTableCell isHeader flex={2}>Data/Hora</PdfTableCell>
              <PdfTableCell isHeader flex={2}>Tipo</PdfTableCell>
              <PdfTableCell isHeader flex={4}>Item</PdfTableCell>
              <PdfTableCell isHeader flex={2}>Lote</PdfTableCell>
              <PdfTableCell isHeader align="right" flex={1}>Qtd.</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={1}>Un.</PdfTableCell>
              <PdfTableCell isHeader flex={3}>Motivo</PdfTableCell>
            </PdfTableHeader>
            {movements.map((row, index) => {
              const isEntry = row.movement_type === "entry" || (row.movement_type === "adjustment" && Number(row.control_quantity) > 0);
              const typeLabel = typeMap[row.movement_type] || row.movement_type;
              const typeColor = typeColorMap[row.movement_type] || "#374151";
              const qty = Number(row.control_quantity);

              return (
                <PdfTableRow key={row.id || index} isStriped={index % 2 === 1}>
                  <PdfTableCell flex={2}>
                    {format(new Date(row.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </PdfTableCell>
                  <PdfTableCell flex={2}>
                    <Text style={[pdfStyles.textBold, { color: typeColor }]}>{typeLabel}</Text>
                  </PdfTableCell>
                  <PdfTableCell flex={4}>
                    <Text style={pdfStyles.textBold}>{row.item_name}</Text>
                  </PdfTableCell>
                  <PdfTableCell flex={2}>
                    <Text style={{ fontSize: 7.5, color: "#6b7280" }}>{row.batch_number || "—"}</Text>
                  </PdfTableCell>
                  <PdfTableCell align="right" flex={1}>
                    <Text style={[pdfStyles.textBold, { color: isEntry ? "#059669" : "#b91c1c" }]}>
                      {isEntry ? "+" : "-"}{Math.abs(qty).toLocaleString("pt-BR")}
                    </Text>
                  </PdfTableCell>
                  <PdfTableCell align="center" flex={1}>
                    <Text style={{ fontSize: 7, color: "#9ca3af" }}>{row.control_unit}</Text>
                  </PdfTableCell>
                  <PdfTableCell flex={3}>
                    <Text style={{ fontStyle: "italic", color: "#6b7280", fontSize: 7.5 }}>
                      {row.reason || "—"}
                    </Text>
                  </PdfTableCell>
                </PdfTableRow>
              );
            })}
          </PdfTable>
        )}
      </View>
    </PdfDocumentLayout>
  );
}

export { StockMovementsDocument as StockMovementsReport };
