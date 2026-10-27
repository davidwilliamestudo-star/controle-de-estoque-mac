/**
 * clinicalDocumentsEngine.service.ts
 * Motor para geração de PDFs oficiais com papel timbrado da Dra. Ana Morong:
 * - TCLE (Termo de Consentimento Livre e Esclarecido)
 * - Atestado Médico / Comparecimento
 * - Receituário / Prescrição Médica
 * - Recibo Financeiro
 */
import { PDFDocument, StandardFonts, rgb, PDFImage } from "pdf-lib";
import {
  LETTERHEAD_PAGE1_BASE64,
  LETTERHEAD_PAGE2_BASE64,
} from "@/assets/contractLetterheadBase64";

export type ClinicalDocumentType =
  | "CONTRATO"
  | "TCLE"
  | "ATESTADO"
  | "RECEITUARIO"
  | "RECIBO";

export interface PatientDataForDocument {
  id: string;
  name: string;
  cpf: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface TcleFormData {
  procedureName: string;
  description: string;
  risksAndGuidelines: string;
  doctorName?: string;
  doctorCrm?: string;
  cityDate?: string;
}

export interface AtestadoFormData {
  type: "repouso" | "comparecimento" | "aptidao";
  daysCount?: number;
  periodText?: string;
  reasonOrCid?: string;
  instructions?: string;
  doctorName?: string;
  doctorCrm?: string;
  cityDate?: string;
}

export interface ReceituarioFormData {
  items: Array<{
    name: string;
    dosage: string;
    instructions: string;
  }>;
  generalInstructions?: string;
  doctorName?: string;
  doctorCrm?: string;
  cityDate?: string;
}

export interface ReciboFormData {
  amountBrl: number;
  amountExtenso: string;
  paymentMethod: string;
  servicesDescription: string;
  receiptNumber?: string;
  doctorName?: string;
  doctorCrm?: string;
  cityDate?: string;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[–—]/g, "-")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[•·]/g, "*")
    .replace(/\u00A0/g, " ")
    .replace(/…/g, "...")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFC");
}

export class ClinicalDocumentsEngine {
  /**
   * Helper que inicializa um documento com as fontes e papel timbrado
   */
  private static async createPdfWithLetterhead(): Promise<{
    pdfDoc: PDFDocument;
    fontRegular: any;
    fontBold: any;
    bgImg1: PDFImage | null;
    bgImg2: PDFImage | null;
  }> {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let bgImg1: PDFImage | null = null;
    let bgImg2: PDFImage | null = null;

    try {
      if (LETTERHEAD_PAGE1_BASE64) {
        bgImg1 = await pdfDoc.embedPng(base64ToUint8Array(LETTERHEAD_PAGE1_BASE64));
      }
      if (LETTERHEAD_PAGE2_BASE64) {
        bgImg2 = await pdfDoc.embedPng(base64ToUint8Array(LETTERHEAD_PAGE2_BASE64));
      }
    } catch (err) {
      console.warn("Aviso ao carregar papel timbrado:", err);
    }

    return { pdfDoc, fontRegular, fontBold, bgImg1, bgImg2 };
  }

  /**
   * Quebra o texto em linhas para caber na largura especificada
   */
  private static wrapText(
    text: string,
    maxWidth: number,
    font: any,
    fontSize: number
  ): string[] {
    const lines: string[] = [];
    const paragraphs = text.split("\n");

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }

      const words = paragraph.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(sanitizeText(testLine), fontSize);

        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  /**
   * 1. Gera PDF do TCLE (Termo de Consentimento Livre e Esclarecido)
   */
  public static async generateTclePdf(
    patient: PatientDataForDocument,
    data: TcleFormData
  ): Promise<{ pdfBase64: string; pageCount: number }> {
    const { pdfDoc, fontRegular, fontBold, bgImg1, bgImg2 } =
      await this.createPdfWithLetterhead();

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 54;
    const contentWidth = pageWidth - marginX * 2;
    const headerTopMargin = 135;
    const footerBottomMargin = 95;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let pageIndex = 1;

    if (bgImg1) {
      page.drawImage(bgImg1, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    }

    let y = pageHeight - headerTopMargin;

    // Título Principal
    const title = "TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - TCLE";
    const titleWidth = fontBold.widthOfTextAtSize(title, 13);
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.12, 0.28, 0.22),
    });
    y -= 18;

    const subtitle = sanitizeText(`Procedimento: ${data.procedureName}`);
    const subWidth = fontBold.widthOfTextAtSize(subtitle, 11);
    page.drawText(subtitle, {
      x: (pageWidth - subWidth) / 2,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.35, 0.28),
    });
    y -= 25;

    // Dados do Paciente em caixa
    page.drawRectangle({
      x: marginX,
      y: y - 48,
      width: contentWidth,
      height: 52,
      color: rgb(0.96, 0.98, 0.97),
      borderColor: rgb(0.8, 0.88, 0.84),
      borderWidth: 1,
    });

    page.drawText(sanitizeText(`Paciente: ${patient.name}`), {
      x: marginX + 10,
      y: y - 16,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sanitizeText(`CPF: ${patient.cpf || "Não informado"}`), {
      x: marginX + 10,
      y: y - 32,
      size: 9,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(
      sanitizeText(`Data de Nasc.: ${patient.birthDate || "-"}   Telefone: ${patient.phone || "-"}`),
      {
        x: marginX + 180,
        y: y - 32,
        size: 9,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      }
    );
    y -= 68;

    // Texto de Declaração do TCLE
    const tcleBody =
      `Por meio deste instrumento, eu, devidamente qualificado(a) acima, declaro que fui esclarecido(a) de forma clara, objetiva e compreensível pela equipe médica e pela Dra. Ana Morong (CRM ${data.doctorCrm || "CRM-PR"}) sobre a natureza, objetivos, indicações, benefícios esperados, técnicas a serem empregadas e eventuais riscos associados ao procedimento discriminado abaixo.\n\n` +
      `1. DESCRIÇÃO DO PROCEDIMENTO:\n${data.description || "Aplicação médica especializada conforme plano terapêutico individualizado."}\n\n` +
      `2. RISCOS, INTERCORRÊNCIAS POTENCIAIS E CUIDADOS:\n${data.risksAndGuidelines || "Podem ocorrer reações locais transitórias (hiperemia, edema leve, equimose local). Seguir rigorosamente as orientações pós-procedimento fornecidas pela médica."}\n\n` +
      `3. DECLARAÇÃO E CONSENTIMENTO LIVRE:\nConfirmo ter tido a oportunidade de formular perguntas, tendo sido todas sanadas a contento. Autorizo a realização do procedimento acima citado, comprometendo-me a seguir as recomendações clínicas e comparecer aos retornos agendados.`;

    const lines = this.wrapText(tcleBody, contentWidth, fontRegular, 9.5);

    for (const line of lines) {
      if (y <= footerBottomMargin + 100) {
        // Nova página
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageIndex++;
        if (bgImg2) {
          page.drawImage(bgImg2, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
          });
        }
        y = pageHeight - headerTopMargin;
      }

      if (line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.")) {
        page.drawText(sanitizeText(line), {
          x: marginX,
          y,
          size: 9.5,
          font: fontBold,
          color: rgb(0.12, 0.28, 0.22),
        });
      } else {
        page.drawText(sanitizeText(line), {
          x: marginX,
          y,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.15),
        });
      }
      y -= 13.5;
    }

    y -= 25;
    if (y <= footerBottomMargin + 85) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      pageIndex++;
      if (bgImg2) page.drawImage(bgImg2, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      y = pageHeight - headerTopMargin;
    }

    const cityDate = data.cityDate || `Curitiba - PR, ${new Date().toLocaleDateString("pt-BR")}`;
    page.drawText(sanitizeText(cityDate), {
      x: marginX,
      y,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 38;

    // Bloco de Assinaturas (Dra. Ana e Paciente)
    const signBoxWidth = 210;
    // Assinatura Paciente
    page.drawLine({
      start: { x: marginX, y },
      end: { x: marginX + signBoxWidth, y },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(sanitizeText(patient.name), {
      x: marginX,
      y: y - 12,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sanitizeText(`CPF: ${patient.cpf}`), {
      x: marginX,
      y: y - 23,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Assinatura Médica
    const docX = pageWidth - marginX - signBoxWidth;
    page.drawLine({
      start: { x: docX, y },
      end: { x: docX + signBoxWidth, y },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(sanitizeText(data.doctorName || "Dra. Ana Carla Morong"), {
      x: docX,
      y: y - 12,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sanitizeText(`Médica Responsável - CRM ${data.doctorCrm || "CRM-PR"}`), {
      x: docX,
      y: y - 23,
      size: 8,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    const pdfBytes = await pdfDoc.save();
    return {
      pdfBase64: btoa(String.fromCharCode(...pdfBytes)),
      pageCount: pageIndex,
    };
  }

  /**
   * 2. Gera PDF de Atestado Médico
   */
  public static async generateAtestadoPdf(
    patient: PatientDataForDocument,
    data: AtestadoFormData
  ): Promise<{ pdfBase64: string; pageCount: number }> {
    const { pdfDoc, fontRegular, fontBold, bgImg1 } = await this.createPdfWithLetterhead();

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 60;
    const contentWidth = pageWidth - marginX * 2;
    const headerTopMargin = 160;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    if (bgImg1) {
      page.drawImage(bgImg1, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    }

    let y = pageHeight - headerTopMargin;

    // Título Centralizado
    const title = "ATESTADO MÉDICO";
    const titleWidth = fontBold.widthOfTextAtSize(title, 18);
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.12, 0.28, 0.22),
    });
    y -= 45;

    // Corpo do Atestado
    let text = "";
    if (data.type === "comparecimento") {
      text = `Atesto para os devidos fins que o(a) paciente ${patient.name}, inscrito(a) no CPF sob o nº ${patient.cpf || "não informado"}, esteve sob atendimento médico nesta clínica no dia de hoje, no período de ${data.periodText || "atendimento clínico ambulatorial"}.`;
    } else if (data.type === "aptidao") {
      text = `Atesto para os devidos fins que examinei clinicamente o(a) paciente ${patient.name}, portador(a) do CPF nº ${patient.cpf || "não informado"}, e o(a) considero apto(a) sob o ponto de vista clínico para as atividades solicitadas nesta data.`;
    } else {
      const days = data.daysCount || 1;
      const daysText = days === 1 ? "1 (um) dia" : `${days} dias`;
      text = `Atesto para os devidos fins que o(a) paciente ${patient.name}, inscrito(a) no CPF sob o nº ${patient.cpf || "não informado"}, foi submetido(a) a atendimento e avaliação médica nesta data, necessitando de repouso e afastamento de suas atividades laborais e habituais pelo período de ${daysText}, a partir desta data.`;
    }

    if (data.reasonOrCid) {
      text += `\n\nCID / Diagnóstico Clínico (conforme autorização expressa do paciente): ${data.reasonOrCid}`;
    }

    if (data.instructions) {
      text += `\n\nObservações Médicas: ${data.instructions}`;
    }

    const lines = this.wrapText(text, contentWidth, fontRegular, 11);

    for (const line of lines) {
      page.drawText(sanitizeText(line), {
        x: marginX,
        y,
        size: 11,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 18;
    }

    y -= 45;
    const cityDate = data.cityDate || `Curitiba - PR, ${new Date().toLocaleDateString("pt-BR")}`;
    const cityWidth = fontRegular.widthOfTextAtSize(cityDate, 10);
    page.drawText(sanitizeText(cityDate), {
      x: (pageWidth - cityWidth) / 2,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    y -= 50;

    // Assinatura Centralizada da Dra. Ana
    const docName = data.doctorName || "Dra. Ana Carla Morong";
    const docCrm = `Médica - CRM ${data.doctorCrm || "CRM-PR"}`;
    const lineW = 220;

    page.drawLine({
      start: { x: (pageWidth - lineW) / 2, y },
      end: { x: (pageWidth + lineW) / 2, y },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    });

    const nameW = fontBold.widthOfTextAtSize(docName, 10.5);
    page.drawText(sanitizeText(docName), {
      x: (pageWidth - nameW) / 2,
      y: y - 14,
      size: 10.5,
      font: fontBold,
      color: rgb(0.12, 0.28, 0.22),
    });

    const crmW = fontRegular.widthOfTextAtSize(docCrm, 9);
    page.drawText(sanitizeText(docCrm), {
      x: (pageWidth - crmW) / 2,
      y: y - 27,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    const pdfBytes = await pdfDoc.save();
    return {
      pdfBase64: btoa(String.fromCharCode(...pdfBytes)),
      pageCount: 1,
    };
  }

  /**
   * 3. Gera PDF de Receituário / Prescrição Médica
   */
  public static async generateReceituarioPdf(
    patient: PatientDataForDocument,
    data: ReceituarioFormData
  ): Promise<{ pdfBase64: string; pageCount: number }> {
    const { pdfDoc, fontRegular, fontBold, bgImg1 } = await this.createPdfWithLetterhead();

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 54;
    const contentWidth = pageWidth - marginX * 2;
    const headerTopMargin = 150;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    if (bgImg1) {
      page.drawImage(bgImg1, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    }

    let y = pageHeight - headerTopMargin;

    // Título
    const title = "PRESCRIÇÃO MÉDICA";
    const titleWidth = fontBold.widthOfTextAtSize(title, 16);
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0.12, 0.28, 0.22),
    });
    y -= 30;

    // Paciente
    page.drawText(sanitizeText(`Paciente: ${patient.name}`), {
      x: marginX,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 16;
    page.drawText(sanitizeText(`CPF: ${patient.cpf || "Não informado"}   Data: ${new Date().toLocaleDateString("pt-BR")}`), {
      x: marginX,
      y,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 25;

    // Itens Prescritos
    data.items.forEach((item, index) => {
      page.drawText(sanitizeText(`${index + 1}. ${item.name}`), {
        x: marginX,
        y,
        size: 10.5,
        font: fontBold,
        color: rgb(0.12, 0.28, 0.22),
      });

      if (item.dosage) {
        page.drawText(sanitizeText(`- ${item.dosage}`), {
          x: marginX + 15,
          y: y - 13,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      if (item.instructions) {
        page.drawText(sanitizeText(`Posologia: ${item.instructions}`), {
          x: marginX + 15,
          y: y - 26,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      y -= 44;
    });

    if (data.generalInstructions) {
      y -= 10;
      page.drawText(sanitizeText("Recomendações Gerais:"), {
        x: marginX,
        y,
        size: 9.5,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 14;

      const genLines = this.wrapText(data.generalInstructions, contentWidth, fontRegular, 9);
      for (const line of genLines) {
        page.drawText(sanitizeText(line), {
          x: marginX,
          y,
          size: 9,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 13;
      }
    }

    // Assinatura Médica
    y = 130;
    const lineW = 200;
    page.drawLine({
      start: { x: (pageWidth - lineW) / 2, y },
      end: { x: (pageWidth + lineW) / 2, y },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    });

    const docName = data.doctorName || "Dra. Ana Carla Morong";
    const nameW = fontBold.widthOfTextAtSize(docName, 10);
    page.drawText(sanitizeText(docName), {
      x: (pageWidth - nameW) / 2,
      y: y - 13,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const crmText = `Médica - CRM ${data.doctorCrm || "CRM-PR"}`;
    const crmW = fontRegular.widthOfTextAtSize(crmText, 8.5);
    page.drawText(sanitizeText(crmText), {
      x: (pageWidth - crmW) / 2,
      y: y - 25,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    const pdfBytes = await pdfDoc.save();
    return {
      pdfBase64: btoa(String.fromCharCode(...pdfBytes)),
      pageCount: 1,
    };
  }

  /**
   * 4. Gera PDF de Recibo Financeiro
   */
  public static async generateReciboPdf(
    patient: PatientDataForDocument,
    data: ReciboFormData
  ): Promise<{ pdfBase64: string; pageCount: number }> {
    const { pdfDoc, fontRegular, fontBold, bgImg1 } = await this.createPdfWithLetterhead();

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 60;
    const contentWidth = pageWidth - marginX * 2;
    const headerTopMargin = 160;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    if (bgImg1) {
      page.drawImage(bgImg1, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });
    }

    let y = pageHeight - headerTopMargin;

    // Título
    const title = "RECIBO FINANCEIRO";
    const titleWidth = fontBold.widthOfTextAtSize(title, 18);
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.12, 0.28, 0.22),
    });
    y -= 40;

    // Caixa de Destaque de Valor
    const valFormatted = `R$ ${data.amountBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    page.drawRectangle({
      x: pageWidth - marginX - 180,
      y: y - 10,
      width: 180,
      height: 38,
      color: rgb(0.95, 0.98, 0.96),
      borderColor: rgb(0.12, 0.28, 0.22),
      borderWidth: 1.5,
    });

    const valWidth = fontBold.widthOfTextAtSize(valFormatted, 15);
    page.drawText(valFormatted, {
      x: pageWidth - marginX - 180 + (180 - valWidth) / 2,
      y: y + 2,
      size: 15,
      font: fontBold,
      color: rgb(0.12, 0.28, 0.22),
    });

    if (data.receiptNumber) {
      page.drawText(sanitizeText(`Nº ${data.receiptNumber}`), {
        x: marginX,
        y: y + 5,
        size: 11,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    y -= 50;

    // Texto de quitação
    const reciboText =
      `Recebi(emos) de ${patient.name}, portador(a) do CPF nº ${patient.cpf || "não informado"}, ` +
      `a importância de ${valFormatted} (${data.amountExtenso || "valor declarado"}), ` +
      `paga por meio de ${data.paymentMethod || "transferência eletrônica/PIX/cartão"}, ` +
      `referente a: ${data.servicesDescription || "Procedimentos e acompanhamento médico ambulatorial"}.\n\n` +
      `Para clareza e fins de direito, firmo(amos) o presente recibo dando plena, geral e irrevogável quitação da quantia paga.`;

    const lines = this.wrapText(reciboText, contentWidth, fontRegular, 11);

    for (const line of lines) {
      page.drawText(sanitizeText(line), {
        x: marginX,
        y,
        size: 11,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 18;
    }

    y -= 50;
    const cityDate = data.cityDate || `Curitiba - PR, ${new Date().toLocaleDateString("pt-BR")}`;
    const cityWidth = fontRegular.widthOfTextAtSize(cityDate, 10);
    page.drawText(sanitizeText(cityDate), {
      x: (pageWidth - cityWidth) / 2,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    y -= 60;

    // Assinatura Emissor
    const lineW = 220;
    page.drawLine({
      start: { x: (pageWidth - lineW) / 2, y },
      end: { x: (pageWidth + lineW) / 2, y },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    });

    const docName = data.doctorName || "Dra. Ana Carla Morong";
    const nameW = fontBold.widthOfTextAtSize(docName, 10.5);
    page.drawText(sanitizeText(docName), {
      x: (pageWidth - nameW) / 2,
      y: y - 14,
      size: 10.5,
      font: fontBold,
      color: rgb(0.12, 0.28, 0.22),
    });

    const docCrm = `Médica - CRM ${data.doctorCrm || "CRM-PR"}`;
    const crmW = fontRegular.widthOfTextAtSize(docCrm, 9);
    page.drawText(sanitizeText(docCrm), {
      x: (pageWidth - crmW) / 2,
      y: y - 27,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    const pdfBytes = await pdfDoc.save();
    return {
      pdfBase64: btoa(String.fromCharCode(...pdfBytes)),
      pageCount: 1,
    };
  }
}
