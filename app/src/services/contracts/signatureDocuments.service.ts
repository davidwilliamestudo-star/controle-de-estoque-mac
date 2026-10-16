// src/services/contracts/signatureDocuments.service.ts
import { SignatureFieldPosition, WebSignerConfig } from '@/components/signatures/WebPdfSignaturePositioner';

export interface CreateSignatureDocumentPayload {
  title: string;
  category?: string;
  signing_mode?: 'in_person' | 'remote' | 'hybrid';
  patient_id: string;
  patient_name: string;
  patient_cpf: string;
  patient_email?: string;
  patient_phone?: string;
  original_pdf_base64: string;
  signers: WebSignerConfig[];
  fields: SignatureFieldPosition[];
}

export interface CreatedDocumentSignerResult {
  id: string;
  clientId: string;
  role: string;
  fullName: string;
  remoteAccessToken: string;
  signUrl: string;
}

export interface CreateSignatureDocumentResponse {
  success: boolean;
  document_id: string;
  verification_code: string;
  signers: CreatedDocumentSignerResult[];
}

export class SignatureDocumentsService {
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return (
      localStorage.getItem('dra_ana_auth_token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token')
    );
  }

  /**
   * Registra um novo documento, signatários e campos de assinatura no Cloudflare D1
   */
  public static async createDocument(
    payload: CreateSignatureDocumentPayload
  ): Promise<CreateSignatureDocumentResponse> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/signatures/documents', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: payload.title,
        category: payload.category || 'CONTRATO',
        signing_mode: payload.signing_mode || 'hybrid',
        patient_id: payload.patient_id,
        patient_name: payload.patient_name,
        patient_cpf: payload.patient_cpf,
        patient_email: payload.patient_email,
        patient_phone: payload.patient_phone,
        original_pdf_base64: payload.original_pdf_base64,
        signers: payload.signers.map((s) => ({
          id: s.id,
          role: s.role,
          full_name: s.fullName,
          cpf: s.cpf,
          email: s.email,
          phone_whatsapp: s.phoneWhatsapp,
          auth_type: s.role === 'DRA_ANA' ? 'icp_brasil_a1_auto' : 'canvas_advanced',
          legal_standard: s.role === 'DRA_ANA' ? 'QUALIFIED_ICP' : 'ADVANCED',
        })),
        fields: payload.fields.map((f) => ({
          signer_id: f.signer_id,
          field_type: f.field_type,
          page: f.page,
          x_percent: f.x_percent,
          y_percent: f.y_percent,
          width_percent: f.width_percent,
          height_percent: f.height_percent,
        })),
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Erro de comunicação.' }));
      throw new Error(errData.error || `Erro ao registrar documento (${response.status})`);
    }

    return await response.json();
  }
}
