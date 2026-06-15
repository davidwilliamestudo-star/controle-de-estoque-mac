import sqlite3

conn = sqlite3.connect(r"c:\Users\wilia\OneDrive\Documentos\VOLTQ\DRA ANA MORONG\Controle de Estoque\app\src-tauri\estoque.db")
c = conn.cursor()

# Get migrations
try:
    c.execute("SELECT * FROM migrations")
    print("Migrations:")
    for row in c.fetchall():
        print(row)
except Exception as e:
    print("Error migrations:", e)

# Get columns of inventory_items
try:
    c.execute("PRAGMA table_info(inventory_items)")
    print("\nColumns in inventory_items:")
    for row in c.fetchall():
        print(row)
except Exception as e:
    print("Error columns:", e)

conn.close()
