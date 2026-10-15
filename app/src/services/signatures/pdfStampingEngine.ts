// src/services/signatures/pdfStampingEngine.ts
import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';

export interface FieldCoordinateInput {
  id: string;
  signer_id: string;
  field_type: 'signature' | 'initials' | 'icp_seal' | 'date_stamp';
  page: number;           // 1-based (1, 2, 3...)
  x_percent: number;      // 0 a 100% (origem no topo-esquerdo da tela)
  y_percent: number;      // 0 a 100% (origem no topo-esquerdo da tela)
  width_percent: number;  // 0 a 100%
  height_percent: number; // 0 a 100%
}

export interface SignerEvidenceInput {
  id: string;
  role: 'DRA_ANA' | 'PACIENTE' | 'TESTEMUNHA' | 'RESPONSAVEL_LEGAL';
  full_name: string;
  cpf: string;
  email?: string;
  phone_whatsapp?: string;
  council_id?: string; // Ex: CRM/CRO da Dra. Ana
  auth_type: string;   // 'canvas_advanced' | 'icp_brasil_a1' | 'otp_whatsapp'
  legal_standard: 'ADVANCED' | 'QUALIFIED_ICP';
  signature_png_base64: string; // Data URL ou Base64 puro do Canvas transparente
  selfie_photo_base64?: string; // Data URL ou Base64 puro da câmera (JPEG/PNG)
  signer_ip: string;
  signer_user_agent: string;
  signer_lat?: number | null;
  signer_lng?: number | null;
  signed_at_brt: string;
  icp_subject_cn?: string;
  icp_issuer_ca?: string;
  icp_serial_number?: string;
}

export interface AuditTrailItemInput {
  event_name: string;
  event_description: string;
  actor_name: string;
  ip_address: string;
  occurred_at_brt: string;
  current_trail_hash: string;
}

export interface StampPdfRequest {
  originalPdfBytes: Uint8Array;
  documentId: string;
  documentTitle: string;
  verificationCode: string;
  publicVerifyUrlBase: string; // Ex: "https://clinicaanamorong.com.br/verificar"
  fields: FieldCoordinateInput[];
  signers: SignerEvidenceInput[];
  auditTrails: AuditTrailItemInput[];
}

export interface StampPdfResponse {
  signedPdfBytes: Uint8Array;
  signedPdfBase64: string;
  originalSha256: string;
  signedSha256: string;
}

export class PdfStampingEngine {
  /**
   * Calcula o Hash SHA-256 hexadecimal usando Web Crypto API (compatível com Browser, Node e Cloudflare Workers)
   */
  static async sha256HexFromBytes(bytes: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Converte Uint8Array para Base64 sem estourar a Call Stack em PDFs grandes
   */
  static bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    return typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  }

  /**
   * Decodifica Base64 ou Data URL para Uint8Array
   */
  static base64ToBytes(base64OrDataUrl: string): Uint8Array {
    const clean = base64OrDataUrl.replace(/^data:[^;]+;base64,/, '');
    if (typeof atob !== 'undefined') {
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }

  /**
   * Mascara parcialmente o CPF para exibição pública na chancela visual (ex: ***.456.789-**)
   */
  private static formatCpfForStamp(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  /**
   * Executa o carimbo de todas as coordenadas (x_percent, y_percent) e anexa a Folha de Manifesto
   */
  static async stampAndAppendManifest(
    req: StampPdfRequest
  ): Promise<StampPdfResponse> {
    const originalSha256 = await this.sha256HexFromBytes(req.originalPdfBytes);
    const pdfDoc = await PDFDocument.load(req.originalPdfBytes);

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    // Cache de imagens embutidas por signatário para evitar duplicar objetos no PDF
    const embeddedSignatures: Record<string, any> = {};
    for (const signer of req.signers) {
      if (signer.signature_png_base64) {
        const imgBytes = this.base64ToBytes(signer.signature_png_base64);
        embeddedSignatures[signer.id] = await pdfDoc.embedPng(imgBytes as unknown as ArrayBuffer);
      }
    }

    // 1. ESTAMPAGEM DOS CAMPOS NAS PÁGINAS ORIGINAIS (Conversão Top-Left % -> Bottom-Left pt)
    for (const field of req.fields) {
      const pageIndex = field.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page: PDFPage = pages[pageIndex];
      const { width: pageW, height: pageH } = page.getSize();

      // Conversão de percentual (0 a 100) para pontos do PDF
      const boxW = (field.width_percent / 100) * pageW;
      const boxH = (field.height_percent / 100) * pageH;
      const pdfX = (field.x_percent / 100) * pageW;
      const pdfY = pageH - (field.y_percent / 100) * pageH - boxH;

      const signer = req.signers.find((s) => s.id === field.signer_id);
      if (!signer) continue;

      if (field.field_type === 'signature' || field.field_type === 'initials') {
        // Moldura discreta estilo ZapSign ao redor da rubrica/assinatura
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: boxW,
          height: boxH,
          borderColor: rgb(0.75, 0.82, 0.88),
          borderWidth: 0.6,
        });

        const sigImage = embeddedSignatures[signer.id];
        if (sigImage) {
          const footerHeight = field.field_type === 'signature' ? 13 : 8;
          page.drawImage(sigImage, {
            x: pdfX + 3,
            y: pdfY + footerHeight,
            width: Math.max(10, boxW - 6),
            height: Math.max(10, boxH - footerHeight - 2),
          });
        }

        // Micro-carimbo jurídico na base da caixa
        if (field.field_type === 'signature') {
          page.drawText(
            `Assinado por: ${signer.full_name} (${this.formatCpfForStamp(signer.cpf)})`,
            {
              x: pdfX + 3,
              y: pdfY + 6.5,
              size: 5.5,
              font: fontBold,
              color: rgb(0.12, 0.16, 0.23),
            }
          );
          page.drawText(
            `Em: ${signer.signed_at_brt} | Código: ${req.verificationCode}`,
            {
              x: pdfX + 3,
              y: pdfY + 1.5,
              size: 5,
              font: fontRegular,
              color: rgb(0.35, 0.4, 0.48),
            }
          );
        } else {
          page.drawText(`Visto: ${req.verificationCode}`, {
            x: pdfX + 2,
            y: pdfY + 1.5,
            size: 4.8,
            font: fontRegular,
            color: rgb(0.35, 0.4, 0.48),
          });
        }
      } else if (field.field_type === 'icp_seal') {
        // Chancela Qualificada ICP-Brasil da Dra. Ana Morong
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: boxW,
          height: boxH,
          borderColor: rgb(0.04, 0.52, 0.38),
          borderWidth: 1,
          color: rgb(0.95, 0.99, 0.97),
        });

        page.drawText('ASSINATURA QUALIFICADA ICP-BRASIL', {
          x: pdfX + 5,
          y: pdfY + boxH - 10,
          size: 6.5,
          font: fontBold,
          color: rgb(0.02, 0.42, 0.3),
        });

        page.drawText(
          `${signer.icp_subject_cn || signer.full_name} ${
            signer.council_id ? `- ${signer.council_id}` : ''
          }`,
          {
            x: pdfX + 5,
            y: pdfY + boxH - 19,
            size: 6.8,
            font: fontBold,
            color: rgb(0.08, 0.12, 0.18),
          }
        );

        page.drawText(
          `AC: ${signer.icp_issuer_ca || 'ICP-Brasil'} | Data: ${signer.signed_at_brt}`,
          {
            x: pdfX + 5,
            y: pdfY + 4,
            size: 5.5,
            font: fontRegular,
            color: rgb(0.25, 0.3, 0.36),
          }
        );
      } else if (field.field_type === 'date_stamp') {
        page.drawText(signer.signed_at_brt, {
          x: pdfX + 4,
          y: pdfY + boxH / 2 - 4,
          size: 8.5,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.15),
        });
      }
    }

    // 2. ANEXAÇÃO DA FOLHA DE MANIFESTO / TRILHA DE AUDITORIA COM QR CODE
    const manifestPage = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width: mW, height: mH } = manifestPage.getSize();

    // Faixa Superior Escura Institucional
    manifestPage.drawRectangle({
      x: 0,
      y: mH - 74,
      width: mW,
      height: 74,
      color: rgb(0.06, 0.09, 0.16),
    });

    manifestPage.drawText(
      'RELATÓRIO DE ASSINATURAS E MANIFESTO DE AUDITORIA',
      {
        x: 30,
        y: mH - 32,
        size: 12,
        font: fontBold,
        color: rgb(1, 1, 1),
      }
    );

    manifestPage.drawText(
      `Clínica Dra. Ana Morong • Validade Jurídica: Lei nº 14.063/2020 e MP 2.200-2/2001 • Código: ${req.verificationCode}`,
      {
        x: 30,
        y: mH - 50,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.9, 0.72),
      }
    );

    // Geração do QR Code em PNG DataURL
    const qrTargetUrl = `${req.publicVerifyUrlBase}?code=${encodeURIComponent(
      req.verificationCode
    )}&sha256=${encodeURIComponent(originalSha256)}`;
    const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      width: 130,
      margin: 1,
    });
    const qrBytes = this.base64ToBytes(qrDataUrl);
    const qrEmbedded = await pdfDoc.embedPng(qrBytes as unknown as ArrayBuffer);

    manifestPage.drawImage(qrEmbedded, {
      x: mW - 122,
      y: mH - 182,
      width: 92,
      height: 92,
    });

    manifestPage.drawText('Escaneie p/ validar', {
      x: mW - 112,
      y: mH - 193,
      size: 7,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.32),
    });

    // Metadados do Documento e Hash Original
    let yCursor = mH - 98;
    manifestPage.drawText(`Documento: ${req.documentTitle}`, {
      x: 30,
      y: yCursor,
      size: 10,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.15),
    });

    yCursor -= 15;
    manifestPage.drawText(`ID Único do Documento: ${req.documentId}`, {
      x: 30,
      y: yCursor,
      size: 7.8,
      font: fontRegular,
      color: rgb(0.32, 0.36, 0.42),
    });

    yCursor -= 14;
    manifestPage.drawText('Hash SHA-256 do PDF Original:', {
      x: 30,
      y: yCursor,
      size: 7.8,
      font: fontBold,
      color: rgb(0.15, 0.18, 0.22),
    });

    yCursor -= 11;
    manifestPage.drawText(originalSha256, {
      x: 30,
      y: yCursor,
      size: 7.2,
      font: fontRegular,
      color: rgb(0.03, 0.46, 0.33),
    });

    // Seção de Signatários e Evidências Biométricas
    yCursor -= 34;
    manifestPage.drawText('SIGNATÁRIOS E PROVAS TÉCNICAS DE AUTORIA', {
      x: 30,
      y: yCursor,
      size: 9.5,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    for (const signer of req.signers) {
      yCursor -= 88;
      manifestPage.drawRectangle({
        x: 30,
        y: yCursor,
        width: mW - 60,
        height: 80,
        borderColor: rgb(0.83, 0.87, 0.92),
        borderWidth: 0.9,
        color: rgb(0.98, 0.99, 1),
      });

      manifestPage.drawText(`${signer.full_name} (${signer.role})`, {
        x: 40,
        y: yCursor + 63,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.09, 0.16),
      });

      manifestPage.drawText(
        `CPF: ${signer.cpf}  |  Padrão Legal: ${
          signer.legal_standard === 'QUALIFIED_ICP'
            ? 'Assinatura Qualificada ICP-Brasil'
            : 'Assinatura Eletrônica Avançada (Lei 14.063/2020)'
        }`,
        {
          x: 40,
          y: yCursor + 49,
          size: 7.3,
          font: fontRegular,
          color: rgb(0.25, 0.3, 0.38),
        }
      );

      const geoText =
        signer.signer_lat && signer.signer_lng
          ? `Geo: ${signer.signer_lat.toFixed(5)}, ${signer.signer_lng.toFixed(5)}`
          : 'Geo: N/D';

      manifestPage.drawText(
        `Assinado em: ${signer.signed_at_brt} (Horário de Brasília)  |  IP: ${signer.signer_ip}  |  ${geoText}`,
        {
          x: 40,
          y: yCursor + 36,
          size: 7,
          font: fontRegular,
          color: rgb(0.25, 0.3, 0.38),
        }
      );

      manifestPage.drawText(
        `Dispositivo/Navegador: ${signer.signer_user_agent.slice(0, 78)}`,
        {
          x: 40,
          y: yCursor + 23,
          size: 6.5,
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.52),
        }
      );

      if (signer.icp_subject_cn) {
        manifestPage.drawText(
          `Certificado Digital: ${signer.icp_subject_cn} | Série: ${signer.icp_serial_number}`,
          {
            x: 40,
            y: yCursor + 10,
            size: 6.5,
            font: fontBold,
            color: rgb(0.02, 0.44, 0.31),
          }
        );
      }

      // Miniatura da Rubrica no Card do Manifesto
      const sigImage = embeddedSignatures[signer.id];
      if (sigImage) {
        manifestPage.drawImage(sigImage, {
          x: mW - 155,
          y: yCursor + 18,
          width: 105,
          height: 44,
        });
      }

      // Miniatura da Selfie Biométrica (se capturada)
      if (signer.selfie_photo_base64) {
        try {
          const selfieBytes = this.base64ToBytes(signer.selfie_photo_base64);
          const isPng = signer.selfie_photo_base64.includes('image/png');
          const selfieImg = isPng
            ? await pdfDoc.embedPng(selfieBytes as unknown as ArrayBuffer)
            : await pdfDoc.embedJpg(selfieBytes as unknown as ArrayBuffer);
          manifestPage.drawImage(selfieImg, {
            x: mW - 210,
            y: yCursor + 16,
            width: 46,
            height: 46,
          });
        } catch {
          // Ignora se formato de selfie for inválido
        }
      }
    }

    // Seção de Trilha de Auditoria (Audit Trail)
    yCursor -= 24;
    manifestPage.drawText('TRILHA DE AUDITORIA CRONOLÓGICA (HASH ENCADEADO)', {
      x: 30,
      y: yCursor,
      size: 9,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    for (const trail of req.auditTrails.slice(0, 7)) {
      yCursor -= 15;
      if (yCursor < 45) break;
      manifestPage.drawText(
        `• [${trail.occurred_at_brt}] ${trail.event_name.toUpperCase()} — ${trail.actor_name} (IP: ${trail.ip_address}) | Hash: ${trail.current_trail_hash.slice(0, 16)}...`,
        {
          x: 30,
          y: yCursor,
          size: 6.8,
          font: fontRegular,
          color: rgb(0.28, 0.32, 0.38),
        }
      );
    }

    // Rodapé de Integridade
    manifestPage.drawText(
      'Este documento foi assinado eletronicamente e selado com resumo criptográfico SHA-256. Qualquer adulteração invalida este manifesto.',
      {
        x: 30,
        y: 22,
        size: 6.8,
        font: fontRegular,
        color: rgb(0.45, 0.5, 0.56),
      }
    );

    const signedPdfBytes = await pdfDoc.save();
    const signedSha256 = await this.sha256HexFromBytes(signedPdfBytes);
    const signedPdfBase64 = this.bytesToBase64(signedPdfBytes);

    return {
      signedPdfBytes,
      signedPdfBase64,
      originalSha256,
      signedSha256,
    };
  }
}
