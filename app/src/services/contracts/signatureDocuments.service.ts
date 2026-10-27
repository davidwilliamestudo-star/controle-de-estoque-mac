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

export interface PatientDocumentSigner {
  id: string;
  document_id: string;
  role: 'DRA_ANA' | 'PACIENTE' | 'TESTEMUNHA' | 'RESPONSAVEL_LEGAL' | string;
  full_name: string;
  cpf?: string;
  email?: string;
  phone_whatsapp?: string;
  council_id?: string;
  auth_type?: string;
  legal_standard?: string;
  status: 'pending' | 'signed' | 'rejected' | string;
  signed_at?: string;
  remote_access_token?: string;
  sign_url?: string;
  icp_subject_cn?: string;
  icp_serial_hex?: string;
}

export interface PatientDocument {
  id: string;
  verification_code: string;
  patient_id: string;
  patient_name: string;
  patient_cpf: string;
  patient_email?: string;
  patient_phone?: string;
  title: string;
  category: string;
  signing_mode: 'in_person' | 'remote' | 'hybrid';
  status: 'draft' | 'pending' | 'partially_signed' | 'completed' | 'rejected';
  original_pdf_sha256?: string;
  signed_pdf_sha256?: string;
  pades_pkcs7_hex?: string;
  has_pades: boolean;
  drive_file_id?: string;
  drive_file_url?: string;
  drive_folder_url?: string;
  gas_sync_status?: string;
  created_at: string;
  completed_at?: string;
  updated_at?: string;
  signers: PatientDocumentSigner[];
}

import { isTauri } from "@tauri-apps/api/core";
import { documentsRepository, type DocumentFilterOptions } from "./documents.repository";

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
   * Registra um novo documento, signatários e campos de assinatura
   */
  public static async createDocument(
    payload: CreateSignatureDocumentPayload
  ): Promise<CreateSignatureDocumentResponse> {
    if (isTauri()) {
      return documentsRepository.createDocument(payload);
    }

    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

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

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback para persistência local SQLite
    }

    return documentsRepository.createDocument(payload);
  }

  /**
   * Busca todos os documentos vinculados a um paciente
   */
  public static async getDocumentsByPatient(patientId: string): Promise<PatientDocument[]> {
    if (isTauri()) {
      return documentsRepository.getDocumentsByPatient(patientId);
    }

    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/signatures/documents/patient/${encodeURIComponent(patientId)}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        return data.documents || [];
      }
    } catch {
      // Fallback
    }

    return documentsRepository.getDocumentsByPatient(patientId);
  }

  /**
   * Busca todos os documentos emitidos no sistema (com filtros opcionais)
   */
  public static async getAllDocuments(filters?: DocumentFilterOptions): Promise<PatientDocument[]> {
    return documentsRepository.getAllDocuments(filters);
  }

  /**
   * Obtém o conteúdo Base64 do PDF (assinado ou original) para download ou visualização
   */
  public static async getDocumentPdf(documentId: string): Promise<{
    id: string;
    title: string;
    verification_code: string;
    status: string;
    pdf_base64: string;
    drive_file_url?: string;
  }> {
    if (isTauri()) {
      return documentsRepository.getDocumentPdf(documentId);
    }

    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/signatures/documents/${encodeURIComponent(documentId)}/pdf`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }

    return documentsRepository.getDocumentPdf(documentId);
  }

  /**
   * Exclui um documento do prontuário
   */
  public static async deleteDocument(documentId: string): Promise<void> {
    return documentsRepository.deleteDocument(documentId);
  }

  /**
   * Helper para disparar download direto do PDF no navegador
   */
  public static downloadPdf(base64: string, filename: string): void {
    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
