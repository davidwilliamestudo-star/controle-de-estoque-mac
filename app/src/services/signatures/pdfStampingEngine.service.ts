// src/services/signatures/pdfStampingEngine.service.ts
import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';

export interface NormalizedFieldInput {
  id: string;
  signer_id: string;
  field_type: 'signature' | 'initials' | 'icp_seal' | 'date_stamp';
  page: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

export interface SignerStampData {
  id: string;
  role: 'PACIENTE' | 'DRA_ANA' | 'TESTEMUNHA' | 'RESPONSAVEL_LEGAL' | string;
  full_name: string;
  cpf_cnpj: string;
  council_register?: string;
  auth_method: string;
  legal_level: 'ADVANCED' | 'QUALIFIED_ICP' | string;
  signature_png_base64?: string;
  selfie_photo_base64?: string;
  icp_subject_cn?: string;
  icp_issuer_cn?: string;
  icp_serial_hex?: string;
  icp_thumbprint_sha256?: string;
  signer_ip: string;
  signer_user_agent: string;
  signer_lat?: number | null;
  signer_lng?: number | null;
  signed_at_brt: string;
}

export interface AuditTrailManifestRow {
  event_type: string;
  event_description: string;
  actor_name: string;
  ip_address: string;
  occurred_at_brt: string;
  current_trail_hash: string;
}

export class PdfStampingEngineService {
  /**
   * Converte Base64 ou Data URI para Uint8Array
   */
  static base64ToUint8Array(base64OrDataUri: string): Uint8Array {
    const clean = base64OrDataUri.replace(/^data:[^;]+;base64,/, '');
    if (typeof atob !== 'undefined') {
      const bin = atob(clean);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }
    return new Uint8Array(Buffer.from(clean, 'base64'));
  }

  /**
   * Converte Uint8Array para Base64
   */
  static uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    return typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  }

  /**
   * Calcula digest SHA-256 hexadecimal
   */
  static async computeSha256Hex(bytes: Uint8Array): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Aliases para compatibilidade retroativa
  static base64ToBytes = PdfStampingEngineService.base64ToUint8Array;
  static bytesToBase64 = PdfStampingEngineService.uint8ArrayToBase64;
  static sha256HexFromBytes = PdfStampingEngineService.computeSha256Hex;

  /**
   * Estampa todas as assinaturas/rubricas nas páginas do documento e adiciona a Página de Manifesto
   */
  static async renderStampsAndManifestPage(params: {
    originalPdfBytes: Uint8Array;
    documentId: string;
    documentTitle: string;
    verificationCode: string;
    originalPdfSha256: string;
    publicVerificationBaseUrl: string;
    fields: NormalizedFieldInput[];
    signers: SignerStampData[];
    auditTrails: AuditTrailManifestRow[];
  }): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(params.originalPdfBytes);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    // Embute as imagens de assinatura/rubrica em cache
    const embeddedSigImages: Record<string, any> = {};
    for (const s of params.signers) {
      if (s.signature_png_base64) {
        try {
          const pngBytes = this.base64ToUint8Array(s.signature_png_base64);
          embeddedSigImages[s.id] = await pdfDoc.embedPng(pngBytes as unknown as ArrayBuffer);
        } catch {
          // Ignora imagem inválida silenciosamente
        }
      }
    }

    // 1. ESTAMPA OS CAMPOS NAS PÁGINAS DO CONTRATO
    for (const field of params.fields) {
      const pageIdx = field.page - 1;
      if (pageIdx < 0 || pageIdx >= pages.length) continue;

      const page: PDFPage = pages[pageIdx];
      const { width: pW, height: pH } = page.getSize();

      const boxW = (field.width_percent / 100) * pW;
      const boxH = (field.height_percent / 100) * pH;
      const pdfX = (field.x_percent / 100) * pW;
      const pdfY = pH - (field.y_percent / 100) * pH - boxH;

      const signer = params.signers.find((s) => s.id === field.signer_id);
      if (!signer) continue;

      if (field.field_type === 'icp_seal' || signer.legal_level === 'QUALIFIED_ICP' || signer.role === 'DRA_ANA') {
        // CHANCELA OFICIAL ICP-BRASIL (DRA. ANA CARLA MORONG)
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: boxW,
          height: boxH,
          borderColor: rgb(0.02, 0.52, 0.38),
          borderWidth: 1.1,
          color: rgb(0.95, 0.99, 0.97),
        });

        // Se a Dra. Ana cadastrou rubrica caligráfica no Cofre, desenha ao fundo/lado da chancela
        const docRubric = embeddedSigImages[signer.id];
        if (docRubric && field.field_type === 'initials') {
          page.drawImage(docRubric, {
            x: pdfX + 4,
            y: pdfY + 10,
            width: Math.max(12, boxW - 8),
            height: Math.max(10, boxH - 12),
          });
          page.drawText(`ICP-Brasil: ${params.verificationCode}`, {
            x: pdfX + 3,
            y: pdfY + 2,
            size: 4.8,
            font: fontBold,
            color: rgb(0.02, 0.45, 0.32),
          });
        } else {
          page.drawText('ASSINADO DIGITALMENTE — PADRÃO ICP-BRASIL', {
            x: pdfX + 5,
            y: pdfY + boxH - 10,
            size: 6.2,
            font: fontBold,
            color: rgb(0.02, 0.45, 0.32),
          });

          page.drawText(
            `${signer.icp_subject_cn || signer.full_name} (${
              signer.council_register || 'CRM/SC'
            })`,
            {
              x: pdfX + 5,
              y: pdfY + boxH - 19,
              size: 6.8,
              font: fontBold,
              color: rgb(0.06, 0.09, 0.15),
            }
          );

          page.drawText(
            `CNPJ: 54.811.772/0001-32 | AC: ${(
              signer.icp_issuer_cn || 'ICP-Brasil'
            ).slice(0, 28)}`,
            {
              x: pdfX + 5,
              y: pdfY + boxH - 27,
              size: 5.5,
              font: fontRegular,
              color: rgb(0.22, 0.28, 0.35),
            }
          );

          page.drawText(
            `Série: ${(signer.icp_serial_hex || '').slice(0, 16)} | Data BRT: ${
              signer.signed_at_brt
            }`,
            {
              x: pdfX + 5,
              y: pdfY + 4,
              size: 5.2,
              font: fontRegular,
              color: rgb(0.25, 0.3, 0.38),
            }
          );

          if (docRubric) {
            page.drawImage(docRubric, {
              x: pdfX + boxW - 68,
              y: pdfY + 11,
              width: 62,
              height: boxH - 22,
            });
          }
        }
      } else if (field.field_type === 'signature' || field.field_type === 'initials') {
        // ASSINATURA MANUSCRITA AVANÇADA DO PACIENTE
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: boxW,
          height: boxH,
          borderColor: rgb(0.72, 0.8, 0.88),
          borderWidth: 0.7,
        });

        const sigImg = embeddedSigImages[signer.id];
        if (sigImg) {
          const footerOffset = field.field_type === 'signature' ? 13 : 7;
          page.drawImage(sigImg, {
            x: pdfX + 4,
            y: pdfY + footerOffset,
            width: Math.max(10, boxW - 8),
            height: Math.max(10, boxH - footerOffset - 2),
          });
        }

        if (field.field_type === 'signature') {
          page.drawText(`${signer.full_name} — CPF: ${signer.cpf_cnpj}`, {
            x: pdfX + 4,
            y: pdfY + 6.5,
            size: 5.6,
            font: fontBold,
            color: rgb(0.1, 0.15, 0.22),
          });
          page.drawText(
            `Assinado em: ${signer.signed_at_brt} | ID: ${params.verificationCode}`,
            {
              x: pdfX + 4,
              y: pdfY + 1.5,
              size: 5,
              font: fontRegular,
              color: rgb(0.35, 0.4, 0.48),
            }
          );
        } else {
          page.drawText(`Visto: ${params.verificationCode}`, {
            x: pdfX + 3,
            y: pdfY + 1.5,
            size: 4.8,
            font: fontRegular,
            color: rgb(0.35, 0.4, 0.48),
          });
        }
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

    // 2. CRIA A PÁGINA FINAL DE MANIFESTO E AUDITORIA COM QR CODE VERIFICÁVEL
    const manifestPage = pdfDoc.addPage([595.28, 841.89]);
    const { width: mW, height: mH } = manifestPage.getSize();

    // Cabeçalho Institucional
    manifestPage.drawRectangle({
      x: 0,
      y: mH - 76,
      width: mW,
      height: 76,
      color: rgb(0.06, 0.09, 0.16),
    });

    manifestPage.drawText(
      'MANIFESTO DE ASSINATURA ELETRÔNICA E CERTIFICAÇÃO ICP-BRASIL',
      {
        x: 30,
        y: mH - 32,
        size: 11.5,
        font: fontBold,
        color: rgb(1, 1, 1),
      }
    );

    manifestPage.drawText(
      `Dra. Ana Carla Morong (CNPJ 54.811.772/0001-32) • Código Verificador: ${params.verificationCode}`,
      {
        x: 30,
        y: mH - 49,
        size: 8.2,
        font: fontRegular,
        color: rgb(0.38, 0.92, 0.74),
      }
    );

    manifestPage.drawText(
      'Conformidade Jurídica: Medida Provisória nº 2.200-2/2001 (ICP-Brasil) e Lei Federal nº 14.063/2020',
      {
        x: 30,
        y: mH - 63,
        size: 7.2,
        font: fontRegular,
        color: rgb(0.75, 0.82, 0.9),
      }
    );

    // QR Code apontando para a rota pública de verificação
    const verificationUrl = `${params.publicVerificationBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(
      params.verificationCode
    )}`;
    const qrDataUri = await QRCode.toDataURL(verificationUrl, {
      width: 132,
      margin: 1,
    });
    const qrImage = await pdfDoc.embedPng(this.base64ToUint8Array(qrDataUri) as unknown as ArrayBuffer);

    manifestPage.drawImage(qrImage, {
      x: mW - 124,
      y: mH - 184,
      width: 94,
      height: 94,
    });

    // Dados do Documento e Hash Original
    let cursorY = mH - 98;
    manifestPage.drawText(`Documento: ${params.documentTitle}`, {
      x: 30,
      y: cursorY,
      size: 9.8,
      font: fontBold,
      color: rgb(0.08, 0.1, 0.15),
    });

    cursorY -= 14;
    manifestPage.drawText(`UUID do Documento: ${params.documentId}`, {
      x: 30,
      y: cursorY,
      size: 7.8,
      font: fontRegular,
      color: rgb(0.32, 0.36, 0.42),
    });

    cursorY -= 14;
    manifestPage.drawText('Hash SHA-256 do Documento Original:', {
      x: 30,
      y: cursorY,
      size: 7.8,
      font: fontBold,
      color: rgb(0.15, 0.18, 0.22),
    });

    cursorY -= 11;
    manifestPage.drawText(params.originalPdfSha256, {
      x: 30,
      y: cursorY,
      size: 7.2,
      font: fontRegular,
      color: rgb(0.02, 0.45, 0.32),
    });

    // Quadro de Signatários
    cursorY -= 32;
    manifestPage.drawText('QUADRO PROBATÓRIO DE SIGNATÁRIOS E CERTIFICADOS', {
      x: 30,
      y: cursorY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    for (const signer of params.signers) {
      cursorY -= 92;
      manifestPage.drawRectangle({
        x: 30,
        y: cursorY,
        width: mW - 60,
        height: 84,
        borderColor:
          signer.legal_level === 'QUALIFIED_ICP' || signer.role === 'DRA_ANA'
            ? rgb(0.05, 0.6, 0.42)
            : rgb(0.82, 0.86, 0.92),
        borderWidth: 1,
        color: rgb(0.98, 0.99, 1),
      });

      manifestPage.drawText(
        `${signer.full_name} — ${
          signer.role === 'DRA_ANA'
            ? 'CONTRATADA (Assinatura Qualificada ICP-Brasil Automática)'
            : 'CONTRATANTE / PACIENTE (Assinatura Eletrônica Avançada)'
        }`,
        {
          x: 40,
          y: cursorY + 67,
          size: 8.5,
          font: fontBold,
          color: rgb(0.06, 0.09, 0.16),
        }
      );

      manifestPage.drawText(
        `CPF/CNPJ: ${signer.cpf_cnpj}   |   Data/Hora Oficial de Brasília: ${signer.signed_at_brt}`,
        {
          x: 40,
          y: cursorY + 53,
          size: 7.3,
          font: fontRegular,
          color: rgb(0.24, 0.28, 0.35),
        }
      );

      if (signer.legal_level === 'QUALIFIED_ICP' || signer.role === 'DRA_ANA') {
        manifestPage.drawText(
          `Certificado ICP-Brasil: ${signer.icp_subject_cn || signer.full_name} | Emissor: ${signer.icp_issuer_cn || 'AC ICP-Brasil'}`,
          {
            x: 40,
            y: cursorY + 39,
            size: 7,
            font: fontBold,
            color: rgb(0.02, 0.44, 0.31),
          }
        );
        manifestPage.drawText(
          `Serial Number: ${signer.icp_serial_hex || 'A1-ICP'} | Thumbprint SHA-256: ${(
            signer.icp_thumbprint_sha256 || 'ICP-SHA256'
          ).slice(0, 32)}...`,
          {
            x: 40,
            y: cursorY + 26,
            size: 6.5,
            font: fontRegular,
            color: rgb(0.25, 0.3, 0.38),
          }
        );
      } else {
        const geo =
          signer.signer_lat && signer.signer_lng
            ? `GPS: ${signer.signer_lat.toFixed(5)}, ${signer.signer_lng.toFixed(5)}`
            : 'GPS: Não compartilhado';
        manifestPage.drawText(
          `IP de Origem: ${signer.signer_ip}   |   ${geo}`,
          {
            x: 40,
            y: cursorY + 39,
            size: 7,
            font: fontRegular,
            color: rgb(0.25, 0.3, 0.38),
          }
        );
      }

      manifestPage.drawText(
        `Ambiente/Agente: ${(signer.signer_user_agent || 'Navegador Web').slice(0, 75)}`,
        {
          x: 40,
          y: cursorY + 12,
          size: 6.3,
          font: fontRegular,
          color: rgb(0.42, 0.46, 0.52),
        }
      );

      // Desenha miniatura da rubrica no card
      const sigImg = embeddedSigImages[signer.id];
      if (sigImg) {
        manifestPage.drawImage(sigImg, {
          x: mW - 150,
          y: cursorY + 18,
          width: 100,
          height: 42,
        });
      }
    }

    // Trilha de Auditoria
    cursorY -= 24;
    manifestPage.drawText('HISTÓRICO CRONOLÓGICO DE EVENTOS (AUDIT TRAIL)', {
      x: 30,
      y: cursorY,
      size: 9,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    for (const trail of params.auditTrails.slice(0, 8)) {
      cursorY -= 14;
      if (cursorY < 40) break;
      manifestPage.drawText(
        `[${trail.occurred_at_brt}] ${trail.event_type} — ${trail.actor_name} — ${trail.event_description} (Hash: ${(trail.current_trail_hash || '').slice(0, 12)})`,
        {
          x: 30,
          y: cursorY,
          size: 6.5,
          font: fontRegular,
          color: rgb(0.26, 0.3, 0.36),
        }
      );
    }

    return pdfDoc.save({ useObjectStreams: false });
  }
}
