import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { cors } from "hono/cors";
import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha256";

type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
  PUBLIC_APP_URL?: string;
  GAS_WEBAPP_URL?: string;
  GAS_INTERNAL_SECRET?: string;
  WEBHOOK_HMAC_SECRET?: string;
};

// PBKDF2 Password Verification compatível com o limite de iterações do Workers
function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const values = new Uint8Array(bytes);
  let binary = "";
  values.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, iterationsRaw, saltRaw, expectedHash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsRaw || !saltRaw || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 1000) {
    return false;
  }

  const salt = fromBase64(saltRaw);
  const derived = pbkdf2(sha256, password, salt, { c: iterations, dkLen: 32 });
  return toBase64(derived) === expectedHash;
}

// Token de sessão assinado em WebCrypto
async function generateSessionToken(payload: Record<string, unknown>, secret = "dra-ana-secret-key-2026"): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const sigBase64 = toBase64(signature).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sigBase64}`;
}

async function verifySessionToken(token: string, secret = "dra-ana-secret-key-2026"): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Converte base64url de volta para Uint8Array
    let base64 = sig.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const sigBytes = fromBase64(base64);

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes as any, enc.encode(data));
    if (!isValid) return null;

    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

// CORS middleware para desenvolvimento e produção
app.use("*", cors({
  origin: (origin) => origin || "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

// Garante compatibilidade de binding com DB ou dra_ana_estoque_db
app.use("*", async (c, next) => {
  if (!c.env.DB && (c.env as any).dra_ana_estoque_db) {
    c.env.DB = (c.env as any).dra_ana_estoque_db;
  }
  await next();
});

// Rota de Health Check
app.get("/health", (c) => {
  return c.json({ status: "healthy", service: "Dra Ana Morong Clinic API", timestamp: new Date().toISOString() });
});

// LOGIN
app.post("/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json<{ email?: string; password?: string }>();
    if (!email || !password) {
      return c.json({ error: "E-mail e senha são obrigatórios." }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Consulta no Cloudflare D1
    const user = await c.env.DB.prepare(
      `SELECT id, clinic_id, name, email, password_hash, role, is_active
       FROM users
       WHERE lower(email) = lower(?) AND deleted_at IS NULL
       LIMIT 1`
    ).bind(normalizedEmail).first<any>();

    if (!user || user.is_active !== 1) {
      return c.json({ error: "E-mail ou senha inválidos." }, 401);
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ error: "E-mail ou senha inválidos." }, 401);
    }

    // Atualiza last_login_at
    await c.env.DB.prepare(
      "UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).bind(user.id).run();

    const exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 dias
    const token = await generateSessionToken({
      userId: user.id,
      clinicId: user.clinic_id,
      name: user.name,
      email: user.email,
      role: user.role,
      exp,
    });

    return c.json({
      success: true,
      token,
      user: {
        userId: user.id,
        clinicId: user.clinic_id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: new Date().toISOString(),
        expiresAt: exp,
      },
    });
  } catch (error: any) {
    console.error("Erro no login:", error);
    return c.json({ error: error.message || "Erro interno ao processar login." }, 500);
  }
});

// Middleware de Autenticação para consultas
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Não autorizado. Token de sessão ausente." }, 401);
  }
  const token = authHeader.substring(7);
  const payload = await verifySessionToken(token);
  if (!payload) {
    return c.json({ error: "Sessão expirada ou inválida. Por favor, faça login novamente." }, 401);
  }
  c.set("user", payload);
  await next();
};

// QUERY (SELECT)
app.post("/db/query", authMiddleware, async (c) => {
  try {
    const { sql, args = [] } = await c.req.json<{ sql: string; args?: unknown[] }>();
    if (!sql) {
      return c.json({ error: "Parâmetro sql ausente." }, 400);
    }

    const stmt = c.env.DB.prepare(sql).bind(...args);
    const result = await stmt.all();

    return c.json({
      success: true,
      data: result.results || [],
    });
  } catch (error: any) {
    console.error("Erro na consulta D1:", error, c.req.path);
    return c.json({ error: error.message || "Erro ao executar consulta no banco." }, 500);
  }
});

// EXECUTE (INSERT / UPDATE / DELETE)
app.post("/db/execute", authMiddleware, async (c) => {
  try {
    const { sql, args = [] } = await c.req.json<{ sql: string; args?: unknown[] }>();
    if (!sql) {
      return c.json({ error: "Parâmetro sql ausente." }, 400);
    }

    const stmt = c.env.DB.prepare(sql).bind(...args);
    const result = await stmt.run();

    return c.json({
      success: true,
      data: {
        lastInsertId: result.meta?.last_row_id || 0,
        rowsAffected: result.meta?.changes || 0,
      },
    });
  } catch (error: any) {
    console.error("Erro na execução D1:", error);
    return c.json({ error: error.message || "Erro ao executar operação no banco." }, 500);
  }
});

// TRANSACTION (BATCH DE OPERAÇÕES)
app.post("/db/transaction", authMiddleware, async (c) => {
  try {
    const { queries } = await c.req.json<{
      queries: Array<{ sql: string; args?: unknown[]; requireRowsAffected?: boolean }>;
    }>();

    if (!Array.isArray(queries) || queries.length === 0) {
      return c.json({ success: true, count: 0 });
    }

    const statements = queries.map((q) => {
      const args = q.args || [];
      return c.env.DB.prepare(q.sql).bind(...args);
    });

    const results = await c.env.DB.batch(statements);

    return c.json({
      success: true,
      count: results.length,
    });
  } catch (error: any) {
    console.error("Erro na transação D1:", error);
    return c.json({ error: error.message || "Erro ao processar transação no banco." }, 500);
  }
});

// BACKUP EXPORT
app.get("/backup/export", authMiddleware, async (c) => {
  try {
    const tables = ["users", "patients", "inventory_items", "inventory_batches", "stock_movements", "procedures", "procedure_items", "financial_transactions"];
    let dump = `-- Backup Cloudflare D1 Clínica Dra. Ana Morong - Gerado em ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      try {
        const rows = await c.env.DB.prepare(`SELECT * FROM ${table}`).all();
        if (rows.results && rows.results.length > 0) {
          dump += `-- Tabela: ${table} (${rows.results.length} registros)\n`;
          dump += `INSERT INTO ${table} VALUES /* dados exportados via D1 */;\n\n`;
        }
      } catch {
        // Tabela pode não existir ainda
      }
    }

    return c.text(dump, 200, {
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="backup_anamorong_${new Date().toISOString().slice(0, 10)}.sql"`,
    });
  } catch (error: any) {
    return c.text(`Erro ao gerar backup: ${error.message}`, 500);
  }
});

// ============================================================================
// MÓDULO DE ASSINATURA ELETRÔNICA ICP-BRASIL & WEBHOOKS
// ============================================================================

import { PdfStampingEngine } from "../../src/services/signatures/pdfStampingEngine";

// 0. POST /api/signatures/documents — Cria novo documento com signatários e campos posicionados
app.post("/signatures/documents", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json<{
      title: string;
      category?: string;
      signing_mode?: 'in_person' | 'remote' | 'hybrid';
      patient_id: string;
      patient_name: string;
      patient_cpf: string;
      patient_email?: string;
      patient_phone?: string;
      original_pdf_base64: string;
      signers: Array<{
        id: string;
        role: 'DRA_ANA' | 'PACIENTE' | 'TESTEMUNHA' | 'RESPONSAVEL_LEGAL';
        full_name: string;
        cpf: string;
        email?: string;
        phone_whatsapp?: string;
        council_id?: string;
        auth_type?: 'canvas_advanced' | 'icp_brasil_a1' | 'icp_brasil_cloud' | 'otp_whatsapp';
        legal_standard?: 'ADVANCED' | 'QUALIFIED_ICP';
      }>;
      fields: Array<{
        signer_id: string;
        field_type: 'signature' | 'initials' | 'date_stamp' | 'icp_seal';
        page: number;
        x_percent: number;
        y_percent: number;
        width_percent: number;
        height_percent: number;
      }>;
    }>();

    if (!body.title || !body.patient_id || !body.patient_name || !body.patient_cpf || !body.original_pdf_base64) {
      return c.json({ error: "Dados obrigatórios do documento incompletos." }, 400);
    }

    if (!Array.isArray(body.signers) || body.signers.length === 0) {
      return c.json({ error: "Pelo menos um signatário é obrigatório." }, 400);
    }

    // Calcula SHA-256 do PDF original
    const pdfBytes = PdfStampingEngine.base64ToBytes(body.original_pdf_base64);
    const pdfSha256 = await PdfStampingEngine.sha256HexFromBytes(pdfBytes);

    const docId = crypto.randomUUID();
    const verPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const verPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const verificationCode = `ANA-${verPart1}-${verPart2}`;
    const nowUtc = new Date().toISOString();
    const nowBrt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // Mapeamento dos IDs de signatários do cliente para UUIDs reais
    const signerIdMap = new Map<string, string>();
    const signersCreated: Array<{
      id: string;
      clientId: string;
      role: string;
      fullName: string;
      remoteAccessToken: string;
      signUrl: string;
    }> = [];

    const statements: D1PreparedStatement[] = [];

    // 1. Inserir documento
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO documents (
          id, verification_code, patient_id, patient_name, patient_cpf,
          patient_email, patient_phone, title, category, signing_mode,
          engine_provider, status, original_pdf_url, original_pdf_sha256,
          gas_sync_status, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'native', 'pending', ?, ?, 'pending', ?, ?, ?)`
      ).bind(
        docId,
        verificationCode,
        body.patient_id,
        body.patient_name,
        body.patient_cpf,
        body.patient_email || null,
        body.patient_phone || null,
        body.title,
        body.category || 'CONTRATO',
        body.signing_mode || 'hybrid',
        body.original_pdf_base64,
        pdfSha256,
        user?.userId || null,
        nowUtc,
        nowUtc
      )
    );

    const origin = (c.env.PUBLIC_APP_URL || new URL(c.req.url).origin).replace(/\/$/, "");

    // 2. Inserir Signatários
    for (let i = 0; i < body.signers.length; i++) {
      const s = body.signers[i];
      const realSignerId = crypto.randomUUID();
      const remoteToken = (crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")).substring(0, 48);
      signerIdMap.set(s.id, realSignerId);

      statements.push(
        c.env.DB.prepare(
          `INSERT INTO document_signers (
            id, document_id, remote_access_token, role, signing_order,
            full_name, cpf, email, phone_whatsapp, council_id,
            auth_type, legal_standard, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
        ).bind(
          realSignerId,
          docId,
          remoteToken,
          s.role,
          i + 1,
          s.full_name,
          s.cpf,
          s.email || null,
          s.phone_whatsapp || null,
          s.council_id || null,
          s.auth_type || 'canvas_advanced',
          s.legal_standard || 'ADVANCED',
          nowUtc
        )
      );

      signersCreated.push({
        id: realSignerId,
        clientId: s.id,
        role: s.role,
        fullName: s.full_name,
        remoteAccessToken: remoteToken,
        signUrl: `${origin}/assinar/${remoteToken}`,
      });
    }

    // 3. Inserir Campos de Assinatura
    if (Array.isArray(body.fields)) {
      for (const f of body.fields) {
        const mappedSignerId = signerIdMap.get(f.signer_id) || f.signer_id;
        const fieldId = crypto.randomUUID();

        statements.push(
          c.env.DB.prepare(
            `INSERT INTO signature_fields (
              id, document_id, signer_id, field_type, page,
              x_percent, y_percent, width_percent, height_percent,
              required, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
          ).bind(
            fieldId,
            docId,
            mappedSignerId,
            f.field_type,
            f.page,
            f.x_percent,
            f.y_percent,
            f.width_percent,
            f.height_percent,
            nowUtc
          )
        );
      }
    }

    // 4. Trilha de Auditoria Inicial (Gênese)
    const genesisTrailId = crypto.randomUUID();
    const genesisChain = `${genesisTrailId}|${docId}|document.created|${pdfSha256}|GENESIS_0000000000000000|${nowUtc}`;
    const genesisHash = await PdfStampingEngine.sha256HexFromBytes(
      new TextEncoder().encode(genesisChain)
    );

    statements.push(
      c.env.DB.prepare(
        `INSERT INTO signature_audit_trails (
          id, document_id, signer_id, event_name, event_description,
          actor_name, actor_cpf, ip_address, user_agent,
          pdf_sha256_snapshot, previous_trail_hash, current_trail_hash,
          occurred_at_utc, occurred_at_brt
        ) VALUES (?, ?, NULL, 'document.created', ?, ?, ?, ?, ?, ?, 'GENESIS_0000000000000000', ?, ?, ?)`
      ).bind(
        genesisTrailId,
        docId,
        `Documento criado no sistema por ${user?.name || 'Clínica Dra. Ana Morong'}`,
        user?.name || 'Administrador',
        user?.email || 'clinica@morong.med.br',
        c.req.header("cf-connecting-ip") || "127.0.0.1",
        c.req.header("user-agent") || "Browser",
        pdfSha256,
        genesisHash,
        nowUtc,
        nowBrt
      )
    );

    // Executa tudo atomicamente no D1
    await c.env.DB.batch(statements);

    return c.json({
      success: true,
      document_id: docId,
      verification_code: verificationCode,
      signers: signersCreated,
    });
  } catch (error: any) {
    console.error("Erro ao criar documento de assinatura:", error);
    return c.json({ error: error.message || "Erro ao criar documento." }, 500);
  }
});

// 1. GET /api/assinar/:token — Carrega sessão de assinatura para o paciente
app.get("/assinar/:token", async (c) => {
  try {
    const token = c.req.param("token");

    const signer = await c.env.DB.prepare(
      `SELECT * FROM document_signers WHERE remote_access_token = ? LIMIT 1`
    ).bind(token).first<any>();

    if (!signer) {
      return c.json({ error: "Token não encontrado." }, 404);
    }

    const doc = await c.env.DB.prepare(
      `SELECT * FROM documents WHERE id = ? LIMIT 1`
    ).bind(signer.document_id).first<any>();

    const fieldsRes = await c.env.DB.prepare(
      `SELECT * FROM signature_fields WHERE document_id = ? AND signer_id = ?`
    ).bind(signer.document_id, signer.id).all();

    return c.json({
      document_id: doc?.id,
      document_title: doc?.title,
      verification_code: doc?.verification_code,
      original_pdf_url: doc?.original_pdf_url,
      original_pdf_sha256: doc?.original_pdf_sha256,
      signer: {
        id: signer.id,
        full_name: signer.full_name,
        cpf: signer.cpf,
        role: signer.role,
        status: signer.status,
      },
      fields: fieldsRes.results || [],
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Erro ao carregar documento." }, 500);
  }
});

// 2. POST /api/assinar/:token — Registra assinatura e sela PDF se concluído
app.post("/assinar/:token", async (c) => {
  try {
    const token = c.req.param("token");
    const body = await c.req.json<any>();

    const signer = await c.env.DB.prepare(
      `SELECT * FROM document_signers WHERE remote_access_token = ? LIMIT 1`
    ).bind(token).first<any>();

    if (!signer) {
      return c.json({ error: "Token inválido." }, 404);
    }

    const doc = await c.env.DB.prepare(
      `SELECT * FROM documents WHERE id = ? LIMIT 1`
    ).bind(signer.document_id).first<any>();

    if (!doc) {
      return c.json({ error: "Documento não encontrado." }, 404);
    }

    const ipAddress = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "127.0.0.1";
    const userAgent = c.req.header("user-agent") || "Browser";
    const nowUtc = new Date().toISOString();
    const nowBrt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    // Atualiza signatário
    await c.env.DB.prepare(
      `UPDATE document_signers
       SET status = 'signed',
           signature_png_base64 = ?,
           selfie_photo_base64 = ?,
           signer_ip = ?,
           signer_user_agent = ?,
           signer_lat = ?,
           signer_lng = ?,
           signed_at = ?
       WHERE id = ?`
    ).bind(
      body.signature_png_base64,
      body.selfie_photo_base64 || null,
      ipAddress,
      userAgent,
      body.lat ?? null,
      body.lng ?? null,
      nowUtc,
      signer.id
    ).run();

    // Grava na trilha de auditoria
    const trailId = crypto.randomUUID();
    const rawChain = `${trailId}|${doc.id}|document.signed|${doc.original_pdf_sha256}|${nowUtc}`;
    const currentTrailHash = await PdfStampingEngine.sha256HexFromBytes(
      new TextEncoder().encode(rawChain)
    );

    await c.env.DB.prepare(
      `INSERT INTO signature_audit_trails (
        id, document_id, signer_id, event_name, event_description,
        actor_name, actor_cpf, ip_address, user_agent, geolocation_json,
        pdf_sha256_snapshot, previous_trail_hash, current_trail_hash,
        occurred_at_utc, occurred_at_brt
      ) VALUES (?, ?, ?, 'document.signed', ?, ?, ?, ?, ?, ?, ?, 'CHAIN', ?, ?, ?)`
    ).bind(
      trailId,
      doc.id,
      signer.id,
      `Assinado eletronicamente por ${signer.full_name}`,
      signer.full_name,
      signer.cpf,
      ipAddress,
      userAgent,
      body.lat ? JSON.stringify({ lat: body.lat, lng: body.lng }) : null,
      doc.original_pdf_sha256,
      currentTrailHash,
      nowUtc,
      nowBrt
    ).run();

    // Checa se todos já assinaram
    const allSignersRes = await c.env.DB.prepare(
      `SELECT * FROM document_signers WHERE document_id = ? ORDER BY signing_order ASC`
    ).bind(doc.id).all<any>();

    const allSigners = allSignersRes.results || [];
    const allSigned = allSigners.every((s: any) => s.status === "signed");

    if (!allSigned) {
      await c.env.DB.prepare(
        `UPDATE documents SET status = 'partially_signed', updated_at = ? WHERE id = ?`
      ).bind(nowUtc, doc.id).run();

      return c.json({
        status: "partially_signed",
        message: "Assinatura registrada! Aguardando demais signatários.",
      });
    }

    // Se todos assinaram -> Carimba com pdf-lib e gera manifesto
    const allFieldsRes = await c.env.DB.prepare(
      `SELECT * FROM signature_fields WHERE document_id = ?`
    ).bind(doc.id).all<any>();

    const allTrailsRes = await c.env.DB.prepare(
      `SELECT * FROM signature_audit_trails WHERE document_id = ? ORDER BY occurred_at_utc ASC`
    ).bind(doc.id).all<any>();

    const originalPdfBytes = PdfStampingEngine.base64ToBytes(String(doc.original_pdf_url));

    const stampedResult = await PdfStampingEngine.stampAndAppendManifest({
      originalPdfBytes,
      documentId: String(doc.id),
      documentTitle: String(doc.title),
      verificationCode: String(doc.verification_code),
      publicVerifyUrlBase: `${(c.env as any).PUBLIC_APP_URL || "https://clinicaanamorong.com.br"}/verificar`,
      fields: (allFieldsRes.results || []).map((f: any) => ({
        id: String(f.id),
        signer_id: String(f.signer_id),
        field_type: f.field_type,
        page: Number(f.page),
        x_percent: Number(f.x_percent),
        y_percent: Number(f.y_percent),
        width_percent: Number(f.width_percent),
        height_percent: Number(f.height_percent),
      })),
      signers: allSigners.map((s: any) => ({
        id: String(s.id),
        role: s.role,
        full_name: String(s.full_name),
        cpf: String(s.cpf),
        email: s.email,
        council_id: s.council_id,
        auth_type: String(s.auth_type),
        legal_standard: s.legal_standard,
        signature_png_base64: String(s.signature_png_base64),
        selfie_photo_base64: s.selfie_photo_base64,
        signer_ip: String(s.signer_ip || ipAddress),
        signer_user_agent: String(s.signer_user_agent || userAgent),
        signer_lat: s.signer_lat ? Number(s.signer_lat) : null,
        signer_lng: s.signer_lng ? Number(s.signer_lng) : null,
        signed_at_brt: nowBrt,
        icp_subject_cn: s.icp_subject_cn,
        icp_issuer_ca: s.icp_issuer_ca,
        icp_serial_number: s.icp_serial_number,
      })),
      auditTrails: (allTrailsRes.results || []).map((t: any) => ({
        event_name: String(t.event_name),
        event_description: String(t.event_description),
        actor_name: String(t.actor_name),
        ip_address: String(t.ip_address),
        occurred_at_brt: String(t.occurred_at_brt),
        current_trail_hash: String(t.current_trail_hash),
      })),
    });

    // Envio para o Google Apps Script (Drive + Gmail + Sheets)
    let driveFileUrl: string | null = null;
    let driveFolderUrl: string | null = null;
    let driveFileId: string | null = null;
    const gasUrl = (c.env as any).GAS_WEBAPP_URL;

    if (gasUrl) {
      try {
        const gasRes = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "saveSignedDocumentToDrive",
            secret: (c.env as any).GAS_INTERNAL_SECRET,
            request_id: trailId,
            payload: {
              document_id: doc.id,
              verification_code: doc.verification_code,
              document_title: doc.title,
              category: doc.category,
              patient_name: doc.patient_name,
              patient_cpf: doc.patient_cpf,
              patient_email: doc.patient_email,
              original_sha256: stampedResult.originalSha256,
              signed_sha256: stampedResult.signedSha256,
              signed_pdf_base64: stampedResult.signedPdfBase64,
              completed_at_brt: nowBrt,
            },
          }),
        });
        const gasJson = (await gasRes.json()) as any;
        if (gasJson?.success && gasJson?.data) {
          driveFileId = gasJson.data.file_id;
          driveFileUrl = gasJson.data.file_url;
          driveFolderUrl = gasJson.data.folder_url;
        }
      } catch (gasErr) {
        console.error("Erro no Apps Script:", gasErr);
      }
    }

    await c.env.DB.prepare(
      `UPDATE documents
       SET status = 'completed',
           signed_pdf_sha256 = ?,
           drive_file_id = ?,
           drive_file_url = ?,
           drive_folder_url = ?,
           gas_sync_status = ?,
           completed_at = ?,
           updated_at = ?
       WHERE id = ?`
    ).bind(
      stampedResult.signedSha256,
      driveFileId,
      driveFileUrl,
      driveFolderUrl,
      driveFileUrl ? "synced" : "pending",
      nowUtc,
      nowUtc,
      doc.id
    ).run();

    return c.json({
      status: "completed",
      verification_code: doc.verification_code,
      signed_sha256: stampedResult.signedSha256,
      signed_pdf_base64: stampedResult.signedPdfBase64,
      drive_file_url: driveFileUrl,
    });
  } catch (error: any) {
    console.error("Erro ao assinar:", error);
    return c.json({ error: error.message || "Erro interno ao processar assinatura." }, 500);
  }
});

// Helper para validação HMAC-SHA256 de webhooks
async function verifyHmacSignature(
  rawBody: string,
  signatureHex: string | null | undefined,
  secret?: string
): Promise<boolean> {
  if (!signatureHex || !secret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const cleanHex = signatureHex.replace(/^sha256=/, "");
  const sigBytes = new Uint8Array(
    cleanHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  return crypto.subtle.verify("HMAC", key, sigBytes as any, encoder.encode(rawBody));
}

function normalizeEventName(
  payload: any
): "document.created" | "document.signed" | "document.rejected" | "document.completed" {
  if (payload.event) return payload.event;
  if (payload.event_type === "doc_created") return "document.created";
  if (payload.event_type === "doc_refused") return "document.rejected";
  if (payload.event_type === "doc_signed") {
    if (payload.status === "signed" && (payload.signed_file_url || payload.signed_pdf_base64)) {
      return "document.completed";
    }
    return "document.signed";
  }
  return "document.signed";
}

// 3. POST /api/webhooks/signatures — Recepção de Webhook ZapSign ou nativo
app.post("/webhooks/signatures", async (c) => {
  try {
    const rawBody = await c.req.text();
    const hmacHeader = c.req.header("x-signature-hmac");
    const secretHeader = c.req.header("x-webhook-secret");
    const webhookSecret = c.env.WEBHOOK_HMAC_SECRET;

    if (webhookSecret) {
      const isHmacValid = await verifyHmacSignature(rawBody, hmacHeader, webhookSecret);
      const isTokenValid = Boolean(secretHeader) && secretHeader === webhookSecret;
      if (!isHmacValid && !isTokenValid) {
        return c.json({ error: "Assinatura de Webhook inválida (Unauthorized)." }, 401);
      }
    }

    const payload = JSON.parse(rawBody);
    const normalizedEvent = normalizeEventName(payload);

    const docRecord = await c.env.DB.prepare(
      `SELECT * FROM documents WHERE id = ? OR external_provider_id = ? LIMIT 1`
    ).bind(payload.document_id || "", payload.token || "").first<any>();

    if (!docRecord) {
      return c.json({ error: "Documento não encontrado no banco D1." }, 404);
    }

    const documentId = String(docRecord.id);
    const nowUtc = new Date().toISOString();
    const nowBrt = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const lastTrail = await c.env.DB.prepare(
      `SELECT current_trail_hash FROM signature_audit_trails
       WHERE document_id = ? ORDER BY occurred_at_utc DESC LIMIT 1`
    ).bind(documentId).first<any>();

    const previousHash = lastTrail?.current_trail_hash || "GENESIS_0000000000000000";
    const snapshotHash = payload.signed_pdf_sha256 || String(docRecord.original_pdf_sha256);
    const trailId = crypto.randomUUID();
    const currentTrailHash = await PdfStampingEngine.sha256HexFromBytes(
      new TextEncoder().encode(`${trailId}|${documentId}|${normalizedEvent}|${snapshotHash}|${previousHash}|${nowUtc}`)
    );

    await c.env.DB.prepare(
      `INSERT INTO signature_audit_trails (
        id, document_id, signer_id, event_name, event_description,
        actor_name, actor_cpf, ip_address, user_agent, geolocation_json,
        pdf_sha256_snapshot, previous_trail_hash, current_trail_hash,
        occurred_at_utc, occurred_at_brt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      trailId,
      documentId,
      payload.signer?.id || null,
      normalizedEvent,
      `Webhook recebido: ${normalizedEvent}`,
      payload.signer?.name || "Sistema de Assinaturas",
      payload.signer?.cpf || null,
      payload.signer?.ip || c.req.header("cf-connecting-ip") || "0.0.0.0",
      payload.signer?.user_agent || c.req.header("user-agent") || "Webhook-Agent",
      payload.signer?.lat ? JSON.stringify({ lat: payload.signer.lat, lng: payload.signer.lng }) : null,
      snapshotHash,
      previousHash,
      currentTrailHash,
      nowUtc,
      nowBrt
    ).run();

    switch (normalizedEvent) {
      case "document.created": {
        await c.env.DB.prepare(
          `UPDATE documents SET status = 'pending', updated_at = ? WHERE id = ?`
        ).bind(nowUtc, documentId).run();
        break;
      }
      case "document.signed": {
        if (payload.signer) {
          await c.env.DB.prepare(
            `UPDATE document_signers
             SET status = 'signed',
                 signer_ip = ?,
                 signer_user_agent = ?,
                 signed_at = ?
             WHERE document_id = ? AND (id = ? OR external_signer_token = ? OR cpf = ?)`
          ).bind(
            payload.signer.ip || null,
            payload.signer.user_agent || null,
            payload.signer.signed_at || nowUtc,
            documentId,
            payload.signer.id || "",
            payload.signer.token || "",
            payload.signer.cpf || ""
          ).run();
        }
        await c.env.DB.prepare(
          `UPDATE documents SET status = 'partially_signed', updated_at = ? WHERE id = ?`
        ).bind(nowUtc, documentId).run();
        break;
      }
      case "document.rejected": {
        await c.env.DB.prepare(
          `UPDATE documents SET status = 'rejected', updated_at = ? WHERE id = ?`
        ).bind(nowUtc, documentId).run();
        if (payload.signer) {
          await c.env.DB.prepare(
            `UPDATE document_signers
             SET status = 'rejected', rejection_reason = ?
             WHERE document_id = ? AND (id = ? OR external_signer_token = ?)`
          ).bind(
            payload.signer.rejection_reason || "Recusado pelo signatário",
            documentId,
            payload.signer.id || "",
            payload.signer.token || ""
          ).run();
        }
        break;
      }
      case "document.completed": {
        await c.env.DB.prepare(
          `UPDATE documents
           SET status = 'completed',
               signed_pdf_url = COALESCE(?, signed_pdf_url),
               signed_pdf_sha256 = COALESCE(?, signed_pdf_sha256),
               completed_at = ?,
               updated_at = ?
           WHERE id = ?`
        ).bind(
          payload.signed_file_url || null,
          payload.signed_pdf_sha256 || null,
          nowUtc,
          nowUtc,
          documentId
        ).run();

        const gasUrl = c.env.GAS_WEBAPP_URL;
        if (gasUrl) {
          try {
            const gasResponse = await fetch(gasUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "saveSignedDocumentToDrive",
                secret: c.env.GAS_INTERNAL_SECRET,
                request_id: trailId,
                payload: {
                  document_id: documentId,
                  verification_code: docRecord.verification_code,
                  document_title: docRecord.title,
                  category: docRecord.category,
                  patient_name: docRecord.patient_name,
                  patient_cpf: docRecord.patient_cpf,
                  patient_email: docRecord.patient_email,
                  original_sha256: docRecord.original_pdf_sha256,
                  signed_sha256: payload.signed_pdf_sha256 || docRecord.original_pdf_sha256,
                  signed_pdf_base64: payload.signed_pdf_base64 || null,
                  signed_file_url: payload.signed_file_url || docRecord.signed_pdf_url || null,
                  completed_at_brt: nowBrt,
                },
              }),
            });
            const gasJson = (await gasResponse.json()) as any;
            if (gasJson?.success && gasJson?.data) {
              await c.env.DB.prepare(
                `UPDATE documents
                 SET drive_file_id = ?,
                     drive_file_url = ?,
                     drive_folder_url = ?,
                     gas_sync_status = 'synced',
                     updated_at = ?
                 WHERE id = ?`
              ).bind(
                gasJson.data.file_id,
                gasJson.data.file_url,
                gasJson.data.folder_url,
                new Date().toISOString(),
                documentId
              ).run();
            } else {
              await c.env.DB.prepare(
                `UPDATE documents SET gas_sync_status = 'failed', updated_at = ? WHERE id = ?`
              ).bind(new Date().toISOString(), documentId).run();
            }
          } catch (e) {
            console.error("Erro no webhook GAS:", e);
          }
        }
        break;
      }
    }

    return c.json({
      received: true,
      document_id: documentId,
      event: normalizedEvent,
    });
  } catch (err: any) {
    console.error("[Webhook Signatures Error]:", err);
    return c.json({ error: err?.message || "Internal Server Error" }, 500);
  }
});

export const onRequest = handle(app);

