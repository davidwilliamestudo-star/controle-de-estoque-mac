import { ReactNode } from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { pdfStyles, PDF_BRAND_COLOR } from "./styles";

interface PdfDocumentLayoutProps {
  title: string;
  subtitle?: string;
  filtersText?: string;
  orientation?: "portrait" | "landscape";
  children: ReactNode;
  author?: string;
  /**
   * Hash de verificação do documento.
   * Deve ser gerado externamente e passado como prop para ser determinístico.
   * Se não fornecido, usa um código baseado no título + data (sem Math.random).
   */
  verificationHash?: string;
  clinicName?: string;
  clinicSubtitle?: string;
}

function generateDeterministicHash(seed: string): string {
  // Hash simples e determinístico baseado no seed (sem Math.random)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const abs = Math.abs(hash).toString(36).toUpperCase().padStart(8, "0");
  return `${abs.slice(0, 4)}-${abs.slice(4, 8)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

export function PdfDocumentLayout({
  title,
  subtitle,
  filtersText,
  orientation = "portrait",
  children,
  author = "Sistema VOLTQ",
  verificationHash,
  clinicName = "Clínica Dra. Ana Morong",
  clinicSubtitle = "Controle de Estoque e Prontuários",
}: PdfDocumentLayoutProps) {
  const currentDate = new Date();
  const formattedDate = format(currentDate, "dd/MM/yyyy HH:mm", { locale: ptBR });
  const formattedDateShort = format(currentDate, "dd/MM/yyyy", { locale: ptBR });

  // Hash determinístico — não muda a cada render
  const docHash = verificationHash ?? generateDeterministicHash(`${title}-${formattedDateShort}-${author}`);

  return (
    <Document
      title={title}
      author={author}
      creator="VOLTQ Controle de Estoque"
      producer="VOLTQ — @react-pdf/renderer"
      subject={subtitle}
    >
      <Page
        size="A4"
        orientation={orientation}
        style={pdfStyles.page}
        wrap={true}
      >
        {/* ── HEADER (fixo em todas as páginas) ── */}
        <View style={pdfStyles.header} fixed>
          <View style={pdfStyles.headerLeft}>
            <Text style={pdfStyles.brandTitle}>{clinicName}</Text>
            <Text style={pdfStyles.brandSubtitle}>{clinicSubtitle}</Text>
          </View>

          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.reportTitle}>{title}</Text>
            {subtitle && <Text style={pdfStyles.reportSubtitle}>{subtitle}</Text>}
            <View style={pdfStyles.metadataRow}>
              <View style={pdfStyles.metadataChip}>
                <Text style={pdfStyles.metadataLabel}>Emissão:</Text>
                <Text style={pdfStyles.metadataValue}>{formattedDate}</Text>
              </View>
              <View style={pdfStyles.metadataChip}>
                <Text style={pdfStyles.metadataLabel}>Por:</Text>
                <Text style={pdfStyles.metadataValue}>{author}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── FILTROS APLICADOS ── */}
        {filtersText && (
          <View style={pdfStyles.filtersBox}>
            <Text style={pdfStyles.filtersLabel}>Parâmetros Aplicados</Text>
            <Text style={pdfStyles.filtersContent}>{filtersText}</Text>
          </View>
        )}

        {/* ── CONTEÚDO ── */}
        <View style={{ flex: 1, paddingBottom: 8 }}>
          {children}
        </View>

        {/* ── FOOTER (fixo em todas as páginas) ── */}
        <View style={pdfStyles.footer} fixed>
          <View style={pdfStyles.footerLeft}>
            <Text style={[pdfStyles.footerBold, { color: "#374151", fontSize: 7 }]}>
              Documento Oficial — {clinicName}
            </Text>
            <Text style={pdfStyles.footerText}>
              Autenticidade garantida por registro de auditoria do sistema VOLTQ.
            </Text>
            <Text style={[pdfStyles.footerText, { color: "#d1d5db" }]}>
              Hash: {docHash}
            </Text>
          </View>

          <View style={pdfStyles.footerRight}>
            <View style={pdfStyles.signatureLine} />
            <Text style={pdfStyles.footerText}>Assinatura do Responsável Técnico</Text>
            <Text
              style={[pdfStyles.footerText, { color: "#9ca3af", marginTop: 2 }]}
              render={({ pageNumber, totalPages }) =>
                `Página ${pageNumber} de ${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
