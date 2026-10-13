import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "estoque_backup.db")

def main():
    if not os.path.exists(DB_PATH):
        print(f"Arquivo {DB_PATH} não encontrado.")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in c.fetchall()]

    print(f"Total de tabelas encontradas: {len(tables)}")
    for t in tables:
        try:
            c.execute(f"SELECT count(*) FROM {t}")
            cnt = c.fetchone()[0]
            if cnt > 0:
                print(f"  - {t}: {cnt} registros")
        except Exception as e:
            print(f"  - {t}: erro ({e})")

    conn.close()

if __name__ == "__main__":
    main()
