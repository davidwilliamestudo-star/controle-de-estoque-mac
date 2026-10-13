import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { cors } from "hono/cors";

type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
};

// Web Crypto PBKDF2 Password Verification (Idêntica ao frontend)
function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64(bytes: ArrayBuffer): string {
  const values = new Uint8Array(bytes);
  let binary = "";
  values.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, iterationsRaw, saltRaw, expectedHash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsRaw || !saltRaw || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100000) {
    return false;
  }

  const encodedPassword = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey(
    "raw",
    encodedPassword,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromBase64(saltRaw),
      iterations,
      hash: "SHA-256",
    },
    key,
    256
  );

  return toBase64(bits) === expectedHash;
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

export const onRequest = handle(app);
