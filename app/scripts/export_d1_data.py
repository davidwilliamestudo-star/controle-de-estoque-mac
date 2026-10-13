import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "estoque_backup.db")
OUTPUT_SEED = os.path.join(os.path.dirname(__file__), "d1-seed-data.sql")

# Tabelas para exportar dados (excluindo controle interno de migrations)
EXCLUDED_TABLES = {"_sqlx_migrations", "sqlite_sequence"}

def escape_sql_value(val):
    if val is None:
        return "NULL"
    elif isinstance(val, (int, float)):
        return str(val)
    elif isinstance(val, (bytes, bytearray)):
        return f"X'{val.hex()}'"
    else:
        text = str(val).replace("'", "''")
        return f"'{text}'"

def main():
    if not os.path.exists(DB_PATH):
        print(f"Erro: {DB_PATH} não existe.")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in c.fetchall() if row[0] not in EXCLUDED_TABLES]

    sql_lines = [
        "-- ================================================================",
        "-- DUMP DE DADOS REAIS CLOUDFLARE D1 (DRA. ANA MORONG)",
        "-- Dados extraídos de estoque_backup.db",
        "-- ================================================================\n"
    ]

    total_rows = 0

    for table in tables:
        c.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in c.fetchall()]
        col_list_str = ", ".join([f'"{col}"' for col in columns])

        c.execute(f"SELECT * FROM {table}")
        rows = c.fetchall()

        if rows:
            sql_lines.append(f"-- Dados da tabela: {table} ({len(rows)} linhas)")
            for row in rows:
                values_str = ", ".join([escape_sql_value(v) for v in row])
                sql_lines.append(f"INSERT OR REPLACE INTO {table} ({col_list_str}) VALUES ({values_str});")
            sql_lines.append("")
            total_rows += len(rows)

    with open(OUTPUT_SEED, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    print(f"Sucesso! Exportadas {total_rows} linhas de {len(tables)} tabelas para:")
    print(f"-> {OUTPUT_SEED}")

    conn.close()

if __name__ == "__main__":
    main()
