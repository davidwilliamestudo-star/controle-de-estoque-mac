/**
 * sqlite.ts
 * Wrapper do @tauri-apps/plugin-sql para SQLite local.
 * As migrations sao executadas automaticamente pelo Rust (lib.rs).
 */
import Database, { type QueryResult } from "@tauri-apps/plugin-sql";
import { invoke, isTauri } from "@tauri-apps/api/core";

let _dbPromise: Promise<Database> | null = null;
let _operationQueue: Promise<void> = Promise.resolve();

const DB_URL = "sqlite:estoque.db";
const SQLITE_LOCK_RETRIES = 8;
const SQLITE_LOCK_RETRY_DELAY_MS = 200;

type DatabasePrepareResult = {
  dbPath: string;
  backupPath: string | null;
  repairedMigrations: Array<{
    version: number;
    fromChecksum: string;
    toChecksum: string;
    reason: string;
  }>;
  integrityCheck: string;
  foreignKeyViolations: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isDatabaseLockedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /database is locked|database table is locked|SQLITE_BUSY/i.test(message);
}

async function withLockedDatabaseRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= SQLITE_LOCK_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isDatabaseLockedError(error) || attempt === SQLITE_LOCK_RETRIES) {
        throw error;
      }

      lastError = error;
      await sleep(SQLITE_LOCK_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function enqueueDatabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  const run = _operationQueue.then(operation, operation);
  _operationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function prepareSqliteDatabaseForOpen(): Promise<void> {
  try {
    const result = await invoke<DatabasePrepareResult>("prepare_database_for_open");
    if (result.repairedMigrations.length > 0) {
      console.info("Historico de migrations SQLite normalizado antes da abertura.", result);
    }
  } catch (error) {
    throw new Error(`Falha no pre-voo do banco SQLite: ${errorMessage(error)}`);
  }
}

async function addColumnIfMissing(db: Database, table: string, columnDefinition: string): Promise<void> {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDefinition}`);
  } catch {
    // SQLite throws when the column already exists. This compatibility pass is idempotent.
  }
}

async function ensureCompatibilitySchema(db: Database): Promise<void> {
  const inventoryItemColumns = [
    "commercial_name TEXT",
    "active_principle TEXT",
    "concentration TEXT",
    "presentation TEXT",
    "pharmaceutical_form TEXT",
    "clinical_control_unit TEXT",
    "unit_converter REAL",
    "material_type TEXT",
    "usage_in_protocol INTEGER DEFAULT 0",
    "equipment_patrimony TEXT",
    "equipment_serial TEXT",
    "equipment_brand TEXT",
    "equipment_model TEXT",
    "equipment_acquisition_date TEXT",
    "equipment_next_maintenance TEXT",
    "equipment_location TEXT",
    "equipment_maintenance_status TEXT DEFAULT 'ativo'",
    "cost_price REAL DEFAULT 0",
    "selling_price REAL DEFAULT 0",
  ];
  for (const column of inventoryItemColumns) {
    await addColumnIfMissing(db, "inventory_items", column);
  }

  for (const column of ["contact_name TEXT", "address TEXT"]) {
    await addColumnIfMissing(db, "suppliers", column);
  }

  for (const column of ["base_price REAL DEFAULT 0"]) {
    await addColumnIfMissing(db, "protocols", column);
  }

  for (const column of [
    "display_name TEXT",
    "technical_name TEXT",
    "canonical_slug TEXT",
    "route_code TEXT",
    "anatomical_region TEXT",
    "side TEXT",
    "view_position TEXT",
    "clinical_notes TEXT",
  ]) {
    await addColumnIfMissing(db, "body_areas", column);
  }

  for (const column of [
    "application_plan_id VARCHAR(36)",
    "is_corrected INTEGER NOT NULL DEFAULT 0",
    "corrected_at TEXT",
    "correction_reason TEXT",
    "subtotal REAL DEFAULT 0",
    "discount_amount REAL DEFAULT 0",
    "discount_type TEXT DEFAULT 'fixed'",
    "total_amount REAL DEFAULT 0",
    "payment_method TEXT",
    "payment_status TEXT DEFAULT 'pending'",
  ]) {
    await addColumnIfMissing(db, "procedures", column);
  }

  for (const column of [
    "is_corrected INTEGER NOT NULL DEFAULT 0",
    "corrected_at TEXT",
    "correction_group_id TEXT",
    "procedure_application_id TEXT",
  ]) {
    await addColumnIfMissing(db, "procedure_items_used", column);
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS external_sync_queue (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
      provider TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      request_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','synced','failed','cancelled')),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      next_attempt_at TEXT,
      last_error TEXT,
      response_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_external_sync_queue_request ON external_sync_queue(provider, request_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_external_sync_queue_status ON external_sync_queue(provider, status, next_attempt_at)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_external_sync_queue_entity ON external_sync_queue(entity_type, entity_id)");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS external_sync_logs (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
      provider TEXT NOT NULL,
      action TEXT NOT NULL,
      request_id TEXT,
      entity_type TEXT,
      entity_id TEXT,
      status TEXT NOT NULL,
      response_json TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_external_sync_logs_created ON external_sync_logs(provider, created_at)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_external_sync_logs_entity ON external_sync_logs(entity_type, entity_id)");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS checkin_requests (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
      patient_id TEXT,
      application_plan_id TEXT,
      procedure_id TEXT,
      appointment_id TEXT,
      patient_email TEXT,
      scheduled_for TEXT,
      sent_at TEXT,
      response_received_at TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      form_url TEXT,
      external_response_id TEXT,
      response_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_checkin_requests_patient ON checkin_requests(patient_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_checkin_requests_status ON checkin_requests(status, scheduled_for)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_checkin_requests_external_response ON checkin_requests(external_response_id)");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS data_import_jobs (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      import_type TEXT NOT NULL,
      file_name TEXT,
      file_hash TEXT,
      status TEXT DEFAULT 'draft',
      total_rows INTEGER DEFAULT 0,
      valid_rows INTEGER DEFAULT 0,
      invalid_rows INTEGER DEFAULT 0,
      duplicated_rows INTEGER DEFAULT 0,
      created_count INTEGER DEFAULT 0,
      updated_count INTEGER DEFAULT 0,
      skipped_count INTEGER DEFAULT 0,
      merged_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      mapping_json TEXT,
      summary_json TEXT,
      created_by_user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS data_import_rows (
      id TEXT PRIMARY KEY,
      import_job_id TEXT NOT NULL,
      row_number INTEGER NOT NULL,
      raw_json TEXT,
      mapped_json TEXT,
      validation_errors_json TEXT,
      duplicate_candidates_json TEXT,
      selected_action TEXT,
      status TEXT,
      target_entity_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(import_job_id) REFERENCES data_import_jobs(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS patient_merge_history (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL,
      primary_patient_id TEXT NOT NULL,
      merged_patient_id TEXT NOT NULL,
      merge_reason TEXT,
      merged_fields_json TEXT,
      conflicts_json TEXT,
      created_by_user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(primary_patient_id) REFERENCES patients(id),
      FOREIGN KEY(merged_patient_id) REFERENCES patients(id)
    )
  `);

  for (const column of [
    "document TEXT",
    "merged_into_patient_id TEXT REFERENCES patients(id)",
    "merged_at DATETIME",
    "merged_by_user_id TEXT",
    "merge_status TEXT DEFAULT 'active'",
  ]) {
    await addColumnIfMissing(db, "patients", column);
  }

  for (const column of [
    "application_plan_id VARCHAR(36)",
    "google_calendar_event_url TEXT",
    "appscript_sync_status TEXT NOT NULL DEFAULT 'not_synced'",
    "appscript_request_id TEXT",
    "appscript_last_error TEXT",
    "appscript_last_sync_at TEXT",
    "email_sent_at TEXT",
    "checkin_scheduled_for TEXT",
  ]) {
    await addColumnIfMissing(db, "appointments", column);
  }

  for (const column of [
    "calibration_x REAL NOT NULL DEFAULT 0",
    "calibration_y REAL NOT NULL DEFAULT 0",
  ]) {
    await addColumnIfMissing(db, "label_templates", column);
  }

  await db.execute(`
    UPDATE label_templates
    SET paper_size = 'Letter',
        margin_left_mm = 4.0,
        gap_x_mm = 3.9,
        margin_top_mm = 12.7,
        gap_y_mm = 0,
        description = 'Folha Carta com 30 etiquetas, aproximado 25,4 x 66,7 mm.'
    WHERE id = 'label-template-pimaco-6080'
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory_locations (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`
    INSERT INTO inventory_locations (id, clinic_id, name, description, is_default)
    SELECT 'default-location', 'ana-morong-clinic', 'Estoque Principal', 'Local de armazenamento padrao', 1
    WHERE NOT EXISTS (SELECT 1 FROM inventory_locations WHERE id = 'default-location')
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory_location_stocks (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
      location_id TEXT NOT NULL,
      inventory_item_id TEXT NOT NULL,
      inventory_batch_id TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(location_id, inventory_item_id, inventory_batch_id)
    )
  `);
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_location_stocks_unique_batch
    ON inventory_location_stocks(location_id, inventory_item_id, COALESCE(inventory_batch_id, ''))
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS inventory_transfers (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
      inventory_item_id TEXT NOT NULL,
      inventory_batch_id TEXT,
      from_location_id TEXT NOT NULL,
      to_location_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      transfer_date TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await addColumnIfMissing(db, "inventory_receipts", "location_id TEXT");
  await addColumnIfMissing(db, "stock_movements", "location_id TEXT");

  await db.execute(`
    INSERT OR IGNORE INTO inventory_location_stocks (
      id, clinic_id, location_id, inventory_item_id, inventory_batch_id, quantity
    )
    SELECT hex(randomblob(16)), 'ana-morong-clinic', 'default-location', inventory_item_id, id, current_quantity
    FROM inventory_batches
    WHERE current_quantity > 0 AND deleted_at IS NULL
  `);
  await db.execute(`
    INSERT OR IGNORE INTO inventory_location_stocks (
      id, clinic_id, location_id, inventory_item_id, inventory_batch_id, quantity
    )
    SELECT hex(randomblob(16)), 'ana-morong-clinic', 'default-location', id, NULL, current_stock
    FROM inventory_items i
    WHERE current_stock > 0
      AND deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM inventory_batches b
        WHERE b.inventory_item_id = i.id AND b.deleted_at IS NULL AND b.current_quantity > 0
      )
      AND NOT EXISTS (
        SELECT 1
        FROM inventory_location_stocks s
        WHERE s.location_id = 'default-location'
          AND s.inventory_item_id = i.id
          AND s.inventory_batch_id IS NULL
      )
  `);

  await db.execute(`
    UPDATE inventory_items
    SET current_stock = (
      SELECT COALESCE(SUM(b.current_quantity), 0)
      FROM inventory_batches b
      WHERE b.inventory_item_id = inventory_items.id
        AND b.deleted_at IS NULL
    ),
    updated_at = datetime('now')
    WHERE deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM inventory_batches b
        WHERE b.inventory_item_id = inventory_items.id
          AND b.deleted_at IS NULL
      )
      AND ABS(
        COALESCE(current_stock, 0) - (
          SELECT COALESCE(SUM(b.current_quantity), 0)
          FROM inventory_batches b
          WHERE b.inventory_item_id = inventory_items.id
            AND b.deleted_at IS NULL
        )
      ) > 0.0001
  `);
}

export function getDb(): Promise<Database> {
  if (!isTauri()) {
    return Promise.reject(new Error("O banco SQLite local so fica disponivel no aplicativo desktop. Abra pelo Tauri para fazer login."));
  }

  if (!_dbPromise) {
    const loadPromise = (async () => {
      await prepareSqliteDatabaseForOpen();
      const db = await Database.load(DB_URL);
      try {
        await db.execute("PRAGMA busy_timeout = 15000");
        await db.execute("PRAGMA journal_mode = WAL");
        await db.execute("PRAGMA synchronous = NORMAL");
        await db.execute("PRAGMA foreign_keys = ON");
        await ensureCompatibilitySchema(db);
      } catch (error) {
        console.error("Erro ao garantir compatibilidade do schema SQLite:", error);
      }
      return db;
    })();
    _dbPromise = loadPromise.catch((error) => {
      _dbPromise = null;
      throw error;
    });
  }
  return _dbPromise;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("dra_ana_auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeParseWebPayload(response: Response, defaultError: string): Promise<any> {
  let payload: any = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error("O servidor da nuvem está reiniciando ou sincronizando. Aguarde 5 segundos e tente novamente.");
    }
    throw new Error(`Falha de comunicação com o servidor (${response.status}).`);
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || defaultError);
  }

  return payload;
}

async function webDbSelect<T = Row>(sql: string, args: unknown[] = []): Promise<T[]> {
  const response = await fetch("/api/db/query", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sql, args }),
  });

  const payload = await safeParseWebPayload(response, "Erro ao consultar banco de dados remoto (Cloudflare D1).");
  return (payload.data || []) as T[];
}

async function webDbExecute(sql: string, args: unknown[] = []): Promise<QueryResult> {
  const response = await fetch("/api/db/execute", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sql, args }),
  });

  const payload = await safeParseWebPayload(response, "Erro ao executar operação no banco remoto (Cloudflare D1).");
  return payload.data as QueryResult;
}

export type Row = Record<string, unknown>;

let _activeTransaction: { sql: string; args: unknown[]; requireRowsAffected?: boolean }[] | null = null;

export async function dbSelect<T = Row>(
  sql: string,
  args: unknown[] = []
): Promise<T[]> {
  if (!isTauri()) {
    return webDbSelect<T>(sql, args);
  }

  if (_activeTransaction) {
    const db = await getDb();
    return withLockedDatabaseRetry(() => db.select<T[]>(sql, args));
  }
  return enqueueDatabaseOperation(async () => {
    const db = await getDb();
    return withLockedDatabaseRetry(() => db.select<T[]>(sql, args));
  });
}

export async function dbExecute(
  sql: string,
  args: unknown[] = []
): Promise<QueryResult> {
  if (!isTauri()) {
    if (_activeTransaction) {
      _activeTransaction.push({ sql, args });
      return { lastInsertId: 0, rowsAffected: 1 };
    }
    return webDbExecute(sql, args);
  }

  if (_activeTransaction) {
    _activeTransaction.push({ sql, args });
    return { lastInsertId: 0, rowsAffected: 1 };
  }
  return enqueueDatabaseOperation(async () => {
    const db = await getDb();
    return withLockedDatabaseRetry(() => db.execute(sql, args));
  });
}

export async function dbExecuteRequired(
  sql: string,
  args: unknown[] = []
): Promise<QueryResult> {
  if (!isTauri()) {
    if (_activeTransaction) {
      _activeTransaction.push({ sql, args, requireRowsAffected: true });
      return { lastInsertId: 0, rowsAffected: 1 };
    }
    const result = await webDbExecute(sql, args);
    if (Number(result.rowsAffected ?? 0) === 0) {
      throw new Error("Nenhuma linha foi alterada por uma operacao obrigatoria.");
    }
    return result;
  }

  if (_activeTransaction) {
    _activeTransaction.push({ sql, args, requireRowsAffected: true });
    return { lastInsertId: 0, rowsAffected: 1 };
  }

  return enqueueDatabaseOperation(async () => {
    const db = await getDb();
    const result = await withLockedDatabaseRetry(() => db.execute(sql, args));
    if (Number(result.rowsAffected ?? 0) === 0) {
      throw new Error("Nenhuma linha foi alterada por uma operacao obrigatoria.");
    }
    return result;
  });
}

export async function dbTransaction<T>(callback: () => Promise<T>): Promise<T> {
  if (!isTauri()) {
    if (_activeTransaction) {
      throw new Error("Transação já em andamento.");
    }
    _activeTransaction = [];
    try {
      const result = await callback();
      if (_activeTransaction && _activeTransaction.length > 0) {
        const response = await fetch("/api/db/transaction", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ queries: _activeTransaction }),
        });
        await safeParseWebPayload(response, "Falha ao persistir transação no Cloudflare D1.");
      }
      return result;
    } finally {
      _activeTransaction = null;
    }
  }

  if (_activeTransaction) {
    throw new Error("Transacao SQLite ja em andamento. Operacoes criticas devem usar uma unica transacao.");
  }

  return enqueueDatabaseOperation(async () => {
    _activeTransaction = [];
    try {
      const result = await callback();
      if (_activeTransaction && _activeTransaction.length > 0) {
        await invoke("execute_transaction", { queries: _activeTransaction });
      }
      return result;
    } finally {
      _activeTransaction = null;
    }
  });
}
