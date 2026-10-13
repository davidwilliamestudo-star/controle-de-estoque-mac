import os
import re

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "db", "migrations")
OUTPUT_SCHEMA = os.path.join(os.path.dirname(__file__), "d1-schema.sql")

def clean_sql(sql_content: str) -> str:
    # Remove BEGIN TRANSACTION / COMMIT / PRAGMA que conflitam com batch do D1
    cleaned = re.sub(r'(?i)\bBEGIN\s+TRANSACTION\s*;?', '', sql_content)
    cleaned = re.sub(r'(?i)\bCOMMIT\s*;?', '', cleaned)
    cleaned = re.sub(r'(?i)PRAGMA\s+[^;]+;', '', cleaned)
    return cleaned.strip()

def main():
    files = sorted([f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql")])
    full_sql = []
    
    full_sql.append("-- ================================================================")
    full_sql.append("-- SCHEMA UNIFICADO CLOUDFLARE D1 (DRA. ANA MORONG)")
    full_sql.append(f"-- Gerado automaticamente a partir de {len(files)} migrations")
    full_sql.append("-- ================================================================\n")

    for f in files:
        f_path = os.path.join(MIGRATIONS_DIR, f)
        with open(f_path, "r", encoding="utf-8") as sql_file:
            content = sql_file.read()
            cleaned = clean_sql(content)
            if cleaned:
                full_sql.append(f"-- >>> MIGRATION: {f} <<<")
                full_sql.append(cleaned)
                full_sql.append("\n")

    os.makedirs(os.path.dirname(OUTPUT_SCHEMA), exist_ok=True)
    with open(OUTPUT_SCHEMA, "w", encoding="utf-8") as out:
        out.write("\n".join(full_sql))

    print(f"Sucesso! {len(files)} migrations compiladas em: {OUTPUT_SCHEMA}")

if __name__ == "__main__":
    main()
