import sqlite3
import os
import re

DB_BACKUP = os.path.join(os.path.dirname(__file__), "..", "estoque_backup.db")
MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "db", "migrations")
WEB_SIG = os.path.join(os.path.dirname(__file__), "..", "migrations", "0001_create_web_signatures_schema.sql")
OUTPUT_SCHEMA = os.path.join(os.path.dirname(__file__), "d1-schema.sql")

def clean_sql(sql_content: str) -> str:
    cleaned = re.sub(r'(?i)\bBEGIN\s+TRANSACTION\s*;?', '', sql_content)
    cleaned = re.sub(r'(?i)\bCOMMIT\s*;?', '', cleaned)
    cleaned = re.sub(r'(?i)PRAGMA\s+[^;]+;', '', cleaned)
    return cleaned.strip()

def main():
    if not os.path.exists(DB_BACKUP):
        print(f"Erro: {DB_BACKUP} não encontrado.")
        return

    conn_backup = sqlite3.connect(DB_BACKUP)
    c_b = conn_backup.cursor()
    c_b.execute(
        "SELECT type, name, sql FROM sqlite_master "
        "WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_sqlx_%' "
        "ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'view' THEN 2 WHEN 'index' THEN 3 ELSE 4 END, name"
    )
    backup_objects = c_b.fetchall()

    schema_lines = [
        "-- ================================================================",
        "-- SCHEMA DEFINITIVO CLOUDFLARE D1 (DRA. ANA MORONG)",
        "-- Estrutura completa: Tabelas Base + Financeiro + Assinatura Web",
        "-- ================================================================\n"
    ]

    for typ, name, sql in backup_objects:
        sql_clean = clean_sql(sql)
        if typ == "table" and "CREATE TABLE IF NOT EXISTS" not in sql_clean:
            sql_clean = sql_clean.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS", 1)
        elif typ == "index" and "CREATE INDEX IF NOT EXISTS" not in sql_clean and "CREATE UNIQUE INDEX IF NOT EXISTS" not in sql_clean:
            if "CREATE UNIQUE INDEX" in sql_clean:
                sql_clean = sql_clean.replace("CREATE UNIQUE INDEX", "CREATE UNIQUE INDEX IF NOT EXISTS", 1)
            else:
                sql_clean = sql_clean.replace("CREATE INDEX", "CREATE INDEX IF NOT EXISTS", 1)
        schema_lines.append(f"{sql_clean};")

    schema_lines.append("\n-- >>> MIGRATIONS FINANCEIRO & PROCEDIMENTOS ADICIONAIS <<<\n")

    later_migrations = [
        "024_financial_module.sql",
        "025_procedure_applications.sql",
        "026_procedure_items_application_fk.sql",
        "027_financial_module.sql",
        "028_financial_loss_category.sql"
    ]

    for m in later_migrations:
        m_path = os.path.join(MIGRATIONS_DIR, m)
        if os.path.exists(m_path):
            with open(m_path, "r", encoding="utf-8") as f:
                c = f.read()
                if "026" in m:
                    c = re.sub(r'ALTER\s+TABLE\s+procedure_items_used\s+ADD\s+COLUMN\s+is_corrected[^;]+;', '', c, flags=re.IGNORECASE)
                    c = re.sub(r'ALTER\s+TABLE\s+procedure_items_used\s+ADD\s+COLUMN\s+corrected_at[^;]+;', '', c, flags=re.IGNORECASE)
                    c = re.sub(r'ALTER\s+TABLE\s+procedure_items_used\s+ADD\s+COLUMN\s+correction_group_id[^;]+;', '', c, flags=re.IGNORECASE)
                cleaned = clean_sql(c)
                if cleaned:
                    schema_lines.append(f"-- >>> {m} <<<")
                    schema_lines.append(cleaned)
                    schema_lines.append("\n")

    if os.path.exists(WEB_SIG):
        with open(WEB_SIG, "r", encoding="utf-8") as f:
            c = f.read()
            cleaned = clean_sql(c)
            if cleaned:
                schema_lines.append("-- >>> 0001_create_web_signatures_schema.sql <<<")
                schema_lines.append(cleaned)
                schema_lines.append("\n")

    full_schema_sql = "\n".join(schema_lines)

    os.makedirs(os.path.dirname(OUTPUT_SCHEMA), exist_ok=True)
    with open(OUTPUT_SCHEMA, "w", encoding="utf-8") as f:
        f.write(full_schema_sql)

    print(f"Sucesso! Schema compilado com sucesso em: {OUTPUT_SCHEMA}")

if __name__ == "__main__":
    main()
