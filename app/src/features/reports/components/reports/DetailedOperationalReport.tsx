/**
 * DetailedOperationalDocument.tsx
 *
 * Documento PDF genérico para relatórios operacionais detalhados.
 * RECEBE dados como props — NÃO faz fetch interno.
 * Orientação controlada externamente (sem hardcode).
 */
import { View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PdfDocumentLayout, pdfStyles, PdfTable, PdfTableHeader, PdfTableRow, PdfTableCell } from "../../pdf";
import type { DetailedReportData, DetailedReportColumn, ReportFilter } from "../../schemas/report.schema";

interface Props {
  data: DetailedReportData | null;
  filter: ReportFilter;
  orientation?: "portrait" | "landscape";
}

function formatCell(key: string, value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString("pt-BR")
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  }

  const lowerKey = key.toLowerCase();
  const isDateField =
    lowerKey.includes("date") ||
    lowerKey.includes("_at") ||
    lowerKey.includes("expiration") ||
    lowerKey.includes("performed");

  if (isDateField) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const hasTime = value.includes(":");
      return format(parsed, hasTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy", { locale: ptBR });
    }
  }

  // Mapeamento de valores de auditoria
  const auditActionMap: Record<string, string> = {
    report_viewed: "Relatório Visualizado",
    procedure_finalized: "Procedimento Finalizado",
    patient_application_plan_created: "Plano de Aplicação Criado",
    appointment_created: "Agendamento Criado",
    labels_job_created: "Geração de Etiquetas",
    stock_entry_movement_created: "Entrada de Estoque",
    inventory_batch_created: "Lote Criado",
    report: "Relatório",
    procedure: "Procedimento",
    patient_application_plan: "Plano de Aplicação",
    appointment: "Agendamento",
    label_print_job: "Impressão de Etiquetas",
    stock_movement: "Movimentação de Estoque",
    inventory_batch: "Lote",
  };

  if (lowerKey === "action" || lowerKey === "entity") {
    if (auditActionMap[value]) return auditActionMap[value];
    return value.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  return value;
}

function getCellColor(key: string, val: unknown): string {
  if (key === "status" || key === "type") {
    const raw = String(val).toLowerCase();
    if (raw.includes("critico") || raw.includes("inativo") || raw.includes("saida") || raw.includes("perda")) return "#b91c1c";
    if (raw.includes("alerta") || raw.includes("vencendo")) return "#92400e";
    if (raw.includes("normal") || raw.includes("ativo") || raw.includes("entrada") || raw.includes("ok")) return "#065f46";
  }
  return "#374151";
}

const TONE_STYLES: Record<string, { card: any; text: any }> = {
  success: { card: pdfStyles.kpiSuccess, text: pdfStyles.kpiSuccessText },
  warning: { card: pdfStyles.kpiWarning, text: pdfStyles.kpiWarningText },
  danger: { card: pdfStyles.kpiDanger, text: pdfStyles.kpiDangerText },
  info: { card: pdfStyles.kpiInfo, text: pdfStyles.kpiInfoText },
  neutral: { card: pdfStyles.kpiNeutral, text: pdfStyles.kpiNeutralText },
};

export function DetailedOperationalDocument({ data, filter, orientation = "landscape" }: Props) {
  if (!data) {
    return (
      <PdfDocumentLayout title="Relatório Indisponível" subtitle="Dados não encontrados" orientation={orientation}>
        <Text style={[pdfStyles.tableCell, { color: "#b91c1c" }]}>
          Não foi possível carregar os dados deste relatório.
        </Text>
      </PdfDocumentLayout>
    );
  }

  const filtersText = [
    filter.startDate ? `De: ${filter.startDate}` : null,
    filter.endDate ? `Até: ${filter.endDate}` : null,
    filter.categoryId ? "Categoria Filtrada" : null,
    filter.medicationId || filter.materialId ? "Insumo Filtrado" : null,
    filter.supplierId ? "Fornecedor Filtrado" : null,
    filter.userId ? "Profissional Filtrado" : null,
    filter.status ? `Filtro: ${filter.status}` : null,
  ].filter(Boolean).join(" | ") || "Todos os registros operacionais";

  const colCount = data.columns.length;
  // Calcular largura distribuída baseada no número de colunas
  const colFlex = Math.max(1, Math.floor(12 / colCount));

  return (
    <PdfDocumentLayout
      title={data.title}
      subtitle={data.subtitle}
      filtersText={filtersText}
      orientation={orientation}
    >
      {/* KPIs dinâmicos */}
      {data.summary.length > 0 && (
        <View style={pdfStyles.kpiRow}>
          {data.summary.map((item, idx) => {
            const tone = TONE_STYLES[item.tone || "neutral"] || TONE_STYLES.neutral;
            return (
              <View
                key={item.label}
                style={[pdfStyles.kpiCard, tone.card, idx < data.summary.length - 1 ? {} : {}]}
              >
                <Text style={[pdfStyles.kpiLabel, tone.text]}>{item.label}</Text>
                <Text style={[pdfStyles.kpiValue, tone.text, { fontSize: 16 }]}>{String(item.value)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Observações */}
      {data.notes && data.notes.length > 0 && (
        <View style={pdfStyles.infoBox}>
          <Text style={pdfStyles.infoBoxTitle}>Observações</Text>
          {data.notes.map((note, idx) => (
            <Text key={idx} style={pdfStyles.infoBoxText}>• {note}</Text>
          ))}
        </View>
      )}

      {/* Tabela dinâmica */}
      <View style={pdfStyles.section}>
        {data.rows.length === 0 ? (
          <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
            Nenhum registro encontrado para os filtros selecionados.
          </Text>
        ) : (
          <PdfTable>
            <PdfTableHeader>
              {data.columns.map((col: DetailedReportColumn) => (
                <PdfTableCell key={col.key} isHeader flex={colFlex} align={col.align}>
                  {col.label}
                </PdfTableCell>
              ))}
            </PdfTableHeader>
            {data.rows.map((row, index) => (
              <PdfTableRow key={index} isStriped={index % 2 === 1}>
                {data.columns.map((col: DetailedReportColumn) => {
                  const rawVal = row[col.key];
                  const formatted = formatCell(col.key, rawVal as string | number | null);
                  const color = getCellColor(col.key, rawVal);
                  return (
                    <PdfTableCell key={col.key} flex={colFlex} align={col.align}>
                      <Text style={{ color }}>{formatted}</Text>
                    </PdfTableCell>
                  );
                })}
              </PdfTableRow>
            ))}
          </PdfTable>
        )}
      </View>
    </PdfDocumentLayout>
  );
}

export { DetailedOperationalDocument as DetailedOperationalReport };
