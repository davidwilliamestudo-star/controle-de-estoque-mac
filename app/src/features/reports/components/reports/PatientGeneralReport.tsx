/**
 * PatientGeneralDocument.tsx
 *
 * Documento PDF Analítico do Paciente.
 * RECEBE dados como props — NÃO faz fetch interno.
 */
import { View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { PdfDocumentLayout, pdfStyles, PdfTable, PdfTableHeader, PdfTableRow, PdfTableCell } from "../../pdf";
import type { PatientGeneralReportData } from "../../schemas/report.schema";

interface Props {
  data: PatientGeneralReportData | null;
  patientId?: string;
  orientation?: "portrait" | "landscape";
}

function formatDate(value?: string | null): string {
  if (!value) return "Não informado";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd/MM/yyyy");
}

export function PatientGeneralDocument({ data, patientId, orientation = "portrait" }: Props) {
  if (!patientId) {
    return (
      <PdfDocumentLayout title="Relatório Analítico do Paciente" subtitle="Nenhum paciente selecionado">
        <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
          Selecione um paciente nos filtros para gerar este relatório.
        </Text>
      </PdfDocumentLayout>
    );
  }

  if (!data || !data.patient) {
    return (
      <PdfDocumentLayout title="Relatório Analítico do Paciente" subtitle="Paciente não encontrado">
        <Text style={[pdfStyles.tableCell, { color: "#b91c1c" }]}>
          Não foi possível encontrar os dados deste paciente. Verifique se o cadastro está ativo.
        </Text>
      </PdfDocumentLayout>
    );
  }

  const { patient, procedures, used_items, used_batches } = data;
  const finalized = procedures.filter(p => p.status === "finalized").length;
  const intercurrences = procedures.filter(p => Number(p.had_intercurrence) === 1).length;

  return (
    <PdfDocumentLayout
      title="Relatório Analítico do Paciente"
      subtitle={patient.full_name}
      filtersText={`Ficha Cadastral e Prontuário · ${patient.full_name}`}
      orientation={orientation}
    >
      {/* KPIs */}
      <View style={pdfStyles.kpiRow}>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiSuccess]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiSuccessText]}>Aplicações Finalizadas</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiSuccessText]}>{finalized}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiInfo]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiInfoText]}>Itens Utilizados</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiInfoText]}>{used_items.length}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, pdfStyles.kpiBrand]}>
          <Text style={[pdfStyles.kpiLabel, pdfStyles.kpiBrandText]}>Lotes Usados</Text>
          <Text style={[pdfStyles.kpiValue, pdfStyles.kpiBrandText]}>{used_batches.length}</Text>
        </View>
        <View style={[pdfStyles.kpiCard, intercurrences > 0 ? pdfStyles.kpiDanger : pdfStyles.kpiNeutral]}>
          <Text style={[pdfStyles.kpiLabel, intercurrences > 0 ? pdfStyles.kpiDangerText : pdfStyles.kpiNeutralText]}>
            Intercorrências
          </Text>
          <Text style={[pdfStyles.kpiValue, intercurrences > 0 ? pdfStyles.kpiDangerText : pdfStyles.kpiNeutralText]}>
            {intercurrences}
          </Text>
        </View>
      </View>

      {/* Dados cadastrais */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Dados Cadastrais</Text>
        <View style={pdfStyles.patientCard}>
          <View style={pdfStyles.row}>
            <View style={pdfStyles.col}>
              <Text style={pdfStyles.tableCell}>
                <Text style={pdfStyles.textBold}>Nome: </Text>{patient.full_name}
              </Text>
              <Text style={pdfStyles.tableCell}>
                <Text style={pdfStyles.textBold}>Telefone: </Text>{patient.phone || "Não informado"}
              </Text>
              <Text style={pdfStyles.tableCell}>
                <Text style={pdfStyles.textBold}>E-mail: </Text>{patient.email || "Não informado"}
              </Text>
            </View>
            <View style={pdfStyles.col}>
              <Text style={pdfStyles.tableCell}>
                <Text style={pdfStyles.textBold}>Nascimento: </Text>{formatDate(patient.birth_date)}
              </Text>
              <Text style={pdfStyles.tableCell}>
                <Text style={pdfStyles.textBold}>Paciente desde: </Text>{formatDate(patient.created_at)}
              </Text>
              <Text style={pdfStyles.tableCell}>
                <Text style={pdfStyles.textBold}>Alertas: </Text>
                <Text style={{ color: patient.alert_notes ? "#b91c1c" : "#9ca3af" }}>
                  {patient.alert_notes || "Sem alertas cadastrados"}
                </Text>
              </Text>
            </View>
          </View>
          {patient.notes && (
            <View style={{ marginTop: 4 }}>
              <Text style={pdfStyles.tableCell}>
                <Text style={pdfStyles.textBold}>Observações: </Text>{patient.notes}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Histórico de aplicações */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Histórico de Aplicações ({procedures.length})</Text>
        {procedures.length === 0 ? (
          <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
            Nenhuma aplicação registrada para este paciente.
          </Text>
        ) : (
          <PdfTable>
            <PdfTableHeader>
              <PdfTableCell isHeader flex={2}>Data</PdfTableCell>
              <PdfTableCell isHeader flex={4}>Protocolo</PdfTableCell>
              <PdfTableCell isHeader flex={3}>Área Corporal</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={1}>Itens</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={2}>Status</PdfTableCell>
            </PdfTableHeader>
            {procedures.map((procedure, index) => (
              <PdfTableRow key={procedure.id} isStriped={index % 2 === 1}>
                <PdfTableCell flex={2}>{formatDate(procedure.performed_at)}</PdfTableCell>
                <PdfTableCell flex={4}>
                  {procedure.protocol_name || "Aplicação avulsa"}
                </PdfTableCell>
                <PdfTableCell flex={3}>{procedure.body_area_name || "—"}</PdfTableCell>
                <PdfTableCell align="center" flex={1}>
                  <Text style={pdfStyles.textBold}>{procedure.total_items_used}</Text>
                </PdfTableCell>
                <PdfTableCell align="center" flex={2}>
                  {procedure.status === "finalized" ? (
                    <Text style={pdfStyles.badgeSuccess}>Finalizada</Text>
                  ) : Number(procedure.had_intercurrence) === 1 ? (
                    <Text style={pdfStyles.badgeWarning}>Intercorrência</Text>
                  ) : (
                    <Text style={pdfStyles.badgeInfo}>{procedure.status}</Text>
                  )}
                </PdfTableCell>
              </PdfTableRow>
            ))}
          </PdfTable>
        )}
      </View>

      {/* Evoluções e intercorrências */}
      {procedures.some(p => p.evolution_text || p.intercurrence_description) && (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Evoluções e Intercorrências</Text>
          {procedures
            .filter(p => p.evolution_text || p.intercurrence_description)
            .map(procedure => (
              <View
                key={procedure.id}
                style={{
                  backgroundColor: "#f9fafb",
                  padding: 8,
                  borderRadius: 4,
                  borderWidth: 0.5,
                  borderColor: "#e5e7eb",
                  marginBottom: 6,
                }}
              >
                <Text style={[pdfStyles.tableCell, pdfStyles.textBold, { marginBottom: 3, color: "#374151" }]}>
                  {formatDate(procedure.performed_at)} — {procedure.protocol_name || "Aplicação avulsa"}
                </Text>
                {procedure.evolution_text && (
                  <Text style={[pdfStyles.tableCell, { color: "#4b5563", lineHeight: 1.4 }]}>
                    {procedure.evolution_text}
                  </Text>
                )}
                {procedure.intercurrence_description && (
                  <Text style={[pdfStyles.tableCell, { color: "#b91c1c", marginTop: 3, lineHeight: 1.4 }]}>
                    ⚠ Intercorrência: {procedure.intercurrence_description}
                  </Text>
                )}
              </View>
            ))}
        </View>
      )}

      {/* Produtos e materiais consumidos */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Insumos Consumidos ({used_items.length} itens)</Text>
        {used_items.length === 0 ? (
          <Text style={[pdfStyles.tableCell, pdfStyles.textMuted]}>
            Nenhum produto registrado em aplicações finalizadas.
          </Text>
        ) : (
          <PdfTable>
            <PdfTableHeader>
              <PdfTableCell isHeader flex={5}>Item</PdfTableCell>
              <PdfTableCell isHeader flex={3}>Tipo</PdfTableCell>
              <PdfTableCell isHeader align="right" flex={2}>Quantidade Total</PdfTableCell>
              <PdfTableCell isHeader align="center" flex={1}>Lotes</PdfTableCell>
            </PdfTableHeader>
            {used_items.map((item, index) => (
              <PdfTableRow key={`${item.item_name}-${item.item_type}`} isStriped={index % 2 === 1}>
                <PdfTableCell flex={5}>
                  <Text style={pdfStyles.textBold}>{item.item_name}</Text>
                </PdfTableCell>
                <PdfTableCell flex={3}>
                  {item.item_type === "medication" ? "Medicamento" : item.item_type === "material" ? "Material" : item.item_type}
                </PdfTableCell>
                <PdfTableCell align="right" flex={2}>
                  <Text style={[pdfStyles.textBold, { color: "#b91c1c" }]}>
                    {Number(item.total_quantity).toLocaleString("pt-BR")}
                  </Text>
                  <Text style={{ fontSize: 6.5, color: "#9ca3af" }}> {item.unit}</Text>
                </PdfTableCell>
                <PdfTableCell align="center" flex={1}>
                  {item.batches_used}
                </PdfTableCell>
              </PdfTableRow>
            ))}
          </PdfTable>
        )}
      </View>

      {/* Lotes utilizados */}
      {used_batches.length > 0 && (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Rastreabilidade de Lotes ({used_batches.length})</Text>
          <PdfTable>
            <PdfTableHeader>
              <PdfTableCell isHeader flex={4}>Item</PdfTableCell>
              <PdfTableCell isHeader flex={3}>Número do Lote</PdfTableCell>
              <PdfTableCell isHeader flex={2}>Validade</PdfTableCell>
              <PdfTableCell isHeader align="right" flex={2}>Qtd. Utilizada</PdfTableCell>
            </PdfTableHeader>
            {used_batches.map((batch, index) => (
              <PdfTableRow key={`${batch.item_name}-${batch.batch_number}-${index}`} isStriped={index % 2 === 1}>
                <PdfTableCell flex={4}>
                  <Text style={pdfStyles.textBold}>{batch.item_name}</Text>
                </PdfTableCell>
                <PdfTableCell flex={3}>
                  <Text style={{ fontFamily: "Helvetica", fontSize: 8, color: "#374151" }}>
                    {batch.batch_number || "—"}
                  </Text>
                </PdfTableCell>
                <PdfTableCell flex={2}>
                  {formatDate(batch.expiration_date)}
                </PdfTableCell>
                <PdfTableCell align="right" flex={2}>
                  <Text style={[pdfStyles.textBold, { color: "#b91c1c" }]}>
                    {Number(batch.total_quantity).toLocaleString("pt-BR")}
                  </Text>
                  <Text style={{ fontSize: 6.5, color: "#9ca3af" }}> {batch.unit}</Text>
                </PdfTableCell>
              </PdfTableRow>
            ))}
          </PdfTable>
        </View>
      )}
    </PdfDocumentLayout>
  );
}

export { PatientGeneralDocument as PatientGeneralReport };
