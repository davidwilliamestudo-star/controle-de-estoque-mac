use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde_json::Value;
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

const MIGRATION_13_CURRENT_CHECKSUM: &str =
    "EC1D558120550650ED83F1B08BC9238BD46640B87B7E438B68C20EE0EEA01F7D6AFA2648AE6E9636B21A5F71D1B02DCF";
const MIGRATION_13_LEGACY_CHECKSUMS: &[&str] = &[
    "F12E0BFB819B7C3605AC62B6063649D4999D3CC6E50F95322A2AE978BA0B82F15A56A7B64A4107C19278A9DD843C7B49",
    "F64836B2441D7A7EB3F0390D9BF1C0A131085C7790C545CAB137C9E87CB563FC86B7CAF5DF0360C76A04219BEE23BD96",
];
const MIGRATION_22_CURRENT_CHECKSUM: &str =
    "906CDB94DF6BF481900A93451130BD7035A9A9402CB9CCC5358A68F62932F70DB54D2EA3C2B667B1397A0189248EC46D";
const MIGRATION_22_LEGACY_CHECKSUMS: &[&str] = &[
    "36031AEDAFCA7247C0DF634C4D24B76A10A32BB93179D790CEDA7568DE50B99D74BEAF9E1392FACE2339F6EB74AEC27E",
];

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionQuery {
    sql: String,
    args: Vec<Value>,
    require_rows_affected: Option<bool>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationRepair {
    version: i64,
    from_checksum: String,
    to_checksum: String,
    reason: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabasePrepareResult {
    db_path: String,
    backup_path: Option<String>,
    repaired_migrations: Vec<MigrationRepair>,
    integrity_check: String,
    foreign_key_violations: usize,
}

fn app_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("estoque.db"))
}

fn run_integrity_check(conn: &Connection) -> Result<String, String> {
    conn.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Erro ao validar integridade do SQLite: {}", e))
}

fn count_foreign_key_violations(conn: &Connection) -> Result<usize, String> {
    let mut stmt = conn
        .prepare("PRAGMA foreign_key_check")
        .map_err(|e| format!("Erro ao preparar foreign_key_check: {}", e))?;
    let mut rows = stmt
        .query([])
        .map_err(|e| format!("Erro ao executar foreign_key_check: {}", e))?;
    let mut count = 0;
    while rows
        .next()
        .map_err(|e| format!("Erro ao ler foreign_key_check: {}", e))?
        .is_some()
    {
        count += 1;
    }
    Ok(count)
}

fn table_exists(conn: &Connection, table_name: &str) -> Result<bool, String> {
    let exists = conn
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1 LIMIT 1",
            params![table_name],
            |_| Ok(()),
        )
        .optional()
        .map_err(|e| format!("Erro ao consultar sqlite_master: {}", e))?
        .is_some();
    Ok(exists)
}

fn table_columns(conn: &Connection, table_name: &str) -> Result<HashSet<String>, String> {
    if !table_exists(conn, table_name)? {
        return Err(format!(
            "Tabela obrigatoria ausente no SQLite: {}",
            table_name
        ));
    }

    let pragma = format!("PRAGMA table_info({})", table_name);
    let mut stmt = conn
        .prepare(&pragma)
        .map_err(|e| format!("Erro ao ler colunas de {}: {}", table_name, e))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Erro ao mapear colunas de {}: {}", table_name, e))?;

    let mut columns = HashSet::new();
    for row in rows {
        columns.insert(row.map_err(|e| format!("Erro ao ler coluna de {}: {}", table_name, e))?);
    }
    Ok(columns)
}

fn require_columns(conn: &Connection, table_name: &str, required: &[&str]) -> Result<(), String> {
    let columns = table_columns(conn, table_name)?;
    let missing: Vec<&str> = required
        .iter()
        .copied()
        .filter(|column| !columns.contains(*column))
        .collect();

    if missing.is_empty() {
        Ok(())
    } else {
        Err(format!(
            "Schema SQLite incompativel: {} sem colunas obrigatorias: {}",
            table_name,
            missing.join(", ")
        ))
    }
}

fn migration_checksum(conn: &Connection, version: i64) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT hex(checksum) FROM _sqlx_migrations WHERE version = ?1 AND success = 1",
        params![version],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("Erro ao ler checksum da migration {}: {}", version, e))
}

fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, String> {
    if hex.len() % 2 != 0 {
        return Err("Checksum hexadecimal invalido.".to_string());
    }

    let mut bytes = Vec::with_capacity(hex.len() / 2);
    for index in (0..hex.len()).step_by(2) {
        let byte = u8::from_str_radix(&hex[index..index + 2], 16)
            .map_err(|e| format!("Checksum hexadecimal invalido: {}", e))?;
        bytes.push(byte);
    }
    Ok(bytes)
}

fn create_preflight_backup(conn: &Connection, app_data_dir: &Path) -> Result<PathBuf, String> {
    let timestamp = conn
        .query_row(
            "SELECT strftime('%Y%m%d-%H%M%S', 'now', 'localtime')",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "unknown-time".to_string());
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let backup_dir = app_data_dir
        .join("db-backups")
        .join(format!("preflight-{}-{}", timestamp, millis));

    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Erro ao criar pasta de backup SQLite: {}", e))?;

    let backup_path = backup_dir.join("estoque.db");
    let backup_path_str = backup_path.to_string_lossy().to_string();
    conn.execute("VACUUM INTO ?1", params![backup_path_str])
        .map_err(|e| format!("Erro ao criar backup SQLite antes do reparo: {}", e))?;

    Ok(backup_path)
}

fn ensure_preflight_backup(
    conn: &Connection,
    app_data_dir: &Path,
    backup_path: &mut Option<PathBuf>,
) -> Result<(), String> {
    if backup_path.is_none() {
        *backup_path = Some(create_preflight_backup(conn, app_data_dir)?);
    }
    Ok(())
}

fn update_migration_checksum(
    conn: &Connection,
    version: i64,
    checksum: &str,
) -> Result<(), String> {
    let checksum_bytes = hex_to_bytes(checksum)?;
    let affected = conn
        .execute(
            "UPDATE _sqlx_migrations SET checksum = ?1 WHERE version = ?2 AND success = 1",
            params![checksum_bytes, version],
        )
        .map_err(|e| {
            format!(
                "Erro ao normalizar checksum da migration {}: {}",
                version, e
            )
        })?;

    if affected == 1 {
        Ok(())
    } else {
        Err(format!(
            "Migration {} nao encontrada para normalizacao de checksum.",
            version
        ))
    }
}

fn normalize_known_legacy_migration<F>(
    conn: &Connection,
    app_data_dir: &Path,
    backup_path: &mut Option<PathBuf>,
    repairs: &mut Vec<MigrationRepair>,
    version: i64,
    current_checksum: &str,
    legacy_checksums: &[&str],
    reason: &str,
    validate_schema: F,
) -> Result<(), String>
where
    F: Fn(&Connection) -> Result<(), String>,
{
    let Some(checksum) = migration_checksum(conn, version)? else {
        return Ok(());
    };
    let checksum = checksum.to_ascii_uppercase();

    if checksum == current_checksum {
        return Ok(());
    }

    if !legacy_checksums.iter().any(|legacy| *legacy == checksum) {
        return Err(format!(
            "Migration {} foi aplicada com checksum desconhecido: {}. O banco nao sera alterado automaticamente.",
            version, checksum
        ));
    }

    validate_schema(conn)?;
    ensure_preflight_backup(conn, app_data_dir, backup_path)?;
    update_migration_checksum(conn, version, current_checksum)?;
    repairs.push(MigrationRepair {
        version,
        from_checksum: checksum,
        to_checksum: current_checksum.to_string(),
        reason: reason.to_string(),
    });

    Ok(())
}

fn validate_body_areas_clinical_schema(conn: &Connection) -> Result<(), String> {
    require_columns(
        conn,
        "body_areas",
        &[
            "display_name",
            "technical_name",
            "canonical_slug",
            "route_code",
            "anatomical_region",
            "side",
            "view_position",
            "clinical_notes",
        ],
    )
}

fn validate_patients_document_schema(conn: &Connection) -> Result<(), String> {
    require_columns(conn, "patients", &["document"])
}

#[tauri::command]
async fn prepare_database_for_open(app: AppHandle) -> Result<DatabasePrepareResult, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Erro ao preparar pasta do app data: {}", e))?;

    let db_path = app_database_path(&app)?;
    if !db_path.exists() {
        return Ok(DatabasePrepareResult {
            db_path: db_path.to_string_lossy().to_string(),
            backup_path: None,
            repaired_migrations: Vec::new(),
            integrity_check: "new_database".to_string(),
            foreign_key_violations: 0,
        });
    }

    let conn = Connection::open(&db_path).map_err(|e| format!("Error opening DB: {}", e))?;
    conn.busy_timeout(Duration::from_millis(15_000))
        .map_err(|e| e.to_string())?;
    conn.pragma_update(None, "busy_timeout", 15_000)
        .map_err(|e| e.to_string())?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| e.to_string())?;

    let integrity_check = run_integrity_check(&conn)?;
    if integrity_check != "ok" {
        return Err(format!(
            "Integridade do SQLite falhou antes de abrir o app: {}",
            integrity_check
        ));
    }

    let foreign_key_violations = count_foreign_key_violations(&conn)?;
    if foreign_key_violations > 0 {
        return Err(format!(
            "SQLite tem {} violacao(oes) de chave estrangeira; reparo automatico abortado.",
            foreign_key_violations
        ));
    }

    let mut repaired_migrations = Vec::new();
    let mut backup_path: Option<PathBuf> = None;

    if table_exists(&conn, "_sqlx_migrations")? {
        normalize_known_legacy_migration(
            &conn,
            &app_data_dir,
            &mut backup_path,
            &mut repaired_migrations,
            13,
            MIGRATION_13_CURRENT_CHECKSUM,
            MIGRATION_13_LEGACY_CHECKSUMS,
            "Normalizacao segura da migration 13 apos alteracao do arquivo SQL aplicado.",
            validate_body_areas_clinical_schema,
        )?;

        normalize_known_legacy_migration(
            &conn,
            &app_data_dir,
            &mut backup_path,
            &mut repaired_migrations,
            22,
            MIGRATION_22_CURRENT_CHECKSUM,
            MIGRATION_22_LEGACY_CHECKSUMS,
            "Normalizacao segura da migration 22 apos troca por marker idempotente.",
            validate_patients_document_schema,
        )?;
    }

    Ok(DatabasePrepareResult {
        db_path: db_path.to_string_lossy().to_string(),
        backup_path: backup_path.map(|path| path.to_string_lossy().to_string()),
        repaired_migrations,
        integrity_check,
        foreign_key_violations,
    })
}

#[tauri::command]
async fn execute_transaction(app: AppHandle, queries: Vec<TransactionQuery>) -> Result<(), String> {
    let db_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("estoque.db");

    let mut conn = Connection::open(&db_path).map_err(|e| format!("Error opening DB: {}", e))?;
    conn.busy_timeout(std::time::Duration::from_millis(15_000))
        .map_err(|e| e.to_string())?;
    conn.pragma_update(None, "busy_timeout", 15_000)
        .map_err(|e| e.to_string())?;
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| e.to_string())?;
    conn.pragma_update(None, "synchronous", "NORMAL")
        .map_err(|e| e.to_string())?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| e.to_string())?;

    let tx = conn
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| format!("Error starting tx: {}", e))?;

    for query in queries {
        let mut statement = tx
            .prepare(&query.sql)
            .map_err(|e| format!("Prepare error: {}", e))?;

        let mut rusqlite_args: Vec<rusqlite::types::Value> = Vec::new();
        for arg in query.args {
            let val = match arg {
                Value::Null => rusqlite::types::Value::Null,
                Value::Bool(b) => rusqlite::types::Value::Integer(if b { 1 } else { 0 }),
                Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        rusqlite::types::Value::Integer(i)
                    } else if let Some(f) = n.as_f64() {
                        rusqlite::types::Value::Real(f)
                    } else {
                        rusqlite::types::Value::Text(n.to_string())
                    }
                }
                Value::String(s) => rusqlite::types::Value::Text(s),
                Value::Array(_) | Value::Object(_) => rusqlite::types::Value::Text(arg.to_string()),
            };
            rusqlite_args.push(val);
        }

        let affected = statement
            .execute(rusqlite::params_from_iter(rusqlite_args))
            .map_err(|e| format!("Execute error: {}", e))?;

        if query.require_rows_affected.unwrap_or(false) && affected == 0 {
            return Err(
                "Execute error: nenhuma linha foi alterada por uma operacao obrigatoria"
                    .to_string(),
            );
        }
    }

    tx.commit().map_err(|e| format!("Commit error: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_schema",
            sql: include_str!("../../src/lib/db/migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_dev_data",
            sql: include_str!("../../src/lib/db/migrations/002_seed_dev.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "real_default_user_password_hash",
            sql: include_str!("../../src/lib/db/migrations/003_real_password_hash.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "inventory_receipts_and_labels",
            sql: include_str!("../../src/lib/db/migrations/004_inventory_receipts_labels.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "appointments",
            sql: include_str!("../../src/lib/db/migrations/005_appointments.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "seed_body_areas_and_routes",
            sql: include_str!("../../src/lib/db/migrations/006_seed_body_areas.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "dashboard_notifications",
            sql: include_str!("../../src/lib/db/migrations/007_dashboard_notifications.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "patient_application_plans",
            sql: include_str!("../../src/lib/db/migrations/008_patient_application_plans.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "appscript_integration",
            sql: include_str!("../../src/lib/db/migrations/009_appscript_integration.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "patient_report_exports",
            sql: include_str!("../../src/lib/db/migrations/010_patient_report_exports.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "appointments_application_plan",
            sql: include_str!("../../src/lib/db/migrations/011_appointments_application_plan.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "body_areas_enhancement",
            sql: include_str!("../../src/lib/db/migrations/012_body_areas_enhancement.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "body_areas_clinical_nomenclature",
            sql: include_str!(
                "../../src/lib/db/migrations/013_body_areas_clinical_nomenclature.sql"
            ),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "import_export_tables",
            sql: include_str!("../../src/lib/db/migrations/014_import_export_tables.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "inventory_refactoring",
            sql: include_str!("../../src/lib/db/migrations/015_inventory_refactoring.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "procedure_corrections",
            sql: include_str!("../../src/lib/db/migrations/016_procedure_corrections.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "inventory_new_columns",
            sql: include_str!("../../src/lib/db/migrations/017_inventory_new_columns.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "suppliers_expansion",
            sql: include_str!("../../src/lib/db/migrations/018_suppliers_expansion.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "inventory_locations",
            sql: include_str!("../../src/lib/db/migrations/019_inventory_locations.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "label_template_calibration",
            sql: include_str!("../../src/lib/db/migrations/020_label_template_calibration.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "scanner_settings",
            sql: include_str!("../../src/lib/db/migrations/021_scanner_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "patients_document",
            sql: include_str!("../../src/lib/db/migrations/022_patients_document.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "database_preflight_guard",
            sql: include_str!("../../src/lib/db/migrations/023_database_preflight_guard.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:estoque.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            prepare_database_for_open,
            execute_transaction
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
