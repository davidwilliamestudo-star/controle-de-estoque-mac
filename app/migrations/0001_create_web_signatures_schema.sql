-- ============================================================================
-- MIGRATION D1: SISTEMA DE ASSINATURA ELETRÔNICA WEB-FIRST (DRA. ANA MORONG)
-- ============================================================================
PRAGMA foreign_keys = ON;

-- 1. Tabela Principal de Documentos
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 do documento
    external_provider_id TEXT UNIQUE,                   -- Token do documento no ZapSign (se usar API externa)
    verification_code TEXT NOT NULL UNIQUE,             -- Código público para QR Code (ex: ANA-8F2B-2026)
    patient_id TEXT NOT NULL,                           -- ID do paciente no sistema
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,                          -- CPF apenas números ou formatado
    patient_email TEXT,
    patient_phone TEXT,
    title TEXT NOT NULL,                                -- Ex: "TCLE - Toxina Botulínica e Preenchimento"
    category TEXT NOT NULL DEFAULT 'TCLE',              -- 'TCLE' | 'CONTRATO' | 'PLANO_TRATAMENTO' | 'RECEITUARIO'
    signing_mode TEXT NOT NULL DEFAULT 'hybrid',        -- 'in_person' | 'remote' | 'hybrid'
    engine_provider TEXT NOT NULL DEFAULT 'native',     -- 'native' | 'zapsign'
    status TEXT NOT NULL DEFAULT 'draft',               -- 'draft' | 'pending' | 'partially_signed' | 'completed' | 'rejected' | 'expired'
    original_pdf_url TEXT,                              -- URL no R2/Storage ou Data URI do PDF original
    original_pdf_sha256 TEXT NOT NULL,                  -- Hash SHA-256 original (integridade antes de assinar)
    signed_pdf_url TEXT,                                -- URL temporária/R2 do PDF final com manifesto
    signed_pdf_sha256 TEXT,                             -- Hash SHA-256 final após selagem PAdES/Manifesto
    drive_file_id TEXT,                                 -- ID do arquivo salvo no Google Drive
    drive_file_url TEXT,                                -- URL permanente de visualização no Google Drive
    drive_folder_url TEXT,                              -- URL da pasta do paciente no Google Drive
    gas_sync_status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'synced' | 'failed'
    created_by_user_id TEXT,
    expires_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_patient_cpf ON documents(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_external_id ON documents(external_provider_id);
CREATE INDEX IF NOT EXISTS idx_documents_verification_code ON documents(verification_code);

-- 2. Tabela de Signatários do Documento
CREATE TABLE IF NOT EXISTS document_signers (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 do signatário
    document_id TEXT NOT NULL,
    external_signer_token TEXT UNIQUE,                  -- Token do signatário no ZapSign (se aplicável)
    remote_access_token TEXT NOT NULL UNIQUE,           -- Token seguro para rota web: /assinar/:token
    role TEXT NOT NULL,                                 -- 'DRA_ANA' | 'PACIENTE' | 'TESTEMUNHA' | 'RESPONSAVEL_LEGAL'
    signing_order INTEGER NOT NULL DEFAULT 1,
    full_name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT,
    phone_whatsapp TEXT,
    council_id TEXT,                                    -- Ex: CRM/CRO/CRBM da Dra. Ana
    auth_type TEXT NOT NULL DEFAULT 'canvas_advanced',  -- 'canvas_advanced' | 'icp_brasil_a1' | 'icp_brasil_cloud' | 'otp_whatsapp'
    legal_standard TEXT NOT NULL DEFAULT 'ADVANCED',    -- 'ADVANCED' (Lei 14.063) | 'QUALIFIED_ICP' (MP 2.200-2)
    status TEXT NOT NULL DEFAULT 'pending',             -- 'pending' | 'viewed' | 'signed' | 'rejected'
    rejection_reason TEXT,
    signature_png_base64 TEXT,                          -- Rubrica/assinatura transparente coletada no Canvas
    selfie_photo_base64 TEXT,                           -- Foto de biometria facial no ato da assinatura
    icp_subject_cn TEXT,                                -- Nome no Certificado Digital ICP-Brasil
    icp_issuer_ca TEXT,                                 -- Autoridade Certificadora ICP-Brasil
    icp_serial_number TEXT,                             -- Número de série do Certificado ICP-Brasil
    signer_ip TEXT,
    signer_user_agent TEXT,
    signer_lat REAL,
    signer_lng REAL,
    signed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signers_document_id ON document_signers(document_id);
CREATE INDEX IF NOT EXISTS idx_signers_remote_token ON document_signers(remote_access_token);

-- 3. Tabela de Campos Posicionados no PDF (Coordenadas Percentuais 0 a 100%)
CREATE TABLE IF NOT EXISTS signature_fields (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 do campo
    document_id TEXT NOT NULL,
    signer_id TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'signature',       -- 'signature' | 'initials' | 'date_stamp' | 'icp_seal'
    page INTEGER NOT NULL,                              -- Página do PDF (1-based: 1, 2, 3...)
    x_percent REAL NOT NULL,                            -- Posição horizontal (0.00 a 100.00%)
    y_percent REAL NOT NULL,                            -- Posição vertical a partir do topo (0.00 a 100.00%)
    width_percent REAL NOT NULL DEFAULT 26.00,          -- Largura relativa à página (0.00 a 100.00%)
    height_percent REAL NOT NULL DEFAULT 8.50,          -- Altura relativa à página (0.00 a 100.00%)
    required INTEGER NOT NULL DEFAULT 1,                -- 1 = Obrigatório, 0 = Opcional
    stamped_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (signer_id) REFERENCES document_signers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signature_fields_document ON signature_fields(document_id);

-- 4. Tabela de Trilha de Auditoria Inviolável (Audit Trail / Dossiê Jurídico)
CREATE TABLE IF NOT EXISTS signature_audit_trails (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 do evento de auditoria
    document_id TEXT NOT NULL,
    signer_id TEXT,                                     -- NULL para eventos sistêmicos
    event_name TEXT NOT NULL,                           -- 'document.created' | 'document.viewed' | 'document.signed' | 'document.rejected' | 'document.completed' | 'drive.archived'
    event_description TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_cpf TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    geolocation_json TEXT,                              -- Ex: {"lat":-23.5505,"lng":-46.6333,"accuracy":12}
    pdf_sha256_snapshot TEXT NOT NULL,                  -- Hash SHA-256 do PDF no instante do evento
    previous_trail_hash TEXT NOT NULL,                  -- Hash do registro anterior (cadeia imutável)
    current_trail_hash TEXT NOT NULL,                   -- SHA-256(id + document_id + event_name + pdf_sha256_snapshot + previous_trail_hash + occurred_at_utc)
    occurred_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    occurred_at_brt TEXT NOT NULL,                      -- Data/Hora Oficial de Brasília (UTC-3)
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_trails_document ON signature_audit_trails(document_id);
