/**
 * documents.repository.ts
 * Acesso universal ao banco de dados SQLite / D1 para documentos clínicos e contratos.
 */
import { dbSelect, dbExecute, dbTransaction } from "@/lib/db/sqlite";
import { appScriptIntegrationService } from "@/features/integrations/apps-script/services/appScriptIntegration.service";
import type {
  CreateSignatureDocumentPayload,
  CreateSignatureDocumentResponse,
  PatientDocument,
  PatientDocumentSigner,
  CreatedDocumentSignerResult,
} from "./signatureDocuments.service";

export interface DocumentFilterOptions {
  patientId?: string;
  category?: string;
  status?: string;
  search?: string;
}

export const documentsRepository = {
  /**
   * Cria novo documento com signatários, posições de campos e registro de auditoria
   */
  async createDocument(
    payload: CreateSignatureDocumentPayload
  ): Promise<CreateSignatureDocumentResponse> {
    const docId = crypto.randomUUID();
    const verPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const verPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const verificationCode = `ANA-${verPart1}-${verPart2}`;
    const nowIso = new Date().toISOString();

    const signerResults: CreatedDocumentSignerResult[] = [];

    await dbTransaction(async () => {
      // 1. Inserir documento principal
      await dbExecute(
        `INSERT INTO documents (
          id, verification_code, patient_id, patient_name, patient_cpf,
          patient_email, patient_phone, title, category, signing_mode,
          engine_provider, status, original_pdf_url, original_pdf_sha256,
          gas_sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'native', 'pending', ?, ?, 'pending', ?, ?)`,
        [
          docId,
          verificationCode,
          payload.patient_id,
          payload.patient_name,
          payload.patient_cpf,
          payload.patient_email || null,
          payload.patient_phone || null,
          payload.title,
          payload.category || 'CONTRATO',
          payload.signing_mode || 'hybrid',
          payload.original_pdf_base64,
          'sha256-placeholder',
          nowIso,
          nowIso,
        ]
      );

      // 2. Inserir signatários
      const signerIdMap = new Map<string, string>();

      for (let i = 0; i < payload.signers.length; i++) {
        const s = payload.signers[i];
        const realSignerId = crypto.randomUUID();
        const remoteToken = (
          crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")
        ).substring(0, 48);

        signerIdMap.set(s.id, realSignerId);

        await dbExecute(
          `INSERT INTO document_signers (
            id, document_id, remote_access_token, role, signing_order,
            full_name, cpf, email, phone_whatsapp, council_id,
            auth_type, legal_standard, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            realSignerId,
            docId,
            remoteToken,
            s.role,
            i + 1,
            s.fullName,
            s.cpf,
            s.email || null,
            s.phoneWhatsapp || null,
            s.role === 'DRA_ANA' ? 'CRM 2026' : null,
            s.role === 'DRA_ANA' ? 'icp_brasil_a1_auto' : 'canvas_advanced',
            s.role === 'DRA_ANA' ? 'QUALIFIED_ICP' : 'ADVANCED',
            nowIso,
          ]
        );

        signerResults.push({
          id: realSignerId,
          clientId: s.id,
          role: s.role,
          fullName: s.fullName,
          remoteAccessToken: remoteToken,
          signUrl: `${window.location.origin}/assinar/${remoteToken}`,
        });
      }

      // 3. Inserir campos de assinatura
      for (const f of payload.fields) {
        const fieldId = crypto.randomUUID();
        const targetSignerId = signerIdMap.get(f.signer_id) || f.signer_id;

        await dbExecute(
          `INSERT INTO signature_fields (
            id, document_id, signer_id, field_type, page,
            x_percent, y_percent, width_percent, height_percent,
            required, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            fieldId,
            docId,
            targetSignerId,
            f.field_type,
            f.page,
            f.x_percent,
            f.y_percent,
            f.width_percent,
            f.height_percent,
            nowIso,
          ]
        );
      }

      // 4. Inserir evento de auditoria
      const eventId = crypto.randomUUID();
      await dbExecute(
        `INSERT INTO signature_audit_trails (
          id, document_id, signer_id, event_name, event_description,
          actor_name, actor_role, created_at
        ) VALUES (?, ?, NULL, 'document.created', 'Documento gerado e registrado no prontuário.', 'Dra. Ana Morong', 'MEDICA', ?)`,
        [eventId, docId, nowIso]
      );
    });

    return {
      success: true,
      document_id: docId,
      verification_code: verificationCode,
      signers: signerResults,
    };
  },

  /**
   * Busca todos os documentos vinculados a um paciente
   */
  async getDocumentsByPatient(patientId: string): Promise<PatientDocument[]> {
    const docs = await dbSelect<any>(
      `SELECT * FROM documents WHERE patient_id = ? ORDER BY created_at DESC`,
      [patientId]
    );

    const result: PatientDocument[] = [];

    for (const d of docs) {
      const signers = await dbSelect<any>(
        `SELECT * FROM document_signers WHERE document_id = ? ORDER BY signing_order ASC`,
        [d.id]
      );

      result.push({
        ...d,
        signers: signers.map((s) => ({
          ...s,
          remote_sign_url: `${window.location.origin}/assinar/${s.remote_access_token}`,
        })),
      });
    }

    return result;
  },

  /**
   * Lista todos os documentos do sistema com filtros opcionais
   */
  async getAllDocuments(filters: DocumentFilterOptions = {}): Promise<PatientDocument[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.patientId) {
      conditions.push("d.patient_id = ?");
      params.push(filters.patientId);
    }

    if (filters.category && filters.category !== "ALL") {
      conditions.push("d.category = ?");
      params.push(filters.category);
    }

    if (filters.status && filters.status !== "ALL") {
      conditions.push("d.status = ?");
      params.push(filters.status);
    }

    if (filters.search) {
      conditions.push(
        "(d.title LIKE ? OR d.patient_name LIKE ? OR d.patient_cpf LIKE ? OR d.verification_code LIKE ?)"
      );
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const docs = await dbSelect<any>(
      `SELECT d.* FROM documents d ${whereClause} ORDER BY d.created_at DESC`,
      params
    );

    const result: PatientDocument[] = [];

    for (const d of docs) {
      const signers = await dbSelect<any>(
        `SELECT * FROM document_signers WHERE document_id = ? ORDER BY signing_order ASC`,
        [d.id]
      );

      result.push({
        ...d,
        signers: signers.map((s) => ({
          ...s,
          remote_sign_url: `${window.location.origin}/assinar/${s.remote_access_token}`,
        })),
      });
    }

    return result;
  },

  /**
   * Obtém os bytes Base64 do documento para download ou visualização
   */
  async getDocumentPdf(documentId: string): Promise<{
    id: string;
    title: string;
    verification_code: string;
    status: string;
    pdf_base64: string;
    drive_file_url?: string;
  }> {
    const rows = await dbSelect<any>(
      `SELECT id, title, verification_code, status, original_pdf_url, signed_pdf_url, drive_file_url 
       FROM documents WHERE id = ?`,
      [documentId]
    );

    if (rows.length === 0) {
      throw new Error("Documento não encontrado.");
    }

    const doc = rows[0];
    const pdfBase64 = doc.signed_pdf_url || doc.original_pdf_url || "";

    return {
      id: doc.id,
      title: doc.title,
      verification_code: doc.verification_code,
      status: doc.status,
      pdf_base64: pdfBase64,
      drive_file_url: doc.drive_file_url || undefined,
    };
  },

  /**
   * Atualiza as informações de sincronização do Google Drive de um documento
   */
  async updateDocumentDriveInfo(
    documentId: string,
    info: {
      drive_file_id?: string | null;
      drive_file_url?: string | null;
      drive_folder_url?: string | null;
      gas_sync_status?: string;
    }
  ): Promise<void> {
    await dbExecute(
      `UPDATE documents
       SET drive_file_id = COALESCE(?, drive_file_id),
           drive_file_url = COALESCE(?, drive_file_url),
           drive_folder_url = COALESCE(?, drive_folder_url),
           gas_sync_status = COALESCE(?, gas_sync_status),
           updated_at = ?
       WHERE id = ?`,
      [
        info.drive_file_id || null,
        info.drive_file_url || null,
        info.drive_folder_url || null,
        info.gas_sync_status || 'synced',
        new Date().toISOString(),
        documentId,
      ]
    );
  },

  /**
   * Sincroniza o documento com Google Apps Script (Drive + Email)
   */
  async syncDocumentToDrive(documentId: string): Promise<{
    success: boolean;
    drive_file_id?: string;
    drive_file_url?: string;
    drive_folder_url?: string;
    email_status?: string;
    error?: string;
  }> {
    const rows = await dbSelect<any>(
      `SELECT * FROM documents WHERE id = ? LIMIT 1`,
      [documentId]
    );
    if (rows.length === 0) {
      throw new Error("Documento não encontrado.");
    }
    const doc = rows[0];
    const pdfBase64 = doc.signed_pdf_url || doc.original_pdf_url;
    if (!pdfBase64) {
      throw new Error("Documento não possui PDF para upload.");
    }

    const nowBrt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const gasRes = await appScriptIntegrationService.sendPayload({
      action: "saveSignedDocumentToDrive",
      request_id: `sync_${doc.id}_${Date.now()}`,
      payload: {
        document_id: doc.id,
        verification_code: doc.verification_code,
        document_title: doc.title,
        category: doc.category || "CONTRATO",
        patient_name: doc.patient_name,
        patient_cpf: doc.patient_cpf,
        patient_email: doc.patient_email || "",
        original_sha256: doc.original_pdf_sha256 || "",
        signed_sha256: doc.signed_pdf_sha256 || doc.original_pdf_sha256 || "",
        signed_pdf_base64: pdfBase64,
        completed_at_brt: nowBrt,
      },
    });

    const fileId = gasRes.file_id || gasRes.data?.file_id;
    const fileUrl = gasRes.file_url || gasRes.data?.file_url;
    const folderUrl = gasRes.folder_url || gasRes.data?.folder_url;
    const emailStatus = gasRes.email_status || gasRes.data?.email_status;

    await this.updateDocumentDriveInfo(doc.id, {
      drive_file_id: fileId,
      drive_file_url: fileUrl,
      drive_folder_url: folderUrl,
      gas_sync_status: "synced",
    });

    return {
      success: true,
      drive_file_id: fileId,
      drive_file_url: fileUrl,
      drive_folder_url: folderUrl,
      email_status: emailStatus,
    };
  },

  /**
   * Exclui um documento do prontuário
   */
  async deleteDocument(documentId: string): Promise<void> {
    await dbTransaction(async () => {
      await dbExecute(`DELETE FROM signature_audit_trails WHERE document_id = ?`, [documentId]);
      await dbExecute(`DELETE FROM signature_fields WHERE document_id = ?`, [documentId]);
      await dbExecute(`DELETE FROM document_signers WHERE document_id = ?`, [documentId]);
      await dbExecute(`DELETE FROM documents WHERE id = ?`, [documentId]);
    });
  }
};
