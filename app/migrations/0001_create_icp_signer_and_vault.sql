-- ============================================================================
-- MIGRATION: ASSINADOR DIGITAL PAdES & COFRE DE CERTIFICADO ICP-BRASIL
-- ============================================================================
PRAGMA foreign_keys = ON;

-- 1. Tabela do Cofre Criptográfico do Certificado Digital da Dra. Ana Carla Morong
CREATE TABLE IF NOT EXISTS doctor_certificate_vault (
    id TEXT PRIMARY KEY NOT NULL DEFAULT 'dra_ana_default_cert',
    professional_name TEXT NOT NULL DEFAULT 'Dra. Ana Carla Morong',
    professional_tax_id TEXT NOT NULL DEFAULT '54.811.772/0001-32',
    crm_register TEXT NOT NULL DEFAULT 'CRM/SC',
    contact_email TEXT NOT NULL DEFAULT 'financeiro@draanamorong.com.br',
    contact_phone TEXT NOT NULL DEFAULT '(48) 98857-2882',
    clinic_address TEXT NOT NULL DEFAULT 'Tv. do Motorista, nº 82, Canto, Florianópolis - SC, CEP: 88075-550',
    auto_sign_enabled INTEGER NOT NULL DEFAULT 1,               -- 1 = Assina automaticamente | 0 = Desativado
    auto_sign_trigger TEXT NOT NULL DEFAULT 'ON_PATIENT_SIGNED',-- 'ON_PATIENT_SIGNED' | 'ON_DOCUMENT_CREATED'
    encrypted_pfx_base64 TEXT NOT NULL,                         -- Binário .pfx cifrado em AES-256-GCM
    encrypted_password_base64 TEXT NOT NULL,                    -- Senha do .pfx cifrada em AES-256-GCM
    encryption_iv_hex TEXT NOT NULL,                            -- IV de 12 bytes (Hex) usado no AES-GCM
    default_rubric_png_base64 TEXT,                             -- Rubrica caligráfica transparente padrão da Dra. Ana
    cert_subject_cn TEXT NOT NULL,                              -- Common Name (CN) extraído do X.509
    cert_issuer_cn TEXT NOT NULL,                               -- Autoridade Certificadora Emissora (AC ICP-Brasil)
    cert_serial_hex TEXT NOT NULL,                              -- Serial Number hexadecimal do certificado
    cert_thumbprint_sha256 TEXT NOT NULL,                       -- Fingerprint SHA-256 do certificado X.509
    cert_icp_cpf TEXT,                                          -- OID 2.16.76.1.3.1 (CPF do titular/responsável)
    cert_icp_cnpj TEXT,                                         -- OID 2.16.76.1.3.3 (CNPJ se e-CNPJ)
    cert_not_before TEXT NOT NULL,                              -- Início de validade ISO-8601
    cert_not_after TEXT NOT NULL,                               -- Expiração ISO-8601
    last_used_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Tabela Principal de Documentos em Processo de Assinatura
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY NOT NULL,                               -- UUID v4 do documento
    verification_code TEXT NOT NULL UNIQUE,                     -- Código público p/ QR Code (ex: ANA-4F9D-2026)
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,
    patient_email TEXT,
    patient_phone TEXT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'CONTRATO',                  -- 'CONTRATO' | 'TCLE' | 'RECEITUARIO' | 'RELATORIO'
    status TEXT NOT NULL DEFAULT 'pending',                     -- 'pending' | 'partially_signed' | 'completed' | 'rejected'
    auto_sign_doctor INTEGER NOT NULL DEFAULT 1,                -- 1 = Usa o cofre automático da Dra. Ana
    original_pdf_base64 TEXT NOT NULL,                          -- PDF gerado pelo sistema antes das assinaturas
    original_pdf_sha256 TEXT NOT NULL,                          -- Hash SHA-256 do PDF original
    signed_pdf_base64 TEXT,                                     -- PDF final selado com PAdES + Manifesto QR Code
    signed_pdf_sha256 TEXT,                                     -- Hash SHA-256 do PDF final assinado
    pades_pkcs7_hex TEXT,                                       -- Assinatura criptográfica CMS/PKCS#7 destacada
    drive_file_id TEXT,
    drive_file_url TEXT,
    drive_folder_url TEXT,
    gas_sync_status TEXT NOT NULL DEFAULT 'pending',            -- 'pending' | 'synced' | 'failed'
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_verification_code ON documents(verification_code);
CREATE INDEX IF NOT EXISTS idx_documents_patient_cpf ON documents(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- 3. Tabela de Signatários do Documento
CREATE TABLE IF NOT EXISTS document_signers (
    id TEXT PRIMARY KEY NOT NULL,                               -- UUID v4
    document_id TEXT NOT NULL,
    remote_access_token TEXT NOT NULL UNIQUE,                   -- Token seguro para /assinar/:token
    role TEXT NOT NULL,                                         -- 'PACIENTE' | 'DRA_ANA' | 'TESTEMUNHA'
    signing_order INTEGER NOT NULL DEFAULT 1,
    full_name TEXT NOT NULL,
    cpf_cnpj TEXT NOT NULL,
    email TEXT,
    phone_whatsapp TEXT,
    council_register TEXT,                                      -- Ex: CRM/SC
    auth_method TEXT NOT NULL DEFAULT 'canvas_advanced',        -- 'canvas_advanced' | 'icp_brasil_a1_auto' | 'icp_brasil_a1_manual'
    legal_level TEXT NOT NULL DEFAULT 'ADVANCED',               -- 'ADVANCED' (Lei 14.063) | 'QUALIFIED_ICP' (MP 2.200-2)
    status TEXT NOT NULL DEFAULT 'pending',                     -- 'pending' | 'signed' | 'rejected'
    signature_png_base64 TEXT,                                  -- Rubrica transparente PNG
    selfie_photo_base64 TEXT,                                   -- Biometria facial opcional
    icp_subject_cn TEXT,
    icp_issuer_cn TEXT,
    icp_serial_hex TEXT,
    icp_thumbprint_sha256 TEXT,
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

-- 4. Tabela de Coordenadas Visuais Normalizadas (0 a 100%)
CREATE TABLE IF NOT EXISTS signature_fields (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL,
    signer_id TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'signature',               -- 'signature' | 'initials' | 'icp_seal' | 'date_stamp'
    page INTEGER NOT NULL,                                      -- 1-based (1, 2, 3...)
    x_percent REAL NOT NULL,                                    -- 0.00 a 100.00
    y_percent REAL NOT NULL,                                    -- 0.00 a 100.00
    width_percent REAL NOT NULL DEFAULT 32.00,                  -- 0.00 a 100.00
    height_percent REAL NOT NULL DEFAULT 8.50,                  -- 0.00 a 100.00
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (signer_id) REFERENCES document_signers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fields_document_id ON signature_fields(document_id);

-- 5. Tabela de Trilha de Auditoria Encadeada (Audit Trail Imutável)
CREATE TABLE IF NOT EXISTS signature_audit_trails (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL,
    signer_id TEXT,
    event_type TEXT NOT NULL,                                   -- 'DOCUMENT_CREATED' | 'PATIENT_VIEWED' | 'PATIENT_SIGNED' | 'DOCTOR_AUTO_ICP_SIGNED' | 'PDF_SEALED_PADES' | 'DRIVE_ARCHIVED'
    event_description TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_tax_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    geolocation_json TEXT,
    pdf_sha256_snapshot TEXT NOT NULL,
    previous_trail_hash TEXT NOT NULL,
    current_trail_hash TEXT NOT NULL,
    occurred_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    occurred_at_brt TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trails_document_id ON signature_audit_trails(document_id);
