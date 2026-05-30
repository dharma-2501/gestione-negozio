# ============================
# MIGRAZIONE VECCHIO → NUOVO DATABASE
# Primi 6 caratteri di "description" diventano categoria
# ============================

import sqlite3
from datetime import datetime

# ==================== CONFIGURA I PERCORSI ====================
OLD_DB_PATH = "/Users/drgreen/Downloads/wh.db"          # ← Cambia con il percorso del tuo vecchio database
NEW_DB_PATH = "/Users/drgreen/Library/Application Support/gestione-negozio/negozio.db"  # ← Il tuo database attuale

print("🚀 Inizio migrazione dal vecchio database...")

old_conn = sqlite3.connect(OLD_DB_PATH)
new_conn = sqlite3.connect(NEW_DB_PATH)

old_cur = old_conn.cursor()
new_cur = new_conn.cursor()

try:
    # 1. Migra prodotti da Warehouse
    print("📦 Migrazione prodotti da Warehouse...")
    old_cur.execute("SELECT id, barcode, description, instock, public_price, private_price FROM Warehouse")
    
    for row in old_cur.fetchall():
        barcode = row[1]
        full_description = row[2] or f"Prodotto {barcode or 'senza nome'}"
        
        # Estrazione categoria (primi 6 caratteri)
        category = full_description[:6].strip()
        clean_name = full_description[6:].strip()
        if not clean_name:
            clean_name = full_description.strip()
        
        public_price = float(row[4]) if row[4] is not None else 0.0
        private_price = float(row[5]) if row[5] is not None else None

        # Crea categoria se non esiste
        new_cur.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (category,))

        # Inserisci prodotto con nome pulito e categoria
        new_cur.execute("""
            INSERT OR IGNORE INTO products 
                (name, price, purchase_price, category, barcode, min_stock, created_at)
            VALUES (?, ?, ?, ?, ?, 2, CURRENT_TIMESTAMP)
        """, (clean_name, public_price, private_price, category, barcode))

    new_conn.commit()
    print("✅ Prodotti e categorie migrati")

    # 2. Migra stock da instock → stock_batches
    print("📦 Migrazione stock iniziale...")
    new_cur.execute("SELECT id, barcode FROM products WHERE barcode IS NOT NULL")
    for prod_id, barcode in new_cur.fetchall():
        old_cur.execute("SELECT instock FROM Warehouse WHERE barcode = ?", (barcode,))
        result = old_cur.fetchone()
        if result and result[0] and result[0] > 0:
            new_cur.execute("""
                INSERT INTO stock_batches (product_id, quantity, entry_date, notes)
                VALUES (?, ?, CURRENT_TIMESTAMP, 'Migrazione dal vecchio database')
            """, (prod_id, result[0]))

    new_conn.commit()
    print("✅ Stock migrato in stock_batches")

    # 3. Migra vendite (approssimativa)
    print("📦 Migrazione vendite...")
    try:
        old_cur.execute("SELECT * FROM Sales")
        for sale in old_cur.fetchall():
            barcode = sale[1] if len(sale) > 1 else None
            sale_date = sale[4] if len(sale) > 4 else datetime.now().isoformat()
            total = float(sale[5]) if len(sale) > 5 and sale[5] is not None else 0.0

            if not barcode:
                continue

            new_cur.execute("SELECT id FROM products WHERE barcode = ?", (barcode,))
            prod = new_cur.fetchone()
            if prod:
                prod_id = prod[0]
                new_cur.execute("INSERT INTO sales (date, total) VALUES (?, ?)", (sale_date, total))
                sale_id = new_cur.lastrowid
                new_cur.execute("""
                    INSERT INTO sale_items (sale_id, product_id, quantity, price)
                    VALUES (?, ?, 1, ?)
                """, (sale_id, prod_id, total))
    except Exception as e:
        print(f"⚠️ Tabella Sales non trovata o diversa: {e}")

    new_conn.commit()
    print("\n🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!")

except Exception as e:
    print(f"❌ Errore durante la migrazione: {e}")
finally:
    old_conn.close()
    new_conn.close()

print("Script terminato.")