/**
 * StockPositionDocument.tsx
 *
 * Documento PDF de Posição de Estoque.
 * RECEBE dados como props — NÃO faz fetch interno.
 */
import { View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { PdfDocumentLayout, pdfStyles, PdfTable, PdfTableHeader, PdfTableRow, PdfTableCell } from "../../pdf";
import type { StockPositionRow, ReportFilter } from "../../schemas/report.schema";

interface Props {
  data: StockPositionRow[];
  filter: ReportFilter;
  orientation?: "portrait" | "landscape";
}

export function StockPositionDocument({ data: stock, filter, orientation = "landscape" }: Props) {
  let subtitle = "Visão geral de saldos e validades";
  if (filter.itemType === "medication") subtitle += " · Apenas Medicamentos";
  if (filter.itemType === "material") subtitle += " · Apenas Materiais";
  if (filter.categoryId) subtitle += " · Categoria Filtrada";

  const filtersText = [
    filter.itemType ? `Tipo: ${filter.itemType === "medication" ? "Medicamento" : "Material"}` : null,
    filter.categoryId ? "Categoria Filtrada" : null,
    filter.supplierId ? "Fornecedor Filtrado" : null,
  ].filter(Boolean).join(" | ") || "Todos os itens de estoque";

  const itemsBelowMin = stock.filter(s => Number(s.current_stock) < Number(s.minimum_stock)).length;
  const totalItems = stock.length;
  const expiringCount = stock.filter(s => {
    if (!s.next_expiration_date) return false;
    const exp = new Date(s.next_expiration_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return exp <= thirtyDaysFromNow;
  }).length;

  return (
    <PdfDocumentLayout
      title="Posição de Estoque"
      subtitle={subtitle}
      filtersText={filtersText}
      orientation={orientation}
    >
      {/* KPIs */}
      <View style={pdfStyles.kpiRow}>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiNeutral]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiNeutralText]}>Total de Itens</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiNeutralText]}>{totalItems}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, itemsBelowMin > 0 ? pdfStyles.kpiDanger : pdfStyles.kpiSuccess]}>
          <Text style={[pdfStyles.kpiLabel, itemsBelowMin > 0 ? pdfStyles.kpiDangerText : pdfStyles.kpiSuccessText]}>
            Abaixo do Mínimo
          </Text>
          <Text style={[pdfStyles.kpiValue, itemsBelowMin > 0 ? pdfStyles.kpiDangerText : pdfStyles.kpiSuccessText]}>
            {itemsBelowMin}
          </Text>
        </View>
        <View style={[pdfStyles.kpiCard, expiringCount > 0 ? pdfStyles.kpiWarning : pdfStyles.kpiNeutral]}>
          <Text style={[pdfStyles.kpiLabel, expiringCount > 0 ? pdfStyles.kpiWarningText : pdfStyles.kpiNeutralText]}>
            Vencendo em 30d
          </Text>
          <Text style={[pdfStyles.kpiValue, expiringCount > 0 ? pdfStyles.kpiWarningText : pdfStyles.kpiNeutralText]}>
            {expiringCount}
          </Text>
        </View>
      </View>

      {/* Tabela */}
      <View style={pdfStyles.section}>
        {stock.length === 0 ? (
          <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
            Nenhum item encontrado para os filtros selecionados.
          </Text>
        ) : (
          <PdfTable>
            <PdfTableHeader>
              <PdfTableCell isHeader flex={3}>Item</PdfTableCell>
              <PdfTableCell isHeader flex={2}>Categoria</PdfTableCell>
              <PdfTableCell isHeader align="right" flex={1}>Saldo</PdfTableCell>
              <PdfTableCell isHeader align="right" flex={1}>Mínimo</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={1}>Lotes</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={2}>Próx. Vencimento</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={1}>Status</PdfTableCell>
            </PdfTableHeader>
            {stock.map((row, index) => {
              const isLowStock = Number(row.current_stock) < Number(row.minimum_stock);
              let expDate: Date | null = null;
              let isExpired = false;
              let isExpiring = false;
              if (row.next_expiration_date) {
                expDate = new Date(row.next_expiration_date);
                isExpired = expDate < new Date();
                const thirtyDays = new Date();
                thirtyDays.setDate(thirtyDays.getDate() + 30);
                isExpiring = !isExpired && expDate <= thirtyDays;
              }

              return (
                <PdfTableRow key={row.item_id || index} isStriped={index % 2 === 1}>
                  <PdfTableCell flex={3}>
                    <Text style={[pdfStyles.textBold, { color: isLowStock ? "#b91c1c" : "#111827" }]}>
                      {row.item_name}
                    </Text>
                  </PdfTableCell>
                  <PdfTableCell flex={2}>{row.category_name || "—"}</PdfTableCell>
                  <PdfTableCell align="right" flex={1}>
                    <Text style={[pdfStyles.textBold, { color: isLowStock ? "#b91c1c" : "#111827" }]}>
                      {Number(row.current_stock).toLocaleString("pt-BR")}
                    </Text>
                    <Text style={{ fontSize: 6.5, color: "#9ca3af" }}> {row.control_unit}</Text>
                  </PdfTableCell>
                  <PdfTableCell align="right" flex={1}>
                    <Text style={{ color: "#6b7280" }}>{Number(row.minimum_stock).toLocaleString("pt-BR")}</Text>
                  </PdfTableCell>
                  <PdfTableCell align="center" flex={1}>
                    <Text style={pdfStyles.textBold}>{row.active_batches}</Text>
                  </PdfTableCell>
                  <PdfTableCell align="center" flex={2}>
                    {expDate ? (
                      <Text style={{ color: isExpired ? "#b91c1c" : isExpiring ? "#92400e" : "#374151", fontFamily: isExpired || isExpiring ? "Helvetica-Bold" : "Helvetica" }}>
                        {format(expDate, "dd/MM/yyyy")}
                      </Text>
                    ) : (
                      <Text style={pdfStyles.textMuted}>—</Text>
                    )}
                  </PdfTableCell>
                  <PdfTableCell align="center" flex={1}>
                    {isLowStock ? (
                      <Text style={pdfStyles.badgeDanger}>Baixo</Text>
                    ) : isExpired ? (
                      <Text style={pdfStyles.badgeDanger}>Vencido</Text>
                    ) : isExpiring ? (
                      <Text style={pdfStyles.badgeWarning}>Vencendo</Text>
                    ) : (
                      <Text style={pdfStyles.badgeSuccess}>OK</Text>
                    )}
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

// Manter compatibilidade com nome antigo durante transição
export { StockPositionDocument as StockPositionReport };
