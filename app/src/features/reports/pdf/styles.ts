import { StyleSheet } from "@react-pdf/renderer";

/**
 * pdfStyles.ts — Sistema de design unificado para todos os documentos PDF.
 *
 * Hierarquia tipográfica e espaçamento em múltiplos de 4pt (base PDF).
 * Paleta institucional: verde #1A5347, cinzas neutros.
 */
export const PDF_BRAND_COLOR = "#1A5347";
export const PDF_BRAND_LIGHT = "#256b5d";
export const PDF_ACCENT = "#B8A083";

export const pdfStyles = StyleSheet.create({
  // ─── Página ────────────────────────────────────────────────────────────────
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingTop: 28,
    paddingBottom: 52, // espaço para footer fixo
    paddingHorizontal: 36,
    color: "#111827",
  },

  // ─── Header (fixo em todas as páginas) ──────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: PDF_BRAND_COLOR,
    borderBottomStyle: "solid",
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "column",
    gap: 3,
    maxWidth: "55%",
  },
  brandTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: PDF_BRAND_COLOR,
  },
  brandSubtitle: {
    fontSize: 7.5,
    color: "#6b7280",
    letterSpacing: 0.3,
  },
  brandAddress: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
  },
  reportTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    textAlign: "right",
  },
  reportSubtitle: {
    fontSize: 8.5,
    color: "#6b7280",
    textAlign: "right",
  },
  metadataRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  metadataChip: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  metadataLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#9ca3af",
  },
  metadataValue: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },

  // ─── Filtros aplicados ───────────────────────────────────────────────────
  filtersBox: {
    backgroundColor: "#f9fafb",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  filtersLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#9ca3af",
    marginBottom: 3,
  },
  filtersContent: {
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#4b5563",
    lineHeight: 1.4,
  },

  // ─── KPI Cards ──────────────────────────────────────────────────────────
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    borderWidth: 0.5,
  },
  kpiLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1,
  },
  kpiSubtext: {
    fontSize: 7,
    marginTop: 2,
  },

  // KPI Tones
  kpiNeutral: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  kpiNeutralText: { color: "#374151" },
  kpiSuccess: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  kpiSuccessText: { color: "#065f46" },
  kpiWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  kpiWarningText: { color: "#92400e" },
  kpiDanger: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  kpiDangerText: { color: "#991b1b" },
  kpiInfo: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  kpiInfoText: { color: "#1e40af" },
  kpiBrand: {
    backgroundColor: "#f0fdf9",
    borderColor: "#a7f3d0",
  },
  kpiBrandText: { color: PDF_BRAND_COLOR },

  // ─── Seções ─────────────────────────────────────────────────────────────
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
    marginBottom: 8,
  },

  // ─── Tabelas ─────────────────────────────────────────────────────────────
  table: {
    width: "100%",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    minHeight: 24,
  },
  tableRowStriped: {
    backgroundColor: "#fafafa",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCellHeader: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#374151",
  },

  // ─── Badges ─────────────────────────────────────────────────────────────
  badgeSuccess: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  badgeWarning: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  badgeDanger: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  badgeInfo: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  badgeBrand: {
    backgroundColor: "#d1fae5",
    color: PDF_BRAND_COLOR,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // ─── Footer (fixo em todas as páginas) ──────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  footerLeft: {
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  footerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  footerText: {
    fontSize: 6.5,
    color: "#9ca3af",
    lineHeight: 1.4,
  },
  footerBold: {
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    fontSize: 7,
  },
  signatureLine: {
    width: 140,
    borderTopWidth: 0.5,
    borderTopColor: "#9ca3af",
    marginBottom: 4,
  },

  // ─── Utilities ──────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  col: {
    flex: 1,
  },
  textRight: { textAlign: "right" },
  textCenter: { textAlign: "center" },
  textBold: { fontFamily: "Helvetica-Bold" },
  textMuted: { color: "#9ca3af" },

  // ─── Info Box (observações) ─────────────────────────────────────────────
  infoBox: {
    backgroundColor: "#eff6ff",
    borderWidth: 0.5,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  infoBoxTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoBoxText: {
    fontSize: 7.5,
    color: "#1e3a8a",
    lineHeight: 1.5,
  },

  // ─── Sumário de Dados do Paciente ────────────────────────────────────────
  patientCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
});
